/** Read-only form summary for View dialog */

export type FormFieldJson = {
  id: string;
  name: string;
  label: string;
  type: string;
  options?: string[];
  displayOrder: number;
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatValue(field: FormFieldJson, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "boolean") return value === true || value === "true" ? "Yes" : "No";
  if (field.type === "multiselect" && Array.isArray(value)) {
    return value.length ? value.map(String).join(", ") : "—";
  }
  if (field.type === "daterange" && typeof value === "object" && value !== null) {
    const v = value as { start?: string; end?: string };
    return `${v.start ?? "—"} → ${v.end ?? "—"}`;
  }
  if (field.type === "signature" && typeof value === "string" && value.startsWith("data:image/")) {
    return `__SIG__${value}`;
  }
  return String(value);
}

export function renderReadonlySummaryHtml(
  title: string,
  fields: FormFieldJson[],
  data: Record<string, unknown>
): string {
  const ordered = [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
  const rows = ordered
    .map((f) => {
      if (f.type === "section") {
        return `<h4 class="view-section">${esc(f.label)}</h4>`;
      }
      const raw = formatValue(f, data[f.name]);
      if (raw.startsWith("__SIG__")) {
        const src = raw.slice(7);
        return `<div class="view-row"><div class="view-label">${esc(f.label)}</div><div class="view-value"><img class="view-sig" src="${esc(src)}" alt="Signature" /></div></div>`;
      }
      return `<div class="view-row"><div class="view-label">${esc(f.label)}</div><div class="view-value">${esc(raw).replace(/\n/g, "<br/>")}</div></div>`;
    })
    .join("");

  return `
    <div class="view-summary">
      <h3 class="view-title">${esc(title)}</h3>
      ${rows || `<p class="muted">No answers recorded.</p>`}
    </div>
  `;
}

export const viewDialogStyles = `
  .modal-backdrop {
    pointer-events: auto;
    position: fixed;
    inset: 0;
    background: rgba(15, 20, 25, 0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 10;
  }
  .modal {
    pointer-events: auto;
    width: min(560px, 100%);
    max-height: min(80vh, 720px);
    overflow: auto;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.25);
    padding: 20px;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #e7e5e4;
  }
  .modal-btn {
    border: 1px solid #d6d3d1;
    background: #fff;
    border-radius: 6px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    color: #1c1917;
  }
  .modal-btn.primary {
    background: #0f766e;
    border-color: #0f766e;
    color: #fff;
  }
  .modal-btn:hover { background: #f5f5f4; }
  .modal-btn.primary:hover { background: #115e59; }
  .view-title { margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #1c1917; }
  .view-section { margin: 16px 0 8px; font-size: 13px; font-weight: 600; color: #0f766e; border-bottom: 1px solid #e7e5e4; padding-bottom: 4px; }
  .view-row { margin-bottom: 12px; }
  .view-label { font-size: 11px; font-weight: 600; color: #78716c; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 2px; }
  .view-value { font-size: 13px; color: #1c1917; line-height: 1.45; word-break: break-word; }
  .view-sig { max-width: 220px; max-height: 80px; border: 1px solid #e7e5e4; border-radius: 4px; background: #fff; }
`;
