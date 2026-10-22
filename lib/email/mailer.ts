import nodemailer from "nodemailer";

function getTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    const user = process.env.SMTP_USER.trim();
    const pass = process.env.SMTP_PASS.replace(/\s+/g, "");

    if (process.env.SMTP_SERVICE) {
      return nodemailer.createTransport({
        service: process.env.SMTP_SERVICE, // e.g. 'gmail'
        auth: {
          user,
          pass,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
      auth: {
        user,
        pass,
      },
    });
  }
  return null;
}

const FROM_HEADER =
  process.env.SMTP_FROM ||
  (process.env.SMTP_USER ? `"LectureMate AI" <${process.env.SMTP_USER.trim()}>` : `"LectureMate AI" <no-reply@lecturemate.ai>`);

/**
 * 1. Verification Email via Nodemailer
 */
export async function sendVerificationEmail(
  toEmail: string,
  fullName: string,
  token: string,
  origin: string
): Promise<{ success: boolean; simulated?: boolean }> {
  const verifyUrl = `${origin}/api/auth/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(toEmail)}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Verify Your LectureMate Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Gradient Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%); padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">LectureMate</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #E0E7FF; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Turn Lectures Into Active Mastery</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0F172A;">
                Welcome, ${fullName || "Student"}! 🎉
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 22px; color: #64748B;">
                Thank you for creating an account on LectureMate. Please verify your email address to activate your active recall study deck and quiz arena.
              </p>

              <!-- One-Click Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                  Verify Email Address →
                </a>
              </div>

              <!-- Passcode Box -->
              <div style="background: #F8FAFC; border: 2px dashed #C7D2FE; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #6366F1; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">
                  Or use this 6-digit verification code:
                </span>
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4338CA; font-family: monospace;">
                  ${token}
                </div>
                <span style="display: block; font-size: 11px; color: #94A3B8; margin-top: 6px;">
                  ⏱ Valid for 24 hours
                </span>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94A3B8;">
                If you did not sign up for LectureMate, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #F1F5F9; padding: 16px 32px; text-align: center; background-color: #FAFAFA;">
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
        from: FROM_HEADER,
        to: toEmail,
        subject: `Verify Your LectureMate Account (Code: ${token})`,
        html,
      });
      console.log(`\n✅ [Nodemailer] Real verification email delivered to ${toEmail}`);
      return { success: true, simulated: false };
    } catch (err) {
      console.error("[Nodemailer] SMTP transport failed, logging fallback dispatch:", err);
    }
  }

  // Fallback console log with instant click-to-verify link for local development
  console.log(`\n======================================================`);
  console.log(`📨 [LectureMate Nodemailer Verification Email]`);
  console.log(`To        : ${toEmail}`);
  console.log(`Name      : ${fullName}`);
  console.log(`Code      : ${token}`);
  console.log(`Verify URL: ${verifyUrl}`);
  console.log(`======================================================\n`);

  return { success: true, simulated: true };
}

/**
 * 2. Password Reset Email via Nodemailer
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  fullName: string,
  token: string,
  origin: string
): Promise<{ success: boolean; simulated?: boolean }> {
  const resetUrl = `${origin}/auth/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(toEmail)}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Reset Your LectureMate Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F8FAFC; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 24px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
          
          <!-- Gradient Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%); padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">LectureMate</h1>
              <p style="margin: 6px 0 0; font-size: 13px; color: #E0E7FF; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px;">Account Security & Recovery</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 36px 32px 28px;">
              <h2 style="margin: 0 0 12px; font-size: 20px; font-weight: 700; color: #0F172A;">
                Reset Your Password
              </h2>
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 22px; color: #64748B;">
                We received a request to reset the password for your LectureMate account (<strong>${toEmail}</strong>). Click the button below to choose a new password:
              </p>

              <!-- One-Click Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
                  Reset Password Directly →
                </a>
              </div>

              <!-- Passcode Box -->
              <div style="background: #F8FAFC; border: 2px dashed #C7D2FE; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0;">
                <span style="display: block; font-size: 11px; font-weight: 700; color: #6366F1; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px;">
                  Or Enter This 6-Digit Reset Code (OTP):
                </span>
                <div style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4338CA; font-family: monospace;">
                  ${token}
                </div>
                <span style="display: block; font-size: 11px; color: #94A3B8; margin-top: 6px;">
                  ⏱ Valid for 60 minutes only • Enter this code on the password reset screen
                </span>
              </div>

              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #94A3B8;">
                If you did not request a password reset, you can safely ignore this email. Your password will not change until you click the link above and create a new one.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top: 1px solid #F1F5F9; padding: 16px 32px; text-align: center; background-color: #FAFAFA;">
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
        from: FROM_HEADER,
        to: toEmail,
        subject: `Reset Your LectureMate Password (Code: ${token})`,
        html,
      });
      console.log(`\n✅ [Nodemailer] Real password reset email delivered to ${toEmail}`);
      return { success: true, simulated: false };
    } catch (err) {
      console.error("[Nodemailer] SMTP transport failed, logging fallback dispatch:", err);
    }
  }

  // Fallback console log with direct click-to-reset link
  console.log(`\n======================================================`);
  console.log(`📨 [LectureMate Nodemailer Password Reset Email]`);
  console.log(`To        : ${toEmail}`);
  console.log(`Code      : ${token}`);
  console.log(`Reset URL : ${resetUrl}`);
  console.log(`======================================================\n`);

  return { success: true, simulated: true };
}
