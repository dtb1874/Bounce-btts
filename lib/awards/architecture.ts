import type { AwardsSeasonConfig, AwardsSeasonSnapshot } from "./contracts";

export const AWARDS_SCHEMA_VERSION = 1;

export const AWARDS_ROUTE_OWNER = {
  archive: "/awards/[season]",
  show: "/awards/[season]/show",
} as const;

export const AWARDS_STORAGE_OWNER = {
  seasonConfig: "awards_season_config",
  seasonSnapshot: "awards_season_snapshots",
  seenState: "awards_seen_state",
} as const;

export function awardsVisibleToMembers(config: AwardsSeasonConfig | null | undefined) {
  return Boolean(config && config.visibility !== "disabled");
}

export function awardsVisibleToPublic(config: AwardsSeasonConfig | null | undefined) {
  return config?.visibility === "public";
}

export function isCompatibleAwardsSnapshot(snapshot: AwardsSeasonSnapshot) {
  return snapshot.schemaVersion === AWARDS_SCHEMA_VERSION;
}

export function buildFinalisationKey(seasonId: string, schemaVersion = AWARDS_SCHEMA_VERSION) {
  return `${seasonId}:awards-v${schemaVersion}`;
}

/*
 * The live End Season mutation is deliberately NOT implemented here.
 * When activated later it must be Ultimate-Admin-only, transactional where
 * practical and idempotent against buildFinalisationKey(). Presentation and
 * replay routes must only read the persisted snapshot and must never trigger
 * finalisation themselves.
 */
