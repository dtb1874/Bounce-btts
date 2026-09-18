export type AwardsVisibility = "disabled" | "members" | "public";

export type AwardSupportingValue = string | number | boolean | null;

export type AwardSnapshot = {
  awardKey: string;
  title: string;
  winnerMemberId: string | null;
  winnerName: string;
  supportingValues: Record<string, AwardSupportingValue>;
  artVariant: string;
  isHeadline: boolean;
  sortOrder: number;
};

export type ChampionSnapshot = {
  memberId: string;
  name: string;
  points: number;
  portraitPath: string | null;
  supportingValues: Record<string, AwardSupportingValue>;
};

export type FinalStandingSnapshot = {
  memberId: string;
  name: string;
  position: number;
  played: number;
  points: number;
};

export type AwardsSeasonSnapshot = {
  schemaVersion: number;
  seasonId: string;
  seasonLabel: string;
  finalisedAt: string;
  finalisationKey: string;
  visibility: AwardsVisibility;
  champion: ChampionSnapshot;
  awards: AwardSnapshot[];
  finalStandings: FinalStandingSnapshot[];
};

export type AwardsSeasonConfig = {
  seasonId: string;
  visibility: AwardsVisibility;
  headlineAwardKeys: string[];
};

export type AwardsSeenState = {
  seasonId: string;
  memberId: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type SeasonFinalisationInput = {
  seasonId: string;
  requestedByMemberId: string;
  expectedSchemaVersion: number;
};

export type SeasonFinalisationResult = {
  status: "created" | "already_finalised";
  snapshot: AwardsSeasonSnapshot;
};
