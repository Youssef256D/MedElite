"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { messages } from "@/messages";
import { WatermarkOverlay } from "@/components/lesson/watermark-overlay";

type VideoPlayerProps = {
  assetId?: string | null;
  lessonId: string;
  courseId: string;
  status?: string | null;
  canPlay: boolean;
  denialMessage?: string;
  initialPositionSeconds?: number;
  watermark?: {
    fullName: string;
    userId: string;
  } | null;
};

export function VideoPlayer({
  assetId,
  lessonId,
  courseId,
  status,
  canPlay,
  denialMessage,
  initialPositionSeconds = 0,
  watermark,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const persistProgress = useCallback(async (completed = false) => {
    const currentTime = Math.floor(videoRef.current?.currentTime ?? 0);

    if (!canPlay || !assetId) {
      return;
    }

    try {
      await fetch(`/api/student/lessons/${lessonId}/progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          secondsWatched: currentTime,
          lastPositionSeconds: currentTime,
          completed,
        }),
      });
    } catch {
      // Silent failure keeps playback uninterrupted.
    }
  }, [assetId, canPlay, courseId, lessonId]);

  useEffect(() => {
    if (!assetId || !canPlay) {
      return;
    }

    let active = true;

    async function loadPlaybackUrl() {
      try {
        setLoading(true);
        setLoadError(null);
        const response = await fetch(`/api/media/video/${assetId}/signed`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? messages.upload.playbackFailed);
        }

        const payload = (await response.json()) as { url: string };

        if (!active) {
          return;
        }

        setPlaybackUrl(payload.url);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : messages.upload.playbackFailed;
        setLoadError(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPlaybackUrl().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [assetId, canPlay]);

  useEffect(() => {
    if (!videoRef.current || initialPositionSeconds <= 0) {
      return;
    }

    const video = videoRef.current;

    function handleLoadedMetadata() {
      video.currentTime = initialPositionSeconds;
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [initialPositionSeconds]);

  useEffect(() => {
    if (!playbackUrl || !canPlay) {
      return;
    }

    async function syncProgress() {
      await persistProgress(false);
    }

    const interval = window.setInterval(() => {
      syncProgress().catch(() => undefined);
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [canPlay, playbackUrl, persistProgress]);

  if (!assetId || status === "PROCESSING" || status === "QUEUED" || status === "UPLOADING") {
    return (
      <Card className="flex min-h-80 items-center justify-center bg-[var(--color-surface)]">
        <div className="max-w-md space-y-3 text-center">
          <h3 className="text-xl font-semibold text-[var(--color-text)]">Video processing in progress</h3>
          <p className="text-sm leading-7 text-[var(--color-text-muted)]">{messages.upload.processing}</p>
        </div>
      </Card>
    );
  }

  if (!canPlay) {
    return (
      <Card className="flex min-h-80 items-center justify-center bg-[var(--color-surface)]">
        <div className="max-w-md space-y-3 text-center">
          <h3 className="text-xl font-semibold text-[var(--color-text)]">Lesson locked</h3>
          <p className="text-sm leading-7 text-[var(--color-text-muted)]">{denialMessage ?? "You do not have access to this lesson yet."}</p>
        </div>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="flex min-h-80 items-center justify-center bg-[var(--color-surface)]">
        <div className="max-w-md space-y-4 text-center">
          <h3 className="text-xl font-semibold text-[var(--color-text)]">Playback unavailable</h3>
          <p className="text-sm leading-7 text-[var(--color-text-muted)]">{loadError}</p>
          <Button onClick={() => window.location.reload()} variant="secondary">
            Refresh player
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[#091311] shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
      {watermark ? <WatermarkOverlay fullName={watermark.fullName} userId={watermark.userId} /> : null}
      <div className="aspect-video w-full">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm font-medium text-white/70">Preparing secure playback...</div>
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full"
            controls
            controlsList="nodownload noplaybackrate"
            playsInline
            preload="metadata"
            src={playbackUrl ?? undefined}
            onEnded={() => {
              persistProgress(true).catch(() => undefined);
              toast.success("Lesson marked as completed.");
            }}
            onError={() => {
              setLoadError(messages.upload.playbackFailed);
            }}
          />
        )}
      </div>
    </div>
  );
}
