import { redirect } from "next/navigation";
import { getAppSession } from "@/lib/session";
import { DashboardNav } from "@/components/dashboard-nav";
import { NavigationLoading } from "@/components/navigation-loading";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAppSession();
  if (!session?.user) redirect("/");

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="flex max-h-[min(100vh,100dvh)] flex-col overflow-hidden border-b border-stone-200/80 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:w-64 lg:border-b-0 lg:border-r">
        <DashboardNav
          email={session.user.email ?? ""}
          displayName={session.user.name}
        />
      </aside>

      <div className="relative min-w-0 flex-1 bg-stone-50/80">
        <NavigationLoading />
        {children}
      </div>
    </div>
  );
}
