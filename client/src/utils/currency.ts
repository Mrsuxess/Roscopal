export const PAYPAL_SUPPORTED_CURRENCIES = new Set([
  'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CHF', 'NZD', 'HKD', 'SGD', 'SEK', 'DKK', 'PLN', 'NOK', 'CZK', 'ILS', 'MXN', 'BRL', 'MYR', 'PHP', 'TWD', 'THB'
]);

export function isPayPalSupported(currency: string = 'USD'): boolean {
  return PAYPAL_SUPPORTED_CURRENCIES.has(currency.toUpperCase());
}

export function getCurrencySymbol(currency: string = 'USD'): string {
  switch (currency.toUpperCase()) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'NGN': return '₦';
    case 'KES': return 'KSh ';
    case 'CAD': return 'CA$';
    case 'AUD': return 'A$';
    default: return `${currency} `;
  }
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const sym = getCurrencySymbol(currency);
  const formatted = Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${sym}${formatted}`;
}
