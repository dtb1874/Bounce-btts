"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/auth";

export default function LoginPage() {
  const [username, setUsername] = useState("user1");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();
      // A failed or stalled auth request must not permanently disable the form,
      // especially on iOS Chrome when moving between protected Vercel previews.
      const signIn = supabase.auth.signInWithPassword({
        email: usernameToEmail(username.trim()),
        password,
      });
      const outcome = await Promise.race([
        signIn,
        new Promise<{ error: Error }>((resolve) =>
          window.setTimeout(() => resolve({ error: new Error("timeout") }), 15000)
        ),
      ]);
      if (outcome.error) {
        setError(outcome.error.message === "timeout"
          ? "Sign-in is taking too long. Check your connection and try again."
          : "Sign-in unsuccessful. Check your username and password.");
        return;
      }
      // Only the V2 preview may be used as a return path; never accept external URLs.
      const requested = new URLSearchParams(window.location.search).get("next");
      window.location.replace(requested === "/v2-preview" ? "/v2-preview" : "/");
    } catch {
      setError("Could not complete sign-in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="authPage">
      <section className="authCard">
        <img src="/assets/hearts-crest.png?v=gold-crest-20260817-1945" alt="Heart of Midlothian crest" className="authCrest" />
        <p className="authEyebrow">EST 2024 · SEASON 2026/27</p>
        <h1>BOUNCE</h1>
        <h2>BTTS LEAGUE</h2>
        <p className="authIntro">Sign in with the username and password supplied by the league admin.</p>
        <form onSubmit={submit}>
          <label>Username<input autoCapitalize="none" autoCorrect="off" value={username} onChange={(e) => setUsername(e.target.value)} required /></label>
          <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <div className="formError">{error}</div>}
          <button className="primaryButton" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</button>
        </form>
        <a className="publicLink" href="/table">View the public league table</a>
        <small className="authFooter">MADE BY THE ARTIST, FOR THE BOUNCE</small>
      </section>
    </main>
  );
}
