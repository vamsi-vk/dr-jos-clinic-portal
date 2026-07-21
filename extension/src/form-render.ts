/** Render form template JSON as HTML inputs inside the extension sidebar */

export type FormFieldJson = {
  id: string;
  name: string;
  label: string;
  type: string;
  options?: string[];
  required?: boolean;
  displayOrder: number;
};

export type FormTemplateJson = {
  id: string;
  name: string;
  fields: FormFieldJson[];
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderField(f: FormFieldJson, value: unknown): string {
  const req = f.required ? " required" : "";
  const val = value != null && value !== "" ? String(value) : "";
  const dataName = esc(f.name);

  if (f.type === "section") {
    return `<h4 class="form-section">${esc(f.label)}</h4>`;
  }

  let input = "";
  switch (f.type) {
    case "textarea":
      input = `<textarea class="inp" data-field="${dataName}" rows="3"${req}>${esc(val)}</textarea>`;
      break;
    case "select":
      input = `<select class="inp" data-field="${dataName}"${req}>
        <option value="">—</option>
        ${(f.options ?? [])
          .map(
            (o) =>
              `<option value="${esc(o)}"${o === val ? " selected" : ""}>${esc(o)}</option>`
          )
          .join("")}
      </select>`;
      break;
    case "boolean":
      input = `<label class="chk"><input type="checkbox" data-field="${dataName}" data-bool="1"${
        val === "true" || value === true ? " checked" : ""
      }${req} /> Yes</label>`;
      break;
    case "number":
    case "decimal":
      input = `<input class="inp" type="number" data-field="${dataName}" value="${esc(val)}"${req} />`;
      break;
    case "date":
      input = `<input class="inp" type="date" data-field="${dataName}" value="${esc(val)}"${req} />`;
      break;
    default:
      input = `<input class="inp" type="text" data-field="${dataName}" value="${esc(val)}"${req} />`;
  }

  return `<label class="fld"><span class="lbl">${esc(f.label)}${
    f.required ? ' <span class="req">*</span>' : ""
  }</span>${input}</label>`;
}

export function renderFormHtml(
  template: FormTemplateJson,
  data: Record<string, unknown>
): string {
  const fields = [...template.fields].sort((a, b) => a.displayOrder - b.displayOrder);
  return `
    <div class="form-block" data-template-id="${esc(template.id)}">
      <h3 class="form-title">${esc(template.name)}</h3>
      ${fields.map((f) => renderField(f, data[f.name])).join("")}
      <button type="button" class="save-form-btn" data-template-id="${esc(template.id)}">Save answers</button>
      <p class="form-msg" data-form-msg="${esc(template.id)}"></p>
    </div>
  `;
}

export function collectFormData(container: ParentNode, templateId: string): Record<string, unknown> {
  const block = container.querySelector(`[data-template-id="${templateId}"]`);
  if (!block) return {};

  const data: Record<string, unknown> = {};
  block.querySelectorAll<HTMLElement>("[data-field]").forEach((el) => {
    const name = el.getAttribute("data-field");
    if (!name) return;
    if (el instanceof HTMLInputElement && el.type === "checkbox") {
      data[name] = el.checked;
    } else if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      data[name] = el.value;
    } else if (el instanceof HTMLSelectElement) {
      data[name] = el.value;
    }
  });
  return data;
}

export const formStyles = `
  .form-block { margin-bottom: 16px; }
  .form-title { margin: 0 0 10px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #78716c; }
  .form-section { margin: 12px 0 6px; font-size: 13px; font-weight: 600; color: #1c1917; }
  .fld { display: block; margin-bottom: 10px; }
  .lbl { display: block; font-size: 11px; font-weight: 600; color: #57534e; margin-bottom: 4px; }
  .req { color: #b91c1c; }
  .inp { width: 100%; box-sizing: border-box; border: 1px solid #d6d3d1; border-radius: 6px; padding: 6px 8px; font-size: 12px; }
  .chk { font-size: 12px; display: flex; align-items: center; gap: 6px; }
  .save-form-btn {
    width: 100%; margin-top: 8px; border: 0; border-radius: 6px; padding: 8px;
    background: #0f766e; color: #fff; font-weight: 600; font-size: 12px; cursor: pointer;
  }
  .save-form-btn:hover { background: #115e59; }
  .form-msg { font-size: 11px; margin-top: 6px; min-height: 14px; }
  .form-msg.ok { color: #0f766e; }
  .form-msg.err { color: #b91c1c; }
`;
