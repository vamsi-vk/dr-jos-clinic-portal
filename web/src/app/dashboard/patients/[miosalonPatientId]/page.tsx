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
import { Badge } from "@/components/ui/badge";
import { PatientDetailClient } from "@/components/PatientDetailClient";
import type { TherapySheetsData } from "@/components/TherapySheets";

type Props = { params: { miosalonPatientId: string } };

const CHIP_COLORS = [
  { bg: "bg-indigo-50", border: "border-indigo-200", label: "text-indigo-400", value: "text-indigo-800" },
  { bg: "bg-violet-50", border: "border-violet-200", label: "text-violet-400", value: "text-violet-800" },
  { bg: "bg-pink-50", border: "border-pink-200", label: "text-pink-400", value: "text-pink-800" },
  { bg: "bg-teal-50", border: "border-teal-200", label: "text-teal-400", value: "text-teal-800" },
  { bg: "bg-amber-50", border: "border-amber-200", label: "text-amber-400", value: "text-amber-800" },
  { bg: "bg-sky-50", border: "border-sky-200", label: "text-sky-400", value: "text-sky-800" },
  { bg: "bg-emerald-50", border: "border-emerald-200", label: "text-emerald-400", value: "text-emerald-800" },
];

function InfoChip({ label, value, mono, colorIdx = 0 }: { label: string; value: string; mono?: boolean; colorIdx?: number }) {
  if (!value || value === "—") return null;
  const c = CHIP_COLORS[colorIdx % CHIP_COLORS.length];
  return (
    <div className={`flex flex-col gap-1 rounded-xl border-2 ${c.bg} ${c.border} px-4 py-3 shadow-sm`}>
      <span className={`text-[10px] font-bold uppercase tracking-widest ${c.label}`}>{label}</span>
      <span className={`text-sm font-bold ${c.value} ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}

export default async function PatientDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const clinicId = session?.user?.clinicId ?? "drjo-skin-revive";
  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);

  const data = await getPatientWithFieldGroups(clinicId, miosalonPatientId);
  if (!data) notFound();

  const { patient } = data;
  const intakeForms = await getPatientIntakeForms(clinicId, patient.id);
  const therapySheetsData =
    ((patient.metadata as Record<string, unknown> | null)?.therapySheets as TherapySheetsData | null) ?? null;
  const intakeSummary = flattenIntakeFields(intakeForms);
  const miosalon = profileFromMetadata(
    patient.metadata as Record<string, unknown> | null
  );
  const displayName = miosalon?.name ?? "Customer";

  return (
    <div className="w-full">

      <PatientDetailClient
        miosalonPatientId={miosalonPatientId}
        patientName={displayName}
        phoneNo={miosalon?.mobile ?? undefined}
        syncedAt={miosalon?.syncedAt ?? undefined}
        initialData={therapySheetsData}
        infoSlot={
          <>
            {/* Compact customer info card */}
            {(intakeSummary.length > 0 || miosalon) && (
              <div className="mb-5 overflow-hidden rounded-2xl border-2 border-indigo-100 bg-white shadow-md">
                <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5">
                  <span className="text-xl">👤</span>
                  <span className="text-sm font-bold text-white tracking-wide">Customer Info</span>
                  {miosalon?.syncedAt && (
                    <span className="ml-auto rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-medium text-white/80">
                      Synced {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(miosalon.syncedAt))}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {miosalon && PROFILE_LABELS.filter(({ key }) => key !== "name").map(({ key, label }, i) => {
                    const val = formatFieldValue(miosalon[key]);
                    return <InfoChip key={key} label={label} value={val} colorIdx={i} />;
                  })}
                  {intakeSummary.map(({ label, value }, i) => (
                    <InfoChip key={label} label={label} value={formatFieldValue(value)} colorIdx={i + 4} />
                  ))}
                </div>
              </div>
            )}

            {/* Compact intake forms */}
            {intakeForms.length > 0 && (
              <div className="mb-5 space-y-3">
                {intakeForms.map((form) => (
                  <div key={form.templateId} className="overflow-hidden rounded-2xl border-2 border-teal-100 bg-white shadow-md">
                    <div className="flex items-center gap-3 bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-3.5">
                      <span className="text-xl">📝</span>
                      <span className="text-sm font-bold text-white">{form.templateName || "Intake form"}</span>
                      <Badge tone="accent">Form submission</Badge>
                      <span className="ml-auto rounded-full bg-white/20 px-3 py-0.5 text-[10px] font-medium text-white/80">
                        {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(form.submittedAt)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4">
                      {form.fields.map((field, i) => (
                        <InfoChip key={field.name} label={field.label} value={formatFieldValue(field.value)} colorIdx={i + 2} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        }
      />

      <p className="mt-6 text-xs text-muted-foreground">
        Record synced from the Chrome extension when staff open this customer&apos;s page.
      </p>
    </div>
  );
}
