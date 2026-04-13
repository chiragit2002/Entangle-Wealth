import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout/Layout";

const LOADING_STAGES = [
  "Initializing quantum agents...",
  "Scanning 55+ indicators...",
  "Entangling data streams...",
  "Calibrating signal intelligence...",
];

function QuantumLoader() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStageIndex((i) => (i + 1) % LOADING_STAGES.length);
    }, 900);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.08)" }}>
      <div className="relative flex items-center justify-center w-4 h-4 flex-shrink-0">
        <div className="absolute inset-0 rounded-full border border-[#00D4FF]/30 animate-ping" />
        <div className="w-2 h-2 rounded-full bg-[#00D4FF]/60" />
      </div>
      <span
        className="text-xs font-mono text-[#00D4FF]/60 transition-all duration-300"
        key={stageIndex}
        style={{ animation: "skeletonLineIn 0.3s ease-out" }}
      >
        {LOADING_STAGES[stageIndex]}
      </span>
      <style>{`
        @keyframes skeletonLineIn {
          from { opacity: 0; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 w-full space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-48" />
          <div className="ml-auto">
            <QuantumLoader />
          </div>
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
          <div className="ml-auto">
            <QuantumLoader />
          </div>
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
          <div className="ml-auto">
            <QuantumLoader />
          </div>
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
