"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { WatermarkOverlay } from "@/components/lesson/watermark-overlay";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { messages } from "@/messages";

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

type PlaybackSource = {
  provider?: "kinescope" | "stream";
  url: string;
  videoId?: string;
};

type KinescopeFactory = Awaited<ReturnType<typeof import("@kinescope/player-iframe-api-loader").load>>;
type KinescopePlayer = Awaited<ReturnType<KinescopeFactory["create"]>>;

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
  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const kinescopePlayerRef = useRef<KinescopePlayer | null>(null);
  const currentTimeRef = useRef(initialPositionSeconds);

  const [playbackSource, setPlaybackSource] = useState<PlaybackSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [playerBooting, setPlayerBooting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const getCurrentPositionSeconds = useCallback(async () => {
    if (kinescopePlayerRef.current) {
      try {
        const currentTime = Math.floor(await kinescopePlayerRef.current.getCurrentTime());
        currentTimeRef.current = currentTime;
        return currentTime;
      } catch {
        return currentTimeRef.current;
      }
    }

    const currentTime = Math.floor(videoRef.current?.currentTime ?? currentTimeRef.current ?? 0);
    currentTimeRef.current = currentTime;
    return currentTime;
  }, []);

  const persistProgress = useCallback(async (completed = false) => {
    if (!canPlay || !assetId) {
      return;
    }

    const currentTime = await getCurrentPositionSeconds();

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
  }, [assetId, canPlay, courseId, getCurrentPositionSeconds, lessonId]);

  useEffect(() => {
    currentTimeRef.current = initialPositionSeconds;
  }, [assetId, initialPositionSeconds]);

  useEffect(() => {
    if (!assetId || !canPlay) {
      setPlaybackSource(null);
      return;
    }

    let active = true;

    async function loadPlaybackSource() {
      try {
        setLoading(true);
        setLoadError(null);
        setPlaybackSource(null);

        const response = await fetch(`/api/media/video/${assetId}/signed`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? messages.upload.playbackFailed);
        }

        const payload = (await response.json()) as PlaybackSource;

        if (!active) {
          return;
        }

        setPlaybackSource({
          provider: payload.provider ?? "stream",
          url: payload.url,
          videoId: payload.videoId,
        });
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

    loadPlaybackSource().catch(() => undefined);

    return () => {
      active = false;
    };
  }, [assetId, canPlay]);

  useEffect(() => {
    if (!videoRef.current || initialPositionSeconds <= 0 || playbackSource?.provider === "kinescope") {
      return;
    }

    const video = videoRef.current;

    function handleLoadedMetadata() {
      video.currentTime = initialPositionSeconds;
      currentTimeRef.current = initialPositionSeconds;
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
  }, [initialPositionSeconds, playbackSource?.provider]);

  useEffect(() => {
    const hostElement = playerHostRef.current;
    const source = playbackSource;

    if (!source || source.provider !== "kinescope" || !canPlay || !hostElement) {
      if (hostElement) {
        hostElement.innerHTML = "";
      }

      kinescopePlayerRef.current = null;
      setPlayerBooting(false);
      return;
    }

    let active = true;
    let player: KinescopePlayer | null = null;
    let mountNode: HTMLDivElement | null = null;

    async function mountKinescopePlayer() {
      try {
        setPlayerBooting(true);
        const { load } = await import("@kinescope/player-iframe-api-loader");
        const factory = await load();
        const mountedHost = hostElement;
        const currentSource = source;

        if (!active || !mountedHost || !currentSource) {
          return;
        }

        mountedHost.innerHTML = "";
        mountNode = document.createElement("div");
        mountNode.className = "h-full w-full";
        mountedHost.appendChild(mountNode);

        player = await factory.create(mountNode, {
          url: currentSource.url,
          size: {
            width: "100%",
            height: "100%",
          },
          behavior: {
            preload: "metadata",
            playsInline: true,
            autoPause: true,
            localStorage: false,
          },
          ui: {
            controls: true,
            playbackRateButton: false,
            screenshotButton: false,
          },
          settings: {
            externalId: lessonId,
          },
          keepElement: true,
        });

        if (!active) {
          await player.destroy().catch(() => undefined);
          return;
        }

        kinescopePlayerRef.current = player;

        const syncInitialSeek = () => {
          if (initialPositionSeconds > 0) {
            currentTimeRef.current = initialPositionSeconds;
            player?.seekTo(initialPositionSeconds).catch(() => undefined);
          }

          setPlayerBooting(false);
        };

        const handleTimeUpdate = ((event) => {
          if (event.data && typeof event.data === "object" && "currentTime" in event.data) {
            currentTimeRef.current = Math.floor(Number(event.data.currentTime) || 0);
          }
        }) as Parameters<KinescopePlayer["on"]>[1];

        const handleEnded = () => {
          persistProgress(true).catch(() => undefined);
          toast.success("Lesson marked as completed.");
        };

        const handleError = () => {
          if (!active) {
            return;
          }

          setPlayerBooting(false);
          setLoadError(messages.upload.playbackFailed);
        };

        player.on(player.Events.Loaded, syncInitialSeek);
        player.on(player.Events.Ready, syncInitialSeek);
        player.on(player.Events.TimeUpdate, handleTimeUpdate);
        player.on(player.Events.Ended, handleEnded);
        player.on(player.Events.Error, handleError);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : messages.upload.playbackFailed;
        setLoadError(message);
        setPlayerBooting(false);
      }
    }

    mountKinescopePlayer().catch(() => undefined);

    return () => {
      active = false;
      kinescopePlayerRef.current = null;

      if (player) {
        player.destroy().catch(() => undefined);
      }

      hostElement.innerHTML = "";
    };
  }, [canPlay, initialPositionSeconds, lessonId, persistProgress, playbackSource]);

  useEffect(() => {
    if (!playbackSource || !canPlay) {
      return;
    }

    async function syncProgress() {
      await persistProgress(false);
    }

    const interval = window.setInterval(() => {
      syncProgress().catch(() => undefined);
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [canPlay, playbackSource, persistProgress]);

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
    <div
      className="relative overflow-hidden rounded-[32px] border border-[var(--color-border)] bg-[#091311] shadow-[0_24px_80px_rgba(15,23,42,0.22)]"
      onContextMenu={(event) => event.preventDefault()}
    >
      {watermark ? <WatermarkOverlay fullName={watermark.fullName} userId={watermark.userId} /> : null}
      <div className="aspect-video w-full">
        {loading || playerBooting ? (
          <div className="flex h-full items-center justify-center text-sm font-medium text-white/70">Preparing secure playback...</div>
        ) : playbackSource?.provider === "kinescope" ? (
          <div ref={playerHostRef} className="h-full w-full [&_iframe]:h-full [&_iframe]:w-full" />
        ) : (
          <video
            ref={videoRef}
            className="h-full w-full"
            controls
            controlsList="nodownload noplaybackrate"
            playsInline
            preload="metadata"
            src={playbackSource?.url ?? undefined}
            onTimeUpdate={() => {
              currentTimeRef.current = Math.floor(videoRef.current?.currentTime ?? 0);
            }}
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
