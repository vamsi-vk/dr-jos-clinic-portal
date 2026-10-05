import { redirect } from "next/navigation";
import { getClinicSettings } from "@/lib/clinic-settings";
import { getPortalScope } from "@/lib/patient-scope";
import { ClinicSettingsForm } from "@/components/clinic-settings-form";
import { AppearanceSettings } from "@/components/appearance-settings";
import { PageHeader } from "@/components/ui/page-header";

export default async function SettingsPage() {
  const scope = await getPortalScope();
  if (!scope) redirect("/");

  const clinic = await getClinicSettings(scope.clinicId, scope.branch);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Settings"
        description={
          scope.branch
            ? `Manage the ${scope.branch} branch profile and workspace appearance.`
            : "No branch is assigned to your account, so the company profile can't be edited."
        }
      />

      <ClinicSettingsForm
        initial={{
          id: clinic.id,
          name: clinic.name,
          logoUrl: clinic.logoUrl,
        }}
        branch={scope.branch}
      />

      <AppearanceSettings />
    </div>
  );
}
