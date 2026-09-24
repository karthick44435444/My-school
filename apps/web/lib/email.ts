/**
 * Email service — Resend (preferred) or SMTP via nodemailer-compatible fetch.
 * Configure via .env (see .env.example).
 *
 * When EMAIL_ENABLED is not "true", emails are logged to console and
 * OTP codes are still returned in API responses for local demo.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://schoolvajo.com";
const LOGIN_URL = `${APP_URL}/login`;
const LOGO_URL = `${APP_URL}/icon.png`;
const APP_DOWNLOAD_URL = `${APP_URL}/api/app/download`;

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export function isEmailEnabled() {
  const explicit = (process.env.EMAIL_ENABLED || "").trim().toLowerCase();
  if (explicit === "true" || explicit === "1" || explicit === "yes")
    return true;
  if (explicit === "false" || explicit === "0" || explicit === "no")
    return false;
  // If RESEND_API_KEY is configured in production, automatically enable sending
  return Boolean((process.env.RESEND_API_KEY || "").trim());
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  const cleanTo = (to || "").trim();
  if (!cleanTo) {
    return { success: false, skipped: true, reason: "no recipient" };
  }

  if (!isEmailEnabled()) {
    console.log("[email:demo (disabled)]", {
      to: cleanTo,
      subject,
      text: text || html.replace(/<[^>]+>/g, " ").slice(0, 200),
    });
    return { success: true, demo: true };
  }

  const provider = (process.env.EMAIL_PROVIDER || "resend")
    .toLowerCase()
    .trim();

  if (provider === "resend") {
    const rawKey = process.env.RESEND_API_KEY || "";
    const key = rawKey.replace(/^["']|["']$/g, "").trim();

    const rawFrom = process.env.EMAIL_FROM || "";
    let from = rawFrom.replace(/^["']|["']$/g, "").trim();
    if (!from) {
      from = "SchoolVajo <noreply@schoolvajo.com>";
    }

    if (!key) {
      console.warn(
        "[email] RESEND_API_KEY missing or empty in environment variables",
      );
      return { success: false, error: "RESEND_API_KEY missing" };
    }

    try {
      console.log(
        `[email:resend:sending] To: ${cleanTo}, From: ${from}, Subject: "${subject}"`,
      );
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [cleanTo],
          subject,
          html,
          text,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`[email:resend:error] Status ${res.status}:`, data);
        return {
          success: false,
          status: res.status,
          error:
            data.message || data.error || `Resend HTTP error ${res.status}`,
          details: data,
        };
      }

      console.log(`[email:resend:success] Dispatched id: ${data.id}`);
      return { success: true, id: data.id };
    } catch (fetchErr: any) {
      console.error("[email:resend:fetch_exception]", fetchErr);
      return {
        success: false,
        error: fetchErr.message || "Network request to Resend failed",
      };
    }
  }

  console.log("[email:log]", { to: cleanTo, subject });
  return { success: true, demo: true };
}

/**
 * 1. Forgot Password OTP Verification Email Template
 */
export function otpEmailHtml(code: string, schoolName?: string) {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP — SchoolVajo</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#ffffff;border-radius:24px;border:1px solid #e2e8f0;box-shadow:0 12px 35px -8px rgba(15,23,42,0.08);overflow:hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #3730a3 0%, #4338ca 50%, #6366f1 100%);padding:32px 32px 28px;text-align:center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <!-- Brand Badge -->
                    <div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);padding:6px 14px;border-radius:24px;margin-bottom:12px;">
                      <img src="${LOGO_URL}" alt="SchoolVajo" width="18" height="18" style="vertical-align:middle;margin-right:8px;border-radius:4px;" />
                      <span style="color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">SchoolVajo</span>
                    </div>
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Password Reset Request</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:13px;">${schoolName || "Smart School Management"}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 32px 28px;">
              <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
                Hello,
              </p>
              <p style="margin:0 0 22px;color:#475569;font-size:14px;line-height:1.6;">
                We received a request to reset your password for <strong>${schoolName || "SchoolVajo"}</strong>. Use the 6-digit verification code below to authorize your password change:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background:linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);border:2px dashed #6366f1;border-radius:18px;padding:24px 16px;text-align:center;margin-bottom:24px;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#3730a3;display:inline-block;margin-left:10px;">${code}</span>
              </div>

              <!-- Security Notice -->
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #6366f1;border-radius:12px;padding:14px 16px;margin-bottom:22px;">
                <p style="margin:0 0 6px;color:#1e293b;font-size:13px;font-weight:700;">
                  ⏰ <strong>Validity:</strong> 15 Minutes
                </p>
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
                  If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
                </p>
              </div>

              <div style="text-align:center;padding-top:6px;">
                <a href="${LOGIN_URL}" target="_blank" style="color:#4338ca;font-size:13px;font-weight:700;text-decoration:none;">
                  Go to Login Page →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px;color:#64748b;font-size:12px;">
                Official Website: <a href="${APP_URL}" target="_blank" style="color:#4338ca;font-weight:700;text-decoration:none;">https://schoolvajo.com/</a>
              </p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                © ${currentYear} SchoolVajo — Modern School Management Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 2. School Creation OTP Verification Email Template
 */
export function schoolRegistrationOtpEmailHtml(
  code: string,
  schoolName: string,
) {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify School Registration — SchoolVajo</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#ffffff;border-radius:24px;border:1px solid #e2e8f0;box-shadow:0 12px 35px -8px rgba(15,23,42,0.08);overflow:hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #3730a3 0%, #4338ca 50%, #6366f1 100%);padding:32px 32px 28px;text-align:center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);padding:6px 14px;border-radius:24px;margin-bottom:12px;">
                      <img src="${LOGO_URL}" alt="SchoolVajo" width="18" height="18" style="vertical-align:middle;margin-right:8px;border-radius:4px;" />
                      <span style="color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">Institution Onboarding</span>
                    </div>
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Verify Your School Email</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:14px;font-weight:600;">${schoolName}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 32px 28px;">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;font-weight:700;">Complete Your School Registration</h2>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
                Thank you for choosing <strong>SchoolVajo</strong> for <strong>${schoolName}</strong>. Please enter the 6-digit verification code below to verify your administrative email address:
              </p>

              <!-- OTP Code Display Card -->
              <div style="background:linear-gradient(135deg, #eef2ff 0%, #f5f3ff 100%);border:2px dashed #6366f1;border-radius:18px;padding:24px 16px;text-align:center;margin-bottom:24px;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#3730a3;display:inline-block;margin-left:10px;">${code}</span>
              </div>

              <!-- Validity Card -->
              <div style="background-color:#f8fafc;border-radius:14px;padding:14px 16px;border:1px solid #e2e8f0;margin-bottom:20px;">
                <p style="margin:0 0 6px;color:#475569;font-size:13px;line-height:1.5;">
                  ⏰ <strong>Validity:</strong> This code is valid for <strong>15 minutes</strong>.
                </p>
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
                  🔒 <strong>Security Notice:</strong> Never share this code with anyone. SchoolVajo staff will never ask for your verification code.
                </p>
              </div>

              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">
                If you did not initiate this school creation, you can safely disregard this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px;color:#64748b;font-size:12px;">
                Official Website: <a href="${APP_URL}" target="_blank" style="color:#4338ca;font-weight:700;text-decoration:none;">https://schoolvajo.com/</a>
              </p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">
                © ${currentYear} SchoolVajo — Modern School Management Platform. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 3. User Credentials Email Template (Admin, Principal, Teacher, Student, Parent)
 */
export function credentialsEmailHtml(opts: {
  role: string;
  schoolCode: string;
  username: string;
  password: string;
  schoolName?: string;
  recipientName?: string;
  className?: string;
  section?: string;
  loginUrl?: string;
}) {
  const currentYear = new Date().getFullYear();
  const roleName = opts.role.toUpperCase();
  const roleLabel =
    roleName === "ADMIN"
      ? "Administrator"
      : roleName === "PRINCIPAL"
        ? "Principal"
        : roleName === "TEACHER"
          ? "Teacher"
          : roleName === "STUDENT"
            ? "Student"
            : roleName === "PARENT"
              ? "Parent"
              : opts.role;

  const loginLink = opts.loginUrl || LOGIN_URL;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Account Credentials — SchoolVajo</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:24px;border:1px solid #e2e8f0;box-shadow:0 12px 35px -8px rgba(15,23,42,0.08);overflow:hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #3730a3 0%, #4338ca 50%, #6366f1 100%);padding:32px 32px 28px;text-align:center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);padding:6px 14px;border-radius:24px;margin-bottom:12px;">
                      <img src="${LOGO_URL}" alt="SchoolVajo" width="18" height="18" style="vertical-align:middle;margin-right:8px;border-radius:4px;" />
                      <span style="color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">${opts.schoolName || "SchoolVajo"}</span>
                    </div>
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Official Account Created</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Welcome to the SchoolVajo Cloud Campus</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 32px 28px;">
              <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
                Hello <strong>${opts.recipientName || opts.username}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
                Your official <strong>${roleLabel}</strong> account is ready on <strong>${opts.schoolName || "SchoolVajo"}</strong>. Below are your secure login credentials to access the web and mobile portals:
              </p>

              <!-- Credentials Card -->
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #4338ca;border-radius:18px;padding:22px;margin-bottom:24px;">
                <div style="margin-bottom:14px;">
                  <span style="background-color:#e0e7ff;color:#4338ca;font-size:11px;font-weight:800;padding:4px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:0.5px;">
                    ${roleLabel} Account
                  </span>
                  ${opts.className ? `<span style="background-color:#f1f5f9;color:#334155;font-size:11px;font-weight:700;padding:4px 10px;border-radius:12px;margin-left:8px;">Class ${opts.className}${opts.section ? ` · ${opts.section}` : ""}</span>` : ""}
                </div>

                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:600;width:130px;">School Code:</td>
                    <td style="padding:7px 0;color:#0f172a;font-size:15px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.schoolCode}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:600;">Username:</td>
                    <td style="padding:7px 0;color:#0f172a;font-size:15px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.username}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:600;">Password:</td>
                    <td style="padding:7px 0;color:#4338ca;font-size:15px;font-weight:800;font-family:'Courier New',Courier,monospace;background-color:#eef2ff;padding:4px 10px;border-radius:8px;display:inline-block;">${opts.password}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;font-size:13px;font-weight:600;">Website:</td>
                    <td style="padding:7px 0;color:#4338ca;font-size:14px;font-weight:700;">
                      <a href="${APP_URL}" target="_blank" style="color:#4338ca;text-decoration:none;">https://schoolvajo.com/</a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Action CTAs -->
              <div style="text-align:center;margin-bottom:26px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;max-width:440px;">
                  <tr>
                    <td align="center" style="padding:6px 0;">
                      <a href="${APP_DOWNLOAD_URL}" target="_blank" style="display:inline-block;width:100%;box-sizing:border-box;background:#0f172a;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:13px 24px;border-radius:14px;box-shadow:0 4px 14px rgba(15,23,42,0.2);text-align:center;">
                        Download Android App (.apk)
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:6px 0;">
                      <a href="${loginLink}" target="_blank" style="display:inline-block;width:100%;box-sizing:border-box;background:linear-gradient(135deg, #3730a3 0%, #4338ca 50%, #6366f1 100%);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:14px 24px;border-radius:14px;box-shadow:0 6px 18px rgba(67,56,202,0.28);text-align:center;">
                        Open Website →
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Quick Steps -->
              <div style="border-top:1px solid #f1f5f9;padding-top:18px;margin-bottom:20px;">
                <h4 style="margin:0 0 10px;color:#1e293b;font-size:13px;font-weight:700;">How to Get Started:</h4>
                <ol style="margin:0;padding-left:18px;color:#64748b;font-size:12px;line-height:1.7;">
                  <li>Visit our portal at <a href="${LOGIN_URL}" target="_blank" style="color:#4338ca;font-weight:700;text-decoration:none;">https://schoolvajo.com/login</a></li>
                  <li>Enter your <strong>School Code (${opts.schoolCode})</strong> and <strong>Username</strong>.</li>
                  <li>Enter your password and proceed to your dashboard.</li>
                </ol>
              </div>

              <!-- Active Development Notice -->
              <div style="border:1px solid #c7d2fe;background-color:#eef2ff;border-radius:14px;padding:16px;font-size:12px;color:#1e1b4b;line-height:1.6;">
                <p style="margin:0 0 6px;font-weight:800;color:#3730a3;font-size:13px;">
                  SchoolVajo is currently under active development.
                </p>
                <p style="margin:0 0 6px;color:#4338ca;">
                  We’re making SchoolVajo better every day to provide schools with a simple, reliable, and modern management experience.
                </p>
                <div style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;margin:8px 0;color:#92400e;font-size:11px;">
                  <strong>⚠️ Important:</strong> During this development/testing phase, we cannot guarantee against unexpected data loss or data inconsistencies. Please use the platform with this understanding.
                </div>
                <p style="margin:6px 0 0;color:#3730a3;font-weight:600;">
                  Thank you for your patience and support. — <span style="font-weight:700;color:#4338ca;">Team SchoolVajo</span>
                </p>
              </div>

            </td>
          </tr>

          <!-- Security Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 6px;color:#64748b;font-size:12px;">
                Official Website: <a href="${APP_URL}" target="_blank" style="color:#4338ca;font-weight:700;text-decoration:none;">https://schoolvajo.com/</a>
              </p>
              <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">🔒 Keep your login credentials secure. Never share your password with unauthorized individuals.</p>
              <p style="margin:0;color:#cbd5e1;font-size:11px;">© ${currentYear} SchoolVajo. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 4. Student & Parent Combined Credentials Email Template
 */
export function studentAndParentCredentialsEmailHtml(opts: {
  studentName: string;
  parentName: string;
  schoolName: string;
  schoolCode: string;
  studentUsername: string;
  studentPassword: string;
  parentUsername: string;
  parentPassword: string;
  className: string;
  section?: string;
  loginUrl?: string;
}) {
  const currentYear = new Date().getFullYear();
  const loginLink = opts.loginUrl || LOGIN_URL;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student & Parent Credentials — SchoolVajo</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:36px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:24px;border:1px solid #e2e8f0;box-shadow:0 12px 35px -8px rgba(15,23,42,0.08);overflow:hidden;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%);padding:32px 32px 28px;text-align:center;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display:inline-flex;align-items:center;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.3);padding:6px 14px;border-radius:24px;margin-bottom:12px;">
                      <img src="${LOGO_URL}" alt="SchoolVajo" width="18" height="18" style="vertical-align:middle;margin-right:8px;border-radius:4px;" />
                      <span style="color:#ffffff;font-size:13px;font-weight:800;letter-spacing:0.5px;text-transform:uppercase;">${opts.schoolName}</span>
                    </div>
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Student & Parent Credentials</h1>
                    <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Enrollment confirmed for Class ${opts.className}${opts.section ? ` · ${opts.section}` : ""}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 32px 28px;">
              <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
                Dear <strong>${opts.parentName}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
                Student <strong>${opts.studentName}</strong> has been enrolled successfully at <strong>${opts.schoolName}</strong>. Below are the official access credentials for both the Student Portal and Parent Portal:
              </p>

              <!-- Common School Code Card -->
              <div style="background-color:#eef2ff;border:1px solid #c7d2fe;border-radius:14px;padding:14px 18px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;">
                <div>
                  <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;display:block;">Required for Login:</span>
                  <span style="font-size:13px;font-weight:700;color:#3730a3;">School Code</span>
                </div>
                <span style="font-family:'Courier New',Courier,monospace;font-size:18px;font-weight:900;color:#312e81;">${opts.schoolCode}</span>
              </div>

              <!-- Student Credentials Box -->
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0284c7;border-radius:14px;padding:18px;margin-bottom:16px;">
                <h4 style="margin:0 0 10px;color:#0369a1;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">🎓 Student Portal Access</h4>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:5px 0;color:#64748b;font-size:13px;font-weight:600;width:120px;">Username:</td>
                    <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.studentUsername}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#64748b;font-size:13px;font-weight:600;">Password:</td>
                    <td style="padding:5px 0;color:#0369a1;font-size:14px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.studentPassword}</td>
                  </tr>
                </table>
              </div>

              <!-- Parent Credentials Box -->
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #4338ca;border-radius:14px;padding:18px;margin-bottom:24px;">
                <h4 style="margin:0 0 10px;color:#4338ca;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">👨‍👩‍👧 Parent Portal Access</h4>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:5px 0;color:#64748b;font-size:13px;font-weight:600;width:120px;">Username:</td>
                    <td style="padding:5px 0;color:#0f172a;font-size:14px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.parentUsername}</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;color:#64748b;font-size:13px;font-weight:600;">Password:</td>
                    <td style="padding:5px 0;color:#4338ca;font-size:14px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.parentPassword}</td>
                  </tr>
                </table>
              </div>

              <!-- Action CTAs -->
              <div style="text-align:center;margin-bottom:26px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin:0 auto;max-width:440px;">
                  <tr>
                    <td align="center" style="padding:6px 0;">
                      <a href="${APP_DOWNLOAD_URL}" target="_blank" style="display:inline-block;width:100%;box-sizing:border-box;background:#0f172a;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:13px 24px;border-radius:14px;box-shadow:0 4px 14px rgba(15,23,42,0.2);text-align:center;">
                        Download Android App (.apk)
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:6px 0;">
                      <a href="${loginLink}" target="_blank" style="display:inline-block;width:100%;box-sizing:border-box;background:linear-gradient(135deg, #1e1b4b 0%, #4338ca 50%, #6366f1 100%);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:14px 24px;border-radius:14px;box-shadow:0 6px 18px rgba(67,56,202,0.28);text-align:center;">
                        Open Website →
                      </a>
                    </td>
                  </tr>
                </table>
              </div>

              <div style="border-top:1px solid #f1f5f9;padding-top:14px;text-align:center;">
                <p style="margin:0;color:#64748b;font-size:12px;">
                  Access all modules via our official portal: <a href="${APP_URL}" target="_blank" style="color:#4338ca;font-weight:700;text-decoration:none;">https://schoolvajo.com/</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">Parents can track student attendance, examination marks, notices, and progress in real-time.</p>
              <p style="margin:0;color:#cbd5e1;font-size:11px;">© ${currentYear} ${opts.schoolName}. Powered by SchoolVajo (https://schoolvajo.com/).</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 5. General Notification Email Template (Preserved for backward-compatibility if needed)
 */
export function notificationEmailHtml(
  title: string,
  body: string,
  schoolName?: string,
) {
  const currentYear = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — SchoolVajo</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);overflow:hidden;">
          <tr>
            <td style="background:linear-gradient(135deg, #4338ca 0%, #6366f1 100%);padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:800;">${schoolName || "SchoolVajo"}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px;">
              <h2 style="margin:0 0 14px;color:#0f172a;font-size:17px;font-weight:700;">${title}</h2>
              <div style="color:#475569;font-size:14px;line-height:1.7;white-space:pre-wrap;">${body}</div>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 4px;color:#64748b;font-size:12px;">Official Website: <a href="${APP_URL}" target="_blank" style="color:#4338ca;font-weight:700;text-decoration:none;">https://schoolvajo.com/</a></p>
              <p style="margin:0;color:#94a3b8;font-size:11px;">© ${currentYear} SchoolVajo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
