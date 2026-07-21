import Link from "next/link";
import { getAppSession } from "@/lib/session";
import { listPatientsForClinic } from "@/lib/patient-queries";
import { profileFromMetadata } from "@/lib/miosalon-profile";

function formatRelative(d: Date) {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
}

export default async function DashboardPage() {
  const session = await getAppSession();
  const clinicId = session?.user?.clinicId ?? "drjo-skin-revive";
  const patients = await listPatientsForClinic(clinicId);
  const recent = patients.slice(0, 5);

  const greetingName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "there";

  const actions = [
    {
      href: "/dashboard/patients",
      title: "Patients",
      description: "View profiles and custom data captured from MioSalon.",
      accent: "from-teal-600 to-emerald-700",
    },
    {
      href: "/dashboard/forms",
      title: "Forms",
      description: "Design intake and clinical forms for your team.",
      accent: "from-stone-700 to-stone-900",
    },
    {
      href: "/dashboard/field-groups",
      title: "Field groups",
      description: "Organize extra fields shown on each customer record.",
      accent: "from-amber-700 to-orange-800",
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8 sm:py-10">
      <header className="mb-10">
        <p className="text-sm font-medium text-teal-800">Good to see you, {greetingName}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Clinic overview
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-stone-600">
          Manage the extra clinical information your team fills in while using MioSalon in Chrome.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-800 to-emerald-900 p-6 text-white shadow-lg shadow-teal-900/20 sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-medium text-teal-100/90">Customers linked</p>
          <p className="mt-2 font-display text-5xl font-semibold tracking-tight">
            {patients.length}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-teal-100/80">
            Profiles appear here when staff open a customer in MioSalon with the extension enabled.
          </p>
        </div>

        {actions.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm transition hover:border-teal-200 hover:shadow-md"
          >
            <span
              className={`inline-block h-1 w-10 rounded-full bg-gradient-to-r ${item.accent}`}
              aria-hidden
            />
            <p className="mt-4 text-lg font-semibold text-stone-900 group-hover:text-teal-900">
              {item.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.description}</p>
            <span className="mt-4 inline-flex items-center text-sm font-medium text-teal-800">
              Open
              <span className="ml-1 transition group-hover:translate-x-0.5" aria-hidden>
                →
              </span>
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-10 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Recently updated</h2>
            <p className="mt-1 text-sm text-stone-500">Latest customer records your team touched.</p>
          </div>
          {patients.length > 0 && (
            <Link
              href="/dashboard/patients"
              className="text-sm font-medium text-teal-800 hover:text-teal-900"
            >
              See all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-stone-200 bg-stone-50/80 px-6 py-10 text-center">
            <p className="font-medium text-stone-800">No customers yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-stone-500">
              Install the Chrome extension, sign in with the same account, and open a customer in
              MioSalon to get started.
            </p>
          </div>
        ) : (
          <ul className="mt-6 divide-y divide-stone-100">
            {recent.map((p) => {
              const profile = profileFromMetadata(p.metadata);
              const name = profile?.name ?? "Unnamed customer";
              return (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/patients/${encodeURIComponent(p.miosalonPatientId)}`}
                    className="flex flex-wrap items-center justify-between gap-3 py-4 transition hover:bg-stone-50/80 -mx-2 px-2 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{name}</p>
                      <p className="text-sm text-stone-500">ID {p.miosalonPatientId}</p>
                    </div>
                    <span className="text-sm text-stone-400">
                      {formatRelative(new Date(p.updatedAt))}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
