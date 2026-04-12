import { useState, useRef, useEffect, useMemo } from "react";
import { Briefcase, ChevronDown, Check, Search, X } from "lucide-react";
import { OCCUPATIONS, OCCUPATION_CATEGORIES, getOccupationById } from "@workspace/occupations";
import type { Occupation } from "@workspace/occupations";
import { cn } from "@/lib/utils";

interface OccupationDropdownProps {
  value: string;
  onChange: (occupationId: string) => void;
  error?: string;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  inputId?: string;
}

export function OccupationDropdown({
  value,
  onChange,
  error,
  disabled,
  className,
  placeholder = "Search occupations...",
  inputId,
}: OccupationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOccupation = value ? getOccupationById(value) : undefined;

  const filteredOccupations = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return OCCUPATIONS;
    return OCCUPATIONS.filter(
      o =>
        o.name.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q) ||
        o.taxCategory.toLowerCase().includes(q)
    );
  }, [query]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, Occupation[]> = {};
    for (const occ of filteredOccupations) {
      if (!groups[occ.category]) groups[occ.category] = [];
      groups[occ.category].push(occ);
    }
    const orderedGroups: { category: string; occupations: Occupation[] }[] = [];
    for (const cat of OCCUPATION_CATEGORIES) {
      if (groups[cat]) {
        orderedGroups.push({ category: cat, occupations: groups[cat] });
      }
    }
    return orderedGroups;
  }, [filteredOccupations]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const handleSelect = (occ: Occupation) => {
    onChange(occ.id);
    setOpen(false);
    setQuery("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setQuery("");
  };

  const taxBadgeColor: Record<string, string> = {
    "W-2": "text-blue-400/70 bg-blue-400/10",
    "1099": "text-amber-400/70 bg-amber-400/10",
    "Business Owner": "text-green-400/70 bg-green-400/10",
    "Mixed": "text-purple-400/70 bg-purple-400/10",
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        id={inputId}
        disabled={disabled}
        onClick={() => setOpen(prev => !prev)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn(
          "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-md border transition-colors text-left",
          "bg-white/5 border-white/10 text-white min-h-[40px]",
          error ? "border-red-500/50" : open ? "border-primary/50" : "hover:border-white/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="flex items-center gap-2 flex-1 min-w-0">
          <Briefcase className="w-3.5 h-3.5 text-primary/60 shrink-0" />
          {selectedOccupation ? (
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <span className="truncate text-white">{selectedOccupation.name}</span>
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0", taxBadgeColor[selectedOccupation.taxCategory])}>
                {selectedOccupation.taxCategory}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground/60">{placeholder}</span>
          )}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {selectedOccupation && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onChange("");
                  setQuery("");
                }
              }}
              className="text-white/20 hover:text-white/50 rounded p-0.5 transition-colors"
              aria-label="Clear selection"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={cn("w-3.5 h-3.5 text-white/30 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div
          className="absolute z-50 w-full mt-1 rounded-md border border-white/10 bg-[#0d0f18] shadow-2xl shadow-black/50 overflow-hidden"
          role="listbox"
          aria-label="Select occupation"
        >
          <div className="p-2 border-b border-white/10">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-white/5 rounded-md">
              <Search className="w-3.5 h-3.5 text-white/30 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
                aria-label="Search occupations"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-white/30 hover:text-white/50 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[280px] overflow-y-auto">
            {groupedResults.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No occupations found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              groupedResults.map(({ category, occupations }) => (
                <div key={category}>
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider sticky top-0 bg-[#0d0f18]">
                    {category}
                  </div>
                  {occupations.map(occ => (
                    <button
                      key={occ.id}
                      type="button"
                      role="option"
                      aria-selected={occ.id === value}
                      onClick={() => handleSelect(occ)}
                      className={cn(
                        "w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-white/[0.05]",
                        occ.id === value && "bg-primary/10 text-primary"
                      )}
                    >
                      <span className="truncate flex-1">{occ.name}</span>
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", taxBadgeColor[occ.taxCategory])}>
                          {occ.taxCategory}
                        </span>
                        {occ.id === value && <Check className="w-3 h-3 text-primary" />}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
