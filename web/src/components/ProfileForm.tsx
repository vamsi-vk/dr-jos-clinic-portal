"use client";

import { useState } from "react";
import type { AttachmentEntry } from "@/components/Attachments";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileFormData = {
  // Basic info
  name: string;
  ageSex: string;
  phoneNo: string;
  address: string;
  emailId: string;
  sourceOfReferral: string;
  idNo: string;
  date: string;
  weight: string;
  height: string;
  bp: string;
  // History
  presentHistory: string;
  pastHistory: string;
  familyHistory: string;
  personalHistory: string;
  medicationHistory: string;
  coMorbidities: string;
  // Examinations
  skinExamination: string;
  hairExamination: string;
  trichoscopyFindings: string;
  // Page 2: whiteboard drawing (JSON-encoded strokes, "" when blank)
  whiteboard: string;
  // Page 3: images attached to the profile form
  attachments: AttachmentEntry[];
};

export function emptyProfileForm(): ProfileFormData {
  return {
    name: "",
    ageSex: "",
    phoneNo: "",
    address: "",
    emailId: "",
    sourceOfReferral: "",
    idNo: "",
    date: "",
    weight: "",
    height: "",
    bp: "",
    presentHistory: "",
    pastHistory: "",
    familyHistory: "",
    personalHistory: "",
    medicationHistory: "",
    coMorbidities: "",
    skinExamination: "",
    hairExamination: "",
    trichoscopyFindings: "",
    whiteboard: "",
    attachments: [],
  };
}

/** Older saved forms predate the whiteboard/attachments pages. */
export function withProfileDefaults(saved: Partial<ProfileFormData> | null | undefined): ProfileFormData {
  return { ...emptyProfileForm(), ...(saved ?? {}) };
}

// ─── Field components ─────────────────────────────────────────────────────────

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
      <span className="shrink-0 text-xs font-semibold text-gray-500 pt-2 w-32 text-right">{label}</span>
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

// ─── Main component ───────────────────────────────────────────────────────────

export function ProfileForm({
  data,
  onChange,
}: {
  data: ProfileFormData;
  onChange: (d: ProfileFormData) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  function field(key: keyof ProfileFormData) {
    return (val: string) => onChange({ ...data, [key]: val });
  }

  return (
    <div className="rounded-2xl border border-rose-100 bg-[#fdf8f6] shadow-md overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between border-b border-rose-100 bg-rose-100/80 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">📋</span>
          <div>
            <p className="text-base font-bold text-rose-900">Profile Form</p>
            <p className="text-xs text-rose-700/60">Jo&apos;s Skin Revive — Dermatology &amp; Cosmetology Clinic</p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="rounded-lg bg-white/70 hover:bg-white px-4 py-1.5 text-xs font-semibold text-rose-700 transition-colors"
        >
          {collapsed ? "▼ Expand" : "▲ Collapse"}
        </button>
      </div>

      {!collapsed && (
        <div className="p-6 space-y-5">

          {/* ── Basic info grid ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Left column */}
            <div className="space-y-2">
              <Field label="Name"              value={data.name}              onChange={field("name")} />
              <Field label="Age / Sex"         value={data.ageSex}            onChange={field("ageSex")} />
              <Field label="Phone No"          value={data.phoneNo}           onChange={field("phoneNo")} type="tel" />
              <Field label="Address"           value={data.address}           onChange={field("address")} />
              <Field label="Email Id"          value={data.emailId}           onChange={field("emailId")} type="email" />
              <Field label="Source of Referral" value={data.sourceOfReferral} onChange={field("sourceOfReferral")} />
            </div>
            {/* Right column */}
            <div className="space-y-2">
              <Field label="ID No"   value={data.idNo}    onChange={field("idNo")} />
              <Field label="Date"    value={data.date}    onChange={field("date")} type="date" />
              <Field label="Wt"      value={data.weight}  onChange={field("weight")} placeholder="kg" />
              <Field label="Height"  value={data.height}  onChange={field("height")} placeholder="cm" />
              <Field label="BP"      value={data.bp}      onChange={field("bp")} placeholder="mmHg" />
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* ── History ── */}
          <div className="space-y-3">
            <TextareaField label="Present history"    value={data.presentHistory}    onChange={field("presentHistory")} rows={2} />
            <TextareaField label="Past history"       value={data.pastHistory}       onChange={field("pastHistory")} rows={2} />
            <TextareaField label="Family history"     value={data.familyHistory}     onChange={field("familyHistory")} rows={2} />
            <TextareaField label="Personal history"   value={data.personalHistory}   onChange={field("personalHistory")} rows={1} />
            <TextareaField label="Medication history" value={data.medicationHistory} onChange={field("medicationHistory")} rows={2} />
            <TextareaField label="Co-morbidities"     value={data.coMorbidities}     onChange={field("coMorbidities")} rows={1} />
          </div>

          <div className="border-t border-gray-100" />

          {/* ── Skin Examination ── */}
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

          {/* ── Hair Examination ── */}
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
      )}
    </div>
  );
}
