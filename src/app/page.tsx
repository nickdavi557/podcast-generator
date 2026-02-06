import PodcastForm from "@/components/PodcastForm";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="p-6 pb-4 text-center space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              AI Podcast Generator
            </h1>
            <p className="text-sm text-muted-foreground">
              Create Your Custom Podcast
            </p>
          </div>
          <div className="p-6 pt-0">
            <PodcastForm />
          </div>
        </div>
      </div>
    </div>
  );
}
