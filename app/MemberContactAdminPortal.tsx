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

type UserTarget = { slot: number; host: HTMLElement };

async function accessToken() {
  const { data } = await createClient().auth.getSession();
  return data.session?.access_token ?? "";
}

function findUserCardTargets() {
  if (typeof document === "undefined") return [] as UserTarget[];
  const buttons = Array.from(document.querySelectorAll("button"));
  const usersButton = buttons.find((button) => button.textContent?.trim() === "Users" && /active/i.test(button.className));
  if (!usersButton) return [] as UserTarget[];

  const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-slot]"));
  const targets: UserTarget[] = [];
  for (const card of cards) {
    const slot = Number(card.dataset.slot ?? "");
    if (!Number.isFinite(slot)) continue;
    card.style.position = "relative";
    let host = card.querySelector<HTMLElement>(":scope > [data-member-profile-host='true']");
    if (!host) {
      host = document.createElement("div");
      host.dataset.memberProfileHost = "true";
      host.style.gridColumn = "1 / -1";
      host.style.width = "100%";
      card.appendChild(host);
    }
    targets.push({ slot, host });
  }
  return targets;
}

export default function MemberContactAdminPortal() {
  const [targets, setTargets] = useState<UserTarget[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    const update = () => setTargets(findUserCardTargets());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!targets.length || users.length) return;
    void (async () => {
      try {
        const response = await fetch("/api/admin/users", { headers: { authorization: `Bearer ${await accessToken()}` } });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error ?? "Could not load member profiles.");
        const rows = (json.users ?? []) as UserRow[];
        setUsers(rows);
        setDrafts(Object.fromEntries(rows.map((row) => [row.id, row.mobile_number ?? ""])));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not load member profiles.";
        setMessages({ global: message });
      }
    })();
  }, [targets.length, users.length]);

  const usersBySlot = useMemo(() => new Map(users.map((user) => [Number(user.slot_number), user])), [users]);

  async function save(user: UserRow) {
    setSavingId(user.id);
    setMessages((current) => ({ ...current, [user.id]: "" }));
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role: user.role,
          active: user.active,
          password: "",
          mobileNumber: drafts[user.id] ?? "",
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Could not save mobile number.");
      const cleaned = (drafts[user.id] ?? "").trim().replace(/[\s()-]/g, "");
      setDrafts((current) => ({ ...current, [user.id]: cleaned }));
      setUsers((current) => current.map((row) => row.id === user.id ? { ...row, mobile_number: cleaned } : row));
      setMessages((current) => ({ ...current, [user.id]: "Saved." }));
    } catch (error) {
      setMessages((current) => ({ ...current, [user.id]: error instanceof Error ? error.message : "Could not save mobile number." }));
    } finally {
      setSavingId(null);
    }
  }

  return <>
    {messages.global && <div style={{ display: "none" }}>{messages.global}</div>}
    {targets.map(({ slot, host }) => {
      const user = usersBySlot.get(slot);
      if (!user) return null;
      const message = messages[user.id] ?? "";
      return createPortal(
        <details style={{ marginTop: 4 }}>
          <summary
            aria-label={`Open contact and profile details for ${user.display_name}`}
            title="Contact & profile"
            style={{
              position: "absolute",
              top: 12,
              right: 14,
              width: 40,
              height: 40,
              borderRadius: 10,
              border: "1px solid rgba(199,175,149,.38)",
              background: "rgba(20,14,18,.82)",
              color: "#f0cfaa",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              listStyle: "none",
              fontSize: 20,
              fontWeight: 900,
              zIndex: 4,
            }}
          >⌄</summary>
          <div style={{ marginTop: 10, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.08)", display: "grid", gap: 10 }}>
            <div>
              <strong style={{ display: "block", color: "#f0cfaa", fontSize: 11, letterSpacing: ".08em" }}>CONTACT & PROFILE</strong>
              <small style={{ color: "#9f938c" }}>Ultimate Admin only · private member details</small>
            </div>
            <label style={{ display: "grid", gap: 5, color: "#c9bbb2", fontSize: 11, fontWeight: 800 }}>
              MOBILE NUMBER
              <input
                type="tel"
                inputMode="tel"
                autoComplete="off"
                placeholder="+447700900123"
                value={drafts[user.id] ?? ""}
                onChange={(event) => setDrafts((current) => ({ ...current, [user.id]: event.target.value }))}
                style={{ width: "100%", boxSizing: "border-box", background: "#0c0e13", color: "#fff", border: "1px solid #4c3139", borderRadius: 8, padding: 10 }}
              />
            </label>
            <small style={{ color: "#938a84" }}>Use international format such as +44. Spaces and brackets are cleaned automatically.</small>
            <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                disabled={savingId === user.id}
                onClick={() => save(user)}
                style={{ border: "1px solid #93475c", borderRadius: 9, padding: "9px 12px", background: "linear-gradient(180deg,#7c263d,#641b31)", color: "#f2ede7", fontWeight: 800, cursor: "pointer" }}
              >{savingId === user.id ? "Saving…" : "Save contact details"}</button>
              {message && <span style={{ color: message === "Saved." ? "#9fd8b8" : "#ef9aa8", fontSize: 12 }}>{message}</span>}
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 9, border: "1px dashed rgba(199,175,149,.24)", color: "#8f8781", fontSize: 11 }}>
              Profile picture upload and crop controls will appear here in the next phase.
            </div>
          </div>
        </details>,
        host,
        `member-profile-${slot}`,
      );
    })}
  </>;
}
