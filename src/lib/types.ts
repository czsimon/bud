import { format, parseISO } from "date-fns";

export const CADENCES = [
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export const CATEGORY_COLORS = [
  "#1f7a6e",
  "#c0562a",
  "#b45309",
  "#7c3aed",
  "#1d4ed8",
  "#be185d",
  "#0f766e",
  "#44403c",
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
  categoryId: string | null;
};

export type Category = {
  id: string;
  name: string;
  color: string;
  position: number;
};

export type CategoryDraft = Omit<Category, "id"> & { id?: string };

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

const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  semimonthly: "1st & 15th",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

export function formatMoney(
  value: number,
  currency = "USD",
  options: { sign?: boolean; compact?: boolean } = {},
): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: options.compact && abs >= 10000 ? 0 : 2,
  }).format(abs);

  if (!options.sign) return value < 0 ? `−${formatted}` : formatted;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

export function formatShortDate(iso: string): string {
  return format(parseISO(iso), "MMM d");
}

export function cadenceLabel(cadence: Cadence | null, kind: "recurring" | "one_off"): string {
  if (kind === "one_off") return "One-off";
  if (!cadence) return "Custom";
  return CADENCE_LABEL[cadence];
}

export function personLabel(person: string | null): string {
  if (!person) return "Household";
  if (person === "you") return "You";
  if (person === "partner") return "Partner";
  if (person === "shared") return "Shared";
  return person;
}
