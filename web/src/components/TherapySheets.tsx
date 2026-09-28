"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { SignaturePad } from "@/components/signature-pad";
import { FaceAnnotationSection, newFaceEntry, type FaceEntry } from "@/components/FaceAnnotation";
import { useConfirm } from "@/components/ConfirmProvider";
import { emptyProfileForm, type ProfileFormData } from "@/components/ProfileForm";
import { ProfileFormDialog } from "@/components/ProfileFormDialog";
import { BotoxFillerSection, newBotoxEntry, type BotoxEntry } from "@/components/BotoxFillerRecord";
import { BodyLhrSection, newBodyEntry, type BodyEntry } from "@/components/BodyLhrRecord";
import { ClinicalNotesSection, newNote, type NoteEntry } from "@/components/ClinicalNotes";

// ─── Column resize hook ───────────────────────────────────────────────────────
// DOM-direct during drag — zero React re-renders while dragging.

function useColumnResize(count: number, defaultWidth = 150) {
  const widthsRef = useRef<number[]>(Array(count).fill(defaultWidth));
  const [, forceRender] = useState(0);
  const colEls = useRef<(HTMLTableColElement | null)[]>([]);

  useEffect(() => {
    const prev = widthsRef.current;
    if (prev.length !== count) {
      const next = Array(count).fill(defaultWidth);
      prev.forEach((w, i) => { if (i < count) next[i] = w; });
      widthsRef.current = next;
      forceRender((n) => n + 1);
    }
  }, [count, defaultWidth]);

  function startResize(idx: number, e: React.PointerEvent<HTMLSpanElement>) {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    const startX = e.clientX;
    const startW = widthsRef.current[idx] ?? defaultWidth;

    function onMove(ev: PointerEvent) {
      const col = colEls.current[idx];
      if (col) col.style.width = `${Math.max(60, startW + ev.clientX - startX)}px`;
    }
    function onUp(ev: PointerEvent) {
      widthsRef.current[idx] = Math.max(60, startW + ev.clientX - startX);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      forceRender((n) => n + 1);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function setColRef(idx: number) {
    return (el: HTMLTableColElement | null) => { colEls.current[idx] = el; };
  }

  return { widths: widthsRef.current, startResize, setColRef };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Row = Record<string, string>;

export type TherapySheetsData = {
  therapySheet: Row[];
  laserToning: Row[];
  pipelineSheet: Row[];
  fractionalCO2: Row[];
  mnrfSheet: Row[];
  signature: string | null;
  profileForm: ProfileFormData;
  faceAnnotations: FaceEntry[];
  botoxFiller: BotoxEntry[];
  bodyLhr: BodyEntry[];
  clinicalNotes: NoteEntry[];
};

// ─── Sheet definitions ────────────────────────────────────────────────────────

const THERAPY_SHEET_FIELDS = [
  { key: "sno", label: "SNO" },
  { key: "date", label: "DATE" },
  { key: "session", label: "SESSION" },
  { key: "readings", label: "READINGS" },
  { key: "jtAndDoctor", label: "JT & DOCTOR" },
  { key: "clientSign", label: "CLIENT SIGN" },
  { key: "picturesRoom", label: "PICTURES / ROOM" },
  { key: "remarks", label: "REMARKS" },
  { key: "reviewOfLastSession", label: "REVIEW OF LAST SESSION" },
];

const LASER_TONING_COLS = [
  { key: "session", label: "SESSION" },
  { key: "date", label: "DATE" },
  { key: "frequency", label: "FREQUENCY" },
  { key: "spot", label: "SPOT" },
  { key: "fluency", label: "FLUENCY" },
  { key: "energy", label: "ENERGY" },
  { key: "probe", label: "PROBE" },
  { key: "shots", label: "SHOTS" },
  { key: "area", label: "AREA" },
  { key: "doctor", label: "DOCTOR" },
  { key: "remarks", label: "REMARKS" },
];

const PIPELINE_COLS = [
  { key: "sno", label: "S NO" },
  { key: "date", label: "DATE" },
  { key: "package", label: "PACKAGE" },
  { key: "price", label: "PRICE" },
  { key: "therapist", label: "THERAPIST" },
  { key: "remarks", label: "REMARKS" },
];

const FRACTIONAL_CO2_COLS = [
  { key: "sno", label: "SNO" },
  { key: "date", label: "DATE" },
  { key: "timer", label: "TIMER" },
  { key: "power", label: "POWER" },
  { key: "duration", label: "DURATION" },
  { key: "interval", label: "INTERVAL" },
  { key: "distance", label: "DISTANCE" },
  { key: "doctor", label: "DOCTOR" },
  { key: "therapist", label: "THERAPIST" },
];

const MNRF_COLS = [
  { key: "sno", label: "SNO" },
  { key: "date", label: "DATE" },
  { key: "probe", label: "PROBE" },
  { key: "level", label: "LEVEL" },
  { key: "depth", label: "DEPTH" },
  { key: "rfTime", label: "RF TIME" },
  { key: "passes", label: "PASSES" },
  { key: "area", label: "AREA" },
  { key: "shots", label: "SHOTS" },
  { key: "client", label: "CLIENT" },
  { key: "jtAndDoctor", label: "JT & DOCTOR" },
  { key: "pics", label: "PICS" },
];

// Each tab has its own color theme
const TABS = [
  {
    id: "therapySheet",
    label: "Therapy Sheet",
    emoji: "🩺",
    headerBg: "from-indigo-600 to-violet-700",
    activeBg: "bg-indigo-600",
    activeText: "text-white",
    inactiveBg: "hover:bg-indigo-50 hover:text-indigo-700",
    rowHover: "hover:bg-indigo-50/60",
    headerRow: "bg-indigo-50 text-indigo-700",
    border: "border-indigo-200",
    addBtn: "border-indigo-300 text-indigo-600 hover:bg-indigo-50",
    focusRing: "focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400",
  },
  {
    id: "laserToning",
    label: "Laser Toning",
    emoji: "✨",
    headerBg: "from-violet-400 to-purple-500",
    activeBg: "bg-violet-500",
    activeText: "text-white",
    inactiveBg: "hover:bg-violet-50 hover:text-violet-700",
    rowHover: "hover:bg-violet-50/60",
    headerRow: "bg-violet-50 text-violet-600",
    border: "border-violet-200",
    addBtn: "border-violet-300 text-violet-500 hover:bg-violet-50",
    focusRing: "focus:ring-2 focus:ring-violet-300 focus:border-violet-400",
  },
  {
    id: "pipelineSheet",
    label: "Pipeline Sheet",
    emoji: "📋",
    headerBg: "from-sky-500 to-cyan-600",
    activeBg: "bg-sky-500",
    activeText: "text-white",
    inactiveBg: "hover:bg-sky-50 hover:text-sky-700",
    rowHover: "hover:bg-sky-50/60",
    headerRow: "bg-sky-50 text-sky-700",
    border: "border-sky-200",
    addBtn: "border-sky-300 text-sky-600 hover:bg-sky-50",
    focusRing: "focus:ring-2 focus:ring-sky-300 focus:border-sky-400",
  },
  {
    id: "fractionalCO2",
    label: "Fractional CO2",
    emoji: "⚡",
    headerBg: "from-teal-600 to-cyan-700",
    activeBg: "bg-teal-600",
    activeText: "text-white",
    inactiveBg: "hover:bg-teal-50 hover:text-teal-700",
    rowHover: "hover:bg-teal-50/60",
    headerRow: "bg-teal-50 text-teal-700",
    border: "border-teal-200",
    addBtn: "border-teal-300 text-teal-600 hover:bg-teal-50",
    focusRing: "focus:ring-2 focus:ring-teal-300 focus:border-teal-400",
  },
  {
    id: "mnrfSheet",
    label: "MNRF Sheet",
    emoji: "🔬",
    headerBg: "from-blue-600 to-indigo-700",
    activeBg: "bg-blue-600",
    activeText: "text-white",
    inactiveBg: "hover:bg-blue-50 hover:text-blue-700",
    rowHover: "hover:bg-blue-50/60",
    headerRow: "bg-blue-50 text-blue-700",
    border: "border-blue-200",
    addBtn: "border-blue-300 text-blue-600 hover:bg-blue-50",
    focusRing: "focus:ring-2 focus:ring-blue-300 focus:border-blue-400",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function emptyRow(cols: { key: string }[]): Row {
  return Object.fromEntries(cols.map((c) => [c.key, ""]));
}

function initData(): TherapySheetsData {
  return {
    therapySheet: Array.from({ length: 5 }, (_, i) => ({ ...emptyRowWithDate(THERAPY_SHEET_FIELDS), sno: String(i + 1) })),
    laserToning: Array.from({ length: 5 }, () => emptyRowWithDate(LASER_TONING_COLS)),
    pipelineSheet: Array.from({ length: 5 }, () => emptyRowWithDate(PIPELINE_COLS)),
    fractionalCO2: Array.from({ length: 5 }, () => emptyRowWithDate(FRACTIONAL_CO2_COLS)),
    mnrfSheet: Array.from({ length: 5 }, () => emptyRowWithDate(MNRF_COLS)),
    signature: null,
    profileForm: emptyProfileForm(),
    faceAnnotations: [newFaceEntry()],
    botoxFiller: [newBotoxEntry()],
    bodyLhr: [newBodyEntry()],
    clinicalNotes: [],
  };
}

type Theme = (typeof TABS)[number];

// ─── Signature dialog ─────────────────────────────────────────────────────────

function SignatureDialog({
  value,
  label,
  onSave,
  onClose,
}: {
  value: string | null;
  label: string;
  onSave: (sig: string | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">✍️</span>
            <div>
              <p className="text-sm font-bold text-gray-800">{label}</p>
              <p className="text-xs text-gray-400">Sign with finger or mouse</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-lg font-bold"
          >
            ×
          </button>
        </div>
        {/* Signature pad */}
        <div className="p-5">
          <SignaturePad value={draft} onChange={setDraft} />
        </div>
        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(draft); onClose(); }}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
          >
            Save Signature
          </button>
        </div>
      </div>
    </div>
  );
}

function SignatureCell({
  value,
  theme,
  label,
  onChange,
}: {
  value: string;
  theme: Theme;
  label: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasSig = value?.startsWith("data:image/");

  return (
    <>
      {hasSig ? (
        <div className="relative w-full min-w-[140px] rounded-lg border-2 border-green-200 bg-white overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Signature" className="w-full h-12 object-contain px-2 py-1" />
          <div className="absolute top-1 right-1 rounded-full bg-green-500 w-4 h-4 flex items-center justify-center text-white text-[9px] font-bold">
            ✓
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className={`w-full min-w-[110px] rounded-lg border-2 border-dashed px-3 py-2 text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${theme.border} bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50`}
        >
          <span>✍️</span>
          <span>Click to sign</span>
        </button>
      )}

      {open && (
        <SignatureDialog
          value={null}
          label={label}
          onSave={(sig) => onChange(sig ?? "")}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [zoom, setZoom] = useState(1);

  function zoomIn() { setZoom((z) => Math.min(z + 0.25, 4)); }
  function zoomOut() { setZoom((z) => Math.max(z - 0.25, 0.25)); }
  function resetZoom() { setZoom(1); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "0") resetZoom();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Top controls */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 py-3 bg-gradient-to-b from-black/60 to-transparent z-10">
        <div className="flex items-center gap-2">
          <button onClick={zoomOut} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition text-lg font-bold" title="Zoom out (-)">−</button>
          <button onClick={resetZoom} className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white hover:bg-white/30 transition" title="Reset zoom (0)">{Math.round(zoom * 100)}%</button>
          <button onClick={zoomIn} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition text-lg font-bold" title="Zoom in (+)">+</button>
        </div>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-red-500 transition text-xl font-bold" title="Close (Esc)">×</button>
      </div>

      {/* Image container — click backdrop to close */}
      <div
        className="flex items-center justify-center overflow-auto"
        style={{ width: "80vw", height: "80vh" }}
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Preview"
          onClick={(e) => e.stopPropagation()}
          style={{ transform: `scale(${zoom})`, transformOrigin: "center", transition: "transform 0.2s", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: zoom > 1 ? "grab" : "default" }}
        />
      </div>

      {/* Bottom hint */}
      <p className="absolute bottom-4 text-xs text-white/40 select-none">Click outside image to close · Scroll or +/− to zoom</p>
    </div>
  );
}

// ─── Pics dialog ─────────────────────────────────────────────────────────────

function PicsDialog({
  images,
  onSave,
  onClose,
}: {
  images: string[];
  onSave: (imgs: string[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<string[]>(images);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  function readFiles(files: File[]) {
    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setDraft((prev) => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    readFiles(Array.from(e.target.files ?? []));
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    readFiles(Array.from(e.dataTransfer.files));
  }

  function removeImage(idx: number) {
    setDraft((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🖼️</span>
              <div>
                <p className="text-sm font-bold text-gray-800">Upload Pictures</p>
                <p className="text-xs text-gray-400">{draft.length} image{draft.length !== 1 ? "s" : ""} · JPG, PNG, WEBP</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-full w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-lg font-bold">×</button>
          </div>

          {/* Body — scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Two action buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Upload from gallery */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center gap-2 py-6 px-4 ${
                dragging
                  ? "border-blue-400 bg-blue-100 scale-[1.01]"
                  : "border-blue-200 bg-gradient-to-b from-blue-50 to-white hover:border-blue-400 hover:bg-blue-50"
              }`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-2xl shadow-inner">🖼️</div>
              <div className="text-center">
                <p className="text-sm font-bold text-blue-700">Upload Photos</p>
                <p className="text-xs text-blue-400 mt-0.5">From gallery or drag & drop</p>
              </div>
            </div>

            {/* Take photo with camera */}
            <div
              onClick={() => cameraRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-emerald-200 bg-gradient-to-b from-emerald-50 to-white cursor-pointer transition-all flex flex-col items-center gap-2 py-6 px-4 hover:border-emerald-400 hover:bg-emerald-50"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-2xl shadow-inner">📷</div>
              <div className="text-center">
                <p className="text-sm font-bold text-emerald-700">Take Photo</p>
                <p className="text-xs text-emerald-400 mt-0.5">Open camera directly</p>
              </div>
            </div>
          </div>

          <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />

            {/* Thumbnails grid */}
            {draft.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {draft.map((src, idx) => (
                  <div key={idx} className="group relative rounded-xl overflow-hidden border-2 border-gray-100 aspect-square bg-gray-50 shadow-sm hover:shadow-md transition-shadow">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`pic ${idx + 1}`}
                      className="w-full h-full object-cover cursor-zoom-in"
                      onClick={() => setLightboxSrc(src)}
                    />
                    {/* Remove btn */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                      className="absolute top-1.5 right-1.5 rounded-full w-6 h-6 bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold shadow"
                      title="Remove"
                    >×</button>
                    {/* Zoom hint */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <span className="text-white text-2xl">🔍</span>
                    </div>
                    {/* Number badge */}
                    <div className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-white">{idx + 1}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 shrink-0 bg-gray-50/50">
            <span className="text-xs text-gray-400">{draft.length} photo{draft.length !== 1 ? "s" : ""} selected</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
              <button
                onClick={() => { onSave(draft); onClose(); }}
                className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
              >
                💾 Save Photos
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function PicsCell({
  value,
  theme,
  onChange,
}: {
  value: string;
  theme: Theme;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  let images: string[] = [];
  try { images = value ? JSON.parse(value) : []; } catch { images = []; }
  const hasImages = images.length > 0;

  function handleSave(imgs: string[]) {
    onChange(JSON.stringify(imgs));
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`w-full min-w-[100px] rounded-lg border-2 transition-all overflow-hidden ${
          hasImages
            ? "border-blue-200 bg-white hover:border-blue-400 hover:shadow-md p-1"
            : `border-dashed ${theme.border} bg-white px-3 py-2 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50`
        }`}
        title={hasImages ? "Click to manage photos" : "Upload photos"}
      >
        {hasImages ? (
          <div className="flex items-center gap-1">
            {images.slice(0, 3).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0" />
            ))}
            {images.length > 3 && (
              <span className="text-xs font-bold text-gray-500 ml-1">+{images.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="flex items-center justify-center gap-1">
            <span>🖼️</span> Upload
          </span>
        )}
      </button>

      {open && (
        <PicsDialog
          images={images}
          onSave={handleSave}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

const SNO_KEYS = new Set(["sno"]);
const DATE_KEYS = new Set(["date"]);
const SIGN_KEYS = new Set(["clientSign", "client"]);
const PICS_KEYS = new Set(["pics", "picturesRoom"]);

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function emptyRowWithDate(cols: { key: string }[]): Row {
  return Object.fromEntries(cols.map((c) => [c.key, ""]));
}

function RowTable({
  cols,
  rows,
  theme,
  onChange,
}: {
  cols: { key: string; label: string }[];
  rows: Row[];
  theme: Theme;
  onChange: (rows: Row[]) => void;
}) {
  const { widths, startResize, setColRef } = useColumnResize(cols.length, 130);
  const confirm = useConfirm();

  function rowHasData(idx: number) {
    const r = rows[idx];
    return Object.entries(r).some(([k, v]) => k !== "date" && k !== "sno" && v && v.trim() !== "");
  }

  function handleCell(rowIdx: number, key: string, value: string) {
    onChange(rows.map((r, i) => (i === rowIdx ? { ...r, [key]: value } : r)));
  }
  function addRow() {
    onChange([...rows, emptyRowWithDate(cols)]);
  }
  async function requestDeleteRow(idx: number) {
    if (rows.length === 1) return;
    if (rowHasData(idx)) {
      const ok = await confirm({ message: `Row ${idx + 1} has data that will be permanently deleted.`, confirmLabel: "Delete row" });
      if (!ok) return;
    }
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div className={`overflow-x-auto rounded-xl border-2 ${theme.border} shadow-sm`}>
        <table className="text-sm" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
          <colgroup>
            {widths.map((w, i) => <col key={i} ref={setColRef(i)} style={{ width: w }} />)}
            <col style={{ width: 40 }} />
          </colgroup>
          <thead>
            <tr className={`${theme.headerRow}`}>
              {cols.map((col, i) => (
                <th key={col.key} className="relative whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider">
                  {col.label}
                  <span
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none flex items-center justify-center group/rh z-10"
                    onPointerDown={(e) => startResize(i, e)}
                  >
                    <span className="w-0.5 h-4 rounded-full bg-current opacity-20 group-hover/rh:opacity-60 transition-opacity" />
                  </span>
                </th>
              ))}
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`group transition-colors ${theme.rowHover} ${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
              >
                {cols.map((col) => {
                  const isAutoSno = SNO_KEYS.has(col.key);
                  const isDate = DATE_KEYS.has(col.key);
                  const isSign = SIGN_KEYS.has(col.key);
                  const isPics = PICS_KEYS.has(col.key);
                  return (
                    <td key={col.key} className="px-2 py-1.5">
                      {isAutoSno ? (
                        <div className="min-w-[48px] rounded-lg bg-gray-100 px-2.5 py-1.5 text-center text-sm font-bold text-gray-500 select-none">
                          {rowIdx + 1}
                        </div>
                      ) : isDate ? (
                        <input
                          type="date"
                          value={row[col.key] ?? today()}
                          onChange={(e) => handleCell(rowIdx, col.key, e.target.value)}
                          className={`w-full min-w-[130px] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 ${theme.focusRing}`}
                        />
                      ) : isSign ? (
                        <SignatureCell
                          value={row[col.key] ?? ""}
                          theme={theme}
                          label={col.label}
                          onChange={(val) => handleCell(rowIdx, col.key, val)}
                        />
                      ) : isPics ? (
                        <PicsCell
                          value={row[col.key] ?? ""}
                          theme={theme}
                          onChange={(val) => handleCell(rowIdx, col.key, val)}
                        />
                      ) : (
                        <input
                          value={row[col.key] ?? ""}
                          onChange={(e) => handleCell(rowIdx, col.key, e.target.value)}
                          className={`w-full min-w-[80px] rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:bg-white focus:ring-2 ${theme.focusRing}`}
                          placeholder="—"
                        />
                      )}
                    </td>
                  );
                })}
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => requestDeleteRow(rowIdx)}
                    disabled={rows.length === 1}
                    className="opacity-0 group-hover:opacity-100 rounded-full w-5 h-5 flex items-center justify-center text-gray-400 hover:bg-red-100 hover:text-red-500 transition-all disabled:pointer-events-none text-sm leading-none"
                    title="Delete row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={addRow}
        className={`flex items-center gap-2 rounded-lg border-2 border-dashed px-4 py-2 text-xs font-semibold transition-colors ${theme.addBtn}`}
      >
        <span className="text-lg leading-none">+</span> Add row
      </button>

    </div>
  );
}

function TransposedTable({
  fields,
  sessions,
  theme,
  onChange,
}: {
  fields: { key: string; label: string }[];
  sessions: Row[];
  theme: Theme;
  onChange: (sessions: Row[]) => void;
}) {
  const { widths, startResize, setColRef } = useColumnResize(sessions.length, 150);
  const confirm = useConfirm();

  function sessionHasData(idx: number) {
    const s = sessions[idx];
    return Object.entries(s).some(([k, v]) => k !== "date" && k !== "sno" && v && v.trim() !== "");
  }

  function handleCell(sIdx: number, key: string, value: string) {
    onChange(sessions.map((s, i) => (i === sIdx ? { ...s, [key]: value } : s)));
  }
  function addSession() {
    onChange([...sessions, emptyRowWithDate(fields)]);
  }
  async function requestDeleteSession(idx: number) {
    if (sessions.length === 1) return;
    if (sessionHasData(idx)) {
      const ok = await confirm({ message: `Session ${idx + 1} has data that will be permanently deleted.`, confirmLabel: "Delete session" });
      if (!ok) return;
    }
    onChange(sessions.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-3">
      <div className={`overflow-x-auto rounded-xl border-2 ${theme.border} shadow-sm`}>
        <table className="text-sm" style={{ tableLayout: "fixed", width: "max-content", minWidth: "100%" }}>
          <colgroup>
            <col style={{ width: 190 }} />
            {widths.map((w, i) => <col key={i} ref={setColRef(i)} style={{ width: w }} />)}
          </colgroup>
          <thead>
            <tr className={`${theme.headerRow}`}>
              <th className="sticky left-0 z-10 whitespace-nowrap px-4 py-3 text-left text-xs font-bold uppercase tracking-wider border-r border-current/10" style={{ background: "inherit", width: 190 }}>
                Field
              </th>
              {sessions.map((_, idx) => (
                <th key={idx} className="relative whitespace-nowrap px-3 py-3 text-center text-xs font-bold">
                  <div className="flex items-center justify-center gap-2">
                    <span>Session {idx + 1}</span>
                    {sessions.length > 1 && (
                      <button
                        onClick={() => requestDeleteSession(idx)}
                        className="rounded-full w-4 h-4 flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-red-200 hover:text-red-700 transition-all text-xs"
                        title="Delete session"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <span
                    className="absolute right-0 top-0 h-full w-2 cursor-col-resize select-none flex items-center justify-center group/rh z-10"
                    onPointerDown={(e) => startResize(idx, e)}
                  >
                    <span className="w-0.5 h-4 rounded-full bg-current opacity-20 group-hover/rh:opacity-60 transition-opacity" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {fields.map((field, fIdx) => (
              <tr key={field.key} className={`transition-colors ${theme.rowHover} ${fIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                <td className={`sticky left-0 z-10 bg-inherit px-4 py-2.5 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r ${theme.border}`}
                  style={{ color: "inherit" }}>
                  <span className="text-gray-600">{field.label}</span>
                </td>
                {sessions.map((session, sIdx) => {
                  const isAutoSno = SNO_KEYS.has(field.key);
                  const isDate = DATE_KEYS.has(field.key);
                  const isSign = SIGN_KEYS.has(field.key);
                  const isPics = PICS_KEYS.has(field.key);
                  return (
                    <td key={sIdx} className="px-2 py-1.5">
                      {isAutoSno ? (
                        <div className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-center text-sm font-bold text-gray-500 select-none">
                          {sIdx + 1}
                        </div>
                      ) : isDate ? (
                        <input
                          type="date"
                          value={session[field.key] ?? today()}
                          onChange={(e) => handleCell(sIdx, field.key, e.target.value)}
                          className={`w-full min-w-[130px] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-800 outline-none transition-all focus:ring-2 ${theme.focusRing}`}
                        />
                      ) : isSign ? (
                        <SignatureCell
                          value={session[field.key] ?? ""}
                          theme={theme}
                          label={field.label}
                          onChange={(val) => handleCell(sIdx, field.key, val)}
                        />
                      ) : isPics ? (
                        <PicsCell
                          value={session[field.key] ?? ""}
                          theme={theme}
                          onChange={(val) => handleCell(sIdx, field.key, val)}
                        />
                      ) : (
                        <input
                          value={session[field.key] ?? ""}
                          onChange={(e) => handleCell(sIdx, field.key, e.target.value)}
                          className={`w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:bg-white focus:ring-2 ${theme.focusRing}`}
                          placeholder="—"
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        onClick={addSession}
        className={`flex items-center gap-2 rounded-lg border-2 border-dashed px-4 py-2 text-xs font-semibold transition-colors ${theme.addBtn}`}
      >
        <span className="text-lg leading-none">+</span> Add session
      </button>

    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = {
  miosalonPatientId: string;
  initialData: TherapySheetsData | null;
  patientName?: string;
  phoneNo?: string;
  // Controlled profile form — when provided, the button is rendered externally
  profileFormControlled?: ProfileFormData;
  onProfileFormChange?: (d: ProfileFormData) => void;
};

function padRows(rows: Row[], cols: { key: string; label: string }[], min = 5): Row[] {
  if (rows.length >= min) return rows;
  const extras = Array.from({ length: min - rows.length }, () => emptyRowWithDate(cols));
  return [...rows, ...extras];
}

function normalise(d: TherapySheetsData): TherapySheetsData {
  return {
    ...d,
    therapySheet: padRows(d.therapySheet, THERAPY_SHEET_FIELDS).map((r, i) => ({ ...r, sno: r.sno || String(i + 1) })),
    laserToning: padRows(d.laserToning, LASER_TONING_COLS),
    pipelineSheet: padRows(d.pipelineSheet, PIPELINE_COLS),
    fractionalCO2: padRows(d.fractionalCO2, FRACTIONAL_CO2_COLS),
    mnrfSheet: padRows(d.mnrfSheet, MNRF_COLS),
  };
}

export function TherapySheets({ miosalonPatientId, initialData, patientName, phoneNo, profileFormControlled, onProfileFormChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("therapySheet");
  const [data, setData] = useState<TherapySheetsData>(() => {
    const base = normalise(
      initialData
        ? {
            ...initData(),
            ...initialData,
            profileForm: initialData.profileForm ?? emptyProfileForm(),
            faceAnnotations: initialData.faceAnnotations ?? [newFaceEntry()],
            botoxFiller: initialData.botoxFiller ?? [newBotoxEntry()],
            bodyLhr: initialData.bodyLhr ?? [newBodyEntry()],
            clinicalNotes: initialData.clinicalNotes ?? [],
          }
        : initData()
    );
    // Auto-fill profile form fields from MioSalon data if not already filled
    const pf = base.profileForm;
    return {
      ...base,
      profileForm: {
        ...pf,
        idNo:    pf.idNo    || miosalonPatientId,
        name:    pf.name    || (patientName ?? ""),
        phoneNo: pf.phoneNo || (phoneNo ?? ""),
      },
    };
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const externalProfileFormRef = useRef(profileFormControlled);
  externalProfileFormRef.current = profileFormControlled;

  // Merge external profileForm (if controlled) into data before saving
  function withExternalProfile(d: TherapySheetsData): TherapySheetsData {
    return profileFormControlled !== undefined
      ? { ...d, profileForm: externalProfileFormRef.current! }
      : d;
  }

  const currentTheme = TABS.find((t) => t.id === activeTab)!;

  const scheduleAutosave = useCallback(
    (nextData: TherapySheetsData) => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
          const res = await fetch(
            `/api/patients/${encodeURIComponent(miosalonPatientId)}/therapy-sheets`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(withExternalProfile(nextData)),
            }
          );
          if (!res.ok) throw new Error("Save failed");
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        } catch {
          setError("Failed to save. Please try again.");
        } finally {
          setSaving(false);
        }
      }, 1200);
    },
    [miosalonPatientId]
  );

  function update(patch: Partial<TherapySheetsData>) {
    const next = { ...data, ...patch };
    setData(next);
    scheduleAutosave(next);
  }

  async function saveNow() {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch(
        `/api/patients/${encodeURIComponent(miosalonPatientId)}/therapy-sheets`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(withExternalProfile(data)),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">

      {/* Coloured gradient header */}
      <div className={`bg-gradient-to-r ${currentTheme.headerBg} px-6 py-4`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentTheme.emoji}</span>
              <h2 className="text-lg font-bold text-white tracking-tight">Therapy Sheets</h2>
            </div>
            <p className="mt-0.5 text-xs text-white/70 ml-9">
              Session records across all treatment types
            </p>
          </div>
          <div className="flex items-center gap-3">
            {error && (
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white">
                ⚠ {error}
              </span>
            )}
            {saved && (
              <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-semibold text-white">
                ✓ Saved
              </span>
            )}
            {/* Only show button here when not controlled externally */}
            {profileFormControlled === undefined && (
              <ProfileFormDialog
                data={data.profileForm}
                onChange={(profileForm) => update({ profileForm })}
              />
            )}
            <button
              onClick={saveNow}
              disabled={saving}
              className="rounded-xl bg-white px-5 py-2 text-sm font-bold shadow-md transition hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-60"
              style={{ color: "inherit" }}
            >
              {saving ? "Saving…" : "💾 Save"}
            </button>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex overflow-x-auto bg-white border-b-2 border-gray-100 px-3 pt-3 gap-1">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-2.5 text-xs font-semibold tracking-wide transition-all border border-b-0 ${
                active
                  ? `${tab.activeBg} ${tab.activeText} border-transparent shadow-sm translate-y-px`
                  : `bg-gray-100 text-gray-600 border-gray-200 ${tab.inactiveBg}`
              }`}
            >
              <span className="text-sm">{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sheet content */}
      <div className="p-5 bg-gray-50/50">
        {activeTab === "therapySheet" && (
          <TransposedTable
            fields={THERAPY_SHEET_FIELDS}
            sessions={data.therapySheet}
            theme={currentTheme}
            onChange={(sessions) => update({ therapySheet: sessions })}
          />
        )}
        {activeTab === "laserToning" && (
          <RowTable
            cols={LASER_TONING_COLS}
            rows={data.laserToning}
            theme={currentTheme}
            onChange={(rows) => update({ laserToning: rows })}
          />
        )}
        {activeTab === "pipelineSheet" && (
          <RowTable
            cols={PIPELINE_COLS}
            rows={data.pipelineSheet}
            theme={currentTheme}
            onChange={(rows) => update({ pipelineSheet: rows })}
          />
        )}
        {activeTab === "fractionalCO2" && (
          <RowTable
            cols={FRACTIONAL_CO2_COLS}
            rows={data.fractionalCO2}
            theme={currentTheme}
            onChange={(rows) => update({ fractionalCO2: rows })}
          />
        )}
        {activeTab === "mnrfSheet" && (
          <RowTable
            cols={MNRF_COLS}
            rows={data.mnrfSheet}
            theme={currentTheme}
            onChange={(rows) => update({ mnrfSheet: rows })}
          />
        )}

        {/* ── Face LHR Record Sheet ── */}
        <div className="mt-6 border-t-2 border-dashed border-purple-100 pt-5">
          <FaceAnnotationSection
            entries={data.faceAnnotations}
            onChange={(entries) => update({ faceAnnotations: entries })}
          />
        </div>

        {/* ── Botox / Filler Procedure Record Sheet ── */}
        <div className="mt-6 border-t-2 border-dashed border-rose-100 pt-5">
          <BotoxFillerSection
            entries={data.botoxFiller}
            onChange={(entries) => update({ botoxFiller: entries })}
          />
        </div>

        {/* ── Body LHR Record Sheet ── */}
        <div className="mt-6 border-t-2 border-dashed border-teal-100 pt-5">
          <BodyLhrSection
            entries={data.bodyLhr}
            onChange={(entries) => update({ bodyLhr: entries })}
          />
        </div>

        {/* ── Clinical Notes ── */}
        <div className="mt-6 border-t-2 border-dashed border-amber-100 pt-5">
          <ClinicalNotesSection
            notes={data.clinicalNotes}
            onChange={(notes) => update({ clinicalNotes: notes })}
          />
        </div>
      </div>

    </div>
  );
}
