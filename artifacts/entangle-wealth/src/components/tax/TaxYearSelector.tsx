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
      className="bg-[#0d0f18] border border-white/10 rounded-lg px-2 py-1 text-[12px] text-white/70 font-mono focus:outline-none focus:border-[#00FF41]/40 min-h-[32px] [&>option]:bg-[#0d0f18]"
      aria-label="Select tax year"
    >
      <option value={2024}>2024</option>
      <option value={2025}>2025</option>
      <option value={2026}>2026</option>
    </select>
  );
}
