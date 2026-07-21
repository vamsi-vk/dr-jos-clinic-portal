"use client";

import Link from "next/link";
import { useState } from "react";

export type FormListItem = {
  id: string;
  name: string;
  active: boolean;
  fieldCount: number;
};

export function FormTemplateList({ templates }: { templates: FormListItem[] }) {
  const [items, setItems] = useState(templates);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function toggleActive(item: FormListItem) {
    const next = !item.active;
    setBusyId(item.id);

    try {
      const res = await fetch(`/api/form-templates/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ active: next }),
      });
      if (!res.ok) return;
      setItems((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, active: next } : t))
      );
    } catch {
      /* keep previous state */
    } finally {
      setBusyId(null);
    }
  }

  return (
    <ul className="mt-8 divide-y divide-stone-200 rounded-2xl border border-stone-200/80 bg-white shadow-sm">
      {items.map((t) => (
        <li
          key={t.id}
          className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 sm:flex-nowrap"
        >
          <div className="min-w-0 flex-1">
            <p className="font-medium text-stone-900">{t.name}</p>
            <p className="text-sm text-stone-500">
              {t.fieldCount} field{t.fieldCount === 1 ? "" : "s"} ·{" "}
              {t.active ? (
                <span className="font-medium text-teal-800">Active in extension</span>
              ) : (
                <span className="text-stone-400">Inactive</span>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={busyId === t.id}
              onClick={() => void toggleActive(t)}
              aria-busy={busyId === t.id}
              aria-label={
                busyId === t.id
                  ? t.active
                    ? "Deactivating"
                    : "Activating"
                  : t.active
                    ? "Deactivate"
                    : "Activate"
              }
              className={`inline-flex min-w-[7.25rem] items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-wait ${
                t.active
                  ? "border border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50 disabled:opacity-100"
                  : "bg-teal-800 text-white hover:bg-teal-900 disabled:opacity-100"
              }`}
            >
              {busyId === t.id ? (
                <span
                  className={`h-4 w-4 animate-spin rounded-full border-2 border-transparent ${
                    t.active ? "border-t-stone-600 border-l-stone-300" : "border-t-white border-l-white/40"
                  }`}
                  aria-hidden
                />
              ) : (
                (t.active ? "Deactivate" : "Activate")
              )}
            </button>
            <Link
              href={`/dashboard/forms/${t.id}`}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-teal-800 hover:bg-teal-50"
            >
              Edit
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
