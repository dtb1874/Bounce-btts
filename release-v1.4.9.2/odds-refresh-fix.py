from pathlib import Path

path = Path("lib/api-football.ts")
text = path.read_text()

old_fixture_odds = '''async function fixtureOdds(providerId: string, betId: string, tracker: Tracker) {
  const payload = await api("/odds", { fixture: providerId, bet: betId }, tracker);
  const bookmakers = payload.response?.[0]?.bookmakers ?? [];
  const sorted = [...bookmakers].sort((a: any, b: any) => {
    const ai = BOOKMAKER_PRIORITY.indexOf(String(a.name));
    const bi = BOOKMAKER_PRIORITY.indexOf(String(b.name));
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
  for (const bookmaker of sorted) {
    for (const bet of bookmaker.bets ?? []) {
      const yes = (bet.values ?? []).find((value: any) => String(value.value).toLowerCase() === "yes");
      if (yes?.odd) return { odds: decimalToFractional(yes.odd), bookmaker: String(bookmaker.name) };
    }
  }
  return { odds: null, bookmaker: null };
}'''

new_fixture_odds = '''async function fixtureOdds(providerId: string, betId: string, tracker: Tracker) {
  const bookmakers: any[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const payload = await api("/odds", { fixture: providerId, bet: betId, page: String(page) }, tracker);
    for (const item of payload.response ?? []) bookmakers.push(...(item.bookmakers ?? []));
    totalPages = Math.max(1, Number(payload.paging?.total) || 1);
    page += 1;
  } while (page <= totalPages && page <= 5 && (tracker.remaining === null || tracker.remaining > 8) && tracker.used < 75);

  const sorted = [...bookmakers].sort((a: any, b: any) => {
    const ai = BOOKMAKER_PRIORITY.indexOf(String(a.name));
    const bi = BOOKMAKER_PRIORITY.indexOf(String(b.name));
    return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
  });
  for (const bookmaker of sorted) {
    for (const bet of bookmaker.bets ?? []) {
      const yes = (bet.values ?? []).find((value: any) => String(value.value).trim().toLowerCase() === "yes");
      const fractional = decimalToFractional(yes?.odd);
      if (fractional) return { odds: fractional, bookmaker: String(bookmaker.name) };
    }
  }
  return { odds: null, bookmaker: null };
}'''

if new_fixture_odds not in text:
    if old_fixture_odds not in text:
        raise SystemExit("fixtureOdds anchor not found")
    text = text.replace(old_fixture_odds, new_fixture_odds, 1)

old_candidates = '''      let candidatesQuery = admin.from("fixtures").select("id,provider_fixture_id,kickoff_at,is_eligible,status")
        .not("provider_fixture_id", "is", null).eq("is_eligible", true).in("status", ["NS", "TBD"]);
      candidatesQuery = requestedIds.size
        ? candidatesQuery.in("gameweek_id", targetWeeks.map((week: any) => week.id))
        : candidatesQuery.gte("kickoff_at", new Date(now).toISOString()).lte("kickoff_at", new Date(upper).toISOString());
      const { data: candidates } = await candidatesQuery.order("kickoff_at").limit(60);
      for (const fixture of candidates ?? []) {'''

new_candidates = '''      const targetWeekIds = targetWeeks.map((week: any) => week.id);
      const { data: selectedPredictions } = targetWeekIds.length
        ? await admin.from("predictions").select("fixture_id").in("gameweek_id", targetWeekIds).not("fixture_id", "is", null)
        : { data: [] as any[] };
      const selectedFixtureIds = [...new Set((selectedPredictions ?? []).map((row: any) => String(row.fixture_id)).filter(Boolean))];
      const { data: selectedCandidates } = selectedFixtureIds.length
        ? await admin.from("fixtures").select("id,provider_fixture_id,kickoff_at,is_eligible,status")
            .in("id", selectedFixtureIds).not("provider_fixture_id", "is", null).in("status", ["NS", "TBD"])
        : { data: [] as any[] };

      let candidatesQuery = admin.from("fixtures").select("id,provider_fixture_id,kickoff_at,is_eligible,status")
        .not("provider_fixture_id", "is", null).eq("is_eligible", true).in("status", ["NS", "TBD"]);
      candidatesQuery = requestedIds.size
        ? candidatesQuery.in("gameweek_id", targetWeekIds)
        : candidatesQuery.gte("kickoff_at", new Date(now).toISOString()).lte("kickoff_at", new Date(upper).toISOString());
      const { data: generalCandidates } = await candidatesQuery.order("kickoff_at").limit(60);
      const seenCandidateIds = new Set<string>();
      const candidates = [...(selectedCandidates ?? []), ...(generalCandidates ?? [])].filter((fixture: any) => {
        const id = String(fixture.id);
        if (seenCandidateIds.has(id)) return false;
        seenCandidateIds.add(id);
        return true;
      });
      for (const fixture of candidates) {'''

if new_candidates not in text:
    if old_candidates not in text:
        raise SystemExit("odds candidate priority anchor not found")
    text = text.replace(old_candidates, new_candidates, 1)

old_update = '''          const result = await fixtureOdds(providerId, betId, tracker);
          const { error: oddsError } = await admin.from("fixtures").update({
            odds_fractional: result.odds,
            odds_bookmaker: result.bookmaker,
            odds_checked_at: new Date().toISOString(),
          }).eq("id", fixture.id);
          if (oddsError) throw oddsError;
          if (result.odds) summary.oddsUpdated += 1;'''

new_update = '''          const result = await fixtureOdds(providerId, betId, tracker);
          const oddsPatch = result.odds
            ? { odds_fractional: result.odds, odds_bookmaker: result.bookmaker, odds_checked_at: new Date().toISOString() }
            : { odds_checked_at: new Date().toISOString() };
          const { error: oddsError } = await admin.from("fixtures").update(oddsPatch).eq("id", fixture.id);
          if (oddsError) throw oddsError;
          if (result.odds) summary.oddsUpdated += 1;'''

if new_update not in text:
    if old_update not in text:
        raise SystemExit("odds update anchor not found")
    text = text.replace(old_update, new_update, 1)

path.write_text(text)
print("Applied resilient paginated odds refresh, preserve-known-price, and selected-fixture priority fix")
