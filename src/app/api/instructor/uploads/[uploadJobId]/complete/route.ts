import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/http";
import { completeUploadJob } from "@/modules/uploads/service";

export async function POST(_: Request, { params }: { params: Promise<{ uploadJobId: string }> }) {
  try {
    const { uploadJobId } = await params;
    const uploadJob = await completeUploadJob(uploadJobId);

    return NextResponse.json({
      id: uploadJob.id,
      status: uploadJob.status,
      videoAssetId: uploadJob.videoAsset?.id,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
