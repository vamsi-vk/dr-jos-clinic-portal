/** Parse MioSalon Customer 360° visible fields from page text */

export type MiosalonProfilePayload = {
  name?: string;
  customerId?: string;
  mobile?: string;
  email?: string;
  gst?: string;
  gender?: string;
  dateOfBirth?: string;
  anniversary?: string;
  customerNote?: string;
  sourceUrl?: string;
};

function clean(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (!v || v === "-" || v === "—") return undefined;
  return v;
}

function pick(text: string, label: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${escaped}\\s*[:：]?\\s*([^\\n]+)`, "i");
  const m = text.match(re);
  return clean(m?.[1]);
}

function pickNextLine(lines: string[], label: string): string | undefined {
  const norm = label.toLowerCase();
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].replace(/[:：]\s*$/, "").trim().toLowerCase();
    if (line === norm || line === `${norm}:`) {
      return clean(lines[i + 1]);
    }
    if (lines[i].toLowerCase().startsWith(`${norm}:`)) {
      return clean(lines[i].slice(lines[i].indexOf(":") + 1));
    }
  }
  return undefined;
}

export function extractMiosalonProfile(): MiosalonProfilePayload | null {
  const text = document.body?.innerText ?? "";
  if (!/customer\s*360|customer\s*id/i.test(text)) return null;

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const profile: MiosalonProfilePayload = {
    name: pick(text, "Name") ?? pickNextLine(lines, "Name"),
    customerId:
      pick(text, "Customer Id") ??
      pick(text, "Customer ID") ??
      pickNextLine(lines, "Customer Id"),
    mobile: pick(text, "Mobile") ?? pickNextLine(lines, "Mobile"),
    email: pick(text, "Email") ?? pickNextLine(lines, "Email"),
    gst: pick(text, "GST") ?? pickNextLine(lines, "GST"),
    gender: pick(text, "Gender") ?? pickNextLine(lines, "Gender"),
    dateOfBirth:
      pick(text, "D.O.B") ??
      pick(text, "DOB") ??
      pick(text, "Date of Birth") ??
      pickNextLine(lines, "D.O.B"),
    anniversary: pick(text, "Anniversary") ?? pickNextLine(lines, "Anniversary"),
    customerNote:
      pick(text, "Customer Note") ?? pickNextLine(lines, "Customer Note"),
    sourceUrl: window.location.href,
  };

  const hasData = Object.entries(profile).some(
    ([k, v]) => k !== "sourceUrl" && v != null && v !== ""
  );
  return hasData ? profile : null;
}
