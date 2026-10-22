import { supabase } from "@/lib/db/client";

interface LockoutState {
  attempts: number;
  lockedUntil: number | null; // timestamp in ms
  lastAttemptAt: number;
}

// In-memory cache for ultra-fast, zero-latency rate-limit checks
const globalForLockout = globalThis as unknown as {
  lockoutStore: Map<string, LockoutState>;
};

const lockoutStore: Map<string, LockoutState> =
  globalForLockout.lockoutStore || (globalForLockout.lockoutStore = new Map());

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;
export const LOCKOUT_DURATION_MS = LOCKOUT_DURATION_MINUTES * 60 * 1000;

/**
 * Check if an email / account is currently locked due to too many failed attempts (5 max).
 */
export async function checkLockout(identifier: string): Promise<{
  isLocked: boolean;
  remainingMinutes: number;
  remainingSeconds: number;
  attemptsLeft: number;
}> {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();

  // 1. Check in-memory state
  const state = lockoutStore.get(key);
  if (state) {
    if (state.lockedUntil && state.lockedUntil > now) {
      const diffMs = state.lockedUntil - now;
      return {
        isLocked: true,
        remainingMinutes: Math.ceil(diffMs / 60000),
        remainingSeconds: Math.ceil(diffMs / 1000),
        attemptsLeft: 0,
      };
    }

    // Lockout has expired -> reset
    if (state.lockedUntil && state.lockedUntil <= now) {
      lockoutStore.delete(key);
    }
  }

  // 2. Cross-check database persistent locked_until timestamp
  try {
    const { data } = await supabase
      .from("users")
      .select("locked_until, failed_attempts")
      .ilike("email", key)
      .maybeSingle();

    if (data?.locked_until) {
      const dbLockedUntil = new Date(data.locked_until).getTime();
      if (dbLockedUntil > now) {
        const diffMs = dbLockedUntil - now;
        // Sync into memory cache
        lockoutStore.set(key, {
          attempts: data.failed_attempts || MAX_FAILED_ATTEMPTS,
          lockedUntil: dbLockedUntil,
          lastAttemptAt: now,
        });

        return {
          isLocked: true,
          remainingMinutes: Math.ceil(diffMs / 60000),
          remainingSeconds: Math.ceil(diffMs / 1000),
          attemptsLeft: 0,
        };
      }
    }
  } catch {
    // ignore db check errors and rely on memory
  }

  const currentAttempts = state ? state.attempts : 0;
  return {
    isLocked: false,
    remainingMinutes: 0,
    remainingSeconds: 0,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - currentAttempts),
  };
}

/**
 * Record a failed attempt (incorrect password or incorrect OTP).
 * Locks the account for 15 minutes after 5 consecutive failed attempts.
 */
export async function recordFailedAttempt(identifier: string): Promise<{
  isLocked: boolean;
  attemptsLeft: number;
  remainingMinutes: number;
  failedCount: number;
}> {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  const state = lockoutStore.get(key) || { attempts: 0, lockedUntil: null, lastAttemptAt: now };

  state.attempts += 1;
  state.lastAttemptAt = now;

  let isLocked = false;
  let remainingMinutes = 0;
  let lockedUntilIso: string | null = null;

  if (state.attempts >= MAX_FAILED_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_DURATION_MS;
    isLocked = true;
    remainingMinutes = LOCKOUT_DURATION_MINUTES;
    lockedUntilIso = new Date(state.lockedUntil).toISOString();
  }

  lockoutStore.set(key, state);

  // Sync to database
  try {
    await supabase
      .from("users")
      .update({
        failed_attempts: state.attempts,
        locked_until: lockedUntilIso,
        updated_at: new Date().toISOString(),
      })
      .ilike("email", key);
  } catch {
    // ignore db error
  }

  return {
    isLocked,
    attemptsLeft: Math.max(0, MAX_FAILED_ATTEMPTS - state.attempts),
    remainingMinutes,
    failedCount: state.attempts,
  };
}

/**
 * Reset failed attempts on successful password verification or successful OTP entry.
 */
export async function resetFailedAttempts(identifier: string): Promise<void> {
  const key = identifier.toLowerCase().trim();
  lockoutStore.delete(key);

  try {
    await supabase
      .from("users")
      .update({
        failed_attempts: 0,
        locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .ilike("email", key);
  } catch {
    // ignore db error
  }
}
