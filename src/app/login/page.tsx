"use client";

import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/config";
import { useState } from "react";

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (signUpError) throw signUpError;
        setMessage("Check your email to confirm the account, then sign in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        window.location.href = "/";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal">Bud</p>
      <h1 className="mt-2 text-3xl font-medium tracking-tight">
        See the money you’ll have, then the events that get you there.
      </h1>
      <p className="mt-3 text-muted">
        Sign in to save salaries, household budgets, and one-offs to your
        Supabase project.
      </p>

      {!configured ? (
        <div className="mt-8 rounded-xl border border-rule bg-surface p-5 text-sm">
          <p className="font-medium">Supabase isn’t configured yet.</p>
          <p className="mt-2 text-muted">
            Copy <span className="font-mono text-ink">.env.example</span> to{" "}
            <span className="font-mono text-ink">.env.local</span>, add your
            project URL and anon key, then run the SQL in{" "}
            <span className="font-mono text-ink">supabase/schema.sql</span>.
          </p>
          <a href="/" className="btn-solid mt-4 inline-flex">
            Open local preview
          </a>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-xl border border-rule bg-surface p-5">
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-muted">
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-muted">
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="field"
            />
          </label>
          {error ? (
            <p className="text-sm text-warn" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p className="text-sm text-teal-deep">{message}</p> : null}
          <button type="submit" className="btn-solid w-full" disabled={busy}>
            {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            className="w-full text-sm text-muted hover:text-ink"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </form>
      )}
    </main>
  );
}
