from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(text: str, old: str, new: str, label: str) -> str:
    if old not in text:
        raise RuntimeError(f"Could not find expected block: {label}")
    return text.replace(old, new, 1)

league_path = ROOT / "app" / "LeagueApp.tsx"
league = league_path.read_text(encoding="utf-8")
league = replace_once(league, 'const RELEASE_VERSION = "1.4.6";', 'const RELEASE_VERSION = "1.4.7";', "release version")
league = replace_once(league, 'const RELEASE_DATE = "13 Aug 2026";', 'const RELEASE_DATE = "13 Aug 2026";', "release date")
league = replace_once(
    league,
    'return <section><Heading eyebrow="ADMIN CONTROL" title="League Management">',
    'return <section className={styles.adminPage}><Heading eyebrow="ADMIN CONTROL" title="League Management">',
    "admin page class",
)
league = replace_once(
    league,
    '<div className={styles.adminTabs}>{(["users","selections","fixtures","results","gameweek","seasons"] as AdminView[]).filter(v=>v!=="users"||isUltimate).map(v=><button key={v} className={active===v?styles.active:""} onClick={()=>setActive(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div><div className={styles.panel}>',
    '<div className={styles.adminTabs}>{(["users","selections","fixtures","results","gameweek","seasons"] as AdminView[]).filter(v=>v!=="users"||isUltimate).map(v=><button key={v} className={active===v?styles.active:""} onClick={()=>setActive(v)}>{v[0].toUpperCase()+v.slice(1)}</button>)}</div><div className={`${styles.panel} ${styles.adminPanel}`}>',
    "admin panel class",
)
league = replace_once(
    league,
    'if(loading)return <div>Loading users…</div>;return <div><p className={styles.notice}>',
    'if(loading)return <div>Loading users…</div>;return <div className={styles.adminUsers}><p className={styles.notice}>',
    "admin users wrapper",
)
league = replace_once(
    league,
    'users.map((u:any)=><div className={styles.row} key={u.id}>',
    'users.map((u:any)=><div className={`${styles.row} ${styles.adminUserRow}`} key={u.id}>',
    "admin user row",
)
league = replace_once(
    league,
    'return <div><div className={styles.buttonRow}><button className={styles.primary} disabled={busy} onClick={recalc}>',
    'return <div className={styles.adminResults}><div className={styles.buttonRow}><button className={styles.primary} disabled={busy} onClick={recalc}>',
    "admin results wrapper",
)
league = replace_once(
    league,
    'return <div className={styles.row} key={f.id}><span><small>{competitionDisplayName(f)}</small>',
    'return <div className={`${styles.row} ${styles.adminResultRow}`} key={f.id}><span><small>{competitionDisplayName(f)}</small>',
    "admin result row",
)
league = replace_once(
    league,
    'summary:"Fixture integrity, admin stability and member mobile polish",changes:[',
    'summary:"Visible Bounce identity refresh and compact admin browser layouts",changes:["Admin Users is rebuilt into compact browser rows with aligned account controls and reduced vertical waste","Admin Results is condensed into a clear fixture / score / Save FT grid for desktop browser use","Branding is deliberately more visible across the authenticated app using maroon, warm gold and the Heart of Midlothian pavement mosaic motif","The Heart mosaic is used as the Edinburgh visual reference — no St Giles Cathedral imagery","Dashboard, page shells, headings and key panels receive a stronger Bounce visual hierarchy while preserving all functions",',
    "release history",
)
league_path.write_text(league, encoding="utf-8")

css_path = ROOT / "app" / "release.module.css"
css = css_path.read_text(encoding="utf-8")
css += r'''

/* === v1.4.7 visible Bounce identity + compact browser admin === */
.page{
  position:relative;
}
.page::before{
  content:"";
  position:fixed;
  inset:0 0 auto 0;
  height:190px;
  pointer-events:none;
  background:
    radial-gradient(circle at 82% -12%,rgba(179,112,80,.16),transparent 28rem),
    linear-gradient(180deg,rgba(92,22,43,.22),rgba(92,22,43,0));
  z-index:-1;
}
.heading{position:relative;padding:4px 0 8px 18px;border-left:3px solid rgba(211,172,124,.72)}
.heading::after{
  content:"";position:absolute;right:0;top:-16px;width:84px;height:84px;
  background:url("/assets/st-giles-round.jpg") center/contain no-repeat;
  opacity:.10;filter:saturate(.78) contrast(1.08);pointer-events:none
}
.heading h2{color:#f5e4cf;text-shadow:0 1px 0 rgba(0,0,0,.5)}
.heading p{color:#bdaca0}
.eyebrow{color:#d8ad7d!important;letter-spacing:.16em}
.panel{
  background:
    linear-gradient(145deg,rgba(20,17,22,.985),rgba(12,12,17,.99)),
    #111116;
  border-color:rgba(121,52,73,.62)!important;
  box-shadow:0 16px 38px rgba(0,0,0,.22)
}
.panel::after{opacity:.055!important}
.dashboardIntro{
  border:1px solid rgba(203,151,106,.4)!important;
  background:
    radial-gradient(circle at 84% 38%,rgba(155,52,82,.38),transparent 17rem),
    linear-gradient(115deg,#160f14,#35131f 62%,#5b1a31)!important
}
.dashboardIntro::before{
  background:url("/assets/st-giles-round.jpg") 92% 50%/205px auto no-repeat!important;
  opacity:.10!important;
  mix-blend-mode:screen
}
.dashboardStats .statCard{border-top:2px solid rgba(191,137,91,.42)}
.quickLinks button,.adminTabs button,.aboutTabs button{transition:transform .12s ease,border-color .12s ease,background .12s ease}
.quickLinks button:hover,.adminTabs button:hover,.aboutTabs button:hover{transform:translateY(-1px);border-color:rgba(201,147,105,.75)}
.adminPage{position:relative}
.adminPage::before{
  content:"";position:absolute;right:12px;top:-34px;width:128px;height:128px;
  background:url("/assets/st-giles-round.jpg") center/contain no-repeat;opacity:.075;pointer-events:none
}
.adminPanel{padding:16px 18px!important}
.adminTabs{margin-bottom:12px}
.adminUsers>.notice{margin-bottom:12px}
.adminUserRow{
  display:grid!important;
  grid-template-columns:minmax(150px,195px) minmax(210px,1fr) 120px minmax(300px,auto)!important;
  gap:8px!important;
  align-items:center!important;
  padding:10px 0!important;
  min-height:0!important;
  border-top:1px solid rgba(255,255,255,.065)
}
.adminUserRow:first-of-type{border-top:0}
.adminUserRow input,.adminUserRow select{min-width:0;height:36px;padding:6px 9px}
.adminUserRow .buttonRow{display:flex;flex-wrap:nowrap;justify-content:flex-end;gap:6px!important}
.adminUserRow .buttonRow button{min-height:34px;padding:6px 9px;white-space:nowrap;font-size:11px}
.adminResults>.buttonRow{margin-bottom:10px}
.adminResultRow{
  display:grid!important;
  grid-template-columns:minmax(260px,1fr) 64px 64px 96px!important;
  gap:8px!important;
  align-items:center!important;
  padding:8px 0!important;
  min-height:0!important;
  border-top:1px solid rgba(255,255,255,.065)
}
.adminResultRow:first-of-type{border-top:0}
.adminResultRow>span{line-height:1.1}
.adminResultRow>span small{font-size:9px;color:#d0a87d}
.adminResultRow>span strong{font-size:12px;color:#f1e5d7}
.adminResultRow input{height:34px;padding:5px 8px;text-align:center}
.adminResultRow button{min-height:34px;padding:6px 10px}

@media(min-width:901px){
  .adminPage{max-width:1180px;margin:0 auto}
  .adminPanel{border-radius:16px}
}

@media(max-width:1050px){
  .adminUserRow{grid-template-columns:minmax(145px,.8fr) minmax(190px,1.2fr) 105px!important}
  .adminUserRow .buttonRow{grid-column:1/-1;justify-content:flex-start}
}

@media(max-width:650px){
  .heading::after{width:58px;height:58px;top:-4px;opacity:.075}
  .adminPanel{padding:12px!important}
  .adminUserRow,.adminResultRow{grid-template-columns:1fr!important;padding:11px 0!important}
  .adminUserRow .buttonRow{grid-column:auto;flex-wrap:wrap;justify-content:flex-start}
  .adminResultRow input{width:100%}
}
'''
css_path.write_text(css, encoding="utf-8")

readme = ROOT / "README_BOUNCE_BTTS_v1.4.7.txt"
readme.write_text('''BOUNCE BTTS LEAGUE — v1.4.7
================================
13 August 2026

Purpose
- Follow-up visual and browser-layout release built directly on v1.4.6.
- No functionality removed.
- No database migration required.

Changes
1. Admin > Users browser cleanup
   - Compact rows instead of very tall account blocks.
   - Name, password, role and actions align as a proper desktop management grid.
   - Action buttons remain available: Active, Generate, Copy, Emulate, Save.

2. Admin > Results browser cleanup
   - Compact fixture / home score / away score / Save FT rows.
   - Less empty width and vertical spacing.
   - Recalculate Gameweek Points remains unchanged.

3. Stronger Bounce branding
   - More obvious maroon and warm-gold hierarchy.
   - Heart of Midlothian pavement mosaic motif made deliberately more visible in authenticated app surfaces.
   - The mosaic is the Edinburgh reference; this release does NOT introduce St Giles Cathedral/church imagery.
   - Dashboard/page headings/panels receive a stronger visual identity rather than the very subtle v1.4.6 treatment.

Preserved from v1.4.6
- Admin bulk selection draft protection across 45-second refreshes.
- Fixture de-duplication handling.
- Bookmaker-style combined accumulator odds rounded down to x/1.
- Existing collapsible fixture/results layout.
- Existing scoring, alerts, roles and gameweek controls.

Release check
- npm run build must pass before the ZIP is produced.
''', encoding="utf-8")

print("v1.4.7 transformation applied")
