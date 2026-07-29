import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { formTemplates } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";

type Params = { params: { token: string } };

/** Public: fetch an active form template by share token (no auth). */
export async function GET(_req: Request, { params }: Params) {
  const token = decodeURIComponent(params.token);

  const [template] = await db
    .select({
      id: formTemplates.id,
      name: formTemplates.name,
      description: formTemplates.description,
      fields: formTemplates.fields,
      active: formTemplates.active,
      version: formTemplates.version,
    })
    .from(formTemplates)
    .where(eq(formTemplates.publicToken, token))
    .limit(1);

  if (!template) return jsonError("Form not found", 404);
  if (!template.active) return jsonError("This form is not currently accepting submissions", 403);

  return jsonOk({ template });
}
