"use client";

import { useState, useRef, useEffect } from "react";
import { useConfirm } from "@/components/ConfirmProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NoteEntry = {
  id: string;
  text: string;
  photos: string[]; // base64 data URLs
  createdAt: string; // ISO date string
};

function nowISO() {
  return new Date().toISOString();
}

export function newNote(): NoteEntry {
  return { id: crypto.randomUUID(), text: "", photos: [], createdAt: nowISO() };
}

function formatNoteDate(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

// ─── Photo upload helpers ─────────────────────────────────────────────────────

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = rej;
    fr.readAsDataURL(file);
  });
}

// ─── Lightbox with zoom ───────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  function zoom(delta: number) {
    setScale((s) => Math.min(5, Math.max(0.5, s + delta)));
  }

  function resetZoom() { setScale(1); setOffset({ x: 0, y: 0 }); }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    zoom(e.deltaY < 0 ? 0.2 : -0.2);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (scale <= 1) return;
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setOffset((o) => ({ x: o.x + e.clientX - lastPos.current.x, y: o.y + e.clientY - lastPos.current.y }));
    lastPos.current = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp() { dragging.current = false; }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoom(0.3);
      if (e.key === "-") zoom(-0.3);
      if (e.key === "0") resetZoom();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm" onClick={onClose}>
      {/* Image */}
      <div
        className="relative overflow-hidden flex items-center justify-center w-full h-full"
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: scale > 1 ? "grab" : "default" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Note photo"
          draggable={false}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-xl shadow-2xl select-none transition-transform duration-100"
          style={{ transform: `scale(${scale}) translate(${offset.x / scale}px, ${offset.y / scale}px)` }}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur rounded-2xl px-4 py-2.5 shadow-xl">
        <button onClick={() => zoom(-0.3)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white font-bold text-lg flex items-center justify-center transition-colors">−</button>
        <button onClick={resetZoom} className="px-3 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white text-xs font-bold transition-colors min-w-[48px]">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={() => zoom(0.3)} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/25 text-white font-bold text-lg flex items-center justify-center transition-colors">+</button>
      </div>

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center text-xl font-bold transition-colors"
      >
        ×
      </button>

      {/* Hint */}
      <p className="absolute top-4 left-1/2 -translate-x-1/2 text-[11px] text-white/40 pointer-events-none select-none">
        Scroll to zoom · Drag to pan · Esc to close
      </p>
    </div>
  );
}

// ─── Single note card ─────────────────────────────────────────────────────────

function NoteCard({
  note,
  onChange,
  onDelete,
}: {
  note: NoteEntry;
  onChange: (n: NoteEntry) => void;
  onDelete: () => void;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const results: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      results.push(await readFileAsDataUrl(file));
    }
    onChange({ ...note, photos: [...note.photos, ...results] });
  }

  function removePhoto(idx: number) {
    onChange({ ...note, photos: note.photos.filter((_, i) => i !== idx) });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  const hasContent = note.text.trim() || note.photos.length > 0;

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden group">
        {/* Card header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
          <span className="text-[11px] font-semibold text-gray-400">{formatNoteDate(note.createdAt)}</span>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 rounded-lg px-2.5 py-1 text-[10px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            Delete
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Text area */}
          <textarea
            value={note.text}
            onChange={(e) => onChange({ ...note, text: e.target.value })}
            placeholder="Write your clinical note here…"
            rows={5}
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-100 transition-all resize-y placeholder:text-gray-300"
          />

          {/* Photo thumbnails */}
          {note.photos.length > 0 && (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {note.photos.map((src, i) => (
                <div key={i} className="relative group/photo rounded-lg overflow-hidden border border-gray-200 aspect-square bg-gray-50 cursor-zoom-in" onClick={() => setLightbox(src)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover transition-opacity group-hover/photo:opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity">
                    <span className="text-white text-xl drop-shadow-lg">🔍</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover/photo:opacity-100 transition-opacity font-bold"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload zone */}
          <div
            className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 hover:border-gray-400 hover:bg-gray-100/50 transition-all"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <p className="text-xs text-gray-400">Drag & drop photos, or</p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                📁 Upload
              </button>
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                📷 Camera
              </button>
            </div>
          </div>

          {/* Hidden inputs */}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
          <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>

        {/* Bottom status */}
        {hasContent && (
          <div className="border-t border-gray-100 bg-gray-50/50 px-4 py-2 flex items-center gap-3">
            {note.text.trim() && <span className="text-[10px] text-gray-400">{note.text.trim().split(/\s+/).length} words</span>}
            {note.photos.length > 0 && <span className="text-[10px] text-gray-400">{note.photos.length} photo{note.photos.length !== 1 ? "s" : ""}</span>}
          </div>
        )}
      </div>

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function ClinicalNotesSection({
  notes: rawNotes,
  onChange,
}: {
  notes: NoteEntry[];
  onChange: (notes: NoteEntry[]) => void;
}) {
  const notes = rawNotes ?? [];
  const confirm = useConfirm();

  function updateNote(idx: number, updated: NoteEntry) {
    onChange(notes.map((n, i) => (i === idx ? updated : n)));
  }

  async function deleteNote(idx: number) {
    const ok = await confirm({ message: "Delete this note and all its photos? This cannot be undone." });
    if (!ok) return;
    onChange(notes.filter((_, i) => i !== idx));
  }

  function addNote() {
    onChange([...notes, newNote()]);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-xl font-extrabold tracking-wide text-gray-800 uppercase underline underline-offset-4 decoration-gray-300">
          Clinical Notes
        </p>
        <button
          onClick={addNote}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors shadow-sm"
        >
          <span className="text-base leading-none">+</span> Add Note
        </button>
      </div>

      {/* Notes grid */}
      {notes.length === 0 ? (
        <div
          className="rounded-xl border border-dashed border-gray-200 bg-gray-50 py-10 flex flex-col items-center gap-2 cursor-pointer hover:border-gray-400 hover:bg-gray-100/50 transition-all"
          onClick={addNote}
        >
          <span className="text-3xl">📝</span>
          <p className="text-sm font-semibold text-gray-400">No notes yet — click to add one</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {notes.map((note, idx) => (
            <NoteCard
              key={note.id}
              note={note}
              onChange={(updated) => updateNote(idx, updated)}
              onDelete={() => deleteNote(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
