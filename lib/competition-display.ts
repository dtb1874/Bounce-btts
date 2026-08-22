function normaliseText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function normaliseCountry(country: string) {
  const value = normaliseText(country);
  if (value === "england") return "England";
  if (value === "scotland") return "Scotland";
  if (value === "wales") return "Wales";
  if (value === "northern ireland") return "Northern Ireland";
  if (value === "europe") return "Europe";
  if (value === "international") return "International";
  return country.trim() || "Other";
}

export function competitionDisplayName(fixture: { country?: string | null; competition?: string | null }) {
  const rawCountry = fixture.country?.trim() || "Other";
  const rawCompetition = fixture.competition?.trim() || "";
  const country = normaliseCountry(rawCountry);
  const competition = normaliseText(rawCompetition);

  if (country === "England") {
    if (["premier league", "england premier league", "english premier league"].includes(competition)) return "English Premier League";
    if (["championship", "england championship", "english championship", "efl championship"].includes(competition)) return "English Championship";
    if (["league one", "england league one", "english league one", "efl league one"].includes(competition)) return "English League One";
    if (["league two", "england league two", "english league two", "efl league two"].includes(competition)) return "English League Two";
    if (["league cup", "efl cup", "england efl cup", "carabao cup", "england carabao cup"].includes(competition)) return "England — Carabao Cup";
    if (competition === "national league") return "National League";
    if (competition.includes("national league north")) return "National League North";
    if (competition.includes("national league south")) return "National League South";
  }

  if (country === "Scotland") {
    if (["premiership", "scottish premiership", "scotland premiership"].includes(competition)) return "Scottish Premiership";
    if (["championship", "scottish championship", "scotland championship"].includes(competition)) return "Scottish Championship";
    if (["league one", "league 1", "scottish league one", "scottish league 1", "scotland league one"].includes(competition)) return "Scottish League One";
    if (["league two", "league 2", "scottish league two", "scottish league 2", "scotland league two"].includes(competition)) return "Scottish League Two";
    if (["league cup", "premier sports cup", "scottish league cup"].includes(competition)) return "Premier Sports Cup";
    if (["challenge cup", "scottish challenge cup"].includes(competition)) return "Scottish Challenge Cup";
  }

  if (country === "Northern Ireland") {
    if (["premiership", "northern irish premiership", "northern ireland premiership", "nifl premiership", "northern ireland premier"].includes(competition)) return "Northern Irish Premiership";
    if (["championship", "northern irish championship", "northern ireland championship", "nifl championship"].includes(competition)) return "Northern Irish Championship";
  }

  if (country === "Wales") {
    if (["premier league", "welsh premier league", "wales premier league", "cymru premier"].includes(competition)) return "Welsh Premier League";
    if (["faw championship", "welsh championship"].includes(competition)) return "FAW Championship";
  }

  if (["premier league", "premiership", "championship", "league one", "league two", "league cup"].includes(competition)) {
    return `${country} — ${rawCompetition}`;
  }

  return rawCompetition || `${country} — Other`;
}
