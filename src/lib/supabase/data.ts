"use client";

import { createClient } from "@/lib/supabase/client";
import {
  eventAmount,
  roundMoney,
  type Account,
  type AccountBalance,
  type AccountDraft,
  type AccountType,
  type BudgetEvent,
  type Category,
  type CategoryDraft,
  type EventDraft,
  type EventLineItem,
  type Profile,
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
  kind: BudgetEvent["kind"];
  cadence: BudgetEvent["cadence"];
  start_date: string;
  end_date: string | null;
  notes: string | null;
  category_id?: string | null;
  line_items?: unknown;
};

type AccountRow = {
  id: string;
  name: string;
  type: AccountType;
  position: number;
  payment_due_date: string | null;
  account_balances?: AccountBalanceRow[] | null;
};

type AccountBalanceRow = {
  id: string;
  as_of: string;
  amount: number | string;
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

function mapLineItems(raw: unknown): EventLineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name.trim() : "";
    const amount = Number(record.amount);
    if (!name || !Number.isFinite(amount) || amount <= 0) return [];
    return [
      {
        id:
          typeof record.id === "string" && record.id
            ? record.id
            : crypto.randomUUID(),
        name,
        amount: roundMoney(amount),
      },
    ];
  });
}

function mapEvent(row: EventRow): BudgetEvent {
  const lineItems = mapLineItems(row.line_items);
  const amount = Number(row.amount);
  return {
    id: row.id,
    name: row.name,
    amount: lineItems.length > 0 ? eventAmount({ amount, lineItems }) : amount,
    lineItems,
    flow: row.flow,
    kind: row.kind,
    cadence: row.cadence,
    startDate: row.start_date,
    endDate: row.end_date,
    notes: row.notes,
    categoryId: row.category_id ?? null,
  };
}

function mapAccountBalance(row: AccountBalanceRow): AccountBalance {
  return {
    id: row.id,
    asOf: row.as_of,
    amount: Number(row.amount),
  };
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balances: (row.account_balances ?? []).map(mapAccountBalance),
    paymentDueDate: row.payment_due_date,
    position: row.position,
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
    amount: eventAmount(event),
    line_items: event.lineItems,
    flow: event.flow,
    kind: event.kind,
    cadence: event.kind === "recurring" ? event.cadence : null,
    start_date: event.startDate,
    end_date: event.kind === "recurring" ? event.endDate : null,
    notes: event.notes,
    category_id: event.kind === "balance" ? null : event.categoryId,
  };
}

function accountToRow(account: Account, userId: string) {
  return {
    id: account.id,
    user_id: userId,
    name: account.name,
    type: account.type,
    payment_due_date: account.type === "credit" ? account.paymentDueDate : null,
    position: account.position,
  };
}

function balanceToRow(balance: AccountBalance, accountId: string) {
  return {
    id: balance.id,
    account_id: accountId,
    as_of: balance.asOf,
    amount: roundMoney(balance.amount),
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
  accounts: Account[];
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
    { data: accountRows, error: accountError },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("events").select("*").eq("user_id", user.id).order("start_date"),
    supabase
      .from("categories")
      .select("*")
      .eq("user_id", user.id)
      .order("position")
      .order("name"),
    supabase
      .from("accounts")
      .select("*, account_balances(*)")
      .eq("user_id", user.id)
      .order("position")
      .order("name"),
  ]);

  if (profileError) throw profileError;
  if (eventError) throw eventError;
  if (categoryError) throw categoryError;
  if (accountError) throw accountError;

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
    categories: ((categoryRows ?? []) as CategoryRow[]).map(mapCategory),
    accounts: ((accountRows ?? []) as AccountRow[]).map(mapAccount),
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
  const lineItems = draft.lineItems ?? [];
  const event: BudgetEvent = {
    ...draft,
    id: draft.id ?? crypto.randomUUID(),
    lineItems: draft.kind === "balance" ? [] : lineItems,
    amount:
      draft.kind === "balance"
        ? roundMoney(draft.amount)
        : eventAmount({ amount: draft.amount, lineItems }),
    cadence: draft.kind === "recurring" ? draft.cadence : null,
    categoryId: draft.kind === "balance" ? null : draft.categoryId,
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

export async function upsertAccount(
  draft: AccountDraft,
  userId: string,
): Promise<Account> {
  const supabase = createClient();
  const account: Account = {
    id: draft.id ?? crypto.randomUUID(),
    name: draft.name.trim(),
    type: draft.type,
    balances: draft.balances.map((balance) => ({
      ...balance,
      amount: roundMoney(balance.amount),
    })),
    paymentDueDate: draft.type === "credit" ? draft.paymentDueDate : null,
    position: draft.position,
  };
  const { error: accountError } = await supabase
    .from("accounts")
    .upsert(accountToRow(account, userId));
  if (accountError) throw accountError;

  const { data: existingRows, error: existingError } = await supabase
    .from("account_balances")
    .select("id")
    .eq("account_id", account.id);
  if (existingError) throw existingError;

  const keep = new Set(account.balances.map((balance) => balance.id));
  const toDelete = ((existingRows ?? []) as { id: string }[])
    .map((row) => row.id)
    .filter((id) => !keep.has(id));
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("account_balances")
      .delete()
      .in("id", toDelete);
    if (deleteError) throw deleteError;
  }

  if (account.balances.length > 0) {
    const { error: balanceError } = await supabase
      .from("account_balances")
      .upsert(account.balances.map((balance) => balanceToRow(balance, account.id)));
    if (balanceError) {
      if (balanceError.code === "23505") {
        throw new Error("Each date can only have one balance.");
      }
      throw balanceError;
    }
  }

  return account;
}

export async function deleteAccount(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
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
