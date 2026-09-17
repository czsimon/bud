"use client";

import { addMonths, startOfDay } from "date-fns";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { buildForecast } from "@/lib/forecast";
import * as remote from "@/lib/supabase/data";
import {
  CATEGORY_COLORS,
  type Account,
  type AccountDraft,
  type BudgetEvent,
  type Category,
  type CategoryDraft,
  type EventDraft,
  type Forecast,
  type Profile,
} from "@/lib/types";

type HouseholdValue = {
  profile: Profile;
  events: BudgetEvent[];
  categories: Category[];
  accounts: Account[];
  forecast: Forecast;
  persistProfile: (next: Profile) => Promise<void>;
  saveEvent: (draft: EventDraft) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  saveAccount: (draft: AccountDraft) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  saveCategory: (draft: CategoryDraft) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  createCategory: (name: string) => Promise<Category>;
};

const HouseholdContext = createContext<HouseholdValue | null>(null);

export function useHousehold() {
  const value = useContext(HouseholdContext);
  if (!value) {
    throw new Error("useHousehold must be used within HouseholdProvider");
  }
  return value;
}

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [events, setEvents] = useState<BudgetEvent[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    remote
      .fetchHousehold()
      .then((snap) => {
        if (cancelled) return;
        setProfile(snap.profile);
        setEvents(snap.events);
        setCategories(snap.categories);
        setAccounts(snap.accounts);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Could not load your ledger.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const forecast = useMemo(() => {
    if (!profile) return null;
    const from = startOfDay(new Date());
    const to = addMonths(from, profile.horizonMonths);
    return buildForecast(events, accounts, from, to);
  }, [accounts, events, profile]);

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

  async function saveEvent(draft: EventDraft) {
    if (!profile) return;
    const saved = await remote.upsertEvent(draft, profile.id);
    setEvents((prev) => {
      const exists = prev.some((event) => event.id === saved.id);
      return exists
        ? prev.map((event) => (event.id === saved.id ? saved : event))
        : [...prev, saved];
    });
  }

  async function deleteEvent(id: string) {
    await remote.deleteEvent(id);
    setEvents((prev) => prev.filter((event) => event.id !== id));
  }

  async function saveAccount(draft: AccountDraft) {
    if (!profile) throw new Error("Not signed in");
    const saved = await remote.upsertAccount(draft, profile.id);
    setAccounts((previous) => {
      const exists = previous.some((account) => account.id === saved.id);
      return exists
        ? previous.map((account) => (account.id === saved.id ? saved : account))
        : [...previous, saved];
    });
  }

  async function deleteAccount(id: string) {
    await remote.deleteAccount(id);
    setAccounts((previous) => previous.filter((account) => account.id !== id));
  }

  async function persistCategory(draft: CategoryDraft): Promise<Category> {
    if (!profile) throw new Error("Not signed in");
    const saved = await remote.upsertCategory(draft, profile.id);
    setCategories((prev) => {
      const exists = prev.some((category) => category.id === saved.id);
      return exists
        ? prev.map((category) => (category.id === saved.id ? saved : category))
        : [...prev, saved];
    });
    return saved;
  }

  async function saveCategory(draft: CategoryDraft) {
    try {
      await persistCategory(draft);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save that category.",
      );
      throw err;
    }
  }

  async function deleteCategory(id: string) {
    try {
      await remote.deleteCategory(id);
      setCategories((prev) => prev.filter((category) => category.id !== id));
      setEvents((prev) =>
        prev.map((event) =>
          event.categoryId === id ? { ...event, categoryId: null } : event,
        ),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not delete that category.",
      );
    }
  }

  async function createCategory(name: string): Promise<Category> {
    const trimmed = name.trim();
    const existing = categories.find(
      (category) => category.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (existing) return existing;
    const nextPosition =
      categories.reduce((max, category) => Math.max(max, category.position), -1) +
      1;
    const color =
      CATEGORY_COLORS[categories.length % CATEGORY_COLORS.length] ??
      CATEGORY_COLORS[0];
    return persistCategory({ name: trimmed, color, position: nextPosition });
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-muted">
        Loading your forecast…
      </div>
    );
  }

  if (!profile || !forecast) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-medium">Couldn’t load Bud</h1>
        <p className="mt-2 text-muted">{error ?? "Unknown error."}</p>
      </div>
    );
  }

  return (
    <HouseholdContext.Provider
      value={{
        profile,
        events,
        categories,
        accounts,
        forecast,
        persistProfile,
        saveEvent,
        deleteEvent,
        saveAccount,
        deleteAccount,
        saveCategory,
        deleteCategory,
        createCategory,
      }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {error ? (
          <p className="shrink-0 border-b border-copper/40 bg-surface px-4 py-2 text-sm text-warn sm:px-6">
            {error}
          </p>
        ) : null}
        {children}
      </div>
    </HouseholdContext.Provider>
  );
}
