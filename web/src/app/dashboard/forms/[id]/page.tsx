import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { eq, and } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { formTemplates, type FormField } from "@/db/schema";
import { FormBuilderEditor } from "@/components/FormBuilderEditor";

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
    <main className="mx-auto max-w-6xl px-6 py-10">
      <Link href="/dashboard/forms" className="text-sm text-teal-800 hover:underline">
        ← All forms
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-stone-900">Edit form</h1>
      <div className="mt-8">
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
    </main>
  );
}
