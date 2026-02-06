import { NextRequest, NextResponse } from "next/server";
import { getJob } from "@/lib/jobStore";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const job = getJob(params.id);

  if (!job) {
    return NextResponse.json(
      { error: "Job not found" },
      { status: 404 }
    );
  }

  if (job.status !== "completed" || !job.audioBuffer) {
    return NextResponse.json(
      { error: "Podcast not ready yet" },
      { status: 400 }
    );
  }

  const filename = `podcast-${job.topic.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-")}.mp3`;

  return new NextResponse(new Uint8Array(job.audioBuffer), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": job.audioBuffer.length.toString(),
    },
  });
}
