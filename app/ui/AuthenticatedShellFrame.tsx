"use client";

import type { ReactNode } from "react";
import SidebarMemberPortrait from "./SidebarMemberPortrait";
import { authenticatedNavItems, type AuthenticatedNavItem } from "./navigation";

type NavItem = Omit<AuthenticatedNavItem, "id"> & { id: string };

type AuthenticatedShellFrameProps = {
  children: ReactNode;
  afterContent?: ReactNode;
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
 * Bounce 2.0 authenticated shell.
 *
 * The shell owns navigation and responsive interaction only. Page data, scoring,
 * gameweek behaviour and feature rendering remain owned by their existing
 * canonical application layers while each V2 surface is migrated.
 */
export default function AuthenticatedShellFrame({
  children,
  afterContent,
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
  const canonicalById = new Map<string, AuthenticatedNavItem>(authenticatedNavItems.map((item) => [item.id, item]));
  const visibleNavItems = navItems
    .map((item) => canonicalById.get(item.id) ?? item)
    .filter((item) => !item.adminOnly || isAdmin);

  const primaryItems = visibleNavItems.filter((item) => item.group === "quick");
  const exploreItems = visibleNavItems.filter((item) => item.group === "more" && !item.adminOnly);
  const adminItems = visibleNavItems.filter((item) => item.adminOnly);
  const activeItem = visibleNavItems.find((item) => item.id === activeView);

  function NavButton({ item, compact = false }: { item: NavItem; compact?: boolean }) {
    const active = activeView === item.id;
    return (
      <button
        type="button"
        className={`uiFoundationNavItem uiFoundationNavItem-${item.group ?? "more"} uiFoundationNavItem-${item.id} v2NavItem${active ? " v2NavItemActive" : ""}${compact ? " v2NavItemCompact" : ""}`}
        data-nav-id={item.id}
        data-nav-group={item.group ?? "more"}
        aria-current={active ? "page" : undefined}
        onClick={() => onNavigate(item.id)}
      >
        <span className="v2NavIcon" aria-hidden="true">{item.icon}</span>
        <span className="v2NavText">
          <span className="uiFoundationNavLabel">{item.label}</span>
          {!compact && item.helper ? <small className="uiFoundationNavHelper v2NavHelper">{item.helper}</small> : null}
        </span>
        {item.id === "alerts" && alertsCount > 0 ? (
          <b className="v2NavBadge">{alertsCount > 9 ? "9+" : alertsCount}</b>
        ) : null}
      </button>
    );
  }

  return (
    <main className="uiFoundationShell v2ShellFrame" data-ui-foundation-shell="declarative" data-v2-shell="true">
      <header
        className="v2MobileTopbar"
        style={{
          background: "linear-gradient(90deg, rgba(28,20,24,.99), rgba(38,16,25,.99) 54%, rgba(28,19,23,.99))",
          borderBottomColor: "rgba(214,182,111,.12)",
          boxShadow: "0 7px 18px rgba(25,8,15,.12)",
        }}
      >
        <button
          type="button"
          className="uiFoundationMobileMenu v2MobileMenuButton"
          aria-label="Open navigation"
          onClick={onOpenMenu}
          style={{
            width: 48,
            height: 48,
            background: "rgba(255,255,255,.05)",
            border: "1px solid rgba(214,182,111,.08)",
            fontSize: "1.28rem",
          }}
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div
          className="v2MobileBrand"
          aria-label="Bounce BTTS League"
          style={{ gap: 8, paddingRight: 11, borderRightColor: "rgba(214,182,111,.14)" }}
        >
          <img
            src="/assets/hearts-crest.png?v=gold-crest-20260817-1945"
            alt=""
            style={{ width: 38, height: 40, filter: "drop-shadow(0 4px 9px rgba(0,0,0,.32))" }}
          />
          <span>BOUNCE</span>
        </div>
        <div className="v2MobileContext">
          <small>Current view</small>
          <strong>{activeItem?.label ?? "Bounce"}</strong>
        </div>
      </header>

      <aside className={`uiFoundationSidebar v2Sidebar ${mobileMenuOpen ? "uiFoundationSidebarOpen v2SidebarOpen" : ""}`} aria-label="Bounce navigation">
        <div className="v2SidebarBrand">
          <img src="/assets/hearts-crest.png?v=gold-crest-20260817-1945" alt="" />
          <div>
            <strong>BOUNCE</strong>
            <span>BTTS LEAGUE</span>
            <small>EST 2024</small>
          </div>
          <button type="button" className="v2SidebarClose" aria-label="Close navigation" onClick={onCloseMenu}>×</button>
        </div>

        <div className="v2MemberIdentity">
          <SidebarMemberPortrait displayName={profileName} />
          <div>
            <strong>{profileName}</strong>
            <span>{profileMeta}</span>
          </div>
        </div>

        <nav className="uiFoundationNav v2Nav" aria-label="League navigation">
          <div className="v2NavSection">
            <span className="uiFoundationNavGroup uiFoundationNavGroupQuick v2NavSectionLabel">LEAGUE</span>
            {primaryItems.map((item) => <NavButton item={item} key={item.id} />)}
          </div>

          <div className="v2NavSection v2NavSectionExplore">
            <span className="uiFoundationNavGroup uiFoundationNavGroupMore v2NavSectionLabel">EXPLORE</span>
            {exploreItems.map((item) => <NavButton item={item} key={item.id} />)}
          </div>

          {adminItems.length ? (
            <div className="v2NavSection v2NavSectionAdmin">
              <span className="v2NavSectionLabel">MANAGE</span>
              {adminItems.map((item) => <NavButton item={item} key={item.id} />)}
            </div>
          ) : null}
        </nav>

        <button type="button" className="uiFoundationSidebarEgg v2SidebarEgg" aria-label=" " onClick={onEasterEgg} />

        <button type="button" className="v2SignOut" onClick={onSignOut}>
          <span className="v2SignOutInitials">{profileInitials}</span>
          <span className="v2SignOutCopy"><strong>Sign out</strong><small>{profileName}</small></span>
          <span aria-hidden="true">↪</span>
        </button>
      </aside>

      {mobileMenuOpen ? (
        <button type="button" className="uiFoundationScrim v2Scrim" aria-label="Close navigation" onClick={onCloseMenu} />
      ) : null}

      <section className="uiFoundationMain v2Main">{children}</section>

      <nav className="v2BottomNav" aria-label="Primary navigation">
        {primaryItems.map((item) => <NavButton item={item} compact key={item.id} />)}
        <button type="button" className={`v2NavItem v2NavItemCompact v2MoreButton${mobileMenuOpen ? " v2NavItemActive" : ""}`} onClick={onOpenMenu} aria-label="Open more navigation">
          <span className="v2NavIcon" aria-hidden="true">•••</span>
          <span className="v2NavText"><span className="uiFoundationNavLabel">More</span></span>
        </button>
      </nav>

      {afterContent}
    </main>
  );
}
