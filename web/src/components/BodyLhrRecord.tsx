"use client";

import { useState, useRef } from "react";
import { SignaturePad } from "@/components/signature-pad";
import { type Stroke, StrokeOverlay } from "@/components/FaceAnnotation";
import { useConfirm } from "@/components/ConfirmProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

export type BodyEntry = {
  id: string;
  strokes: Stroke[];
  date: string;
  fluency: string;
  therapist: string;
  clientSign: string;
};

function todayStr() {
  return "";
}

export function newBodyEntry(): BodyEntry {
  return { id: crypto.randomUUID(), strokes: [], date: todayStr(), fluency: "", therapist: "", clientSign: "" };
}

// ─── Body draw canvas (wider aspect ratio for front+back) ─────────────────────

const PEN_COLORS = ["#e53e3e", "#2563eb", "#059669", "#d97706", "#7c3aed", "#000000"];

function BodyDrawCanvas({
  strokes,
  onStrokesChange,
}: {
  strokes: Stroke[];
  onStrokesChange: (s: Stroke[]) => void;
}) {
  const [divRef, setDivRef] = useState<HTMLDivElement | null>(null);
  const [penColor, setPenColor] = useState("#e53e3e");
  const [penSize, setPenSize] = useState(3);
  const currentStroke = useRef<number[][]>([]);
  const drawing = useRef(false);

  function getNorm(e: React.PointerEvent): [number, number] {
    if (!divRef) return [0, 0];
    const r = divRef.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  function onDown(e: React.PointerEvent) {
    drawing.current = true;
    divRef?.setPointerCapture(e.pointerId);
    currentStroke.current = [getNorm(e)];
  }

  function onMove(e: React.PointerEvent) {
    if (!drawing.current) return;
    currentStroke.current = [...currentStroke.current, getNorm(e)];
    onStrokesChange([...strokes, { color: penColor, size: penSize, pts: currentStroke.current }]);
  }

  function onUp(e: React.PointerEvent) {
    if (!drawing.current) return;
    drawing.current = false;
    divRef?.releasePointerCapture(e.pointerId);
    if (currentStroke.current.length > 1) {
      onStrokesChange([...strokes, { color: penColor, size: penSize, pts: currentStroke.current }]);
    }
    currentStroke.current = [];
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-100">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Pen</span>
        <div className="flex gap-1.5">
          {PEN_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setPenColor(c)}
              className={`w-7 h-7 rounded-full border-[3px] transition-all ${penColor === c ? "border-gray-800 scale-110 shadow-md" : "border-transparent hover:scale-105"}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <div className="w-px h-5 bg-gray-200" />
        <div className="flex gap-1.5">
          {[{ s: 2, label: "S" }, { s: 4, label: "M" }, { s: 7, label: "L" }].map(({ s, label }) => (
            <button
              key={s}
              onClick={() => setPenSize(s)}
              className={`w-8 h-8 rounded-lg text-xs font-bold border-2 transition-all ${penSize === s ? "border-gray-700 bg-white shadow" : "border-gray-200 text-gray-400 hover:border-gray-400"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {strokes.length > 0 && (
          <>
            <button onClick={() => onStrokesChange(strokes.slice(0, -1))} className="ml-auto flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-100 transition-colors">↩ Undo</button>
            <button onClick={() => onStrokesChange([])} className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100 transition-colors">🗑 Clear</button>
          </>
        )}
      </div>

      {/* Body image + overlay */}
      <div
        ref={setDivRef}
        className="relative rounded-2xl border-2 border-gray-200 bg-white overflow-hidden select-none shadow-inner cursor-crosshair touch-none"
        style={{ aspectRatio: "560/370" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/body-diagram.png" alt="Body diagram" className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
        <StrokeOverlay strokes={strokes} />
        {strokes.length === 0 && (
          <div className="absolute bottom-3 inset-x-0 text-center text-xs text-gray-300 pointer-events-none select-none">
            ✏️ Draw on the body diagram
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Signature modal ──────────────────────────────────────────────────────────

function SignatureModal({ onSave, onClose }: { onSave: (sig: string | null) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <p className="text-sm font-bold text-gray-800">✍️ Client Signature</p>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="p-5"><SignaturePad value={draft} onChange={setDraft} /></div>
        <div className="flex justify-end gap-2 border-t px-5 py-3 bg-gray-50">
          <button onClick={onClose} className="rounded-xl border px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSave(draft)} className="rounded-xl bg-teal-600 px-5 py-2 text-sm font-bold text-white hover:bg-teal-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Entry dialog ─────────────────────────────────────────────────────────────

function BodyEntryDialog({
  entry,
  index,
  onSave,
  onDelete,
  onClose,
}: {
  entry: BodyEntry;
  index: number;
  onSave: (e: BodyEntry) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<BodyEntry>({ ...entry, strokes: entry.strokes ?? [] });
  const [showSig, setShowSig] = useState(false);

  function field<K extends keyof BodyEntry>(key: K) {
    return (val: BodyEntry[K]) => setDraft((d) => ({ ...d, [key]: val }));
  }

  const inputCls = "mt-1 w-full rounded-xl border-2 border-teal-100 bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all placeholder:text-teal-300";

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 flex flex-col w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-teal-600 to-emerald-500 px-6 py-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧍</span>
              <div>
                <p className="text-base font-bold text-white">Body LHR Record #{index + 1}</p>
                <p className="text-xs text-white/70">Body LHR Record Sheet</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onDelete} className="rounded-xl bg-white/20 hover:bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors">🗑 Delete</button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white text-lg font-bold">×</button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col lg:flex-row gap-5 p-5 overflow-y-auto flex-1">
            {/* Left: body canvas (wide) */}
            <div className="flex-1 min-w-0">
              <BodyDrawCanvas
                strokes={draft.strokes}
                onStrokesChange={field("strokes")}
              />
            </div>

            {/* Right: fields */}
            <div className="w-full lg:w-56 shrink-0 flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Date</label>
                <input type="date" value={draft.date} onChange={(e) => field("date")(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Fluency</label>
                <input value={draft.fluency} onChange={(e) => field("fluency")(e.target.value)} placeholder="e.g. 18J, 20J" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Therapist</label>
                <input value={draft.therapist} onChange={(e) => field("therapist")(e.target.value)} placeholder="Therapist name" className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-teal-400">Client Sign</label>
                <div className="mt-1">
                  {draft.clientSign?.startsWith("data:image/") ? (
                    <div className="relative rounded-xl border-2 border-green-200 bg-white overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.clientSign} alt="Signature" className="w-full h-16 object-contain px-2 py-1" />
                      <div className="absolute top-1 right-1 rounded-full bg-green-500 w-5 h-5 flex items-center justify-center text-white text-[9px] font-bold">✓</div>
                    </div>
                  ) : (
                    <button onClick={() => setShowSig(true)} className="w-full rounded-xl border-2 border-dashed border-teal-200 bg-teal-50 px-3 py-4 text-xs font-bold text-teal-400 hover:bg-teal-100 hover:border-teal-400 transition-colors flex flex-col items-center gap-1">
                      <span className="text-2xl">✍️</span><span>Tap to sign</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4 shrink-0">
            <button onClick={onClose} className="rounded-xl border-2 border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={() => { onSave(draft); onClose(); }} className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-6 py-2 text-sm font-bold text-white hover:from-teal-700 hover:to-emerald-600 shadow-md transition-all hover:shadow-lg">
              💾 Save
            </button>
          </div>
        </div>
      </div>

      {showSig && (
        <SignatureModal
          onSave={(s) => { setDraft((d) => ({ ...d, clientSign: s ?? "" })); setShowSig(false); }}
          onClose={() => setShowSig(false)}
        />
      )}
    </>
  );
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function BodyThumbnail({ entry, index, onClick }: { entry: BodyEntry; index: number; onClick: () => void }) {
  const hasStrokes = (entry.strokes ?? []).length > 0;
  const hasSig = entry.clientSign?.startsWith("data:image/");

  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-2xl border-2 border-teal-100 bg-white hover:border-teal-400 hover:shadow-lg transition-all overflow-hidden text-left"
    >
      {/* wider aspect for body (front + back) */}
      <div className="relative w-full bg-gray-50" style={{ aspectRatio: "560/370" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/body-diagram.png" alt="Body" className="absolute inset-0 w-full h-full object-contain p-1 pointer-events-none" draggable={false} />
        <StrokeOverlay strokes={entry.strokes ?? []} />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-teal-600/10 transition-all">
          <span className="rounded-full bg-white shadow-lg px-3 py-1 text-xs font-bold text-teal-700">✏️ Edit</span>
        </div>
      </div>
      <div className="bg-teal-50 border-t border-teal-100 px-3 py-2.5 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-teal-600 uppercase tracking-wide">#{index + 1}</span>
          {hasSig && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-600">✓ Signed</span>}
          {hasStrokes && !hasSig && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-500">✏ Drawn</span>}
          {!hasStrokes && !hasSig && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-400">Empty</span>}
        </div>
        {entry.date && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-teal-400 uppercase">Date</span>
            <span className="text-[11px] font-semibold text-gray-700">{entry.date}</span>
          </div>
        )}
        {entry.fluency && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-teal-400 uppercase">Fluency</span>
            <span className="text-[11px] font-semibold text-gray-700 truncate">{entry.fluency}</span>
          </div>
        )}
        {entry.therapist && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-teal-400 uppercase">Therapist</span>
            <span className="text-[11px] font-semibold text-gray-700 truncate">{entry.therapist}</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function BodyLhrSection({
  entries: rawEntries,
  onChange,
}: {
  entries: BodyEntry[];
  onChange: (entries: BodyEntry[]) => void;
}) {
  const entries = rawEntries.map((e) => ({ ...e, strokes: e.strokes ?? [] }));
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const confirm = useConfirm();

  function updateEntry(idx: number, updated: BodyEntry) {
    onChange(entries.map((e, i) => (i === idx ? updated : e)));
  }

  async function removeEntry(idx: number) {
    const ok = await confirm({ message: `Delete Body LHR record #${idx + 1}? This cannot be undone.` });
    if (!ok) return;
    const next = entries.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? next : [newBodyEntry()]);
    setOpenIdx(null);
  }

  function addEntry() {
    const next = [...entries, newBodyEntry()];
    onChange(next);
    setOpenIdx(next.length - 1);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div>
          <p className="text-xl font-extrabold tracking-wide text-gray-800 uppercase underline underline-offset-4 decoration-teal-400">Body LHR Record Sheet</p>
        </div>
        <button
          onClick={addEntry}
          className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-teal-300 bg-teal-50 px-4 py-2 text-xs font-bold text-teal-600 hover:bg-teal-100 hover:border-teal-400 transition-colors"
        >
          <span className="text-base leading-none">+</span> Add Record
        </button>
      </div>

      {/* Thumbnail grid — wider cards for body */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
        {entries.map((entry, idx) => (
          <BodyThumbnail key={entry.id} entry={entry} index={idx} onClick={() => setOpenIdx(idx)} />
        ))}
      </div>

      {/* Dialog */}
      {openIdx !== null && openIdx < entries.length && (
        <BodyEntryDialog
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
