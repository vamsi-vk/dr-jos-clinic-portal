/**
 * Whiteboard dialog — freehand draw + shapes for customer clinical notes.
 */

export type WhiteboardItem = {
  id: string;
  imageData: string;
  createdAt: string;
  updatedAt: string;
};

type Tool = "pencil" | "eraser" | "line" | "rect" | "ellipse";

type WhiteboardDialogOpts = {
  shadowRoot: ShadowRoot;
  title?: string;
  /** When set, opens in view mode (read-only image). */
  viewImageData?: string | null;
  onSave?: (imageDataUrl: string) => Promise<WhiteboardItem | null>;
  onClose: () => void;
};

const COLORS = [
  "#111827",
  "#dc2626",
  "#ea580c",
  "#ca8a04",
  "#16a34a",
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ffffff",
];

const SIZES = [
  { label: "S", value: 2 },
  { label: "M", value: 4 },
  { label: "L", value: 8 },
  { label: "XL", value: 14 },
];

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const whiteboardDialogStyles = `
  .wb-modal {
    width: min(720px, 100%);
    max-height: min(90vh, 860px);
  }
  .wb-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    margin-bottom: 10px;
  }
  .wb-toolbar .wb-group {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
    padding-right: 8px;
    margin-right: 4px;
    border-right: 1px solid #e7e5e4;
  }
  .wb-toolbar .wb-group:last-child { border-right: 0; padding-right: 0; margin-right: 0; }
  .wb-toolbar button {
    border: 1px solid #d6d3d1;
    background: #fff;
    border-radius: 4px;
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    color: #44403c;
  }
  .wb-toolbar button.is-active {
    background: #0f766e;
    border-color: #0f766e;
    color: #fff;
  }
  .wb-toolbar button.danger {
    color: #b91c1c;
    border-color: #fecaca;
  }
  .wb-swatch {
    width: 22px;
    height: 22px;
    border-radius: 999px;
    border: 2px solid #d6d3d1;
    padding: 0;
    cursor: pointer;
  }
  .wb-swatch.is-active { border-color: #0f766e; box-shadow: 0 0 0 2px rgba(15,118,110,0.25); }
  .wb-canvas-wrap {
    position: relative;
    border: 1px solid #d6d3d1;
    border-radius: 8px;
    overflow: hidden;
    background:
      linear-gradient(45deg, #f5f5f4 25%, transparent 25%),
      linear-gradient(-45deg, #f5f5f4 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #f5f5f4 75%),
      linear-gradient(-45deg, transparent 75%, #f5f5f4 75%);
    background-size: 16px 16px;
    background-position: 0 0, 0 8px, 8px -8px, -8px 0;
    background-color: #fff;
  }
  .wb-canvas-wrap canvas {
    display: block;
    width: 100%;
    height: auto;
    touch-action: none;
    cursor: crosshair;
    background: #fff;
  }
  .wb-view-img {
    display: block;
    width: 100%;
    height: auto;
    border: 1px solid #d6d3d1;
    border-radius: 8px;
    background: #fff;
  }
  .wb-status { font-size: 11px; min-height: 14px; margin-top: 8px; color: #78716c; }
  .wb-status.ok { color: #0f766e; }
  .wb-status.err { color: #b91c1c; }
`;

export function closeWhiteboardDialog(shadowRoot: ShadowRoot) {
  shadowRoot.getElementById("whiteboardHost")?.remove();
}

export function openWhiteboardDialog(opts: WhiteboardDialogOpts) {
  const { shadowRoot, title = "Whiteboard", viewImageData, onSave, onClose } = opts;
  closeWhiteboardDialog(shadowRoot);

  const isView = Boolean(viewImageData);

  const host = document.createElement("div");
  host.id = "whiteboardHost";
  host.innerHTML = `
    <div class="modal-backdrop" id="wbBackdrop">
      <div class="modal wb-modal" role="dialog" aria-modal="true" aria-label="Whiteboard">
        <h3 class="view-title">${esc(title)}${isView ? " (View)" : ""}</h3>
        ${
          isView
            ? `<img class="wb-view-img" src="${esc(viewImageData!)}" alt="Saved whiteboard" />`
            : `
        <div class="wb-toolbar" id="wbToolbar">
          <div class="wb-group">
            <button type="button" data-tool="pencil" class="is-active" title="Pencil">Pencil</button>
            <button type="button" data-tool="eraser" title="Eraser">Eraser</button>
          </div>
          <div class="wb-group">
            <button type="button" data-tool="line" title="Line">Line</button>
            <button type="button" data-tool="rect" title="Rectangle">Rect</button>
            <button type="button" data-tool="ellipse" title="Ellipse">Oval</button>
          </div>
          <div class="wb-group" id="wbSizes">
            ${SIZES.map(
              (s, i) =>
                `<button type="button" data-size="${s.value}" class="${i === 1 ? "is-active" : ""}" title="Pen size ${s.label}">${s.label}</button>`
            ).join("")}
          </div>
          <div class="wb-group" id="wbColors">
            ${COLORS.map(
              (c, i) =>
                `<button type="button" class="wb-swatch${i === 0 ? " is-active" : ""}" data-color="${c}" style="background:${c}${c === "#ffffff" ? ";box-shadow:inset 0 0 0 1px #d6d3d1" : ""}" title="${c}" aria-label="Color ${c}"></button>`
            ).join("")}
          </div>
          <div class="wb-group">
            <button type="button" class="danger" data-action="clear" title="Clear board">Clear</button>
          </div>
        </div>
        <div class="wb-canvas-wrap">
          <canvas id="wbCanvas" width="680" height="420"></canvas>
        </div>
        `
        }
        <div class="modal-actions">
          <button type="button" class="modal-btn" id="wbClose">${isView ? "Close" : "Cancel"}</button>
          ${
            isView
              ? ""
              : `<button type="button" class="modal-btn primary" id="wbSave">Save Whiteboard</button>`
          }
        </div>
        <p class="wb-status" id="wbStatus"></p>
      </div>
    </div>
  `;
  shadowRoot.appendChild(host);

  const setStatus = (text: string, kind: "" | "ok" | "err" = "") => {
    const el = host.querySelector("#wbStatus");
    if (!el) return;
    el.textContent = text;
    el.className = kind ? `wb-status ${kind}` : "wb-status";
  };

  const close = () => {
    closeWhiteboardDialog(shadowRoot);
    onClose();
  };

  host.querySelector("#wbClose")?.addEventListener("click", close);
  host.querySelector("#wbBackdrop")?.addEventListener("click", (ev) => {
    if (ev.target === host.querySelector("#wbBackdrop")) close();
  });

  if (isView) return;

  const canvas = host.querySelector("#wbCanvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    setStatus("Could not start whiteboard", "err");
    return;
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  let tool: Tool = "pencil";
  let color = COLORS[0];
  let size = SIZES[1].value;
  let drawing = false;
  let startX = 0;
  let startY = 0;
  let snapshot: ImageData | null = null;

  function pointerPos(ev: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (ev.clientX - rect.left) * scaleX,
      y: (ev.clientY - rect.top) * scaleY,
    };
  }

  function applyStrokeStyle() {
    if (!ctx) return;
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.fillStyle = "rgba(0,0,0,1)";
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
    }
    ctx.lineWidth = size;
  }

  function drawShape(x1: number, y1: number, x2: number, y2: number) {
    if (!ctx || !snapshot) return;
    ctx.putImageData(snapshot, 0, 0);
    applyStrokeStyle();
    ctx.beginPath();
    if (tool === "line") {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (tool === "rect") {
      ctx.strokeRect(
        Math.min(x1, x2),
        Math.min(y1, y2),
        Math.abs(x2 - x1),
        Math.abs(y2 - y1)
      );
    } else if (tool === "ellipse") {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(rx, 0.5), Math.max(ry, 0.5), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  host.querySelector("#wbToolbar")?.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement).closest("button") as HTMLButtonElement | null;
    if (!btn) return;

    const nextTool = btn.getAttribute("data-tool") as Tool | null;
    if (nextTool) {
      tool = nextTool;
      host.querySelectorAll("#wbToolbar [data-tool]").forEach((el) => {
        el.classList.toggle("is-active", el === btn);
      });
      return;
    }

    const nextSize = btn.getAttribute("data-size");
    if (nextSize) {
      size = Number(nextSize);
      host.querySelectorAll("#wbSizes button").forEach((el) => {
        el.classList.toggle("is-active", el === btn);
      });
      return;
    }

    const nextColor = btn.getAttribute("data-color");
    if (nextColor) {
      color = nextColor;
      if (tool === "eraser") {
        tool = "pencil";
        host.querySelectorAll("#wbToolbar [data-tool]").forEach((el) => {
          el.classList.toggle("is-active", el.getAttribute("data-tool") === "pencil");
        });
      }
      host.querySelectorAll("#wbColors .wb-swatch").forEach((el) => {
        el.classList.toggle("is-active", el === btn);
      });
      return;
    }

    if (btn.getAttribute("data-action") === "clear") {
      ctx.fillStyle = "#ffffff";
      ctx.globalCompositeOperation = "source-over";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setStatus("Board cleared");
    }
  });

  canvas.addEventListener("pointerdown", (ev) => {
    ev.preventDefault();
    canvas.setPointerCapture(ev.pointerId);
    const { x, y } = pointerPos(ev);
    drawing = true;
    startX = x;
    startY = y;
    applyStrokeStyle();

    if (tool === "pencil" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  });

  canvas.addEventListener("pointermove", (ev) => {
    if (!drawing) return;
    const { x, y } = pointerPos(ev);
    if (tool === "pencil" || tool === "eraser") {
      applyStrokeStyle();
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      drawShape(startX, startY, x, y);
    }
  });

  const endStroke = (ev: PointerEvent) => {
    if (!drawing) return;
    drawing = false;
    try {
      canvas.releasePointerCapture(ev.pointerId);
    } catch {
      /* already released */
    }
    const { x, y } = pointerPos(ev);
    if (tool !== "pencil" && tool !== "eraser") {
      drawShape(startX, startY, x, y);
      snapshot = null;
    }
    ctx.beginPath();
  };

  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);

  host.querySelector("#wbSave")?.addEventListener("click", () => {
    void (async () => {
      if (!onSave) return;
      const saveBtn = host.querySelector("#wbSave") as HTMLButtonElement;
      saveBtn.disabled = true;
      setStatus("Saving…");
      try {
        const imageData = canvas.toDataURL("image/png");
        const saved = await onSave(imageData);
        if (!saved) {
          setStatus("Save failed", "err");
          return;
        }
        setStatus("Saved", "ok");
        close();
      } catch {
        setStatus("Could not save whiteboard", "err");
      } finally {
        saveBtn.disabled = false;
      }
    })();
  });
}
