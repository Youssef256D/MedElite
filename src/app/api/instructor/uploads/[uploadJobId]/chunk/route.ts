import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/http";
import { uploadChunk } from "@/modules/uploads/service";

export async function PUT(request: Request, { params }: { params: Promise<{ uploadJobId: string }> }) {
  try {
    const { uploadJobId } = await params;
    const chunkIndex = Number.parseInt(request.headers.get("x-chunk-index") ?? "", 10);
    const totalChunks = Number.parseInt(request.headers.get("x-total-chunks") ?? "", 10);
    const body = Buffer.from(await request.arrayBuffer());
    const uploadJob = await uploadChunk(uploadJobId, chunkIndex, totalChunks, body);

    return NextResponse.json({
      id: uploadJob.id,
      status: uploadJob.status,
      uploadedChunks: uploadJob.uploadedChunks,
      receivedBytes: uploadJob.receivedBytes,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
