"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { IconArrowRight } from "@/components/ui/icons";

export type PatientRow = {
  id: string;
  miosalonPatientId: string;
  name: string;
  initials: string;
  fieldValueCount: number;
  updatedAt: string; // formatted
  updatedAtTs: number; // for sorting
  hasSheets: boolean;
};

type SortKey = "name" | "id" | "fields" | "updated";
type SortDir = "asc" | "desc";

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={`ml-1 inline-flex flex-col leading-[0] transition-opacity ${active ? "opacity-100" : "opacity-30"}`}>
      <span className={`text-[8px] ${active && dir === "asc" ? "text-indigo-600" : ""}`}>▲</span>
      <span className={`text-[8px] ${active && dir === "desc" ? "text-indigo-600" : ""}`}>▼</span>
    </span>
  );
}

export function PatientsTable({ patients }: { patients: PatientRow[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return patients.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.miosalonPatientId.toLowerCase().includes(q)
    );
  }, [patients, search]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else if (sortKey === "id") cmp = a.miosalonPatientId.localeCompare(b.miosalonPatientId);
      else if (sortKey === "fields") cmp = a.fieldValueCount - b.fieldValueCount;
      else if (sortKey === "updated") cmp = a.updatedAtTs - b.updatedAtTs;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function ThBtn({ label, col }: { label: string; col: SortKey }) {
    return (
      <button
        onClick={() => toggleSort(col)}
        className="flex items-center gap-0.5 uppercase tracking-[0.08em] text-[11px] font-semibold text-gray-500 hover:text-indigo-600 transition-colors"
      >
        {label}
        <SortIcon active={sortKey === col} dir={sortDir} />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">

      {/* Search bar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/60">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID…"
            className="w-full rounded-xl border-2 border-gray-200 bg-white pl-9 pr-4 py-2 text-sm font-medium text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-300"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          )}
        </div>
        <span className="text-xs text-gray-400 font-semibold shrink-0">
          {sorted.length} of {patients.length} records
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              <th className="px-5 py-3 sm:px-6"><ThBtn label="Customer" col="name" /></th>
              <th className="px-4 py-3"><ThBtn label="Customer ID" col="id" /></th>
              <th className="px-4 py-3"><ThBtn label="Last Updated" col="updated" /></th>
              <th className="px-5 py-3 sm:px-6" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-400">
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-3xl">🔍</span>
                    <p className="font-semibold">No results for &quot;{search}&quot;</p>
                    <button onClick={() => setSearch("")} className="text-xs text-indigo-500 hover:underline">Clear search</button>
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((p) => (
                <tr key={p.id} className="group hover:bg-indigo-50/40 transition-colors">
                  <td className="px-5 py-3.5 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm">
                        {p.initials || "?"}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-gray-800 truncate block">{p.name}</span>
                        {p.hasSheets && (
                          <span className="text-[10px] text-emerald-600 font-semibold">📋 Has therapy sheets</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-gray-500">{p.miosalonPatientId}</td>
                  <td className="px-4 py-3.5 text-xs text-gray-500">{p.updatedAt}</td>
                  <td className="px-5 py-3.5 text-right sm:px-6">
                    <Link
                      href={`/dashboard/patients/${encodeURIComponent(p.miosalonPatientId)}`}
                      className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 opacity-60 group-hover:opacity-100 hover:underline transition-all"
                    >
                      View
                      <IconArrowRight size={14} />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
