import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { getClinicSettings } from "@/lib/clinic-settings";
import { loadUserBranch } from "@/lib/patient-scope";
import { DashboardShell } from "@/components/dashboard-shell";
import { NavigationLoading } from "@/components/navigation-loading";
import { ThemeProvider } from "@/components/theme-provider";
import { ConfirmProvider } from "@/components/ConfirmProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppSession();
  if (!session?.user) redirect("/");

  const clinicId = session.user.clinicId ?? "drjo-skin-revive";
  const branch = await loadUserBranch(session.user.id);
  const clinic = await getClinicSettings(clinicId, branch);

  return (
    <ThemeProvider>
      <ConfirmProvider>
        <DashboardShell
          email={session.user.email ?? ""}
          displayName={session.user.name}
          clinicName={clinic.name}
          clinicLogoUrl={clinic.logoUrl}
        >
          <NavigationLoading />
          {children}
        </DashboardShell>
      </ConfirmProvider>
    </ThemeProvider>
  );
}
