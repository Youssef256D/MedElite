import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { handleRouteError } from "@/lib/http";
import { processPendingUploadJobs } from "@/modules/uploads/service";

export async function POST(request: Request) {
  try {
    const secret = request.headers.get("x-internal-job-secret");

    if (secret !== env.INTERNAL_JOB_SECRET) {
      return NextResponse.json(
        {
          error: "FORBIDDEN",
          message: "Invalid internal job secret.",
        },
        { status: 403 },
      );
    }

    const processed = await processPendingUploadJobs();
    return NextResponse.json({
      processed: processed.length,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
