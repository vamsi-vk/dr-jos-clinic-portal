import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { db } from "@/db";
import { patients } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAuth, unauthorized } from "@/lib/extension-auth";

type Params = { params: { miosalonPatientId: string } };

type StoredWhiteboard = {
  id: string;
  imageData: string;
  networkId: string;
  storeId: string;
  activeUserId: string;
  staffId: string | null;
  createdAt: string;
  updatedAt: string;
};

function readWhiteboards(metadata: Record<string, unknown> | null | undefined) {
  const raw = metadata?.whiteboards;
  if (!Array.isArray(raw)) return [] as StoredWhiteboard[];
  return raw.filter(
    (item): item is StoredWhiteboard =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as StoredWhiteboard).id === "string" &&
      typeof (item as StoredWhiteboard).imageData === "string"
  );
}

async function resolveCustomer(clinicId: string, customerId: string) {
  const [customer] = await db
    .select()
    .from(patients)
    .where(
      and(
        eq(patients.miosalonPatientId, customerId),
        eq(patients.clinicId, clinicId)
      )
    )
    .limit(1);
  return customer ?? null;
}

async function ensureCustomer(clinicId: string, customerId: string) {
  const existing = await resolveCustomer(clinicId, customerId);
  if (existing) return existing;

  const [created] = await db
    .insert(patients)
    .values({ miosalonPatientId: customerId, clinicId })
    .returning();
  return created;
}

export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const customerId = decodeURIComponent(params.miosalonPatientId);
  const search = new URL(req.url).searchParams;
  const networkId = search.get("networkId")?.trim();
  const storeId = search.get("storeId")?.trim();
  if (!networkId || !storeId) {
    return jsonError("networkId and storeId are required", 400);
  }

  const customer = await resolveCustomer(auth.clinicId, customerId);
  if (!customer) return jsonOk({ whiteboards: [] });

  const whiteboards = readWhiteboards(
    customer.metadata as Record<string, unknown> | null
  )
    .filter((wb) => wb.networkId === networkId && wb.storeId === storeId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  return jsonOk({ whiteboards });
}

const createSchema = z.object({
  imageData: z
    .string()
    .min(1)
    .refine(
      (v) => v.startsWith("data:image/"),
      "imageData must be a data URL"
    ),
  networkId: z.string().min(1),
  storeId: z.string().min(1),
  activeUserId: z.string().min(1),
});

export async function POST(req: Request, { params }: Params) {
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

  if (parsed.data.imageData.length > 4_500_000) {
    return jsonError("Whiteboard image is too large", 413);
  }

  const customerId = decodeURIComponent(params.miosalonPatientId);
  const customer = await ensureCustomer(auth.clinicId, customerId);
  const now = new Date().toISOString();
  const whiteboard: StoredWhiteboard = {
    id: randomUUID(),
    imageData: parsed.data.imageData,
    networkId: parsed.data.networkId,
    storeId: parsed.data.storeId,
    activeUserId: parsed.data.activeUserId,
    staffId: auth.id,
    createdAt: now,
    updatedAt: now,
  };

  const meta = {
    ...((customer.metadata as Record<string, unknown> | null) ?? {}),
  };
  const existing = readWhiteboards(meta);
  meta.whiteboards = [whiteboard, ...existing];

  await db
    .update(patients)
    .set({
      metadata: meta,
      updatedAt: new Date(),
    })
    .where(eq(patients.id, customer.id));

  return jsonOk({ whiteboard }, 201);
}
