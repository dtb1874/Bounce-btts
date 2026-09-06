import type { ReactNode } from "react";
import styles from "../release.module.css";
import SidebarMemberPortrait from "./SidebarMemberPortrait";

type NavItem = {
  id: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
};

type AuthenticatedShellFrameProps = {
  children: ReactNode;
  navItems: NavItem[];
  activeView: string;
  isAdmin: boolean;
  alertsCount: number;
  mobileMenuOpen: boolean;
  profileName: string;
  profileMeta: string;
  profileInitials: string;
  onOpenMenu: () => void;
  onCloseMenu: () => void;
  onNavigate: (id: string) => void;
  onEasterEgg: () => void;
  onSignOut: () => void;
};

/**
 * Phase-3 shell candidate.
 *
 * This deliberately reproduces the current LeagueApp shell structure and class
 * ownership rather than introducing new presentation. It stays opt-in until the
 * shell checkpoint is device-tested; the existing LeagueApp markup remains the
 * production owner in the meantime.
 */
export default function AuthenticatedShellFrame({
  children,
  navItems,
  activeView,
  isAdmin,
  alertsCount,
  mobileMenuOpen,
  profileName,
  profileMeta,
  profileInitials,
  onOpenMenu,
  onCloseMenu,
  onNavigate,
  onEasterEgg,
  onSignOut,
}: AuthenticatedShellFrameProps) {
  return (
    <main className={styles.shell}>
      {!mobileMenuOpen && (
        <button
          type="button"
          className={`${styles.mobileMenu} mobileDashboardMenu`}
          aria-label="Open menu"
          onClick={onOpenMenu}
        >
          ☰
        </button>
      )}

      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.open : ""}`}>
        <div className={styles.brand}>
          <img src="/assets/hearts-crest.png?v=gold-crest-20260817-1945" alt="" />
          <div>
            <strong>BOUNCE</strong>
            <span>BTTS LEAGUE</span>
            <small>EST 2024</small>
          </div>
        </div>

        <SidebarMemberPortrait displayName={profileName} />

        <nav className={styles.nav} aria-label="League navigation">
          {navItems.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <button
              type="button"
              key={item.id}
              className={activeView === item.id ? styles.active : ""}
              aria-current={activeView === item.id ? "page" : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span>{item.icon} </span>
              {item.label}
              {item.id === "alerts" && alertsCount > 0 ? (
                <b className={styles.badge}>{alertsCount > 9 ? "9+" : alertsCount}</b>
              ) : null}
            </button>
          ))}
        </nav>

        <button type="button" className={styles.sidebarEgg} aria-label=" " onClick={onEasterEgg} />

        <button type="button" className={styles.profile} onClick={onSignOut}>
          <span>{profileInitials}</span>
          <span>
            <strong>{profileName}</strong>
            <small>{profileMeta}</small>
          </span>
          <b>↪</b>
        </button>
      </aside>

      {mobileMenuOpen ? (
        <button type="button" className={styles.scrim} aria-label="Close menu" onClick={onCloseMenu} />
      ) : null}

      <section className={styles.main}>{children}</section>
    </main>
  );
}
