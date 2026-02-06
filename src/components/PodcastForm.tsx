"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  podcastFormSchema,
  PodcastFormData,
  PodcastResponse,
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
  const [result, setResult] = useState<PodcastResponse | null>(null);

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

  const onSubmit = async (data: PodcastFormData) => {
    setIsSubmitting(true);
    setResult(null);

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
          email: data.email,
        }),
      });

      const result: PodcastResponse = await response.json();
      setResult(result);
    } catch {
      setResult({
        status: "error",
        message: "Failed to submit request. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (result?.status === "processing") {
    return (
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
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
        <h2 className="text-2xl font-semibold text-foreground">
          Podcast is Being Generated!
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          {result.message}
        </p>
        {result.estimatedTime && (
          <p className="text-sm text-muted-foreground">
            Estimated time: {result.estimatedTime}
          </p>
        )}
        <Button
          onClick={() => {
            setResult(null);
            reset();
          }}
          variant="outline"
        >
          Create Another Podcast
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {result?.status === "error" && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {result.message}
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

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email Address <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          placeholder="your.email@example.com"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
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
