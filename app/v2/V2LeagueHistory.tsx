"use client";

import { historicalSeasons, rollOfHonour } from "@/lib/history-data";
import styles from "./V2EditorialSections.module.css";

function pointLabel(value:number){return `${value>0?"+":""}${value} pt${Math.abs(value)===1?"":"s"}`}

export default function V2LeagueHistory({seasonLabel}:{seasonLabel:string}){
  const currentChampion=rollOfHonour[rollOfHonour.length-1];
  return <section className={styles.page}>
    <header className={styles.hero}><span>BOUNCE ARCHIVE · {seasonLabel}</span><h1>League History</h1><p>The permanent record of Bounce BTTS: champions, preserved final tables and historic weekly results. Historical points remain exactly as recorded rather than being recalculated using current rules.</p></header>
    <main className={styles.content}>
      <div className={styles.title}><div><span className={styles.eyebrow}>ROLL OF HONOUR</span><h2>Bounce Cup</h2></div><small>{rollOfHonour.length} completed seasons</small></div>
      {currentChampion?<div className={styles.champion}><div><span className={styles.eyebrow}>REIGNING CHAMPION · {currentChampion.season}</span><strong>{currentChampion.winner}</strong><small>Current holder of the Bounce Cup</small></div><b>{currentChampion.points} PTS</b></div>:null}
      {historicalSeasons.slice().reverse().map((season,index)=><details className={styles.season} key={season.season} open={index===0}>
        <summary><strong>{season.season} · {season.winner}</strong><span>{season.weeks} gameweeks · {season.finalTable.length} players</span></summary>
        <p className={styles.note}>{season.scoringNote} {season.tablePointsNote}</p>
        <div className={`${styles.historyRow} ${styles.historyHead}`}><span>#</span><span>Player</span><span>P</span><span>W</span><span>S-N</span><span>L</span><span>PTS</span></div>
        <div className={styles.historyTable}>{season.finalTable.map((row,pos)=><div className={styles.historyRow} key={row.name}><span>{pos+1}</span><strong>{row.name}</strong><span>{row.played}</span><span>{row.wins}</span><span>{row.scoreNil}</span><span>{row.losses}</span><b>{row.points}</b></div>)}</div>
        <details style={{marginTop:22,borderTop:"1px solid rgba(95,31,54,.15)",paddingTop:6}}>
          <summary style={{minHeight:48}}><strong>Weekly archive</strong><span>GW 1–{season.weeks} · independently expandable</span></summary>
          <div style={{display:"grid",gap:8,padding:"12px 0 4px"}}>
            {Array.from({length:season.weeks},(_,weekIndex)=>{
              const week=weekIndex+1;
              const rows=season.weekly.map(player=>({name:player.name,points:player.weeklyAwardedPoints[weekIndex]})).filter(row=>typeof row.points==="number");
              return <details key={week} style={{borderBottom:"1px solid rgba(95,31,54,.09)",paddingBottom:6}}>
                <summary style={{minHeight:42}}><strong>Gameweek {week}</strong><span>{rows.length} recorded result{rows.length===1?"":"s"}</span></summary>
                <div style={{display:"grid",padding:"4px 0 8px"}}>{rows.map(row=><div key={row.name} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:12,alignItems:"center",minHeight:34,borderBottom:"1px solid rgba(95,31,54,.055)",fontSize:".58rem",color:"#746d67"}}><strong style={{color:"#34252c",fontFamily:"Georgia,serif",fontSize:".7rem"}}>{row.name}</strong><b style={{color:row.points===3||row.points===2?"#35634a":row.points<0?"#963b49":"#8b661d"}}>{pointLabel(row.points)}</b></div>)}</div>
              </details>
            })}
          </div>
        </details>
      </details>)}
    </main>
    <footer className={styles.footer}>Bounce BTTS · Roll of Honour · Edinburgh</footer>
  </section>
}
