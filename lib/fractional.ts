export function fractionalToDecimal(value?: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!match) return null;
  const top = Number(match[1]);
  const bottom = Number(match[2]);
  if (!bottom) return null;
  return 1 + top / bottom;
}

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : Math.abs(a);
}

export function decimalToFractional(decimal: number, maxDenominator = 100) {
  const target = Math.max(0, decimal - 1);
  let bestTop = 0;
  let bestBottom = 1;
  let bestError = Number.POSITIVE_INFINITY;
  for (let bottom = 1; bottom <= maxDenominator; bottom++) {
    const top = Math.round(target * bottom);
    const error = Math.abs(target - top / bottom);
    if (error < bestError) {
      bestTop = top;
      bestBottom = bottom;
      bestError = error;
    }
  }
  const divisor = gcd(bestTop, bestBottom) || 1;
  return `${bestTop / divisor}/${bestBottom / divisor}`;
}

export function combinedFractional(values: Array<string | null | undefined>) {
  const decimals = values.map(fractionalToDecimal).filter((v): v is number => v !== null);
  if (!decimals.length) return "Odds unavailable";
  const combinedDecimal = decimals.reduce((total, value) => total * value, 1);
  const wholeFractional = Math.floor(Math.max(0, combinedDecimal - 1));
  return `${wholeFractional}/1`;
}
