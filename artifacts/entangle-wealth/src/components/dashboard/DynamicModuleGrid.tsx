import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { Loader2, UserCircle, RefreshCw, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { PageErrorBoundary } from "@/components/PageErrorBoundary";
import { authFetch } from "@/lib/authFetch";
import { TaxSavingsModule } from "./modules/TaxSavingsModule";
import { BusinessDeductionsModule } from "./modules/BusinessDeductionsModule";
import { InvestmentStrategyModule } from "./modules/InvestmentStrategyModule";
import { ExpenseTrackingModule } from "./modules/ExpenseTrackingModule";
import { RetirementPlanningModule } from "./modules/RetirementPlanningModule";
import { GigIncomeOptimizerModule } from "./modules/GigIncomeOptimizerModule";
import { RealEstateDeductionsModule } from "./modules/RealEstateDeductionsModule";
import { CapitalGainsPlannerModule } from "./modules/CapitalGainsPlannerModule";
import type { DashboardModuleId, AssignedModule } from "@workspace/occupations";

interface ModulesResponse {
  modules: AssignedModule[];
  profileIncomplete?: boolean;
  message?: string;
  assignedAt?: string | null;
}

interface ModuleContentProps {
  moduleId: DashboardModuleId;
  occupationCategory?: string;
  taxCategory?: string;
}

function ModuleContent({ moduleId, occupationCategory, taxCategory }: ModuleContentProps) {
  switch (moduleId) {
    case "tax-savings":
      return <TaxSavingsModule occupationCategory={occupationCategory} taxCategory={taxCategory} />;
    case "business-deductions":
      return <BusinessDeductionsModule />;
    case "investment-strategy":
      return <InvestmentStrategyModule />;
    case "expense-tracking":
      return <ExpenseTrackingModule />;
    case "retirement-planning":
      return <RetirementPlanningModule />;
    case "gig-income-optimizer":
      return <GigIncomeOptimizerModule />;
    case "real-estate-deductions":
      return <RealEstateDeductionsModule />;
    case "capital-gains-planner":
      return <CapitalGainsPlannerModule />;
    default:
      return (
        <div className="flex items-center justify-center py-8 text-white/30 text-sm">
          Module not available
        </div>
      );
  }
}

function ModuleDataUnavailable({ moduleLabel, onRetry }: { moduleLabel: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
      <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
        <AlertTriangle className="w-5 h-5 text-white/25" />
      </div>
      <div>
        <p className="text-sm font-medium text-white/50">{moduleLabel}</p>
        <p className="text-xs text-white/30 mt-0.5">Data unavailable</p>
      </div>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/50 hover:text-white/70 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </button>
    </div>
  );
}

function ModuleCard({ module }: { module: AssignedModule }) {
  return (
    <div className="bloomberg-panel p-4">
      <PageErrorBoundary fallbackTitle={`${module.label} unavailable`}>
        <ModuleContent moduleId={module.id} />
      </PageErrorBoundary>
    </div>
  );
}

function ProfileIncompleteGate() {
  return (
    <div className="bloomberg-panel p-6 flex flex-col items-center text-center gap-4 col-span-full">
      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
        <UserCircle className="w-6 h-6 text-primary/60" />
      </div>
      <div>
        <p className="text-sm font-semibold text-white/70 mb-1">Complete your profile to unlock personalized insights</p>
        <p className="text-xs text-white/40 max-w-sm">
          Your occupation and business owner status determine which tax strategies and financial modules are most relevant to you.
        </p>
      </div>
      <Link
        href="/profile"
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
      >
        <UserCircle className="w-4 h-4" />
        Complete Profile
      </Link>
    </div>
  );
}

export function DynamicModuleGrid({ isRecalculating = false }: { isRecalculating?: boolean }) {
  const { isSignedIn, getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<ModulesResponse>({
    queryKey: ["dashboard-modules"],
    queryFn: async () => {
      const res = await authFetch("/dashboard-modules/my-modules", getToken);
      if (!res.ok) throw new Error("Failed to load modules");
      return res.json();
    },
    enabled: !!isSignedIn,
    staleTime: 5 * 60 * 1000,
  });

  if (!isSignedIn) return null;

  if (isLoading || isRecalculating) {
    return (
      <div className="col-span-full bloomberg-panel p-6 flex items-center justify-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-primary/60" />
        <span className="text-sm text-white/50">
          {isRecalculating ? "Recalculating your modules..." : "Loading your personalized plan..."}
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <ModuleDataUnavailable
        moduleLabel="Your Financial Plan"
        onRetry={() => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-modules"] });
          refetch();
        }}
      />
    );
  }

  if (!data || data.profileIncomplete) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <ProfileIncompleteGate />
      </div>
    );
  }

  const modules = data.modules ?? [];
  if (modules.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <ProfileIncompleteGate />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {modules.map((module) => (
        <ModuleCard key={module.id} module={module} />
      ))}
    </div>
  );
}
