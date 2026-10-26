// FormatCurrency.js - Indian (INR) & Global (USD) currency formatting helpers

export function formatCurrency(amount, currency = 'INR', compact = false) {
  const val = Number(amount) || 0
  if (currency === 'USD') {
    if (compact) {
      if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
      if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(1)}K`
    }
    return `$${Math.round(val).toLocaleString('en-US')}`
  }

  // Indian Rupee (INR)
  if (compact) {
    if (Math.abs(val) >= 10_000_000) return `₹${(val / 10_000_000).toFixed(2)} Cr`
    if (Math.abs(val) >= 100_000) return `₹${(val / 100_000).toFixed(1)} Lakh`
    if (Math.abs(val) >= 1_000) return `₹${(val / 1_000).toFixed(1)}K`
  }
  return `₹${Math.round(val).toLocaleString('en-IN')}`
}

export function formatIndianNumber(num) {
  const val = Number(num) || 0
  if (Math.abs(val) >= 10_000_000) return `${(val / 10_000_000).toFixed(2)} Cr`
  if (Math.abs(val) >= 100_000) return `${(val / 100_000).toFixed(1)} Lakh`
  return val.toLocaleString('en-IN')
}
