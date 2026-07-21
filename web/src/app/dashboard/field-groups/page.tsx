import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listFieldGroupsForClinic } from "@/lib/patient-queries";

export default async function FieldGroupsPage() {
  const session = await getServerSession(authOptions);
  const clinicId = session?.user?.clinicId ?? "drjo-skin-revive";
  const groups = await listFieldGroupsForClinic(clinicId);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-3xl font-semibold text-stone-900">Field groups</h1>
      <p className="mt-2 text-stone-600">
        Groups of extra fields shown on each customer profile in the extension panel.
      </p>

      <div className="mt-8 space-y-6">
        {groups.map((group) => (
          <section
            key={group.id}
            className="rounded-lg border border-stone-200 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{group.name}</h2>
                {group.description && (
                  <p className="mt-1 text-sm text-stone-600">{group.description}</p>
                )}
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  group.active
                    ? "bg-teal-100 text-teal-900"
                    : "bg-stone-200 text-stone-600"
                }`}
              >
                {group.active ? "Active" : "Inactive"}
              </span>
            </div>
            <ul className="divide-y divide-stone-100">
              {group.fields.map((f) => (
                <li key={f.id} className="flex flex-wrap gap-x-4 px-5 py-3 text-sm">
                  <span className="font-medium text-stone-800">{f.label}</span>
                  <span className="text-stone-500">{f.name}</span>
                  <span className="rounded bg-stone-100 px-1.5 text-xs text-stone-600">
                    {f.type}
                  </span>
                  {f.required && (
                    <span className="text-xs text-red-700">required</span>
                  )}
                </li>
              ))}
              {group.fields.length === 0 && (
                <li className="px-5 py-4 text-sm text-stone-500">No fields yet.</li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
