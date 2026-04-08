import { NextResponse } from "next/server";
import { z } from "zod";

import { handleRouteError } from "@/lib/http";
import { requireRoles } from "@/modules/auth/service";
import { upsertLessonProgress } from "@/modules/student/service";

const progressSchema = z.object({
  courseId: z.string().min(1),
  secondsWatched: z.number().int().min(0),
  lastPositionSeconds: z.number().int().min(0),
  completed: z.boolean().optional(),
});

export async function POST(request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    const { lessonId } = await params;
    const user = await requireRoles(["STUDENT", "ADMIN"]);
    const payload = progressSchema.parse(await request.json());
    const progress = await upsertLessonProgress({
      userId: user.id,
      lessonId,
      ...payload,
    });

    return NextResponse.json({
      id: progress.id,
      completed: progress.completed,
      lastPositionSeconds: progress.lastPositionSeconds,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
