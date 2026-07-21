export default function DashboardLoading() {
  return (
    <main className="mx-auto max-w-5xl animate-pulse px-6 py-8 sm:py-10">
      <div className="mb-10 space-y-3">
        <div className="h-4 w-40 rounded bg-stone-200" />
        <div className="h-10 w-64 rounded-lg bg-stone-200" />
        <div className="h-4 w-full max-w-xl rounded bg-stone-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-40 rounded-2xl bg-stone-200 sm:col-span-2 lg:col-span-1" />
        <div className="h-40 rounded-2xl bg-stone-100" />
        <div className="h-40 rounded-2xl bg-stone-100" />
      </div>
      <div className="mt-10 h-56 rounded-2xl bg-stone-100" />
    </main>
  );
}
