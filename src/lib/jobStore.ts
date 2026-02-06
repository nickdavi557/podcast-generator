export interface Job {
  id: string;
  status: "processing" | "completed" | "error";
  progress: number; // 0-100
  stage: string;
  audioBuffer?: Buffer;
  error?: string;
  topic: string;
  createdAt: number;
}

// Use globalThis to ensure a single shared Map across all module instances
// (Next.js dev mode creates separate module contexts per route)
const globalForJobs = globalThis as unknown as { __podcastJobs?: Map<string, Job> };
if (!globalForJobs.__podcastJobs) {
  globalForJobs.__podcastJobs = new Map<string, Job>();
}
const jobs = globalForJobs.__podcastJobs;

// Clean up jobs older than 30 minutes
const EXPIRY_MS = 30 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  jobs.forEach((job, id) => {
    if (now - job.createdAt > EXPIRY_MS) {
      jobs.delete(id);
    }
  });
}

export function createJob(id: string, topic: string): Job {
  cleanup();
  const job: Job = {
    id,
    status: "processing",
    progress: 0,
    stage: "Starting...",
    topic,
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  return job;
}

export function updateJob(
  id: string,
  update: Partial<Pick<Job, "status" | "progress" | "stage" | "audioBuffer" | "error">>
) {
  const job = jobs.get(id);
  if (job) {
    Object.assign(job, update);
  }
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function getJobAudio(id: string): Buffer | undefined {
  return jobs.get(id)?.audioBuffer;
}

export function deleteJobAudio(id: string) {
  const job = jobs.get(id);
  if (job) {
    delete job.audioBuffer;
  }
}
