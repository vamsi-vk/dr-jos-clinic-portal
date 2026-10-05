import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { branchSettings, clinics } from "@/db/schema";
import { isR2Configured, presignedGetUrl, publicObjectUrl } from "@/lib/r2";

const DEFAULT_CLINIC_NAME = "Dr. Jo's Skin Revive";

export async function ensureClinic(clinicId: string) {
  const [existing] = await db
    .select()
    .from(clinics)
    .where(eq(clinics.id, clinicId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(clinics)
    .values({
      id: clinicId,
      name: DEFAULT_CLINIC_NAME,
    })
    .returning();

  return created;
}

async function findBranchSettings(clinicId: string, branch: string) {
  const [row] = await db
    .select()
    .from(branchSettings)
    .where(and(eq(branchSettings.clinicId, clinicId), eq(branchSettings.branch, branch)))
    .limit(1);
  return row ?? null;
}

export async function ensureBranchSettings(clinicId: string, branch: string) {
  const existing = await findBranchSettings(clinicId, branch);
  if (existing) return existing;

  await db
    .insert(branchSettings)
    .values({ clinicId, branch, name: DEFAULT_CLINIC_NAME })
    .onConflictDoNothing();

  return (await findBranchSettings(clinicId, branch))!;
}

export async function resolveLogoUrl(logoKey: string | null, storedUrl: string | null) {
  if (!logoKey) return storedUrl;

  const publicUrl = publicObjectUrl(logoKey);
  if (publicUrl) return publicUrl;

  if (isR2Configured()) {
    try {
      return await presignedGetUrl(logoKey);
    } catch {
      return storedUrl;
    }
  }

  return storedUrl;
}

/**
 * Company profile for a branch. Branches that haven't saved a profile yet get the
 * default name and no logo. Without a branch (e.g. public forms for an unknown
 * customer) the clinic-wide profile is used.
 */
export async function getClinicSettings(clinicId: string, branch: string | null) {
  if (branch) {
    const row = await findBranchSettings(clinicId, branch);
    return {
      id: clinicId,
      branch,
      name: row?.name ?? DEFAULT_CLINIC_NAME,
      logoKey: row?.logoKey ?? null,
      logoUrl: row ? await resolveLogoUrl(row.logoKey, row.logoUrl) : null,
      updatedAt: row?.updatedAt ?? null,
    };
  }

  const clinic = await ensureClinic(clinicId);
  return {
    id: clinic.id,
    branch: null,
    name: clinic.name,
    logoKey: clinic.logoKey,
    logoUrl: await resolveLogoUrl(clinic.logoKey, clinic.logoUrl),
    updatedAt: clinic.updatedAt,
  };
}
