import crypto from "crypto";

const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "lecturemate-cryptographic-secure-secret-2026-production";

/**
 * Hash a plaintext password using crypto.scrypt with a cryptographic salt.
 * Format: <salt>:<derivedKeyHex>
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verify a plaintext password against a stored hash using constant-time comparison.
 * Supports both scrypt salt:hash format and legacy seed fallback for demo credentials.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !password) return false;

  // Legacy plaintext match for seeded demo users
  if (!storedHash.includes(":")) {
    return storedHash === password;
  }

  try {
    const [salt, keyHex] = storedHash.split(":");
    if (!salt || !keyHex) return false;

    const keyBuffer = Buffer.from(keyHex, "hex");
    const derivedKey = crypto.scryptSync(password, salt, keyBuffer.length);

    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  exp: number; // unix timestamp in seconds
}

/**
 * Create a cryptographically signed session token (HMAC-SHA256).
 * Format: <base64Payload>.<hmacSignature>
 */
export function createSessionToken(
  user: { id: string; email: string; fullName?: string },
  expiresInDays = 7
): string {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email.toLowerCase().trim(),
    name: user.fullName || user.email.split("@")[0],
    exp: Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verify and parse a signed session token.
 * Returns null if token is expired, corrupted, or tampered.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || !token.includes(".")) return null;

  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    // Verify HMAC signature in constant time
    const expectedSig = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(payloadB64)
      .digest("base64url");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: SessionPayload = JSON.parse(payloadJson);

    // Verify expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Create a cryptographically signed, short-lived reset ticket (valid for 15 minutes)
 * after a user successfully verifies their 6-digit OTP.
 */
export function createResetTicket(email: string, expiresInMinutes = 15): string {
  const payload = {
    email: email.toLowerCase().trim(),
    exp: Math.floor(Date.now() / 1000) + expiresInMinutes * 60,
    purpose: "pwd_reset",
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payloadB64)
    .digest("base64url");
  return `${payloadB64}.${signature}`;
}

/**
 * Verify a reset ticket against the target email.
 */
export function verifyResetTicket(ticket: string, targetEmail: string): boolean {
  if (!ticket || !ticket.includes(".")) return false;
  try {
    const [payloadB64, signature] = ticket.split(".");
    if (!payloadB64 || !signature) return false;

    const expectedSig = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(payloadB64)
      .digest("base64url");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSig);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf-8"));
    if (payload.purpose !== "pwd_reset") return false;
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return false;
    return payload.email === targetEmail.toLowerCase().trim();
  } catch {
    return false;
  }
}
