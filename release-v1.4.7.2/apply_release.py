from pathlib import Path

p=Path('app/LeagueApp.tsx')
s=p.read_text()

def rep(old,new,name):
    global s
    if old not in s:
        raise SystemExit('missing '+name)
    s=s.replace(old,new,1)

rep('const RELEASE_VERSION = "1.4.7.1";','const RELEASE_VERSION = "1.4.7.2";','version')
rep('import WeeklyPicksShareButton from "./WeeklyPicksShareButton";','import WeeklyPicksShareButton from "./WeeklyPicksShareButton";\nimport DataShareButton from "./DataShareButton";','import')
rep('<button className={styles.button} onClick={shareForm}>Share form</button>','<button className={styles.shareAction} onClick={shareForm}><span aria-hidden="true">▣</span><strong>Share current form</strong><small>Share as a formatted image</small></button>','form share')
rep('<Heading eyebrow={gameweek?`GAMEWEEK ${gameweek.number}`:"RESULTS"} title="Results" actions={<button className={styles.button} onClick={onRefresh}>Refresh displayed data</button>}>','<Heading eyebrow={gameweek?`GAMEWEEK ${gameweek.number}`:"RESULTS"} title="Results" actions={<div className={styles.headingActions}><DataShareButton title={`Gameweek ${gameweek?.number??"—"} Results`} subtitle="Selected Bounce BTTS fixtures and current outcomes" columns={["PLAYER","FIXTURE","SCORE","STATUS","PTS"]} rows={selected.map(({prediction,fixture,profile})=>[profile.display_name,`${fixture.home_team} v ${fixture.away_team}`,fixture.home_score==null?"—":`${fixture.home_score}-${fixture.away_score}`,fixture.status,prediction.points_awarded==null?"—":prediction.points_awarded])} fileName={`bounce-btts-gw${gameweek?.number??"results"}-results.jpg`} label="Share results" compact/><button className={styles.button} onClick={onRefresh}>Refresh displayed data</button></div>}>','results share')
rep('<Heading eyebrow="EST 2024 · SEASON ARCHIVE" title="League History">','<Heading eyebrow="EST 2024 · SEASON ARCHIVE" title="League History" actions={selected?<DataShareButton title={`${selected.label} Final Table`} subtitle={`Bounce BTTS League archive · ${selected.gameweeks} gameweeks`} columns={["POS","PLAYER","P","W","S-N","0-0","PTS"]} rows={selected.standings.map((row,index)=>[index+1,row.name,row.played,row.wins,row.oneSided??Math.max(0,row.points-(3*row.wins)+row.zeroZeroCount),row.zeroZeroCount,row.points])} fileName={`bounce-btts-${selected.label.replace("/","-")}-archive.jpg`} label="Share archive table" compact/>:undefined}>','history share')
rep('changes:["Ultimate Admin emulation now has a persistent Exit emulation control and correctly resolves Demo Guest profiles"','changes:["Share actions are now first-class maroon/gold controls across league tables, current form, results and archive data","Ultimate Admin emulation now has a persistent Exit emulation control and correctly resolves Demo Guest profiles"','release notes')
p.write_text(s)

p=Path('app/ShareTableButton.tsx')
s=p.read_text()
old='''  return (\n    <span className={`tableShareControl ${compact ? "compact" : ""} ${className}`.trim()}>\n      <button type="button" onClick={share} disabled={busy}>\n        {busy ? "Creating JPEG…" : compact ? "Share snapshot" : "Share table snapshot"}\n      </button>\n      {message && <small>{message}</small>}\n    </span>\n  );'''
new='''  return (\n    <span className={`tableShareControl ${compact ? "compact" : ""} ${className}`.trim()}>\n      <button className="dataShareButton" type="button" onClick={share} disabled={busy}>\n        <span aria-hidden="true">▣</span><strong>{busy ? "Creating image…" : "Share league table"}</strong><small>Share as a formatted image</small>\n      </button>\n      {message && <small className="tableShareMessage">{message}</small>}\n    </span>\n  );'''
if old not in s: raise SystemExit('missing ShareTableButton marker')
p.write_text(s.replace(old,new,1))

p=Path('app/release.module.css')
s=p.read_text()
css='''\n\n/* v1.4.7.2 — consistent, prominent sharing actions */\n.headingActions{display:flex;align-items:center;justify-content:flex-end;gap:9px;flex-wrap:wrap}\n.shareAction,:global(.dataShareButton){min-height:48px;display:grid;grid-template-columns:28px auto;grid-template-rows:auto auto;column-gap:9px;align-items:center;border:1px solid #a65b70;border-radius:11px;padding:8px 13px;background:linear-gradient(180deg,#8a2d47,#641b31);color:#fff3e5;font-weight:800;cursor:pointer;box-shadow:0 8px 22px rgba(82,21,38,.3);text-align:left}\n.shareAction:hover,:global(.dataShareButton:hover){filter:brightness(1.08);border-color:#c58b9a;transform:translateY(-1px)}\n.shareAction>span,:global(.dataShareButton>span){grid-row:1/3;font-size:21px;color:#f0cfaa;text-align:center}\n.shareAction>strong,:global(.dataShareButton>strong){font-size:12px;line-height:1.1;white-space:nowrap}\n.shareAction>small,:global(.dataShareButton>small){font-size:9px;color:#e4cdb8;line-height:1.1;margin-top:2px;white-space:nowrap}\n.shareAction:disabled,:global(.dataShareButton:disabled){opacity:.55;cursor:not-allowed;transform:none}\n:global(.tableShareControl){display:inline-grid;gap:4px;justify-items:start}\n:global(.tableShareMessage){font-size:10px;color:#b9aca3}\n:global(.tableShareControl.compact .dataShareButton),:global(.dataShareButton.compact){min-height:44px;padding:7px 11px}\n@media(max-width:720px){.headingActions{width:100%;justify-content:stretch}.headingActions>*{flex:1 1 auto}.shareAction,:global(.dataShareButton){width:100%;justify-content:start}.heading{align-items:stretch;flex-direction:column}}\n'''
if 'v1.4.7.2 — consistent, prominent sharing actions' not in s:
    p.write_text(s+css)
