import { BODY_MAX, NAME_TAG_MAX } from "./limits";
import { containsProfanity } from "./profanity";

export { BODY_MAX, NAME_TAG_MAX };

export type SubmissionDraft = { body: string; nameTag: string | null };

export type ValidationResult =
  | { ok: true; value: SubmissionDraft }
  | { ok: false; reason: "empty" | "too-long" | "profanity" | "bad-input"; message: string };

/** Trim, drop control characters, squash runs of spaces and blank lines. */
export function cleanText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, " ")
    .replace(/[ \t\u00A0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function validateSubmission(
  input: unknown,
  isProfane: (text: string) => boolean = containsProfanity,
): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, reason: "bad-input", message: "Something went wrong. Please try again." };
  }
  const { body: rawBody, nameTag: rawName } = input as Record<string, unknown>;
  if (typeof rawBody !== "string" || (rawName != null && typeof rawName !== "string")) {
    return { ok: false, reason: "bad-input", message: "Something went wrong. Please try again." };
  }

  const body = cleanText(rawBody);
  const nameTag = rawName ? cleanText(rawName).replace(/\n/g, " ") : "";

  if (!body) {
    return { ok: false, reason: "empty", message: "Write something first." };
  }
  if (body.length > BODY_MAX) {
    return {
      ok: false,
      reason: "too-long",
      message: `Please keep it under ${BODY_MAX} characters.`,
    };
  }
  if (nameTag.length > NAME_TAG_MAX) {
    return {
      ok: false,
      reason: "too-long",
      message: `Please keep the name under ${NAME_TAG_MAX} characters.`,
    };
  }
  if (isProfane(body) || (nameTag && isProfane(nameTag))) {
    return {
      ok: false,
      reason: "profanity",
      message: "Please rephrase without strong language — it may be shown on a screen.",
    };
  }
  return { ok: true, value: { body, nameTag: nameTag || null } };
}
