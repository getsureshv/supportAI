import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const CRICKET_SUPPORT_SYSTEM_PROMPT = `You are a cricket support assistant for the Dallas Cricket League (DCL).
You help users create support tickets by interviewing them conversationally.

CONTEXT:
- Cricket rules are defined in the DCL rulebook (Laws 1-42)
- Users are team captains, players, umpires, or tournament staff
- Common issues: player eligibility, umpire calls, scoring errors, equipment, scheduling, discipline
- Tone: Professional, empathetic, encouraging fair play and Spirit of Cricket

YOUR ROLE:
1. Listen to the user's issue
2. Ask clarifying questions to understand context (Law #, match date, evidence)
3. Cite specific cricket rules (Law 1.2.2, Law 2.12, etc.)
4. Suggest quick fixes where possible
5. Offer escalation path if needed
6. Collect all details for a structured ticket

4-TURN INTERVIEW (flexible order):
1. Category: What type of issue? (Player, Umpire, Scoring, Equipment, Scheduling, Discipline, Feature)
2. Details: What happened? When? Any evidence (video, photo)?
3. Context: Which match? Which players/umpires? What's the impact?
4. Resolution: What's your preferred outcome? How urgent? (Playoff = URGENT)

WHEN TO SUGGEST QUICK FIXES:
- Playoff player eligibility: Direct to Law 1.5 rules
- Umpire call dispute: Ask for video, cite Law 2.12 (final but can be altered)
- Scoring error: Request scoresheet + video proof
- Missing equipment: Suggest having backups before next match
- Walk-over dispute: Confirm timing (must be within 45 mins of start)

ALWAYS:
- Reference specific Cricket Laws (e.g., "Per Law 1.2.2...")
- Validate frustrations ("That's tough, especially in a playoff...")
- Respect umpire authority (unless clear rule violation)
- Encourage gathering evidence (video, photos, witness statements)
- Note when issue is Playoff-related (→ URGENT priority)
- Suggest emailing dclmgmtops@gmail.com for time-sensitive issues

Keep responses concise (2-3 sentences) and conversational.`;

export class ChatService {
  async streamChatResponse(messages: ChatMessage[]) {
    try {
      const stream = client.messages.stream({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: CRICKET_SUPPORT_SYSTEM_PROMPT,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      return stream;
    } catch (error) {
      console.error('Chat streaming error:', error);
      throw error;
    }
  }

  async generateResponse(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        system: CRICKET_SUPPORT_SYSTEM_PROMPT,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      });

      const textContent = response.content.find(block => block.type === 'text');
      if (textContent && textContent.type === 'text') {
        return textContent.text;
      }

      throw new Error('No text content in response');
    } catch (error) {
      console.error('Chat error:', error);
      throw error;
    }
  }

  extractTicketData(conversation: ChatMessage[]): Record<string, any> {
    // Parse conversation to extract ticket details
    // This would analyze the conversation and extract:
    // - category (player_registration, umpire_issues, etc.)
    // - priority (based on urgency and playoff mention)
    // - key details mentioned
    // This is simplified - in production would use more sophisticated parsing

    const transcript = conversation.map(m => m.content).join(' ').toLowerCase();

    return {
      category: this.detectCategory(transcript),
      priority: this.detectPriority(transcript),
      keyPoints: this.extractKeyPoints(transcript),
    };
  }

  private detectCategory(text: string): string {
    const categoryKeywords = {
      player_registration: ['player', 'registration', 'eligible', 'roster', 'ineligible'],
      umpire_issues: ['umpire', 'call', 'decision', 'officiating', 'bias'],
      scoring_disputes: ['score', 'scorecard', 'runs', 'boundary', 'wicket'],
      equipment_issues: ['ball', 'bat', 'equipment', 'ground', 'stumps'],
      match_scheduling: ['schedule', 'reschedule', 'time', 'walk-over', 'late'],
      disciplinary: ['suspension', 'conduct', 'unfair', 'discipline', 'abuse'],
      feature_request: ['feature', 'request', 'app', 'website', 'improve'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        return category;
      }
    }

    return 'feature_request'; // default
  }

  private detectPriority(text: string): string {
    if (text.includes('playoff') || text.includes('urgent') || text.includes('asap')) {
      return 'urgent';
    }
    if (text.includes('important') || text.includes('soon')) {
      return 'high';
    }
    if (text.includes('eventually') || text.includes('nice-to-have')) {
      return 'low';
    }
    return 'medium';
  }

  private extractKeyPoints(text: string): string[] {
    // Very simplified extraction
    const sentences = text.split('.');
    return sentences
      .filter(s => s.length > 20)
      .slice(0, 3)
      .map(s => s.trim());
  }
}

export const chatService = new ChatService();
