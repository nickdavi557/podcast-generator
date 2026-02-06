import type OpenAI from "openai";

let client: OpenAI | null = null;

export async function getOpenAIClient(): Promise<OpenAI> {
  if (!client) {
    const { default: OpenAI } = await import("openai");
    client = new OpenAI({
      baseURL: process.env.PORTKEY_BASE_URL || "https://portkey.bain.dev/v1",
      apiKey: process.env.PORTKEY_API_KEY,
    });
  }
  return client;
}
