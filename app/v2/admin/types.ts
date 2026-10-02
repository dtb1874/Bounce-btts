export type Gameweek = {
  id: string;
  number: number;
  status: "open" | "locked" | "complete";
  opens_at: string | null;
  locks_at: string;
  selection_rule_mode?: "exact_time" | "any_kickoff" | null;
  selection_weekday?: number | null;
  selection_time?: string | null;
  selection_times?: string[] | null;
  selection_time_from?: string | null;
  selection_time_to?: string | null;
  one_off_rule?: boolean | null;
};

export type Profile = { id: string; display_name: string; active: boolean; role: string; slot_number?: number | null };
export type Fixture = {
  id: string;
  gameweek_id?: string | null;
  status: string;
  is_eligible: boolean;
  kickoff_at: string;
  home_team?: string;
  away_team?: string;
  competition?: string;
  country?: string;
  home_score?: number | null;
  away_score?: number | null;
  odds_fractional?: string | null;
};
export type Prediction = { id: string; gameweek_id?: string; member_id: string; fixture_id?: string; points_awarded?: number | null };
export type ScoreAdjustment = { id: string; gameweek_id: string; member_id: string; points: number; reason: string; source: "automatic" | "admin" };
export type FixtureState = "loading" | "ready" | "error";
export type AdminTab = "overview" | "gameweek" | "selections" | "members" | "fixtures" | "results" | "seasons" | "advanced";

export type AdminProps = {
  seasonLabel: string;
  gameweek: Gameweek | null;
  gameweeks: Gameweek[];
  profiles: Profile[];
  fixtures: Fixture[];
  predictions: Prediction[];
  adjustments: ScoreAdjustment[];
  alertsCount: number;
  fixtureState?: FixtureState;
  entryFee: number;
  isUltimate: boolean;
  onChanged: () => void | Promise<void>;
  onReloadAll: () => void;
  onEmulate?: (profileId: string) => void;
  onAlertsChanged?: () => void | Promise<void>;
};

export type UserRow = {
  id: string;
  username: string;
  display_name: string;
  role: "ultimate_admin" | "admin" | "member" | "guest";
  active: boolean;
  slot_number: number | null;
  password?: string;
  mobile_number?: string;
  rousset_count?: number;
};
