import { and, eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { miosalonProfileSchema } from "@/lib/miosalon-profile";
import { requireAuth, unauthorized } from "@/lib/extension-auth";

type Params = { params: { miosalonPatientId: string } };

const bodySchema = z.object({
  profile: miosalonProfileSchema,
});

/** Save Customer 360 fields scraped by the extension into patients.metadata */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const routeId = decodeURIComponent(params.miosalonPatientId);
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid profile payload", 400, parsed.error.flatten());
  }

  const profile = {
    ...parsed.data.profile,
    syncedAt: new Date().toISOString(),
  };

  const canonicalId = profile.customerId?.trim() || routeId;

  let [patient] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.clinicId, auth.clinicId),
        or(
          eq(patients.miosalonPatientId, canonicalId),
          eq(patients.miosalonPatientId, routeId)
        )
      )
    )
    .limit(1);

  if (!patient && profile.mobile) {
    const digits = profile.mobile.replace(/\D/g, "");
    if (digits) {
      [patient] = await db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.clinicId, auth.clinicId),
            eq(patients.miosalonPatientId, digits)
          )
        )
        .limit(1);
    }
  }

  if (!patient) {
    const [created] = await db
      .insert(patients)
      .values({
        miosalonPatientId: canonicalId,
        clinicId: auth.clinicId,
        metadata: { miosalonProfile: profile },
      })
      .returning();
    patient = created;
  } else {
    const prev =
      patient.metadata && typeof patient.metadata === "object"
        ? (patient.metadata as Record<string, unknown>)
        : {};
    const [updated] = await db
      .update(patients)
      .set({
        miosalonPatientId: canonicalId,
        metadata: { ...prev, miosalonProfile: profile },
        updatedAt: new Date(),
      })
      .where(eq(patients.id, patient.id))
      .returning();
    patient = updated;
  }

  return jsonOk({ ok: true, patient, profile });
}
