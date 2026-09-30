/** Browser side: ask our server for a 30-second Deepgram token. */
export async function fetchDeepgramToken(): Promise<string> {
  const response = await fetch("/api/deepgram-token", {
    method: "POST",
    cache: "no-store",
  });
  const body = (await response.json().catch(() => ({}))) as {
    accessToken?: string;
    error?: string;
  };
  if (!response.ok || !body.accessToken) {
    throw new Error(body.error ?? `Token request failed (${response.status})`);
  }
  return body.accessToken;
}
