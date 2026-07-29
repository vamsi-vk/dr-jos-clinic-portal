"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Something went wrong</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The page could not load. Try again, or restart the dev server after deleting the{" "}
        <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">.next</code> folder.
      </p>
      <Button type="button" className="mt-6" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
