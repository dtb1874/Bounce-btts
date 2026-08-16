from pathlib import Path

league=Path('app/LeagueApp.tsx')
s=league.read_text()
# Slower normal timeline speed with optional x2 control.
if 'const [speed,setSpeed]=useState<1|2>(1);' not in s:
    s=s.replace('  const [playing,setPlaying]=useState(true);\n  const [focus,setFocus]=useState<string|null>(null);','  const [playing,setPlaying]=useState(true);\n  const [speed,setSpeed]=useState<1|2>(1);\n  const [focus,setFocus]=useState<string|null>(null);',1)
s=s.replace('window.setTimeout(()=>setStep(v=>Math.min(v+1,timeline.length-1)),900)','window.setTimeout(()=>setStep(v=>Math.min(v+1,timeline.length-1)),1800/speed)',1)
s=s.replace('[playing,step,timeline.length]);','[playing,step,timeline.length,speed]);',1)
if '{speed===1?"×2 Speed":"Normal"}' not in s:
    s=s.replace('<button onClick={()=>{setStep(0);setPlaying(timeline.length>1)}}>Restart</button><input aria-label="Timeline gameweek"','<button onClick={()=>{setStep(0);setPlaying(timeline.length>1)}}>Restart</button><button onClick={()=>setSpeed(v=>v===1?2:1)} aria-pressed={speed===2}>{speed===1?"×2 Speed":"Normal"}</button><input aria-label="Timeline gameweek"',1)
# Remove current Hearts crest imagery from v2 UI in favour of the pavement mosaic.
s=s.replace('/assets/hearts-crest.png','/assets/st-giles-heart.jpg')
s=s.replace('alt="Heart of Midlothian crest"','alt="Heart of Midlothian pavement mosaic"')
league.write_text(s)

# Login also removes current crest.
login=Path('app/login/page.tsx')
if login.exists():
    t=login.read_text().replace('/assets/hearts-crest.png','/assets/st-giles-heart.jpg').replace('Heart of Midlothian crest','Heart of Midlothian pavement mosaic')
    login.write_text(t)

css=Path('app/release.module.css')
c=css.read_text()
c=c.replace('grid-template-columns:auto auto minmax(110px,1fr) auto;','grid-template-columns:auto auto auto minmax(110px,1fr) auto;',1)
c=c.replace('grid-template-columns:auto auto 1fr auto;gap:5px','grid-template-columns:auto auto auto 1fr auto;gap:5px',1)
marker='/* v2.0 mobile polish and heritage art */'
if marker not in c:
    c += r'''

/* v2.0 mobile polish and heritage art */
.main{position:relative;isolation:isolate;overflow:hidden}
.main::before{
  content:"";position:absolute;z-index:0;left:0;right:0;top:154px;height:360px;pointer-events:none;
  background:
    linear-gradient(180deg,rgba(9,10,14,.25) 0%,rgba(9,10,14,.72) 60%,rgba(9,10,14,1) 100%),
    url('/assets/edinburgh-skyline.jpg') center top/cover no-repeat;
  opacity:.34;filter:sepia(.2) saturate(.72) contrast(1.08)
}
.hero,.content,.footer{position:relative;z-index:1}
.content::before{
  content:"";position:absolute;z-index:-1;right:-80px;top:40px;width:330px;height:330px;border-radius:50%;pointer-events:none;
  background:url('/assets/st-giles-heart.jpg') center/cover no-repeat;
  opacity:.15;filter:sepia(.35) saturate(.75) contrast(1.06);mix-blend-mode:screen
}
.content::after{
  content:"";position:absolute;z-index:-1;left:2%;top:540px;width:260px;height:260px;border-radius:50%;pointer-events:none;
  background:url('/assets/st-giles-round.jpg') center/cover no-repeat;
  opacity:.085;filter:sepia(.25) saturate(.7)
}
.panel::after{opacity:.065!important}
.heading{position:relative;padding:12px 14px 10px;border-left:2px solid rgba(232,190,95,.36);border-radius:0 12px 12px 0;background:linear-gradient(90deg,rgba(91,23,43,.18),transparent 72%)}
.heading::after{content:"";position:absolute;right:8px;top:-8px;width:84px;height:84px;border-radius:50%;background:url('/assets/st-giles-heart.jpg') center/cover no-repeat;opacity:.095;pointer-events:none;filter:sepia(.35) saturate(.7)}
.brand img{border-radius:50%;object-fit:cover;border:1px solid rgba(232,190,95,.45);padding:2px;background:#1a0d12}
.dashboardArt img:first-child{border-radius:50%;object-fit:cover}
.seasonFacts{gap:12px}
.seasonFacts article{position:relative;overflow:hidden}
.seasonFacts article::after{content:"";position:absolute;right:-26px;bottom:-38px;width:130px;height:130px;border-radius:50%;background:url('/assets/st-giles-heart.jpg') center/cover no-repeat;opacity:.055;pointer-events:none}
@media(max-width:650px){
  .main::before{top:126px;height:290px;opacity:.42;background-position:center top}
  .content::before{right:-95px;top:12px;width:260px;height:260px;opacity:.16}
  .content::after{left:-75px;top:620px;width:220px;height:220px;opacity:.09}
  .heading{padding:10px 11px 9px;margin-left:-2px;margin-right:-2px}
  .heading::after{width:68px;height:68px;opacity:.11}
  .panel::after{opacity:.075!important}
  .seasonFacts{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important}
  .seasonFacts article{min-width:0!important;min-height:108px!important;padding:13px 12px!important;display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:flex-start!important;gap:3px!important}
  .seasonFacts article>span{font-size:9px!important;line-height:1.15!important;letter-spacing:.08em!important;margin:0 0 4px!important;white-space:normal!important}
  .seasonFacts article>strong{display:block!important;width:100%!important;font-size:18px!important;line-height:1.05!important;margin:0!important;padding:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
  .seasonFacts article>small{display:block!important;width:100%!important;font-size:10px!important;line-height:1.25!important;margin:3px 0 0!important;color:rgba(255,255,255,.58)!important;white-space:normal!important}
  .seasonFacts article::after{width:100px;height:100px;right:-30px;bottom:-36px;opacity:.065}
  .timelineControls{grid-template-columns:auto auto auto minmax(70px,1fr) auto!important}
  .timelineControls button{white-space:nowrap}
}
'''
css.write_text(c)
