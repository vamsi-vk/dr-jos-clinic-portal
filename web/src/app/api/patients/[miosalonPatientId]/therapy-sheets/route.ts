import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";

type Params = { params: { miosalonPatientId: string } };

async function resolvePatient(clinicId: string, miosalonPatientId: string) {
  const [patient] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.miosalonPatientId, miosalonPatientId),
        eq(patients.clinicId, clinicId)
      )
    )
    .limit(1);
  return patient ?? null;
}

async function ensurePatient(clinicId: string, miosalonPatientId: string) {
  const existing = await resolvePatient(clinicId, miosalonPatientId);
  if (existing) return existing;
  const [created] = await db
    .insert(patients)
    .values({ miosalonPatientId, clinicId })
    .returning();
  return created;
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);

  const clinicId = session.user.clinicId ?? "drjo-skin-revive";
  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);

  const patient = await resolvePatient(clinicId, miosalonPatientId);
  if (!patient) return jsonOk({ therapySheets: null });

  const meta = (patient.metadata as Record<string, unknown> | null) ?? {};
  return jsonOk({ therapySheets: meta.therapySheets ?? null });
}

const rowSchema = z.record(z.string(), z.string());

const strokeSchema = z.object({
  color: z.string(),
  size: z.number(),
  pts: z.array(z.array(z.number())),
});

const faceEntrySchema = z.object({
  id: z.string(),
  strokes: z.array(strokeSchema).default([]),
  date: z.string(),
  fluency: z.string(),
  therapist: z.string(),
  clientSign: z.string(),
});

const botoxEntrySchema = z.object({
  id: z.string(),
  strokes: z.array(strokeSchema).default([]),
  idNo: z.string(),
  date: z.string(),
  treatment: z.string(),
  areas: z.string(),
  quantity: z.string(),
  therapistName: z.string(),
  clientSign: z.string(),
  doctorSign: z.string(),
});

const profileFormSchema = z.object({
  name: z.string().default(""),
  ageSex: z.string().default(""),
  phoneNo: z.string().default(""),
  address: z.string().default(""),
  emailId: z.string().default(""),
  sourceOfReferral: z.string().default(""),
  idNo: z.string().default(""),
  date: z.string().default(""),
  weight: z.string().default(""),
  height: z.string().default(""),
  bp: z.string().default(""),
  presentHistory: z.string().default(""),
  pastHistory: z.string().default(""),
  familyHistory: z.string().default(""),
  personalHistory: z.string().default(""),
  medicationHistory: z.string().default(""),
  coMorbidities: z.string().default(""),
  skinExamination: z.string().default(""),
  hairExamination: z.string().default(""),
  trichoscopyFindings: z.string().default(""),
});

const therapySheetsSchema = z.object({
  profileForm: profileFormSchema.optional(),
  therapySheet: z.array(rowSchema),
  laserToning: z.array(rowSchema),
  pipelineSheet: z.array(rowSchema),
  fractionalCO2: z.array(rowSchema),
  mnrfSheet: z.array(rowSchema),
  signature: z.string().nullable(),
  faceAnnotations: z.array(faceEntrySchema).optional(),
  botoxFiller: z.array(botoxEntrySchema).optional(),
  bodyLhr: z.array(z.object({
    id: z.string(),
    strokes: z.array(strokeSchema).default([]),
    date: z.string(),
    fluency: z.string(),
    therapist: z.string(),
    clientSign: z.string(),
  })).optional(),
  clinicalNotes: z.array(z.object({
    id: z.string(),
    text: z.string(),
    photos: z.array(z.string()),
    createdAt: z.string(),
  })).optional(),
});

export async function PUT(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return jsonError("Unauthorized", 401);

  const clinicId = session.user.clinicId ?? "drjo-skin-revive";
  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const parsed = therapySheetsSchema.safeParse(json);
  if (!parsed.success) {
    return jsonError("Invalid payload", 400, parsed.error.flatten());
  }

  const patient = await ensurePatient(clinicId, miosalonPatientId);
  const meta = { ...((patient.metadata as Record<string, unknown> | null) ?? {}) };
  meta.therapySheets = parsed.data;

  await db
    .update(patients)
    .set({ metadata: meta, updatedAt: new Date() })
    .where(eq(patients.id, patient.id));

  return jsonOk({ ok: true });
}
