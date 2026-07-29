import { Skeleton } from "@/components/ui/empty-state";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-10 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-12">
        <Skeleton className="h-48 rounded-xl md:col-span-4" />
        <div className="grid gap-4 sm:grid-cols-3 md:col-span-8">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
      <Skeleton className="mt-6 h-64 rounded-xl" />
    </div>
  );
}
