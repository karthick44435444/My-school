"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

export type CountryOption = {
  code: string; // e.g. "+91"
  iso: string;
  name: string;
  flag: string;
  dialDigits: string;
};

export const COUNTRIES: CountryOption[] = [
  { code: "+91", iso: "IN", name: "India", flag: "🇮🇳", dialDigits: "91" },
  { code: "+1", iso: "US", name: "United States", flag: "🇺🇸", dialDigits: "1" },
  { code: "+44", iso: "GB", name: "United Kingdom", flag: "🇬🇧", dialDigits: "44" },
  { code: "+971", iso: "AE", name: "UAE", flag: "🇦🇪", dialDigits: "971" },
  { code: "+61", iso: "AU", name: "Australia", flag: "🇦🇺", dialDigits: "61" },
  { code: "+65", iso: "SG", name: "Singapore", flag: "🇸🇬", dialDigits: "65" },
  { code: "+92", iso: "PK", name: "Pakistan", flag: "🇵🇰", dialDigits: "92" },
  { code: "+880", iso: "BD", name: "Bangladesh", flag: "🇧🇩", dialDigits: "880" },
  { code: "+977", iso: "NP", name: "Nepal", flag: "🇳🇵", dialDigits: "977" },
  { code: "+94", iso: "LK", name: "Sri Lanka", flag: "🇱🇰", dialDigits: "94" },
  { code: "+966", iso: "SA", name: "Saudi Arabia", flag: "🇸🇦", dialDigits: "966" },
  { code: "+974", iso: "QA", name: "Qatar", flag: "🇶🇦", dialDigits: "974" },
  { code: "+968", iso: "OM", name: "Oman", flag: "🇴🇲", dialDigits: "968" },
  { code: "+973", iso: "BH", name: "Bahrain", flag: "🇧🇭", dialDigits: "973" },
  { code: "+60", iso: "MY", name: "Malaysia", flag: "🇲🇾", dialDigits: "60" },
];

type PhoneInputProps = {
  value?: string; // full value including country code preferred, e.g. "+919876543210"
  onChange: (fullPhone: string, countryCode: string, nationalNumber: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  defaultCountryCode?: string;
};

function parsePhone(value: string | undefined, defaultCode: string) {
  const raw = (value || "").trim();
  if (!raw) return { countryCode: defaultCode, national: "" };

  // Try match known country codes (longest first)
  const sorted = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);
  for (const c of sorted) {
    if (raw.startsWith(c.code)) {
      return { countryCode: c.code, national: raw.slice(c.code.length).replace(/\D/g, "") };
    }
    if (raw.startsWith(c.dialDigits) && raw.length > c.dialDigits.length) {
      return { countryCode: c.code, national: raw.slice(c.dialDigits.length).replace(/\D/g, "") };
    }
  }
  // Bare digits → use default country
  return { countryCode: defaultCode, national: raw.replace(/\D/g, "") };
}

export default function PhoneInput({
  value,
  onChange,
  error,
  placeholder = "98765 43210",
  disabled,
  className = "",
  defaultCountryCode = "+91",
}: PhoneInputProps) {
  const parsed = useMemo(() => parsePhone(value, defaultCountryCode), [value, defaultCountryCode]);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [national, setNational] = useState(parsed.national);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Sync from external value
  useEffect(() => {
    const p = parsePhone(value, defaultCountryCode);
    setCountryCode(p.countryCode);
    setNational(p.national);
  }, [value, defaultCountryCode]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const country = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  const emit = (code: string, num: string) => {
    const clean = num.replace(/\D/g, "");
    const full = clean ? `${code}${clean}` : "";
    onChange(full, code, clean);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.iso.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <div
        className={`flex items-stretch rounded-xl border bg-white overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 ${
          error ? "border-red-400" : "border-slate-200"
        }`}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 border-r border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm shrink-0"
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="font-medium text-slate-700">{country.code}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
        <input
          type="tel"
          inputMode="numeric"
          disabled={disabled}
          value={national}
          placeholder={placeholder}
          onChange={(e) => {
            const next = e.target.value.replace(/[^\d\s]/g, "");
            setNational(next);
            emit(countryCode, next);
          }}
          className="flex-1 px-3 py-2.5 outline-none text-sm min-w-0"
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 left-0 w-72 max-h-64 overflow-hidden bg-white rounded-xl border border-slate-200 shadow-lg">
          <div className="p-2 border-b">
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <ul className="overflow-y-auto max-h-48 py-1">
            {filtered.map((c) => (
              <li key={c.iso + c.code}>
                <button
                  type="button"
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-indigo-50 text-left ${
                    c.code === countryCode ? "bg-indigo-50 text-indigo-700" : ""
                  }`}
                  onClick={() => {
                    setCountryCode(c.code);
                    setOpen(false);
                    setSearch("");
                    emit(c.code, national);
                  }}
                >
                  <span className="text-lg">{c.flag}</span>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-slate-500 font-mono text-xs">{c.code}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-slate-400 text-sm">No countries found</li>
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
