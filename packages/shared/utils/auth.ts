// packages/shared/utils/auth.ts

/**
 * Generate clean username from name
 * "Rahul Sharma" → "rahulsharma"
 */
export function generateUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Format DOB to password format DDMMYYYY
 */
export function formatDobToPassword(dob: Date | string): string {
  const date = typeof dob === "string" ? new Date(dob) : dob;
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}${month}${year}`;
}

/**
 * Generate unique School Code: SCH-XXXXXX
 */
export function generateSchoolCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SCH-${code}`;
}

/**
 * Generate random temporary password (for Admin & Principal)
 */
export function generateTempPassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Generate 6-digit OTP
 */
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
