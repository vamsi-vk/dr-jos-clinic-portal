import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { StaffLoginForm } from "@/components/staff-login-form";

const highlights = [
  "Intake forms & drag-and-drop form builder",
  "Custom clinical field groups inside MioSalon",
  "Patient data linked by MioSalon ID",
  "Reports & exports from your extension database",
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-emerald-950 px-8 py-10 text-white sm:px-12 lg:px-14 lg:py-14">
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-teal-400/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-300/10 blur-3xl"
          aria-hidden
        />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-teal-200/90">
            Dr. Jo&apos;s Skin Revive Clinic
          </p>
          <h1 className="mt-4 max-w-md font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            MioSalon Extension Portal
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-teal-100/85">
            Configure forms, field groups, and reports that staff see inside MioSalon
            through the Chrome extension — without changing MioSalon itself.
          </p>
        </div>

        <ul className="relative mt-10 space-y-3 lg:mt-0">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-teal-50/90">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/25 text-teal-200"
                aria-hidden
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6l2.5 2.5 4.5-5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {item}
            </li>
          ))}
        </ul>

        <p className="relative mt-10 text-xs text-teal-300/60 lg:mt-8">
          3F Advanced Techno Labs · MioSalon extension platform
        </p>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-stone-200/80 bg-white p-8 shadow-xl shadow-stone-900/5 sm:p-10">
            <StaffLoginForm />
          </div>
          <p className="mt-6 text-center text-xs text-stone-400">
            After sign-in you&apos;ll go straight to the admin portal.
          </p>
        </div>
      </section>
    </main>
  );
}
