"use client";

import { addMonths, startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { EventDrawer } from "@/components/event-drawer";
import { EventTable } from "@/components/event-table";
import { ForecastChart } from "@/components/forecast-chart";
import { buildForecast } from "@/lib/forecast";
import * as remote from "@/lib/supabase/data";
import {
  CATEGORY_COLORS,
  formatMoney,
  type BudgetEvent,
  type Category,
  type CategoryDraft,
  type EventDraft,
  type Profile,
} from "@/lib/types";

type Filter = "all" | "in" | "out" | "recurring" | "one_off";

type Props = {
  email: string | null;
};

export function Dashboard({ email }: Props) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<BudgetEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetEvent | null>(null);
  const [balanceDraft, setBalanceDraft] = useState("");

  useEffect(() => {
    let cancelled = false;

    remote
      .fetchHousehold()
      .then((snap) => {
        if (cancelled) return;
        setProfile(snap.profile);
        setEvents(snap.events);
        setCategories(snap.categories);
        setBalanceDraft(String(snap.profile.startingBalance));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load your ledger.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const forecast = useMemo(() => {
    if (!profile) {
      return null;
    }
    const from = startOfDay(new Date());
    const to = addMonths(from, profile.horizonMonths);
    return buildForecast(events, profile.startingBalance, from, to);
  }, [events, profile]);

  async function persistProfile(next: Profile) {
    const previous = profile;
    setProfile(next);
    try {
      await remote.saveProfile(next);
    } catch (err) {
      if (previous) setProfile(previous);
      setError(err instanceof Error ? err.message : "Could not save settings.");
    }
  }

  async function handleSave(draft: EventDraft) {
    if (!profile) return;
    const saved = await remote.upsertEvent(draft, profile.id);
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === saved.id);
      return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
    });
  }

  async function handleDelete(id: string) {
    await remote.deleteEvent(id);
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function persistCategory(draft: CategoryDraft): Promise<Category> {
    if (!profile) throw new Error("Not signed in");
    const saved = await remote.upsertCategory(draft, profile.id);
    setCategories((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists
        ? prev.map((c) => (c.id === saved.id ? saved : c))
        : [...prev, saved];
    });
    return saved;
  }

  async function handleSaveCategory(draft: CategoryDraft) {
    try {
      await persistCategory(draft);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that category.");
      throw err;
    }
  }

  async function handleCreateCategory(name: string): Promise<Category> {
    const trimmed = name.trim();
    const existing = categories.find(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;
    const nextPosition = categories.reduce((max, c) => Math.max(max, c.position), -1) + 1;
    const color =
      CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length] ?? CATEGORY_COLORS[0];
    return persistCategory({ name: trimmed, color, position: nextPosition });
  }

  async function handleSignOut() {
    await remote.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-muted">
        Loading your forecast…
      </main>
    );
  }

  if (!profile || !forecast) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-medium">Couldn’t load Bud</h1>
        <p className="mt-2 text-muted">{error ?? "Unknown error."}</p>
      </main>
    );
  }

  const endTone =
    forecast.endBalance < 0
      ? "text-copper"
      : forecast.endBalance >= forecast.startBalance
        ? "text-teal-deep"
        : "text-ink";

  return (
    <div className="min-h-full">
      <header className="border-b border-rule/80 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-none items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-baseline gap-3">
            <p className="text-lg font-semibold tracking-tight">Bud</p>
            <p className="hidden text-sm text-muted sm:block">
              Household cash over time
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="max-w-45 truncate text-muted">{email}</span>
            <button type="button" className="btn-ghost py-1.5" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        {error ? (
          <p className="rounded-md border border-copper/40 bg-surface px-3 py-2 text-sm text-warn">
            {error}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-xl border border-rule bg-surface">
          <div className="flex flex-col gap-4 border-b border-rule px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
                Projected cash
              </p>
              <p className={`mt-1 font-mono text-4xl font-medium tracking-tight ${endTone}`}>
                {formatMoney(forecast.endBalance, profile.currency)}
              </p>
              <p className="mt-1 text-sm text-muted">
                from {formatMoney(forecast.startBalance, profile.currency)} today,
                through the next {profile.horizonMonths} months
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-muted">
                  Cash on hand today
                </span>
                <input
                  type="number"
                  step="0.01"
                  value={balanceDraft}
                  onChange={(e) => setBalanceDraft(e.target.value)}
                  onBlur={() => {
                    const value = Number(balanceDraft);
                    if (Number.isFinite(value)) {
                      void persistProfile({ ...profile, startingBalance: value });
                    } else {
                      setBalanceDraft(String(profile.startingBalance));
                    }
                  }}
                  className="field w-40 font-mono"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-muted">
                  Horizon
                </span>
                <select
                  value={profile.horizonMonths}
                  onChange={(e) =>
                    void persistProfile({
                      ...profile,
                      horizonMonths: Number(e.target.value),
                    })
                  }
                  className="field w-32"
                >
                  <option value={6}>6 months</option>
                  <option value={12}>12 months</option>
                  <option value={24}>24 months</option>
                  <option value={36}>36 months</option>
                </select>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-rule border-b border-rule text-sm">
            <Stat
              label="Coming in"
              value={formatMoney(forecast.totalIn, profile.currency, { sign: true })}
              tone="in"
            />
            <Stat
              label="Going out"
              value={formatMoney(-forecast.totalOut, profile.currency, { sign: true })}
              tone="out"
            />
            <Stat
              label="Low point"
              value={formatMoney(forecast.minBalance, profile.currency)}
              tone={forecast.minBalance < 0 ? "out" : "neutral"}
            />
          </div>

          <div className="px-2 pb-2 pt-1 sm:px-3">
            <ForecastChart forecast={forecast} currency={profile.currency} />
          </div>
        </section>

        <EventTable
          events={events}
          categories={categories}
          forecast={forecast}
          currency={profile.currency}
          filter={filter}
          onFilter={setFilter}
          onAdd={() => {
            setEditing(null);
            setDrawerOpen(true);
          }}
          onEdit={(event) => {
            setEditing(event);
            setDrawerOpen(true);
          }}
          onSaveCategory={handleSaveCategory}
        />
      </main>

      {drawerOpen ? (
        <EventDrawer
          open
          event={editing}
          categories={categories}
          onClose={() => setDrawerOpen(false)}
          onSave={handleSave}
          onCreateCategory={handleCreateCategory}
          onDelete={handleDelete}
        />
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "in" | "out" | "neutral";
}) {
  const color =
    tone === "in" ? "text-teal-deep" : tone === "out" ? "text-copper" : "text-ink";
  return (
    <div className="px-4 py-3 sm:px-5">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-1 font-mono text-sm font-medium sm:text-base ${color}`}>{value}</p>
    </div>
  );
}
