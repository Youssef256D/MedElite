import { NextResponse } from "next/server";

import { isAppError, toErrorMessage } from "@/lib/errors";

export function handleRouteError(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json(
      {
        error: error.code,
        message: error.message,
      },
      { status: error.status },
    );
  }

  console.error(error);

  return NextResponse.json(
    {
      error: "INTERNAL_ERROR",
      message: toErrorMessage(error),
    },
    { status: 500 },
  );
}
