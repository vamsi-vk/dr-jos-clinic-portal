"use client";

import { useEffect } from "react";

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
      <h1 className="font-display text-2xl font-semibold text-stone-900">Something went wrong</h1>
      <p className="mt-3 text-sm text-stone-600">
        The page could not load. Try again, or restart the dev server after deleting the{" "}
        <code className="rounded bg-stone-100 px-1">.next</code> folder.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900"
      >
        Try again
      </button>
    </main>
  );
}
