import { z } from "zod";

export const podcastFormSchema = z.object({
  topic: z.string().min(1, "Topic is required").max(500, "Topic is too long"),
  urls: z.string().optional(),
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

export type PodcastFormData = z.infer<typeof podcastFormSchema>;

export interface DialogueSegment {
  speaker: "HOST_A" | "HOST_B";
  text: string;
}

export interface PodcastRequest {
  topic: string;
  urls?: string[];
  duration: "1-3" | "3-5" | "5-10";
  tone:
    | "conversational"
    | "educational"
    | "professional"
    | "entertaining"
    | "deep_dive";
  audience: "general" | "technical" | "business" | "students" | "enthusiasts";
}

export interface PodcastResponse {
  status: "processing" | "error";
  jobId?: string;
  message: string;
  error?: string;
}

export interface JobStatus {
  status: "processing" | "completed" | "error";
  progress: number;
  stage: string;
  error?: string;
}

export const DURATION_WORD_COUNTS: Record<string, { min: number; max: number }> = {
  "1-3": { min: 300, max: 450 },
  "3-5": { min: 450, max: 750 },
  "5-10": { min: 750, max: 1500 },
};

export const TONE_LABELS: Record<string, string> = {
  conversational: "Conversational (friendly, casual discussion)",
  educational: "Educational (informative, teaching-focused)",
  professional: "Professional (formal, business-oriented)",
  entertaining: "Entertaining (fun, engaging, lighthearted)",
  deep_dive: "Deep Dive (analytical, detailed exploration)",
};

export const AUDIENCE_LABELS: Record<string, string> = {
  general: "General Public (accessible to everyone)",
  technical: "Technical/Expert (assumes domain knowledge)",
  business: "Business Leaders (strategic, executive perspective)",
  students: "Students (educational, learning-focused)",
  enthusiasts: "Enthusiasts (passionate hobbyists)",
};
