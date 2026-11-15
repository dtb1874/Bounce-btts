import type { AwardsSeasonSnapshot, AwardSnapshot } from "./contracts";
/** Pure, presentation-only sequence. Replaying never writes or re-finalises a season. */
export type CeremonyStep = { kind: "intro" } | { kind: "award"; awardIndex: number } | { kind: "champion" };
export function visibleAwards(snapshot: AwardsSeasonSnapshot): AwardSnapshot[] {
  return [...snapshot.awards].filter(a => a.isHeadline).sort((a,b) => a.sortOrder-b.sortOrder);
}
export function buildCeremonySteps(awardCount: number): CeremonyStep[] {
  return [{ kind:"intro" }, ...Array.from({length:awardCount},(_,awardIndex)=>({kind:"award" as const,awardIndex})), {kind:"champion"}];
}
export function canPublish(snapshot: AwardsSeasonSnapshot | null): snapshot is AwardsSeasonSnapshot {
  return Boolean(snapshot && snapshot.visibility !== "disabled" && snapshot.finalisedAt && snapshot.champion.memberId && snapshot.finalisationKey);
}
export function canPubliclyView(snapshot: AwardsSeasonSnapshot | null): snapshot is AwardsSeasonSnapshot {
  return canPublish(snapshot) && snapshot.visibility === "public";
}
export function seenKey(seasonId: string, memberId: string): string { return `${seasonId}:${memberId}`; }
export interface AwardsSeenStore {
  hasSeen(seasonId: string, memberId: string): Promise<boolean>;
  markSeen(seasonId: string, memberId: string): Promise<void>;
}
export function validateSnapshot(snapshot: AwardsSeasonSnapshot): string[] {
  const errors:string[]=[];
  if (!snapshot.seasonId || !snapshot.seasonLabel || !snapshot.finalisationKey) errors.push("Missing season snapshot identity");
  if (!snapshot.champion.memberId || !snapshot.champion.name || !Number.isFinite(snapshot.champion.points)) errors.push("Invalid champion");
  if (new Set(snapshot.awards.map(a=>a.awardKey)).size !== snapshot.awards.length) errors.push("Duplicate awards");
  if (snapshot.awards.some(a=>!a.artVariant || !a.title || !a.winnerName)) errors.push("Incomplete award snapshot");
  return errors;
}
