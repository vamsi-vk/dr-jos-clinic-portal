import { getServerSession } from "next-auth";
import { createHmac, timingSafeEqual } from "crypto";
import { authOptions } from "@/lib/auth";
import { jsonError } from "@/lib/api";

const EXTENSION_SECRET =
  process.env.EXTENSION_JWT_SECRET ?? process.env.NEXTAUTH_SECRET ?? "dev-secret-change-me";

const DEFAULT_TTL_SECONDS = Number(process.env.EXTENSION_JWT_TTL_SECONDS ?? 60 * 60 * 24 * 7);

function b64urlDecode(str: string): Buffer {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad) base64 += "=".repeat(4 - pad);
  return Buffer.from(base64, "base64");
}

export type ExtensionTokenPayload = {
  sub: string;
  email: string;
  clinicId: string;
  role: string;
  exp: number;
};

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

export function signExtensionToken(
  payload: Omit<ExtensionTokenPayload, "exp">,
  ttlSeconds = DEFAULT_TTL_SECONDS
) {
  const body: ExtensionTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const mid = b64url(JSON.stringify(body));
  const data = `${header}.${mid}`;
  const sig = createHmac("sha256", EXTENSION_SECRET).update(data).digest();
  return `${data}.${b64url(sig)}`;
}

export function verifyExtensionToken(token: string): ExtensionTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, mid, sig] = parts;
    const data = `${header}.${mid}`;
    const expected = createHmac("sha256", EXTENSION_SECRET).update(data).digest();
    const actual = b64urlDecode(sig);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const payload = JSON.parse(b64urlDecode(mid).toString("utf8")) as ExtensionTokenPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Require either NextAuth session or Extension JWT Bearer token */
export async function requireAuth(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const payload = verifyExtensionToken(authHeader.slice(7));
    if (payload) {
      return {
        id: payload.sub,
        email: payload.email,
        clinicId: payload.clinicId,
        role: payload.role,
        source: "extension" as const,
      };
    }
  }

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      clinicId: session.user.clinicId ?? "drjo-skin-revive",
      role: session.user.role ?? "staff",
      source: "session" as const,
    };
  }

  return null;
}

export function unauthorized() {
  return jsonError("Unauthorized", 401);
}
