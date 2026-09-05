"use client";

import { addMonths, startOfDay } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CategoryList } from "@/components/category-list";
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
  type EventKind,
  type Profile,
} from "@/lib/types";

type Section = "budget" | "events" | "categories";

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
  const [section, setSection] = useState<Section>("budget");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetEvent | null>(null);
  const [drawerKind, setDrawerKind] = useState<EventKind>("recurring");
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

  const budgetEvents = useMemo(
    () => events.filter((event) => event.kind === "recurring"),
    [events],
  );
  const oneOffEvents = useMemo(
    () => events.filter((event) => event.kind === "one_off"),
    [events],
  );

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

  async function handleDeleteCategory(id: string) {
    try {
      await remote.deleteCategory(id);
      setCategories((prev) => prev.filter((category) => category.id !== id));
      setEvents((prev) =>
        prev.map((event) =>
          event.categoryId === id ? { ...event, categoryId: null } : event,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that category.");
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

  function openNew(kind: EventKind) {
    setEditing(null);
    setDrawerKind(kind);
    setDrawerOpen(true);
  }

  function openEdit(event: BudgetEvent) {
    setEditing(event);
    setDrawerKind(event.kind);
    setDrawerOpen(true);
  }

  async function handleSignOut() {
    await remote.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="px-4 py-16 text-muted">Loading your forecast…</main>
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
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-rule/80 bg-surface">
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
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

      {error ? (
        <p className="shrink-0 border-b border-copper/40 bg-surface px-4 py-2 text-sm text-warn sm:px-6">
          {error}
        </p>
      ) : null}

      <section className="shrink-0 border-b border-rule bg-surface">
        <div className="flex flex-col gap-4 border-b border-rule px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              Projected cash
            </p>
            <p className={`mt-1 font-mono text-3xl font-medium tracking-tight sm:text-4xl ${endTone}`}>
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

        <div className="w-full px-1 pb-1 pt-1 sm:px-3">
          <ForecastChart forecast={forecast} currency={profile.currency} />
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        <nav
          aria-label="Ledger"
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-rule bg-paper px-2 py-2 sm:w-52 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-b-0 sm:border-r sm:px-3 sm:py-4"
        >
          {(
            [
              { id: "budget", label: "Budget" },
              { id: "events", label: "Events" },
              { id: "categories", label: "Categories" },
            ] as const
          ).map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setSection(item.id)}
                className={`rounded-md px-3 py-2 text-left text-sm whitespace-nowrap ${
                  active
                    ? "bg-surface font-medium text-ink shadow-sm ring-1 ring-rule"
                    : "text-muted hover:bg-surface/70 hover:text-ink"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface">
          {section === "budget" ? (
            <EventTable
              title="Budget"
              description="Recurring income and expenses. Edits move the forecast immediately."
              addLabel="Add line"
              emptyLabel="No budget lines yet. Add a salary, rent, or monthly expense."
              events={budgetEvents}
              categories={categories}
              forecast={forecast}
              currency={profile.currency}
              onAdd={() => openNew("recurring")}
              onEdit={openEdit}
            />
          ) : null}
          {section === "events" ? (
            <EventTable
              title="Events"
              description="One-off hits and windfalls on specific dates."
              addLabel="Add event"
              emptyLabel="No one-off events yet."
              events={oneOffEvents}
              categories={categories}
              forecast={forecast}
              currency={profile.currency}
              onAdd={() => openNew("one_off")}
              onEdit={openEdit}
            />
          ) : null}
          {section === "categories" ? (
            <CategoryList
              categories={categories}
              events={events}
              currency={profile.currency}
              onSave={handleSaveCategory}
              onDelete={handleDeleteCategory}
            />
          ) : null}
        </div>
      </div>

      {drawerOpen ? (
        <EventDrawer
          key={editing?.id ?? `new-${drawerKind}`}
          open
          event={editing}
          categories={categories}
          initialKind={drawerKind}
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
    <div className="px-4 py-3 sm:px-6">
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className={`mt-1 font-mono text-sm font-medium sm:text-base ${color}`}>{value}</p>
    </div>
  );
}
