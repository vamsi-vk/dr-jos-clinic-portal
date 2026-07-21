import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { formTemplates, type FormField } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAuth, unauthorized } from "@/lib/extension-auth";
import { normalizeFieldOrder } from "@/lib/form-builder";

const fieldSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "textarea",
    "number",
    "decimal",
    "select",
    "multiselect",
    "date",
    "daterange",
    "boolean",
    "signature",
    "section",
  ]),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  displayOrder: z.number().int(),
});

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  active: z.boolean().optional(),
  fields: z.array(fieldSchema).optional(),
});

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const url = new URL(req.url);
  const activeOnly = url.searchParams.get("active") === "true";

  const rows = await db
    .select()
    .from(formTemplates)
    .where(
      activeOnly
        ? and(eq(formTemplates.clinicId, auth.clinicId), eq(formTemplates.active, true))
        : eq(formTemplates.clinicId, auth.clinicId)
    )
    .orderBy(desc(formTemplates.updatedAt));

  return jsonOk({ templates: rows });
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid payload", 400, parsed.error.flatten());
  }

  const fields = normalizeFieldOrder((parsed.data.fields ?? []) as FormField[]);

  const [template] = await db
    .insert(formTemplates)
    .values({
      clinicId: auth.clinicId,
      name: parsed.data.name,
      description: parsed.data.description,
      active: parsed.data.active ?? true,
      fields,
    })
    .returning();

  return jsonOk({ template }, 201);
}
