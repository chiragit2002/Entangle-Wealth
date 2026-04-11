import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, Receipt, MessageCircle, TrendingUp, Shield, Download,
  ChevronDown, ChevronUp, Calculator, FileText, Lightbulb, Share2,
} from "lucide-react";
import { ShareTaxCard } from "@/components/viral/ShareTaxCard";
import { Button } from "@/components/ui/button";
import { OnboardingWizard } from "@/components/tax/OnboardingWizard";
import type { UserProfile, DeductionCategory } from "@/lib/taxflow-types";
import { ENTITY_SHORT_LABELS } from "@/lib/taxflow-types";
import {
  getActiveProfile, isOnboardingDone, getDeductionCategories,
  saveDeductionCategories, getPlanStrategies, getTaxYear,
} from "@/lib/taxflow-profile";
import { ALL_STRATEGIES, getStrategiesForEntity } from "@/lib/taxflow-strategies";
import {
  TAX_RATES, calculateIncomeTax, calculateSETax, calculateQBIDeduction, getMarginalRate,
} from "@/lib/taxflow-rates";

function formatDollar(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

export default function Tax() {
  const { toast } = useToast();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<DeductionCategory[]>(getDeductionCategories());
  const [expandEstimator, setExpandEstimator] = useState(false);
  const [taxYear, setTaxYr] = useState(getTaxYear());

  useEffect(() => {
    const p = getActiveProfile();
    setProfile(p);
    if (!isOnboardingDone()) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => setTaxYr((e as CustomEvent).detail);
    window.addEventListener("taxflow-year-change", handler);
    return () => window.removeEventListener("taxflow-year-change", handler);
  }, []);

  const planIds = getPlanStrategies();
  const strategies = useMemo(() => {
    if (!profile) return ALL_STRATEGIES;
    return getStrategiesForEntity(profile.entityType);
  }, [profile]);

  const totalFound = categories.reduce((s, c) => s + c.found, 0);
  const totalDocumented = categories.reduce((s, c) => s + c.documented, 0);
  const totalGap = totalFound - totalDocumented;
  const rates = TAX_RATES[taxYear] || TAX_RATES[2026];
  const marginalRate = profile ? getMarginalRate(profile.grossRevenue * 0.7, taxYear) : 0.24;
  const potentialSavings = totalFound * marginalRate;

  const missedOpportunities = useMemo(() => {
    if (!profile) return [];
    const planned = new Set(planIds);
    return strategies
      .filter(s => s.estimator && !planned.has(s.id))
      .map(s => ({ ...s, estimated: s.estimator!(profile) }))
      .filter(s => s.estimated > 500)
      .sort((a, b) => b.estimated - a.estimated)
      .slice(0, 3);
  }, [profile, strategies, planIds]);

  const estimator = useMemo(() => {
    if (!profile) return null;
    const gross = profile.grossRevenue;
    const seNet = gross * 0.9235;
    const seTaxNoPlan = calculateSETax(gross, taxYear);
    const seDeduct = seTaxNoPlan * 0.5;
    const taxableNoPlan = gross - seDeduct - rates.standardDeductionSingle;
    const incomeTaxNoPlan = calculateIncomeTax(Math.max(0, taxableNoPlan), taxYear);

    let totalDeductions = 0;
    const planStrats = strategies.filter(s => planIds.includes(s.id) && s.estimator);
    planStrats.forEach(s => { totalDeductions += s.estimator!(profile); });

    const homeOffice = profile.hasHomeOffice ? Math.min(1500, profile.homeOfficeSqft * 5) : 0;
    const vehicle = profile.usesVehicle ? 3000 * (profile.vehicleBusinessPct / 100) * rates.mileageRate : 0;
    totalDeductions = Math.max(totalDeductions, homeOffice + vehicle + 7200);

    const retirementDeduction = Math.min(rates.sepIraMax, gross * 0.20);
    const healthDeduction = 7200;
    const effectiveGross = gross;
    const sCorpSalary = gross > 60000 ? Math.min(gross * 0.5, 80000) : gross;
    const sCorpDist = gross - sCorpSalary;
    const seTaxWithPlan = profile.entityType === "scorp" || planIds.includes("s_corp_election")
      ? calculateSETax(sCorpSalary, taxYear)
      : seTaxNoPlan;
    const seDeductPlan = seTaxWithPlan * 0.5;
    const qbi = calculateQBIDeduction(gross * 0.7, gross * 0.5, taxYear);
    const taxableWithPlan = gross - totalDeductions - seDeductPlan - qbi - rates.standardDeductionSingle;
    const incomeTaxWithPlan = calculateIncomeTax(Math.max(0, taxableWithPlan), taxYear);

    return {
      gross,
      seTaxNoPlan, incomeTaxNoPlan,
      totalNoPlan: seTaxNoPlan + incomeTaxNoPlan,
      seTaxWithPlan, incomeTaxWithPlan,
      totalWithPlan: seTaxWithPlan + incomeTaxWithPlan,
      savings: (seTaxNoPlan + incomeTaxNoPlan) - (seTaxWithPlan + incomeTaxWithPlan),
      deductions: totalDeductions,
      qbi,
    };
  }, [profile, taxYear, strategies, planIds, rates]);

  const complianceScore = useMemo(() => {
    let s = 40;
    if (profile) s += 15;
    if (totalDocumented > 0) s += 10;
    if (totalGap === 0 && totalFound > 0) s += 15;
    if (planIds.length > 0) s += 10;
    if (planIds.length >= 3) s += 10;
    return Math.min(s, 100);
  }, [profile, totalDocumented, totalGap, totalFound, planIds]);

  const scoreColor = complianceScore >= 80 ? "#00e676" : complianceScore >= 60 ? "#ffd700" : "#ff4757";
  const scoreLabel = complianceScore >= 80 ? "GOOD" : complianceScore >= 60 ? "FAIR" : "NEEDS WORK";
  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (complianceScore / 100) * circumference;

  const handleCategoryUpdate = (id: string, field: "found" | "documented", value: number) => {
    const updated = categories.map(c => c.id === id ? { ...c, [field]: value } : c);
    setCategories(updated);
    saveDeductionCategories(updated);
  };

  const exportDeductionCSV = () => {
    const lines = ["Category,Found,Documented,Gap"];
    categories.forEach(c => {
      lines.push(`"${c.label}",${c.found},${c.documented},${c.found - c.documented}`);
    });
    lines.push(`\nTotal,${totalFound},${totalDocumented},${totalGap}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxflow-deductions-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Deduction summary CSV downloaded." });
  };

  const exportCPAReport = () => {
    const lines: string[] = [];
    lines.push("ENTANGLEWEALTH — TAXFLOW CPA REPORT");
    lines.push(`Generated: ${new Date().toLocaleDateString("en-US")}`);
    lines.push(`Tax Year: ${taxYear}`);
    if (profile) {
      lines.push(`\nCLIENT PROFILE`);
      lines.push(`Name: ${profile.name || profile.businessName}`);
      lines.push(`Entity: ${ENTITY_SHORT_LABELS[profile.entityType]}`);
      lines.push(`Industry: ${profile.industry}`);
      lines.push(`State: ${profile.homeState}`);
      lines.push(`Gross Revenue: ${formatDollar(profile.grossRevenue)}`);
    }
    lines.push(`\nDEDUCTION SUMMARY`);
    lines.push("Category,Found,Documented,Gap");
    categories.forEach(c => lines.push(`${c.label},${formatDollar(c.found)},${formatDollar(c.documented)},${formatDollar(c.found - c.documented)}`));
    lines.push(`\nTotal Found: ${formatDollar(totalFound)}`);
    lines.push(`Total Documented: ${formatDollar(totalDocumented)}`);
    lines.push(`Compliance Score: ${complianceScore}/100`);
    if (estimator) {
      lines.push(`\nTAX ESTIMATOR`);
      lines.push(`No Planning Tax: ${formatDollar(estimator.totalNoPlan)}`);
      lines.push(`With Strategies Tax: ${formatDollar(estimator.totalWithPlan)}`);
      lines.push(`Estimated Savings: ${formatDollar(estimator.savings)}`);
    }
    lines.push(`\nACTIVE STRATEGIES`);
    planIds.forEach(id => {
      const s = ALL_STRATEGIES.find(st => st.id === id);
      if (s) lines.push(`- ${s.title} (${s.code})`);
    });
    lines.push(`\n\nDisclaimer: This report is for educational purposes only. Consult a licensed CPA for professional tax advice.`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `taxflow-cpa-report-${taxYear}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "CPA Report Exported", description: "Full report downloaded." });
  };

  return (
    <Layout>
      {showOnboarding && (
        <OnboardingWizard
          onComplete={(p) => { setProfile(p); setShowOnboarding(false); }}
          onClose={() => setShowOnboarding(false)}
        />
      )}
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="glass-panel rounded-xl p-4 mb-6 border border-[rgba(255,215,0,0.2)] bg-[rgba(255,215,0,0.03)]">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            <span className="text-secondary font-bold">Disclaimer:</span> TaxFlow provides educational information based on IRS publications and is not a substitute for professional tax advice. Always consult a licensed CPA or tax attorney for your specific situation.
          </p>
        </div>

        {profile && (
          <div className="glass-panel rounded-xl p-4 mb-6 border-l-4 border-l-[#00c8f8]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[15px]">{profile.name || profile.businessName}</p>
                <p className="text-[12px] text-muted-foreground">
                  {ENTITY_SHORT_LABELS[profile.entityType]} · {profile.industry || "Business"} · {profile.homeState}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-muted-foreground">Revenue</p>
                <p className="font-mono font-bold text-[#00e676]">{formatDollar(profile.grossRevenue)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="glass-panel rounded-2xl p-6 sm:p-8 text-center mb-8">
          <p className="text-[13px] text-muted-foreground uppercase tracking-wider mb-4">Compliance Score</p>
          <div className="relative w-[140px] h-[140px] mx-auto mb-4">
            <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90" aria-label={`Compliance score: ${complianceScore} out of 100`} role="img">
              <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
              <circle cx="70" cy="70" r="60" fill="none" stroke={scoreColor} strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[32px] font-black" style={{ color: scoreColor }}>{complianceScore}</span>
              <span className="text-[11px] text-muted-foreground">{scoreLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="rounded-xl p-3 border border-[rgba(0,230,118,0.2)] bg-[rgba(0,230,118,0.05)] text-center">
              <p className="text-lg font-extrabold font-mono text-[#00e676]">{formatDollar(totalFound)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Deductions Found</p>
            </div>
            <div className="rounded-xl p-3 border border-[rgba(255,184,0,0.2)] bg-[rgba(255,184,0,0.05)] text-center">
              <p className="text-lg font-extrabold font-mono text-[#ffb800]">{formatDollar(totalGap)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Gap (Undocumented)</p>
            </div>
            <div className="rounded-xl p-3 border border-[rgba(0,200,248,0.2)] bg-[rgba(0,200,248,0.05)] text-center">
              <p className="text-lg font-extrabold font-mono text-[#00c8f8]">{formatDollar(totalDocumented)}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Documented</p>
            </div>
            <div className="rounded-xl p-3 border border-[rgba(0,230,118,0.2)] bg-[rgba(0,230,118,0.05)] text-center">
              <p className="text-lg font-extrabold font-mono text-[#00e676]">{formatDollar(Math.round(potentialSavings))}</p>
              <p className="text-[11px] text-muted-foreground mt-1">Potential Savings</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <div className="flex-1 h-3 bg-white/[0.06] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#00e676]" style={{ width: `${totalFound > 0 ? (totalDocumented / totalFound) * 100 : 0}%` }} />
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">{totalFound > 0 ? Math.round((totalDocumented / totalFound) * 100) : 0}%</span>
        </div>

        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          <Link href="/receipts">
            <Button variant="outline" className="border-primary/30 text-primary gap-2 whitespace-nowrap min-h-[44px]">
              <Receipt className="w-4 h-4" /> Document Vault
            </Button>
          </Link>
          <Link href="/tax-strategy">
            <Button variant="outline" className="border-secondary/30 text-secondary gap-2 whitespace-nowrap min-h-[44px]">
              <Lightbulb className="w-4 h-4" /> Strategies
            </Button>
          </Link>
          <Link href="/taxgpt">
            <Button variant="outline" className="border-[#00e676]/30 text-[#00e676] gap-2 whitespace-nowrap min-h-[44px]">
              <MessageCircle className="w-4 h-4" /> TaxGPT
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
          <TrendingUp className="w-5 h-5 text-[#00c8f8]" />
          <h2 className="text-lg font-semibold">Deduction Category Breakdown</h2>
        </div>

        <div className="space-y-2 mb-8">
          {categories.map(c => {
            const gap = c.found - c.documented;
            const pct = c.found > 0 ? (c.documented / c.found) * 100 : 0;
            return (
              <div key={c.id} className="glass-panel rounded-xl p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-white/80">{c.label}</span>
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-[#00e676] font-bold">{formatDollar(c.found)}</span>
                    <span className="text-white/30">/</span>
                    <span className="text-[#00c8f8]">{formatDollar(c.documented)}</span>
                    {gap > 0 && <span className="text-[#ffb800]">⚠ {formatDollar(gap)}</span>}
                    {gap === 0 && c.found > 0 && <span className="text-[#00e676]">✓</span>}
                  </div>
                </div>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, pct)}%`,
                    backgroundColor: pct >= 100 ? "#00e676" : pct >= 50 ? "#00c8f8" : "#ffb800",
                  }} />
                </div>
              </div>
            );
          })}
        </div>

        {missedOpportunities.length > 0 && (
          <>
            <div className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4">
              <AlertTriangle className="w-5 h-5 text-[#ffb800]" />
              <h2 className="text-lg font-semibold">Top Missed Opportunities</h2>
            </div>
            <div className="space-y-3 mb-8">
              {missedOpportunities.map(opp => (
                <div key={opp.id} className="glass-panel rounded-xl p-4 border-l-4 border-l-[#ffb800]">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-[14px]">{opp.title}</p>
                      <p className="text-[11px] text-muted-foreground">{opp.code}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-[rgba(255,184,0,0.15)] text-[#ffb800]">
                      {opp.estimated > 10000 ? "LARGE" : "OPPORTUNITY"}
                    </span>
                  </div>
                  <p className="text-[13px] text-muted-foreground mb-2">{opp.how.slice(0, 120)}...</p>
                  <p className="text-[13px] font-mono font-bold text-[#00e676] mb-3">
                    Est. savings: {formatDollar(Math.round(opp.estimated * marginalRate))}
                  </p>
                  <div className="flex gap-2">
                    <Link href="/tax-strategy">
                      <Button size="sm" variant="outline" className="border-[#00c8f8]/30 text-[#00c8f8] text-[12px] min-h-[36px]">
                        Learn More
                      </Button>
                    </Link>
                    <Link href="/taxgpt">
                      <Button size="sm" variant="outline" className="border-[#00e676]/30 text-[#00e676] text-[12px] min-h-[36px]">
                        Ask TaxGPT
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mb-8">
          <button
            onClick={() => setExpandEstimator(!expandEstimator)}
            className="flex items-center gap-2 pb-2 border-b border-white/10 mb-4 w-full text-left"
          >
            <Calculator className="w-5 h-5 text-[#00c8f8]" />
            <h2 className="text-lg font-semibold flex-1">Tax Estimator</h2>
            {expandEstimator ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
          </button>

          {expandEstimator && estimator && (
            <div className="glass-panel rounded-xl p-5">
              <div className="grid grid-cols-3 gap-2 text-[12px] mb-4">
                <div className="font-semibold text-white/50"></div>
                <div className="font-semibold text-center text-[#ff4757]">No Planning</div>
                <div className="font-semibold text-center text-[#00e676]">With Strategies</div>
              </div>
              {[
                ["Gross Revenue", formatDollar(estimator.gross), formatDollar(estimator.gross)],
                ["SE Tax", formatDollar(Math.round(estimator.seTaxNoPlan)), formatDollar(Math.round(estimator.seTaxWithPlan))],
                ["Income Tax", formatDollar(Math.round(estimator.incomeTaxNoPlan)), formatDollar(Math.round(estimator.incomeTaxWithPlan))],
                ["Total Tax", formatDollar(Math.round(estimator.totalNoPlan)), formatDollar(Math.round(estimator.totalWithPlan))],
              ].map(([label, noPlan, withPlan], i) => (
                <div key={i} className={`grid grid-cols-3 gap-2 text-[13px] py-2 ${i === 3 ? "border-t border-white/10 font-bold" : ""}`}>
                  <div className="text-white/60">{label}</div>
                  <div className="text-center font-mono text-[#ff4757]">{noPlan}</div>
                  <div className="text-center font-mono text-[#00e676]">{withPlan}</div>
                </div>
              ))}
              <div className="mt-4 p-4 rounded-xl bg-[rgba(0,230,118,0.08)] border border-[rgba(0,230,118,0.2)] text-center">
                <p className="text-[11px] text-muted-foreground uppercase mb-1">Total Estimated Savings</p>
                <p className="text-2xl font-black font-mono text-[#00e676]">{formatDollar(Math.round(Math.max(0, estimator.savings)))}</p>
              </div>
              {estimator.savings > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <p className="text-xs text-muted-foreground mb-2">Share your tax savings</p>
                  <ShareTaxCard
                    data={{
                      savings: Math.round(Math.max(0, estimator.savings)),
                      deductionsFound: totalFound,
                      strategiesUsed: planIds.length,
                    }}
                  />
                </div>
              )}
            </div>
          )}
          {expandEstimator && !estimator && (
            <div className="glass-panel rounded-xl p-5 text-center text-muted-foreground">
              <p>Complete your profile to see tax estimates.</p>
              <Button className="mt-3" onClick={() => setShowOnboarding(true)}>Set Up Profile</Button>
            </div>
          )}
        </div>

        <div className="flex gap-2 mb-6">
          <Button variant="outline" className="flex-1 border-[#00c8f8]/20 text-[#00c8f8] gap-2 text-[12px] min-h-[44px]" onClick={exportDeductionCSV}>
            <Download className="w-4 h-4" /> Deduction CSV
          </Button>
          <Button variant="outline" className="flex-1 border-[#00e676]/20 text-[#00e676] gap-2 text-[12px] min-h-[44px]" onClick={exportCPAReport}>
            <FileText className="w-4 h-4" /> CPA Report
          </Button>
        </div>

        <div className="p-4 rounded-lg border border-white/5 bg-white/[0.01]">
          <p className="text-[11px] text-muted-foreground/50 text-center">
            TaxFlow uses IRS publications for reference. Always verify deductions with a qualified tax professional. Tax laws change frequently.
          </p>
        </div>
      </div>
    </Layout>
  );
}
