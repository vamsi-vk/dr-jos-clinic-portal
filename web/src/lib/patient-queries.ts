import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  patients,
  fieldGroups,
  fieldDefinitions,
  fieldValues,
  formTemplates,
  formSubmissions,
  type FormField,
} from "@/db/schema";
import { findScopedPatient, patientScopeWhere, type BranchScope } from "@/lib/patient-scope";

export async function listPatientsForScope(scope: BranchScope) {
  if (!scope.branch) return [];
  const rows = await db
    .select({
      id: patients.id,
      miosalonPatientId: patients.miosalonPatientId,
      clinicId: patients.clinicId,
      branch: patients.branch,
      metadata: patients.metadata,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
      fieldValueCount: sql<number>`(
        SELECT count(*)::int FROM ${fieldValues}
        WHERE ${fieldValues.patientId} = ${patients.id}
      )`,
    })
    .from(patients)
    .where(patientScopeWhere(scope))
    .orderBy(desc(patients.updatedAt));

  return rows;
}

export async function getPatientWithFieldGroups(
  scope: BranchScope,
  miosalonPatientId: string
) {
  const patient = await findScopedPatient(scope, miosalonPatientId);
  if (!patient) return null;
  const clinicId = scope.clinicId;

  const groups = await db
    .select()
    .from(fieldGroups)
    .where(eq(fieldGroups.clinicId, clinicId))
    .orderBy(asc(fieldGroups.displayOrder));

  const groupIds = groups.map((g) => g.id);
  const definitions =
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

  return {
    patient,
    fieldGroups: groups.map((g) => ({
      ...g,
      fields: definitions
        .filter((d) => d.groupId === g.id)
        .map((d) => ({
          ...d,
          value: valueMap[d.id] ?? null,
        })),
    })),
  };
}

export async function listFieldGroupsForClinic(clinicId: string) {
  const groups = await db
    .select()
    .from(fieldGroups)
    .where(eq(fieldGroups.clinicId, clinicId))
    .orderBy(asc(fieldGroups.displayOrder));

  const groupIds = groups.map((g) => g.id);
  const definitions =
    groupIds.length === 0
      ? []
      : await db
          .select()
          .from(fieldDefinitions)
          .where(inArray(fieldDefinitions.groupId, groupIds))
          .orderBy(asc(fieldDefinitions.displayOrder));

  return groups.map((g) => ({
    ...g,
    fields: definitions.filter((d) => d.groupId === g.id),
  }));
}

export function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export type PatientIntakeForm = {
  templateId: string;
  templateName: string;
  submittedAt: Date;
  fields: { label: string; name: string; value: unknown }[];
};

/** Latest saved answers per form template (extension sidebar saves). */
export async function getPatientIntakeForms(
  clinicId: string,
  patientInternalId: string
): Promise<PatientIntakeForm[]> {
  const templates = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.clinicId, clinicId))
    .orderBy(asc(formTemplates.name));

  const results: PatientIntakeForm[] = [];

  for (const template of templates) {
    const [submission] = await db
      .select()
      .from(formSubmissions)
      .where(
        and(
          eq(formSubmissions.patientId, patientInternalId),
          eq(formSubmissions.templateId, template.id)
        )
      )
      .orderBy(desc(formSubmissions.submittedAt))
      .limit(1);

    if (!submission) continue;

    const data = submission.data ?? {};
    const specs = [...(template.fields as FormField[])].sort(
      (a, b) => a.displayOrder - b.displayOrder
    );

    const fields = specs
      .filter((f) => f.type !== "section")
      .map((f) => ({
        label: f.label,
        name: f.name,
        value: data[f.name] ?? null,
      }))
      .filter((f) => f.value !== null && f.value !== "" && f.value !== undefined);

    if (fields.length === 0) continue;

    results.push({
      templateId: template.id,
      templateName: template.name,
      submittedAt: submission.submittedAt,
      fields,
    });
  }

  return results;
}

/** Flat list of saved intake fields (for summary rows e.g. phone on patient header). */
export function flattenIntakeFields(forms: PatientIntakeForm[]) {
  const seen = new Set<string>();
  const out: { label: string; value: unknown }[] = [];
  for (const form of forms) {
    for (const field of form.fields) {
      const key = field.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label: field.label, value: field.value });
    }
  }
  return out;
}
