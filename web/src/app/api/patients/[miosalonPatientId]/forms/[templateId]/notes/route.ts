import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { formNotes, formTemplates } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAuth, unauthorized } from "@/lib/extension-auth";
import { ensureScopedPatient, findScopedPatient, noBranchAssigned } from "@/lib/patient-scope";

type Params = { params: { miosalonPatientId: string; templateId: string } };

/** List notes for patient + form + active network/store context */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);
  const search = new URL(req.url).searchParams;
  const networkId = search.get("networkId")?.trim();
  const storeId = search.get("storeId")?.trim();
  if (!networkId || !storeId) {
    return jsonError("networkId and storeId are required", 400);
  }

  const patient = await findScopedPatient(auth, miosalonPatientId);
  if (!patient) return jsonOk({ notes: [] });

  const notes = await db
    .select({
      id: formNotes.id,
      content: formNotes.content,
      networkId: formNotes.networkId,
      storeId: formNotes.storeId,
      activeUserId: formNotes.activeUserId,
      staffId: formNotes.staffId,
      createdAt: formNotes.createdAt,
      updatedAt: formNotes.updatedAt,
    })
    .from(formNotes)
    .where(
      and(
        eq(formNotes.patientId, patient.id),
        eq(formNotes.templateId, params.templateId),
        eq(formNotes.networkId, networkId),
        eq(formNotes.storeId, storeId)
      )
    )
    .orderBy(desc(formNotes.updatedAt));

  return jsonOk({ notes });
}

const createSchema = z.object({
  content: z.string().min(1),
  networkId: z.string().min(1),
  storeId: z.string().min(1),
  activeUserId: z.string().min(1),
});

/** Create a note */
export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);

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

  const [template] = await db
    .select({ id: formTemplates.id })
    .from(formTemplates)
    .where(
      and(eq(formTemplates.id, params.templateId), eq(formTemplates.clinicId, auth.clinicId))
    )
    .limit(1);

  if (!template) return jsonError("Form not found", 404);

  const patient = await ensureScopedPatient(auth, miosalonPatientId);
  if (!patient) return noBranchAssigned();

  const [note] = await db
    .insert(formNotes)
    .values({
      patientId: patient.id,
      templateId: params.templateId,
      networkId: parsed.data.networkId,
      storeId: parsed.data.storeId,
      activeUserId: parsed.data.activeUserId,
      content: parsed.data.content,
      staffId: auth.id,
    })
    .returning();

  return jsonOk({ note }, 201);
}

const updateSchema = z.object({
  content: z.string().min(1),
  noteId: z.string().uuid(),
});

/** Update a note (body includes noteId) */
export async function PATCH(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);

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

  const patient = await findScopedPatient(auth, miosalonPatientId);
  if (!patient) return jsonError("Customer not found", 404);

  const [existing] = await db
    .select()
    .from(formNotes)
    .where(
      and(
        eq(formNotes.id, parsed.data.noteId),
        eq(formNotes.patientId, patient.id),
        eq(formNotes.templateId, params.templateId)
      )
    )
    .limit(1);

  if (!existing) return jsonError("Note not found", 404);

  const [note] = await db
    .update(formNotes)
    .set({
      content: parsed.data.content,
      staffId: auth.id,
      updatedAt: new Date(),
    })
    .where(eq(formNotes.id, existing.id))
    .returning();

  return jsonOk({ note });
}
