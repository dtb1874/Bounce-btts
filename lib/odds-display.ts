/** Display fractional odds without changing the stored price used in calculations. */
export function formatFixtureOddsDisplay(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if (!match) return value;
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) return value;
  // Preserve familiar prices such as 5/2, 13/8 and 100/1.
  if (denominator < 10) return value.trim();
  return `${(numerator / denominator).toFixed(2)}/1`;
}
