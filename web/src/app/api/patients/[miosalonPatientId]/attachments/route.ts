import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { jsonError, jsonOk } from "@/lib/api";
import { requireAuth, unauthorized } from "@/lib/extension-auth";
import {
  ensureScopedPatient,
  findScopedPatient,
  noBranchAssigned,
  type BranchScope,
} from "@/lib/patient-scope";
import { deleteFromR2, isR2Configured, presignedGetUrl, uploadToR2 } from "@/lib/r2";

type Params = { params: { miosalonPatientId: string } };

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

const MAX_BYTES = 10 * 1024 * 1024;

function keyPrefix(clinicId: string, patientId: string) {
  return `clinics/${clinicId}/patients/${patientId}/attachments/`;
}

/** Returns the key only if it belongs to this customer in the caller's branch. */
async function authorisedKey(req: Request, auth: BranchScope, miosalonPatientId: string) {
  const key = new URL(req.url).searchParams.get("key")?.trim();
  if (!key) return null;
  const patient = await findScopedPatient(auth, miosalonPatientId);
  if (!patient) return null;
  return key.startsWith(keyPrefix(auth.clinicId, patient.id)) ? key : null;
}

export async function POST(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();
  if (!auth.branch) return noBranchAssigned();
  if (!isR2Configured()) return jsonError("File storage is not configured", 503);

  const miosalonPatientId = decodeURIComponent(params.miosalonPatientId);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonError("Invalid form data", 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Missing file", 400);
  if (!file.type.startsWith("image/")) return jsonError("Only images can be attached", 400);
  if (file.size > MAX_BYTES) return jsonError("Images must be 10 MB or smaller", 400);

  const patient = await ensureScopedPatient(auth, miosalonPatientId);
  if (!patient) return noBranchAssigned();

  const id = randomUUID();
  const ext = EXT_BY_TYPE[file.type] ?? "jpg";
  const key = `${keyPrefix(auth.clinicId, patient.id)}${id}.${ext}`;

  await uploadToR2(key, Buffer.from(await file.arrayBuffer()), file.type);

  return jsonOk({
    attachment: {
      id,
      key,
      name: file.name || `photo-${id.slice(0, 8)}.${ext}`,
      contentType: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
    },
  });
}

/** Streams access to an attachment via a short-lived signed URL. */
export async function GET(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const key = await authorisedKey(req, auth, decodeURIComponent(params.miosalonPatientId));
  if (!key) return jsonError("Attachment not found", 404);

  const url = await presignedGetUrl(key, 600);
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "private, max-age=300" },
  });
}

export async function DELETE(req: Request, { params }: Params) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const key = await authorisedKey(req, auth, decodeURIComponent(params.miosalonPatientId));
  if (!key) return jsonError("Attachment not found", 404);

  try {
    await deleteFromR2(key);
  } catch {
    /* already gone */
  }
  return jsonOk({ ok: true });
}
