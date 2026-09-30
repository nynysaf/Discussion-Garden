import {
  DeepgramConfigError,
  grantDeepgramToken,
} from "@/lib/deepgram/grant-token";

export async function POST() {
  // Blocked in production until host login protects this route; otherwise
  // anyone on the public site could spend the Deepgram credit.
  if (process.env.NODE_ENV === "production") {
    return Response.json(
      { error: "Captions are disabled until host login is set up." },
      { status: 403 },
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
