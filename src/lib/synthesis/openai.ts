import "server-only";
import { PROPOSAL_SCHEMA } from "./prompt";

const CHAT_URL = "https://api.openai.com/v1/chat/completions";
export const DEFAULT_SYNTHESIS_MODEL = "gpt-4o-mini";

export class OpenAiConfigError extends Error {}

export type ModelReply = { proposal: unknown; model: string; usage: unknown };

/** One Structured Outputs call. Throws on a missing key, timeout, HTTP error, or refusal. */
export async function requestProposal(
  messages: { system: string; user: string },
  {
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_SYNTHESIS_MODEL || DEFAULT_SYNTHESIS_MODEL,
    timeoutMs = 25_000,
  } = {},
): Promise<ModelReply> {
  if (!apiKey) throw new OpenAiConfigError("OPENAI_API_KEY is not set");

  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model,
      store: false,
      temperature: 0.3,
      messages: [
        { role: "system", content: messages.system },
        { role: "user", content: messages.user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "garden_proposal", strict: true, schema: PROPOSAL_SCHEMA },
      },
    }),
  });

  const body = (await response.json().catch(() => null)) as {
    error?: { message?: string };
    model?: string;
    usage?: unknown;
    choices?: { message?: { content?: string | null; refusal?: string | null } }[];
  } | null;

  if (!response.ok) {
    throw new Error(`OpenAI ${response.status}: ${body?.error?.message ?? "request failed"}`);
  }
  const message = body?.choices?.[0]?.message;
  if (message?.refusal) throw new Error(`OpenAI refused: ${message.refusal}`);
  if (!message?.content) throw new Error("OpenAI returned no content");

  return { proposal: JSON.parse(message.content), model: body?.model ?? model, usage: body?.usage };
}
