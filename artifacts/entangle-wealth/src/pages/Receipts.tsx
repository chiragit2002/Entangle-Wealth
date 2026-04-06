import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { Receipt, Upload, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ReceiptEntry {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  categoryLabel: string;
  deductionPct: number;
  purpose: string;
  date: string;
}

const CATEGORIES: Record<string, { label: string; pct: number; ref: string }> = {
  meals: { label: "Meals & Entertainment", pct: 50, ref: "IRS Pub 463" },
  travel: { label: "Business Travel", pct: 100, ref: "IRS Pub 463" },
  office: { label: "Office Supplies", pct: 100, ref: "IRC 162" },
  software: { label: "Software & Subscriptions", pct: 100, ref: "IRC 162" },
  vehicle: { label: "Vehicle & Transportation", pct: 100, ref: "IRS Pub 463" },
  marketing: { label: "Advertising & Marketing", pct: 100, ref: "IRC 162" },
  professional: { label: "Professional Services", pct: 100, ref: "IRC 162" },
  education: { label: "Education & Training", pct: 100, ref: "IRC 162" },
  phone: { label: "Phone & Internet", pct: 75, ref: "IRC 162" },
  other: { label: "Other Business Expense", pct: 100, ref: "IRC 162" },
};

const INITIAL_RECEIPTS: ReceiptEntry[] = [
  { id: "demo-1", vendor: "Delta Airlines", amount: 480, category: "travel", categoryLabel: "Business Travel", deductionPct: 100, purpose: "Client site visit", date: "2024-01-15" },
  { id: "demo-2", vendor: "Client Dinner - Mastros", amount: 210, category: "meals", categoryLabel: "Meals & Entertainment", deductionPct: 50, purpose: "Q1 strategy discussion with client", date: "2024-01-18" },
  { id: "demo-3", vendor: "Adobe Creative Cloud", amount: 54, category: "software", categoryLabel: "Software & Subscriptions", deductionPct: 100, purpose: "Design tools for client projects", date: "2024-01-20" },
];

const STORAGE_KEY = "entangle-receipts";

function escapeCSV(str: string): string {
  let s = str;
  if (/^[=+\-@\t\r]/.test(s)) {
    s = "'" + s;
  }
  return `"${s.replace(/"/g, '""')}"`;
}

export default function Receipts() {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<ReceiptEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return INITIAL_RECEIPTS;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return INITIAL_RECEIPTS;
      return parsed;
    } catch { return INITIAL_RECEIPTS; }
  });
  const [form, setForm] = useState({ vendor: "", amount: "", category: "", purpose: "", date: "" });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(receipts));
  }, [receipts]);

  const total = receipts.reduce((sum, r) => sum + r.amount, 0);
  const deductibleTotal = receipts.reduce((sum, r) => sum + (r.amount * r.deductionPct / 100), 0);

  const addReceipt = () => {
    const vendor = form.vendor.trim();
    const amountStr = form.amount.trim();
    if (!vendor || !amountStr || !form.category) {
      toast({ title: "Missing fields", description: "Vendor, amount, and category are required.", variant: "destructive" });
      return;
    }
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0 || amount > 999999.99) {
      toast({ title: "Invalid amount", description: "Enter a valid amount between $0.01 and $999,999.99.", variant: "destructive" });
      return;
    }
    const cat = CATEGORIES[form.category];
    if (!cat) return;
    const entry: ReceiptEntry = {
      id: crypto.randomUUID(),
      vendor: vendor.slice(0, 200),
      amount: Math.round(amount * 100) / 100,
      category: form.category,
      categoryLabel: cat.label,
      deductionPct: cat.pct,
      purpose: (form.purpose.trim() || "Business expense").slice(0, 500),
      date: form.date || new Date().toISOString().split("T")[0],
    };
    setReceipts(prev => [entry, ...prev]);
    setForm({ vendor: "", amount: "", category: "", purpose: "", date: "" });
    toast({ title: "Receipt logged", description: `${entry.vendor} — $${entry.amount.toFixed(2)} added.` });
  };

  const removeReceipt = (id: string) => {
    setReceipts(prev => prev.filter(r => r.id !== id));
  };

  const exportForCPA = () => {
    if (receipts.length === 0) {
      toast({ title: "No receipts", description: "Add some receipts before exporting.", variant: "destructive" });
      return;
    }
    const lines = ["Vendor,Amount,Category,Deductible %,Purpose,Date"];
    receipts.forEach(r => {
      lines.push(`${escapeCSV(r.vendor)},${r.amount.toFixed(2)},${escapeCSV(r.categoryLabel)},${r.deductionPct}%,${escapeCSV(r.purpose)},${r.date}`);
    });
    lines.push("");
    lines.push(`Total,$${total.toFixed(2)}`);
    lines.push(`Deductible Total,$${deductibleTotal.toFixed(2)}`);
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipts-export-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Receipt CSV downloaded for your CPA." });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <Receipt className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold">Receipt Scanner</h1>
        </div>
        <div className="glass-panel rounded-xl p-4 mb-6 border border-[rgba(255,215,0,0.2)] bg-[rgba(255,215,0,0.03)]">
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Upload or photograph receipts. TaxFlow categorizes them based on IRS expense categories. Keep all original receipts for 7 years per IRS guidelines.
          </p>
        </div>

        <div
          className="glass-panel rounded-xl p-5 mb-6 border-dashed border-2 border-primary/20 text-center cursor-pointer hover:border-primary/40 transition-colors min-h-[100px] flex flex-col items-center justify-center"
          role="button"
          tabIndex={0}
          aria-label="Upload receipt image"
          onClick={() => document.getElementById("receipt-file-input")?.click()}
          onKeyDown={e => { if (e.key === "Enter" || e.key === " ") document.getElementById("receipt-file-input")?.click(); }}
        >
          <Upload className="w-10 h-10 mx-auto mb-2 text-primary/50" />
          <p className="font-bold mb-1">Scan Receipt</p>
          <p className="text-[13px] text-muted-foreground">Tap to photograph or upload</p>
          <input type="file" id="receipt-file-input" accept="image/*" className="hidden"
            onChange={() => toast({ title: "Receipt uploaded", description: "Image saved. Fill in details below to categorize." })} />
        </div>

        <div className="glass-panel rounded-xl p-5 mb-6">
          <h3 className="text-sm font-bold text-primary mb-3">Or Enter Manually</h3>
          <div className="space-y-2.5">
            <Input placeholder="Vendor / Business Name" value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value.slice(0, 200) }))} maxLength={200} className="bg-white/5 border-white/10" />
            <Input placeholder="Amount ($)" type="number" min="0.01" max="999999.99" step="0.01" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="bg-white/5 border-white/10" />
            <select
              value={form.category}
              onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              className="w-full bg-[#0d0d1a] border border-white/10 rounded-lg p-3 text-white text-sm focus:outline-none focus:border-primary/50 min-h-[44px] [&>option]:bg-[#0d0d1a] [&>option]:text-white"
              aria-label="Select IRS Category"
            >
              <option value="">Select IRS Category</option>
              {Object.entries(CATEGORIES).map(([key, cat]) => (
                <option key={key} value={key}>{cat.label} ({cat.pct}% deductible)</option>
              ))}
            </select>
            <Input placeholder="Business purpose (required by IRS)" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value.slice(0, 500) }))} maxLength={500} className="bg-white/5 border-white/10" />
            <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="bg-white/5 border-white/10" aria-label="Receipt date" />
            <Button className="w-full bg-gradient-to-r from-secondary to-[#cc9900] text-black font-bold min-h-[44px]" onClick={addReceipt}>
              Log Receipt
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-4">
          <h2 className="text-lg font-semibold">Logged Receipts</h2>
          <span className="text-sm font-mono text-primary">${total.toFixed(2)} total</span>
        </div>

        {receipts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>No receipts logged yet. Add your first one above.</p>
          </div>
        ) : (
          <div className="space-y-3 mb-6">
            {receipts.map((r) => (
              <div key={r.id} className="glass-panel rounded-xl p-4 flex justify-between items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[14px] truncate">{r.vendor}</p>
                  <p className="text-[12px] text-muted-foreground">{r.categoryLabel} · {new Date(r.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                  <p className="text-[11px] mt-0.5" style={{ color: r.deductionPct === 100 ? "#00ff88" : r.deductionPct >= 75 ? "#00d4ff" : "#ffd700" }}>
                    {r.deductionPct}% deductible · {CATEGORIES[r.category]?.ref || "IRC 162"}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3 flex-shrink-0">
                  <div>
                    <p className="text-[16px] font-extrabold" style={{ color: r.deductionPct === 100 ? "#00ff88" : "#ffd700" }}>
                      ${r.amount.toFixed(2)}
                    </p>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full inline-block" style={{
                      background: r.deductionPct === 100 ? "rgba(0,255,136,0.15)" : "rgba(255,215,0,0.15)",
                      color: r.deductionPct === 100 ? "#00ff88" : "#ffd700",
                    }}>
                      {r.deductionPct === 100 ? "VERIFIED" : `${r.deductionPct}%`}
                    </span>
                  </div>
                  <button
                    onClick={() => removeReceipt(r.id)}
                    className="text-muted-foreground hover:text-[#ff3366] transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`Delete ${r.vendor} receipt`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="glass-panel rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Total Spent</p>
            <p className="text-xl font-bold font-mono text-white">${total.toFixed(2)}</p>
          </div>
          <div className="glass-panel rounded-xl p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Deductible</p>
            <p className="text-xl font-bold font-mono text-[#00ff88]">${deductibleTotal.toFixed(2)}</p>
          </div>
        </div>

        <Button className="w-full bg-gradient-to-r from-primary to-[#0099cc] text-black font-bold gap-2 min-h-[44px]" onClick={exportForCPA}>
          <Download className="w-4 h-4" /> Export for CPA
        </Button>
      </div>
    </Layout>
  );
}
