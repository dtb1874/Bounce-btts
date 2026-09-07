"use client";

import { useState } from "react";
import AuthenticatedShellFrame from "../ui/AuthenticatedShellFrame";
import { authenticatedNavItems } from "../ui/navigation";
import styles from "../release.module.css";

export default function PreviewClient() {
  const [view, setView] = useState("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [admin, setAdmin] = useState(false);

  return (
    <AuthenticatedShellFrame
      navItems={authenticatedNavItems}
      activeView={view}
      isAdmin={admin}
      alertsCount={3}
      mobileMenuOpen={mobileMenu}
      profileName="Preview Member"
      profileMeta={admin ? "Ultimate Admin" : "preview-member"}
      profileInitials="PM"
      onOpenMenu={() => setMobileMenu(true)}
      onCloseMenu={() => setMobileMenu(false)}
      onNavigate={(id) => { setView(id); setMobileMenu(false); }}
      onEasterEgg={() => undefined}
      onSignOut={() => undefined}
      afterContent={<div hidden data-ui-foundation-shell-layer="after-content" />}
    >
      <div className={styles.content}>
        <div className={styles.page}>
          <div className={styles.heading}>
            <div>
              <span>UI FOUNDATION CHECKPOINT</span>
              <h2>Shell / navigation</h2>
              <p>Preview-only harness. This route is disabled in production.</p>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.title}>CURRENT VIEW</div>
            <p>{view}</p>
            <div className={styles.buttonRow}>
              <button type="button" className={styles.button} onClick={() => setAdmin((value) => !value)}>
                {admin ? "Show member nav" : "Show admin nav"}
              </button>
              <button type="button" className={styles.button} onClick={() => setMobileMenu(true)}>
                Open drawer
              </button>
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.title}>VALIDATION TARGETS</div>
            <p>Confirm sidebar width, drawer/scrim behaviour, semantic Quick Access/More grouping, canonical labels, profile position and member/admin visibility without changing league data or actions.</p>
          </div>
        </div>
      </div>
    </AuthenticatedShellFrame>
  );
}
