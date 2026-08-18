from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
users_api_path = Path("app/api/admin/users/route.ts")
league = league_path.read_text()
users_api = users_api_path.read_text()

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
new_row = '''{users.map((u:any)=><div className={`${styles.row} ${styles.adminUserRow}`} key={u.id}><input aria-label="Player name" title="Player name" placeholder="Player name" value={u.display_name} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,display_name:e.target.value}:x))}/><input aria-label="Login username" title="Login username" placeholder="Login username" value={u.username} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,username:e.target.value}:x))}/><input aria-label="Password" title="Password" placeholder="Password" value={u.password} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:e.target.value}:x))}/><select value={u.role} disabled={u.slot_number===1}'''
if old_row in league:
    league = league.replace(old_row, new_row, 1)
elif 'aria-label="Login username"' not in league:
    raise SystemExit("Users Admin row anchor not found")

league_path.write_text(league)
users_api_path.write_text(users_api)
print("Enabled Ultimate Admin player/login name editing while preserving role protection")
