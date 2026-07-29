import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { patients, formTemplates, formSubmissions } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAuth, unauthorized } from "@/lib/extension-auth";

type Params = { params: { miosalonPatientId: string; templateId: string } };

async function getPatient(clinicId: string, miosalonPatientId: string) {
  const [patient] = await db
    .select()
    .from(patients)
    .where(
      and(eq(patients.miosalonPatientId, miosalonPatientId), eq(patients.clinicId, clinicId))
    )
    .limit(1);
  return patient ?? null;
}

/** Load saved form answers for a patient + template */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);
  const patient = await getPatient(auth.clinicId, miosalonPatientId);
  if (!patient) return jsonOk({ submission: null, data: {} });

  const [submission] = await db
    .select()
    .from(formSubmissions)
    .where(
      and(
        eq(formSubmissions.patientId, patient.id),
        eq(formSubmissions.templateId, params.templateId)
      )
    )
    .orderBy(desc(formSubmissions.submittedAt))
    .limit(1);

  return jsonOk({
    submission: submission ?? null,
    data: submission?.data ?? {},
  });
}

const saveSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  networkId: z.string().min(1).optional().nullable(),
  storeId: z.string().min(1).optional().nullable(),
  activeUserId: z.string().min(1).optional().nullable(),
});

/** Save form answers (extension + portal) */
export async function PUT(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);

  const [template] = await db
    .select()
    .from(formTemplates)
    .where(
      and(eq(formTemplates.id, params.templateId), eq(formTemplates.clinicId, auth.clinicId))
    )
    .limit(1);

  if (!template) return jsonError("Template not found", 404);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = saveSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid payload", 400, parsed.error.flatten());
  }

  const networkId = parsed.data.networkId?.trim() || null;
  const storeId = parsed.data.storeId?.trim() || null;
  const activeUserId = parsed.data.activeUserId?.trim() || null;

  let patient = await getPatient(auth.clinicId, miosalonPatientId);
  if (!patient) {
    const [created] = await db
      .insert(patients)
      .values({ miosalonPatientId, clinicId: auth.clinicId })
      .returning();
    patient = created;
  }

  const conditions = [
    eq(formSubmissions.patientId, patient.id),
    eq(formSubmissions.templateId, params.templateId),
  ];
  if (networkId) {
    conditions.push(eq(formSubmissions.networkId, networkId));
  }
  if (storeId) {
    conditions.push(eq(formSubmissions.storeId, storeId));
  }

  const [existing] = await db
    .select()
    .from(formSubmissions)
    .where(and(...conditions))
    .orderBy(desc(formSubmissions.submittedAt))
    .limit(1);

  let submission;
  if (existing) {
    [submission] = await db
      .update(formSubmissions)
      .set({
        data: parsed.data.data,
        staffId: auth.id,
        networkId: networkId ?? existing.networkId,
        storeId: storeId ?? existing.storeId,
        activeUserId: activeUserId ?? existing.activeUserId,
        submittedAt: new Date(),
      })
      .where(eq(formSubmissions.id, existing.id))
      .returning();
  } else {
    [submission] = await db
      .insert(formSubmissions)
      .values({
        patientId: patient.id,
        templateId: params.templateId,
        data: parsed.data.data,
        staffId: auth.id,
        networkId,
        storeId,
        activeUserId,
      })
      .returning();
  }

  return jsonOk({ ok: true, submission });
}
