import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPhone,
  parsePhone,
  isValidUzPhone,
  formatDate,
} from './formatters';

describe('formatCurrency', () => {
  it('formats positive amounts with currency suffix', () => {
    expect(formatCurrency(1500000)).toContain("so'm");
    expect(formatCurrency(1500000)).toMatch(/1[\s\u00a0]500[\s\u00a0]000/);
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toMatch(/0.*so'm/);
  });

  it('omits currency when showCurrency is false', () => {
    expect(formatCurrency(1000, false)).not.toContain("so'm");
  });

  it('handles large numbers', () => {
    const result = formatCurrency(999999999);
    expect(result).toContain("so'm");
  });
});

describe('formatPhone', () => {
  it('formats 9-digit local numbers', () => {
    expect(formatPhone('901234567')).toBe('+998 (90) 123-45-67');
  });

  it('formats numbers with country code 998', () => {
    expect(formatPhone('998901234567')).toBe('+998 (90) 123-45-67');
  });

  it('returns original for invalid length', () => {
    expect(formatPhone('123')).toBe('123');
  });

  it('strips non-digit characters before formatting', () => {
    expect(formatPhone('+998 (90) 123-45-67')).toBe('+998 (90) 123-45-67');
  });
});

describe('parsePhone', () => {
  it('adds country code to 9-digit number', () => {
    expect(parsePhone('901234567')).toBe('998901234567');
  });

  it('keeps 12-digit number with 998 prefix', () => {
    expect(parsePhone('998901234567')).toBe('998901234567');
  });

  it('strips formatting characters', () => {
    expect(parsePhone('+998 (90) 123-45-67')).toBe('998901234567');
  });
});

describe('isValidUzPhone', () => {
  it('validates 9-digit mobile numbers', () => {
    expect(isValidUzPhone('901234567')).toBe(true);
    expect(isValidUzPhone('771234567')).toBe(true);
  });

  it('validates 12-digit numbers with 998', () => {
    expect(isValidUzPhone('998901234567')).toBe(true);
  });

  it('rejects invalid lengths', () => {
    expect(isValidUzPhone('12345')).toBe(false);
    expect(isValidUzPhone('12345678901234')).toBe(false);
  });

  it('rejects numbers with invalid operator codes', () => {
    expect(isValidUzPhone('001234567')).toBe(false);
  });
});

describe('formatDate', () => {
  it('formats date in short format', () => {
    const result = formatDate('2026-01-15');
    expect(result).toMatch(/15/);
    expect(result).toMatch(/01/);
    expect(result).toMatch(/2026/);
  });

  it('accepts Date objects', () => {
    const result = formatDate(new Date(2026, 0, 15));
    expect(result).toMatch(/15/);
  });

  it('formats time', () => {
    const result = formatDate(new Date(2026, 0, 15, 14, 30), 'time');
    expect(result).toMatch(/14/);
    expect(result).toMatch(/30/);
  });
});
