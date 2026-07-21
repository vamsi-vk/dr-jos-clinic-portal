"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function isInternalNavLink(anchor: HTMLAnchorElement, pathname: string) {
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  if (anchor.target === "_blank" || anchor.download) return false;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    const next = url.pathname + url.search;
    return next !== pathname;
  } catch {
    return false;
  }
}

export function NavigationLoading() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    setPending(false);
    setShowBar(false);
  }, [pathname]);

  useEffect(() => {
    if (!pending) {
      setShowBar(false);
      return;
    }
    const t = window.setTimeout(() => setShowBar(true), 120);
    return () => window.clearTimeout(t);
  }, [pending]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (anchor && isInternalNavLink(anchor, pathname)) {
        setPending(true);
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  if (!showBar) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-teal-100/80 lg:left-64"
      role="progressbar"
      aria-label="Loading page"
    >
      <div className="nav-progress-bar h-full w-1/4 rounded-full bg-teal-600" />
    </div>
  );
}
