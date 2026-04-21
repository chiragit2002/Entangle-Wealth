function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-muted/50 rounded animate-pulse ${className}`}
      style={{ backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite" }}
    />
  );
}

export function EvaluatorSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
      <div className="space-y-5">
        <div className="bg-muted/50 border border-white/8 rounded-2xl p-5 space-y-5">
          <Skeleton className="h-4 w-24 rounded" />
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-12 rounded" />
            ))}
          </div>
          <Skeleton className="h-9 w-full rounded-lg" />
          <div className="flex gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="flex-1 h-8 rounded" />)}
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>
      <div className="space-y-5">
        <div className="bg-muted/30 border border-white/8 rounded-2xl p-10 flex flex-col items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <Skeleton className="h-4 w-48 rounded" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>
      </div>
    </div>
  );
}

export function EvalPipelineSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-muted/50 border border-white/8 rounded-xl p-4 flex items-center gap-3">
            <Skeleton className="w-6 h-6 rounded" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-10 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-muted/30 border border-white/8 rounded-xl p-5 space-y-3">
        <Skeleton className="h-4 w-40 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
      <div className="bg-muted/30 border border-white/8 rounded-xl p-5 space-y-3">
        <Skeleton className="h-4 w-32 rounded" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      </div>
    </div>
  );
}

export function StrategyBuilderSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-muted/50 border border-white/8 rounded-xl p-4 flex items-center gap-3">
            <Skeleton className="w-6 h-6 rounded" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-10 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

export function QuantSignalsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-muted/50 border border-white/8 rounded-xl p-3 space-y-1.5">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-5 w-12 rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="bg-muted/30 border border-white/8 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-white/8 flex gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 flex-1 rounded" />)}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-3 border-b border-white/4 flex gap-4">
            {Array.from({ length: 8 }).map((_, j) => <Skeleton key={j} className="h-4 flex-1 rounded" />)}
          </div>
        ))}
      </div>
    </div>
  );
}
