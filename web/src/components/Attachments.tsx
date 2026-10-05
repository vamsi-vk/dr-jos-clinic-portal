"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmProvider";

export type AttachmentEntry = {
  id: string;
  key: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string;
};

type Props = {
  miosalonPatientId: string;
  attachments: AttachmentEntry[];
  onChange: (next: AttachmentEntry[]) => void;
};

function fileUrl(miosalonPatientId: string, key: string) {
  return `/api/patients/${encodeURIComponent(miosalonPatientId)}/attachments?key=${encodeURIComponent(key)}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Camera capture dialog ───────────────────────────────────────────────────

function CameraDialog({ onCapture, onClose }: { onCapture: (file: File) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");

  useEffect(() => {
    let cancelled = false;
    async function start() {
      setError(null);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("Camera is not available. Allow camera access in your browser, or use Upload instead.");
      }
    }
    void start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const stamp = new Date().toISOString().replace(/[:.]/g, "-");
        onCapture(new File([blob], `photo-${stamp}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50 px-5 py-3">
          <h3 className="text-sm font-semibold text-emerald-800">Take a photo</h3>
          <button onClick={onClose} className="text-lg leading-none text-emerald-700 hover:text-emerald-900" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="relative aspect-video bg-black">
          {error ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white/80">{error}</div>
          ) : (
            <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />
          )}
        </div>
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <button
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            🔄 Switch camera
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </button>
            <button
              onClick={capture}
              disabled={!!error}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-50"
            >
              📸 Capture
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Zoomable viewer ─────────────────────────────────────────────────────────

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

function ImageViewer({
  miosalonPatientId,
  items,
  index,
  onIndexChange,
  onClose,
}: {
  miosalonPatientId: string;
  items: AttachmentEntry[];
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const item = items[index];

  const reset = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setZoom((z) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor));
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }, []);

  useEffect(reset, [index, reset]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" && index < items.length - 1) onIndexChange(index + 1);
      else if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
      else if (e.key === "+" || e.key === "=") zoomBy(1.25);
      else if (e.key === "-") zoomBy(0.8);
      else if (e.key === "0") reset();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, items.length, onClose, onIndexChange, zoomBy, reset]);

  if (!item) return null;
  const src = fileUrl(miosalonPatientId, item.key);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.name}</p>
          <p className="text-xs text-white/60">
            {index + 1} of {items.length} · {formatDate(item.uploadedAt)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => zoomBy(0.8)} className="rounded-lg px-3 py-1.5 text-lg hover:bg-white/10" aria-label="Zoom out">
            −
          </button>
          <button onClick={reset} className="min-w-[4rem] rounded-lg px-2 py-1.5 text-xs hover:bg-white/10" title="Reset zoom">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => zoomBy(1.25)} className="rounded-lg px-3 py-1.5 text-lg hover:bg-white/10" aria-label="Zoom in">
            +
          </button>
          <a href={src} target="_blank" rel="noreferrer" className="ml-2 rounded-lg px-3 py-1.5 text-xs hover:bg-white/10">
            Open original
          </a>
          <button onClick={onClose} className="ml-2 rounded-lg px-3 py-1.5 text-lg hover:bg-white/10" aria-label="Close">
            ✕
          </button>
        </div>
      </div>

      <div
        className={`relative flex-1 select-none overflow-hidden ${zoom > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
        onWheel={(e) => zoomBy(e.deltaY < 0 ? 1.15 : 0.87)}
        onDoubleClick={() => (zoom > 1 ? reset() : zoomBy(2.5))}
        onPointerDown={(e) => {
          if (zoom <= 1) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(e) => {
          const d = dragRef.current;
          if (!d) return;
          setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
        }}
        onPointerUp={() => (dragRef.current = null)}
        onPointerCancel={() => (dragRef.current = null)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={item.name}
          draggable={false}
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain transition-transform duration-75"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
        />

        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onIndexChange(index - 1); }}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl hover:bg-white/20"
            aria-label="Previous"
          >
            ‹
          </button>
        )}
        {index < items.length - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onIndexChange(index + 1); }}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl hover:bg-white/20"
            aria-label="Next"
          >
            ›
          </button>
        )}
      </div>
      <p className="pb-3 text-center text-[11px] text-white/50">
        Scroll or use + / − to zoom · drag to move · double-click to toggle zoom · Esc to close
      </p>
    </div>
  );
}

// ─── Attachments tab ─────────────────────────────────────────────────────────

export function AttachmentsSection({ miosalonPatientId, attachments, onChange }: Props) {
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [viewIdx, setViewIdx] = useState<number | null>(null);

  // Uploads finish asynchronously; always append to the newest list and use the newest onChange.
  const latestRef = useRef({ attachments, onChange });
  latestRef.current = { attachments, onChange };

  async function uploadFiles(files: File[]) {
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) {
      setError("Please choose image files.");
      return;
    }
    setError(null);
    setUploading((n) => n + images.length);

    for (const file of images) {
      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/patients/${encodeURIComponent(miosalonPatientId)}/attachments`, {
          method: "POST",
          body: form,
          credentials: "same-origin",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(data.error ?? `Could not upload ${file.name}`);
          continue;
        }
        const { attachments: current, onChange: emit } = latestRef.current;
        emit([data.attachment as AttachmentEntry, ...current]);
      } catch {
        setError(`Could not upload ${file.name}. Check your connection.`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  }

  async function remove(idx: number) {
    const item = attachments[idx];
    const ok = await confirm({ message: `Delete "${item.name}"? This cannot be undone.`, confirmLabel: "Delete image" });
    if (!ok) return;
    onChange(attachments.filter((_, i) => i !== idx));
    void fetch(fileUrl(miosalonPatientId, item.key), { method: "DELETE", credentials: "same-origin" });
  }

  return (
    <div
      className="min-w-0 space-y-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        void uploadFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-emerald-800">Attachments</p>
          <p className="text-xs text-emerald-700/70">
            Upload images or take a photo. Click any image to view and zoom.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length) void uploadFiles(files);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
          >
            ⬆️ Upload images
          </button>
          <button
            onClick={() => setCameraOpen(true)}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
          >
            📷 Take photo
          </button>
        </div>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      {uploading > 0 && (
        <p className="text-xs font-medium text-emerald-700">
          Uploading {uploading} image{uploading > 1 ? "s" : ""}…
        </p>
      )}

      {attachments.length === 0 ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-emerald-200 bg-white py-14 text-emerald-700/70 hover:border-emerald-300 hover:bg-emerald-50/40"
        >
          <span className="text-3xl">🖼️</span>
          <span className="text-sm font-medium">No images yet</span>
          <span className="text-xs">Click to upload, or drag and drop images here</span>
        </button>
      ) : (
        <div className="flex snap-x gap-4 overflow-x-auto pb-3">
          {attachments.map((item, idx) => (
            <div key={item.id} className="group w-56 shrink-0 snap-start overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <button
                onClick={() => setViewIdx(idx)}
                className="relative block aspect-square w-full overflow-hidden bg-gray-100"
                title="Click to view"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl(miosalonPatientId, item.key)}
                  alt={item.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-2xl text-white opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                  🔍
                </span>
              </button>
              <div className="flex items-start justify-between gap-2 px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-gray-700" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    {formatDate(item.uploadedAt)} · {formatSize(item.size)}
                  </p>
                </div>
                <button
                  onClick={() => void remove(idx)}
                  className="shrink-0 rounded px-1.5 text-sm text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Delete ${item.name}`}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {cameraOpen && (
        <CameraDialog
          onClose={() => setCameraOpen(false)}
          onCapture={(file) => {
            setCameraOpen(false);
            void uploadFiles([file]);
          }}
        />
      )}

      {viewIdx !== null && attachments[viewIdx] && (
        <ImageViewer
          miosalonPatientId={miosalonPatientId}
          items={attachments}
          index={viewIdx}
          onIndexChange={setViewIdx}
          onClose={() => setViewIdx(null)}
        />
      )}
    </div>
  );
}
