import QRCode from "qrcode";
import type { ActivePageContext } from "./network-id";

export function publicFormUrl(
  apiBase: string,
  publicToken: string,
  miosalonPatientId?: string | null,
  context?: ActivePageContext
) {
  const base = `${apiBase.replace(/\/$/, "")}/f/${publicToken}`;
  const qs = new URLSearchParams();
  if (miosalonPatientId) qs.set("patient", miosalonPatientId);
  if (context?.networkId) qs.set("network", context.networkId);
  if (context?.storeId) qs.set("store", context.storeId);
  if (context?.userId) qs.set("activeUser", context.userId);
  const query = qs.toString();
  return query ? `${base}?${query}` : base;
}

/** Render QR code as a PNG data URL for display in the sidebar. */
export async function renderQrDataUrl(text: string, size = 180): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: { dark: "#0f766e", light: "#ffffff" },
  });
}
