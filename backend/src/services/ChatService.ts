import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new Anthropic({ apiKey: key }) : null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StructuredReply {
  message: string;
  options: string[];
  is_resolution: boolean;
  suggest_ticket: boolean;
}

export interface UserContext {
  name: string;
  team: string | null;
  role: string;
  email: string;
}

// Load support-rules.md at startup. We search a few plausible locations so this
// works from both `src/` (dev) and `dist/` (build) runs.
function loadFirst(candidates: string[], label: string): string {
  for (const p of candidates) {
    try {
      if (existsSync(p)) {
        console.log(`[ChatService] Loaded ${label} from`, p);
        return readFileSync(p, 'utf8');
      }
    } catch {
      // try the next candidate
    }
  }
  console.warn(`[ChatService] ${label} not found — AI will rely on general cricket knowledge.`);
  return '';
}

const RULES = loadFirst(
  [
    resolve(process.cwd(), '..', 'support-rules.md'),
    resolve(process.cwd(), 'support-rules.md'),
  ],
  'support-rules.md',
);

const RULEBOOK = loadFirst(
  [
    resolve(process.cwd(), 'data', 'dcl-rulebook.txt'),
    resolve(process.cwd(), 'backend', 'data', 'dcl-rulebook.txt'),
  ],
  'dcl-rulebook.txt',
);

const BASE_PROMPT = `You are the AI support assistant for the Dallas Cricket League (DCL).
You help captains, players, umpires, and tournament staff resolve issues via a guided
question-and-answer flow.

HOW YOU RESPOND
You ALWAYS reply by calling the 'respond_to_user' tool — never with plain text. Each
response has:
- A short message (1-3 sentences) — either a question, an answer, or a confirmation.
- 2-4 short option chips the user can click to reply. Chips should be concrete,
  mutually distinct, and ≤60 characters. Include an "Other — type it in" chip when
  appropriate so the user isn't boxed into your options.
- is_resolution=true only when you've clearly answered the user's question and they
  won't need a ticket.
- suggest_ticket=true when you can't resolve it yourself (e.g. scorecard corrections,
  umpire review, escalation for policy exceptions). When true, include "Raise a ticket"
  as one of the chips.

CRITICAL UX RULES
- Keep chat turns tight. One question at a time; don't ask multiple questions in one message.
- Chips must be realistic next-step answers for a DCL user.
- Cite specific Laws (e.g. "Per Law 2.12...") when your reply relies on a rule.
- If a playoff is affected, note that urgency changes.

GROUNDING
When citing a rule or quick fix, use the exact wording and Law numbers from the rules
references below. Don't invent Law numbers. If the rules don't cover something, say so
honestly and offer to raise a ticket.`;

const TRIAGE_SECTION = RULES
  ? `\n\n---\nDCL SUPPORT PLAYBOOK (primary reference — quick fixes, escalation paths, SLAs):\n\n${RULES}\n---\n`
  : '';

const RULEBOOK_SECTION = RULEBOOK
  ? `\n\n---\nDCL OFFICIAL RULEBOOK (use for exact Law citations):\n\n${RULEBOOK}\n---\n`
  : '';

export const CRICKET_SUPPORT_SYSTEM_PROMPT = BASE_PROMPT + TRIAGE_SECTION + RULEBOOK_SECTION;

const RESPOND_TOOL = {
  name: 'respond_to_user',
  description:
    'Always use this to reply to the user. Provide a short message and 2-4 option chips.',
  input_schema: {
    type: 'object',
    required: ['message', 'options'],
    properties: {
      message: {
        type: 'string',
        description: 'Your reply text (1-3 sentences, conversational).',
      },
      options: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: { type: 'string', maxLength: 60 },
        description:
          'Short chip labels the user can click as their next answer. Include "Raise a ticket" when suggest_ticket=true.',
      },
      is_resolution: {
        type: 'boolean',
        description: 'true when the issue is fully resolved and no ticket is needed',
      },
      suggest_ticket: {
        type: 'boolean',
        description: 'true when you recommend raising a ticket to escalate this issue',
      },
    },
  },
};

const INITIAL_CATEGORIES = [
  'Player registration',
  'Umpire dispute',
  'Scoring issue',
  'Equipment/ground',
  'Match scheduling',
  'Disciplinary',
  'Something else',
];

// Stock fallback for when ANTHROPIC_API_KEY isn't configured — chips still work.
const FALLBACK_SEQUENCE: StructuredReply[] = [
  {
    message: "Hi! I'm your DCL support assistant. What's going on?",
    options: ['Player registration', 'Umpire dispute', 'Scoring issue', 'Something else'],
    is_resolution: false,
    suggest_ticket: false,
  },
  {
    message: 'Got it. Can you share more detail about what happened and when?',
    options: ['It was a playoff match', 'Regular season match', 'Not match-related', 'Type details'],
    is_resolution: false,
    suggest_ticket: false,
  },
  {
    message: "Do you have any evidence — video, photos, or witness names?",
    options: ['Yes, I have video', 'I have witnesses', "No, just my account", 'Type details'],
    is_resolution: false,
    suggest_ticket: false,
  },
  {
    message: "Based on what you've shared, this looks like something to escalate so the right team can review. Want to raise a ticket?",
    options: ['Raise a ticket', 'Not yet — let me think', 'Something else'],
    is_resolution: false,
    suggest_ticket: true,
  },
];

function buildUserContextBlock(user: UserContext): string {
  return `\n\n---\nCURRENT USER:\n- Name: ${user.name}\n- Team: ${user.team ?? 'not set'}\n- Role: ${user.role}\n- Email: ${user.email}\nAddress the user by first name when appropriate. If they mention their team or a match, match it against their team when relevant.\n---`;
}

export class ChatService {
  hasApiKey() {
    return !!getClient();
  }

  hasRules() {
    return RULES.length > 0;
  }

  initialCategories(): string[] {
    return INITIAL_CATEGORIES;
  }

  /**
   * Generate a structured reply (message + chips). Returns a single object —
   * tool-use responses can't usefully be streamed chunk-by-chunk because the
   * frontend needs the full options array before it can render chips.
   */
  async generateStructuredReply(
    messages: ChatMessage[],
    userContext: UserContext,
  ): Promise<StructuredReply> {
    const client = getClient();
    if (!client) {
      const turn = Math.min(
        Math.floor(messages.length / 2),
        FALLBACK_SEQUENCE.length - 1,
      );
      return FALLBACK_SEQUENCE[turn];
    }

    const system = CRICKET_SUPPORT_SYSTEM_PROMPT + buildUserContextBlock(userContext);

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system,
      tools: [RESPOND_TOOL as any],
      tool_choice: { type: 'tool', name: 'respond_to_user' } as any,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const toolUse = response.content.find((b: any) => b.type === 'tool_use') as any;
    if (!toolUse || !toolUse.input) {
      throw new Error('Model did not return a respond_to_user tool call');
    }
    const input = toolUse.input as Partial<StructuredReply>;

    return {
      message: String(input.message ?? ''),
      options: Array.isArray(input.options) ? input.options.slice(0, 4) : [],
      is_resolution: !!input.is_resolution,
      suggest_ticket: !!input.suggest_ticket,
    };
  }

  /**
   * Synthesize a ticket (subject/description/category/priority) from a chat transcript.
   * Called when the user escalates a chat session to a ticket.
   */
  async synthesizeTicket(
    messages: ChatMessage[],
    userContext: UserContext,
  ): Promise<{
    subject: string;
    description: string;
    category: string;
    priority: string;
  }> {
    const client = getClient();

    const transcript = messages
      .map(m => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
      .join('\n');

    if (!client) {
      // Minimal fallback: take the first user message as the subject.
      const firstUser = messages.find(m => m.role === 'user')?.content || 'Support request';
      return {
        subject: firstUser.slice(0, 80),
        description: transcript.slice(0, 2000),
        category: 'feature_request',
        priority: 'medium',
      };
    }

    const synthTool = {
      name: 'build_ticket',
      description: 'Produce ticket fields from the conversation.',
      input_schema: {
        type: 'object',
        required: ['subject', 'description', 'category', 'priority'],
        properties: {
          subject: { type: 'string', maxLength: 120 },
          description: { type: 'string' },
          category: {
            type: 'string',
            enum: [
              'player_registration',
              'umpire_issues',
              'scoring_disputes',
              'equipment_issues',
              'match_scheduling',
              'disciplinary',
              'feature_request',
            ],
          },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        },
      },
    };

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:
        'Summarize a DCL support chat into a concise ticket. Pick the best category and priority. ' +
        'If a playoff is mentioned, priority should be urgent.' +
        buildUserContextBlock(userContext),
      tools: [synthTool as any],
      tool_choice: { type: 'tool', name: 'build_ticket' } as any,
      messages: [
        {
          role: 'user',
          content: `Produce ticket fields for this conversation:\n\n${transcript}`,
        },
      ],
    });

    const toolUse = response.content.find((b: any) => b.type === 'tool_use') as any;
    if (!toolUse) {
      throw new Error('Model did not return a build_ticket tool call');
    }
    const t = toolUse.input as any;
    return {
      subject: String(t.subject || 'Support request'),
      description: String(t.description || transcript).slice(0, 4000),
      category: String(t.category || 'feature_request'),
      priority: String(t.priority || 'medium'),
    };
  }
}

export const chatService = new ChatService();
