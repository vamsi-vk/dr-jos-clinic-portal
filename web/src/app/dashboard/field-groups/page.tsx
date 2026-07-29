import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listFieldGroupsForClinic } from "@/lib/patient-queries";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { IconLayers } from "@/components/ui/icons";

export default async function FieldGroupsPage() {
  const session = await getServerSession(authOptions);
  const clinicId = session?.user?.clinicId ?? "drjo-skin-revive";
  const groups = await listFieldGroupsForClinic(clinicId);

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Schema"
        title="Field groups"
        description="Groups of extra fields shown on each customer profile in the extension panel."
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={<IconLayers size={22} />}
          title="No field groups"
          description="Seeded groups will appear here. They organize clinical fields on customer profiles."
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <Card key={group.id}>
              <CardHeader
                title={group.name}
                description={group.description ?? undefined}
                action={
                  <Badge tone={group.active ? "success" : "muted"}>
                    {group.active ? "Active" : "Inactive"}
                  </Badge>
                }
              />
              {group.fields.length === 0 ? (
                <CardBody>
                  <p className="text-sm text-muted-foreground">No fields yet.</p>
                </CardBody>
              ) : (
                <ul className="divide-y divide-border">
                  {group.fields.map((f) => (
                    <li
                      key={f.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 text-sm sm:px-6"
                    >
                      <span className="font-medium text-foreground">{f.label}</span>
                      <span className="font-mono text-xs text-muted-foreground">{f.name}</span>
                      <Badge>{f.type}</Badge>
                      {f.required ? <Badge tone="warning">required</Badge> : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
