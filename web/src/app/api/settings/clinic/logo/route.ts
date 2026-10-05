import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { branchSettings } from "@/db/schema";
import { jsonError, jsonOk } from "@/lib/api";
import { ensureBranchSettings, ensureClinic, getClinicSettings } from "@/lib/clinic-settings";
import { requireAuth, unauthorized } from "@/lib/extension-auth";
import { noBranchAssigned } from "@/lib/patient-scope";
import {
  branchLogoKey,
  deleteFromR2,
  isR2Configured,
  uploadToR2,
} from "@/lib/r2";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();
  if (!auth.branch) return noBranchAssigned();

  if (!isR2Configured()) {
    return jsonError("File storage is not configured", 503);
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }

  const file = form.get("logo");
  if (!(file instanceof File)) {
    return jsonError("Missing logo file", 400);
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError("Logo must be JPEG, PNG, WebP, or SVG", 400);
  }

  if (file.size > MAX_BYTES) {
    return jsonError("Logo must be 2 MB or smaller", 400);
  }

  const branch = auth.branch;
  const ext = EXT_BY_TYPE[file.type] ?? "png";
  const key = branchLogoKey(auth.clinicId, branch, ext);
  const buffer = Buffer.from(await file.arrayBuffer());

  const current = await ensureBranchSettings(auth.clinicId, branch);
  const clinic = await ensureClinic(auth.clinicId);
  if (current.logoKey && current.logoKey !== key && current.logoKey !== clinic.logoKey) {
    try {
      await deleteFromR2(current.logoKey);
    } catch {
      /* old object may already be gone */
    }
  }

  const publicUrl = await uploadToR2(key, buffer, file.type);

  await db
    .update(branchSettings)
    .set({
      logoKey: key,
      logoUrl: publicUrl,
      updatedAt: new Date(),
    })
    .where(and(eq(branchSettings.clinicId, auth.clinicId), eq(branchSettings.branch, branch)));

  const settings = await getClinicSettings(auth.clinicId, branch);
  return jsonOk({ clinic: settings });
}

export async function DELETE(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();
  if (!auth.branch) return noBranchAssigned();

  const branch = auth.branch;
  const current = await ensureBranchSettings(auth.clinicId, branch);

  // A branch may still point at the clinic-wide logo object, which public forms also use.
  const clinic = await ensureClinic(auth.clinicId);
  if (current.logoKey && current.logoKey !== clinic.logoKey && isR2Configured()) {
    try {
      await deleteFromR2(current.logoKey);
    } catch {
      /* ignore */
    }
  }

  await db
    .update(branchSettings)
    .set({
      logoKey: null,
      logoUrl: null,
      updatedAt: new Date(),
    })
    .where(and(eq(branchSettings.clinicId, auth.clinicId), eq(branchSettings.branch, branch)));

  const settings = await getClinicSettings(auth.clinicId, branch);
  return jsonOk({ clinic: settings });
}
