import { z } from "zod";

export const uploadInitSchema = z.object({
  courseId: z.string().min(1),
  lessonId: z.string().min(1).optional(),
  lessonTitle: z.string().trim().min(3).optional(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  durationSeconds: z.number().int().positive().optional(),
}).refine((value) => Boolean(value.lessonId || value.lessonTitle), {
  message: "Choose an existing lesson or provide a lesson title.",
  path: ["lessonTitle"],
});

export const uploadChunkSchema = z.object({
  chunkIndex: z.number().int().min(0),
  totalChunks: z.number().int().positive(),
});
