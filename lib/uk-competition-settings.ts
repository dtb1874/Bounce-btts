export const UK_FIXTURE_COUNTRIES = ["England", "Scotland", "Wales", "Northern Ireland", "Northern-Ireland"] as const;
const ukCountries = new Set<string>(UK_FIXTURE_COUNTRIES);
export function isUkFixtureCountry(value: string) { return ukCountries.has(value); }
export function competitionKey(country: string, competition: string) {
  return JSON.stringify([country.trim(), competition.trim()]);
}
export type CompetitionSetting = { country: string; competition: string; enabled: boolean };
export function isCompetitionEnabled(settings: Map<string, boolean>, country: string, competition: string) {
  return settings.get(competitionKey(country, competition)) !== false;
}
