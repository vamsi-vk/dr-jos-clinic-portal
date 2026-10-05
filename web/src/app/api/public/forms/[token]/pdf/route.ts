import { eq, and, desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { formTemplates, formSubmissions, patients } from "@/db/schema";
import { jsonError } from "@/lib/api";
import { getClinicSettings } from "@/lib/clinic-settings";
import { generateFormAgreementPdf } from "@/lib/form-pdf";

type Params = { params: { token: string } };

/** Public: download agreement PDF for a submitted form. */
export async function GET(req: Request, { params }: Params) {
  const token = decodeURIComponent(params.token);
  const url = new URL(req.url);
  const miosalonPatientId = url.searchParams.get("patient")?.trim();
  const submissionId = url.searchParams.get("submissionId")?.trim();

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

  if (!patient) return jsonError("No submission found for this customer", 404);

  let submission;
  if (submissionId) {
    const [row] = await db
      .select()
      .from(formSubmissions)
      .where(
        and(
          eq(formSubmissions.id, submissionId),
          eq(formSubmissions.patientId, patient.id),
          eq(formSubmissions.templateId, template.id)
        )
      )
      .limit(1);
    submission = row;
  } else {
    const [row] = await db
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
    submission = row;
  }

  if (!submission) return jsonError("No submission found — submit the form first", 404);

  const clinic = await getClinicSettings(template.clinicId, patient.branch);

  const pdfBuffer = await generateFormAgreementPdf({
    clinicName: clinic.name,
    formName: template.name,
    formDescription: template.description,
    patientId: miosalonPatientId,
    fields: template.fields,
    data: submission.data,
    submittedAt: submission.submittedAt,
  });

  const filename = `${template.name.replace(/[^\w\-]+/g, "_")}_agreement.pdf`;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
