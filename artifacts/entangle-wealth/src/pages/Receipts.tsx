import { useState, useEffect, useRef, useMemo } from "react";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import {
  Receipt, Upload, Trash2, Download, FileText, Search, Check, Edit2,
  Car, Filter, ChevronDown, ChevronUp, Plus, Loader2, X, Camera,
  Link2, ChevronRight as ChevronRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import type { DocumentEntry, MileageEntry } from "@/lib/taxflow-types";
import { DOCUMENT_CATEGORIES } from "@/lib/taxflow-types";
import {
  getDocuments, saveDocuments, getMileageEntries, saveMileageEntries, getTaxYear,
} from "@/lib/taxflow-profile";
import { TAX_RATES } from "@/lib/taxflow-rates";

const RECEIPT_CATEGORIES: Record<string, { label: string; pct: number; ref: string }> = {
  meals: { label: "Meals & Entertainment", pct: 50, ref: "IRS Pub 463" },
  travel: { label: "Business Travel", pct: 100, ref: "IRS Pub 463" },
  office: { label: "Office Supplies", pct: 100, ref: "IRC 162" },
  software: { label: "Software & Subscriptions", pct: 100, ref: "IRC 162" },
  vehicle: { label: "Vehicle & Transportation", pct: 100, ref: "IRS Pub 463" },
  marketing: { label: "Advertising & Marketing", pct: 100, ref: "IRC 162" },
  professional: { label: "Professional Services", pct: 100, ref: "IRC 162" },
  education: { label: "Education & Training", pct: 100, ref: "IRC 162" },
  phone: { label: "Phone & Internet", pct: 75, ref: "IRC 162" },
  insurance: { label: "Insurance", pct: 100, ref: "IRC 162" },
  equipment: { label: "Equipment & Tech", pct: 100, ref: "IRC 179" },
  other: { label: "Other Business Expense", pct: 100, ref: "IRC 162" },
};

function escapeCSV(str: string): string {
  let s = str;
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

type ViewMode = "cards" | "ledger";
type DocTab = "documents" | "mileage";

export default function Receipts() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const [documents, setDocuments] = useState<DocumentEntry[]>(() => getDocuments());
  const [mileage, setMileage] = useState<MileageEntry[]>(() => getMileageEntries());
  const [form, setForm] = useState({ vendor: "", amount: "", category: "", purpose: "", date: "" });
  const [mileageForm, setMileageForm] = useState({ date: "", start: "", end: "", miles: "", purpose: "" });
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [docTab, setDocTab] = useState<DocTab>("documents");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const taxYear = getTaxYear();
  const rates = TAX_RATES[taxYear] || TAX_RATES[2026];

  useEffect(() => { saveDocuments(documents); }, [documents]);
  useEffect(() => { saveMileageEntries(mileage); }, [mileage]);

  const filteredDocs = useMemo(() => {
    let result = documents;
    if (categoryFilter !== "all") {
      result = result.filter(d => d.category === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(d =>
        d.vendor.toLowerCase().includes(q) ||
        d.purpose.toLowerCase().includes(q) ||
        d.fileName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [documents, categoryFilter, search]);

  const total = documents.reduce((s, d) => s + d.amount, 0);
  const deductibleTotal = documents.reduce((s, d) => s + d.deductibleAmount, 0);
  const ytdMiles = mileage.reduce((s, m) => s + m.miles, 0);
  const ytdMileageDeduction = ytdMiles * rates.mileageRate;

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!["image/jpeg", "image/png", "image/jpg", "application/pdf"].includes(file.type)) {
        toast({ title: "Unsupported file", description: `${file.name}: Only PDF, JPG, PNG are supported.`, variant: "destructive" });
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: `${file.name}: Max 10MB per file.`, variant: "destructive" });
        continue;
      }

      const entry: DocumentEntry = {
        id: crypto.randomUUID(),
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
        category: "receipts",
        vendor: "",
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        purpose: "",
        deductiblePct: 100,
        deductibleAmount: 0,
        status: "pending",
      };

      setDocuments(prev => [entry, ...prev]);
      setAnalyzing(true);

      try {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const baseUrl = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
        const res = await fetch(`${baseUrl}/api/analyze-document`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileData: base64, fileType: file.type, fileName: file.name }),
        });

        if (res.ok) {
          const analysis = await res.json();
          setDocuments(prev => prev.map(d => d.id === entry.id ? {
            ...d,
            vendor: analysis.vendor || d.vendor,
            amount: analysis.amount || d.amount,
            date: analysis.date || d.date,
            purpose: analysis.suggestedPurpose || d.purpose,
            category: analysis.irsCategory ? mapAICategory(analysis.irsCategory) : d.category,
            deductiblePct: analysis.deductiblePct || 100,
            deductibleAmount: (analysis.amount || 0) * (analysis.deductiblePct || 100) / 100,
            aiAnalysis: {
              docType: analysis.docType || "receipt",
              vendor: analysis.vendor || "",
              date: analysis.date || "",
              amount: analysis.amount || 0,
              items: analysis.items || [],
              irsCategory: analysis.irsCategory || "",
              ircSection: analysis.ircSection || "",
              deductiblePct: analysis.deductiblePct || 100,
              deductibleAmount: (analysis.amount || 0) * (analysis.deductiblePct || 100) / 100,
              auditReady: analysis.auditReady ?? true,
              auditIssues: analysis.auditIssues || [],
              suggestedPurpose: analysis.suggestedPurpose || "",
              notes: analysis.notes || "",
            },
            status: "analyzed",
          } : d));
          toast({ title: "AI Analysis Complete", description: `${file.name} analyzed successfully.` });
        } else {
          setDocuments(prev => prev.map(d => d.id === entry.id ? { ...d, status: "pending" } : d));
          toast({ title: "Analysis unavailable", description: "Fill in details manually below." });
        }
      } catch {
        setDocuments(prev => prev.map(d => d.id === entry.id ? { ...d, status: "pending" } : d));
      }
      setAnalyzing(false);
    }
  };

  function mapAICategory(cat: string): string {
    const c = cat.toLowerCase();
    if (c.includes("meal") || c.includes("food") || c.includes("dining")) return "meals";
    if (c.includes("travel") || c.includes("flight") || c.includes("hotel")) return "travel";
    if (c.includes("office") || c.includes("supply")) return "office";
    if (c.includes("software") || c.includes("subscription")) return "software";
    if (c.includes("vehicle") || c.includes("gas") || c.includes("mileage")) return "vehicle";
    if (c.includes("marketing") || c.includes("advertising")) return "marketing";
    if (c.includes("education") || c.includes("training")) return "education";
    if (c.includes("phone") || c.includes("internet")) return "phone";
    if (c.includes("insurance")) return "insurance";
    if (c.includes("equipment") || c.includes("tech")) return "equipment";
    return "other";
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const addManualReceipt = () => {
    const vendor = form.vendor.trim();
    const amountStr = form.amount.trim();
    if (!vendor || !amountStr || !form.category) {
      toast({ title: "Missing fields", description: "Vendor, amount, and category are required.", variant: "destructive" });
      return;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > 999999.99) {
      toast({ title: "Invalid amount", description: "Enter a valid amount.", variant: "destructive" });
      return;
    }
    const cat = RECEIPT_CATEGORIES[form.category];
    if (!cat) return;
    const entry: DocumentEntry = {
      id: crypto.randomUUID(),
      fileName: `manual-${vendor.toLowerCase().replace(/\s+/g, "-")}.txt`,
      fileType: "text/plain",
      fileSize: 0,
      uploadDate: new Date().toISOString(),
      category: form.category === "meals" ? "receipts" : form.category,
      vendor: vendor.slice(0, 200),
      amount: Math.round(amount * 100) / 100,
      date: form.date || new Date().toISOString().split("T")[0],
      purpose: (form.purpose.trim() || "Business expense").slice(0, 500),
      deductiblePct: cat.pct,
      deductibleAmount: Math.round(amount * cat.pct) / 100,
      status: "confirmed",
    };
    setDocuments(prev => [entry, ...prev]);
    setForm({ vendor: "", amount: "", category: "", purpose: "", date: "" });
    toast({ title: "Receipt logged", description: `${entry.vendor} | $${entry.amount.toFixed(2)}` });
  };

  const removeDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const confirmDocument = (id: string) => {
    setDocuments(prev => prev.map(d => d.id === id ? { ...d, status: "confirmed" } : d));
    toast({ title: "Confirmed", description: "Document confirmed and logged." });
  };

  const addMileageEntry = () => {
    const miles = parseFloat(mileageForm.miles);
    if (!mileageForm.date || !mileageForm.start || !mileageForm.end || isNaN(miles) || miles <= 0) {
      toast({ title: "Missing fields", description: "All mileage fields are required.", variant: "destructive" });
      return;
    }
    const entry: MileageEntry = {
      id: crypto.randomUUID(),
      date: mileageForm.date,
      startLocation: mileageForm.start.slice(0, 200),
      endLocation: mileageForm.end.slice(0, 200),
      miles: Math.round(miles * 10) / 10,
      purpose: (mileageForm.purpose || "Business trip").slice(0, 500),
      deductible: Math.round(miles * rates.mileageRate * 100) / 100,
    };
    setMileage(prev => [entry, ...prev]);
    setMileageForm({ date: "", start: "", end: "", miles: "", purpose: "" });
    toast({ title: "Mileage logged", description: `${entry.miles} mi | $${entry.deductible.toFixed(2)}` });
  };

  const exportReceiptCSV = () => {
    if (documents.length === 0) {
      toast({ title: "No documents", description: "Add some documents first.", variant: "destructive" });
      return;
    }
    const lines = ["Date,Vendor,Amount,Category,Deductible %,Deductible Amount,Purpose,Status"];
    documents.forEach(d => {
      lines.push(`${d.date},${escapeCSV(d.vendor)},${d.amount.toFixed(2)},${escapeCSV(d.category)},${d.deductiblePct}%,${d.deductibleAmount.toFixed(2)},${escapeCSV(d.purpose)},${d.status}`);
    });
    lines.push(`\nTotal,,${total.toFixed(2)},,,${deductibleTotal.toFixed(2)}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document-vault-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Document CSV downloaded." });
  };

  const exportMileageCSV = () => {
    if (mileage.length === 0) {
      toast({ title: "No mileage entries", variant: "destructive" });
      return;
    }
    const lines = ["Date,Start Location,End Location,Miles,Purpose,Deductible Amount"];
    mileage.forEach(m => {
      lines.push(`${m.date},${escapeCSV(m.startLocation)},${escapeCSV(m.endLocation)},${m.miles},${escapeCSV(m.purpose)},${m.deductible.toFixed(2)}`);
    });
    lines.push(`\nYTD Total Miles,,,,${ytdMiles}`);
    lines.push(`YTD Deduction,,,,,${ytdMileageDeduction.toFixed(2)}`);
    lines.push(`IRS Rate,,,,,$${rates.mileageRate}/mi`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mileage-log-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "IRS-compliant mileage log downloaded." });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-[#0099cc] flex items-center justify-center">
            <FileText className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Receipts & Docs</h1>
            <p className="text-[12px] text-white/50">Upload receipts, log mileage, track deductions — all in one place.</p>
          </div>
        </div>

        <Link href="/integrations">
          <div className="glass-panel rounded-xl p-3 mb-4 border border-primary/10 hover:border-primary/30 cursor-pointer transition-all group flex items-center gap-3">
            <Link2 className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-[12px] text-white/50 group-hover:text-white/70 transition-colors flex-1">
              Connect QuickBooks, Xero, H&R Block & more to auto-import expenses
            </p>
            <ChevronRightIcon className="w-4 h-4 text-white/20 group-hover:text-primary flex-shrink-0" />
          </div>
        </Link>

        <div className="glass-panel rounded-xl p-3 mb-6 border border-white/[0.06]">
          <p className="text-[11px] text-white/30 leading-relaxed">
            AI auto-categorizes by IRS expense type. Keep originals for 7 years.
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setDocTab("documents")}
            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all ${docTab === "documents" ? "bg-[#00c8f8]/10 text-[#00c8f8] border border-[#00c8f8]/30" : "text-white/40 border border-transparent"}`}>
            <FileText className="w-4 h-4 inline mr-1" /> Documents
          </button>
          <button onClick={() => setDocTab("mileage")}
            className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all ${docTab === "mileage" ? "bg-[#00c8f8]/10 text-[#00c8f8] border border-[#00c8f8]/30" : "text-white/40 border border-transparent"}`}>
            <Car className="w-4 h-4 inline mr-1" /> Mileage Log
          </button>
        </div>

        {docTab === "documents" && (
          <>
            {analyzing ? (
              <div className="glass-panel rounded-xl p-6 mb-6 border border-[#9c27b0]/30 text-center min-h-[120px] flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 mb-2 text-[#9c27b0] animate-spin" />
                <p className="font-bold mb-1">Analyzing Document...</p>
                <p className="text-[13px] text-muted-foreground">AI is extracting vendor, amount, category & IRS details</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <div
                  ref={dropRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`glass-panel rounded-xl p-6 border-dashed border-2 text-center cursor-pointer transition-colors min-h-[140px] flex flex-col items-center justify-center ${
                    dragOver ? "border-[#00c8f8]/60 bg-[#00c8f8]/5" : "border-primary/20 hover:border-primary/40"
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
                >
                  <Upload className="w-8 h-8 mb-2 text-primary/50" />
                  <p className="font-bold text-[14px] mb-1">Upload File</p>
                  <p className="text-[12px] text-white/30">Drop or click · PDF, JPG, PNG</p>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/jpg,application/pdf" multiple className="hidden"
                    onChange={e => handleFileUpload(e.target.files)} />
                </div>

                <div
                  onClick={() => cameraRef.current?.click()}
                  className="glass-panel rounded-xl p-6 border-2 border-dashed border-secondary/20 hover:border-secondary/40 text-center cursor-pointer transition-colors min-h-[140px] flex flex-col items-center justify-center"
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") cameraRef.current?.click(); }}
                >
                  <Camera className="w-8 h-8 mb-2 text-secondary/50" />
                  <p className="font-bold text-[14px] mb-1">Snap Receipt</p>
                  <p className="text-[12px] text-white/30">Use camera to capture receipt</p>
                  <input ref={cameraRef} type="file" accept="image/jpeg,image/png,image/jpg" capture="environment" className="hidden"
                    onChange={e => handleFileUpload(e.target.files)} />
                </div>
              </div>
            )}

            <div className="glass-panel rounded-xl p-5 mb-6">
              <h3 className="text-sm font-bold text-primary mb-3">Manual Entry</h3>
              <div className="grid grid-cols-2 gap-2.5">
                <Input placeholder="Vendor" value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value.slice(0, 200) }))} className="bg-white/5 border-white/10 col-span-2" />
                <Input placeholder="Amount ($)" type="number" min="0.01" max="999999.99" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="bg-white/5 border-white/10" />
                <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="bg-white/5 border-white/10" />
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg p-3 text-white text-sm min-h-[44px] [&>option]:bg-[#0d0d1a] col-span-2">
                  <option value="">Select IRS Category</option>
                  {Object.entries(RECEIPT_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.label} ({cat.pct}%)</option>
                  ))}
                </select>
                <Input placeholder="Business purpose" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value.slice(0, 500) }))} className="bg-white/5 border-white/10 col-span-2" />
              </div>
              <Button className="w-full mt-3 bg-gradient-to-r from-secondary to-[#cc9900] text-black font-bold min-h-[44px]" onClick={addManualReceipt}>
                Log Receipt
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="pl-10 bg-white/5 border-white/10" />
              </div>
              <div className="flex gap-1">
                <button onClick={() => setViewMode("cards")} className={`p-2 rounded-lg ${viewMode === "cards" ? "bg-white/10 text-white" : "text-white/30"}`}>
                  <Receipt className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("ledger")} className={`p-2 rounded-lg ${viewMode === "ledger" ? "bg-white/10 text-white" : "text-white/30"}`}>
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button onClick={() => setCategoryFilter("all")} className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap ${categoryFilter === "all" ? "bg-white/10 text-white" : "text-white/30"}`}>All</button>
              {DOCUMENT_CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setCategoryFilter(c.value)} className={`px-3 py-1 rounded-full text-[11px] whitespace-nowrap ${categoryFilter === c.value ? "bg-white/10 text-white" : "text-white/30"}`}>
                  {c.label}
                </button>
              ))}
            </div>

            {viewMode === "cards" ? (
              <div className="space-y-3 mb-6">
                {filteredDocs.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-10 h-10 mx-auto mb-3 text-white/10" />
                    <p className="font-semibold text-white/40 mb-1">
                      {documents.length === 0 ? "No receipts yet" : "No receipts match that filter"}
                    </p>
                    <p className="text-sm text-white/50">
                      {documents.length === 0 ? "Drop a file above or type in the form to add your first expense." : "Try a different category or clear the filter."}
                    </p>
                  </div>
                ) : filteredDocs.map(d => (
                  <div key={d.id} className="glass-panel rounded-xl p-4">
                    <div className="flex justify-between items-start gap-3 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[14px] truncate">{d.vendor || d.fileName}</p>
                        <p className="text-[12px] text-muted-foreground">{d.category} · {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-[16px] font-extrabold font-mono" style={{ color: d.deductiblePct === 100 ? "#00e676" : "#ffb800" }}>
                            ${d.amount.toFixed(2)}
                          </p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block" style={{
                            background: d.status === "confirmed" ? "rgba(0,230,118,0.15)" : d.status === "analyzed" ? "rgba(156,39,176,0.15)" : "rgba(255,184,0,0.15)",
                            color: d.status === "confirmed" ? "#00e676" : d.status === "analyzed" ? "#9c27b0" : "#ffb800",
                          }}>
                            {d.status === "confirmed" ? "CONFIRMED" : d.status === "analyzed" ? "AI ANALYZED" : "PENDING"}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {d.status === "analyzed" && (
                            <button onClick={() => confirmDocument(d.id)} className="text-[#00e676] hover:text-[#00e676]/80 p-1" aria-label="Confirm">
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => removeDocument(d.id)} className="text-muted-foreground hover:text-[#ff4757] p-1" aria-label="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {d.aiAnalysis && (
                      <div className="mt-2 p-3 rounded-lg border border-[rgba(156,39,176,0.2)] bg-[rgba(156,39,176,0.05)]">
                        <p className="text-[11px] text-[#9c27b0] font-semibold mb-1">AI Analysis</p>
                        <p className="text-[12px] text-white/60">{d.aiAnalysis.suggestedPurpose || d.aiAnalysis.notes}</p>
                        {d.aiAnalysis.items.length > 0 && (
                          <p className="text-[11px] text-white/50 mt-1">Items: {d.aiAnalysis.items.join(", ")}</p>
                        )}
                        <p className="text-[11px] mt-1">
                          <span className={d.aiAnalysis.auditReady ? "text-[#00e676]" : "text-[#ffb800]"}>
                            {d.aiAnalysis.auditReady ? "✓ Audit Ready" : "⚠ Review Needed"}
                          </span>
                          {d.aiAnalysis.ircSection && <span className="text-white/30 ml-2">· {d.aiAnalysis.ircSection}</span>}
                        </p>
                      </div>
                    )}
                    <p className="text-[11px] text-white/50 mt-2">{d.purpose}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-panel rounded-xl overflow-x-auto mb-6">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-white/50 font-semibold">Date</th>
                      <th className="text-left p-3 text-white/50 font-semibold">Vendor</th>
                      <th className="text-left p-3 text-white/50 font-semibold">Category</th>
                      <th className="text-right p-3 text-white/50 font-semibold">Amount</th>
                      <th className="text-right p-3 text-white/50 font-semibold">Deductible</th>
                      <th className="text-center p-3 text-white/50 font-semibold">Status</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map(d => (
                      <tr key={d.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 text-white/60">{d.date}</td>
                        <td className="p-3 text-white/80 font-semibold">{d.vendor || d.fileName}</td>
                        <td className="p-3 text-white/50">{d.category}</td>
                        <td className="p-3 text-right font-mono font-bold text-[#00e676]">${d.amount.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono text-[#00c8f8]">${d.deductibleAmount.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] px-2 py-0.5 rounded-full" style={{
                            background: d.status === "confirmed" ? "rgba(0,230,118,0.15)" : "rgba(255,184,0,0.15)",
                            color: d.status === "confirmed" ? "#00e676" : "#ffb800",
                          }}>{d.status}</span>
                        </td>
                        <td className="p-3">
                          <button onClick={() => removeDocument(d.id)} className="text-white/50 hover:text-[#ff4757]">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="glass-panel rounded-xl p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Total Spent</p>
                <p className="text-xl font-bold font-mono text-white">${total.toFixed(2)}</p>
              </div>
              <div className="glass-panel rounded-xl p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Deductible</p>
                <p className="text-xl font-bold font-mono text-[#00e676]">${deductibleTotal.toFixed(2)}</p>
              </div>
            </div>

            <Button className="w-full bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold gap-2 min-h-[44px]" onClick={exportReceiptCSV}>
              <Download className="w-4 h-4" /> Export Document Summary
            </Button>
          </>
        )}

        {docTab === "mileage" && (
          <>
            <div className="glass-panel rounded-xl p-5 mb-6">
              <h3 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
                <Car className="w-4 h-4" /> Log Mileage Trip
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                <Input type="date" value={mileageForm.date} onChange={e => setMileageForm(p => ({ ...p, date: e.target.value }))} className="bg-white/5 border-white/10" />
                <Input type="number" placeholder="Miles" min="0.1" step="0.1" value={mileageForm.miles} onChange={e => setMileageForm(p => ({ ...p, miles: e.target.value }))} className="bg-white/5 border-white/10" />
                <Input placeholder="Start location" value={mileageForm.start} onChange={e => setMileageForm(p => ({ ...p, start: e.target.value.slice(0, 200) }))} className="bg-white/5 border-white/10" />
                <Input placeholder="End location" value={mileageForm.end} onChange={e => setMileageForm(p => ({ ...p, end: e.target.value.slice(0, 200) }))} className="bg-white/5 border-white/10" />
                <Input placeholder="Business purpose" value={mileageForm.purpose} onChange={e => setMileageForm(p => ({ ...p, purpose: e.target.value.slice(0, 500) }))} className="bg-white/5 border-white/10 col-span-2" />
              </div>
              <Button className="w-full mt-3 bg-gradient-to-r from-[#00c8f8] to-[#0099cc] text-black font-bold min-h-[44px]" onClick={addMileageEntry}>
                <Plus className="w-4 h-4 mr-1" /> Add Trip
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="glass-panel rounded-xl p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">YTD Miles</p>
                <p className="text-xl font-bold font-mono text-white">{ytdMiles.toLocaleString()}</p>
              </div>
              <div className="glass-panel rounded-xl p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">YTD Deduction</p>
                <p className="text-xl font-bold font-mono text-[#00e676]">${ytdMileageDeduction.toFixed(2)}</p>
              </div>
              <div className="glass-panel rounded-xl p-4 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">IRS Rate</p>
                <p className="text-xl font-bold font-mono text-[#00c8f8]">${rates.mileageRate}/mi</p>
              </div>
            </div>

            {mileage.length === 0 ? (
              <div className="text-center py-12">
                <Car className="w-10 h-10 mx-auto mb-3 text-white/10" />
                <p className="font-semibold text-white/40 mb-1">No trips logged yet</p>
                <p className="text-sm text-white/50">Fill in the form above to add your first business trip.</p>
              </div>
            ) : (
              <div className="glass-panel rounded-xl overflow-x-auto mb-6">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 text-white/50 font-semibold">Date</th>
                      <th className="text-left p-3 text-white/50 font-semibold">From</th>
                      <th className="text-left p-3 text-white/50 font-semibold">To</th>
                      <th className="text-right p-3 text-white/50 font-semibold">Miles</th>
                      <th className="text-left p-3 text-white/50 font-semibold">Purpose</th>
                      <th className="text-right p-3 text-white/50 font-semibold">Deductible</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mileage.map(m => (
                      <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="p-3 text-white/60">{m.date}</td>
                        <td className="p-3 text-white/70">{m.startLocation}</td>
                        <td className="p-3 text-white/70">{m.endLocation}</td>
                        <td className="p-3 text-right font-mono text-white">{m.miles}</td>
                        <td className="p-3 text-white/50">{m.purpose}</td>
                        <td className="p-3 text-right font-mono font-bold text-[#00e676]">${m.deductible.toFixed(2)}</td>
                        <td className="p-3">
                          <button onClick={() => setMileage(prev => prev.filter(e => e.id !== m.id))} className="text-white/50 hover:text-[#ff4757]">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Button className="w-full bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold gap-2 min-h-[44px]" onClick={exportMileageCSV}>
              <Download className="w-4 h-4" /> Export Mileage Log CSV
            </Button>
          </>
        )}
      </div>
    </Layout>
  );
}
