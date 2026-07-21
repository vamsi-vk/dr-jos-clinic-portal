import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc, sql } from "drizzle-orm";
import { getAppSession } from "@/lib/session";
import { db } from "@/db";
import { formTemplates } from "@/db/schema";
import { FormTemplateList } from "@/components/form-template-list";

export default async function FormsListPage() {
  const session = await getAppSession();
  if (!session?.user) redirect("/");

  const clinicId = session.user.clinicId ?? "drjo-skin-revive";
  const rows = await db
    .select({
      id: formTemplates.id,
      name: formTemplates.name,
      active: formTemplates.active,
      fieldCount: sql<number>`jsonb_array_length(${formTemplates.fields})`.mapWith(Number),
    })
    .from(formTemplates)
    .where(eq(formTemplates.clinicId, clinicId))
    .orderBy(desc(formTemplates.updatedAt));

  const templates = rows.map((t) => ({
    ...t,
    fieldCount: Number.isFinite(t.fieldCount) ? t.fieldCount : 0,
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-stone-900">Form builder</h1>
          <p className="mt-2 text-stone-600">
            Build forms your team completes in the sidebar while viewing a customer in MioSalon.
          </p>
        </div>
        <Link
          href="/dashboard/forms/new"
          className="inline-block rounded-md bg-teal-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-900"
        >
          New form
        </Link>
      </div>

      {templates.length === 0 ? (
        <p className="mt-10 rounded-lg border border-dashed border-stone-300 bg-white/60 p-8 text-center text-stone-600">
          No forms yet.{" "}
          <Link href="/dashboard/forms/new" className="text-teal-800 hover:underline">
            Create your first form
          </Link>
        </p>
      ) : (
        <FormTemplateList templates={templates} />
      )}
    </main>
  );
}
