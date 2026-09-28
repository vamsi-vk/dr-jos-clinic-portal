import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { requireAuth, unauthorized } from "@/lib/extension-auth";
import { jsonError, jsonOk } from "@/lib/api";
import { listPatientsForClinic } from "@/lib/patient-queries";

/** List extended patients for the signed-in clinic (portal + extension JWT) */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const rows = await listPatientsForClinic(auth.clinicId);
  return jsonOk({ patients: rows, count: rows.length });
}

const createClientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  mobile: z.string().trim().max(20).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  gender: z.string().trim().max(40).optional().default(""),
  customerId: z.string().trim().min(1, "Customer ID is required").max(40),
});

function normaliseCustomerId(raw: string) {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Create a client from the portal UI */
export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = createClientSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid client details", 400, parsed.error.flatten());
  }

  const { name, mobile, email, gender, customerId } = parsed.data;
  const miosalonPatientId = normaliseCustomerId(customerId);

  const [dup] = await db
    .select({ id: patients.id })
    .from(patients)
    .where(
      and(eq(patients.clinicId, auth.clinicId), eq(patients.miosalonPatientId, miosalonPatientId))
    )
    .limit(1);
  if (dup) return jsonError("A client with this ID already exists", 409);

  const profile = {
    name,
    customerId: miosalonPatientId,
    mobile: mobile || undefined,
    email: email || undefined,
    gender: gender || undefined,
    syncedAt: new Date().toISOString(),
  };

  const [created] = await db
    .insert(patients)
    .values({
      miosalonPatientId,
      clinicId: auth.clinicId,
      metadata: { miosalonProfile: profile, createdInPortal: true },
    })
    .returning();

  return jsonOk({ ok: true, patient: created, miosalonPatientId }, 201);
}
