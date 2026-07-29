"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormField } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { SignaturePad } from "@/components/signature-pad";

type PublicFormProps = {
  token: string;
  name: string;
  description: string | null;
  fields: FormField[];
  miosalonPatientId?: string | null;
  networkId?: string | null;
  storeId?: string | null;
  activeUserId?: string | null;
  clinicName?: string;
};

function sortedFields(fields: FormField[]) {
  return [...fields].sort((a, b) => a.displayOrder - b.displayOrder);
}

function pdfUrl(token: string, patientId: string, submissionId?: string | null) {
  const params = new URLSearchParams({ patient: patientId });
  if (submissionId) params.set("submissionId", submissionId);
  return `/api/public/forms/${encodeURIComponent(token)}/pdf?${params.toString()}`;
}

export function PublicForm({
  token,
  name,
  description,
  fields,
  miosalonPatientId = null,
  networkId = null,
  storeId = null,
  activeUserId = null,
  clinicName,
}: PublicFormProps) {
  const ordered = useMemo(() => sortedFields(fields), [fields]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!miosalonPatientId) return;
    void fetch(
      `/api/public/forms/${encodeURIComponent(token)}/latest?patient=${encodeURIComponent(miosalonPatientId)}`
    )
      .then((r) => r.json())
      .then((body) => {
        if (body?.submission?.id) {
          setSubmissionId(body.submission.id);
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, [token, miosalonPatientId]);

  function setField(name: string, value: unknown) {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/public/forms/${encodeURIComponent(token)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: values,
          miosalonPatientId,
          networkId,
          storeId,
          activeUserId,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (res.status === 422 && body?.details?.errors) {
        setErrors(body.details.errors as Record<string, string>);
        return;
      }

      if (!res.ok) {
        setSubmitError(body?.error ?? "Could not submit form. Please try again.");
        return;
      }

      setSubmissionId(body.submissionId ?? null);
      setSubmitted(true);
    } catch {
      setSubmitError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const pdfHref =
    miosalonPatientId && submissionId
      ? pdfUrl(token, miosalonPatientId, submissionId)
      : null;

  if (submitted) {
    return (
      <Card className="mx-auto max-w-xl text-center">
        <CardBody className="space-y-4 py-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-muted text-2xl text-accent">
            ✓
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Thank you</h2>
          <p className="text-sm text-muted-foreground">
            Your responses for <strong>{name}</strong> have been submitted successfully
            {miosalonPatientId ? (
              <>
                {" "}
                and linked to customer{" "}
                <span className="font-mono text-foreground">{miosalonPatientId}</span>
              </>
            ) : null}
            .
          </p>
          {pdfHref ? (
            <div className="pt-2">
              <a href={pdfHref} download>
                <Button type="button">Download agreement PDF</Button>
              </a>
              <p className="mt-2 text-xs text-muted-foreground">
                Save or share this PDF with the customer as a signed agreement record.
              </p>
            </div>
          ) : null}
        </CardBody>
      </Card>
    );
  }

  if (!miosalonPatientId) {
    return (
      <Card className="mx-auto max-w-xl">
        <CardHeader
          title={name}
          description="This form must be opened from a customer-linked QR code."
        />
        <CardBody>
          <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-3 text-sm text-muted-foreground">
            Missing customer ID. Open the customer&apos;s page in your salon system, then use the
            extension to generate a QR code. That link includes the customer ID so answers are
            saved to their record.
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {pdfHref ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-xs">
          <div>
            <p className="text-sm font-medium text-foreground">Previous submission on file</p>
            <p className="text-xs text-muted-foreground">
              Download the agreement PDF for this customer
            </p>
          </div>
          <a href={pdfHref} download>
            <Button type="button" variant="outline" size="sm">
              Download PDF
            </Button>
          </a>
        </div>
      ) : null}

      <Card>
        <CardHeader title={name} description={description} />
        <CardBody>
          {clinicName ? (
            <p className="mb-4 text-xs uppercase tracking-wide text-muted-foreground">
              {clinicName}
            </p>
          ) : null}
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
            {ordered.map((field) => {
              if (field.type === "section") {
                return (
                  <h2
                    key={field.id}
                    className="border-b border-border pb-2 pt-2 text-sm font-semibold text-foreground"
                  >
                    {field.label}
                  </h2>
                );
              }

              const err = errors[field.name];
              const inputClass =
                "w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-xs outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft";

              return (
                <div key={field.id} className="space-y-1.5">
                  <label htmlFor={field.id} className="block text-sm font-medium text-foreground">
                    {field.label}
                    {field.required ? <span className="text-danger"> *</span> : null}
                  </label>

                  {field.type === "textarea" ? (
                    <textarea
                      id={field.id}
                      className={inputClass}
                      rows={4}
                      required={field.required}
                      value={String(values[field.name] ?? "")}
                      onChange={(e) => setField(field.name, e.target.value)}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={field.id}
                      className={inputClass}
                      required={field.required}
                      value={String(values[field.name] ?? "")}
                      onChange={(e) => setField(field.name, e.target.value)}
                    >
                      <option value="">Select…</option>
                      {(field.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "multiselect" ? (
                    <div className="space-y-2 rounded-md border border-input bg-background p-3">
                      {(field.options ?? []).map((opt) => {
                        const selected = Array.isArray(values[field.name])
                          ? (values[field.name] as string[]).includes(opt)
                          : false;
                        return (
                          <label key={opt} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => {
                                const current = Array.isArray(values[field.name])
                                  ? [...(values[field.name] as string[])]
                                  : [];
                                if (e.target.checked) current.push(opt);
                                else {
                                  const idx = current.indexOf(opt);
                                  if (idx >= 0) current.splice(idx, 1);
                                }
                                setField(field.name, current);
                              }}
                            />
                            {opt}
                          </label>
                        );
                      })}
                    </div>
                  ) : field.type === "boolean" ? (
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        id={field.id}
                        type="checkbox"
                        checked={Boolean(values[field.name])}
                        onChange={(e) => setField(field.name, e.target.checked)}
                      />
                      Yes
                    </label>
                  ) : field.type === "number" || field.type === "decimal" ? (
                    <input
                      id={field.id}
                      type="number"
                      step={field.type === "decimal" ? "any" : "1"}
                      className={inputClass}
                      required={field.required}
                      value={values[field.name] != null ? String(values[field.name]) : ""}
                      onChange={(e) => setField(field.name, e.target.value)}
                    />
                  ) : field.type === "date" ? (
                    <input
                      id={field.id}
                      type="date"
                      className={inputClass}
                      required={field.required}
                      value={String(values[field.name] ?? "")}
                      onChange={(e) => setField(field.name, e.target.value)}
                    />
                  ) : field.type === "daterange" ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input
                        type="date"
                        className={inputClass}
                        aria-label={`${field.label} start`}
                        value={
                          typeof values[field.name] === "object" &&
                          values[field.name] !== null &&
                          "start" in (values[field.name] as object)
                            ? String((values[field.name] as { start?: string }).start ?? "")
                            : ""
                        }
                        onChange={(e) => {
                          const prev =
                            typeof values[field.name] === "object" &&
                            values[field.name] !== null
                              ? (values[field.name] as { start?: string; end?: string })
                              : {};
                          setField(field.name, { ...prev, start: e.target.value });
                        }}
                      />
                      <input
                        type="date"
                        className={inputClass}
                        aria-label={`${field.label} end`}
                        value={
                          typeof values[field.name] === "object" &&
                          values[field.name] !== null &&
                          "end" in (values[field.name] as object)
                            ? String((values[field.name] as { end?: string }).end ?? "")
                            : ""
                        }
                        onChange={(e) => {
                          const prev =
                            typeof values[field.name] === "object" &&
                            values[field.name] !== null
                              ? (values[field.name] as { start?: string; end?: string })
                              : {};
                          setField(field.name, { ...prev, end: e.target.value });
                        }}
                      />
                    </div>
                  ) : field.type === "signature" ? (
                    <SignaturePad
                      value={
                        typeof values[field.name] === "string"
                          ? (values[field.name] as string)
                          : null
                      }
                      onChange={(dataUrl) => setField(field.name, dataUrl)}
                    />
                  ) : (
                    <input
                      id={field.id}
                      type="text"
                      className={inputClass}
                      required={field.required}
                      value={String(values[field.name] ?? "")}
                      onChange={(e) => setField(field.name, e.target.value)}
                    />
                  )}

                  {err ? <p className="text-xs text-danger">{err}</p> : null}
                </div>
              );
            })}

            {submitError ? (
              <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
                {submitError}
              </p>
            ) : null}

            <Button type="submit" className="w-full" loading={submitting}>
              Submit form
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
