import { randomBytes } from "crypto";

/** URL-safe token for public form links (32 chars). */
export function generatePublicToken() {
  return randomBytes(24).toString("base64url");
}

export function publicFormPath(token: string, miosalonPatientId?: string | null) {
  const base = `/f/${token}`;
  if (!miosalonPatientId) return base;
  const qs = new URLSearchParams({ patient: miosalonPatientId });
  return `${base}?${qs.toString()}`;
}

export function publicFormUrl(
  origin: string,
  token: string,
  miosalonPatientId?: string | null
) {
  return `${origin.replace(/\/$/, "")}${publicFormPath(token, miosalonPatientId)}`;
}
