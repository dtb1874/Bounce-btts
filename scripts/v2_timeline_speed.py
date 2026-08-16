from pathlib import Path

p=Path('app/LeagueApp.tsx')
s=p.read_text()
s=s.replace('''  const [playing,setPlaying]=useState(true);\n  const [focus,setFocus]=useState<string|null>(null);''','''  const [playing,setPlaying]=useState(true);\n  const [speed,setSpeed]=useState<1|2>(1);\n  const [focus,setFocus]=useState<string|null>(null);''',1)
s=s.replace('''useEffect(()=>{if(!playing||step>=timeline.length-1)return;const t=window.setTimeout(()=>setStep(v=>Math.min(v+1,timeline.length-1)),900);return()=>window.clearTimeout(t)},[playing,step,timeline.length]);''','''useEffect(()=>{if(!playing||step>=timeline.length-1)return;const t=window.setTimeout(()=>setStep(v=>Math.min(v+1,timeline.length-1)),1800/speed);return()=>window.clearTimeout(t)},[playing,step,timeline.length,speed]);''',1)
s=s.replace('''<button onClick={()=>{setStep(0);setPlaying(timeline.length>1)}}>Restart</button><input aria-label="Timeline gameweek"''','''<button onClick={()=>{setStep(0);setPlaying(timeline.length>1)}}>Restart</button><button onClick={()=>setSpeed(v=>v===1?2:1)} aria-pressed={speed===2}>{speed===1?"×2 Speed":"Normal"}</button><input aria-label="Timeline gameweek"''',1)
p.write_text(s)

css=Path('app/release.module.css')
c=css.read_text()
c=c.replace('grid-template-columns:auto auto minmax(110px,1fr) auto;','grid-template-columns:auto auto auto minmax(110px,1fr) auto;',1)
c=c.replace('grid-template-columns:auto auto 1fr auto;gap:5px','grid-template-columns:auto auto auto 1fr auto;gap:5px',1)
css.write_text(c)
