import "server-only";

const GRANT_URL = "https://api.deepgram.com/v1/auth/grant";

export type DeepgramGrant = { accessToken: string; expiresIn: number };

export class DeepgramConfigError extends Error {}

/**
 * Exchange the server-side API key for a short-lived token the browser can
 * use to open one streaming connection.
 */
export async function grantDeepgramToken(
  apiKey: string | undefined = process.env.DEEPGRAM_API_KEY,
): Promise<DeepgramGrant> {
  if (!apiKey) {
    throw new DeepgramConfigError("DEEPGRAM_API_KEY is not set");
  }

  const response = await fetch(GRANT_URL, {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Deepgram token grant failed (${response.status})`);
  }

  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!body.access_token) {
    throw new Error("Deepgram token grant returned no access_token");
  }
  return { accessToken: body.access_token, expiresIn: body.expires_in ?? 30 };
}
