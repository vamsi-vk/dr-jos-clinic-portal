import type { FormField } from "@/db/schema";

export const FIELD_TYPE_OPTIONS: { type: FormField["type"]; label: string }[] = [
  { type: "text", label: "Short text" },
  { type: "textarea", label: "Long text" },
  { type: "number", label: "Number" },
  { type: "select", label: "Dropdown" },
  { type: "boolean", label: "Yes / No" },
  { type: "date", label: "Date" },
  { type: "section", label: "Section heading" },
];

export function newField(type: FormField["type"], order: number): FormField {
  const id = crypto.randomUUID();
  const base = {
    id,
    name: `field_${id.slice(0, 8)}`,
    label: FIELD_TYPE_OPTIONS.find((f) => f.type === type)?.label ?? "Field",
    type,
    displayOrder: order,
    required: false,
  };
  if (type === "select") {
    return { ...base, options: ["Option 1", "Option 2"] };
  }
  return base;
}

export function normalizeFieldOrder(fields: FormField[]): FormField[] {
  return fields.map((f, i) => ({ ...f, displayOrder: i }));
}
