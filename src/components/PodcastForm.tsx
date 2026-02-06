"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  podcastFormSchema,
  PodcastFormData,
  JobStatus,
  TONE_LABELS,
  AUDIENCE_LABELS,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function PodcastForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<PodcastFormData>({
    resolver: zodResolver(podcastFormSchema),
    defaultValues: {
      duration: "3-5",
      tone: "conversational",
      audience: "general",
    },
  });

  const duration = watch("duration");

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const startPolling = useCallback(
    (id: string) => {
      stopPolling();
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/podcast-status/${id}`);
          const data: JobStatus = await res.json();
          setJobStatus(data);

          if (data.status === "completed" || data.status === "error") {
            stopPolling();
          }
        } catch {
          // Keep polling on network errors
        }
      }, 1500);
    },
    [stopPolling]
  );

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const onSubmit = async (data: PodcastFormData) => {
    setIsSubmitting(true);
    setError(null);
    setJobId(null);
    setJobStatus(null);

    try {
      const urls = data.urls
        ? data.urls
            .split("\n")
            .map((u) => u.trim())
            .filter((u) => u.length > 0)
        : undefined;

      const response = await fetch("/api/generate-podcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: data.topic,
          urls,
          duration: data.duration,
          tone: data.tone,
          audience: data.audience,
        }),
      });

      const result = await response.json();

      if (result.status === "error") {
        setError(result.message || "Something went wrong");
        setIsSubmitting(false);
        return;
      }

      setJobId(result.jobId);
      setJobStatus({ status: "processing", progress: 0, stage: "Starting..." });
      startPolling(result.jobId);
    } catch {
      setError("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    stopPolling();
    setJobId(null);
    setJobStatus(null);
    setError(null);
    reset();
  };

  // Progress / completed / error view
  if (jobId && jobStatus) {
    return (
      <div className="space-y-6">
        {/* Progress bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{jobStatus.stage}</span>
            <span className="font-medium">{jobStatus.progress}%</span>
          </div>
          <div className="h-3 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${jobStatus.progress}%` }}
            />
          </div>
        </div>

        {/* Completed */}
        {jobStatus.status === "completed" && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-green-600"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Your podcast is ready!</h2>
            <div className="flex flex-col gap-3">
              <a
                href={`/api/podcast-download/${jobId}`}
                download
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground h-11 px-8 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Download Podcast
              </a>
              <Button onClick={handleReset} variant="outline">
                Create Another Podcast
              </Button>
            </div>
          </div>
        )}

        {/* Error */}
        {jobStatus.status === "error" && (
          <div className="text-center space-y-4">
            <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
              {jobStatus.error || "Something went wrong during generation."}
            </div>
            <Button onClick={handleReset} variant="outline">
              Try Again
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Topic */}
      <div className="space-y-2">
        <Label htmlFor="topic">
          Topic <span className="text-destructive">*</span>
        </Label>
        <Input
          id="topic"
          placeholder='e.g., "The Future of AI"'
          {...register("topic")}
        />
        {errors.topic && (
          <p className="text-sm text-destructive">{errors.topic.message}</p>
        )}
      </div>

      {/* URLs */}
      <div className="space-y-2">
        <Label htmlFor="urls">URLs (Optional - one per line)</Label>
        <Textarea
          id="urls"
          placeholder={"https://example.com/article1\nhttps://example.com/article2"}
          rows={3}
          {...register("urls")}
        />
      </div>

      {/* Duration */}
      <div className="space-y-3">
        <Label>
          Duration <span className="text-destructive">*</span>
        </Label>
        <RadioGroup
          value={duration}
          onValueChange={(value) =>
            setValue("duration", value as PodcastFormData["duration"])
          }
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="1-3" id="duration-1-3" />
            <Label htmlFor="duration-1-3" className="font-normal cursor-pointer">
              1-3 minutes
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="3-5" id="duration-3-5" />
            <Label htmlFor="duration-3-5" className="font-normal cursor-pointer">
              3-5 minutes
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="5-10" id="duration-5-10" />
            <Label htmlFor="duration-5-10" className="font-normal cursor-pointer">
              5-10 minutes
            </Label>
          </div>
        </RadioGroup>
        {errors.duration && (
          <p className="text-sm text-destructive">{errors.duration.message}</p>
        )}
      </div>

      {/* Tone */}
      <div className="space-y-2">
        <Label>
          Tone <span className="text-destructive">*</span>
        </Label>
        <Select
          defaultValue="conversational"
          onValueChange={(value) =>
            setValue("tone", value as PodcastFormData["tone"])
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a tone" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TONE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.tone && (
          <p className="text-sm text-destructive">{errors.tone.message}</p>
        )}
      </div>

      {/* Audience */}
      <div className="space-y-2">
        <Label>
          Audience <span className="text-destructive">*</span>
        </Label>
        <Select
          defaultValue="general"
          onValueChange={(value) =>
            setValue("audience", value as PodcastFormData["audience"])
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an audience" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.audience && (
          <p className="text-sm text-destructive">{errors.audience.message}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generating...
          </span>
        ) : (
          "Generate Podcast"
        )}
      </Button>
    </form>
  );
}
