import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { formTemplates, type FormField } from "@/db/schema";
import { FormBuilderEditor } from "@/components/FormBuilderEditor";
import { PageHeader } from "@/components/ui/page-header";

type Props = { params: { id: string } };

export default async function EditFormPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const clinicId = session.user.clinicId ?? "drjo-skin-revive";

  const [template] = await db
    .select()
    .from(formTemplates)
    .where(and(eq(formTemplates.id, params.id), eq(formTemplates.clinicId, clinicId)))
    .limit(1);

  if (!template) notFound();

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        backHref="/dashboard/forms"
        backLabel="All forms"
        eyebrow="Form builder"
        title="Edit form"
        description="Drag fields to reorder. Save the form, then share it via QR code from the Chrome extension."
      />
      <FormBuilderEditor
        initial={{
          id: template.id,
          name: template.name,
          description: template.description,
          active: template.active,
          fields: (template.fields ?? []) as FormField[],
        }}
      />
    </div>
  );
}
