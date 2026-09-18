/** Capitalize the first letter of a string */
export function capitalize(str?: string | null): string {
  if (!str) return "";
  const s = String(str);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Safe string for React Text children with first letter capitalized */
export function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  if (typeof v === "string") {
    if (!v.trim()) return fallback;
    return v.charAt(0).toUpperCase() + v.slice(1);
  }
  if (typeof v === "number" || typeof v === "boolean") {
    return String(v);
  }
  if (Array.isArray(v)) return String(v.length);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.firstName === "string") {
      return formatPersonName(o.firstName, (o.lastName as string) || "");
    }
    if (typeof o.name === "string") return toTitleCase(o.name);
    if (typeof o.title === "string") return capitalize(o.title);
    if (typeof o.count === "number") return String(o.count);
    return fallback || "";
  }
  return fallback;
}

export function numish(v: unknown): string | number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return v;
  if (Array.isArray(v)) return v.length;
  if (v && typeof v === "object") {
    const o = v as any;
    if (typeof o.count === "number") return o.count;
    if (typeof o.total === "number") return o.total;
  }
  return "—";
}

/** Capitalize first letter of each word */
export function toTitleCase(value: string | null | undefined): string {
  if (!value) return "";
  return String(value)
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

export function formatPersonName(first?: string | null, last?: string | null): string {
  return [toTitleCase(first || ""), toTitleCase(last || "")].filter(Boolean).join(" ");
}

/** Format ISO string / YYYY-MM-DD / Date to DD-MM-YYYY (e.g. 04-09-2026) */
export function formatDateDDMMYYYY(val: string | Date | null | undefined): string {
  if (!val) return "";
  try {
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
        const parts = trimmed.slice(0, 10).split("-");
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
        return trimmed;
      }
    }
    const d = typeof val === "string" ? new Date(val) : val;
    if (isNaN(d.getTime())) return typeof val === "string" ? val : "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return typeof val === "string" ? val : "";
  }
}

/** Format date and time with DD-MM-YYYY, hh:mm A (e.g. 04-09-2026, 4:15 PM) */
export function formatDateTimeDDMMYYYY(val: string | Date | null | undefined): string {
  if (!val) return "";
  try {
    const d = typeof val === "string" ? new Date(val) : val;
    if (isNaN(d.getTime())) return typeof val === "string" ? val : "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const timeStr = d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${day}-${month}-${year}, ${timeStr}`;
  } catch {
    return typeof val === "string" ? val : "";
  }
}

/** Get day of the week (e.g. Sunday, Monday) */
export function getDayName(val: string | Date | null | undefined): string {
  if (!val) return "";
  try {
    const d =
      typeof val === "string"
        ? new Date(val.includes("T") ? val : `${val}T00:00:00`)
        : val;
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", { weekday: "long" });
  } catch {
    return "";
  }
}

/** Grouping label for day-wise view: Today · 07-09-2026, Yesterday · 06-09-2026, Monday, 07-09-2026, 12-08-2026 */
export function getDayWiseLabel(dateInput?: string | Date | null): string {
  if (!dateInput) return "Earlier";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "Earlier";

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    const diffMs = today.getTime() - target.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    const pad = (n: number) => String(n).padStart(2, "0");
    const dateFormatted = `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
    const dayName = d.toLocaleDateString("en-US", { weekday: "long" });

    if (diffDays === 0) return `Today · ${dateFormatted}`;
    if (diffDays === 1) return `Yesterday · ${dateFormatted}`;
    if (diffDays > 1 && diffDays < 7) return `${dayName}, ${dateFormatted}`;
    return `${dayName}, ${dateFormatted}`;
  } catch {
    return "Earlier";
  }
}

export function cleanPhone(p?: string | null): string {
  if (!p) return "";
  let s = String(p).trim();
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(/^['"\\=]+/, "").replace(/['"\\]+$/, "").trim();
  }
  return s;
}

export function normalizeClassName(name?: string | null): string {
  if (!name) return "";
  return String(name).trim().toLowerCase().replace(/^class\s+/i, "");
}

export function normalizeSection(sec?: string | null): string {
  if (!sec) return "";
  return String(sec).trim().toLowerCase();
}

export function isSameClassAndSection(
  clsA?: string | null,
  secA?: string | null,
  clsB?: string | null,
  secB?: string | null
): boolean {
  const cA = normalizeClassName(clsA);
  const cB = normalizeClassName(clsB);
  if (cA !== cB) return false;
  const sA = normalizeSection(secA);
  const sB = normalizeSection(secB);
  return !sA || !sB ? true : sA === sB;
}


