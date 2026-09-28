"use client";

import { useState } from "react";
import { ProfileForm, type ProfileFormData } from "@/components/ProfileForm";

export function ProfileFormDialog({
  data,
  onChange,
}: {
  data: ProfileFormData;
  onChange: (d: ProfileFormData) => void;
}) {
  const [open, setOpen] = useState(false);

  const hasData = Object.values(data).some((v) => v && v.trim() !== "");

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 shadow-sm hover:bg-rose-100 hover:border-rose-300 transition-all"
      >
        <span className="text-base">📋</span>
        Profile Form
        {hasData && (
          <span className="ml-1 rounded-full bg-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800">
            Filled
          </span>
        )}
      </button>

      {/* Modal backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          {/* Dialog panel */}
          <div className="relative flex w-full max-w-3xl max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-[#fdf8f6] shadow-2xl ring-1 ring-rose-100">

            {/* Dialog header */}
            <div className="flex items-center justify-between border-b border-rose-100 bg-rose-100/80 px-6 py-4 shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-xl">📋</span>
                <div>
                  <p className="text-base font-bold text-rose-900">Profile Form</p>
                  <p className="text-xs text-rose-700/60">Jo&apos;s Skin Revive — Dermatology &amp; Cosmetology Clinic</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg bg-white/70 hover:bg-white p-2 text-rose-500 transition-colors"
                aria-label="Close"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6">
              <ProfileFormBody data={data} onChange={onChange} />
            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-rose-100 bg-white px-6 py-4 flex justify-end">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl bg-rose-400 hover:bg-rose-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Inline form body (no header, no collapse — dialog provides those) ────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex items-start gap-2 min-w-0">
      <span className="shrink-0 text-xs font-semibold text-gray-500 pt-2 w-36 text-right">{label}</span>
      <span className="text-gray-300 pt-2">:</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? "—"}
        className="flex-1 min-w-0 border-b border-dotted border-rose-200 bg-transparent py-1.5 text-sm text-gray-800 outline-none focus:border-rose-400 transition-colors placeholder:text-rose-200"
      />
    </div>
  );
}

function TextareaField({
  label,
  value,
  onChange,
  rows = 2,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="shrink-0 text-xs font-semibold text-gray-500 pt-2 w-36 text-right">{label}</span>
      <span className="text-gray-300 pt-2">:</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder="—"
        className="flex-1 border-b border-dotted border-rose-200 bg-transparent py-1.5 text-sm text-gray-800 outline-none focus:border-rose-400 transition-colors resize-none placeholder:text-rose-200"
      />
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <span className="text-sm font-semibold text-rose-800">{label}</span>
      <div className="flex-1 h-px bg-rose-200" />
    </div>
  );
}

function ProfileFormBody({
  data,
  onChange,
}: {
  data: ProfileFormData;
  onChange: (d: ProfileFormData) => void;
}) {
  function field(key: keyof ProfileFormData) {
    return (val: string) => onChange({ ...data, [key]: val });
  }

  return (
    <div className="space-y-5">
      {/* Basic info */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Field label="Name"               value={data.name}              onChange={field("name")} />
          <Field label="Age / Sex"          value={data.ageSex}            onChange={field("ageSex")} />
          <Field label="Phone No"           value={data.phoneNo}           onChange={field("phoneNo")} type="tel" />
          <Field label="Address"            value={data.address}           onChange={field("address")} />
          <Field label="Email Id"           value={data.emailId}           onChange={field("emailId")} type="email" />
          <Field label="Source of Referral" value={data.sourceOfReferral}  onChange={field("sourceOfReferral")} />
        </div>
        <div className="space-y-2">
          <Field label="ID No"   value={data.idNo}    onChange={field("idNo")} />
          <Field label="Date"    value={data.date}    onChange={field("date")} type="date" />
          <Field label="Wt"      value={data.weight}  onChange={field("weight")} placeholder="kg" />
          <Field label="Height"  value={data.height}  onChange={field("height")} placeholder="cm" />
          <Field label="BP"      value={data.bp}      onChange={field("bp")} placeholder="mmHg" />
        </div>
      </div>

      <div className="border-t border-gray-100" />

      {/* History */}
      <div className="space-y-3">
        <TextareaField label="Present history"    value={data.presentHistory}    onChange={field("presentHistory")} rows={2} />
        <TextareaField label="Past history"       value={data.pastHistory}       onChange={field("pastHistory")} rows={2} />
        <TextareaField label="Family history"     value={data.familyHistory}     onChange={field("familyHistory")} rows={2} />
        <TextareaField label="Personal history"   value={data.personalHistory}   onChange={field("personalHistory")} rows={1} />
        <TextareaField label="Medication history" value={data.medicationHistory} onChange={field("medicationHistory")} rows={2} />
        <TextareaField label="Co-morbidities"     value={data.coMorbidities}     onChange={field("coMorbidities")} rows={1} />
      </div>

      <div className="border-t border-gray-100" />

      {/* Skin Examination */}
      <div className="space-y-2">
        <SectionHeader label="Skin Examination" />
        <textarea
          value={data.skinExamination}
          onChange={(e) => field("skinExamination")(e.target.value)}
          rows={3}
          placeholder="Skin examination findings…"
          className="w-full border-b border-dotted border-rose-200 bg-transparent py-1.5 text-sm text-gray-800 outline-none focus:border-rose-400 transition-colors resize-none placeholder:text-rose-200"
        />
      </div>

      {/* Hair Examination */}
      <div className="space-y-2">
        <SectionHeader label="Hair Examination" />
        <textarea
          value={data.hairExamination}
          onChange={(e) => field("hairExamination")(e.target.value)}
          rows={2}
          placeholder="Hair examination findings…"
          className="w-full border-b border-dotted border-rose-200 bg-transparent py-1.5 text-sm text-gray-800 outline-none focus:border-rose-400 transition-colors resize-none placeholder:text-rose-200"
        />
        <TextareaField label="Trichoscopy findings" value={data.trichoscopyFindings} onChange={field("trichoscopyFindings")} rows={3} />
      </div>
    </div>
  );
}
