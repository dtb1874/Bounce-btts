"use client";

import { FormEvent, useState } from "react";

type Credential = { username: string; displayName: string; password: string; role: string };

export default function SetupPage() {
  const [password, setPassword] = useState("bounce01");
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user1Password: password }),
    });
    const payload = await response.json();
    if (!response.ok) {
      setError(payload.error ?? "Setup failed");
      setLoading(false);
      return;
    }
    setCredentials(payload.credentials);
    setLoading(false);
  }

  async function copyAll() {
    const text = credentials.map((item) => `${item.displayName}: ${item.username} / ${item.password}`).join("\n");
    await navigator.clipboard.writeText(text);
  }

  return (
    <main className="authPage">
      <section className="authCard setupCard">
        <img src="/assets/hearts-crest.png" alt="Heart of Midlothian crest" className="authCrest" />
        <p className="authEyebrow">ONE-TIME LEAGUE SETUP</p>
        <h1>BOUNCE</h1><h2>BTTS LEAGUE</h2>
        {!credentials.length ? (
          <form onSubmit={submit}>
            <p className="authIntro">This creates user1–user12, assigns the current players and opens Gameweek 1. This page permanently closes after setup.</p>
            <label>Password for user1 / DTB<input value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>
            {error && <div className="formError">{error}</div>}
            <button className="primaryButton" disabled={loading}>{loading ? "Creating league…" : "Create league accounts"}</button>
          </form>
        ) : (
          <div className="setupResults">
            <h3>Accounts created</h3>
            <p>Save or copy these details. They remain available to admins later under Admin → Users.</p>
            <div className="credentialList">
              {credentials.map((item) => <div key={item.username}><strong>{item.displayName}</strong><span>{item.username}</span><code>{item.password}</code></div>)}
            </div>
            <button className="primaryButton" onClick={copyAll}>Copy all login details</button>
            <a className="secondaryButton" href="/login">Continue to login</a>
          </div>
        )}
      </section>
    </main>
  );
}
