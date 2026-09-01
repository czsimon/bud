import type { BudgetEvent, Profile } from "@/lib/types";

export type ProfileRow = {
  id: string;
  display_name: string | null;
  starting_balance: number | string;
  currency: string;
  horizon_months: number;
};

export type EventRow = {
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
};

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    displayName: row.display_name,
    startingBalance: Number(row.starting_balance),
    currency: row.currency,
    horizonMonths: row.horizon_months,
  };
}

export function mapEvent(row: EventRow): BudgetEvent {
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
  };
}

export function eventToRow(event: BudgetEvent, userId: string) {
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
  };
}
