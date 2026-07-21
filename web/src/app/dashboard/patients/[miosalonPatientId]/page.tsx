import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  formatFieldValue,
  flattenIntakeFields,
  getPatientIntakeForms,
  getPatientWithFieldGroups,
} from "@/lib/patient-queries";
import { PROFILE_LABELS, profileFromMetadata } from "@/lib/miosalon-profile";

type Props = { params: { miosalonPatientId: string } };

export default async function PatientDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const clinicId = session?.user?.clinicId ?? "drjo-skin-revive";
  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);

  const data = await getPatientWithFieldGroups(clinicId, miosalonPatientId);
  if (!data) notFound();

  const { patient, fieldGroups } = data;
  const intakeForms = await getPatientIntakeForms(clinicId, patient.id);
  const intakeSummary = flattenIntakeFields(intakeForms);
  const miosalon = profileFromMetadata(
    patient.metadata as Record<string, unknown> | null
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link
        href="/dashboard/patients"
        className="text-sm text-teal-800 hover:underline"
      >
        ← All patients
      </Link>

      <h1 className="mt-4 text-3xl font-semibold text-stone-900">
        {miosalon?.name ?? "Patient"}{" "}
        <span className="font-mono text-2xl text-stone-700">
          {patient.miosalonPatientId}
        </span>
      </h1>
      <p className="mt-2 text-sm text-stone-500">
        Internal ID: <span className="font-mono">{patient.id}</span>
        {miosalon?.syncedAt && (
          <>
            {" "}
            · MioSalon profile synced{" "}
            {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(
              new Date(miosalon.syncedAt)
            )}
          </>
        )}
      </p>

      {(intakeSummary.length > 0 || miosalon) && (
        <section className="mt-8 rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-stone-900">Patient info</h2>
            <p className="mt-1 text-sm text-stone-600">
              Saved from intake forms in the MioSalon extension sidebar.
            </p>
          </div>
          <dl className="divide-y divide-stone-100">
            <div className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-stone-700">Customer ID</dt>
              <dd className="font-mono text-sm text-stone-900 sm:col-span-2">
                {patient.miosalonPatientId}
              </dd>
            </div>
            {intakeSummary.map(({ label, value }) => (
              <div
                key={label}
                className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4"
              >
                <dt className="text-sm font-medium text-stone-700">{label}</dt>
                <dd className="text-sm text-stone-900 sm:col-span-2">
                  {formatFieldValue(value)}
                </dd>
              </div>
            ))}
            {!intakeSummary.length && miosalon?.mobile && (
              <div className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-stone-700">Mobile</dt>
                <dd className="text-sm text-stone-900 sm:col-span-2">
                  {formatFieldValue(miosalon.mobile)}
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      {intakeForms.length > 0 && (
        <div className="mt-8 space-y-6">
          {intakeForms.map((form) => (
            <section
              key={form.templateId}
              className="rounded-lg border border-teal-100 bg-white shadow-sm"
            >
              <div className="border-b border-stone-100 px-5 py-4">
                <h2 className="text-lg font-semibold text-stone-900">
                  {form.templateName || "Intake form"}
                </h2>
                <p className="mt-1 text-xs text-stone-500">
                  Last saved{" "}
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(form.submittedAt)}
                </p>
              </div>
              <dl className="divide-y divide-stone-100">
                {form.fields.map((field) => (
                  <div
                    key={field.name}
                    className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4"
                  >
                    <dt className="text-sm font-medium text-stone-700">{field.label}</dt>
                    <dd className="text-sm text-stone-900 sm:col-span-2">
                      {formatFieldValue(field.value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}

      {miosalon && (
        <section className="mt-8 rounded-lg border border-stone-200 bg-white shadow-sm">
          <div className="border-b border-stone-100 px-5 py-4">
            <h2 className="text-lg font-semibold text-stone-900">MioSalon customer profile</h2>
            <p className="mt-1 text-sm text-stone-600">
              Copied from Customer 360° when the extension loads this page (read-only snapshot).
            </p>
          </div>
          <dl className="divide-y divide-stone-100">
            {PROFILE_LABELS.map(({ key, label }) => (
              <div key={key} className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-stone-700">{label}</dt>
                <dd className="text-sm text-stone-900 sm:col-span-2">
                  {formatFieldValue(miosalon[key])}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mt-8 space-y-6">
        {fieldGroups.map((group) => (
          <section
            key={group.id}
            className="rounded-lg border border-stone-200 bg-white shadow-sm"
          >
            <div className="border-b border-stone-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-stone-900">{group.name}</h2>
              {group.description && (
                <p className="mt-1 text-sm text-stone-600">{group.description}</p>
              )}
              {!group.active && (
                <span className="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                  Inactive
                </span>
              )}
            </div>
            <dl className="divide-y divide-stone-100">
              {group.fields.length === 0 ? (
                <p className="px-5 py-4 text-sm text-stone-500">No fields in this group.</p>
              ) : (
                group.fields.map((field) => (
                  <div
                    key={field.id}
                    className="grid gap-1 px-5 py-3 sm:grid-cols-3 sm:gap-4"
                  >
                    <dt className="text-sm font-medium text-stone-700">{field.label}</dt>
                    <dd className="text-sm text-stone-900 sm:col-span-2">
                      {formatFieldValue(field.value)}
                      <span className="ml-2 text-xs text-stone-400">({field.type})</span>
                    </dd>
                  </div>
                ))
              )}
            </dl>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-stone-500">
        Same payload as{" "}
        <code className="rounded bg-stone-100 px-1">
          GET /api/patients/{patient.miosalonPatientId}
        </code>
      </p>
    </main>
  );
}
