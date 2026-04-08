import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/http";
import { getUploadJobStatus, listUploadedChunkIndexes } from "@/modules/uploads/service";

export async function GET(_: Request, { params }: { params: Promise<{ uploadJobId: string }> }) {
  try {
    const { uploadJobId } = await params;
    const [uploadJob, uploadedChunks] = await Promise.all([
      getUploadJobStatus(uploadJobId),
      listUploadedChunkIndexes(uploadJobId),
    ]);

    return NextResponse.json({
      id: uploadJob.id,
      status: uploadJob.status,
      chunkSize: uploadJob.chunkSize,
      totalChunks: uploadJob.totalChunks,
      uploadedChunks,
      receivedBytes: uploadJob.receivedBytes,
      sizeBytes: uploadJob.sizeBytes,
      errorMessage: uploadJob.errorMessage,
      videoAssetId: uploadJob.videoAsset?.id,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
