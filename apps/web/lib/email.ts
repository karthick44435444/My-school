/**
 * Email service — Resend (preferred) or SMTP via nodemailer-compatible fetch.
 * Configure via .env (see .env.example).
 *
 * When EMAIL_ENABLED is not "true", emails are logged to console and
 * OTP codes are still returned in API responses for local demo.
 */

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export function isEmailEnabled() {
  return process.env.EMAIL_ENABLED === "true";
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
  if (!to) {
    return { success: false, skipped: true, reason: "no recipient" };
  }

  if (!isEmailEnabled()) {
    console.log("[email:demo]", { to, subject, text: text || html.replace(/<[^>]+>/g, " ").slice(0, 200) });
    return { success: true, demo: true };
  }

  const provider = (process.env.EMAIL_PROVIDER || "resend").toLowerCase();

  if (provider === "resend") {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM || "SchoolVajo <onboarding@resend.dev>";
    if (!key) {
      console.warn("[email] RESEND_API_KEY missing");
      return { success: false, error: "RESEND_API_KEY missing" };
    }
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html, text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[email:resend]", data);
      return { success: false, error: data.message || "Resend failed" };
    }
    return { success: true, id: data.id };
  }

  // Generic SMTP via external HTTP relay is not used; for SMTP use Resend or set EMAIL_PROVIDER=log
  console.log("[email:log]", { to, subject });
  return { success: true, demo: true };
}

export function otpEmailHtml(code: string, schoolName?: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset OTP</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border-radius:20px;border:1px solid #e2e8f0;box-shadow:0 10px 25px -5px rgba(0,0,0,0.05);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #4338ca 0%, #6366f1 100%);padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">SchoolVajo</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${schoolName || "Smart School Platform"}</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h2 style="margin:0 0 12px;color:#0f172a;font-size:18px;font-weight:700;">Password Reset Request</h2>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
                We received a request to reset your password for <strong>${schoolName || "SchoolVajo"}</strong>. Use the verification code below to proceed:
              </p>
              
              <div style="background-color:#f1f5f9;border:1.5px dashed #cbd5e1;border-radius:14px;padding:18px;text-align:center;margin-bottom:20px;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:800;letter-spacing:8px;color:#4338ca;">${code}</span>
              </div>

              <p style="margin:0 0 16px;color:#64748b;font-size:13px;line-height:1.5;">
                ⏰ This code is valid for <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} SchoolVajo. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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

  const loginLink = opts.loginUrl || process.env.NEXT_PUBLIC_APP_URL || "https://myschool.app/login";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Account Credentials</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:540px;background-color:#ffffff;border-radius:24px;border:1px solid #e2e8f0;box-shadow:0 12px 30px -8px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg, #3730a3 0%, #4338ca 50%, #6366f1 100%);padding:32px 32px 28px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;margin-bottom:10px;">
                <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${opts.schoolName || "SchoolVajo"}</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Welcome to SchoolVajo</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Your official account has been created</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
                Hello <strong>${opts.recipientName || opts.username}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
                Your <strong>${roleLabel}</strong> account is ready to use on <strong>${opts.schoolName || "SchoolVajo"}</strong> portal. Below are your secure login credentials:
              </p>

              <!-- Credentials Card -->
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:18px;padding:22px;margin-bottom:24px;">
                <div style="display:flex;align-items:center;margin-bottom:14px;">
                  <span style="background-color:#e0e7ff;color:#4338ca;font-size:11px;font-weight:800;padding:4px 10px;border-radius:12px;text-transform:uppercase;letter-spacing:0.5px;">${roleLabel} Account</span>
                  ${opts.className ? `<span style="background-color:#f1f5f9;color:#334155;font-size:11px;font-weight:700;padding:4px 10px;border-radius:12px;margin-left:8px;">Class ${opts.className}${opts.section ? ` · ${opts.section}` : ""}</span>` : ""}
                </div>

                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;width:120px;">School Code:</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.schoolCode}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;">Username:</td>
                    <td style="padding:6px 0;color:#0f172a;font-size:14px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.username}</td>
                  </tr>
                  <tr>
                    <td style="padding:6px 0;color:#64748b;font-size:12px;font-weight:600;">Temporary Password:</td>
                    <td style="padding:6px 0;color:#4338ca;font-size:14px;font-weight:800;font-family:'Courier New',Courier,monospace;background-color:#eef2ff;padding:4px 8px;border-radius:6px;display:inline-block;">${opts.password}</td>
                  </tr>
                </table>
              </div>

              <!-- Action CTA -->
              <div style="text-align:center;margin-bottom:26px;">
                <a href="${loginLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #4338ca 0%, #6366f1 100%);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:14px;box-shadow:0 4px 12px rgba(67,56,202,0.25);">
                  Sign in to Portal →
                </a>
              </div>

              <!-- Quick Steps -->
              <div style="border-top:1px solid #f1f5f9;padding-top:18px;">
                <h4 style="margin:0 0 8px;color:#1e293b;font-size:13px;font-weight:700;">Getting Started:</h4>
                <ol style="margin:0;padding-left:18px;color:#64748b;font-size:12px;line-height:1.7;">
                  <li>Visit the login page and enter your <strong>School Code (${opts.schoolCode})</strong>.</li>
                  <li>Enter your username and temporary password.</li>
                  <li>Go to <strong>Settings & Password</strong> to create your personal secure password.</li>
                </ol>
              </div>
            </td>
          </tr>

          <!-- Security Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">🔒 Keep your login credentials secure. Never share your password with anyone.</p>
              <p style="margin:0;color:#cbd5e1;font-size:11px;">© ${new Date().getFullYear()} ${opts.schoolName || "SchoolVajo"}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

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
  const loginLink = opts.loginUrl || process.env.NEXT_PUBLIC_APP_URL || "https://myschool.app/login";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student & Parent Portal Credentials</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#ffffff;border-radius:24px;border:1px solid #e2e8f0;box-shadow:0 12px 30px -8px rgba(0,0,0,0.06);overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg, #1e1b4b 0%, #4338ca 60%, #6366f1 100%);padding:32px 32px 28px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;margin-bottom:10px;">
                <span style="color:#ffffff;font-size:12px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">${opts.schoolName}</span>
              </div>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">Student & Parent Credentials</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.9);font-size:14px;">Enrollment confirmed for Class ${opts.className}${opts.section ? ` · ${opts.section}` : ""}</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">
                Dear <strong>${opts.parentName}</strong>,
              </p>
              <p style="margin:0 0 20px;color:#475569;font-size:14px;line-height:1.6;">
                Student <strong>${opts.studentName}</strong> has been enrolled successfully at <strong>${opts.schoolName}</strong>. Below are the access credentials for both Student and Parent portals:
              </p>

              <!-- Common School Code -->
              <div style="background-color:#eef2ff;border:1px solid #c7d2fe;border-radius:14px;padding:12px 18px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between;">
                <span style="font-size:12px;font-weight:700;color:#3730a3;text-transform:uppercase;">School Code (Required for Login):</span>
                <span style="font-family:'Courier New',Courier,monospace;font-size:16px;font-weight:900;color:#312e81;">${opts.schoolCode}</span>
              </div>

              <!-- Student Credentials Box -->
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #0284c7;border-radius:14px;padding:18px;margin-bottom:16px;">
                <h4 style="margin:0 0 10px;color:#0369a1;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">🎓 Student Portal Access</h4>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-size:12px;font-weight:600;width:120px;">Username:</td>
                    <td style="padding:4px 0;color:#0f172a;font-size:13px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.studentUsername}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-size:12px;font-weight:600;">Password (DOB):</td>
                    <td style="padding:4px 0;color:#0369a1;font-size:13px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.studentPassword}</td>
                  </tr>
                </table>
              </div>

              <!-- Parent Credentials Box -->
              <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #4338ca;border-radius:14px;padding:18px;margin-bottom:24px;">
                <h4 style="margin:0 0 10px;color:#4338ca;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.5px;">👨‍👩‍👧 Parent Portal Access</h4>
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-size:12px;font-weight:600;width:120px;">Username:</td>
                    <td style="padding:4px 0;color:#0f172a;font-size:13px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.parentUsername}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;color:#64748b;font-size:12px;font-weight:600;">Password:</td>
                    <td style="padding:4px 0;color:#4338ca;font-size:13px;font-weight:800;font-family:'Courier New',Courier,monospace;">${opts.parentPassword}</td>
                  </tr>
                </table>
              </div>

              <!-- Action CTA -->
              <div style="text-align:center;margin-bottom:24px;">
                <a href="${loginLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg, #4338ca 0%, #6366f1 100%);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 32px;border-radius:14px;box-shadow:0 4px 12px rgba(67,56,202,0.25);">
                  Login to Portal →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;">Parents can track student attendance, examination marks, notices, and progress in real-time.</p>
              <p style="margin:0;color:#cbd5e1;font-size:11px;">© ${new Date().getFullYear()} ${opts.schoolName}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function notificationEmailHtml(title: string, body: string, schoolName?: string) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
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
              <p style="margin:0;color:#94a3b8;font-size:12px;">Open the SchoolVajo app or portal to view complete details.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

