from pathlib import Path

league_path = Path("app/LeagueApp.tsx")
css_path = Path("app/release.module.css")
league = league_path.read_text()
css = css_path.read_text()

old_open = '''{users.map((u:any)=><div className={`${styles.row} ${styles.adminUserRow}`} key={u.id}>'''
new_open = '''{users.map((u:any)=><div className={`${styles.row} ${styles.adminUserRow}`} key={u.id} data-user={u.display_name} data-slot={u.slot_number}>'''
if new_open not in league:
    if old_open not in league:
        raise SystemExit("Admin user card row anchor not found")
    league = league.replace(old_open, new_open, 1)

marker = '/* admin-user-cards-20260818 */'
if marker not in css:
    css += '''\n\n/* admin-user-cards-20260818 */
.adminUsers{display:grid;gap:14px}
.adminUsers>.notice{margin-bottom:0}
.adminUserRow{
  position:relative;
  margin:0!important;
  padding:44px 12px 12px!important;
  border:1px solid rgba(142,43,76,.52)!important;
  border-radius:14px!important;
  background:linear-gradient(180deg,rgba(52,20,32,.72),rgba(18,13,17,.92))!important;
  box-shadow:0 8px 22px rgba(0,0,0,.16),inset 0 1px 0 rgba(226,190,124,.05);
  overflow:hidden;
}
.adminUserRow::before{
  content:"USER " attr(data-slot) " · " attr(data-user);
  position:absolute;
  top:0;left:0;right:0;
  min-height:34px;
  display:flex;
  align-items:center;
  padding:7px 12px;
  border-bottom:1px solid rgba(199,175,149,.13);
  background:linear-gradient(90deg,rgba(116,29,57,.42),rgba(31,17,24,.28));
  color:#e0c294;
  font-size:10px;
  line-height:1.1;
  font-weight:900;
  letter-spacing:.11em;
  text-transform:uppercase;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.adminUserField>span{font-size:7.5px!important;opacity:.88}
.adminUserField input,.adminUserField select{height:32px!important;padding:4px 7px!important}
.adminRCount{
  width:auto!important;
  min-width:38px!important;
  height:28px!important;
  padding:0 8px!important;
  align-self:end!important;
  justify-self:center!important;
  border-radius:999px!important;
  background:rgba(214,181,109,.09)!important;
  border-color:rgba(214,181,109,.28)!important;
  font-size:9px!important;
}
.adminUserRow .buttonRow{
  padding-top:7px;
  border-top:1px solid rgba(199,175,149,.09);
}
.adminUserRow .buttonRow button{min-height:30px!important}
@media(max-width:650px){
  .adminUsers{gap:16px}
  .adminUserRow{padding:42px 10px 11px!important;gap:7px!important}
  .adminUserRow::before{min-height:32px;padding:6px 10px;font-size:9px}
  .adminUserField input,.adminUserField select{height:31px!important;font-size:10.5px!important}
  .adminRCount{grid-column:1/-1!important;justify-self:start!important;width:auto!important;min-width:44px!important;height:25px!important;margin-top:1px}
  .adminUserRow .buttonRow{margin-top:1px!important;padding-top:8px}
  .adminUserRow .buttonRow button{min-height:31px!important;padding:5px 6px!important}
}
'''

league_path.write_text(league)
css_path.write_text(css)
print("Applied distinct compact Admin User account cards")
