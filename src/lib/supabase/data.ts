"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  BudgetEvent,
  Category,
  CategoryDraft,
  EventDraft,
  Profile,
} from "@/lib/types";

type ProfileRow = {
  id: string;
  display_name: string | null;
  starting_balance: number | string;
  currency: string;
  horizon_months: number;
};

type EventRow = {
  id: string;
  name: string;
  amount: number | string;
  flow: "in" | "out";
  kind: "recurring" | "one_off";
  cadence: BudgetEvent["cadence"];
  start_date: string;
  end_date: string | null;
  person: string | null;
  notes: string | null;
  category_id?: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  color: string;
  position: number;
};

function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    startingBalance: Number(row.starting_balance),
    currency: row.currency,
    horizonMonths: row.horizon_months,
  };
}

function mapEvent(row: EventRow): BudgetEvent {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    flow: row.flow,
    kind: row.kind,
    cadence: row.cadence,
    startDate: row.start_date,
    endDate: row.end_date,
    person: row.person,
    notes: row.notes,
    categoryId: row.category_id ?? null,
  };
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    position: row.position,
  };
}

function eventToRow(event: BudgetEvent, userId: string) {
  return {
    id: event.id,
    user_id: userId,
    name: event.name,
    amount: event.amount,
    flow: event.flow,
    kind: event.kind,
    cadence: event.kind === "one_off" ? null : event.cadence,
    start_date: event.startDate,
    end_date: event.endDate,
    person: event.person,
    notes: event.notes,
    category_id: event.flow === "out" ? event.categoryId : null,
  };
}

function categoryToRow(category: Category, userId: string) {
  return {
    id: category.id,
    user_id: userId,
    name: category.name,
    color: category.color,
    position: category.position,
  };
}

export async function fetchHousehold(): Promise<{
  profile: Profile;
  events: BudgetEvent[];
  categories: Category[];
}> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Not signed in");
  }

  const [
    { data: profileRow, error: profileError },
    { data: eventRows, error: eventError },
    { data: categoryRows, error: categoryError },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("events").select("*").eq("user_id", user.id).order("start_date"),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("position")
      .order("name"),
  ]);

  if (profileError) throw profileError;
  if (eventError) throw eventError;
  if (categoryError) throw categoryError;

  let profile: Profile;
  if (!profileRow) {
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: user.id, display_name: user.email?.split("@")[0] ?? "You" })
      .select("*")
      .single();
    if (insertError) throw insertError;
    profile = mapProfile(inserted as ProfileRow);
    await supabase.rpc("seed_default_categories", { for_user: user.id });
  } else {
    profile = mapProfile(profileRow as ProfileRow);
  }

  let categories = ((categoryRows ?? []) as CategoryRow[]).map(mapCategory);
  if (categories.length === 0) {
    const { error: seedError } = await supabase.rpc("seed_default_categories", {
      for_user: user.id,
    });
    if (seedError) throw seedError;
    const { data: seeded, error: reloadError } = await supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("position")
      .order("name");
    if (reloadError) throw reloadError;
    categories = ((seeded ?? []) as CategoryRow[]).map(mapCategory);
  }

  return {
    profile,
    events: ((eventRows ?? []) as EventRow[]).map(mapEvent),
    categories,
  };
}

export async function saveProfile(profile: Profile): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: profile.displayName,
      starting_balance: profile.startingBalance,
      currency: profile.currency,
      horizon_months: profile.horizonMonths,
    })
    .eq("id", profile.id);
  if (error) throw error;
}

export async function upsertEvent(draft: EventDraft, userId: string): Promise<BudgetEvent> {
  const supabase = createClient();
  const event: BudgetEvent = {
    ...draft,
    id: draft.id ?? crypto.randomUUID(),
    cadence: draft.kind === "one_off" ? null : draft.cadence,
    categoryId: draft.flow === "out" ? draft.categoryId : null,
  };
  const { data, error } = await supabase
    .from("events")
    .upsert(eventToRow(event, userId))
    .select("*")
    .single();
  if (error) throw error;
  return mapEvent(data as EventRow);
}

export async function deleteEvent(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertCategory(
  draft: CategoryDraft,
  userId: string,
): Promise<Category> {
  const supabase = createClient();
  const category: Category = {
    name: draft.name.trim(),
    color: draft.color,
    position: draft.position,
    id: draft.id ?? crypto.randomUUID(),
  };
  const { data, error } = await supabase
    .from("categories")
    .upsert(categoryToRow(category, userId))
    .select("*")
    .single();
  if (error) throw error;
  return mapCategory(data as CategoryRow);
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
