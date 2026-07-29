"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  IconEdit,
  IconExternalLink,
  IconLink,
  IconMoreVertical,
  IconPower,
  IconTrash,
} from "@/components/ui/icons";
import { publicFormPath } from "@/lib/public-token";

export type FormListItem = {
  id: string;
  name: string;
  active: boolean;
  fieldCount: number;
  publicToken: string | null;
};

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50";

function RowMenu({
  item,
  busy,
  copied,
  onCopy,
  onToggle,
}: {
  item: FormListItem;
  busy: boolean;
  copied: boolean;
  onCopy: () => void;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label="More actions"
        aria-expanded={open}
        aria-haspopup="menu"
        disabled={busy}
        onClick={() => setOpen((v) => !v)}
        className={iconBtn}
      >
        <IconMoreVertical size={16} />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+4px)] z-20 min-w-[44px] overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            title={copied ? "Copied!" : "Copy link"}
            aria-label={copied ? "Copied!" : "Copy link"}
            className={`${iconBtn} w-full border-0`}
            onClick={() => {
              onCopy();
              setOpen(false);
            }}
          >
            <IconLink size={16} />
          </button>

          {item.publicToken ? (
            <Link
              href={publicFormPath(item.publicToken)}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              title="Preview"
              aria-label="Preview"
              className={`${iconBtn} border-0`}
              onClick={() => setOpen(false)}
            >
              <IconExternalLink size={16} />
            </Link>
          ) : (
            <span
              className={`${iconBtn} border-0 opacity-40`}
              title="Preview unavailable"
              aria-hidden
            >
              <IconExternalLink size={16} />
            </span>
          )}

          <button
            type="button"
            role="menuitem"
            title={item.active ? "Deactivate" : "Activate"}
            aria-label={item.active ? "Deactivate" : "Activate"}
            className={`${iconBtn} w-full border-0`}
            onClick={() => {
              onToggle();
              setOpen(false);
            }}
          >
            <IconPower size={16} className={item.active ? "text-accent" : ""} />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function FormTemplateList({ templates }: { templates: FormListItem[] }) {
  const [items, setItems] = useState(templates);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  async function deleteForm(item: FormListItem) {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setBusyId(item.id);

    try {
      const res = await fetch(`/api/form-templates/${item.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      setItems((prev) => prev.filter((t) => t.id !== item.id));
    } catch {
      /* keep previous state */
    } finally {
      setBusyId(null);
    }
  }

  async function copyPublicLink(item: FormListItem) {
    if (!item.publicToken) return;
    const url = `${window.location.origin}${publicFormPath(item.publicToken)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <Card>
      <ul className="divide-y divide-border">
        {items.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold tracking-tight text-foreground">{t.name}</p>
                <Badge tone={t.active ? "success" : "muted"}>
                  {t.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.fieldCount} field{t.fieldCount === 1 ? "" : "s"}
                {t.active ? " · Available in extension QR flow" : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href={`/dashboard/forms/${t.id}`}
                title="Edit"
                aria-label="Edit"
                className={iconBtn}
              >
                <IconEdit size={16} />
              </Link>
              <button
                type="button"
                title="Delete"
                aria-label="Delete"
                disabled={busyId === t.id}
                className={`${iconBtn} text-danger hover:bg-danger/5 hover:text-danger`}
                onClick={() => void deleteForm(t)}
              >
                <IconTrash size={16} />
              </button>
              <RowMenu
                item={t}
                busy={busyId === t.id}
                copied={copiedId === t.id}
                onCopy={() => void copyPublicLink(t)}
                onToggle={() => void toggleActive(t)}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
