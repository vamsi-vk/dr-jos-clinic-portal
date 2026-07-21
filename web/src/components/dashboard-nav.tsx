"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const nav = [
  { href: "/dashboard", label: "Home", exact: true },
  { href: "/dashboard/patients", label: "Patients" },
  { href: "/dashboard/forms", label: "Forms" },
  { href: "/dashboard/field-groups", label: "Field groups" },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({
  email,
  displayName,
}: {
  email: string;
  displayName?: string | null;
}) {
  const pathname = usePathname();
  const label = displayName?.trim() || email.split("@")[0];
  const [signingOut, setSigningOut] = useState(false);

  return (
    <>
      <div className="shrink-0 border-b border-stone-200/80 px-4 py-5 lg:border-b-0 lg:px-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-800">
          Dr. Jo&apos;s Clinic
        </p>
        <p className="mt-1 font-display text-lg font-semibold text-stone-900">Admin portal</p>
      </div>

      <nav className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-3 lg:px-3 lg:py-4">
        <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:gap-0.5">
          {nav.map((item) => {
            const active = isActive(pathname, item.href, item.exact);
            return (
              <li key={item.href} className="lg:w-full">
                <Link
                  prefetch
              href={item.href}
                  className={`block whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition lg:px-3.5 ${
                    active
                      ? "bg-teal-800 text-white shadow-sm shadow-teal-900/15"
                      : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-stone-200/80 p-4 lg:p-5">
        <p className="truncate text-sm font-medium text-stone-800">{label}</p>
        <p className="truncate text-xs text-stone-500">{email}</p>
        <button
          type="button"
          disabled={signingOut}
          onClick={() => {
            setSigningOut(true);
            void signOut({ callbackUrl: "/" });
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:border-stone-300 hover:bg-stone-50 disabled:opacity-60"
        >
          {signingOut ? (
            <>
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-stone-200 border-t-stone-600"
                aria-hidden
              />
              Signing out…
            </>
          ) : (
            "Sign out"
          )}
        </button>
      </div>
    </>
  );
}
