import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { branchSettings } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureBranchSettings, getClinicSettings } from "@/lib/clinic-settings";
import { requireAuth, unauthorized } from "@/lib/extension-auth";
import { noBranchAssigned } from "@/lib/patient-scope";

const updateSchema = z.object({
  name: z.string().min(1).max(120),
});

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const settings = await getClinicSettings(auth.clinicId, auth.branch);
  return jsonOk({ clinic: settings });
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();
  if (!auth.branch) return noBranchAssigned();

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

  await ensureBranchSettings(auth.clinicId, auth.branch);

  await db
    .update(branchSettings)
    .set({
      name: parsed.data.name.trim(),
      updatedAt: new Date(),
    })
    .where(
      and(eq(branchSettings.clinicId, auth.clinicId), eq(branchSettings.branch, auth.branch))
    );

  const settings = await getClinicSettings(auth.clinicId, auth.branch);
  return jsonOk({ clinic: settings });
}
