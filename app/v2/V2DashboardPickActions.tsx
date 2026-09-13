"use client";

import WeeklyPicksShareButton from "../WeeklyPicksShareButton";
import CombinedShareButton from "../CombinedShareButton";
import ShareTableButton from "../ShareTableButton";
import V2OddsRefreshButton from "./V2OddsRefreshButton";
import styles from "./V2DashboardPickActions.module.css";

type Profile={id:string;display_name:string;active:boolean;role:string};
type Fixture={id:string;competition:string;home_team:string;away_team:string;kickoff_at:string;status:string;live_elapsed?:number|null;home_score:number|null;away_score:number|null;odds_fractional:string|null;odds_deadline_fractional?:string|null};
type Prediction={member_id:string;fixture_id:string};
type Standing={id:string;name:string;played:number;wins:number;oneSided:number;zeroZeroCount:number;points:number};
type Props={gameweekId:string|null;gameweekNumber:number|null;seasonLabel:string;profiles:Profile[];fixtures:Fixture[];predictions:Prediction[];standings:Standing[];prizePot:number;isAdmin:boolean};

export default function V2DashboardPickActions({gameweekId,gameweekNumber,seasonLabel,profiles,fixtures,predictions,standings,prizePot,isAdmin}:Props){
  if(!gameweekNumber)return null;
  const profileById=new Map(profiles.filter(p=>p.active&&p.role!=="guest").map(p=>[p.id,p]));
  const fixtureById=new Map(fixtures.map(f=>[f.id,f]));
  const picks=predictions.map(pred=>{const profile=profileById.get(pred.member_id),fixture=fixtureById.get(pred.fixture_id);return profile&&fixture?{player:profile.display_name,homeTeam:fixture.home_team,awayTeam:fixture.away_team,competition:fixture.competition,kickoffAt:fixture.kickoff_at,odds:fixture.odds_deadline_fractional??fixture.odds_fractional,status:fixture.status,homeScore:fixture.home_score,awayScore:fixture.away_score,elapsed:fixture.live_elapsed??null}:null}).filter((row):row is NonNullable<typeof row>=>Boolean(row));
  return <div className={styles.strip} aria-label="Gameweek share and odds actions">
    <div className={`${styles.slot} ${styles.share}`}><WeeklyPicksShareButton label="Share picks" gameweekNumber={gameweekNumber} seasonLabel={seasonLabel} picks={picks}/></div>
    <div className={`${styles.slot} ${styles.share}`}><ShareTableButton compact label="Share table" rows={standings} seasonLabel={seasonLabel} gameweekNumber={gameweekNumber} prizePot={prizePot}/></div>
    <div className={`${styles.slot} ${styles.share}`}><CombinedShareButton label="Combined" gameweekNumber={gameweekNumber} seasonLabel={seasonLabel} picks={picks} standings={standings}/></div>
    {isAdmin&&gameweekId?<div className={`${styles.slot} ${styles.admin}`}><V2OddsRefreshButton gameweekId={gameweekId}/></div>:<div aria-hidden="true"/>}
  </div>;
}
