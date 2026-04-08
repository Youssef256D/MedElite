import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/http";
import { issuePlaybackUrl } from "@/modules/media/service";

export async function GET(_: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params;
    const result = await issuePlaybackUrl(assetId);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}
