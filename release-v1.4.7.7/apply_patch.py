from pathlib import Path
import re

league = Path('app/LeagueApp.tsx')
s = league.read_text()
s = re.sub(r'const RELEASE_VERSION = "[^"]+";', 'const RELEASE_VERSION = "1.4.7.7";', s, count=1)
s = re.sub(r'const RELEASE_DATE = "[^"]+";', 'const RELEASE_DATE = "14 Aug 2026";', s, count=1)

old_form = '<div className={styles.formControls}><select aria-label="Form range" value={formRange} onChange={e=>setFormRange(Number(e.target.value) as 6|12|18)}><option value={6}>6 weeks</option><option value={12}>12 weeks</option><option value={18}>18 weeks</option></select><button className={styles.shareGold} onClick={shareForm}><span aria-hidden="true">▣</span><strong>Share current form</strong><small>Share as a formatted image</small></button><div className={styles.formLegend}><span className={styles.formWin}>+3</span><small>BTTS</small><span className={styles.formScoreNil}>+1</span><small>Score–nil</small><span className={styles.formLoss}>-1</span><small>0–0 / missed</small></div></div>'
new_form = '<div className="shareHeaderActions"><select aria-label="Form range" value={formRange} onChange={e=>setFormRange(Number(e.target.value) as 6|12|18)}><option value={6}>6 weeks</option><option value={12}>12 weeks</option><option value={18}>18 weeks</option></select><button className="shareCompactWhatsApp" onClick={shareForm}>Share to WhatsApp</button></div>'
if old_form not in s:
    raise SystemExit('Could not locate current-form share controls')
s = s.replace(old_form, new_form, 1)
marker = '</div>\n      </div>\n      <div className={styles.formTableWrap}>'
legend = '</div>\n      </div>\n      <div className={styles.formLegend}><span className={styles.formWin}>+3</span><small>BTTS</small><span className={styles.formScoreNil}>+1</span><small>Score–nil</small><span className={styles.formLoss}>-1</span><small>0–0 / missed</small></div>\n      <div className={styles.formTableWrap}>'
if marker not in s:
    raise SystemExit('Could not relocate form legend')
s = s.replace(marker, legend, 1)

if 'className={styles.panelActions}' in s:
    s = s.replace('className={styles.panelActions}', 'className="shareHeaderActions"', 1)

weekly_block = '<div className={styles.buttonRow}>\n              <button className={styles.button} onClick={()=>setView("results")}>Results →</button>\n              <WeeklyPicksShareButton'
if weekly_block in s:
    s = s.replace(weekly_block, '<div className="shareHeaderActions">\n              <button className={styles.button} onClick={()=>setView("results")}>Results →</button>\n              <WeeklyPicksShareButton', 1)

needle = 'const releases=[\n    {version:"1.4.7.6"'
replacement = 'const releases=[\n    {version:"1.4.7.7",date:"14 Aug 2026",summary:"Compact gold sharing controls and dashboard alignment",changes:["Dashboard share controls now use the same gold treatment across league table, current form and weekly picks","Share controls are reduced in size and aligned in the immediate top-right action area of their section","Visible share wording is standardised to Share to WhatsApp while retaining formatted-image generation and native share behaviour"]},\n    {version:"1.4.7.6"'
if needle not in s:
    raise SystemExit('Could not locate release history insertion point')
s = s.replace(needle, replacement, 1)
league.write_text(s)

p = Path('app/WeeklyPicksShareButton.tsx')
s = p.read_text()
pattern = r'return <button className="dashboardPicksShareButton" onClick=\{share\} disabled=\{disabled\|\|busy\} aria-disabled=\{disabled\|\|busy\}>\s*<span aria-hidden="true">\{disabled\?"🔒":"▣"\}</span><strong>\{busy\?"Creating image…":"Share weekly picks"\}</strong><small>\{disabled\?`Locked until GW \$\{gameweekNumber\} opens`:"Share as a formatted image"\}</small>\s*</button>;'
replacement = 'return <button className="dashboardPicksShareButton shareCompactWhatsApp" onClick={share} disabled={disabled||busy} aria-disabled={disabled||busy} aria-label={disabled?`Sharing locked until GW ${gameweekNumber} opens`:"Share weekly picks to WhatsApp"}>{busy?"Creating…":"Share to WhatsApp"}</button>;'
s, count = re.subn(pattern, replacement, s, count=1)
if count != 1:
    raise SystemExit('Could not update weekly share button')
p.write_text(s)

p = Path('app/DataShareButton.tsx')
s = p.read_text()
pattern = r'return <button type="button" className=\{`dataShareButton \$\{props\.compact\?"compact":""\}`\} onClick=\{share\} disabled=\{busy\}>\s*<span aria-hidden="true">▣</span><strong>\{busy\?"Creating image…":props\.label\}</strong><small>Share as a formatted image</small>\s*</button>;'
replacement = 'return <button type="button" className={`dataShareButton shareCompactWhatsApp ${props.compact?"compact":""}`} onClick={share} disabled={busy} aria-label={`${props.label} to WhatsApp`}>{busy?"Creating…":"Share to WhatsApp"}</button>;'
s, count = re.subn(pattern, replacement, s, count=1)
if count != 1:
    raise SystemExit('Could not update data share button')
p.write_text(s)

p = Path('app/ShareTableButton.tsx')
s = p.read_text()
pattern = r'<button className="dataShareButton" type="button" onClick=\{share\} disabled=\{busy\}>\s*<span aria-hidden="true">▣</span><strong>\{busy \? "Creating image…" : "Share league table"\}</strong><small>Share as a formatted image</small>\s*</button>'
replacement = '<button className="dataShareButton shareCompactWhatsApp" type="button" onClick={share} disabled={busy} aria-label="Share league table to WhatsApp">{busy ? "Creating…" : "Share to WhatsApp"}</button>'
s, count = re.subn(pattern, replacement, s, count=1)
if count != 1:
    raise SystemExit('Could not update league-table share button')
p.write_text(s)

css_path = Path('app/globals.css')
g = css_path.read_text()
marker = '/* v1.4.7.7 compact share controls */'
if marker not in g:
    g += '''\n\n/* v1.4.7.7 compact share controls */\n.shareHeaderActions{display:flex;align-items:flex-start;justify-content:flex-end;gap:8px;flex-wrap:wrap}.shareCompactWhatsApp,.dataShareButton.shareCompactWhatsApp,.dashboardPicksShareButton.shareCompactWhatsApp,.tableShareControl .shareCompactWhatsApp{width:auto!important;min-width:118px!important;max-width:145px!important;min-height:40px!important;padding:7px 11px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;border:1px solid #f4d58d!important;border-radius:10px!important;background:linear-gradient(180deg,#f6d98d,#d9aa48 62%,#bf8731)!important;color:#421421!important;font-size:12px!important;font-weight:900!important;line-height:1.08!important;text-align:center!important;white-space:normal!important;box-shadow:0 6px 16px rgba(191,135,49,.22)!important}.tableShareControl{width:auto!important;justify-items:end!important}.tableShareControl small{max-width:145px!important}.shareHeaderActions select{min-height:40px}.shareHeaderActions .button,.shareHeaderActions .linkButton{min-height:40px;padding:7px 10px}@media(max-width:720px){.shareHeaderActions{width:auto;justify-content:flex-end;align-items:flex-start}.shareCompactWhatsApp,.dataShareButton.shareCompactWhatsApp,.dashboardPicksShareButton.shareCompactWhatsApp,.tableShareControl .shareCompactWhatsApp{width:128px!important;min-width:128px!important;max-width:128px!important}.tableShareControl{width:auto!important}.pageHeadingActions .tableShareControl,.publicTableActions .tableShareControl{width:auto!important}}\n'''
    css_path.write_text(g)
