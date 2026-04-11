import type { UserProfile, MileageEntry, DocumentEntry, DeductionCategory, ChatMessage } from "./taxflow-types";

const PROFILE_KEY = "taxflow-profiles";
const ACTIVE_PROFILE_KEY = "taxflow-active-profile";
const DOCUMENTS_KEY = "taxflow-documents";
const MILEAGE_KEY = "taxflow-mileage";
const PLAN_KEY = "taxflow-plan";
const CHAT_KEY = "taxflow-chat";
const TAX_YEAR_KEY = "taxflow-tax-year";
const DEDUCTIONS_KEY = "taxflow-deductions";
const ONBOARDING_KEY = "taxflow-onboarding-done";

function safeGet<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    if (!val) return fallback;
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}

function sanitizeProfileForStorage(profile: UserProfile): UserProfile {
  return {
    ...profile,
    kyc: {
      ...profile.kyc,
      idNumber: "",
    },
  };
}

export function getProfiles(): UserProfile[] {
  return safeGet<UserProfile[]>(PROFILE_KEY, []);
}

export function saveProfiles(profiles: UserProfile[]): void {
  safeSet(PROFILE_KEY, profiles.map(sanitizeProfileForStorage));
}

export function purgeSensitiveStoredData(): void {
  try {
    const profiles = getProfiles();
    const hasIdNumbers = profiles.some(p => p.kyc?.idNumber);
    if (hasIdNumbers) {
      saveProfiles(profiles);
    }
  } catch {
  }
}

export function getActiveProfileId(): string | null {
  return safeGet<string | null>(ACTIVE_PROFILE_KEY, null);
}

export function setActiveProfileId(id: string): void {
  safeSet(ACTIVE_PROFILE_KEY, id);
}

export function getActiveProfile(): UserProfile | null {
  const profiles = getProfiles();
  const activeId = getActiveProfileId();
  if (!activeId) return profiles[0] || null;
  return profiles.find(p => p.id === activeId) || profiles[0] || null;
}

export function saveProfile(profile: UserProfile): void {
  const profiles = getProfiles();
  const idx = profiles.findIndex(p => p.id === profile.id);
  if (idx >= 0) {
    profiles[idx] = profile;
  } else {
    profiles.push(profile);
  }
  saveProfiles(profiles);
  setActiveProfileId(profile.id);
}

export function deleteProfile(id: string): void {
  const profiles = getProfiles().filter(p => p.id !== id);
  saveProfiles(profiles);
  if (getActiveProfileId() === id) {
    setActiveProfileId(profiles[0]?.id || "");
  }
}

export function createDefaultProfile(): UserProfile {
  return {
    id: crypto.randomUUID(),
    name: "",
    entityType: "contractor",
    businessName: "",
    industry: "",
    state: "",
    yearStarted: "",
    primaryActivity: "",
    homeState: "",
    ein: "",
    grossRevenue: 0,
    w2Income: 0,
    employeeCount: 0,
    hasHomeOffice: false,
    homeOfficeSqft: 0,
    usesVehicle: false,
    vehicleBusinessPct: 0,
    businessTripDeductions: [],
    primaryGoal: "",
    hasCPA: false,
    filingTime: "",
    taxYear: 2026,
    createdAt: new Date().toISOString(),
    kyc: {
      fullLegalName: "",
      dateOfBirth: "",
      address: "",
      idType: "",
      idNumber: "",
      submitted: false,
    },
  };
}

export function isOnboardingDone(): boolean {
  return safeGet<boolean>(ONBOARDING_KEY, false);
}

export function setOnboardingDone(val: boolean): void {
  safeSet(ONBOARDING_KEY, val);
}

export function getDocuments(): DocumentEntry[] {
  return safeGet<DocumentEntry[]>(DOCUMENTS_KEY, []);
}

export function saveDocuments(docs: DocumentEntry[]): void {
  safeSet(DOCUMENTS_KEY, docs);
}

export function getMileageEntries(): MileageEntry[] {
  return safeGet<MileageEntry[]>(MILEAGE_KEY, []);
}

export function saveMileageEntries(entries: MileageEntry[]): void {
  safeSet(MILEAGE_KEY, entries);
}

export function getPlanStrategies(): string[] {
  return safeGet<string[]>(PLAN_KEY, []);
}

export function savePlanStrategies(ids: string[]): void {
  safeSet(PLAN_KEY, ids);
}

export function getChatHistory(profileId: string): ChatMessage[] {
  return safeGet<ChatMessage[]>(`${CHAT_KEY}-${profileId}`, []);
}

export function saveChatHistory(profileId: string, messages: ChatMessage[]): void {
  safeSet(`${CHAT_KEY}-${profileId}`, messages);
}

export function getTaxYear(): number {
  return safeGet<number>(TAX_YEAR_KEY, 2026);
}

export function setTaxYear(year: number): void {
  safeSet(TAX_YEAR_KEY, year);
}

export function getDeductionCategories(): DeductionCategory[] {
  return safeGet<DeductionCategory[]>(DEDUCTIONS_KEY, getDefaultDeductionCategories());
}

export function saveDeductionCategories(cats: DeductionCategory[]): void {
  safeSet(DEDUCTIONS_KEY, cats);
}

export function getDefaultDeductionCategories(): DeductionCategory[] {
  return [
    { id: "home_office", label: "Home Office", found: 0, documented: 0 },
    { id: "vehicle", label: "Vehicle & Mileage", found: 0, documented: 0 },
    { id: "meals", label: "Business Meals", found: 0, documented: 0 },
    { id: "travel", label: "Travel & Lodging", found: 0, documented: 0 },
    { id: "equipment", label: "Equipment & Tech", found: 0, documented: 0 },
    { id: "professional", label: "Professional Services", found: 0, documented: 0 },
    { id: "marketing", label: "Marketing", found: 0, documented: 0 },
    { id: "education", label: "Education & Training", found: 0, documented: 0 },
    { id: "health", label: "Health Insurance", found: 0, documented: 0 },
    { id: "retirement", label: "Retirement (SEP/401k)", found: 0, documented: 0 },
    { id: "software", label: "Software & Subscriptions", found: 0, documented: 0 },
    { id: "phone", label: "Phone & Internet", found: 0, documented: 0 },
  ];
}

purgeSensitiveStoredData();
