import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, desc, sql } from "drizzle-orm";
import { getAppSession } from "@/lib/session";
import { db } from "@/db";
import { formTemplates } from "@/db/schema";
import { FormTemplateList } from "@/components/form-template-list";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconForms, IconPlus } from "@/components/ui/icons";
import { backfillMissingPublicTokens } from "@/lib/ensure-public-token";

export default async function FormsListPage() {
  const session = await getAppSession();
  if (!session?.user) redirect("/");

  const clinicId = session.user.clinicId ?? "drjo-skin-revive";
  await backfillMissingPublicTokens(clinicId);

  const rows = await db
    .select({
      id: formTemplates.id,
      name: formTemplates.name,
      active: formTemplates.active,
      publicToken: formTemplates.publicToken,
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
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Forms"
        title="Your forms"
        description="View, manage, edit, or delete forms. Active forms appear in the Chrome extension for QR code sharing."
        actions={
          <Link href="/dashboard/forms/new">
            <Button>
              <IconPlus size={16} />
              New form
            </Button>
          </Link>
        }
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={<IconForms size={22} />}
          title="No forms yet"
          description="Create your first form. Once saved, it will appear here and in the extension for QR sharing."
          actionHref="/dashboard/forms/new"
          actionLabel="New form"
        />
      ) : (
        <FormTemplateList templates={templates} />
      )}
    </div>
  );
}
