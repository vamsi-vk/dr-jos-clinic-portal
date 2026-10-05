import { getAppSession } from "@/lib/session";
import { listPatientsForScope } from "@/lib/patient-queries";
import { getPortalScope } from "@/lib/patient-scope";
import { profileFromMetadata } from "@/lib/miosalon-profile";
import { OverviewDashboard, type DashboardData, type MonthBucket, type SheetStats } from "@/components/OverviewDashboard";

function formatRelative(d: Date) {
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function countSheetRows(rows: unknown[]): number {
  if (!Array.isArray(rows)) return 0;
  return rows.filter((r) => {
    if (!r || typeof r !== "object") return false;
    return Object.entries(r as Record<string, string>).some(
      ([k, v]) => k !== "sno" && k !== "date" && v && String(v).trim() !== ""
    );
  }).length;
}

function countAnnotations(items: unknown[]): number {
  if (!Array.isArray(items)) return 0;
  return items.filter((e) => {
    if (!e || typeof e !== "object") return false;
    const entry = e as Record<string, unknown>;
    const hasStrokes = Array.isArray(entry.strokes) && entry.strokes.length > 0;
    const hasSign = typeof entry.clientSign === "string" && entry.clientSign.startsWith("data:image/");
    const hasFields = ["fluency", "therapist", "areas", "quantity", "therapistName"].some(
      (k) => typeof entry[k] === "string" && (entry[k] as string).trim() !== ""
    );
    return hasStrokes || hasSign || hasFields;
  }).length;
}

export default async function DashboardPage() {
  const session = await getAppSession();
  const scope = await getPortalScope();
  const patients = scope ? await listPatientsForScope(scope) : [];

  const greetingName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "there";

  const now = new Date();
  const monthStart = startOfMonth(now);

  // ── Key metrics ──────────────────────────────────────────────────────────────
  const totalClients = patients.length;
  const newThisMonth = patients.filter((p) => new Date(p.createdAt) >= monthStart).length;
  const activeThisMonth = patients.filter((p) => new Date(p.updatedAt) >= monthStart).length;

  // ── Sheet metrics ─────────────────────────────────────────────────────────────
  const sheetStats: SheetStats = {
    therapySheet: 0,
    laserToning: 0,
    pipelineSheet: 0,
    fractionalCO2: 0,
    mnrfSheet: 0,
    faceAnnotations: 0,
    botoxFiller: 0,
    bodyLhr: 0,
  };

  let totalSessions = 0;

  for (const p of patients) {
    const meta = (p.metadata as Record<string, unknown> | null) ?? {};
    const ts = (meta.therapySheets as Record<string, unknown>) ?? {};

    const tsCount = countSheetRows(ts.therapySheet as unknown[]);
    const ltCount = countSheetRows(ts.laserToning as unknown[]);
    const psCount = countSheetRows(ts.pipelineSheet as unknown[]);
    const fcCount = countSheetRows(ts.fractionalCO2 as unknown[]);
    const mnCount = countSheetRows(ts.mnrfSheet as unknown[]);
    const faCount = countAnnotations(ts.faceAnnotations as unknown[]);
    const bfCount = countAnnotations(ts.botoxFiller as unknown[]);
    const blCount = countAnnotations(ts.bodyLhr as unknown[]);

    sheetStats.therapySheet += tsCount;
    sheetStats.laserToning += ltCount;
    sheetStats.pipelineSheet += psCount;
    sheetStats.fractionalCO2 += fcCount;
    sheetStats.mnrfSheet += mnCount;
    sheetStats.faceAnnotations += faCount;
    sheetStats.botoxFiller += bfCount;
    sheetStats.bodyLhr += blCount;

    totalSessions += tsCount + ltCount + psCount + fcCount + mnCount;
  }

  // ── Monthly buckets (last 6 months) ──────────────────────────────────────────
  const monthlyBuckets: MonthBucket[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    const label = d.toLocaleString("en-IN", { month: "short" });

    const newClients = patients.filter((p) => {
      const c = new Date(p.createdAt);
      return c >= d && c < end;
    }).length;

    const active = patients.filter((p) => {
      const u = new Date(p.updatedAt);
      return u >= d && u < end;
    }).length;

    monthlyBuckets.push({ label, newClients, active });
  }

  // ── Recent patients ──────────────────────────────────────────────────────────
  const recentPatients = patients.slice(0, 8).map((p) => {
    const profile = profileFromMetadata(p.metadata);
    const name = profile?.name ?? "Unnamed Patient";
    const initials = name
      .split(" ")
      .slice(0, 2)
      .map((n: string) => n[0]?.toUpperCase() ?? "")
      .join("");
    const meta = (p.metadata as Record<string, unknown> | null) ?? {};
    const hasSheets = !!(meta.therapySheets);
    return {
      id: p.miosalonPatientId,
      name,
      initials,
      updatedAt: formatRelative(new Date(p.updatedAt)),
      hasSheets,
    };
  });

  const dashboardData: DashboardData = {
    totalClients,
    newThisMonth,
    activeThisMonth,
    totalSessions,
    sheetStats,
    monthlyBuckets,
    recentPatients,
    greetingName,
  };

  return (
    <div className="w-full">
      <OverviewDashboard data={dashboardData} />
    </div>
  );
}
