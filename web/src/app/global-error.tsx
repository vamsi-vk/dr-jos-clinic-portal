"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-stone-50 font-sans antialiased">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
          <h1 className="text-2xl font-semibold text-stone-900">Application error</h1>
          <p className="mt-3 text-sm text-stone-600">{error.message || "An unexpected error occurred."}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="mt-6 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
