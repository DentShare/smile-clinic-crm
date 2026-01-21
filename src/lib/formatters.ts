/**
 * Uzbekistan-specific formatters
 */

/**
 * Format currency in Uzbek Sum (UZS)
 * @param amount - Amount in sum
 * @param showCurrency - Whether to show "so'm" suffix
 * @returns Formatted string like "1 500 000 so'm"
 */
export function formatCurrency(amount: number, showCurrency = true): string {
  const formatted = new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace(/,/g, ' ');
  
  return showCurrency ? `${formatted} so'm` : formatted;
}

/**
 * Format phone number to Uzbekistan format
 * @param phone - Phone number (digits only or with formatting)
 * @returns Formatted string like "+998 (90) 123-45-67"
 */
export function formatPhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle different input formats
  let normalized = digits;
  if (digits.startsWith('998')) {
    normalized = digits.slice(3);
  } else if (digits.startsWith('8') && digits.length === 10) {
    normalized = digits.slice(1);
  }
  
  if (normalized.length !== 9) {
    return phone; // Return original if can't format
  }
  
  const code = normalized.slice(0, 2);
  const part1 = normalized.slice(2, 5);
  const part2 = normalized.slice(5, 7);
  const part3 = normalized.slice(7, 9);
  
  return `+998 (${code}) ${part1}-${part2}-${part3}`;
}

/**
 * Parse formatted phone to digits only (with country code)
 * @param phone - Formatted phone number
 * @returns Digits only like "998901234567"
 */
export function parsePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 9) {
    return `998${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('998')) {
    return digits;
  }
  return digits;
}

/**
 * Validate Uzbekistan phone number
 * @param phone - Phone number to validate
 * @returns boolean indicating if valid
 */
export function isValidUzPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  // Valid formats: 9 digits (local) or 12 digits (with 998)
  if (digits.length === 9) {
    return /^(9[0-9]|7[0-9]|6[0-9]|3[0-9])/.test(digits);
  }
  if (digits.length === 12) {
    return digits.startsWith('998') && /^998(9[0-9]|7[0-9]|6[0-9]|3[0-9])/.test(digits);
  }
  return false;
}

/**
 * Format date in Russian locale
 * @param date - Date to format
 * @param format - 'short' | 'long' | 'time'
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const optionsMap: Record<'short' | 'long' | 'time', Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    time: { hour: '2-digit', minute: '2-digit' },
  };
  const options = optionsMap[format];
  
  return d.toLocaleDateString('ru-RU', options);
}

/**
 * Format date and time together
 * @param date - Date to format
 * @returns Formatted string like "21.01.2026, 14:30"
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
