import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { getClinicSettings } from "@/lib/clinic-settings";
import { ClinicSettingsForm } from "@/components/clinic-settings-form";
import { AppearanceSettings } from "@/components/appearance-settings";
import { PageHeader } from "@/components/ui/page-header";

export default async function SettingsPage() {
  const session = await getAppSession();
  if (!session?.user) redirect("/");

  const clinicId = session.user.clinicId ?? "drjo-skin-revive";
  const clinic = await getClinicSettings(clinicId);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description="Manage your clinic profile and workspace appearance."
      />

      <ClinicSettingsForm
        initial={{
          id: clinic.id,
          name: clinic.name,
          logoUrl: clinic.logoUrl,
        }}
      />

      <AppearanceSettings />
    </div>
  );
}
