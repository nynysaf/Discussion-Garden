import { checkHost } from "@/lib/auth/host";
import { createClient } from "@/lib/supabase/server";
import { runSynthesis, SynthesisError } from "@/lib/synthesis/run";

export const maxDuration = 30;

export async function POST() {
  // Hosts only — otherwise anyone on the public site could spend the OpenAI credit.
  const host = await checkHost();
  if (host.status !== "host") {
    return Response.json(
      { error: "Sign in as a host to run the garden AI." },
      { status: host.status === "signed-out" ? 401 : 403 },
    );
  }

  try {
    const result = await runSynthesis(await createClient());
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[synthesis]", error);
    const detail = error instanceof Error ? error.message : "";
    const message = detail.includes("OPENAI_API_KEY")
      ? "OpenAI key missing — add OPENAI_API_KEY to .env.local and restart the dev server."
      : error instanceof SynthesisError
        ? `The garden AI skipped this round: ${detail}`
        : "The garden AI couldn't run — check the connection.";
    return Response.json({ error: message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
