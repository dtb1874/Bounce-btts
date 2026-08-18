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
print("Applied resilient paginated odds refresh and preserve-known-price fix")
