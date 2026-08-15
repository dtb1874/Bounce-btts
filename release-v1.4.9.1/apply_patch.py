from pathlib import Path
import re

league=Path('app/LeagueApp.tsx')
s=league.read_text()
s=re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.9.1";', s, count=1)
s=re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "15 Aug 2026";', s, count=1)

# Allow transient live elapsed-minute data on fixture objects.
s=s.replace('type Fixture = { id: string; gameweek_id: string | null; competition: string; country: string; home_team: string; away_team: string; kickoff_at: string; status: string; home_score: number | null; away_score: number | null;', 'type Fixture = { id: string; gameweek_id: string | null; competition: string; country: string; home_team: string; away_team: string; kickoff_at: string; status: string; live_elapsed?: number | null; home_score: number | null; away_score: number | null;',1)

# Compact shared live status formatter.
needle='function formatKickoff(value: string) { return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value)); }'
replacement=needle+'\nfunction fixtureStatusLabel(fixture: Pick<Fixture,"status"|"live_elapsed">) { const live=["1H","2H","ET","P","BT","INT"].includes(fixture.status); return live&&fixture.live_elapsed!=null?`${fixture.live_elapsed}′`:fixture.status; }'
if needle not in s: raise SystemExit('Could not locate kickoff formatter')
s=s.replace(needle,replacement,1)

# Preserve elapsed data returned by the fast live endpoint after the DB refresh.
needle='''      await refreshLiveData(true);\n      if(manual)notice(j.providerFixtures?`Live scores refreshed · ${j.updated??0} updated`:"Live scores checked");'''
replacement='''      await refreshLiveData(true);\n      if(Array.isArray(j.fixtures)&&j.fixtures.length){\n        const liveById=new Map(j.fixtures.map((x:any)=>[String(x.id),x]));\n        const applyLive=(rows:Fixture[])=>rows.map(f=>{const x:any=liveById.get(f.id);return x?{...f,status:String(x.status??f.status),home_score:x.homeScore??f.home_score,away_score:x.awayScore??f.away_score,live_elapsed:Number.isInteger(x.elapsed)?x.elapsed:null}:f});\n        setFixtures(applyLive);\n        setAllFixtures(applyLive);\n      }\n      if(manual)notice(j.providerFixtures?`Live scores refreshed · ${j.updated??0} updated`:"Live scores checked");'''
if needle not in s: raise SystemExit('Could not locate fast live refresh response handling')
s=s.replace(needle,replacement,1)

# Show elapsed minutes neatly anywhere the main fixture status is rendered.
s=s.replace('<small>{myFixture.status}</small>','<small>{fixtureStatusLabel(myFixture)}</small>',1)
s=s.replace('<small>{fixture?.status??"PENDING"}</small>','<small>{fixture?fixtureStatusLabel(fixture):"PENDING"}</small>',1)
s=s.replace('<span>{f.status}</span></div>)','<span>{fixtureStatusLabel(f)}</span></div>)',1)
# Results page and any other simple status cell variants.
s=s.replace('<span>{f.status}</span><span>{f.home_score', '<span>{fixtureStatusLabel(f)}</span><span>{f.home_score',1)
s=s.replace('<small>{f.status}</small>', '<small>{fixtureStatusLabel(f)}</small>')

needle='const releases=[\n    {version:"1.4.9"'
replacement='const releases=[\n    {version:"1.4.9.1",date:"15 Aug 2026",summary:"Live match minutes shown alongside scores",changes:["Live fixtures now show the provider elapsed match minute neatly alongside each score/status, for example 1–1 · 67′","Elapsed minutes are returned by the fast batched live-score endpoint and applied immediately to Dashboard, Fixtures and Results displays","Half-time and full-time states remain shown as HT and FT rather than a misleading minute value","The elapsed-minute display is visible to all users wherever live fixture scores are shown"]},\n    {version:"1.4.9"'
if needle not in s: raise SystemExit('Could not locate v1.4.9 release entry')
s=s.replace(needle,replacement,1)
league.write_text(s)

css=Path('app/globals.css')
g=css.read_text()
marker='/* v1.4.9.1 live elapsed minute */'
if marker not in g:
    g += '\n/* v1.4.9.1 live elapsed minute */\n.liveCell small{font-variant-numeric:tabular-nums}\n'
    css.write_text(g)
