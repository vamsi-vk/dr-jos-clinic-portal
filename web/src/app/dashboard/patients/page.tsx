import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPatientsForClinic } from "@/lib/patient-queries";
import { profileFromMetadata } from "@/lib/miosalon-profile";
import { PatientsTable, type PatientRow } from "@/components/PatientsTable";
import { CreateClientDialog } from "@/components/CreateClientDialog";

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default async function PatientsPage() {
  const session = await getServerSession(authOptions);
  const clinicId = session?.user?.clinicId ?? "drjo-skin-revive";
  const patients = await listPatientsForClinic(clinicId);

  const rows: PatientRow[] = patients.map((p) => {
    const profile = profileFromMetadata(p.metadata as Record<string, unknown> | null);
    const name = profile?.name ?? "Unnamed Patient";
    const initials = name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("");
    const meta = (p.metadata as Record<string, unknown> | null) ?? {};
    const hasSheets = !!(meta.therapySheets);
    return {
      id: p.id,
      miosalonPatientId: p.miosalonPatientId,
      name,
      initials,
      fieldValueCount: p.fieldValueCount,
      updatedAt: formatDate(new Date(p.updatedAt)),
      updatedAtTs: new Date(p.updatedAt).getTime(),
      hasSheets,
    };
  });

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Records</p>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-0.5">Clients</h1>
          <p className="text-sm text-gray-500 mt-1">
            {patients.length} client{patients.length !== 1 ? "s" : ""} linked through the clinic extension
          </p>
        </div>
        <CreateClientDialog />
      </div>
      <PatientsTable patients={rows} />
    </div>
  );
}
