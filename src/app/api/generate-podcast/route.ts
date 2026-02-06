import "@/lib/polyfills";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes for Vercel Pro

const requestSchema = z.object({
  topic: z.string().min(1).max(500),
  urls: z.array(z.string().url()).optional(),
  duration: z.enum(["1-3", "3-5", "5-10"]),
  tone: z.enum([
    "conversational",
    "educational",
    "professional",
    "entertaining",
    "deep_dive",
  ]),
  audience: z.enum([
    "general",
    "technical",
    "business",
    "students",
    "enthusiasts",
  ]),
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        status: "error",
        message: "Validation failed",
        error: parsed.error.issues.map((i) => i.message).join(", "),
      },
      { status: 400 }
    );
  }

  const { topic, urls, duration, tone, audience, email } = parsed.data;

  // Fire-and-forget: start background processing, respond immediately
  const processingPromise = processInBackground(
    topic,
    urls || [],
    duration,
    tone,
    audience,
    email
  );

  // Prevent the promise from crashing the process if it rejects unhandled
  processingPromise.catch((err) => {
    console.error("Background processing failed:", err);
  });

  return NextResponse.json({
    status: "processing",
    message:
      "Your podcast is being generated! You'll receive it via email shortly.",
    estimatedTime: "3-5 minutes",
  });
}

async function processInBackground(
  topic: string,
  urls: string[],
  duration: string,
  tone: string,
  audience: string,
  email: string
): Promise<void> {
  // Dynamic imports to avoid build-time issues with Node.js 18 + openai SDK
  const { generateScript } = await import("@/lib/scriptGenerator");
  const { generatePodcastAudio } = await import("@/lib/audioGenerator");
  const { sendPodcastEmail, sendErrorEmail } = await import(
    "@/lib/emailSender"
  );

  try {
    console.log(`Starting podcast generation for topic: "${topic}"`);
    if (urls.length > 0) {
      console.log(`Including ${urls.length} reference URLs for OpenAI`);
    }

    // Step 1: Generate podcast script (URLs passed directly to OpenAI)
    console.log("Generating podcast script...");
    const segments = await generateScript(
      topic,
      urls,
      duration,
      tone,
      audience
    );
    console.log(`Script generated with ${segments.length} segments`);

    // Step 2: Generate audio
    console.log("Generating audio...");
    const audioBuffer = await generatePodcastAudio(segments);

    // Step 3: Send email
    console.log(`Sending podcast to ${email}...`);
    await sendPodcastEmail(email, topic, duration, audioBuffer);

    console.log("Podcast generation complete!");
  } catch (error) {
    console.error("Podcast generation failed:", error);

    // Try to send error notification email
    await sendErrorEmail(
      email,
      topic,
      error instanceof Error ? error.message : "Unknown error occurred"
    );
  }
}
