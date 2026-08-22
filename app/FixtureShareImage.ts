import { sortFixtureSharePicks } from "./shareFixtureSort";

export type FixtureSharePick = {
  player: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoffAt: string;
  odds: string | null;
  status?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  elapsed?: number | null;
};

export type FixtureShareStanding = {
  name: string;
  played: number;
  wins: number;
  oneSided: number;
  zeroZeroCount: number;
  points: number;
};

type PickState = "win" | "scoreNil" | "zeroZero" | "pending";
const liveStatuses=new Set(["1H","2H","ET","P","BT","INT"]);
const finishedStatuses=new Set(["FT","AET","PEN"]);

function roundedRect(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function scoreLabel(pick:FixtureSharePick){const status=pick.status??"";if(pick.homeScore==null||pick.awayScore==null)return "";if(liveStatuses.has(status))return `${pick.homeScore}–${pick.awayScore} · ${pick.elapsed!=null?`${pick.elapsed}′`:status}`;if(status==="HT")return `${pick.homeScore}–${pick.awayScore} · HT`;if(finishedStatuses.has(status))return `${pick.homeScore}–${pick.awayScore} · ${status}`;return `${pick.homeScore}–${pick.awayScore}`}
function pickState(pick:FixtureSharePick):{text:string;state:PickState}{const finished=finishedStatuses.has(pick.status??"");const home=pick.homeScore,away=pick.awayScore;if(home==null||away==null)return {text:"PENDING",state:"pending"};if(home===0&&away===0)return {text:finished?"0-0  -1":"0-0 LIVE",state:"zeroZero"};if(home>0&&away>0)return {text:finished?"WON  +3":"WINNING",state:"win"};return {text:finished?"SCORE-NIL  +1":"SCORE-NIL LIVE",state:"scoreNil"}}
function colours(state:PickState){if(state==="win")return {fill:"#1f7a45",stroke:"#67c58a",text:"#f2fff6"};if(state==="scoreNil")return {fill:"#8b5b16",stroke:"#d6a54c",text:"#fff6df"};if(state==="zeroZero")return {fill:"#7c2031",stroke:"#d05c72",text:"#fff1f4"};return {fill:"#41434a",stroke:"#747984",text:"#edf0f5"}}
function formatFixtureOddsDisplay(value:string|null|undefined){
  if(!value)return null;
  const match=value.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
  if(!match)return value;
  const numerator=Number(match[1]),denominator=Number(match[2]);
  if(!Number.isFinite(numerator)||!Number.isFinite(denominator)||denominator<=0)return value;
  return `${(numerator/denominator).toFixed(2)}/1`;
}
function combinedFractionalOdds(picks:FixtureSharePick[]){
  if(!picks.length)return null;
  let combinedDecimal=1;
  for(const pick of picks){
    const match=pick.odds?.trim().match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
    if(!match)return null;
    const numerator=Number(match[1]),denominator=Number(match[2]);
    if(!Number.isFinite(numerator)||!Number.isFinite(denominator)||denominator<=0)return null;
    combinedDecimal*=1+numerator/denominator;
  }
  const fractionalTotal=combinedDecimal-1;
  if(!Number.isFinite(fractionalTotal)||fractionalTotal<0)return null;
  return `${fractionalTotal.toFixed(2)}/1`;
}
function drawCombinedOddsFooter(ctx:CanvasRenderingContext2D,picks:FixtureSharePick[],y:number){
  const odds=combinedFractionalOdds(picks);
  ctx.fillStyle="#e6c376";
  ctx.font="800 22px Arial,sans-serif";
  ctx.textAlign="right";
  ctx.fillText(odds?`Combined BTTS odds  ${odds}`:"Combined BTTS odds unavailable · one or more selections has no fractional price",1130,y);
  ctx.textAlign="left";
}

function drawHeader(ctx:CanvasRenderingContext2D,width:number,seasonLabel:string,gameweekNumber:number,title:string){const bg=ctx.createLinearGradient(0,0,width,700);bg.addColorStop(0,"#090a0e");bg.addColorStop(.62,"#171116");bg.addColorStop(1,"#421524");ctx.fillStyle=bg;ctx.fillRect(0,0,width,700);ctx.fillStyle="rgba(122,34,55,.26)";ctx.beginPath();ctx.arc(1070,110,240,0,Math.PI*2);ctx.fill();ctx.fillStyle="#eadbc9";ctx.font="700 70px Georgia,serif";ctx.fillText("BOUNCE",70,92);ctx.fillStyle="#c8af94";ctx.font="600 27px Georgia,serif";ctx.fillText("BTTS LEAGUE",74,136);ctx.fillStyle="#a9917f";ctx.font="700 19px Arial,sans-serif";ctx.fillText(`SEASON ${seasonLabel}  •  GAMEWEEK ${gameweekNumber}`,74,181);ctx.fillStyle="#f0cfaa";ctx.font="800 27px Arial,sans-serif";ctx.textAlign="right";ctx.fillText(title,1130,135);ctx.textAlign="left";ctx.strokeStyle="#6b3442";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(70,212);ctx.lineTo(1130,212);ctx.stroke()}

export function drawFixtureRows(ctx:CanvasRenderingContext2D,picks:FixtureSharePick[],startY:number){const rows=sortFixtureSharePicks(picks);const rowHeight=112;rows.forEach((pick,index)=>{const y=startY+index*rowHeight;ctx.fillStyle=index%2?"rgba(255,255,255,.025)":"rgba(112,31,50,.22)";roundedRect(ctx,58,y+7,1084,rowHeight-14,12);ctx.fill();ctx.fillStyle="#eadfd4";ctx.font="800 25px Arial,sans-serif";ctx.fillText(pick.player.slice(0,24),82,y+42);ctx.fillStyle="#f4eee8";ctx.font="700 25px Arial,sans-serif";ctx.fillText(`${pick.homeTeam} v ${pick.awayTeam}`.slice(0,42),330,y+42);const live=scoreLabel(pick);ctx.fillStyle=live?"#f0cfaa":"#a9a09a";ctx.font=live?"800 19px Arial,sans-serif":"500 17px Arial,sans-serif";ctx.fillText(live||pick.competition.slice(0,42),330,y+74);ctx.fillStyle="#ad9b8d";ctx.font="600 17px Arial,sans-serif";const kickoff=new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/London",weekday:"short",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(pick.kickoffAt));ctx.fillText(kickoff,82,y+74);const outcome=pickState(pick),tone=colours(outcome.state);ctx.fillStyle=tone.fill;ctx.strokeStyle=tone.stroke;ctx.lineWidth=1.5;roundedRect(ctx,795,y+52,190,31,15);ctx.fill();ctx.stroke();ctx.fillStyle=tone.text;ctx.font="800 14px Arial,sans-serif";ctx.textAlign="center";ctx.fillText(outcome.text,890,y+73);ctx.textAlign="left";ctx.fillStyle="#c5ad96";ctx.font="700 17px Arial,sans-serif";ctx.fillText("BTTS",1010,y+32);ctx.fillStyle="#ffe0b9";ctx.font="800 29px Arial,sans-serif";ctx.fillText(formatFixtureOddsDisplay(pick.odds)??"—",1010,y+67)});return startY+Math.max(rows.length,1)*rowHeight}

function toFile(canvas:HTMLCanvasElement,name:string){return new Promise<File>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(new File([blob],name,{type:"image/jpeg"})):reject(new Error("Image creation failed.")),"image/jpeg",.94))}

export async function createFixtureShareImage(gameweekNumber:number,seasonLabel:string,picks:FixtureSharePick[]){const width=1200,headerHeight=245,footerHeight=130,rowHeight=112;const height=headerHeight+Math.max(picks.length,1)*rowHeight+footerHeight;const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Unable to create image.");drawHeader(ctx,width,seasonLabel,gameweekNumber,"SELECTED FIXTURES");ctx.fillStyle="#090a0e";ctx.fillRect(0,220,width,height-220);drawHeader(ctx,width,seasonLabel,gameweekNumber,"SELECTED FIXTURES");const end=drawFixtureRows(ctx,picks,headerHeight);if(!picks.length){ctx.fillStyle="#d2c7bd";ctx.font="600 25px Arial,sans-serif";ctx.fillText("No selections submitted yet.",70,headerHeight+65)}drawCombinedOddsFooter(ctx,picks,end+34);ctx.fillStyle="#908781";ctx.font="500 17px Arial,sans-serif";ctx.fillText("Live score and BTTS status reflect the latest in-app refresh.",70,end+68);return toFile(canvas,`bounce-btts-gw${gameweekNumber}-fixtures.jpg`)}

export async function createCombinedShareImage(gameweekNumber:number,seasonLabel:string,picks:FixtureSharePick[],standings:FixtureShareStanding[]){const width=1200,headerHeight=245,rowHeight=112,tableHead=78,tableRow=62,footer=108;const fixtureHeight=Math.max(picks.length,1)*rowHeight;const tableHeight=tableHead+Math.max(standings.length,1)*tableRow;const height=headerHeight+fixtureHeight+54+tableHeight+footer;const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Unable to create image.");const bg=ctx.createLinearGradient(0,0,width,height);bg.addColorStop(0,"#090a0e");bg.addColorStop(.62,"#171116");bg.addColorStop(1,"#421524");ctx.fillStyle=bg;ctx.fillRect(0,0,width,height);drawHeader(ctx,width,seasonLabel,gameweekNumber,"FIXTURES + TABLE");const fixtureEnd=drawFixtureRows(ctx,picks,headerHeight);const tableY=fixtureEnd+54;ctx.fillStyle="#f0cfaa";ctx.font="800 25px Arial,sans-serif";ctx.fillText("LEAGUE TABLE",70,tableY+30);ctx.strokeStyle="#6b3442";ctx.beginPath();ctx.moveTo(70,tableY+48);ctx.lineTo(1130,tableY+48);ctx.stroke();const cols=[82,160,690,785,875,975,1080];ctx.fillStyle="#a99e95";ctx.font="700 16px Arial,sans-serif";["POS","PLAYER","P","W","S-N","0-0","PTS"].forEach((label,i)=>ctx.fillText(label,cols[i],tableY+75));standings.forEach((row,index)=>{const y=tableY+tableHead+index*tableRow;if(index===0){ctx.fillStyle="rgba(103,31,48,.78)";roundedRect(ctx,60,y+4,1080,tableRow-8,10);ctx.fill()}else if(index%2){ctx.fillStyle="rgba(255,255,255,.025)";ctx.fillRect(60,y+4,1080,tableRow-8)}ctx.fillStyle=index===0?"#fff1df":"#eee8e0";ctx.font="700 21px Arial,sans-serif";ctx.fillText(String(index+1),cols[0],y+40);ctx.fillText(row.name.slice(0,34),cols[1],y+40);ctx.font="600 20px Arial,sans-serif";ctx.fillText(String(row.played),cols[2],y+40);ctx.fillText(String(row.wins),cols[3],y+40);ctx.fillText(String(row.oneSided),cols[4],y+40);ctx.fillText(String(row.zeroZeroCount),cols[5],y+40);ctx.fillStyle="#f0cfaa";ctx.font="800 23px Arial,sans-serif";ctx.fillText(String(row.points),cols[6],y+40)});const footerY=tableY+tableHeight;drawCombinedOddsFooter(ctx,picks,footerY+20);ctx.fillStyle="#908781";ctx.font="500 17px Arial,sans-serif";ctx.fillText("Fixtures above use the identical live/result styling as Share fixtures.",70,footerY+50);return toFile(canvas,`bounce-btts-gw${gameweekNumber}-fixtures-table.jpg`)}
