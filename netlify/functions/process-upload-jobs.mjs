const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

function getBaseUrl() {
  return process.env.URL || process.env.DEPLOY_URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_APP_URL;
}

export default async function handler() {
  const baseUrl = getBaseUrl();
  const internalJobSecret = process.env.INTERNAL_JOB_SECRET;

  if (!baseUrl || !internalJobSecret) {
    return new Response(
      JSON.stringify({
        error: "CONFIGURATION_ERROR",
        message: "URL and INTERNAL_JOB_SECRET must be configured for upload processing.",
      }),
      {
        status: 500,
        headers: JSON_HEADERS,
      },
    );
  }

  const response = await fetch(new URL("/api/internal/jobs/process", baseUrl), {
    method: "POST",
    headers: {
      "x-internal-job-secret": internalJobSecret,
    },
  });

  const payload = await response.text();

  return new Response(payload, {
    status: response.status,
    headers: JSON_HEADERS,
  });
}

export const config = {
  schedule: "*/5 * * * *",
};
