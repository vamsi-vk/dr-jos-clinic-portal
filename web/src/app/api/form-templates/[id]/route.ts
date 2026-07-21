import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { formTemplates, type FormField } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAuth, unauthorized } from "@/lib/extension-auth";
import { normalizeFieldOrder } from "@/lib/form-builder";

type Params = { params: { id: string } };

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

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  active: z.boolean().optional(),
  fields: z.array(fieldSchema).optional(),
});

export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const [template] = await db
    .select()
    .from(formTemplates)
    .where(and(eq(formTemplates.id, params.id), eq(formTemplates.clinicId, auth.clinicId)))
    .limit(1);

  if (!template) return jsonError("Template not found", 404);
  return jsonOk({ template });
}

export async function PUT(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid payload", 400, parsed.error.flatten());
  }

  const [existing] = await db
    .select()
    .from(formTemplates)
    .where(and(eq(formTemplates.id, params.id), eq(formTemplates.clinicId, auth.clinicId)))
    .limit(1);

  if (!existing) return jsonError("Template not found", 404);

  const fields = parsed.data.fields
    ? normalizeFieldOrder(parsed.data.fields as FormField[])
    : undefined;

  const [template] = await db
    .update(formTemplates)
    .set({
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
      ...(parsed.data.active !== undefined && { active: parsed.data.active }),
      ...(fields !== undefined && { fields }),
      updatedAt: new Date(),
    })
    .where(eq(formTemplates.id, params.id))
    .returning();

  return jsonOk({ template });
}

const patchSchema = z.object({
  active: z.boolean(),
});

/** Toggle active flag only (fast path for forms list) */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid payload", 400, parsed.error.flatten());
  }

  const [template] = await db
    .update(formTemplates)
    .set({ active: parsed.data.active, updatedAt: new Date() })
    .where(and(eq(formTemplates.id, params.id), eq(formTemplates.clinicId, auth.clinicId)))
    .returning({
      id: formTemplates.id,
      active: formTemplates.active,
    });

  if (!template) return jsonError("Template not found", 404);
  return jsonOk({ template });
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const [existing] = await db
    .select()
    .from(formTemplates)
    .where(and(eq(formTemplates.id, params.id), eq(formTemplates.clinicId, auth.clinicId)))
    .limit(1);

  if (!existing) return jsonError("Template not found", 404);

  await db.delete(formTemplates).where(eq(formTemplates.id, params.id));
  return jsonOk({ ok: true });
}
