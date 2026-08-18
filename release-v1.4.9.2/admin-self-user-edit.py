from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
users_api_path = Path("app/api/admin/users/route.ts")
css_path = Path("app/release.module.css")
league = league_path.read_text()
users_api = users_api_path.read_text()
css = css_path.read_text()

# Ultimate Admin may edit own player/display name; role and active state remain protected.
old_guard = '''  // Slot 1 remains permanently protected as DTB / Ultimate Admin / active,
  // but its login username may now be changed by the Ultimate Admin.
  if (existing.slot_number === 1 && (displayName !== "DTB" || role !== "ultimate_admin" || !active)) {
    return NextResponse.json({ error: "The DTB Ultimate Admin account must remain active and cannot change role or player name." }, { status: 400 });
  }'''
new_guard = '''  // Slot 1 remains permanently protected as Ultimate Admin / active.
  // Its player/display name and login username are editable by the Ultimate Admin.
  if (existing.slot_number === 1 && (role !== "ultimate_admin" || !active)) {
    return NextResponse.json({ error: "The Ultimate Admin account must remain active and cannot change role." }, { status: 400 });
  }'''
if old_guard in users_api:
    users_api = users_api.replace(old_guard, new_guard, 1)
elif new_guard not in users_api:
    raise SystemExit("Ultimate Admin API guard anchor not found")

old_row = '''{users.map((u:any)=><div className={`${styles.row} ${styles.adminUserRow}`} key={u.id}><input value={u.display_name} disabled={u.slot_number===1} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,display_name:e.target.value}:x))}/><input value={u.password} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:e.target.value}:x))}/><select value={u.role} disabled={u.slot_number===1}'''
new_row = '''{users.map((u:any)=><div className={`${styles.row} ${styles.adminUserRow}`} key={u.id}><label className={styles.adminUserField}><span>Player</span><input aria-label="Player name" value={u.display_name} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,display_name:e.target.value}:x))}/></label><label className={styles.adminUserField}><span>Username</span><input aria-label="Login username" value={u.username} autoCapitalize="none" autoCorrect="off" onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,username:e.target.value}:x))}/></label><label className={styles.adminUserField}><span>Password</span><input aria-label="Password" type="text" autoComplete="off" value={u.password} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:e.target.value}:x))}/></label><label className={styles.adminUserField}><span>Role</span><select aria-label="Role" value={u.role} disabled={u.slot_number===1}'''
if old_row in league:
    league = league.replace(old_row, new_row, 1)
elif 'className={styles.adminUserField}><span>Password</span>' not in league:
    raise SystemExit("Users Admin row anchor not found")

# Close the Role field label after the select, before the actions.
old_select_end = '''{u.slot_number===1&&<option value="ultimate_admin">Ultimate Admin</option>}</select><div className={styles.buttonRow}>'''
new_select_end = '''{u.slot_number===1&&<option value="ultimate_admin">Ultimate Admin</option>}</select></label><div className={styles.buttonRow}>'''
if old_select_end in league:
    league = league.replace(old_select_end, new_select_end, 1)
elif '</select></label><div className={styles.buttonRow}>' not in league:
    raise SystemExit("Users Admin role field close anchor not found")

marker = '/* admin-users-compact-fields-20260818 */'
if marker not in css:
    css += '''\n\n/* admin-users-compact-fields-20260818 */
.adminUserRow{
  grid-template-columns:minmax(120px,1.1fr) minmax(110px,.9fr) minmax(120px,.95fr) minmax(105px,.8fr) minmax(310px,auto)!important;
  gap:7px!important;
}
.adminUserField{display:grid;gap:4px;min-width:0;margin:0}
.adminUserField>span{font-size:8px;line-height:1;letter-spacing:.08em;text-transform:uppercase;color:#a99a91;font-weight:900}
.adminUserField input,.adminUserField select{width:100%;min-width:0;height:34px!important;padding:5px 7px!important;font-size:11px!important}
.adminUserField input[aria-label="Password"]{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:.01em}
.adminUserRow .buttonRow{gap:5px!important}
.adminUserRow .buttonRow button{padding:5px 7px!important;font-size:10px!important;min-height:32px!important}
@media(max-width:1120px){
  .adminUserRow{grid-template-columns:repeat(4,minmax(0,1fr))!important}
  .adminUserRow .buttonRow{grid-column:1/-1!important;justify-content:flex-start!important}
}
@media(max-width:650px){
  .adminUserRow{grid-template-columns:1fr 1fr!important;gap:8px!important}
  .adminUserRow .buttonRow{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
  .adminUserRow .buttonRow button{width:100%;white-space:normal!important}
}
'''

league_path.write_text(league)
users_api_path.write_text(users_api)
css_path.write_text(css)
print("Enabled Ultimate Admin name editing and restored compact visible password management")
