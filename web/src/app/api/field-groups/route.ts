import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { fieldGroups } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAuth, unauthorized } from "@/lib/extension-auth";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const groups = await db
    .select()
    .from(fieldGroups)
    .where(eq(fieldGroups.clinicId, auth.clinicId))
    .orderBy(asc(fieldGroups.displayOrder));

  return jsonOk({ fieldGroups: groups });
}

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  displayOrder: z.number().int().optional(),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid payload", 400, parsed.error.flatten());
  }

  const [group] = await db
    .insert(fieldGroups)
    .values({
      clinicId: auth.clinicId,
      name: parsed.data.name,
      description: parsed.data.description,
      displayOrder: parsed.data.displayOrder ?? 0,
      active: parsed.data.active ?? true,
    })
    .returning();

  return jsonOk({ fieldGroup: group }, 201);
}
