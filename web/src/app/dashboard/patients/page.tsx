import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPatientsForClinic } from "@/lib/patient-queries";
import { profileFromMetadata } from "@/lib/miosalon-profile";

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

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-stone-900">Patients</h1>
      <p className="mt-2 text-stone-600">
        Customers linked through the Chrome extension while your team works in MioSalon.
      </p>

      {patients.length === 0 ? (
        <p className="mt-8 rounded-lg border border-dashed border-stone-300 bg-white/60 p-8 text-center text-stone-600">
          No patients yet. Open a customer in MioSalon with the extension signed in.
        </p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-stone-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-stone-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Customer ID</th>
                <th className="px-4 py-3 font-medium">Saved fields</th>
                <th className="px-4 py-3 font-medium">Last updated</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {patients.map((p) => {
                const profile = profileFromMetadata(
                  p.metadata as Record<string, unknown> | null
                );
                return (
                <tr key={p.id} className="hover:bg-stone-50/80">
                  <td className="px-4 py-3 text-stone-900">{profile?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-stone-900">{p.miosalonPatientId}</td>
                  <td className="px-4 py-3 text-stone-700">{p.fieldValueCount}</td>
                  <td className="px-4 py-3 text-stone-600">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/patients/${encodeURIComponent(p.miosalonPatientId)}`}
                      className="font-medium text-teal-800 hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
