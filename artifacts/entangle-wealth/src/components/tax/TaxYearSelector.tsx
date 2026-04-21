import { getTaxYear, setTaxYear } from "@/lib/taxflow-profile";
import { useState } from "react";

export function TaxYearSelector() {
  const [year, setYear] = useState(getTaxYear());

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const y = Number(e.target.value);
    setYear(y);
    setTaxYear(y);
    window.dispatchEvent(new CustomEvent("taxflow-year-change", { detail: y }));
  };

  return (
    <select
      value={year}
      onChange={handleChange}
      className="bg-card border border-border rounded-lg px-2 py-1 text-[12px] text-foreground/70 font-mono focus:outline-none focus:border-[#00B4D8]/40 min-h-[32px] [&>option]:bg-card"
      aria-label="Select tax year"
    >
      <option value={2024}>2024</option>
      <option value={2025}>2025</option>
      <option value={2026}>2026</option>
    </select>
  );
}
