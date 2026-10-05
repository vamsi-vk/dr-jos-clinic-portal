"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Stroke = {
  color: string; // "eraser" erases
  size: number; // line width at a 1000px-wide board
  pts: [number, number][]; // 0–1 relative to board size
};

const COLORS = ["#1f2937", "#e11d48", "#2563eb", "#059669", "#d97706", "#7c3aed"];
const SIZES = [
  { label: "Thin", value: 2 },
  { label: "Medium", value: 4 },
  { label: "Thick", value: 8 },
];
const ASPECT = 4 / 3;

function parse(value: string): Stroke[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke, w: number, h: number) {
  if (s.pts.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = s.color === "eraser" ? "destination-out" : "source-over";
  ctx.strokeStyle = s.color === "eraser" ? "#000" : s.color;
  ctx.fillStyle = ctx.strokeStyle;
  ctx.lineWidth = (s.size * w) / 1000;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.pts.length === 1) {
    const [x, y] = s.pts[0];
    ctx.beginPath();
    ctx.arc(x * w, y * h, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(s.pts[0][0] * w, s.pts[0][1] * h);
    for (const [x, y] of s.pts.slice(1)) ctx.lineTo(x * w, y * h);
    ctx.stroke();
  }
  ctx.restore();
}

export function Whiteboard({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>(() => parse(value));
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1].value);
  const [eraser, setEraser] = useState(false);
  const currentRef = useRef<Stroke | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (const s of strokes) drawStroke(ctx, s, w, h);
    if (currentRef.current) drawStroke(ctx, currentRef.current, w, h);
  }, [strokes]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = w / ASPECT;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      redraw();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [redraw]);

  function commit(next: Stroke[]) {
    setStrokes(next);
    onChange(next.length ? JSON.stringify(next) : "");
  }

  function point(e: React.PointerEvent<HTMLCanvasElement>): [number, number] {
    const rect = e.currentTarget.getBoundingClientRect();
    const round = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 10000) / 10000;
    return [round((e.clientX - rect.left) / rect.width), round((e.clientY - rect.top) / rect.height)];
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    currentRef.current = { color: eraser ? "eraser" : color, size: eraser ? size * 4 : size, pts: [point(e)] };
    redraw();
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const cur = currentRef.current;
    if (!cur) return;
    const p = point(e);
    const last = cur.pts[cur.pts.length - 1];
    if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 0.002) return;
    cur.pts.push(p);
    redraw();
  }

  function onPointerUp() {
    const cur = currentRef.current;
    currentRef.current = null;
    if (cur) commit([...strokes, cur]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-100 bg-white px-3 py-2">
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => { setColor(c); setEraser(false); }}
              className={`h-6 w-6 rounded-full border-2 transition ${
                !eraser && color === c ? "scale-110 border-rose-300 ring-2 ring-rose-200" : "border-white shadow"
              }`}
              style={{ backgroundColor: c }}
              aria-label={`Pen colour ${c}`}
            />
          ))}
        </div>
        <div className="h-5 w-px bg-rose-100" />
        <div className="flex items-center gap-1">
          {SIZES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSize(s.value)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                size === s.value ? "bg-rose-100 text-rose-800" : "text-gray-500 hover:bg-rose-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="h-5 w-px bg-rose-100" />
        <button
          onClick={() => setEraser((v) => !v)}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
            eraser ? "bg-rose-100 text-rose-800" : "text-gray-500 hover:bg-rose-50"
          }`}
        >
          🧽 Eraser
        </button>
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => commit(strokes.slice(0, -1))}
            disabled={strokes.length === 0}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-rose-50 disabled:opacity-40"
          >
            ↶ Undo
          </button>
          <button
            onClick={() => commit([])}
            disabled={strokes.length === 0}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </div>

      <div ref={wrapRef} className="w-full overflow-hidden rounded-xl border border-rose-200 bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          className={`block touch-none ${eraser ? "cursor-cell" : "cursor-crosshair"}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
    </div>
  );
}
