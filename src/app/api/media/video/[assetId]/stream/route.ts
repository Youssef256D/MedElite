import { handleRouteError } from "@/lib/http";
import { streamVideoAsset } from "@/modules/media/service";

export async function GET(request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  try {
    const { assetId } = await params;
    const token = new URL(request.url).searchParams.get("token");

    if (!token) {
      return new Response("Missing playback token.", { status: 400 });
    }

    return streamVideoAsset(assetId, token, request.headers.get("range"));
  } catch (error) {
    return handleRouteError(error);
  }
}
