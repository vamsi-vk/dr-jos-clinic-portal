import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { formSubmissions, formTemplates, type FormField } from "@/db/schema";
import { jsonOk } from "@/lib/api";
import { requireAuth, unauthorized } from "@/lib/extension-auth";
import { findScopedPatient } from "@/lib/patient-scope";

type Params = { params: { miosalonPatientId: string } };

/**
 * List forms attached to a patient (latest submission per template).
 * Optional ?networkId= prefers that network, and still includes legacy null-network rows.
 */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);
  const url = new URL(req.url);
  const networkId = url.searchParams.get("networkId")?.trim() || null;
  const storeId = url.searchParams.get("storeId")?.trim() || null;
  const activeUserId = url.searchParams.get("activeUserId")?.trim() || null;

  const patient = await findScopedPatient(auth, miosalonPatientId);

  if (!patient) {
    return jsonOk({ forms: [], patientId: null, networkId });
  }

  const templates = await db
    .select({
      id: formTemplates.id,
      name: formTemplates.name,
      fields: formTemplates.fields,
      publicToken: formTemplates.publicToken,
    })
    .from(formTemplates)
    .where(eq(formTemplates.clinicId, auth.clinicId));

  const forms = [];

  for (const template of templates) {
    const base = and(
      eq(formSubmissions.patientId, patient.id),
      eq(formSubmissions.templateId, template.id)
    );

    const contextConditions = [];
    if (networkId) {
      contextConditions.push(
        or(eq(formSubmissions.networkId, networkId), isNull(formSubmissions.networkId))
      );
    }
    if (storeId) {
      contextConditions.push(
        or(eq(formSubmissions.storeId, storeId), isNull(formSubmissions.storeId))
      );
    }
    const whereClause = contextConditions.length
      ? and(base, ...contextConditions)
      : base;

    const [submission] = await db
      .select()
      .from(formSubmissions)
      .where(whereClause)
      .orderBy(desc(formSubmissions.submittedAt))
      .limit(1);

    if (!submission) continue;

    forms.push({
      templateId: template.id,
      templateName: template.name,
      publicToken: template.publicToken,
      fields: template.fields as FormField[],
      submissionId: submission.id,
      submittedAt: submission.submittedAt,
      networkId: submission.networkId,
      storeId: submission.storeId,
      activeUserId: submission.activeUserId,
      data: submission.data ?? {},
    });
  }

  forms.sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  return jsonOk({
    forms,
    patientId: patient.id,
    miosalonPatientId,
    networkId,
    storeId,
    activeUserId,
  });
}
