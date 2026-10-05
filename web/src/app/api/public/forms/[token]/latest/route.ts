import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { formTemplates, formSubmissions, patients } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";

type Params = { params: { token: string } };

/** Public: fetch latest submission for a patient + form (for PDF download). */
export async function GET(req: Request, { params }: Params) {
  const token = decodeURIComponent(params.token);
  const url = new URL(req.url);
  const miosalonPatientId = url.searchParams.get("patient")?.trim();

  if (!miosalonPatientId) {
    return jsonError("Customer ID is required", 400);
  }

  const [template] = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.publicToken, token))
    .limit(1);

  if (!template) return jsonError("Form not found", 404);

  const [patient] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.miosalonPatientId, miosalonPatientId),
        eq(patients.clinicId, template.clinicId)
      )
    )
    .orderBy(desc(patients.updatedAt))
    .limit(1);

  if (!patient) {
    return jsonOk({ submission: null });
  }

  const [submission] = await db
    .select()
    .from(formSubmissions)
    .where(
      and(
        eq(formSubmissions.patientId, patient.id),
        eq(formSubmissions.templateId, template.id)
      )
    )
    .orderBy(desc(formSubmissions.submittedAt))
    .limit(1);

  if (!submission) {
    return jsonOk({ submission: null });
  }

  return jsonOk({
    submission: {
      id: submission.id,
      submittedAt: submission.submittedAt,
    },
  });
}
