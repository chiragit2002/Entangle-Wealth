import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";

export function PageSkeleton() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-8 w-24 ml-auto" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </Layout>
  );
}

export function ChartSkeleton() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20 ml-auto" />
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    </Layout>
  );
}

export function TableSkeleton() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-9 w-64 ml-auto rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-lg" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    </Layout>
  );
}
