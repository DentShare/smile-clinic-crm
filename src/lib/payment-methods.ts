/**
 * Shared payment method labels and configuration
 */

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Наличные',
  card_terminal: 'Терминал',
  uzcard: 'UzCard',
  humo: 'Humo',
  visa: 'Visa',
  mastercard: 'MasterCard',
  click: 'Click',
  payme: 'Payme',
  uzum: 'Uzum',
  bank_transfer: 'Перевод',
  transfer: 'Перевод'
} as const;

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}
