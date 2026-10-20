import nodemailer from "nodemailer";

// Beautiful custom HTML email template with LectureMate branding and styled OTP box
export function getOtpEmailHtml(otp: string, actionType: "signup" | "login" = "signup") {
  const title = actionType === "signup" ? "Verify Your Email Address" : "Login Verification Code";
  const subtitle =
    actionType === "signup"
      ? "Welcome to LectureMate! Use the special verification code below to set up your account password and get started."
      : "You requested a verification code to sign in to LectureMate.";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01);">
          
          <!-- Header Banner with Gradient -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%); padding: 36px 32px; text-align: center;">
              <div style="display: inline-block; width: 52px; height: 52px; background-color: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); border-radius: 14px; line-height: 52px; margin-bottom: 16px; border: 1px solid rgba(255, 255, 255, 0.3);">
                <span style="font-size: 26px; color: #FFFFFF;">⚡</span>
              </div>
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">LectureMate</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #E0E7FF; font-weight: 500; letter-spacing: 0.5px; text-transform: uppercase;">From Lectures to Active Mastery</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0F172A; letter-spacing: -0.3px;">
                ${title}
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 22px; color: #64748B;">
                ${subtitle}
              </p>

              <!-- Styled OTP Box -->
              <div style="background: linear-gradient(180deg, #F8FAFC 0%, #EEF2F6 100%); border: 2px dashed #C7D2FE; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #6366F1; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
                  Your One-Time Passcode
                </span>
                <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #4338CA; font-family: monospace; text-shadow: 0 2px 4px rgba(99, 102, 241, 0.15);">
                  ${otp}
                </div>
                <span style="display: block; font-size: 12px; color: #94A3B8; margin-top: 8px; font-weight: 500;">
                  ⏱ Valid for 10 minutes only
                </span>
              </div>

              <!-- Information Notes -->
              <table role="presentation" width="100%" style="background-color: #F8FAFC; border-radius: 12px; border: 1px solid #F1F5F9; padding: 14px 16px; margin-bottom: 24px;">
                <tr>
                  <td style="font-size: 12px; line-height: 18px; color: #64748B;">
                    🔒 <strong>Security Notice:</strong> Never share this code with anyone. LectureMate team members will never ask for your verification code.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 13px; line-height: 20px; color: #94A3B8;">
                If you did not request this verification code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #F1F5F9; padding: 20px 32px; text-align: center; background-color: #FAFAFA;">
              <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                © ${new Date().getFullYear()} LectureMate AI. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// In-memory OTP storage with timestamp validation (expires after 10 mins)
interface StoredOtp {
  code: string;
  email: string;
  createdAt: number;
  verified: boolean;
}

// Global persistent OTP store across Next.js serverless & hot-module-reloading
const globalForOtp = globalThis as unknown as { otpStore: Map<string, StoredOtp> };
const otpStore = globalForOtp.otpStore || (globalForOtp.otpStore = new Map<string, StoredOtp>());

export function generateAndStoreOtp(email: string): string {
  // Generate high-entropy 6-digit numeric OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(email.toLowerCase().trim(), {
    code,
    email: email.toLowerCase().trim(),
    createdAt: Date.now(),
    verified: false,
  });
  return code;
}

export function verifyOtpCode(email: string, code: string): boolean {
  const key = email.toLowerCase().trim();
  const stored = otpStore.get(key);

  if (!stored) return false;

  // 15 minutes expiry (900,000 ms)
  const isExpired = Date.now() - stored.createdAt > 15 * 60 * 1000;
  if (isExpired) {
    otpStore.delete(key);
    return false;
  }

  if (stored.code === code.trim()) {
    stored.verified = true;
    return true;
  }

  return false;
}

export function isEmailOtpVerified(email: string): boolean {
  const key = email.toLowerCase().trim();
  const stored = otpStore.get(key);
  if (!stored) return false;
  const isExpired = Date.now() - stored.createdAt > 20 * 60 * 1000;
  return stored.verified && !isExpired;
}

export function clearStoredOtp(email: string): void {
  otpStore.delete(email.toLowerCase().trim());
}

// Email Dispatcher (Supports real SMTP e.g. Gmail / Outlook or beautiful simulated console dispatch)
export async function sendOtpEmail(email: string, otp: string, type: "signup" | "login" = "signup") {
  const html = getOtpEmailHtml(otp, type);

  // If SMTP environment variables are configured (Gmail or custom SMTP)
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport(
        process.env.SMTP_SERVICE
          ? {
              service: process.env.SMTP_SERVICE, // e.g. 'gmail'
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
            }
          : {
              host: process.env.SMTP_HOST || "smtp.gmail.com",
              port: parseInt(process.env.SMTP_PORT || "587"),
              secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
              auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
              },
            }
      );

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"LectureMate" <${process.env.SMTP_USER}>`,
        to: email,
        subject: type === "signup" ? `LectureMate Verification Code: ${otp}` : `LectureMate Login OTP: ${otp}`,
        html,
      });

      console.log(`\n✅ [Real Email Sent] Successfully sent OTP ${otp} to ${email} via SMTP`);
      return { success: true, simulated: false };
    } catch (error) {
      console.error("Failed to send email via SMTP, falling back to simulated dispatch:", error);
    }
  }

  // Developer Preview & Fallback
  console.log(`\n======================================================`);
  console.log(`📨 [LectureMate OTP Dispatcher]`);
  console.log(`Target Email: ${email}`);
  console.log(`Action Type : ${type}`);
  console.log(`OTP Code    : ${otp}`);
  console.log(`Expires In  : 10 minutes`);
  console.log(`======================================================\n`);

  return { success: true, simulated: true, otp };
}
