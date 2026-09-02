"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";

type UserRow = {
  id: string;
  display_name: string;
  username: string;
  role: "ultimate_admin" | "admin" | "member" | "guest";
  active: boolean;
  slot_number: number | null;
  mobile_number?: string;
};

async function accessToken() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

function findUsersAdminPanel() {
  if (typeof document === "undefined") return null;
  const buttons = Array.from(document.querySelectorAll("button"));
  const usersButton = buttons.find((button) => button.textContent?.trim() === "Users" && /active/i.test(button.className));
  if (!usersButton) return null;
  const heading = Array.from(document.querySelectorAll("h1,h2,h3")).find((node) => node.textContent?.trim() === "League Management");
  if (!heading) return null;
  const section = heading.closest("section");
  if (!section) return null;
  const panels = Array.from(section.querySelectorAll(":scope > div"));
  return (panels[panels.length - 1] ?? section) as HTMLElement;
}

function ensureContactHost(panel: HTMLElement) {
  const existing = panel.querySelector<HTMLElement>(":scope > [data-private-contact-host='true']");
  if (existing) return existing;

  const host = document.createElement("div");
  host.dataset.privateContactHost = "true";

  const firstUserCard = Array.from(panel.children).find((child) => /^USER\s+\d+\s*·/i.test((child.textContent ?? "").trim()));
  if (firstUserCard) panel.insertBefore(host, firstUserCard);
  else panel.appendChild(host);
  return host;
}

export default function MemberContactAdminPortal() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const update = () => {
      const panel = findUsersAdminPanel();
      if (!panel) {
        setTarget(null);
        return;
      }
      setTarget(ensureContactHost(panel));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!target || users.length) return;
    void (async () => {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/users", { headers: { authorization: `Bearer ${await accessToken()}` } });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Could not load member contacts.");
        const rows = (json.users ?? []) as UserRow[];
        setUsers(rows);
        const first = rows.find((row) => row.active) ?? rows[0];
        if (first) {
          setSelectedId(first.id);
          setMobile(first.mobile_number ?? "");
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load member contacts.");
      } finally {
        setLoading(false);
      }
    })();
  }, [target, users.length]);

  const selected = useMemo(() => users.find((user) => user.id === selectedId) ?? null, [users, selectedId]);

  async function save() {
    if (!selected) return;
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({
          id: selected.id,
          username: selected.username,
          displayName: selected.display_name,
          role: selected.role,
          active: selected.active,
          password: "",
          mobileNumber: mobile,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not save mobile number.");
      const cleaned = mobile.trim().replace(/[\s()-]/g, "");
      setUsers((current) => current.map((user) => user.id === selected.id ? { ...user, mobile_number: cleaned } : user));
      setMobile(cleaned);
      setMessage("Private mobile number saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save mobile number.");
    } finally {
      setLoading(false);
    }
  }

  if (!target) return null;

  return createPortal(
    <details style={{ margin: "14px 0 18px", border: "1px solid rgba(112,66,77,.42)", borderRadius: 14, background: "linear-gradient(145deg,rgba(24,18,23,.98),rgba(12,13,17,.98))", position: "relative", zIndex: 3, overflow: "hidden" }}>
      <summary style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 16px", cursor: "pointer", listStyle: "none", userSelect: "none" }}>
        <div>
          <strong style={{ display: "block", color: "#f0cfaa", letterSpacing: ".08em", fontSize: 11 }}>MEMBER CONTACT & PROFILE</strong>
          <span style={{ display: "block", color: "#aaa09a", fontSize: 12, marginTop: 4 }}>Private contact details and profile picture controls</span>
        </div>
        <span aria-hidden="true" style={{ color: "#d6b793", fontSize: 18, fontWeight: 900 }}>＋</span>
      </summary>
      <div style={{ borderTop: "1px solid rgba(112,66,77,.35)", padding: 16 }}>
        <small style={{ display: "block", color: "#938a84", marginBottom: 12 }}>Ultimate Admin only. Mobile numbers are not exposed in member or public profile data. Profile picture controls will live in this same section.</small>
        {loading && !users.length ? <div style={{ color: "#b9ada6", fontSize: 12 }}>Loading contacts…</div> : (
          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 5, color: "#c9bbb2", fontSize: 11, fontWeight: 800 }}>
              MEMBER
              <select
                value={selectedId}
                onChange={(event) => {
                  const next = users.find((user) => user.id === event.target.value);
                  setSelectedId(event.target.value);
                  setMobile(next?.mobile_number ?? "");
                  setMessage("");
                }}
                style={{ width: "100%", boxSizing: "border-box", background: "#0c0e13", color: "#fff", border: "1px solid #4c3139", borderRadius: 8, padding: 10 }}
              >
                {users.map((user) => <option key={user.id} value={user.id}>{user.display_name}{user.active ? "" : " · inactive"}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 5, color: "#c9bbb2", fontSize: 11, fontWeight: 800 }}>
              MOBILE NUMBER
              <input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+447700900123"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                style={{ width: "100%", boxSizing: "border-box", background: "#0c0e13", color: "#fff", border: "1px solid #4c3139", borderRadius: 8, padding: 10 }}
              />
            </label>
            <small style={{ color: "#938a84" }}>Use international format such as +44. Spaces and brackets are cleaned automatically. Leave blank to clear.</small>
            <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
              <button type="button" disabled={!selected || loading} onClick={save} style={{ border: "1px solid #93475c", borderRadius: 9, padding: "9px 12px", background: "linear-gradient(180deg,#7c263d,#641b31)", color: "#f2ede7", fontWeight: 800, cursor: "pointer" }}>{loading ? "Saving…" : "Save private mobile"}</button>
              {message && <span style={{ color: message.includes("saved") ? "#9fd8b8" : "#ef9aa8", fontSize: 12 }}>{message}</span>}
            </div>
          </div>
        )}
      </div>
    </details>,
    target,
  );
}
