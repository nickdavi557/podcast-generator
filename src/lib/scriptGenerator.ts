import { getOpenAIClient } from "./openai";
import { DialogueSegment, DURATION_WORD_COUNTS } from "@/types";

export async function generateScript(
  topic: string,
  urlSummaries: string,
  duration: string,
  tone: string,
  audience: string
): Promise<DialogueSegment[]> {
  const client = await getOpenAIClient();
  const wordCount = DURATION_WORD_COUNTS[duration];

  const systemPrompt = `You are a podcast script writer. Create a natural, engaging conversation between two podcast hosts about the given topic.

${urlSummaries ? `Context from URLs:\n${urlSummaries}\n` : ""}
Requirements:
- Duration: ${duration} minutes (approximately ${wordCount.min}-${wordCount.max} words total)
- Tone: ${tone}
- Audience: ${audience}
- Format: Dialogue between Host A and Host B
- Each speaker should talk for 1-3 sentences before switching
- Include natural conversational elements (agreements, follow-up questions, excitement)
- Make it informative but entertaining
- End with a brief wrap-up/conclusion

Output format (strictly follow this, one line per speaker turn):
HOST_A: [dialogue]
HOST_B: [dialogue]
HOST_A: [dialogue]
...

Do NOT include any other text, headers, or formatting. Only output the HOST_A/HOST_B lines.`;

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Create a podcast script about: ${topic}`,
          },
        ],
        temperature: 0.8,
        max_tokens: 4096,
      });

      const script = response.choices[0]?.message?.content;
      if (!script) {
        throw new Error("No script content generated");
      }

      return parseScript(script);
    } catch (error) {
      lastError = error as Error;
      console.error(`Script generation attempt ${attempt + 1} failed:`, error);
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw lastError || new Error("Script generation failed after all retries");
}

function parseScript(script: string): DialogueSegment[] {
  const lines = script.split("\n").filter((line) => line.trim());
  const segments: DialogueSegment[] = [];

  for (const line of lines) {
    const hostAMatch = line.match(/^HOST_A:\s*(.+)/);
    const hostBMatch = line.match(/^HOST_B:\s*(.+)/);

    if (hostAMatch) {
      segments.push({ speaker: "HOST_A", text: hostAMatch[1].trim() });
    } else if (hostBMatch) {
      segments.push({ speaker: "HOST_B", text: hostBMatch[1].trim() });
    }
  }

  if (segments.length === 0) {
    throw new Error("Failed to parse script: no valid dialogue segments found");
  }

  return segments;
}
