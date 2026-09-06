export type NavGroup = "quick" | "more";

export type AuthenticatedNavItem = {
  id: "dashboard" | "pick" | "fixtures" | "table" | "results" | "history" | "players" | "about" | "alerts" | "admin";
  label: string;
  icon: string;
  adminOnly?: boolean;
  group: NavGroup;
  helper?: string;
};

/**
 * Canonical authenticated navigation contract.
 *
 * Keep presentation names here rather than duplicating them between the real app
 * and preview harness. CI asserts the primary and secondary labels separately so
 * a route's internal name cannot silently replace the user-facing product name.
 */
export const authenticatedNavItems: AuthenticatedNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "⌂", group: "quick" },
  { id: "pick", label: "Make My Pick", icon: "⚑", group: "quick" },
  { id: "fixtures", label: "Fixtures", icon: "▦", group: "more" },
  { id: "table", label: "Stat Centre", icon: "☷", group: "quick", helper: "League Table" },
  { id: "results", label: "Results", icon: "✦", group: "quick", helper: "All picks" },
  { id: "history", label: "League History", icon: "◷", group: "more" },
  { id: "players", label: "Players", icon: "◉", group: "more" },
  { id: "about", label: "About", icon: "?", group: "more" },
  { id: "alerts", label: "Alerts", icon: "!", adminOnly: true, group: "more" },
  { id: "admin", label: "Admin", icon: "⚙", adminOnly: true, group: "more" },
];
