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
You help captains, players, umpires, and tournament staff triage support tickets.

Your job: listen, ask targeted follow-ups, cite specific rules, suggest quick fixes, and collect
everything needed for a clean ticket. Keep replies short (2-4 sentences) and conversational.

INTERVIEW FLOW (flexible order — skip turns if the user has already answered):
1. Category — which of the 7 categories does this fall under?
2. Details — what happened, when, with what evidence (video/photo/witnesses)?
3. Context — which match, which teams/players/umpires, is this a playoff?
4. Resolution — what outcome does the user want, and how urgent?

Always bump priority to URGENT when a playoff is affected.

When you cite a rule or solution, use the exact wording and Law numbers from the rules
reference below. If the rules reference doesn't cover something, say so honestly rather
than inventing a Law number.`;

const TRIAGE_SECTION = RULES
  ? `\n\n---\nDCL SUPPORT PLAYBOOK (primary reference — quick fixes, escalation paths, SLAs):\n\n${RULES}\n---\n`
  : '';

const RULEBOOK_SECTION = RULEBOOK
  ? `\n\n---\nDCL OFFICIAL RULEBOOK (use for exact Law citations and numeric rule thresholds):\n\n${RULEBOOK}\n---\n`
  : '';

export const CRICKET_SUPPORT_SYSTEM_PROMPT = BASE_PROMPT + TRIAGE_SECTION + RULEBOOK_SECTION;

// Stock fallback responses keyed to the 4-turn interview flow (used only when
// ANTHROPIC_API_KEY is not set).
const FALLBACK_REPLIES = [
  "Hi! I'm your DCL support assistant. To get started — what type of issue are you facing? (Player registration, umpire call, scoring, equipment, scheduling, discipline, or a feature request?)",
  "Got it — can you walk me through what happened? When did the incident occur, and do you have any evidence like video, photos, or witness details?",
  "Thanks. Which match was this, and who was involved (players, umpires, teams)? Was this a regular-season or playoff fixture? Playoffs will bump this to URGENT priority.",
  "Last thing — what outcome are you hoping for, and how time-sensitive is this? Once you share that, I'll summarize and you can submit the ticket.",
  "Perfect, I have what I need. Per the DCL rulebook, your issue falls under the appropriate Law. Please click 'Create Ticket' on the left and I'll make sure it's routed to the right team.",
];

export class ChatService {
  hasApiKey() {
    return !!getClient();
  }

  hasRules() {
    return RULES.length > 0;
  }

  async *streamChatResponse(messages: ChatMessage[]): AsyncGenerator<string> {
    const client = getClient();
    if (!client) {
      const turn = Math.min(Math.floor(messages.length / 2), FALLBACK_REPLIES.length - 1);
      const reply = FALLBACK_REPLIES[turn];
      for (const word of reply.split(' ')) {
        yield word + ' ';
        await new Promise(r => setTimeout(r, 30));
      }
      return;
    }

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: CRICKET_SUPPORT_SYSTEM_PROMPT,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    const client = getClient();
    if (!client) {
      const turn = Math.min(Math.floor(messages.length / 2), FALLBACK_REPLIES.length - 1);
      return FALLBACK_REPLIES[turn];
    }

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: CRICKET_SUPPORT_SYSTEM_PROMPT,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((b: any) => b.type === 'text') as any;
    return textBlock?.text ?? '';
  }
}

export const chatService = new ChatService();
