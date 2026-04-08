import { Readable } from "node:stream";

import { handleRouteError } from "@/lib/http";
import { maybeOne, database } from "@/lib/database";
import { storage } from "@/lib/storage";
import { requireRoles } from "@/modules/auth/service";

export async function GET(_: Request, { params }: { params: Promise<{ enrollmentId: string }> }) {
  try {
    await requireRoles(["ADMIN"]);
    const { enrollmentId } = await params;
    const enrollment = await maybeOne(
      database
        .from("Enrollment")
        .select("paymentScreenshotStorageKey, paymentScreenshotContentType")
        .eq("id", enrollmentId)
        .maybeSingle(),
      "Enrollment request could not be loaded.",
    );

    if (!enrollment?.paymentScreenshotStorageKey) {
      return new Response("Payment proof not found.", { status: 404 });
    }

    const { stream, object } = await storage.createReadStream(enrollment.paymentScreenshotStorageKey);

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 200,
      headers: {
        "Content-Type": enrollment.paymentScreenshotContentType ?? object.contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
