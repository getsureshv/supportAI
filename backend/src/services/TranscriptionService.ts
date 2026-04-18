import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  return key ? new Anthropic({ apiKey: key }) : null;
}

// Claude supports these image types directly via the vision API.
const VISION_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export class TranscriptionService {
  async transcribe(filePath: string, mimeType: string, fileName: string): Promise<string> {
    try {
      if (mimeType === 'application/pdf') {
        return await this.transcribePdf(filePath);
      }
      if (VISION_MIME_TYPES.includes(mimeType)) {
        return await this.transcribeImage(filePath, mimeType, fileName);
      }
      if (mimeType.startsWith('text/')) {
        const text = readFileSync(filePath, 'utf8');
        return text.slice(0, 10000); // cap plain text at 10k chars
      }
      return `[File "${fileName}" (${mimeType}) was uploaded but cannot be transcribed automatically. Support staff can review it manually.]`;
    } catch (err: any) {
      return `[Transcription failed for "${fileName}": ${err?.message || 'unknown error'}]`;
    }
  }

  private async transcribePdf(filePath: string): Promise<string> {
    // pdftotext ships with poppler and is already available on this machine (see Git Bash /mingw64/bin).
    const { stdout } = await execFileAsync('pdftotext', ['-layout', filePath, '-']);
    return stdout.trim() || '[PDF contained no extractable text]';
  }

  private async transcribeImage(filePath: string, mimeType: string, fileName: string): Promise<string> {
    const client = getClient();
    if (!client) {
      return `[Image "${fileName}" uploaded — vision transcription unavailable without ANTHROPIC_API_KEY]`;
    }

    const base64 = readFileSync(filePath).toString('base64');

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as any,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `You are reviewing an image uploaded as evidence for a cricket support ticket. Describe what you see in detail so support staff can assess it without opening the file.

Include (whichever are present):
- Any visible text (scoresheets, scorecards, rosters, messages, timestamps)
- People, uniforms, equipment, field/ground conditions
- Match context clues (umpire signals, batsman/bowler positioning, scoreboard readings)
- Anything unusual or dispute-relevant

If the image is a document, transcribe the text verbatim. If it's a photo or screenshot, give a factual description — don't speculate about intent.

Keep it under 300 words.`,
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b: any) => b.type === 'text') as any;
    return textBlock?.text ?? '[No description produced]';
  }
}

export const transcriptionService = new TranscriptionService();
