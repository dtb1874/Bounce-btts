from pathlib import Path

p = Path('app/LeagueApp.tsx')
s = p.read_text()

if 'const RELEASE_VERSION = "1.4.7.3";' not in s:
    raise SystemExit('missing v1.4.7.3 version marker')
s = s.replace('const RELEASE_VERSION = "1.4.7.3";', 'const RELEASE_VERSION = "1.4.7.4";', 1)

start = s.find('function UsersAdmin(')
end = s.find('function SearchableFixturePicker(', start)
if start < 0 or end < 0:
    raise SystemExit('missing UsersAdmin block')

users_admin = r'''function UsersAdmin({notice,onEmulate}:{notice:(m:string)=>void;onEmulate:(id:string)=>void}){
  const [users,setUsers]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  async function load(){const r=await fetch("/api/admin/users",{headers:{authorization:`Bearer ${await token()}`}});const j=await r.json();if(r.ok)setUsers(j.users??[]);else notice(j.error);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function save(u:any){const r=await fetch("/api/admin/users",{method:"PATCH",headers:{"content-type":"application/json",authorization:`Bearer ${await token()}`},body:JSON.stringify({id:u.id,username:u.username,displayName:u.display_name,role:u.role,active:u.active,password:u.password})});const j=await r.json();notice(r.ok?`${u.username} saved`:j.error)}
  function shareLogin(u:any){
    if(!u.password)return notice("Generate or save a password before sharing this login.");
    const text=["Bounce BTTS League",`Player: ${u.display_name}`,`Username: ${u.username}`,`Password: ${u.password}`,"Login: https://bounce-btts.vercel.app","","Keep these login details private."].join("\n");
    const url=`https://wa.me/?text=${encodeURIComponent(text)}`;
    const opened=window.open(url,"_blank","noopener,noreferrer");
    if(!opened)window.location.href=url;
  }
  if(loading)return <div>Loading users…</div>;
  return <div className={styles.adminUsers}><p className={styles.notice}>Passwords and access controls remain Ultimate Admin only. <Help text="Use Generate to make a replacement password, Save to apply it, then WhatsApp to send the player's name, username, password and Bounce login link privately."/></p>{users.map((u:any)=><div className={`${styles.row} ${styles.adminUserRow}`} key={u.id}><input value={u.display_name} disabled={u.slot_number===1} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,display_name:e.target.value}:x))}/><input value={u.password} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:e.target.value}:x))}/><select value={u.role} disabled={u.slot_number===1} onChange={e=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,role:e.target.value}:x))}><option value="member">Member</option><option value="admin">League Admin</option><option value="guest">Demo Guest</option>{u.slot_number===1&&<option value="ultimate_admin">Ultimate Admin</option>}</select><div className={styles.buttonRow}><button className={styles.button} disabled={u.slot_number===1} aria-pressed={u.active} onClick={()=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,active:!x.active}:x))}>{u.active?"Active ✓":"Inactive"}</button><button className={styles.button} onClick={()=>setUsers(rows=>rows.map(x=>x.id===u.id?{...x,password:`bounce${u.slot_number}${Math.floor(10+Math.random()*90)}`}:x))}>Generate</button><button className={styles.button} onClick={()=>navigator.clipboard.writeText(`${u.display_name}\nUsername: ${u.username}\nPassword: ${u.password}\nLogin: https://bounce-btts.vercel.app`).then(()=>notice("Login details copied"))}>Copy</button><button className={styles.shareGold} disabled={!u.password} onClick={()=>shareLogin(u)}><span aria-hidden="true">↗</span><strong>WhatsApp login</strong><small>Share credentials</small></button><button className={styles.button} onClick={()=>onEmulate(u.id)}>Emulate</button><button className={styles.primary} onClick={()=>save(u)}>Save</button></div></div>)}</div>
}

'''
s = s[:start] + users_admin + s[end:]

s = s.replace(
    'summary:"League table cleanup, season insights, gold sharing and entry-fee tracking"',
    'summary:"Public stats/form view and one-tap WhatsApp credential sharing"',
    1,
)
marker = 'changes:["Full League now puts the league table first and removes the redundant separate top-three showcase"'
if marker in s:
    s = s.replace(
        marker,
        'changes:["Ultimate Admin Users now has a one-tap WhatsApp login share button with player name, username, password and live site link","Non-member public view now includes branded season stats, current form and player tendency tables","Full League now puts the league table first and removes the redundant separate top-three showcase"',
        1,
    )
else:
    raise SystemExit('missing release notes marker')

p.write_text(s)
