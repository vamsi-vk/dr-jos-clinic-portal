import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { getClinicSettings } from "@/lib/clinic-settings";
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
  const clinic = await getClinicSettings(clinicId);

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
