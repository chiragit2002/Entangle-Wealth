import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Building2, Briefcase, DollarSign, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserProfile, EntityType } from "@/lib/taxflow-types";
import { ENTITY_LABELS } from "@/lib/taxflow-types";
import { createDefaultProfile, saveProfile, setOnboardingDone } from "@/lib/taxflow-profile";

const US_STATES = [
  "Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware",
  "Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky",
  "Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi",
  "Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico",
  "New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania",
  "Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont",
  "Virginia","Washington","West Virginia","Wisconsin","Wyoming",
];

interface Props {
  onComplete: (profile: UserProfile) => void;
  onClose?: () => void;
}

export function OnboardingWizard({ onComplete, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>(createDefaultProfile());

  const update = (partial: Partial<UserProfile>) => setProfile(p => ({ ...p, ...partial }));

  const canNext = () => {
    if (step === 1) return !!profile.entityType;
    if (step === 2) return !!profile.businessName && !!profile.homeState;
    if (step === 3) return profile.grossRevenue > 0;
    return true;
  };

  const finish = () => {
    if (!profile.name) profile.name = profile.businessName || "My Business";
    saveProfile(profile);
    setOnboardingDone(true);
    onComplete(profile);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0d0f18] p-6 relative max-h-[90vh] overflow-y-auto">
        {onClose && (
          <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00c8f8] to-[#0099cc] flex items-center justify-center">
            <span className="text-black font-bold text-sm">⚛</span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">TaxFlow Setup</h2>
            <p className="text-[11px] text-white/40">Step {step} of 4</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6">
          {[1,2,3,4].map(s => (
            <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? "bg-[#00c8f8]" : "bg-white/10"}`} />
          ))}
        </div>

        {step === 1 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-[#00c8f8]" />
              <h3 className="font-semibold text-white">What describes you best?</h3>
            </div>
            <div className="space-y-2">
              {(Object.entries(ENTITY_LABELS) as [EntityType, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => update({ entityType: key })}
                  className={`w-full text-left p-3 rounded-xl border text-[13px] transition-all min-h-[44px] ${
                    profile.entityType === key
                      ? "border-[#00c8f8]/50 bg-[#00c8f8]/10 text-[#00c8f8]"
                      : "border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-5 h-5 text-[#00c8f8]" />
              <h3 className="font-semibold text-white">Business Information</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">Business Name</label>
                <Input value={profile.businessName} onChange={e => update({ businessName: e.target.value.slice(0, 100) })} placeholder="Your Business LLC" className="bg-white/5 border-white/10" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">Industry</label>
                <Input value={profile.industry} onChange={e => update({ industry: e.target.value.slice(0, 100) })} placeholder="e.g., Graphic Design, Consulting" className="bg-white/5 border-white/10" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">State of Residence</label>
                <select
                  value={profile.homeState}
                  onChange={e => update({ homeState: e.target.value, state: e.target.value })}
                  className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg p-3 text-white text-sm min-h-[44px] [&>option]:bg-[#0d0d1a]"
                >
                  <option value="">Select State</option>
                  {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">Year Business Started</label>
                <Input type="number" value={profile.yearStarted} onChange={e => update({ yearStarted: e.target.value })} placeholder="2020" min="1950" max="2026" className="bg-white/5 border-white/10" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">Primary Business Activity</label>
                <Input value={profile.primaryActivity} onChange={e => update({ primaryActivity: e.target.value.slice(0, 200) })} placeholder="What does your business do?" className="bg-white/5 border-white/10" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-[#00c8f8]" />
              <h3 className="font-semibold text-white">Income Profile</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">Estimated Annual Gross Revenue</label>
                <Input type="number" value={profile.grossRevenue || ""} onChange={e => update({ grossRevenue: Math.max(0, Number(e.target.value)) })} placeholder="100000" className="bg-white/5 border-white/10" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">W-2 Income (if any)</label>
                <Input type="number" value={profile.w2Income || ""} onChange={e => update({ w2Income: Math.max(0, Number(e.target.value)) })} placeholder="0" className="bg-white/5 border-white/10" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">Number of Employees/Contractors You Pay</label>
                <Input type="number" value={profile.employeeCount || ""} onChange={e => update({ employeeCount: Math.max(0, Number(e.target.value)) })} placeholder="0" className="bg-white/5 border-white/10" />
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/10">
                <span className="text-[13px] text-white/70">Do you have a home office?</span>
                <button onClick={() => update({ hasHomeOffice: !profile.hasHomeOffice })} className={`px-4 py-1.5 rounded-full text-[12px] font-bold ${profile.hasHomeOffice ? "bg-[#00e676]/15 text-[#00e676]" : "bg-white/5 text-white/40"}`}>
                  {profile.hasHomeOffice ? "Yes" : "No"}
                </button>
              </div>
              {profile.hasHomeOffice && (
                <div>
                  <label className="text-[11px] text-white/50 mb-1 block">Home Office Square Footage</label>
                  <Input type="number" value={profile.homeOfficeSqft || ""} onChange={e => update({ homeOfficeSqft: Math.min(300, Math.max(0, Number(e.target.value))) })} placeholder="150" max="300" className="bg-white/5 border-white/10" />
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/10">
                <span className="text-[13px] text-white/70">Do you use a vehicle for business?</span>
                <button onClick={() => update({ usesVehicle: !profile.usesVehicle })} className={`px-4 py-1.5 rounded-full text-[12px] font-bold ${profile.usesVehicle ? "bg-[#00e676]/15 text-[#00e676]" : "bg-white/5 text-white/40"}`}>
                  {profile.usesVehicle ? "Yes" : "No"}
                </button>
              </div>
              {profile.usesVehicle && (
                <div>
                  <label className="text-[11px] text-white/50 mb-1 block">Business Use Percentage</label>
                  <Input type="number" value={profile.vehicleBusinessPct || ""} onChange={e => update({ vehicleBusinessPct: Math.min(100, Math.max(0, Number(e.target.value))) })} placeholder="70" max="100" className="bg-white/5 border-white/10" />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-[#00c8f8]" />
              <h3 className="font-semibold text-white">Your Goals</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] text-white/50 mb-2 block">Primary Goal</label>
                <div className="space-y-2">
                  {([
                    ["se_tax", "Reduce self-employment tax"],
                    ["income_tax", "Reduce income tax"],
                    ["both", "Reduce both SE tax and income tax"],
                  ] as const).map(([val, label]) => (
                    <button key={val} onClick={() => update({ primaryGoal: val })}
                      className={`w-full text-left p-3 rounded-xl border text-[13px] transition-all min-h-[44px] ${
                        profile.primaryGoal === val
                          ? "border-[#00c8f8]/50 bg-[#00c8f8]/10 text-[#00c8f8]"
                          : "border-white/10 text-white/60 hover:border-white/20"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/10">
                <span className="text-[13px] text-white/70">Do you currently work with a CPA?</span>
                <button onClick={() => update({ hasCPA: !profile.hasCPA })} className={`px-4 py-1.5 rounded-full text-[12px] font-bold ${profile.hasCPA ? "bg-[#00e676]/15 text-[#00e676]" : "bg-white/5 text-white/40"}`}>
                  {profile.hasCPA ? "Yes" : "No"}
                </button>
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-2 block">When do you typically file?</label>
                <div className="flex gap-2">
                  {([["ontime", "On Time"], ["extension", "Extension"]] as const).map(([val, label]) => (
                    <button key={val} onClick={() => update({ filingTime: val })}
                      className={`flex-1 p-3 rounded-xl border text-[13px] font-semibold transition-all min-h-[44px] ${
                        profile.filingTime === val
                          ? "border-[#00c8f8]/50 bg-[#00c8f8]/10 text-[#00c8f8]"
                          : "border-white/10 text-white/60 hover:border-white/20"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="border-white/10 text-white/60 gap-1 min-h-[44px]">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <div className="flex-1" />
          {step < 4 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black font-bold gap-1 min-h-[44px]">
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={finish} className="bg-gradient-to-r from-[#00e676] to-[#00c853] text-black font-bold gap-1 min-h-[44px]">
              Complete Setup <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
