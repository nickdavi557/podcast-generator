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
      { status: "error", error: "Job not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: job.status,
    progress: job.progress,
    stage: job.stage,
    error: job.error,
  });
}
