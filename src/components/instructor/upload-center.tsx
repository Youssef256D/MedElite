"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatBytes } from "@/lib/utils";
import { messages } from "@/messages";

type UploadCourse = {
  id: string;
  title: string;
  lessonCount: number;
};

type UploadCenterProps = {
  courses: UploadCourse[];
  initialCourseId?: string;
};

type PersistedUpload = {
  uploadId: string;
  courseId: string;
  lessonTitle: string;
  fileName: string;
  sizeBytes: number;
};

const STORAGE_KEY = "medelite.pending-upload";

async function readVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve(Math.floor(video.duration));
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      reject(new Error("Could not read video metadata."));
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });
}

function normalizeLessonName(input: string) {
  return input.replace(/^video\s+\d+\s*[-:]\s*/i, "").trim();
}

export function UploadCenter({ courses, initialCourseId }: UploadCenterProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [courseOptions, setCourseOptions] = useState(courses);
  const [selectedCourseId, setSelectedCourseId] = useState(
    initialCourseId && courses.some((course) => course.id === initialCourseId)
      ? initialCourseId
      : courses[0]?.id ?? "",
  );
  const [lessonName, setLessonName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const selectedCourse = useMemo(
    () => courseOptions.find((course) => course.id === selectedCourseId) ?? null,
    [courseOptions, selectedCourseId],
  );
  const normalizedLessonTitle = normalizeLessonName(lessonName);
  const nextVideoNumber = String((selectedCourse?.lessonCount ?? 0) + 1).padStart(2, "0");
  const previewTitle = normalizedLessonTitle
    ? `Video ${nextVideoNumber} - ${normalizedLessonTitle}`
    : `Video ${nextVideoNumber} - Lesson title`;

  async function fetchExistingUpload(fileToUpload: File) {
    const persistedValue = window.localStorage.getItem(STORAGE_KEY);

    if (!persistedValue || !selectedCourse || !normalizedLessonTitle) {
      return null;
    }

    const persisted = JSON.parse(persistedValue) as PersistedUpload;

    if (
      persisted.courseId !== selectedCourse.id ||
      persisted.lessonTitle !== normalizedLessonTitle ||
      persisted.fileName !== fileToUpload.name ||
      persisted.sizeBytes !== fileToUpload.size
    ) {
      return null;
    }

    const response = await fetch(`/api/instructor/uploads/${persisted.uploadId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as {
      id: string;
      chunkSize: number;
      totalChunks: number;
      uploadedChunks: number[];
    };
  }

  async function uploadWithRetry(uploadId: string, chunkIndex: number, totalChunks: number, body: Blob, retries = 3) {
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const response = await fetch(`/api/instructor/uploads/${uploadId}/chunk`, {
          method: "PUT",
          headers: {
            "x-chunk-index": String(chunkIndex),
            "x-total-chunks": String(totalChunks),
          },
          body,
          signal: abortControllerRef.current?.signal,
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(payload?.message ?? messages.upload.failed);
        }

        return;
      } catch (error) {
        if (abortControllerRef.current?.signal.aborted) {
          throw error;
        }

        if (attempt === retries - 1) {
          throw error;
        }

        setMessage(messages.upload.interrupted);
        await new Promise((resolve) => setTimeout(resolve, 1_500 * (attempt + 1)));
      }
    }
  }

  async function startUpload() {
    if (!selectedCourse || !normalizedLessonTitle || !file) {
      setMessage("Choose a course, write the lesson name, and select a video file before uploading.");
      return;
    }

    try {
      setUploading(true);
      setMessage(messages.upload.inProgress);
      abortControllerRef.current = new AbortController();

      const durationSeconds = await readVideoDuration(file).catch(() => undefined);
      const existingUpload = await fetchExistingUpload(file);
      const initResponse =
        existingUpload ??
        (await fetch("/api/instructor/uploads/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            courseId: selectedCourse.id,
            lessonTitle: normalizedLessonTitle,
            fileName: file.name,
            mimeType: file.type || "video/mp4",
            sizeBytes: file.size,
            durationSeconds,
          }),
        }).then(async (response) => {
          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { message?: string } | null;
            throw new Error(payload?.message ?? messages.upload.failed);
          }

          return response.json() as Promise<{
            id: string;
            chunkSize: number;
            totalChunks: number;
          }>;
        }));

      if (!initResponse) {
        throw new Error(messages.upload.failed);
      }

      setActiveUploadId(initResponse.id);
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          uploadId: initResponse.id,
          courseId: selectedCourse.id,
          lessonTitle: normalizedLessonTitle,
          fileName: file.name,
          sizeBytes: file.size,
        } satisfies PersistedUpload),
      );

      const uploadedChunkSet = new Set(existingUpload?.uploadedChunks ?? []);
      const totalChunks = initResponse.totalChunks;

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        if (uploadedChunkSet.has(chunkIndex)) {
          setProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
          continue;
        }

        const start = chunkIndex * initResponse.chunkSize;
        const end = Math.min(start + initResponse.chunkSize, file.size);
        const chunk = file.slice(start, end);
        await uploadWithRetry(initResponse.id, chunkIndex, totalChunks, chunk);
        setProgress(Math.round(((chunkIndex + 1) / totalChunks) * 100));
      }

      const completeResponse = await fetch(`/api/instructor/uploads/${initResponse.id}/complete`, {
        method: "POST",
      });

      if (!completeResponse.ok) {
        const payload = (await completeResponse.json().catch(() => null)) as { message?: string } | null;
        throw new Error(payload?.message ?? messages.upload.failed);
      }

      window.localStorage.removeItem(STORAGE_KEY);
      setMessage(`${previewTitle} was uploaded and queued for background processing.`);
      toast.success("Upload assembled and queued for processing.");
      setFile(null);
      setProgress(100);
      setActiveUploadId(null);
      setLessonName("");
      setCourseOptions((current) =>
        current.map((course) =>
          course.id === selectedCourse.id
            ? { ...course, lessonCount: course.lessonCount + 1 }
            : course,
        ),
      );
      router.refresh();

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : messages.upload.failed;
      setMessage(nextMessage);
      toast.error(nextMessage);
    } finally {
      setUploading(false);
      abortControllerRef.current = null;
    }
  }

  async function cancelUpload() {
    if (!activeUploadId) {
      return;
    }

    abortControllerRef.current?.abort();
    await fetch(`/api/instructor/uploads/${activeUploadId}/cancel`, {
      method: "POST",
    }).catch(() => undefined);
    window.localStorage.removeItem(STORAGE_KEY);
    setUploading(false);
    setActiveUploadId(null);
    setProgress(0);
    setMessage("Upload canceled.");
  }

  return (
    <Card className="space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-brand)]">Upload center</p>
        <h3 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">Upload a new lesson video</h3>
        <p className="max-w-2xl text-sm leading-7 text-[var(--color-text-muted)]">
          Choose the course, type the lesson name, and the uploader will create a numbered lesson shell for you automatically.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="course">
              Course
            </label>
            <select
              id="course"
              className="h-12 w-full rounded-2xl border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text)] outline-none"
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
            >
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="lessonName">
              Lesson name
            </label>
            <Input
              id="lessonName"
              value={lessonName}
              onChange={(event) => setLessonName(event.target.value)}
              placeholder="For example: ECG interpretation basics"
            />
            <div className="rounded-2xl bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
              Auto title: <span className="font-semibold text-[var(--color-text)]">{previewTitle}</span>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-text)]" htmlFor="file">
              Video file
            </label>
            <Input
              ref={inputRef}
              id="file"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              onChange={(event) => {
                const nextFile = event.target.files?.[0] ?? null;
                setFile(nextFile);
                setProgress(0);
                setMessage(nextFile ? `Ready to upload ${formatBytes(nextFile.size)}.` : null);
              }}
            />
          </div>
          {file ? (
            <div className="rounded-3xl bg-[var(--color-surface)] p-4 text-sm text-[var(--color-text-muted)]">
              <p className="font-semibold text-[var(--color-text)]">{file.name}</p>
              <p className="mt-1">{formatBytes(file.size)}</p>
            </div>
          ) : null}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-[var(--color-text)]">Upload progress</span>
              <span className="text-[var(--color-text-muted)]">{progress}%</span>
            </div>
            <ProgressBar value={progress} />
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              onClick={startUpload}
              disabled={uploading || !file || !selectedCourse || !normalizedLessonTitle}
            >
              {uploading ? "Uploading..." : "Start upload"}
            </Button>
            <Button
              type="button"
              onClick={cancelUpload}
              variant="secondary"
              disabled={!uploading || !activeUploadId}
            >
              Cancel
            </Button>
          </div>
        </div>
        <div className="rounded-[28px] bg-[var(--color-surface)] p-5">
          <h4 className="text-lg font-semibold text-[var(--color-text)]">Upload summary</h4>
          <dl className="mt-4 space-y-4 text-sm text-[var(--color-text-muted)]">
            <div>
              <dt className="font-semibold text-[var(--color-text)]">Course</dt>
              <dd>{selectedCourse?.title ?? "Select a course"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--color-text)]">Lesson title</dt>
              <dd>{previewTitle}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--color-text)]">File</dt>
              <dd>{file ? `${file.name} (${formatBytes(file.size)})` : "No file selected"}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--color-text)]">Next video number</dt>
              <dd>{nextVideoNumber}</dd>
            </div>
            <div>
              <dt className="font-semibold text-[var(--color-text)]">Status</dt>
              <dd>{message ?? "Waiting for upload"}</dd>
            </div>
          </dl>
        </div>
      </div>
    </Card>
  );
}
