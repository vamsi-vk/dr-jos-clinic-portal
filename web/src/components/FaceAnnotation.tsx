"use client";

import { useRef, useState } from "react";
import { SignaturePad } from "@/components/signature-pad";
import { useConfirm } from "@/components/ConfirmProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single pen stroke: color, width, and points normalised 0-1 relative to canvas */
export type Stroke = {
  color: string;
  size: number;
  pts: number[][]; // [[x,y], …] – normalised 0–1
};

export type FaceEntry = {
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

export function newFaceEntry(): FaceEntry {
  return { id: crypto.randomUUID(), strokes: [], date: todayStr(), fluency: "", therapist: "", clientSign: "" };
}

// ─── SVG stroke overlay ───────────────────────────────────────────────────────

/** Renders saved strokes as SVG polylines over the face image */
export function StrokeOverlay({ strokes, className }: { strokes: Stroke[]; className?: string }) {
  if (!strokes?.length) return null;
  return (
    <svg
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      className={className ?? "absolute inset-0 w-full h-full pointer-events-none"}
    >
      {strokes.map((s, i) => (
        <polyline
          key={i}
          points={s.pts.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke={s.color}
          strokeWidth={s.size / 400}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

// ─── Drawing canvas ───────────────────────────────────────────────────────────

const PEN_COLORS = ["#e53e3e", "#2563eb", "#059669", "#d97706", "#7c3aed", "#000000"];

export function DrawCanvas({
  strokes,
  onStrokesChange,
}: {
  strokes: Stroke[];
  onStrokesChange: (s: Stroke[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [penColor, setPenColor] = useState("#e53e3e");
  const [penSize, setPenSize] = useState(3);
  const currentStroke = useRef<number[][]>([]);
  const drawing = useRef(false);

  function getNorm(e: React.PointerEvent): [number, number] {
    const el = containerRef.current!;
    const r = el.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height];
  }

  function onDown(e: React.PointerEvent) {
    drawing.current = true;
    containerRef.current?.setPointerCapture(e.pointerId);
    currentStroke.current = [getNorm(e)];
  }

  function onMove(e: React.PointerEvent) {
    if (!drawing.current) return;
    currentStroke.current = [...currentStroke.current, getNorm(e)];
    // Live preview via a temporary SVG rendered from state — lightweight
    onStrokesChange([
      ...strokes,
      { color: penColor, size: penSize, pts: currentStroke.current },
    ]);
  }

  function onUp(e: React.PointerEvent) {
    if (!drawing.current) return;
    drawing.current = false;
    containerRef.current?.releasePointerCapture(e.pointerId);
    if (currentStroke.current.length > 1) {
      onStrokesChange([
        ...strokes,
        { color: penColor, size: penSize, pts: currentStroke.current },
      ]);
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
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Size</span>
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
            <button
              onClick={() => onStrokesChange(strokes.slice(0, -1))}
              className="ml-auto flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-100 transition-colors"
            >
              ↩ Undo
            </button>
            <button
              onClick={() => onStrokesChange([])}
              className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-100 transition-colors"
            >
              🗑 Clear
            </button>
          </>
        )}
      </div>

      {/* Face image + stroke overlay */}
      <div
        ref={containerRef}
        className="relative rounded-2xl border-2 border-gray-200 bg-white overflow-hidden select-none shadow-inner cursor-crosshair touch-none"
        style={{ aspectRatio: "280/350" }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/face-diagram.png"
          alt="Face diagram"
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          draggable={false}
        />
        <StrokeOverlay strokes={strokes} />
        {strokes.length === 0 && (
          <div className="absolute bottom-3 inset-x-0 text-center text-xs text-gray-300 pointer-events-none select-none">
            ✏️ Draw on the face diagram
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
          <button onClick={() => onSave(draft)} className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-bold text-white hover:bg-indigo-700">Save</button>
        </div>
      </div>
    </div>
  );
}

// ─── Face entry dialog ────────────────────────────────────────────────────────

function FaceEntryDialog({
  entry,
  index,
  onSave,
  onDelete,
  onClose,
}: {
  entry: FaceEntry;
  index: number;
  onSave: (e: FaceEntry) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<FaceEntry>({ ...entry, strokes: entry.strokes ?? [] });
  const [showSig, setShowSig] = useState(false);

  function handleSave() {
    onSave(draft);
    onClose();
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 flex flex-col w-full max-w-3xl max-h-[92vh] rounded-2xl bg-white shadow-2xl overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-4 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧬</span>
              <div>
                <p className="text-base font-bold text-white">Face Diagram #{index + 1}</p>
                <p className="text-xs text-white/70">Face LHR Record Sheet</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onDelete}
                className="rounded-xl bg-white/20 hover:bg-red-500 px-3 py-1.5 text-xs font-bold text-white transition-colors"
              >
                🗑 Delete
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white text-lg font-bold transition-colors">
                ×
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col sm:flex-row gap-5 p-5 overflow-y-auto flex-1">
            {/* Left: drawing */}
            <div className="flex-1 min-w-0">
              <DrawCanvas
                strokes={draft.strokes}
                onStrokesChange={(s) => setDraft((d) => ({ ...d, strokes: s }))}
              />
            </div>

            {/* Right: fields */}
            <div className="w-full sm:w-64 shrink-0 flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-purple-400">Date</label>
                <input
                  type="date"
                  value={draft.date}
                  onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                  className="mt-1 w-full rounded-xl border-2 border-purple-100 bg-purple-50 px-3 py-2.5 text-sm font-medium text-purple-900 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400">Fluency</label>
                <input
                  value={draft.fluency}
                  onChange={(e) => setDraft((d) => ({ ...d, fluency: e.target.value }))}
                  placeholder="e.g. 18J, 20J"
                  className="mt-1 w-full rounded-xl border-2 border-fuchsia-100 bg-fuchsia-50 px-3 py-2.5 text-sm font-medium text-fuchsia-900 outline-none focus:border-fuchsia-400 focus:ring-2 focus:ring-fuchsia-100 transition-all placeholder:text-fuchsia-300"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Therapist</label>
                <input
                  value={draft.therapist}
                  onChange={(e) => setDraft((d) => ({ ...d, therapist: e.target.value }))}
                  placeholder="Therapist name"
                  className="mt-1 w-full rounded-xl border-2 border-violet-100 bg-violet-50 px-3 py-2.5 text-sm font-medium text-violet-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all placeholder:text-violet-300"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-pink-400">Client Sign</label>
                <div className="mt-1">
                  {draft.clientSign?.startsWith("data:image/") ? (
                    <div className="relative rounded-xl border-2 border-green-200 bg-white overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.clientSign} alt="Signature" className="w-full h-16 object-contain px-2 py-1" />
                      <div className="absolute top-1 right-1 rounded-full bg-green-500 w-5 h-5 flex items-center justify-center text-white text-[9px] font-bold">✓</div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSig(true)}
                      className="w-full rounded-xl border-2 border-dashed border-pink-200 bg-pink-50 px-3 py-4 text-xs font-bold text-pink-400 hover:bg-pink-100 hover:border-pink-400 transition-colors flex flex-col items-center gap-1"
                    >
                      <span className="text-2xl">✍️</span>
                      <span>Tap to sign</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4 shrink-0">
            <button onClick={onClose} className="rounded-xl border-2 border-gray-200 px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-6 py-2 text-sm font-bold text-white hover:from-purple-700 hover:to-fuchsia-700 shadow-md transition-all hover:shadow-lg"
            >
              💾 Save
            </button>
          </div>
        </div>
      </div>

      {showSig && (
        <SignatureModal
          onSave={(sig) => { setDraft((d) => ({ ...d, clientSign: sig ?? "" })); setShowSig(false); }}
          onClose={() => setShowSig(false)}
        />
      )}
    </>
  );
}

// ─── Thumbnail card ───────────────────────────────────────────────────────────

function FaceThumbnail({ entry, index, onClick }: { entry: FaceEntry; index: number; onClick: () => void }) {
  const hasStrokes = (entry.strokes ?? []).length > 0;
  const hasSig = entry.clientSign?.startsWith("data:image/");

  return (
    <button
      onClick={onClick}
      className="group flex flex-col rounded-2xl border-2 border-purple-100 bg-white hover:border-purple-400 hover:shadow-lg transition-all overflow-hidden text-left"
    >
      {/* Preview */}
      <div className="relative w-full bg-gray-50" style={{ aspectRatio: "280/350" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/face-diagram.png"
          alt="Face diagram"
          className="absolute inset-0 w-full h-full object-contain p-1 pointer-events-none"
          draggable={false}
        />
        {/* Render saved strokes as SVG directly — no PNG conversion needed */}
        <StrokeOverlay strokes={entry.strokes} />

        {/* Edit overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-purple-600/10 transition-all">
          <span className="rounded-full bg-white shadow-lg px-3 py-1 text-xs font-bold text-purple-700">✏️ Edit</span>
        </div>
      </div>

      {/* Info footer */}
      <div className="bg-purple-50 border-t border-purple-100 px-3 py-2.5 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-purple-600 uppercase tracking-wide">#{index + 1}</span>
          {hasSig && <span className="rounded-full bg-green-100 px-2 py-0.5 text-[9px] font-bold text-green-600">✓ Signed</span>}
          {hasStrokes && !hasSig && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-500">✏ Drawn</span>}
          {!hasStrokes && !hasSig && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-400">Empty</span>}
        </div>
        {entry.date && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-purple-400 uppercase">Date</span>
            <span className="text-[11px] font-semibold text-gray-700">{entry.date}</span>
          </div>
        )}
        {entry.fluency && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-purple-400 uppercase">Fluency</span>
            <span className="text-[11px] font-semibold text-gray-700 truncate">{entry.fluency}</span>
          </div>
        )}
        {entry.therapist && (
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-purple-400 uppercase">Therapist</span>
            <span className="text-[11px] font-semibold text-gray-700 truncate">{entry.therapist}</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function FaceAnnotationSection({
  entries: rawEntries,
  onChange,
}: {
  entries: FaceEntry[];
  onChange: (entries: FaceEntry[]) => void;
}) {
  // Normalise old DB records that may have `drawing` instead of `strokes`
  const entries = rawEntries.map((e) => ({ ...e, strokes: e.strokes ?? [] }));
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const confirm = useConfirm();

  function updateEntry(idx: number, updated: FaceEntry) {
    onChange(entries.map((e, i) => (i === idx ? updated : e)));
  }

  async function removeEntry(idx: number) {
    const ok = await confirm({ message: `Delete Face Diagram #${idx + 1}? This cannot be undone.` });
    if (!ok) return;
    const next = entries.filter((_, i) => i !== idx);
    onChange(next.length > 0 ? next : [newFaceEntry()]);
    setOpenIdx(null);
  }

  function addEntry() {
    const next = [...entries, newFaceEntry()];
    onChange(next);
    setOpenIdx(next.length - 1);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div>
          <p className="text-xl font-extrabold tracking-wide text-gray-800 uppercase underline underline-offset-4 decoration-purple-400">Face LHR Record Sheet</p>
        </div>
        <button
          onClick={addEntry}
          className="flex items-center gap-1.5 rounded-xl border-2 border-dashed border-purple-300 bg-purple-50 px-4 py-2 text-xs font-bold text-purple-600 hover:bg-purple-100 hover:border-purple-400 transition-colors"
        >
          <span className="text-base leading-none">+</span> Add Diagram
        </button>
      </div>

      {/* Thumbnail grid */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {entries.map((entry, idx) => (
          <FaceThumbnail key={entry.id} entry={entry} index={idx} onClick={() => setOpenIdx(idx)} />
        ))}
      </div>

      {/* Dialog */}
      {openIdx !== null && openIdx < entries.length && (
        <FaceEntryDialog
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
