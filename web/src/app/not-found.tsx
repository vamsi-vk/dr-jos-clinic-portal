import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-2xl font-semibold text-stone-900">Page not found</h1>
      <p className="mt-3 text-sm text-stone-600">This URL does not exist in the admin portal.</p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-teal-800 px-4 py-2 text-sm font-medium text-white hover:bg-teal-900"
      >
        Go to dashboard
      </Link>
    </main>
  );
}
