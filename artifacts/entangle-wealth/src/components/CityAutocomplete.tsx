import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin } from "lucide-react";
import { searchCities, formatCityDisplay, type CityEntry } from "@/lib/cities-data";

interface CityAutocompleteProps {
  value: string;
  onChange: (displayValue: string, entry: CityEntry | null) => void;
  onBlur?: () => void;
  id?: string;
  placeholder?: string;
  className?: string;
  hasError?: boolean;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  onBlur,
  id,
  placeholder = "Search city...",
  className = "",
  hasError,
  ...ariaProps
}: CityAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<CityEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [hasSelected, setHasSelected] = useState(value.length > 0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value !== query && !isOpen) {
      setQuery(value);
    }
  }, [value]);

  const handleInputChange = useCallback((text: string) => {
    setQuery(text);
    setHasSelected(false);
    setHighlightedIndex(-1);

    if (text.trim().length >= 2) {
      const results = searchCities(text, 8);
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }

    onChange(text, null);
  }, [onChange]);

  const selectCity = useCallback((entry: CityEntry) => {
    const display = formatCityDisplay(entry);
    setQuery(display);
    setHasSelected(true);
    setIsOpen(false);
    setSuggestions([]);
    setHighlightedIndex(-1);
    onChange(display, entry);
  }, [onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        selectCity(suggestions[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  }, [isOpen, suggestions, highlightedIndex, selectCity]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const items = dropdownRef.current.querySelectorAll("[data-city-item]");
      items[highlightedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={query}
        onChange={e => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (query.trim().length >= 2 && !hasSelected) {
            const results = searchCities(query, 8);
            setSuggestions(results);
            setIsOpen(results.length > 0);
          }
        }}
        onBlur={() => {
          setTimeout(() => {
            setIsOpen(false);
            onBlur?.();
          }, 150);
        }}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={id ? `${id}-listbox` : undefined}
        aria-activedescendant={highlightedIndex >= 0 ? `city-option-${highlightedIndex}` : undefined}
        className={className}
        {...ariaProps}
      />
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 w-full mt-1 max-h-[240px] overflow-y-auto border border-[#FF8C00]/30 bg-[#0D1321] shadow-xl shadow-black/60"
          style={{ borderRadius: 4 }}
        >
          {suggestions.map((entry, idx) => (
            <div
              key={`${entry.city}-${entry.state}-${entry.countryCode}-${idx}`}
              data-city-item
              id={`city-option-${idx}`}
              role="option"
              aria-selected={highlightedIndex === idx}
              onMouseDown={e => {
                e.preventDefault();
                selectCity(entry);
              }}
              onMouseEnter={() => setHighlightedIndex(idx)}
              className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors font-mono text-[11px] ${
                highlightedIndex === idx
                  ? "bg-[#FF8C00]/10 text-[#FF8C00]"
                  : "text-[#FF8C00]/80 hover:bg-[#FF8C00]/5"
              }`}
              style={{ borderBottom: idx < suggestions.length - 1 ? "1px solid rgba(255,140,0,0.08)" : undefined }}
            >
              <MapPin className="w-3 h-3 text-[#FF8C00] flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-bold">{entry.city}</span>
                <span className="text-[#FF8C00]/50">, {entry.state}, </span>
                <span className="text-[#FF8C00]/60">{entry.country}</span>
              </div>
              <span className="text-[8px] text-[#FF8C00]/40 flex-shrink-0">{entry.countryCode}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
