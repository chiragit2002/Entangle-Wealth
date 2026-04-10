export type EntityType = "contractor" | "llc" | "multi_llc" | "scorp" | "ccorp" | "sole_prop" | "multiple";

export interface UserProfile {
  id: string;
  name: string;
  entityType: EntityType;
  businessName: string;
  industry: string;
  state: string;
  yearStarted: string;
  primaryActivity: string;
  homeState: string;
  grossRevenue: number;
  w2Income: number;
  employeeCount: number;
  hasHomeOffice: boolean;
  homeOfficeSqft: number;
  usesVehicle: boolean;
  vehicleBusinessPct: number;
  primaryGoal: "se_tax" | "income_tax" | "both";
  hasCPA: boolean;
  filingTime: "ontime" | "extension";
  taxYear: number;
  createdAt: string;
}

export interface TaxStrategy {
  id: string;
  title: string;
  code: string;
  category: string;
  entityTypes: EntityType[];
  maxBenefit: string;
  how: string;
  eligible: string;
  documentation: string[];
  irsPub: string;
  risk: "low" | "medium" | "high";
  auditNote?: string;
  estimator?: (profile: UserProfile) => number;
}

export interface DeductionCategory {
  id: string;
  label: string;
  found: number;
  documented: number;
}

export interface DocumentEntry {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  category: string;
  vendor: string;
  amount: number;
  date: string;
  purpose: string;
  deductiblePct: number;
  deductibleAmount: number;
  aiAnalysis?: DocumentAIAnalysis;
  status: "pending" | "analyzed" | "confirmed";
}

export interface DocumentAIAnalysis {
  docType: string;
  vendor: string;
  date: string;
  amount: number;
  items: string[];
  irsCategory: string;
  ircSection: string;
  deductiblePct: number;
  deductibleAmount: number;
  auditReady: boolean;
  auditIssues: string[];
  suggestedPurpose: string;
  notes: string;
}

export interface MileageEntry {
  id: string;
  date: string;
  startLocation: string;
  endLocation: string;
  miles: number;
  purpose: string;
  deductible: number;
}

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
  timestamp: number;
}

export const ENTITY_LABELS: Record<EntityType, string> = {
  contractor: "Independent Contractor / Freelancer (1099)",
  llc: "Single-Member LLC (Schedule C)",
  multi_llc: "Multi-Member LLC (Partnership)",
  scorp: "S-Corporation Shareholder",
  ccorp: "C-Corporation Owner",
  sole_prop: "Sole Proprietor",
  multiple: "Multiple Entities",
};

export const ENTITY_SHORT_LABELS: Record<EntityType, string> = {
  contractor: "Contractor",
  llc: "LLC",
  multi_llc: "Multi-LLC",
  scorp: "S-Corp",
  ccorp: "C-Corp",
  sole_prop: "Sole Prop",
  multiple: "Multiple",
};

export const DOCUMENT_CATEGORIES = [
  { value: "receipts", label: "Receipts" },
  { value: "mileage", label: "Mileage Logs" },
  { value: "contracts", label: "Contracts" },
  { value: "bank_statements", label: "Bank Statements" },
  { value: "tax_forms", label: "Tax Forms" },
  { value: "invoices", label: "Invoices" },
  { value: "travel", label: "Travel" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
] as const;
