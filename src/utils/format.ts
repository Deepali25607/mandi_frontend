/** Format a number as Indian Rupees, compacting large values (₹2.4L, ₹1.2Cr). */
export function formatCurrency(value: number, compact = true): string {
  if (compact) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-IN').format(value);
}

export function formatValue(value: number, format: 'currency' | 'count'): string {
  return format === 'currency' ? formatCurrency(value) : formatNumber(value);
}
