import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Capitalize first letter of string */
export function capitalizeFirst(value: string | null | undefined): string {
  if (!value) return "";
  const s = String(value).trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Capitalize first letter of each word (names, titles) */
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

export function formatDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateStr;
  }
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

/** Format notice / announcement author cleanly without empty parentheses () or duplicate roles */
export function formatNoticeAuthor(name?: string | null, role?: string | null): string {
  const cleanName = (name || "").trim();
  const cleanRole = (role || "").trim();

  if (!cleanName && !cleanRole) return "Admin";
  if (!cleanName) {
    return cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1).toLowerCase();
  }
  if (!cleanRole) return cleanName;

  if (cleanName.toLowerCase() === cleanRole.toLowerCase()) {
    return cleanName;
  }

  const formattedRole = cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1).toLowerCase();
  return `${cleanName} (${formattedRole})`;
}

/** Format notice / announcement class label preventing duplicate sections like 10-C-C */
export function formatNoticeClass(
  className?: string | null,
  section?: string | null,
  classes?: Array<{ className: string; section?: string }>
): string {
  if (Array.isArray(classes) && classes.length > 0) {
    const list = classes
      .map((c) => {
        let cn = (c.className || "").trim().replace(/^class\s+/i, "");
        const sec = (c.section || "").trim();
        if (sec && !cn.toLowerCase().endsWith(`-${sec.toLowerCase()}`)) {
          cn = `${cn}-${sec}`;
        }
        return cn;
      })
      .filter(Boolean);
    if (list.length > 0) {
      return list.length === 1 ? `Class ${list[0]}` : `Classes ${list.join(", ")}`;
    }
  }

  if (!className) return "";
  let cn = className.trim().replace(/^class\s+/i, "");
  const sec = (section || "").trim();
  if (sec && !cn.toLowerCase().endsWith(`-${sec.toLowerCase()}`)) {
    cn = `${cn}-${sec}`;
  }
  return `Class ${cn}`;
}

