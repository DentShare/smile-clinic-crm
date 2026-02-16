import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRateLimit } from './use-rate-limit';

describe('useRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('allows requests under the limit', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxAttempts: 3, windowMs: 60000, lockoutMs: 300000 })
    );

    const { allowed } = result.current.checkLimit();
    expect(allowed).toBe(true);
  });

  it('blocks after max attempts', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxAttempts: 3, windowMs: 60000, lockoutMs: 300000 })
    );

    // Record 3 attempts
    act(() => {
      result.current.recordAttempt();
      result.current.recordAttempt();
      result.current.recordAttempt();
    });

    const { allowed, retryAfterMs } = result.current.checkLimit();
    expect(allowed).toBe(false);
    expect(retryAfterMs).toBeGreaterThan(0);
  });

  it('resets after lockout period', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxAttempts: 2, windowMs: 60000, lockoutMs: 5000 })
    );

    act(() => {
      result.current.recordAttempt();
      result.current.recordAttempt();
    });

    // Should be blocked
    expect(result.current.checkLimit().allowed).toBe(false);

    // Advance past lockout
    vi.advanceTimersByTime(6000);

    // Should be allowed again
    expect(result.current.checkLimit().allowed).toBe(true);
  });

  it('manual reset clears attempts', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxAttempts: 2, windowMs: 60000, lockoutMs: 300000 })
    );

    act(() => {
      result.current.recordAttempt();
      result.current.recordAttempt();
    });

    // Should be blocked
    expect(result.current.checkLimit().allowed).toBe(false);

    // Manual reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.checkLimit().allowed).toBe(true);
  });

  it('old attempts expire outside the window', () => {
    const { result } = renderHook(() =>
      useRateLimit({ maxAttempts: 3, windowMs: 10000, lockoutMs: 300000 })
    );

    act(() => {
      result.current.recordAttempt();
      result.current.recordAttempt();
    });

    // Advance past the window
    vi.advanceTimersByTime(11000);

    // Old attempts expired, so still under limit
    expect(result.current.checkLimit().allowed).toBe(true);
  });
});
