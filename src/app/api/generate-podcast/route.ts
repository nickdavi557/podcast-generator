import "@/lib/polyfills";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createJob, updateJob } from "@/lib/jobStore";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

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

  const { topic, urls, duration, tone, audience } = parsed.data;

  const jobId = crypto.randomUUID();
  createJob(jobId, topic);

  const processingPromise = processInBackground(
    jobId,
    topic,
    urls || [],
    duration,
    tone,
    audience
  );

  processingPromise.catch((err) => {
    console.error("Background processing failed:", err);
  });

  return NextResponse.json({
    status: "processing",
    jobId,
    message: "Your podcast is being generated!",
  });
}

async function processInBackground(
  jobId: string,
  topic: string,
  urls: string[],
  duration: string,
  tone: string,
  audience: string
): Promise<void> {
  const { generateScript } = await import("@/lib/scriptGenerator");
  const { generatePodcastAudio } = await import("@/lib/audioGenerator");

  try {
    console.log(`[${jobId}] Starting podcast generation for: "${topic}"`);

    // Step 1: Generate script (0-40%)
    updateJob(jobId, { progress: 5, stage: "Searching the web and writing script..." });

    if (urls.length > 0) {
      console.log(`[${jobId}] Including ${urls.length} reference URLs`);
    }

    const segments = await generateScript(topic, urls, duration, tone, audience);
    console.log(`[${jobId}] Script generated with ${segments.length} segments`);

    // Step 2: Generate audio (40-95%)
    updateJob(jobId, { progress: 40, stage: "Generating audio..." });

    const audioBuffer = await generatePodcastAudio(segments, (segIndex, total) => {
      const audioProgress = 40 + Math.round((segIndex / total) * 55);
      updateJob(jobId, {
        progress: audioProgress,
        stage: `Generating audio (${segIndex}/${total})...`,
      });
    });

    // Step 3: Done
    updateJob(jobId, {
      status: "completed",
      progress: 100,
      stage: "Complete!",
      audioBuffer,
    });

    console.log(`[${jobId}] Podcast generation complete!`);
  } catch (error) {
    console.error(`[${jobId}] Podcast generation failed:`, error);
    updateJob(jobId, {
      status: "error",
      progress: 0,
      stage: "Failed",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
}
