import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { clinics } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureClinic, getClinicSettings } from "@/lib/clinic-settings";
import { requireAuth, unauthorized } from "@/lib/extension-auth";

const updateSchema = z.object({
  name: z.string().min(1).max(120),
});

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const settings = await getClinicSettings(auth.clinicId);
  return jsonOk({ clinic: settings });
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid payload", 400, parsed.error.flatten());
  }

  await ensureClinic(auth.clinicId);

  const [clinic] = await db
    .update(clinics)
    .set({
      name: parsed.data.name.trim(),
      updatedAt: new Date(),
    })
    .where(eq(clinics.id, auth.clinicId))
    .returning();

  const settings = await getClinicSettings(clinic.id);
  return jsonOk({ clinic: settings });
}
