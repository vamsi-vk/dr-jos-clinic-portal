import Link from "next/link";
import { getAppSession } from "@/lib/session";
import { listPatientsForClinic } from "@/lib/patient-queries";
import { profileFromMetadata } from "@/lib/miosalon-profile";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  IconArrowRight,
  IconForms,
  IconInbox,
  IconLayers,
  IconPlus,
} from "@/components/ui/icons";

function formatRelative(d: Date) {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
}

export default async function DashboardPage() {
  const session = await getAppSession();
  const clinicId = session?.user?.clinicId ?? "drjo-skin-revive";
  const patients = await listPatientsForClinic(clinicId);
  const recent = patients.slice(0, 6);

  const greetingName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "there";

  const actions = [
    {
      href: "/dashboard/patients",
      title: "Inbox",
      description: "Profiles and custom data captured from customer pages.",
      icon: IconInbox,
    },
    {
      href: "/dashboard/forms",
      title: "Forms",
      description: "Create, edit, and manage intake forms for your team.",
      icon: IconForms,
    },
    {
      href: "/dashboard/field-groups",
      title: "Field groups",
      description: "Organize extra fields on each customer record.",
      icon: IconLayers,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Workspace"
        title={`Welcome back, ${greetingName}`}
        description="Manage extension forms, linked customers, and clinical field data from one workspace."
        actions={
          <Link href="/dashboard/forms/new">
            <Button>
              <IconPlus size={16} />
              New form
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-12">
        <Card className="relative overflow-hidden md:col-span-4">
          <div
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                "radial-gradient(circle at 20% 0%, var(--accent-soft), transparent 55%), linear-gradient(160deg, color-mix(in srgb, var(--accent) 92%, #000) 0%, var(--accent) 100%)",
            }}
          />
          <CardBody className="relative z-[1] text-accent-foreground">
            <p className="text-sm font-medium text-white/80">Customers linked</p>
            <p className="mt-3 text-5xl font-semibold tracking-tight">{patients.length}</p>
            <p className="mt-3 text-sm leading-relaxed text-white/75">
              Appear when staff open a customer page with the extension signed in.
            </p>
            <Link href="/dashboard/patients" className="mt-6 inline-flex">
              <Button
                variant="secondary"
                size="sm"
                className="bg-white/15 text-white hover:bg-white/25"
              >
                View inbox
                <IconArrowRight size={14} />
              </Button>
            </Link>
          </CardBody>
        </Card>

        <div className="grid gap-4 sm:grid-cols-3 md:col-span-8">
          {actions.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="group">
                <Card className="h-full transition duration-200 ease-smooth hover:-translate-y-0.5 hover:shadow-md hover:border-[color-mix(in_srgb,var(--accent)_35%,var(--border))]">
                  <CardBody>
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-muted text-accent transition group-hover:bg-accent group-hover:text-accent-foreground">
                      <Icon size={18} />
                    </div>
                    <p className="font-semibold tracking-tight text-foreground">{item.title}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {item.description}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent">
                      Open
                      <IconArrowRight
                        size={14}
                        className="transition group-hover:translate-x-0.5"
                      />
                    </span>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recently updated"
          description="Latest customer records your team touched."
          action={
            patients.length > 0 ? (
              <Link
                href="/dashboard/patients"
                className="text-sm font-medium text-accent hover:underline"
              >
                See all
              </Link>
            ) : null
          }
        />
        <CardBody className="!pt-0">
          {recent.length === 0 ? (
            <div className="py-4">
              <EmptyState
                title="No customers yet"
                description="Install the Chrome extension, sign in with the same account, and open a customer page to get started."
                actionHref="/dashboard/forms"
                actionLabel="Create a form"
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((p) => {
                const profile = profileFromMetadata(p.metadata);
                const name = profile?.name ?? "Unnamed customer";
                return (
                  <li key={p.id}>
                    <Link
                      href={`/dashboard/patients/${encodeURIComponent(p.miosalonPatientId)}`}
                      className="flex items-center justify-between gap-4 py-3.5 transition hover:bg-muted/40 -mx-2 rounded-lg px-2"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-muted text-xs font-semibold text-accent">
                          {name
                            .split(" ")
                            .slice(0, 2)
                            .map((n) => n[0]?.toUpperCase() ?? "")
                            .join("")}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{name}</p>
                          <p className="truncate font-mono text-xs text-muted-foreground">
                            {p.miosalonPatientId}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge>{p.fieldValueCount} fields</Badge>
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {formatRelative(new Date(p.updatedAt))}
                        </span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
