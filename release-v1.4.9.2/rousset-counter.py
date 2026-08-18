from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
users_api_path = Path("app/api/admin/users/route.ts")
css_path = Path("app/release.module.css")

league = league_path.read_text()
users_api = users_api_path.read_text()
css = css_path.read_text()

old_click = '''<button type="button" className={styles.sidebarEgg} aria-label=" " onClick={()=>{setRouss(true);setMobileMenu(false)}}></button>'''
new_click = '''<button type="button" className={styles.sidebarEgg} aria-label=" " onClick={()=>{setRouss(true);setMobileMenu(false);void (async()=>{try{await fetch("/api/easter-egg/rousset",{method:"POST",headers:{authorization:`Bearer ${await token()}`}})}catch{}})()}}></button>'''
if new_click not in league:
    if old_click not in league:
        raise SystemExit("Rousset click anchor not found")
    league = league.replace(old_click, new_click, 1)

old_credentials = '''  const { data: credentials } = await admin.from("member_credentials").select("user_id,encrypted_password");
  const passwordMap = new Map((credentials ?? []).map((row) => [row.user_id, decryptPassword(row.encrypted_password)]));
  return NextResponse.json({
    users: (profiles ?? []).map((profile) => ({ ...profile, password: passwordMap.get(profile.id) ?? "" })),
  });'''
new_credentials = '''  const { data: credentials } = await admin.from("member_credentials").select("user_id,encrypted_password");
  const passwordMap = new Map((credentials ?? []).map((row) => [row.user_id, decryptPassword(row.encrypted_password)]));
  const { data: roussetEvents } = await admin.from("easter_egg_events").select("user_id").eq("event_key", "rousset");
  const roussetMap = new Map<string, number>();
  for (const event of roussetEvents ?? []) roussetMap.set(event.user_id, (roussetMap.get(event.user_id) ?? 0) + 1);
  return NextResponse.json({
    users: (profiles ?? []).map((profile) => ({ ...profile, password: passwordMap.get(profile.id) ?? "", rousset_count: roussetMap.get(profile.id) ?? 0 })),
  });'''
if 'rousset_count:' not in users_api:
    if old_credentials not in users_api:
        raise SystemExit("Users API credential map anchor not found")
    users_api = users_api.replace(old_credentials, new_credentials, 1)

old_role_close = '''{u.slot_number===1&&<option value="ultimate_admin">Ultimate Admin</option>}</select></label><div className={styles.buttonRow}>'''
new_role_close = '''{u.slot_number===1&&<option value="ultimate_admin">Ultimate Admin</option>}</select></label><span className={styles.adminRCount} title="Rousset Easter egg presses">R {u.rousset_count??0}</span><div className={styles.buttonRow}>'''
if 'className={styles.adminRCount}' not in league:
    if old_role_close not in league:
        raise SystemExit("Admin Users R-count anchor not found")
    league = league.replace(old_role_close, new_role_close, 1)

marker = '/* rousset-counter-20260818 */'
if marker not in css:
    css += '''\n\n/* rousset-counter-20260818 */
.adminUserRow{grid-template-columns:minmax(120px,1.1fr) minmax(110px,.9fr) minmax(120px,.95fr) minmax(105px,.8fr) 44px minmax(310px,auto)!important}
.adminRCount{display:grid;place-items:center;align-self:end;height:34px;border:1px solid rgba(199,175,149,.24);border-radius:8px;background:rgba(43,20,29,.65);color:#d9bd8a;font-size:10px;font-weight:900;white-space:nowrap}
@media(max-width:1120px){.adminUserRow{grid-template-columns:repeat(4,minmax(0,1fr)) 44px!important}.adminUserRow .buttonRow{grid-column:1/-1!important}.adminRCount{align-self:end}}
@media(max-width:650px){.adminUserRow{grid-template-columns:1fr 1fr!important}.adminRCount{grid-column:auto;justify-self:stretch}.adminUserRow .buttonRow{grid-column:1/-1!important}}
'''

league_path.write_text(league)
users_api_path.write_text(users_api)
css_path.write_text(css)
print("Applied authenticated Rousset tracking and Ultimate Admin R counter")
