import { INQUIRY_MAX, INQUIRY_MIN } from "./limits";

export type LiveInquiry = {
  id: string;
  body: string;
  sessionId: string | null;
  createdAt: string;
  lastActivatedAt: string | null;
};

export type InquiryActivation = {
  id: string;
  inquiryId: string;
  body: string;
  sessionId: string | null;
  activatedAt: string;
};

export function cleanInquiryBody(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateInquiryBody(raw: string): { ok: true; body: string } | { ok: false; error: string } {
  const body = cleanInquiryBody(raw);
  if (body.length < INQUIRY_MIN) return { ok: false, error: "Write a question first." };
  if (body.length > INQUIRY_MAX) {
    return { ok: false, error: `Keep it under ${INQUIRY_MAX} characters.` };
  }
  return { ok: true, body };
}

export function activeInquiry(
  inquiries: LiveInquiry[],
  activeId: string | null,
): LiveInquiry | null {
  if (!activeId) return null;
  return inquiries.find((q) => q.id === activeId) ?? null;
}
