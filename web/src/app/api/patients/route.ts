import { requireAuth, unauthorized } from "@/lib/extension-auth";
import { jsonOk } from "@/lib/api";
import { listPatientsForClinic } from "@/lib/patient-queries";

/** List extended patients for the signed-in clinic (portal + extension JWT) */
export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (!auth) return unauthorized();

  const patients = await listPatientsForClinic(auth.clinicId);
  return jsonOk({ patients, count: patients.length });
}
