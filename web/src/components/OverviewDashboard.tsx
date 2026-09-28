"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonthBucket = { label: string; newClients: number; active: number };

export type SheetStats = {
  therapySheet: number;
  laserToning: number;
  pipelineSheet: number;
  fractionalCO2: number;
  mnrfSheet: number;
  faceAnnotations: number;
  botoxFiller: number;
  bodyLhr: number;
};

export type RecentPatient = {
  id: string;
  name: string;
  initials: string;
  updatedAt: string;
  hasSheets: boolean;
};

export type DashboardData = {
  totalClients: number;
  newThisMonth: number;
  activeThisMonth: number;
  totalSessions: number;
  sheetStats: SheetStats;
  monthlyBuckets: MonthBucket[];
  recentPatients: RecentPatient[];
  greetingName: string;
};

// ─── Bar chart ────────────────────────────────────────────────────────────────

function BarChart({ buckets }: { buckets: MonthBucket[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const maxVal = Math.max(...buckets.map((b) => b.newClients), 1);

  return (
    <div className="flex items-end gap-2 h-36 w-full">
      {buckets.map((b, i) => {
        const pct = (b.newClients / maxVal) * 100;
        const isHov = hovered === i;
        return (
          <div
            key={i}
            className="flex flex-col items-center gap-1 flex-1 cursor-pointer group"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {isHov && (
              <div className="rounded-lg bg-gray-800 text-white text-[10px] font-bold px-2 py-1 whitespace-nowrap shadow-lg">
                {b.newClients} new
              </div>
            )}
            <div className="w-full rounded-t-lg transition-all duration-200 relative overflow-hidden"
              style={{ height: `${Math.max(pct, 4)}%`, background: isHov ? "#6d28d9" : "linear-gradient(180deg,#8b5cf6,#a78bfa)" }}
            />
            <span className="text-[10px] text-gray-400 font-medium">{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
  emoji,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  emoji: string;
}) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-lg ${color} flex flex-col gap-1`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest opacity-80">{label}</span>
        <span className="text-2xl">{emoji}</span>
      </div>
      <p className="text-4xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="text-xs opacity-75 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Sheet stat row ───────────────────────────────────────────────────────────

const SHEET_META = [
  { key: "therapySheet", label: "Therapy Sheet", emoji: "💊", color: "bg-indigo-100 text-indigo-700" },
  { key: "laserToning", label: "Laser Toning", emoji: "✨", color: "bg-violet-100 text-violet-700" },
  { key: "pipelineSheet", label: "Pipeline Sheet", emoji: "🧪", color: "bg-sky-100 text-sky-700" },
  { key: "fractionalCO2", label: "Fractional CO2", emoji: "⚡", color: "bg-teal-100 text-teal-700" },
  { key: "mnrfSheet", label: "MNRF Sheet", emoji: "🔬", color: "bg-blue-100 text-blue-700" },
  { key: "faceAnnotations", label: "Face LHR Diagrams", emoji: "🧬", color: "bg-purple-100 text-purple-700" },
  { key: "botoxFiller", label: "Botox / Filler", emoji: "💉", color: "bg-rose-100 text-rose-700" },
  { key: "bodyLhr", label: "Body LHR Diagrams", emoji: "🧍", color: "bg-emerald-100 text-emerald-700" },
] as const;

// ─── Main dashboard ───────────────────────────────────────────────────────────

export function OverviewDashboard({ data }: { data: DashboardData }) {
  const now = new Date();
  const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="w-full space-y-6 pb-10">

      {/* Greeting */}
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-7 py-6 shadow-xl">
        <p className="text-xs font-bold uppercase tracking-widest text-white/60">Dr. Jo&apos;s Clinic Portal</p>
        <h1 className="mt-1 text-2xl font-extrabold text-white">Welcome back, {data.greetingName} 👋</h1>
        <p className="mt-1 text-sm text-white/70">{monthName} — Here&apos;s your clinic at a glance</p>
      </div>

      {/* Top stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Clients" value={data.totalClients} sub="All time" emoji="👥" color="bg-gradient-to-br from-indigo-500 to-violet-600" />
        <StatCard label="New This Month" value={data.newThisMonth} sub="Added in current month" emoji="🆕" color="bg-gradient-to-br from-emerald-500 to-teal-600" />
        <StatCard label="Active This Month" value={data.activeThisMonth} sub="Records updated" emoji="📋" color="bg-gradient-to-br from-sky-500 to-blue-600" />
        <StatCard label="Total Sessions" value={data.totalSessions} sub="Across all therapy sheets" emoji="💊" color="bg-gradient-to-br from-rose-500 to-pink-600" />
      </div>

      {/* Chart + Sheet breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Monthly new clients chart */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-md p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800">New Clients per Month</p>
              <p className="text-xs text-gray-400">Last 6 months</p>
            </div>
            <span className="text-2xl">📈</span>
          </div>
          <BarChart buckets={data.monthlyBuckets} />
        </div>

        {/* Sheet & diagram breakdown */}
        <div className="rounded-2xl border border-gray-100 bg-white shadow-md p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800">Records by Sheet Type</p>
              <p className="text-xs text-gray-400">Sessions & diagrams with data</p>
            </div>
            <span className="text-2xl">📊</span>
          </div>
          <div className="space-y-2">
            {SHEET_META.map(({ key, label, emoji, color }) => {
              const count = data.sheetStats[key];
              const maxCount = Math.max(...Object.values(data.sheetStats), 1);
              const pct = Math.round((count / maxCount) * 100);
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-6 text-center text-base leading-none">{emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold text-gray-600 truncate">{label}</span>
                      <span className={`text-xs font-bold rounded-full px-2 py-0.5 ${color}`}>{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full bg-current transition-all duration-500" style={{ width: `${pct}%`, color: color.includes("indigo") ? "#6366f1" : color.includes("violet") ? "#7c3aed" : color.includes("sky") ? "#0ea5e9" : color.includes("teal") ? "#14b8a6" : color.includes("blue") ? "#3b82f6" : color.includes("purple") ? "#9333ea" : color.includes("rose") ? "#f43f5e" : "#10b981" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-md p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-gray-800">Recent Activity</p>
            <p className="text-xs text-gray-400">Latest updated patient records</p>
          </div>
          <Link href="/dashboard/patients" className="rounded-xl bg-indigo-50 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 transition-colors">
            View all →
          </Link>
        </div>
        {data.recentPatients.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-gray-300">
            <span className="text-4xl">🏥</span>
            <p className="text-sm font-semibold text-gray-400">No patients yet</p>
            <p className="text-xs text-gray-300">Patients appear here when records are opened</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {data.recentPatients.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/patients/${encodeURIComponent(p.id)}`}
                  className="flex items-center justify-between gap-4 py-3 -mx-2 px-2 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow">
                      {p.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 font-mono truncate">{p.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.hasSheets && (
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                        📋 Sheets
                      </span>
                    )}
                    <span className="text-xs text-gray-400">{p.updatedAt}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
