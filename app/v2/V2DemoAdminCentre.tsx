"use client";

import styles from "./V2AdminCentre.module.css";

type Props={seasonLabel:string;gameweek:{number:number;status:string}|null;profiles:Array<{id:string;display_name:string;role:string;active:boolean}>;fixtures:Array<{is_eligible:boolean}>;predictions:Array<{member_id:string}>};

export default function V2DemoAdminCentre({seasonLabel,gameweek,profiles,fixtures,predictions}:Props){
 const members=profiles.filter(row=>row.active&&row.role!=="guest");
 const eligible=fixtures.filter(row=>row.is_eligible).length;
 return <main className={styles.page}>
  <header className={styles.hero}><div className={styles.heroTitle}><span>SEASON {seasonLabel}</span><h1>Admin</h1><p>Demo · Read Only</p></div><div className={styles.statusSignal}><span>SYSTEM STATE</span><strong>DEMO</strong><small>No operational data can be changed</small></div></header>
  <section className={styles.section}><header className={styles.sectionHeading}><span>ADMIN PERSPECTIVE</span><h2>League Control Centre</h2></header><div className={styles.advancedLedger}>
   <article><div><span>GAMEWEEK</span><strong>{gameweek?`GW ${gameweek.number} · ${gameweek.status}`:"No active gameweek"}</strong><p>Demo Mode shows the Admin perspective without exposing credentials, private contact details or mutation controls.</p></div></article>
   <article><div><span>MEMBERS</span><strong>{members.length} active members</strong><p>{predictions.length} selections currently visible for the selected gameweek.</p></div></article>
   <article><div><span>FIXTURE COVER</span><strong>{eligible} eligible fixtures</strong><p>Provider, odds, result and schedule operations remain disabled in Demo Mode.</p></div></article>
   <article><div><span>SECURITY</span><strong>Read-only demonstration</strong><p>Usernames, passwords, mobile numbers, admin alerts and write actions are intentionally hidden.</p></div></article>
  </div></section>
 </main>
}
