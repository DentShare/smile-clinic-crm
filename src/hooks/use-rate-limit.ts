import { useRef, useCallback } from 'react';

interface RateLimitOptions {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
}

const DEFAULT_OPTIONS: RateLimitOptions = {
  maxAttempts: 5,
  windowMs: 60_000,    // 1 minute window
  lockoutMs: 300_000,  // 5 minute lockout
};

export function useRateLimit(options: Partial<RateLimitOptions> = {}) {
  const { maxAttempts, windowMs, lockoutMs } = { ...DEFAULT_OPTIONS, ...options };

  const attemptsRef = useRef<number[]>([]);
  const lockoutUntilRef = useRef<number | null>(null);

  const checkLimit = useCallback((): { allowed: boolean; retryAfterMs: number } => {
    const now = Date.now();

    // Check lockout
    if (lockoutUntilRef.current && now < lockoutUntilRef.current) {
      return { allowed: false, retryAfterMs: lockoutUntilRef.current - now };
    }

    // Clear lockout if expired
    if (lockoutUntilRef.current && now >= lockoutUntilRef.current) {
      lockoutUntilRef.current = null;
      attemptsRef.current = [];
    }

    // Clean old attempts outside window
    attemptsRef.current = attemptsRef.current.filter((t) => now - t < windowMs);

    if (attemptsRef.current.length >= maxAttempts) {
      lockoutUntilRef.current = now + lockoutMs;
      return { allowed: false, retryAfterMs: lockoutMs };
    }

    return { allowed: true, retryAfterMs: 0 };
  }, [maxAttempts, windowMs, lockoutMs]);

  const recordAttempt = useCallback(() => {
    attemptsRef.current.push(Date.now());
  }, []);

  const reset = useCallback(() => {
    attemptsRef.current = [];
    lockoutUntilRef.current = null;
  }, []);

  return { checkLimit, recordAttempt, reset };
}
