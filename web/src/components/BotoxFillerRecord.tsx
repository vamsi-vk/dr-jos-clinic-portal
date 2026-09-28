"use client";

import { useState } from "react";
import { SignaturePad } from "@/components/signature-pad";
import { type Stroke, StrokeOverlay, DrawCanvas } from "@/components/FaceAnnotation";
import { useConfirm } from "@/components/ConfirmProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BotoxEntry = {
  id: string;
  strokes: Stroke[];
  idNo: string;
  date: string;
  treatment: string;
  areas: string;
  quantity: string;
  therapistName: string;
  clientSign: string;
  doctorSign: string;
};

function todayStr() {
  return "";
}

export function newBotoxEntry(): BotoxEntry {
  return {
    id: crypto.randomUUID(),
    strokes: [],
    idNo: "",
    date: todayStr(),
    treatment: "BOTOX / FILLER",
    areas: "",
    quantity: "",
    therapistName: "",
    clientSign: "",
    doctorSign: "",
  };
}

// ─── Signature modal ──────────────────────────────────────────────────────────

function SignatureModal({ label, onSave, onClose }: { label: string; onSave: (sig: string | null) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <p className="text-sm font-bold text-gray-800">✍️ {label}</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="p-5"><SignaturePad value={draft} onChange={setDraft} /></div>
        <div className="flex justify-end gap-2 border-t px-5 py-3 bg-gray-50">
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSave(draft)} className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-700">Save</button>
        </div>
      </div>
    </div>
  );
}

function SignField({
  label,
  value,
  onSign,
}: {
  label: string;
  value: string;
  onSign: (sig: string | null) => void;
}) {
  const [showSig, setShowSig] = useState(false);
  return (
    <div>
      <label className="text-[10px] font-bold uppercase tracking-widest text-rose-400">{label}</label>
      <div className="mt-1">
        {value?.startsWith("data:image/") ? (
          <div className="relative rounded-xl border-2 border-green-200 bg-white overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt={label} className="w-full h-14 object-contain px-2 py-1" />
            <div className="absolute top-1 right-1 rounded-full bg-green-500 w-5 h-5 flex items-center justify-center text-white text-[9px] font-bold">✓</div>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowSig(true)}
              className="w-full rounded-xl border-2 border-dashed border-rose-200 bg-rose-50 px-3 py-3 text-xs font-bold text-rose-400 hover:bg-rose-100 hover:border-rose-400 transition-colors flex items-center justify-center gap-1.5"
            >
              <span>✍️</span> Tap to sign
            </button>
            {showSig && (
              <SignatureModal label={label} onSave={(s) => { onSign(s); setShowSig(false); }} onClose={() => setShowSig(false)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Entry dialog ─────────────────────────────────────────────────────────────

function BotoxEntryDialog({
  entry,
  index,
  onSave,
  onDelete,
  onClose,
}: {
  entry: BotoxEntry;
  index: number;
  onSave: (e: BotoxEntry) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<BotoxEntry>({ ...entry, strokes: entry.strokes ?? [] });

  function field<K extends keyof BotoxEntry>(key: K) {
    return (val: BotoxEntry[K]) => setDraft((d) => ({ ...d, [key]: val }));
  }

  const inputCls = "mt-1 w-full rounded-xl border-2 border-rose-100 bg-rose-50 px-3 py-2.5 text-sm font-medium text-rose-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all placeholder:text-rose-300";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 flex flex-col w-full max-w-3xl max-h-[92vh] rounded-2xl bg-white shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-rose-600 to-orange-500 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💉</span>
            <div>
              <p className="text-base font-bold text-white">Botox / Filler #{index + 1}</p>
              <p className="text-xs text-white/70">Botox / Filler Procedure Record Sheet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onDelete} className="rounded-xl bg-white/20 hover:bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors">🗑 Delete</button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white text-lg font-bold">×</button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col sm:flex-row gap-5 p-5 overflow-y-auto flex-1">
          {/* Left: face canvas */}
          <div className="flex-1 min-w-0">
            <DrawCanvas strokes={draft.strokes} onStrokesChange={field("strokes")} />
          </div>

          {/* Right: fields */}
          <div className="w-full sm:w-64 shrink-0 flex flex-col gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Date</label>
              <input type="date" value={draft.date} onChange={(e) => field("date")(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Treatment</label>
              <input value={draft.treatment} onChange={(e) => field("treatment")(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Areas</label>
              <input value={draft.areas} onChange={(e) => field("areas")(e.target.value)} placeholder="Treatment areas" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Quantity</label>
              <input value={draft.quantity} onChange={(e) => field("quantity")(e.target.value)} placeholder="e.g. 20 units" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-rose-400">Name of Therapist</label>
              <input value={draft.therapistName} onChange={(e) => field("therapistName")(e.target.value)} placeholder="Therapist name" className={inputCls} />
            </div>
            <SignField label="Client Signature" value={draft.clientSign} onSign={(s) => field("clientSign")(s ?? "")} />
            <SignField label="Doctor Signature" value={draft.doctorSign} onSign={(s) => field("doctorSign")(s ?? "")} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4 shrink-0">
          <button onClick={onClose} className="rounded-xl border-2 border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
          <button onClick={() => { onSave(draft); onClose(); }} className="rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-6 py-2 text-sm font-bold text-white hover:from-rose-700 hover:to-orange-600 shadow-md transition-all hover:shadow-lg">
            💾 Save
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function BotoxThumbnail({ entry, index, onClick }: { entry: BotoxEntry; index: number; onClick: () => void }) {
  const hasStrokes = (entry.strokes ?? []).length > 0;
  const hasSig = entry.clientSign?.startsWith("data:image/");

  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-2xl border-2 border-rose-100 bg-white hover:border-rose-400 hover:shadow-lg transition-all overflow-hidden text-left"
    >
      <div className="relative w-full bg-gray-50" style={{ aspectRatio: "280/350" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/face-diagram.png" alt="Face" className="absolute inset-0 w-full h-full object-contain p-1 pointer-events-none" draggable={false} />
        <StrokeOverlay strokes={entry.strokes ?? []} />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-rose-600/10 transition-all">
          <span className="rounded-full bg-white shadow-lg px-3 py-1 text-xs font-bold text-rose-700">✏️ Edit</span>
        </div>
      </div>
      <div className="bg-rose-50 border-t border-rose-100 px-3 py-2.5 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wide">#{index + 1}</span>
          {hasSig && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-600">✓ Signed</span>}
          {hasStrokes && !hasSig && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-500">✏ Drawn</span>}
          {!hasStrokes && !hasSig && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-400">Empty</span>}
        </div>
        {entry.date && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-rose-400 uppercase">Date</span>
            <span className="text-[11px] font-semibold text-gray-700">{entry.date}</span>
          </div>
        )}
        {entry.treatment && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-rose-400 uppercase">Treatment</span>
            <span className="text-[11px] font-semibold text-gray-700 truncate">{entry.treatment}</span>
          </div>
        )}
        {entry.areas && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-rose-400 uppercase">Areas</span>
            <span className="text-[11px] font-semibold text-gray-700 truncate">{entry.areas}</span>
          </div>
        )}
        {entry.therapistName && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-rose-400 uppercase">Therapist</span>
            <span className="text-[11px] font-semibold text-gray-700 truncate">{entry.therapistName}</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function BotoxFillerSection({
  entries: rawEntries,
  onChange,
}: {
  entries: BotoxEntry[];
  onChange: (entries: BotoxEntry[]) => void;
}) {
  const entries = rawEntries.map((e) => ({ ...e, strokes: e.strokes ?? [] }));
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const confirm = useConfirm();

  function updateEntry(idx: number, updated: BotoxEntry) {
    onChange(entries.map((e, i) => (i === idx ? updated : e)));
  }

  async function removeEntry(idx: number) {
    const ok = await confirm({ message: `Delete Botox / Filler record #${idx + 1}? This cannot be undone.` });
    if (!ok) return;
    const next = entries.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? next : [newBotoxEntry()]);
    setOpenIdx(null);
  }

  function addEntry() {
    const next = [...entries, newBotoxEntry()];
    onChange(next);
    setOpenIdx(next.length - 1);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div>
          <p className="text-xl font-extrabold tracking-wide text-gray-800 uppercase underline underline-offset-4 decoration-rose-400">Botox / Filler Procedure Record Sheet</p>
        </div>
        <button
          onClick={addEntry}
          className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-400 transition-colors"
        >
          <span className="text-base leading-none">+</span> Add Record
        </button>
      </div>

      {/* Thumbnail grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {entries.map((entry, idx) => (
          <BotoxThumbnail key={entry.id} entry={entry} index={idx} onClick={() => setOpenIdx(idx)} />
        ))}
      </div>

      {/* Dialog */}
      {openIdx !== null && openIdx < entries.length && (
        <BotoxEntryDialog
          key={entries[openIdx].id}
          entry={entries[openIdx]}
          index={openIdx}
          onSave={(updated) => updateEntry(openIdx, updated)}
          onDelete={() => removeEntry(openIdx)}
          onClose={() => setOpenIdx(null)}
        />
      )}
    </div>
  );
}
