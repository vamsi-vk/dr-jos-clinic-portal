import { eq } from "drizzle-orm";
import { db } from "@/db";
import { formTemplates } from "@/db/schema";
import { generatePublicToken } from "@/lib/public-token";

/** Backfill missing public tokens (e.g. templates created before this column existed). */
export async function ensurePublicToken(templateId: string) {
  const [row] = await db
    .select({ id: formTemplates.id, publicToken: formTemplates.publicToken })
    .from(formTemplates)
    .where(eq(formTemplates.id, templateId))
    .limit(1);

  if (!row) return null;
  if (row.publicToken) return row.publicToken;

  let token = generatePublicToken();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [updated] = await db
        .update(formTemplates)
        .set({ publicToken: token, updatedAt: new Date() })
        .where(eq(formTemplates.id, templateId))
        .returning({ publicToken: formTemplates.publicToken });
      return updated?.publicToken ?? token;
    } catch {
      token = generatePublicToken();
    }
  }
  return token;
}

export async function backfillMissingPublicTokens(clinicId: string) {
  const rows = await db
    .select({ id: formTemplates.id })
    .from(formTemplates)
    .where(eq(formTemplates.clinicId, clinicId));

  for (const row of rows) {
    await ensurePublicToken(row.id);
  }
}
