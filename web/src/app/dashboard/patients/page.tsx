import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listPatientsForClinic } from "@/lib/patient-queries";
import { profileFromMetadata } from "@/lib/miosalon-profile";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { IconArrowRight, IconInbox } from "@/components/ui/icons";

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
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Records"
        title="Inbox"
        description="Customers linked through the Chrome extension while your team works on customer pages."
      />

      {patients.length === 0 ? (
        <EmptyState
          icon={<IconInbox size={22} />}
          title="Inbox is empty"
          description="Open a customer page with the extension signed in. Their profile will appear here automatically."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="px-5 py-3 font-semibold sm:px-6">Customer</th>
                  <th className="px-4 py-3 font-semibold">Customer ID</th>
                  <th className="px-4 py-3 font-semibold">Saved fields</th>
                  <th className="px-4 py-3 font-semibold">Last updated</th>
                  <th className="px-5 py-3 font-semibold sm:px-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {patients.map((p) => {
                  const profile = profileFromMetadata(
                    p.metadata as Record<string, unknown> | null
                  );
                  const name = profile?.name ?? "—";
                  return (
                    <tr
                      key={p.id}
                      className="transition hover:bg-muted/30"
                    >
                      <td className="px-5 py-3.5 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-muted text-[11px] font-semibold text-accent">
                            {name !== "—"
                              ? name
                                  .split(" ")
                                  .slice(0, 2)
                                  .map((n) => n[0]?.toUpperCase() ?? "")
                                  .join("")
                              : "?"}
                          </div>
                          <span className="font-medium text-foreground">{name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                        {p.miosalonPatientId}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge tone="accent">{p.fieldValueCount}</Badge>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {formatDate(p.updatedAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right sm:px-6">
                        <Link
                          href={`/dashboard/patients/${encodeURIComponent(p.miosalonPatientId)}`}
                          className="inline-flex items-center gap-1 text-sm font-medium text-accent transition hover:underline"
                        >
                          View
                          <IconArrowRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
