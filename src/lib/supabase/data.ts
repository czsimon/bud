"use client";

import { createClient } from "@/lib/supabase/client";
import { eventToRow, mapEvent, mapProfile, type EventRow, type ProfileRow } from "@/lib/mappers";
import type { BudgetEvent, EventDraft, Profile } from "@/lib/types";

export async function fetchHousehold(): Promise<{
  profile: Profile;
  events: BudgetEvent[];
}> {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Not signed in");
  }

  const [{ data: profileRow, error: profileError }, { data: eventRows, error: eventError }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("events").select("*").eq("user_id", user.id).order("start_date"),
    ]);

  if (profileError) throw profileError;
  if (eventError) throw eventError;

  let profile: Profile;
  if (!profileRow) {
    const { data: inserted, error: insertError } = await supabase
      .from("profiles")
      .insert({ id: user.id, display_name: user.email?.split("@")[0] ?? "You" })
      .select("*")
      .single();
    if (insertError) throw insertError;
    profile = mapProfile(inserted as ProfileRow);
  } else {
    profile = mapProfile(profileRow as ProfileRow);
  }

  return {
    profile,
    events: ((eventRows ?? []) as EventRow[]).map(mapEvent),
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

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}
