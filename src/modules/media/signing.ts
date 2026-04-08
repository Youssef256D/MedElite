import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "@/lib/env";

export type PlaybackTokenPayload = {
  assetId: string;
  exp: number;
  subjectType: "guest" | "authenticated";
  userId?: string;
  sessionId?: string;
};

function createSignature(value: string) {
  return createHmac("sha256", env.MEDIA_SIGNING_SECRET).update(value).digest("base64url");
}

export function signPlaybackToken(payload: PlaybackTokenPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createSignature(encoded);
  return `${encoded}.${signature}`;
}

export function verifyPlaybackToken(token: string) {
  const [encoded, signature] = token.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expected = createSignature(encoded);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PlaybackTokenPayload;

  if (payload.exp <= Date.now()) {
    return null;
  }

  return payload;
}
