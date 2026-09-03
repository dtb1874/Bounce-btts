export type ReleaseInfoEntry = {
  version: string;
  date: string;
  summary: string;
  changes: string[];
};

export const CURRENT_RELEASE = {
  version: "1.11.1",
  date: "3 Sep 2026",
} as const;

export const RELEASE_HISTORY_CATCHUP: ReleaseInfoEntry[] = [
  {
    version: "1.11.1",
    date: "3 Sep 2026",
    summary: "Member portraits across shares and mobile identity",
    changes: [
      "Used saved member portraits inline beside names across fixture, table, recap and reminder share images, with initials fallback",
      "Removed the generic portrait strip from the bottom of shared media so portraits only appear where a member is represented",
      "Added the signed-in member portrait or initials to the mobile burger-menu identity area",
      "Kept share calculations, scoring, fixture data and admin behaviour unchanged",
    ],
  },
  {
    version: "1.11.0",
    date: "3 Sep 2026",
    summary: "Release 4 · visual identity and prestige presentation",
    changes: [
      "Strengthened the Hearts/Edinburgh/St Giles visual identity across League History, League Stats, Make My Pick and Gameweek Recap",
      "Promoted the reigning champion into a premium dynamic plaque with Bounce Cup artwork and removed the redundant History share control",
      "Improved member portrait presentation and introduced a cutout-ready portrait mode without fake background removal",
      "Tidied the mobile Admin Users presentation and documented visual ownership in VISUAL-ARCHITECTURE.md",
    ],
  },
  {
    version: "1.10.0",
    date: "2 Sep 2026",
    summary: "Release 3 · member profiles and selection UX",
    changes: [
      "Added private Ultimate-Admin-managed member contact/profile data and member portrait upload/crop handling",
      "Integrated portraits into member/player presentation while preserving initials fallback",
      "Refined the mobile member navigation and selection experience without changing league scoring rules",
    ],
  },
  {
    version: "1.9.0",
    date: "2 Sep 2026",
    summary: "Release 2 · native iOS animated sharing",
    changes: [
      "Improved native iPhone/iPad animated file sharing and fallback behaviour",
      "Slowed animated race/sweep exports to roughly one second per gameweek with a longer final hold",
      "Validated the sharing path on physical iPhone and WhatsApp",
    ],
  },
  {
    version: "1.8.0",
    date: "2 Sep 2026",
    summary: "Release 1 · safer gameweek admin and stats",
    changes: [
      "Added guarded removal of future gameweeks while preserving later round data and numbering safely",
      "Expanded the Value Leader table and qualification detail",
      "Clarified UK local-time guidance for gameweek administration",
    ],
  },
  {
    version: "1.7.2",
    date: "29 Aug 2026",
    summary: "One-off and midweek gameweek controls",
    changes: [
      "Added true one-off gameweek insertion between scheduled rounds without replacing future gameweek IDs or data",
      "Added inclusive eligible kick-off From/To windows and API-Football support for those rules",
      "Exposed the one-off insertion controls directly inside the normal Admin → Gameweek workflow",
    ],
  },
  {
    version: "1.7.1",
    date: "27 Aug 2026",
    summary: "Gameweek Recap and current-season archive",
    changes: [
      "Added a settled Gameweek Recap beneath Everyone at a glance on the Dashboard",
      "Added a fixture-level current-season Gameweek Archive in League History",
      "Extended the combined table/fixtures share with recap information once the gameweek is fully settled",
      "Made Creature of Habit supporting detail expandable while keeping the headline team and pick count visible",
    ],
  },
  {
    version: "1.7.0",
    date: "22–27 Aug 2026",
    summary: "League race, sweep tracking and sharing reliability",
    changes: [
      "Added the League Position Race and Goals Away From The Sweep trackers with animated share exports",
      "Added selectable/interactive race sharing and short public race-share links",
      "Fixed pick reminders to create branded share images and added recent team form inside Make My Pick",
      "Made the Rousset Easter egg easier to discover while retaining its hidden behaviour and tracking",
      "Added deadline odds snapshots so Stats Centre historical odds stop changing after the gameweek deadline",
    ],
  },
];
