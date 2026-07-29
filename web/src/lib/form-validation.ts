import type { FormField } from "@/db/schema";

export type FormValidationErrors = Record<string, string>;

function isEmpty(value: unknown) {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/** Validate submitted answers against template field definitions. */
export function validateFormSubmission(
  fields: FormField[],
  data: Record<string, unknown>
): FormValidationErrors {
  const errors: FormValidationErrors = {};

  for (const field of fields) {
    if (field.type === "section") continue;

    const value = data[field.name];

    if (field.required && isEmpty(value)) {
      errors[field.name] = `${field.label} is required`;
      continue;
    }

    if (isEmpty(value)) continue;

    switch (field.type) {
      case "number":
      case "decimal": {
        const n = Number(value);
        if (!Number.isFinite(n)) {
          errors[field.name] = `${field.label} must be a number`;
        }
        break;
      }
      case "select": {
        const v = String(value);
        if (field.options?.length && !field.options.includes(v)) {
          errors[field.name] = `Select a valid option for ${field.label}`;
        }
        break;
      }
      case "multiselect": {
        if (!Array.isArray(value)) {
          errors[field.name] = `${field.label} must be a list of options`;
          break;
        }
        const invalid = value.some(
          (v) => typeof v !== "string" || !(field.options ?? []).includes(v)
        );
        if (invalid) {
          errors[field.name] = `Select valid options for ${field.label}`;
        }
        break;
      }
      case "daterange": {
        if (
          typeof value !== "object" ||
          value === null ||
          !("start" in value) ||
          !("end" in value) ||
          isEmpty((value as { start?: unknown }).start) ||
          isEmpty((value as { end?: unknown }).end)
        ) {
          errors[field.name] = `${field.label} requires a start and end date`;
        }
        break;
      }
      case "signature": {
        const v = typeof value === "string" ? value : "";
        if (field.required && (!v.startsWith("data:image/") || v.length < 120)) {
          errors[field.name] = `${field.label} signature is required`;
        }
        break;
      }
    }
  }

  return errors;
}
