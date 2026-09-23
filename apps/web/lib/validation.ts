/** Shared form validation helpers — returns error message or empty string */

export function validateRequired(value: string | undefined | null, label = "This field"): string {
  if (value == null || String(value).trim() === "") return `${label} is required`;
  return "";
}

export function validateEmail(value: string | undefined | null, required = true): string {
  const v = (value || "").trim();
  if (!v) return required ? "Email is required" : "";
  // Practical email pattern
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  if (!re.test(v)) return "Enter a valid email address";
  return "";
}

export function cleanPhoneNumber(raw?: any): string {
  if (raw == null) return "";
  let s = String(raw).trim();
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(/^['"\\=]+/, "").replace(/['"\\]+$/, "").trim();
  }
  return s;
}

/**
 * Validate phone number (digits only after country code stripping).
 * Accepts values like "+919876543210", "9876543210", or with spaces/dashes.
 * Default expects 10 digits for India (+91); other countries use min 7 max 15 digits.
 */
export function validatePhone(
  value: string | undefined | null,
  options: { required?: boolean; countryCode?: string } = {}
): string {
  const { required = false, countryCode = "+91" } = options;
  const raw = cleanPhoneNumber(value);
  if (!raw) return required ? "Phone number is required" : "";

  // Strip spaces, dashes, parentheses
  let digits = raw.replace(/[\s\-()]/g, "");

  // If starts with country code, strip it for length check
  const cc = countryCode.replace(/\D/g, "");
  if (digits.startsWith("+")) {
    digits = digits.slice(1);
  }
  if (cc && digits.startsWith(cc)) {
    digits = digits.slice(cc.length);
  }

  if (!/^\d+$/.test(digits)) return "Phone number must contain only digits";

  // India default: exactly 10 digits
  if (countryCode === "+91" || countryCode === "91") {
    if (digits.length !== 10) return "Enter a valid 10-digit mobile number";
    if (!/^[6-9]/.test(digits)) return "Indian mobile number must start with 6–9";
    return "";
  }

  if (digits.length < 7 || digits.length > 15) return "Enter a valid phone number (7–15 digits)";
  return "";
}

export function validateName(value: string | undefined | null, label = "Name"): string {
  const v = (value || "").trim();
  if (!v) return `${label} is required`;
  if (v.length < 2) return `${label} must be at least 2 characters`;
  if (!/^[a-zA-Z\s.'-]+$/.test(v)) return `${label} can only contain letters and spaces`;
  return "";
}

export function validatePassword(value: string | undefined | null, minLength = 6): string {
  const v = (value || "").trim();
  if (!v) return "Password is required";
  if (v.length < minLength) return `Password must be at least ${minLength} characters`;
  return "";
}


export type FieldErrors = Record<string, string>;

/** Collect first error per field; returns null if all valid */
export function collectErrors(checks: Record<string, string>): FieldErrors | null {
  const errors: FieldErrors = {};
  let has = false;
  for (const [key, msg] of Object.entries(checks)) {
    if (msg) {
      errors[key] = msg;
      has = true;
    }
  }
  return has ? errors : null;
}

/** Format ISO date as DD-MM-YYYY, hh:mm am/pm (without seconds) */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const padHours = pad(hours);
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}, ${padHours}:${minutes} ${ampm}`;
}

/** Format time as hh:mm am/pm (e.g. 09:30 am, 10:26 pm without seconds) */
export function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  let hours = d.getHours();
  const minutes = pad(d.getMinutes());
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const padHours = pad(hours);
  return `${padHours}:${minutes} ${ampm}`;
}

/** Format date string (YYYY-MM-DD or ISO) as DD-MM-YYYY (e.g. 03-09-2026) */
export function formatDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}-${mm}-${yyyy}`;
  }
  return String(dateStr);
}


/** DOB / date must be strictly before today (past date) */
export function validatePastDate(value: string | undefined | null, label = "Date of birth"): string {
  const v = (value || "").trim();
  if (!v) return `${label} is required`;
  const d = new Date(v + "T00:00:00");
  if (Number.isNaN(d.getTime())) return `Enter a valid ${label.toLowerCase()}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d >= today) return `${label} must be a past date`;
  // optional: not older than 100 years
  const min = new Date();
  min.setFullYear(min.getFullYear() - 100);
  if (d < min) return `${label} is too far in the past`;
  return "";
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

export function capitalize(str?: string | null): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatPersonName(first?: string | null, last?: string | null): string {
  return [toTitleCase(first || ""), toTitleCase(last || "")].filter(Boolean).join(" ");
}

/** Check if hex color is at least 30% dark (lightness <= 0.70) */
export function isThemeColorDarkEnough(hex?: string | null, maxLightness = 0.70): boolean {
  if (!hex) return false;
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return false;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  return lightness <= maxLightness;
}

export function validateThemeColor(hex?: string | null): string {
  if (!hex) return "Theme color is required";
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return "Enter a valid hex color (e.g. #6366F1)";
  if (!isThemeColorDarkEnough(hex, 0.70)) {
    return "Theme color must be at least 30% dark (avoid very light or washed out colors)";
  }
  return "";
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



