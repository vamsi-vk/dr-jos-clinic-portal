import { z } from "zod";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { signExtensionToken } from "@/lib/extension-auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Exchange staff credentials for a short-lived JWT used by the Chrome extension */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid credentials payload", 400, parsed.error.flatten());
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);

  if (!user) return jsonError("Invalid email or password", 401);

  const valid = await compare(parsed.data.password, user.passwordHash);
  if (!valid) return jsonError("Invalid email or password", 401);

  const token = signExtensionToken({
    sub: user.id,
    email: user.email,
    clinicId: user.clinicId,
    role: user.role,
  });

  return jsonOk({
    token,
    expiresIn: Number(process.env.EXTENSION_JWT_TTL_SECONDS ?? 604800),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      clinicId: user.clinicId,
    },
  });
}
