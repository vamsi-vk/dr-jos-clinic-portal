import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { formTemplates, patients } from "@/db/schema";
import { PublicForm } from "@/components/public-form";
import { getClinicSettings } from "@/lib/clinic-settings";

type PageProps = {
  params: { token: string };
  searchParams: {
    patient?: string;
    network?: string;
    store?: string;
    activeUser?: string;
  };
};

export default async function PublicFormPage({ params, searchParams }: PageProps) {
  const token = decodeURIComponent(params.token);
  const miosalonPatientId = searchParams.patient?.trim() || null;
  const networkId = searchParams.network?.trim() || null;
  const storeId = searchParams.store?.trim() || null;
  const activeUserId = searchParams.activeUser?.trim() || null;

  const [template] = await db
    .select()
    .from(formTemplates)
    .where(eq(formTemplates.publicToken, token))
    .limit(1);

  if (!template || !template.active) notFound();

  const [patient] = miosalonPatientId
    ? await db
        .select({ branch: patients.branch })
        .from(patients)
        .where(
          and(
            eq(patients.miosalonPatientId, miosalonPatientId),
            eq(patients.clinicId, template.clinicId)
          )
        )
        .orderBy(desc(patients.updatedAt))
        .limit(1)
    : [];

  const clinic = await getClinicSettings(template.clinicId, patient?.branch ?? null);

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:py-14">
      <div className="mx-auto mb-8 max-w-xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {clinic.name}
        </p>
        {miosalonPatientId ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Customer ID{" "}
            <span className="font-mono text-foreground">{miosalonPatientId}</span>
          </p>
        ) : null}
      </div>
      <PublicForm
        token={token}
        name={template.name}
        description={template.description}
        fields={template.fields}
        miosalonPatientId={miosalonPatientId}
        networkId={networkId}
        storeId={storeId}
        activeUserId={activeUserId}
        clinicName={clinic.name}
      />
    </div>
  );
}
