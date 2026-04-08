import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/http";
import { cancelUploadJob } from "@/modules/uploads/service";

export async function POST(_: Request, { params }: { params: Promise<{ uploadJobId: string }> }) {
  try {
    const { uploadJobId } = await params;
    const uploadJob = await cancelUploadJob(uploadJobId);

    return NextResponse.json({
      id: uploadJob.id,
      status: "CANCELED",
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
