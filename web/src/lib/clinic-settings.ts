import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clinics } from "@/db/schema";
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

export async function getClinicSettings(clinicId: string) {
  const clinic = await ensureClinic(clinicId);
  const logoUrl = await resolveLogoUrl(clinic.logoKey, clinic.logoUrl);

  return {
    id: clinic.id,
    name: clinic.name,
    logoKey: clinic.logoKey,
    logoUrl,
    updatedAt: clinic.updatedAt,
  };
}
