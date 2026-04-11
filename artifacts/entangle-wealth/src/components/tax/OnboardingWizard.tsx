import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Building2, Briefcase, DollarSign, Target, Plus, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UserProfile, EntityType, BusinessTripDeduction, KycData } from "@/lib/taxflow-types";
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

const KYC_ID_TYPES = [
  { value: "drivers_license", label: "Driver's License" },
  { value: "passport", label: "Passport" },
  { value: "state_id", label: "State ID" },
  { value: "military_id", label: "Military ID" },
];

function formatEin(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length > 2) {
    return digits.slice(0, 2) + "-" + digits.slice(2);
  }
  return digits;
}

function isValidEin(value: string): boolean {
  return /^\d{2}-\d{7}$/.test(value);
}

interface YesNoButtonsProps {
  value: boolean;
  onChange: (val: boolean) => void;
}

function YesNoButtons({ value, onChange }: YesNoButtonsProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-5 py-1.5 rounded-full text-[12px] font-bold transition-all ${
          value
            ? "bg-[#00e676]/15 text-[#00e676] border border-[#00e676]/40"
            : "bg-white/5 text-white/40 border border-white/10 hover:border-white/20"
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-5 py-1.5 rounded-full text-[12px] font-bold transition-all ${
          !value
            ? "bg-red-500/15 text-red-400 border border-red-500/40"
            : "bg-white/5 text-white/40 border border-white/10 hover:border-white/20"
        }`}
      >
        No
      </button>
    </div>
  );
}

interface Props {
  onComplete: (profile: UserProfile) => void;
  onClose?: () => void;
}

export function OnboardingWizard({ onComplete, onClose }: Props) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>(createDefaultProfile());
  const [hasSelectedEntity, setHasSelectedEntity] = useState(false);
  const [kycSubmitting, setKycSubmitting] = useState(false);
  const [kycError, setKycError] = useState("");

  const update = (partial: Partial<UserProfile>) => setProfile(p => ({ ...p, ...partial }));
  const updateKyc = (partial: Partial<KycData>) =>
    setProfile(p => ({ ...p, kyc: { ...p.kyc, ...partial } }));

  const selectEntity = (entityType: EntityType) => {
    update({ entityType });
    setHasSelectedEntity(true);
  };

  const canNext = () => {
    if (step === 1) return hasSelectedEntity;
    if (step === 2) {
      const hasBasicInfo = !!profile.businessName && !!profile.homeState;
      const einValid = !profile.ein || isValidEin(profile.ein);
      const hasKyc =
        !!profile.kyc.fullLegalName &&
        !!profile.kyc.dateOfBirth &&
        !!profile.kyc.address &&
        !!profile.kyc.idType &&
        !!profile.kyc.idNumber;
      return hasBasicInfo && einValid && hasKyc;
    }
    if (step === 3) return profile.grossRevenue > 0;
    if (step === 4) return !!profile.primaryGoal && !!profile.filingTime;
    return true;
  };

  const submitKycToBackend = async (kycData: KycData): Promise<boolean> => {
    try {
      const baseUrl = import.meta.env.BASE_URL || "/";
      const apiBase = `${baseUrl}api`.replace(/\/+/g, "/");
      const res = await fetch(`${window.location.origin}${apiBase}/kyc/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fullLegalName: kycData.fullLegalName,
          dateOfBirth: kycData.dateOfBirth,
          address: kycData.address,
          idType: kycData.idType,
          idNumber: kycData.idNumber,
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const finish = async () => {
    setKycSubmitting(true);
    setKycError("");

    const kycSuccess = await submitKycToBackend(profile.kyc);

    const finalProfile = {
      ...profile,
      name: profile.name || profile.businessName || "My Business",
      kyc: {
        ...profile.kyc,
        submitted: kycSuccess,
        idNumber: "",
        dateOfBirth: "",
      },
    };

    if (!kycSuccess) {
      setKycSubmitting(false);
      setKycError("KYC verification could not be submitted. You can continue and retry later from your profile settings.");
    }

    saveProfile(finalProfile);
    setOnboardingDone(true);
    setKycSubmitting(false);
    onComplete(finalProfile);
  };

  const addTrip = () => {
    const newTrip: BusinessTripDeduction = {
      id: crypto.randomUUID(),
      destination: "",
      purpose: "",
      estimatedCost: 0,
    };
    update({ businessTripDeductions: [...profile.businessTripDeductions, newTrip] });
  };

  const updateTrip = (id: string, partial: Partial<BusinessTripDeduction>) => {
    update({
      businessTripDeductions: profile.businessTripDeductions.map(t =>
        t.id === id ? { ...t, ...partial } : t
      ),
    });
  };

  const removeTrip = (id: string) => {
    update({
      businessTripDeductions: profile.businessTripDeductions.filter(t => t.id !== id),
    });
  };

  const totalSteps = 4;

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
            <p className="text-[11px] text-white/40">Step {step} of {totalSteps}</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
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
                  onClick={() => selectEntity(key)}
                  className={`w-full text-left p-3 rounded-xl border text-[13px] transition-all min-h-[44px] ${
                    hasSelectedEntity && profile.entityType === key
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
                <label className="text-[11px] text-white/50 mb-1 block">Business Name *</label>
                <Input value={profile.businessName} onChange={e => update({ businessName: e.target.value.slice(0, 100) })} placeholder="Your Business LLC" className="bg-white/5 border-white/10" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">EIN (Employer Identification Number)</label>
                <Input
                  value={profile.ein}
                  onChange={e => update({ ein: formatEin(e.target.value) })}
                  placeholder="XX-XXXXXXX"
                  maxLength={10}
                  className={`bg-white/5 border-white/10 ${profile.ein && !isValidEin(profile.ein) ? "border-red-500/50" : ""}`}
                />
                {profile.ein && !isValidEin(profile.ein) && (
                  <p className="text-[10px] text-red-400 mt-1">EIN must be in XX-XXXXXXX format</p>
                )}
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">Industry</label>
                <Input value={profile.industry} onChange={e => update({ industry: e.target.value.slice(0, 100) })} placeholder="e.g., Graphic Design, Consulting" className="bg-white/5 border-white/10" />
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-1 block">State of Residence *</label>
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

              <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-[#00c8f8]" />
                  <h4 className="font-semibold text-white text-sm">Identity Verification (KYC) *</h4>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] text-white/50 mb-1 block">Full Legal Name *</label>
                    <Input
                      value={profile.kyc.fullLegalName}
                      onChange={e => updateKyc({ fullLegalName: e.target.value.slice(0, 100) })}
                      placeholder="John Michael Doe"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 mb-1 block">Date of Birth *</label>
                    <Input
                      type="date"
                      value={profile.kyc.dateOfBirth}
                      onChange={e => updateKyc({ dateOfBirth: e.target.value })}
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 mb-1 block">Address *</label>
                    <Input
                      value={profile.kyc.address}
                      onChange={e => updateKyc({ address: e.target.value.slice(0, 200) })}
                      placeholder="123 Main St, City, State, ZIP"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 mb-1 block">ID Type *</label>
                    <select
                      value={profile.kyc.idType}
                      onChange={e => updateKyc({ idType: e.target.value })}
                      className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg p-3 text-white text-sm min-h-[44px] [&>option]:bg-[#0d0d1a]"
                    >
                      <option value="">Select ID Type</option>
                      {KYC_ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 mb-1 block">ID Number *</label>
                    <Input
                      value={profile.kyc.idNumber}
                      onChange={e => updateKyc({ idNumber: e.target.value.slice(0, 30) })}
                      placeholder="ID Number"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
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
                <label className="text-[11px] text-white/50 mb-1 block">Estimated Annual Gross Revenue *</label>
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
                <YesNoButtons value={profile.hasHomeOffice} onChange={val => update({ hasHomeOffice: val })} />
              </div>
              {profile.hasHomeOffice && (
                <div>
                  <label className="text-[11px] text-white/50 mb-1 block">Home Office Square Footage</label>
                  <Input type="number" value={profile.homeOfficeSqft || ""} onChange={e => update({ homeOfficeSqft: Math.min(300, Math.max(0, Number(e.target.value))) })} placeholder="150" max="300" className="bg-white/5 border-white/10" />
                </div>
              )}
              <div className="flex items-center justify-between p-3 rounded-xl border border-white/10">
                <span className="text-[13px] text-white/70">Do you use a vehicle for business?</span>
                <YesNoButtons value={profile.usesVehicle} onChange={val => update({ usesVehicle: val })} />
              </div>
              {profile.usesVehicle && (
                <div>
                  <label className="text-[11px] text-white/50 mb-1 block">Business Use Percentage</label>
                  <Input type="number" value={profile.vehicleBusinessPct || ""} onChange={e => update({ vehicleBusinessPct: Math.min(100, Math.max(0, Number(e.target.value))) })} placeholder="70" max="100" className="bg-white/5 border-white/10" />
                </div>
              )}

              <div className="border-t border-white/10 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-white text-sm">Business Trip Deductions</h4>
                  <button
                    type="button"
                    onClick={addTrip}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00c8f8]/10 text-[#00c8f8] text-[12px] font-semibold hover:bg-[#00c8f8]/20 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Trip
                  </button>
                </div>
                {profile.businessTripDeductions.length === 0 && (
                  <p className="text-[12px] text-white/30 italic">No trips added yet. Click "Add Trip" to add business travel deductions.</p>
                )}
                <div className="space-y-3">
                  {profile.businessTripDeductions.map((trip, idx) => (
                    <div key={trip.id} className="p-3 rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-white/50 font-semibold">Trip {idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeTrip(trip.id)}
                          className="text-red-400/60 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <Input
                        value={trip.destination}
                        onChange={e => updateTrip(trip.id, { destination: e.target.value.slice(0, 100) })}
                        placeholder="Destination (e.g., New York, NY)"
                        className="bg-white/5 border-white/10 text-[13px]"
                      />
                      <Input
                        value={trip.purpose}
                        onChange={e => updateTrip(trip.id, { purpose: e.target.value.slice(0, 200) })}
                        placeholder="Business purpose"
                        className="bg-white/5 border-white/10 text-[13px]"
                      />
                      <Input
                        type="number"
                        value={trip.estimatedCost || ""}
                        onChange={e => updateTrip(trip.id, { estimatedCost: Math.max(0, Number(e.target.value)) })}
                        placeholder="Estimated cost ($)"
                        className="bg-white/5 border-white/10 text-[13px]"
                      />
                    </div>
                  ))}
                </div>
              </div>
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
                <label className="text-[11px] text-white/50 mb-2 block">Primary Goal *</label>
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
                <YesNoButtons value={profile.hasCPA} onChange={val => update({ hasCPA: val })} />
              </div>
              <div>
                <label className="text-[11px] text-white/50 mb-2 block">When do you typically file? *</label>
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

        {kycError && (
          <p className="text-[12px] text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3 mt-4">{kycError}</p>
        )}

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={kycSubmitting} className="border-white/10 text-white/60 gap-1 min-h-[44px]">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <div className="flex-1" />
          {step < totalSteps ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black font-bold gap-1 min-h-[44px]">
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={finish} disabled={!canNext() || kycSubmitting} className="bg-gradient-to-r from-[#00e676] to-[#00c853] text-black font-bold gap-1 min-h-[44px]">
              {kycSubmitting ? "Submitting..." : "Complete Setup"} <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
