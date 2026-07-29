import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { StaffLoginForm } from "@/components/staff-login-form";
import { IconCheck } from "@/components/ui/icons";

const highlights = [
  "Intake forms & drag-and-drop form builder",
  "Custom clinical field groups in the browser extension",
  "Customer data linked by customer ID",
  "Reports & exports from your extension database",
];

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect("/dashboard");

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-2">
      <section className="relative flex flex-col justify-between overflow-hidden px-8 py-10 text-white sm:px-12 lg:px-14 lg:py-14"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 10% 0%, color-mix(in srgb, var(--accent) 55%, #041016), transparent), linear-gradient(160deg, #071018 0%, #0b1620 45%, color-mix(in srgb, var(--accent) 35%, #061018) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full opacity-30 blur-3xl"
          style={{ background: "var(--accent)" }}
          aria-hidden
        />

        <div className="relative">
          <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sm font-bold backdrop-blur">
            MJ
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
            Dr. Jo&apos;s Skin Revive Clinic
          </p>
          <h1 className="mt-4 max-w-md text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Clinic Portal
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
            Configure forms, field groups, and reports that staff access through the
            Chrome extension — alongside your existing salon workflow.
          </p>
        </div>

        <ul className="relative mt-10 space-y-3 lg:mt-0">
          {highlights.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-white/80">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-white">
                <IconCheck size={12} />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <p className="relative mt-10 text-xs text-white/40 lg:mt-8">
          3F Advanced Techno Labs · Clinic extension platform
        </p>
      </section>

      <section className="flex items-center justify-center bg-background px-6 py-12 sm:px-10 lg:px-16">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-border bg-card p-8 shadow-lg sm:p-10">
            <StaffLoginForm />
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            After sign-in you&apos;ll go straight to the admin portal.
          </p>
        </div>
      </section>
    </main>
  );
}
