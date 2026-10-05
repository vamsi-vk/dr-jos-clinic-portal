"use client";

import { useState, type ReactNode } from "react";
import { ProfileFormDialog } from "@/components/ProfileFormDialog";
import { TherapySheets } from "@/components/TherapySheets";
import { withProfileDefaults, type ProfileFormData } from "@/components/ProfileForm";
import type { TherapySheetsData } from "@/components/TherapySheets";

type Props = {
  miosalonPatientId: string;
  patientName: string;
  phoneNo?: string;
  syncedAt?: string;
  initialData: TherapySheetsData | null;
  /** Rendered between the name header and therapy sheets */
  infoSlot?: ReactNode;
};

export function PatientDetailClient({
  miosalonPatientId,
  patientName,
  phoneNo,
  syncedAt,
  initialData,
  infoSlot,
}: Props) {
  // Initialise profileForm with auto-fill
  const [profileForm, setProfileForm] = useState<ProfileFormData>(() => {
    const saved = withProfileDefaults(initialData?.profileForm);
    return {
      ...saved,
      idNo:    saved.idNo    || miosalonPatientId,
      name:    saved.name    || patientName,
      phoneNo: saved.phoneNo || (phoneNo ?? ""),
    };
  });

  return (
    <>
      {/* ── Patient name + Profile Form button ── */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3 sm:mb-10">
        <div className="min-w-0">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-teal-600">
            Customer record
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {patientName}
            </h1>
            <ProfileFormDialog
              miosalonPatientId={miosalonPatientId}
              data={profileForm}
              onChange={setProfileForm}
            />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Customer ID{" "}
            <span className="font-mono text-foreground">{miosalonPatientId}</span>
            {syncedAt ? (
              <>
                {" "}· Customer profile synced{" "}
                {new Intl.DateTimeFormat("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(syncedAt))}
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* ── Customer Info + intake forms ── */}
      {infoSlot}

      {/* ── Therapy Sheets (profile form controlled from above) ── */}
      <TherapySheets
        miosalonPatientId={miosalonPatientId}
        initialData={initialData}
        profileFormControlled={profileForm}
        onProfileFormChange={setProfileForm}
      />
    </>
  );
}
