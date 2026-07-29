import type { ReactNode } from "react";
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
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = { params: { miosalonPatientId: string } };

function DefinitionList({
  rows,
}: {
  rows: { key: string; label: string; value: ReactNode; mono?: boolean }[];
}) {
  return (
    <dl className="divide-y divide-border">
      {rows.map((row) => (
        <div
          key={row.key}
          className="grid gap-1 px-5 py-3.5 sm:grid-cols-[200px_1fr] sm:gap-6 sm:px-6"
        >
          <dt className="text-sm font-medium text-muted-foreground">{row.label}</dt>
          <dd
            className={`text-sm text-foreground ${row.mono ? "font-mono text-xs" : ""}`}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default async function PatientDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  const clinicId = session?.user?.clinicId ?? "drjo-skin-revive";
  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);

  const data = await getPatientWithFieldGroups(clinicId, miosalonPatientId);
  if (!data) notFound();

  const { patient, fieldGroups } = data;
  const intakeForms = await getPatientIntakeForms(clinicId, patient.id);
  const intakeSummary = flattenIntakeFields(intakeForms);
  const miosalon = profileFromMetadata(
    patient.metadata as Record<string, unknown> | null
  );
  const displayName = miosalon?.name ?? "Customer";

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        backHref="/dashboard/patients"
        backLabel="Back to Inbox"
        eyebrow="Customer record"
        title={displayName}
        description={
          <>
            Customer ID{" "}
            <span className="font-mono text-foreground">{patient.miosalonPatientId}</span>
            {miosalon?.syncedAt ? (
              <>
                {" "}
                · Customer profile synced{" "}
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(miosalon.syncedAt))}
              </>
            ) : null}
          </>
        }
      />

      {(intakeSummary.length > 0 || miosalon) && (
        <Card className="mb-5">
          <CardHeader
            title="Customer info"
            description="Saved from intake forms submitted via the extension or public link."
          />
          <DefinitionList
            rows={[
              {
                key: "customer-id",
                label: "Customer ID",
                value: patient.miosalonPatientId,
                mono: true,
              },
              ...intakeSummary.map(({ label, value }) => ({
                key: label,
                label,
                value: formatFieldValue(value),
              })),
              ...(!intakeSummary.length && miosalon?.mobile
                ? [
                    {
                      key: "mobile",
                      label: "Mobile",
                      value: formatFieldValue(miosalon.mobile),
                    },
                  ]
                : []),
            ]}
          />
        </Card>
      )}

      {intakeForms.length > 0 && (
        <div className="mb-5 space-y-5">
          {intakeForms.map((form) => (
            <Card key={form.templateId}>
              <CardHeader
                title={form.templateName || "Intake form"}
                description={`Last saved ${new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(form.submittedAt)}`}
                action={<Badge tone="accent">Form submission</Badge>}
              />
              <DefinitionList
                rows={form.fields.map((field) => ({
                  key: field.name,
                  label: field.label,
                  value: formatFieldValue(field.value),
                }))}
              />
            </Card>
          ))}
        </div>
      )}

      {miosalon && (
        <Card className="mb-5">
          <CardHeader
            title="Customer profile"
            description="Copied from Customer 360° when the extension loads this page (read-only snapshot)."
          />
          <DefinitionList
            rows={PROFILE_LABELS.map(({ key, label }) => ({
              key,
              label,
              value: formatFieldValue(miosalon[key]),
            }))}
          />
        </Card>
      )}

      <div className="space-y-5">
        {fieldGroups.map((group) => (
          <Card key={group.id}>
            <CardHeader
              title={group.name}
              description={group.description ?? undefined}
              action={
                !group.active ? <Badge tone="warning">Inactive</Badge> : undefined
              }
            />
            {group.fields.length === 0 ? (
              <CardBody>
                <p className="text-sm text-muted-foreground">No fields in this group.</p>
              </CardBody>
            ) : (
              <DefinitionList
                rows={group.fields.map((field) => ({
                  key: field.id,
                  label: field.label,
                  value: (
                    <>
                      {formatFieldValue(field.value)}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({field.type})
                      </span>
                    </>
                  ),
                }))}
              />
            )}
          </Card>
        ))}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Record synced from the Chrome extension when staff open this customer&apos;s page.
      </p>
    </div>
  );
}
