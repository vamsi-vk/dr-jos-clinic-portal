import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { formTemplates, formSubmissions, patients } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { validateFormSubmission } from "@/lib/form-validation";

type Params = { params: { token: string } };

const submitSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  /** Customer / patient ID from the QR link (required) */
  miosalonPatientId: z.string().min(1, "Customer ID is required"),
  networkId: z.string().min(1).optional().nullable(),
  storeId: z.string().min(1).optional().nullable(),
  activeUserId: z.string().min(1).optional().nullable(),
});

/** Public: submit a form linked to a customer ID (no auth). */
export async function POST(req: Request, { params }: Params) {
  const token = decodeURIComponent(params.token);

  const [template] = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.publicToken, token))
    .limit(1);

  if (!template) return jsonError("Form not found", 404);
  if (!template.active) return jsonError("This form is not currently accepting submissions", 403);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = submitSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid payload", 400, parsed.error.flatten());
  }

  const errors = validateFormSubmission(template.fields, parsed.data.data);
  if (Object.keys(errors).length > 0) {
    return jsonError("Validation failed", 422, { errors });
  }

  const miosalonPatientId = parsed.data.miosalonPatientId.trim();
  const networkId = parsed.data.networkId?.trim() || null;
  const storeId = parsed.data.storeId?.trim() || null;
  const activeUserId = parsed.data.activeUserId?.trim() || null;

  const [existingPatient] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.miosalonPatientId, miosalonPatientId),
        eq(patients.clinicId, template.clinicId)
      )
    )
    .limit(1);

  let patientId: string;
  if (existingPatient) {
    patientId = existingPatient.id;
  } else {
    const [created] = await db
      .insert(patients)
      .values({
        miosalonPatientId,
        clinicId: template.clinicId,
      })
      .returning();
    patientId = created.id;
  }

  const conditions = [
    eq(formSubmissions.patientId, patientId),
    eq(formSubmissions.templateId, template.id),
  ];
  if (networkId) {
    conditions.push(eq(formSubmissions.networkId, networkId));
  }
  if (storeId) {
    conditions.push(eq(formSubmissions.storeId, storeId));
  }

  // Upsert: one latest submission per patient + template (+ network)
  const [existingSubmission] = await db
    .select()
    .from(formSubmissions)
    .where(and(...conditions))
    .orderBy(desc(formSubmissions.submittedAt))
    .limit(1);

  if (existingSubmission) {
    const [submission] = await db
      .update(formSubmissions)
      .set({
        data: parsed.data.data,
        staffId: null,
        networkId: networkId ?? existingSubmission.networkId,
        storeId: storeId ?? existingSubmission.storeId,
        activeUserId: activeUserId ?? existingSubmission.activeUserId,
        submittedAt: new Date(),
      })
      .where(eq(formSubmissions.id, existingSubmission.id))
      .returning();

    return jsonOk({
      ok: true,
      submissionId: submission.id,
      miosalonPatientId,
      networkId: submission.networkId,
      linked: true,
    });
  }

  const [submission] = await db
    .insert(formSubmissions)
    .values({
      templateId: template.id,
      patientId,
      staffId: null,
      data: parsed.data.data,
      networkId,
      storeId,
      activeUserId,
    })
    .returning();

  return jsonOk(
    {
      ok: true,
      submissionId: submission.id,
      miosalonPatientId,
      networkId: submission.networkId,
      storeId: submission.storeId,
      activeUserId: submission.activeUserId,
      linked: true,
    },
    201
  );
}
