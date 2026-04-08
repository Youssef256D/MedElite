import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/http";
import { createUploadJob } from "@/modules/uploads/service";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const uploadJob = await createUploadJob(payload);

    return NextResponse.json({
      id: uploadJob.id,
      chunkSize: uploadJob.chunkSize,
      totalChunks: uploadJob.totalChunks,
      status: uploadJob.status,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
