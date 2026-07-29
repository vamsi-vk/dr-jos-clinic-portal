import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { getClinicSettings } from "@/lib/clinic-settings";
import { DashboardShell } from "@/components/dashboard-shell";
import { NavigationLoading } from "@/components/navigation-loading";
import { ThemeProvider } from "@/components/theme-provider";

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
      <DashboardShell
        email={session.user.email ?? ""}
        displayName={session.user.name}
        clinicName={clinic.name}
        clinicLogoUrl={clinic.logoUrl}
      >
        <NavigationLoading />
        {children}
      </DashboardShell>
    </ThemeProvider>
  );
}
