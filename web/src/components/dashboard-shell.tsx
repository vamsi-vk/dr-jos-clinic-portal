"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  IconForms,
  IconHome,
  IconInbox,
  IconLayers,
  IconLogout,
  IconMenu,
  IconSettings,
  IconX,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Overview", exact: true, icon: IconHome },
  { href: "/dashboard/patients", label: "Inbox", icon: IconInbox },
  { href: "/dashboard/forms", label: "Forms", icon: IconForms },
  { href: "/dashboard/field-groups", label: "Field groups", icon: IconLayers },
  { href: "/dashboard/settings", label: "Settings", icon: IconSettings },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function initials(name: string) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function DashboardShell({
  email,
  displayName,
  clinicName,
  clinicLogoUrl,
  children,
}: {
  email: string;
  displayName?: string | null;
  clinicName?: string;
  clinicLogoUrl?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const label = displayName?.trim() || email.split("@")[0];
  const [signingOut, setSigningOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const brandName = clinicName?.trim() || "Clinic Portal";
  const brandSubtitle = clinicName?.trim() ? "Clinic workspace" : "Dr. Jo's Clinic";

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-accent text-sm font-bold text-accent-foreground shadow-glow">
          {clinicLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinicLogoUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initials(brandName)
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold tracking-tight">{brandName}</p>
          <p className="truncate text-[11px] text-sidebar-muted">{brandSubtitle}</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-muted">
          Workspace
        </p>
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  prefetch
                  href={item.href}
                  className={`group flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition ${
                    active
                      ? "bg-accent text-accent-foreground shadow-sm"
                      : "text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-foreground">
            {initials(label)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium">{label}</p>
            <p className="truncate text-[11px] text-sidebar-muted">{email}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent"
          loading={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut({ callbackUrl: "/" });
          }}
        >
          <IconLogout size={15} />
          Sign out
        </Button>
      </div>
    </div>
  );

  const title =
    nav.find((n) => isActive(pathname, n.href, n.exact))?.label ?? "Dashboard";

  return (
    <div className="min-h-screen lg:pl-[260px]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-sidebar-border lg:block">
        {sidebar}
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-[min(280px,88vw)] shadow-lg">
            <div className="absolute right-3 top-3 z-10">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-accent text-sidebar-foreground"
                aria-label="Close"
              >
                <IconX size={16} />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="relative min-w-0">
        <header className="sticky top-0 z-30 border-b border-border/80 bg-background/80 backdrop-blur-xl">
          <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <IconMenu size={18} />
              </button>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{title}</p>
                <p className="hidden text-xs text-muted-foreground sm:block">
                  Clinic extension workspace
                </p>
              </div>
            </div>
          </div>
        </header>

        <div className="page-enter px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</div>
      </div>
    </div>
  );
}
