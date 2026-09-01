export const CADENCES = [
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export type Cadence = (typeof CADENCES)[number];
export type Flow = "in" | "out";
export type EventKind = "recurring" | "one_off";

export type Profile = {
  id: string;
  displayName: string | null;
  startingBalance: number;
  currency: string;
  horizonMonths: number;
};

export type BudgetEvent = {
  id: string;
  name: string;
  amount: number;
  flow: Flow;
  kind: EventKind;
  cadence: Cadence | null;
  startDate: string;
  endDate: string | null;
  person: string | null;
  notes: string | null;
};

export type EventDraft = Omit<BudgetEvent, "id"> & { id?: string };

export type ForecastPoint = {
  date: string;
  balance: number;
};

export type ForecastOccurrence = {
  date: string;
  eventId: string;
  name: string;
  delta: number;
};

export type Forecast = {
  points: ForecastPoint[];
  occurrences: ForecastOccurrence[];
  startBalance: number;
  endBalance: number;
  minBalance: number;
  maxBalance: number;
  totalIn: number;
  totalOut: number;
  from: string;
  to: string;
};
