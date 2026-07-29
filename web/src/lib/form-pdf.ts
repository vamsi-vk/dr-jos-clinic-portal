import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { FormField } from "@/db/schema";

function formatValue(field: FormField, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (field.type === "boolean") return value ? "Yes" : "No";
  if (field.type === "multiselect" && Array.isArray(value)) return value.join(", ");
  if (field.type === "daterange" && typeof value === "object" && value !== null) {
    const v = value as { start?: string; end?: string };
    return `${v.start ?? "—"} → ${v.end ?? "—"}`;
  }
  if (field.type === "signature") return value ? "[Signed]" : "—";
  return String(value);
}

function isSignatureDataUrl(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("data:image/");
}

async function embedSignatureImage(pdfDoc: PDFDocument, dataUrl: string) {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return null;
  const bytes = Buffer.from(base64, "base64");
  if (dataUrl.includes("image/png")) {
    return pdfDoc.embedPng(bytes);
  }
  return pdfDoc.embedJpg(bytes);
}

export async function generateFormAgreementPdf(opts: {
  clinicName: string;
  formName: string;
  formDescription?: string | null;
  patientId: string;
  fields: FormField[];
  data: Record<string, unknown>;
  submittedAt: Date;
}) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let page = pdfDoc.addPage([595.28, 841.89]);
  const margin = 50;
  let y = 800;
  const lineHeight = 16;
  const maxWidth = 495;

  function ensureSpace(needed: number) {
    if (y - needed < 60) {
      page = pdfDoc.addPage([595.28, 841.89]);
      y = 800;
    }
  }

  function drawText(text: string, size = 11, bold = false) {
    ensureSpace(lineHeight);
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.06, 0.08, 0.1),
      maxWidth,
    });
    y -= lineHeight + (Math.ceil(text.length / 80) - 1) * lineHeight;
  }

  page.drawText(opts.clinicName, {
    x: margin,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.06, 0.47, 0.43),
  });
  y -= 28;

  drawText("Form Agreement", 14, true);
  drawText(opts.formName, 12, true);
  if (opts.formDescription) drawText(opts.formDescription, 10);
  drawText(`Customer ID: ${opts.patientId}`, 10);
  drawText(`Submitted: ${opts.submittedAt.toLocaleString()}`, 10);
  y -= 8;

  const ordered = [...opts.fields].sort((a, b) => a.displayOrder - b.displayOrder);

  for (const field of ordered) {
    if (field.type === "section") {
      y -= 6;
      drawText(field.label, 12, true);
      continue;
    }

    const value = opts.data[field.name];
    drawText(`${field.label}${field.required ? " *" : ""}`, 10, true);

    if (field.type === "signature" && isSignatureDataUrl(value)) {
      try {
        const img = await embedSignatureImage(pdfDoc, value);
        if (img) {
          ensureSpace(90);
          const imgW = 180;
          const imgH = 60;
          page.drawImage(img, {
            x: margin,
            y: y - imgH,
            width: imgW,
            height: imgH,
          });
          y -= imgH + 12;
        }
      } catch {
        drawText("[Signature on file]", 10);
      }
    } else {
      drawText(formatValue(field, value), 10);
    }
    y -= 4;
  }

  y -= 12;
  drawText(
    "This document was generated electronically and constitutes a record of the submitted form.",
    9
  );

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
