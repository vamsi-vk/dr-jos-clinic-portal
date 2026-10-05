import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { jsonError } from "@/lib/api";
import { getAppSession } from "@/lib/session";

export type Patient = typeof patients.$inferSelect;

/** The slice of client data a staff member may see: their clinic + their branch. */
export type BranchScope = {
  clinicId: string;
  branch: string | null;
};

/** Branch is read from the DB on every request so reassignments apply without re-login. */
export async function loadUserBranch(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ branch: users.branch })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const branch = row?.branch?.trim();
  return branch ? branch : null;
}

/** Scope for server-rendered portal pages. */
export async function getPortalScope(): Promise<BranchScope | null> {
  const session = await getAppSession();
  if (!session?.user?.id) return null;
  return {
    clinicId: session.user.clinicId ?? "drjo-skin-revive",
    branch: await loadUserBranch(session.user.id),
  };
}

/** Staff without a branch match no clients. */
export function patientScopeWhere(scope: BranchScope): SQL {
  return and(
    eq(patients.clinicId, scope.clinicId),
    scope.branch ? eq(patients.branch, scope.branch) : sql`false`
  )!;
}

export async function findScopedPatient(
  scope: BranchScope,
  miosalonPatientId: string
): Promise<Patient | null> {
  if (!scope.branch) return null;
  const [patient] = await db
    .select()
    .from(patients)
    .where(and(patientScopeWhere(scope), eq(patients.miosalonPatientId, miosalonPatientId)))
    .orderBy(desc(patients.updatedAt))
    .limit(1);
  return patient ?? null;
}

/** Returns null only when the user has no branch, so nothing can be created for them. */
export async function ensureScopedPatient(
  scope: BranchScope,
  miosalonPatientId: string
): Promise<Patient | null> {
  if (!scope.branch) return null;
  const existing = await findScopedPatient(scope, miosalonPatientId);
  if (existing) return existing;
  const [created] = await db
    .insert(patients)
    .values({ miosalonPatientId, clinicId: scope.clinicId, branch: scope.branch })
    .returning();
  return created;
}

export function noBranchAssigned() {
  return jsonError("Your account has no branch assigned. Ask an admin to set one.", 403);
}
