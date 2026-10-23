import nodemailer, { type Transporter } from "nodemailer";

export interface SendEmailResult {
  success: boolean;
  delivered: boolean;
  simulated: boolean;
  error?: string;
  token?: string;
}

let cachedTransporter: Transporter | null = null;

export function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const user = process.env.SMTP_USER.trim();
    const pass = process.env.SMTP_PASS.replace(/\s+/g, "");

    // Using Google Gmail Service with Connection Pooling & Anti-Hang Timeouts
    if (process.env.SMTP_SERVICE?.toLowerCase() === "gmail") {
      cachedTransporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user,
          pass,
        },
        pool: true,
        maxConnections: 3,
        maxMessages: 100,
        connectionTimeout: 10000, // 10 seconds timeout
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });
      return cachedTransporter;
    }

    // Custom SMTP server configuration
    cachedTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465" || !process.env.SMTP_PORT,
      auth: {
        user,
        pass,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
    return cachedTransporter;
  }
  return null;
}

function getFromHeader(): string {
  const user = process.env.SMTP_USER?.trim();
  if (process.env.SMTP_FROM) {
    return process.env.SMTP_FROM;
  }
  if (user) {
    return `LectureMate <${user}>`;
  }
  return `"LectureMate AI" <no-reply@lecturemate.ai>`;
}

/**
 * 1. Verification Email via Nodemailer (100% Deliverability Optimized)
 */
export async function sendVerificationEmail(
  toEmail: string,
  fullName: string,
  token: string,
  origin: string
): Promise<SendEmailResult> {
  const isProdUrl = origin && origin.startsWith("https://") && !origin.includes("localhost");
  const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(toEmail)}`;

  // Plain-text alternative required by spam engines (SpamAssassin / Gmail Filters)
  const textContent = `
Welcome to LectureMate!

Hello ${fullName || "Student"},

Thank you for creating your LectureMate account. Here is your 6-digit verification code:

-----------------------------
VERIFICATION CODE: ${token}
-----------------------------
(Valid for 24 hours)

Enter this 6-digit code on the LectureMate verification screen to activate your account and start studying.

${isProdUrl ? `Or verify directly using this link:\n${verifyUrl}\n\n` : ""}If you did not create a LectureMate account, you can safely ignore this email.

Best regards,
The LectureMate Team
  `.trim();

  // Clean, high-deliverability HTML template
  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your LectureMate Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Gradient Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">⚡ LectureMate</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #E0E7FF; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">From Lectures to Active Mastery</p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #0F172A;">
                Welcome, ${fullName || "Student"}! 👋
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 22px; color: #64748B;">
                Thank you for joining LectureMate. Enter the 6-digit verification code below on the screen to activate your study deck and AI quiz arena:
              </p>

              <!-- Prominent OTP Code Box -->
              <div style="background: linear-gradient(180deg, #F8FAFC 0%, #EEF2F6 100%); border: 2px dashed #C7D2FE; border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #6366F1; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
                  Your Verification Code
                </span>
                <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #4338CA; font-family: monospace;">
                  ${token}
                </div>
                <span style="display: block; font-size: 12px; color: #94A3B8; margin-top: 8px; font-weight: 500;">
                  ⏱ Valid for 24 hours
                </span>
              </div>

              ${
                isProdUrl
                  ? `
              <div style="text-align: center; margin: 24px 0;">
                <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 12px;">
                  Verify Email Directly →
                </a>
              </div>
              `
                  : ""
              }

              <!-- Security Notice -->
              <div style="background-color: #F8FAFC; border-radius: 12px; border: 1px solid #F1F5F9; padding: 12px 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748B;">
                  🔒 <strong>Tip:</strong> If you don't see this email in your primary inbox, please check your <strong>Spam / Junk</strong> folder.
                </p>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94A3B8;">
                If you did not register for LectureMate, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #F1F5F9; padding: 16px 28px; text-align: center; background-color: #FAFAFA;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
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

  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: getFromHeader(),
        to: toEmail,
        subject: `LectureMate - Your Verification Code is ${token}`,
        text: textContent,
        html: htmlContent,
        headers: {
          "X-Priority": "1",
          Priority: "urgent",
          Importance: "high",
        },
      });

      console.log(`\n✅ [Nodemailer] Successfully delivered verification email with code ${token} to ${toEmail}`);
      return { success: true, delivered: true, simulated: false };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("❌ [Nodemailer] SMTP transport failed:", errMsg);
      // Fall through to console dispatch fallback
    }
  }

  // Developer Fallback (Ensures live college presentation is NEVER blocked if Wi-Fi blocks SMTP)
  console.log(`\n======================================================`);
  console.log(`📨 [LectureMate Verification Code Fallback]`);
  console.log(`To        : ${toEmail}`);
  console.log(`Code      : ${token}`);
  console.log(`Verify URL: ${verifyUrl}`);
  console.log(`======================================================\n`);

  return { success: true, delivered: false, simulated: true, token };
}

/**
 * 2. Password Reset Email via Nodemailer (100% Deliverability Optimized)
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  fullName: string,
  token: string,
  origin: string
): Promise<SendEmailResult> {
  const isProdUrl = origin && origin.startsWith("https://") && !origin.includes("localhost");
  const resetUrl = `${origin}/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(toEmail)}`;

  const textContent = `
LectureMate Password Reset

Hello ${fullName || "Student"},

We received a request to reset the password for your LectureMate account (${toEmail}).

-----------------------------
PASSWORD RESET CODE: ${token}
-----------------------------
(Valid for 60 minutes)

Enter this 6-digit code on the LectureMate password reset screen to choose a new password.

${isProdUrl ? `Or reset directly via link:\n${resetUrl}\n\n` : ""}If you did not request a password reset, you can safely ignore this email.

Best regards,
The LectureMate Team
  `.trim();

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your LectureMate Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">⚡ LectureMate</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #E0E7FF; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Account Recovery</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 10px; font-size: 20px; font-weight: 700; color: #0F172A;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 22px; color: #64748B;">
                We received a request to reset your LectureMate password. Enter this 6-digit code on the reset password screen:
              </p>

              <!-- OTP Box -->
              <div style="background: linear-gradient(180deg, #F8FAFC 0%, #EEF2F6 100%); border: 2px dashed #C7D2FE; border-radius: 16px; padding: 24px; text-align: center; margin: 20px 0;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #6366F1; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 8px;">
                  Password Reset Code
                </span>
                <div style="font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #4338CA; font-family: monospace;">
                  ${token}
                </div>
                <span style="display: block; font-size: 12px; color: #94A3B8; margin-top: 8px; font-weight: 500;">
                  ⏱ Valid for 60 minutes only
                </span>
              </div>

              ${
                isProdUrl
                  ? `
              <div style="text-align: center; margin: 24px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 12px;">
                  Reset Password Directly →
                </a>
              </div>
              `
                  : ""
              }

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94A3B8;">
                If you did not request a password reset, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #F1F5F9; padding: 16px 28px; text-align: center; background-color: #FAFAFA;">
              <p style="margin: 0; font-size: 11px; color: #94A3B8;">
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

  const transporter = getTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: getFromHeader(),
        to: toEmail,
        subject: `LectureMate - Password Reset Code is ${token}`,
        text: textContent,
        html: htmlContent,
        headers: {
          "X-Priority": "1",
          Priority: "urgent",
          Importance: "high",
        },
      });

      console.log(`\n✅ [Nodemailer] Successfully delivered password reset email with code ${token} to ${toEmail}`);
      return { success: true, delivered: true, simulated: false };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error("❌ [Nodemailer] SMTP password reset failed:", errMsg);
    }
  }

  console.log(`\n======================================================`);
  console.log(`📨 [LectureMate Password Reset Code Fallback]`);
  console.log(`To        : ${toEmail}`);
  console.log(`Code      : ${token}`);
  console.log(`Reset URL : ${resetUrl}`);
  console.log(`======================================================\n`);

  return { success: true, delivered: false, simulated: true, token };
}
