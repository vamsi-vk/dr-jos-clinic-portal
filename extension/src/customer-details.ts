import type { MiosalonProfilePayload } from "./miosalon-profile";

export const CUSTOMER_DETAILS_STORAGE_KEY = "miosalonCustomerBasicDetails";
export const CUSTOMER_DETAILS_RESPONSE_MESSAGE =
  "MIOSALON_EXT_CUSTOMER_DETAILS_RESPONSE";
export const CUSTOMER_DETAILS_REQUEST_MESSAGE =
  "MIOSALON_EXT_REQUEST_LATEST_CUSTOMER_DETAILS";

export type CapturedCustomerDetails = {
  version: 1;
  endpoint: string;
  capturedAt: string;
  payload: unknown;
  profile: MiosalonProfilePayload;
};

type PageCaptureMessage = {
  source: "miosalon-extension-page-hook";
  type: typeof CUSTOMER_DETAILS_RESPONSE_MESSAGE;
  version: 1;
  endpoint: string;
  capturedAt: string;
  payload: unknown;
};

const FIELD_ALIASES: Record<Exclude<keyof MiosalonProfilePayload, "sourceUrl">, string[]> = {
  name: ["customername", "fullname", "name", "displayname"],
  customerId: [
    "customerid",
    "customercode",
    "customerno",
    "customernumber",
    "clientid",
  ],
  mobile: ["mobileno", "mobilenumber", "mobile", "phonenumber", "phone", "contactno"],
  email: ["emailid", "emailaddress", "email"],
  gst: ["gstnumber", "gstno", "gstin", "gst"],
  gender: ["gender", "sex"],
  dateOfBirth: ["dateofbirth", "birthdate", "dob"],
  anniversary: ["anniversarydate", "anniversary"],
  customerNote: ["customernote", "notes", "note", "remarks"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(key: string) {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanValue(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const text = String(value).trim();
  return text && text !== "-" && text !== "—" && text.toLowerCase() !== "null"
    ? text
    : undefined;
}

function collectObjects(value: unknown, depth = 0, output: Record<string, unknown>[] = []) {
  if (depth > 6) return output;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 50)) collectObjects(item, depth + 1, output);
    return output;
  }
  if (!isRecord(value)) return output;
  output.push(value);
  for (const child of Object.values(value)) collectObjects(child, depth + 1, output);
  return output;
}

function objectScore(record: Record<string, unknown>) {
  const keys = new Set(Object.keys(record).map(normalizeKey));
  return Object.values(FIELD_ALIASES).reduce(
    (score, aliases) => score + (aliases.some((alias) => keys.has(alias)) ? 1 : 0),
    0
  );
}

function valueFor(
  record: Record<string, unknown>,
  aliases: string[]
): string | undefined {
  const entries = Object.entries(record);
  for (const alias of aliases) {
    const match = entries.find(([key]) => normalizeKey(key) === alias);
    const value = cleanValue(match?.[1]);
    if (value) return value;
  }
  return undefined;
}

export function profileFromCapturedResponse(
  payload: unknown,
  sourceUrl: string
): MiosalonProfilePayload {
  const records = collectObjects(payload);
  const record = records.sort((a, b) => objectScore(b) - objectScore(a))[0] ?? {};
  const profile: MiosalonProfilePayload = { sourceUrl };

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as [
    Exclude<keyof MiosalonProfilePayload, "sourceUrl">,
    string[],
  ][]) {
    const value = valueFor(record, aliases);
    if (value) profile[field] = value;
  }
  return profile;
}

export function parseCustomerDetailsMessage(
  event: MessageEvent<unknown>
): CapturedCustomerDetails | null {
  if (event.source !== window || event.origin !== window.location.origin) return null;
  if (!isRecord(event.data)) return null;

  const data = event.data as Partial<PageCaptureMessage>;
  if (
    data.source !== "miosalon-extension-page-hook" ||
    data.type !== CUSTOMER_DETAILS_RESPONSE_MESSAGE ||
    data.version !== 1 ||
    typeof data.endpoint !== "string" ||
    !data.endpoint.includes("/customer/getCustomerBasicDetails") ||
    typeof data.capturedAt !== "string" ||
    !isRecord(data.payload)
  ) {
    return null;
  }

  return {
    version: 1,
    endpoint: data.endpoint,
    capturedAt: data.capturedAt,
    payload: data.payload,
    profile: profileFromCapturedResponse(data.payload, window.location.href),
  };
}

export function saveCapturedCustomerDetails(
  details: CapturedCustomerDetails
): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [CUSTOMER_DETAILS_STORAGE_KEY]: details }, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

export function loadCapturedCustomerDetails(): Promise<CapturedCustomerDetails | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([CUSTOMER_DETAILS_STORAGE_KEY], (result) => {
      const value = result[CUSTOMER_DETAILS_STORAGE_KEY];
      resolve(isRecord(value) ? (value as CapturedCustomerDetails) : null);
    });
  });
}

export function profileMatchesCustomer(
  profile: MiosalonProfilePayload,
  customerId: string
) {
  const expected = customerId.trim().toLowerCase();
  const expectedDigits = expected.replace(/\D/g, "");
  return [profile.customerId, profile.mobile].some((value) => {
    if (!value) return false;
    const normalized = value.trim().toLowerCase();
    const digits = normalized.replace(/\D/g, "");
    return normalized === expected || Boolean(expectedDigits && digits === expectedDigits);
  });
}
