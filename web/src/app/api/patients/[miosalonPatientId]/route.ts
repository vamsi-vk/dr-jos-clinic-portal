import { eq, and, asc, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { fieldGroups, fieldDefinitions, fieldValues } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAuth, unauthorized } from "@/lib/extension-auth";
import { ensureScopedPatient, noBranchAssigned } from "@/lib/patient-scope";

type Params = { params: { miosalonPatientId: string } };

/** Get or create extended patient profile + field groups/values for extension panel */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);
  if (!miosalonPatientId) return jsonError("Missing customer ID", 400);

  const patient = await ensureScopedPatient(auth, miosalonPatientId);
  if (!patient) return noBranchAssigned();

  const groups = await db
    .select()
    .from(fieldGroups)
    .where(and(eq(fieldGroups.clinicId, auth.clinicId), eq(fieldGroups.active, true)))
    .orderBy(asc(fieldGroups.displayOrder));

  const groupIds = groups.map((g) => g.id);
  const allDefs =
    groupIds.length === 0
      ? []
      : await db
          .select()
          .from(fieldDefinitions)
          .where(inArray(fieldDefinitions.groupId, groupIds))
          .orderBy(asc(fieldDefinitions.displayOrder));

  const values = await db
    .select()
    .from(fieldValues)
    .where(eq(fieldValues.patientId, patient.id));

  const valueMap = Object.fromEntries(values.map((v) => [v.fieldId, v.value]));

  return jsonOk({
    patient,
    fieldGroups: groups.map((g) => ({
      ...g,
      fields: allDefs
        .filter((d) => d.groupId === g.id)
        .map((d) => ({
          ...d,
          value: valueMap[d.id] ?? null,
        })),
    })),
  });
}

const upsertSchema = z.object({
  fields: z.array(
    z.object({
      fieldId: z.string().uuid(),
      value: z.unknown(),
    })
  ),
});

/** Upsert custom field values for a patient */
export async function PUT(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = upsertSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid payload", 400, parsed.error.flatten());
  }

  const patient = await ensureScopedPatient(auth, miosalonPatientId);
  if (!patient) return noBranchAssigned();

  for (const item of parsed.data.fields) {
    const [existing] = await db
      .select()
      .from(fieldValues)
      .where(
        and(eq(fieldValues.patientId, patient.id), eq(fieldValues.fieldId, item.fieldId))
      )
      .limit(1);

    if (existing) {
      await db
        .update(fieldValues)
        .set({
          value: item.value,
          updatedAt: new Date(),
          updatedBy: auth.id,
        })
        .where(eq(fieldValues.id, existing.id));
    } else {
      await db.insert(fieldValues).values({
        patientId: patient.id,
        fieldId: item.fieldId,
        value: item.value,
        updatedBy: auth.id,
      });
    }
  }

  return jsonOk({ ok: true, patientId: patient.id, updated: parsed.data.fields.length });
}
