import { DialogueSegment } from "@/types";

const PORTKEY_BASE_URL =
  process.env.PORTKEY_BASE_URL || "https://portkey.bain.dev/v1";
const PORTKEY_API_KEY = process.env.PORTKEY_API_KEY || "";

async function generateSegmentAudio(
  segment: DialogueSegment
): Promise<Buffer> {
  const voice = segment.speaker === "HOST_A" ? "marin" : "cedar";

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(`${PORTKEY_BASE_URL}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PORTKEY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini-tts-2025-12-15",
          input: segment.text,
          voice: voice,
          response_format: "mp3",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS API error ${response.status}: ${errorText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      lastError = error as Error;
      console.error(
        `Audio generation attempt ${attempt + 1} failed for ${segment.speaker}:`,
        error
      );
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }

  throw (
    lastError || new Error("Audio generation failed after all retries")
  );
}

function createSilenceMp3(durationMs: number = 300): Buffer {
  // Generate a minimal valid MP3 frame of silence
  // MP3 frame at 128kbps, 44100Hz, stereo
  // Each frame is 1152 samples = ~26.12ms at 44100Hz
  const framesNeeded = Math.ceil(durationMs / 26.12);
  const frameSize = 417; // bytes per frame at 128kbps, 44100Hz

  // Minimal silent MP3 frame (MPEG1 Layer3, 128kbps, 44100Hz, stereo)
  const silentFrame = Buffer.alloc(frameSize, 0);
  // MP3 frame header: 0xFF 0xFB 0x90 0x00
  silentFrame[0] = 0xff;
  silentFrame[1] = 0xfb;
  silentFrame[2] = 0x90;
  silentFrame[3] = 0x00;

  const frames: Buffer[] = [];
  for (let i = 0; i < framesNeeded; i++) {
    frames.push(Buffer.from(silentFrame));
  }
  return Buffer.concat(frames);
}

export async function generatePodcastAudio(
  segments: DialogueSegment[],
  onProgress?: (segmentIndex: number, total: number) => void
): Promise<Buffer> {
  console.log(`Generating audio for ${segments.length} segments...`);
  const audioBuffers: Buffer[] = [];
  const silenceBuffer = createSilenceMp3(300);

  for (let i = 0; i < segments.length; i++) {
    console.log(
      `Generating segment ${i + 1}/${segments.length} (${segments[i].speaker})...`
    );
    onProgress?.(i + 1, segments.length);
    const audioBuffer = await generateSegmentAudio(segments[i]);
    audioBuffers.push(audioBuffer);

    // Add silence between segments (not after the last one)
    if (i < segments.length - 1) {
      audioBuffers.push(silenceBuffer);
    }
  }

  // Concatenate all MP3 buffers
  // MP3 files can be concatenated directly since each frame is independent
  const finalAudio = Buffer.concat(audioBuffers);
  console.log(
    `Final podcast audio size: ${(finalAudio.length / 1024 / 1024).toFixed(2)} MB`
  );

  return finalAudio;
}
