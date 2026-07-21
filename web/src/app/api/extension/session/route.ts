import { jsonOk } from "@/lib/api";
import { requireAuth, unauthorized } from "@/lib/extension-auth";

/** Verify extension Bearer token (used by popup on load) */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth || auth.source !== "extension") return unauthorized();

  return jsonOk({
    ok: true,
    user: {
      id: auth.id,
      email: auth.email,
      role: auth.role,
      clinicId: auth.clinicId,
    },
  });
}

/** Issue a new token when the current one is still valid (extends session without re-entering password) */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth || auth.source !== "extension") return unauthorized();

  const { signExtensionToken } = await import("@/lib/extension-auth");
  const token = signExtensionToken({
    sub: auth.id,
    email: auth.email,
    clinicId: auth.clinicId,
    role: auth.role,
  });

  return jsonOk({ token, expiresIn: Number(process.env.EXTENSION_JWT_TTL_SECONDS ?? 604800) });
}
