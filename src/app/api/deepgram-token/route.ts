import { checkHost } from "@/lib/auth/host";
import {
  DeepgramConfigError,
  grantDeepgramToken,
} from "@/lib/deepgram/grant-token";

export async function POST() {
  // Hosts only — otherwise anyone on the public site could spend the credit.
  const host = await checkHost();
  if (host.status !== "host") {
    return Response.json(
      { error: "Sign in as a host to start captions." },
      { status: host.status === "signed-out" ? 401 : 403 },
    );
  }

  try {
    const grant = await grantDeepgramToken();
    return Response.json(grant, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof DeepgramConfigError
        ? "Deepgram key missing — add DEEPGRAM_API_KEY to .env.local and restart the dev server."
        : "Could not get a Deepgram token. Check the key has Member permission.";
    console.error("[deepgram-token]", error);
    return Response.json({ error: message }, { status: 502 });
  }
}
