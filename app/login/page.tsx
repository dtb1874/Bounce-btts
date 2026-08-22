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
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password,
    });
    if (signInError) {
      setError("Username or password is incorrect.");
      setLoading(false);
      return;
    }
    window.location.href = "/";
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
