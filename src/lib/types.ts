import { format, isSameMonth, isSameYear, parseISO } from "date-fns";

export const CADENCES = [
  "weekly",
  "biweekly",
  "semimonthly",
  "monthly",
  "quarterly",
  "yearly",
] as const;

export const CATEGORY_COLORS = [
  "moss",
  "pine",
  "sea",
  "blue",
  "indigo",
  "violet",
  "plum",
  "magenta",
  "crimson",
  "rust",
  "amber",
  "olive",
  "stone",
  "slate",
] as const;

export const ACCOUNT_TYPES = [
  "bank",
  "cash",
  "investment",
  "credit",
  "other",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];
export type Cadence = (typeof CADENCES)[number];
export type Flow = "in" | "out";
export type EventKind = "recurring" | "one_off" | "balance";
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export type Profile = {
  id: string;
  displayName: string | null;
  startingBalance: number;
  currency: string;
  horizonMonths: number;
};

export type EventLineItem = {
  id: string;
  name: string;
  amount: number;
};

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  balanceDate: string;
  position: number;
};

export type AccountDraft = Omit<Account, "id"> & { id?: string };

export type BudgetEvent = {
  id: string;
  name: string;
  amount: number;
  lineItems: EventLineItem[];
  flow: Flow;
  kind: EventKind;
  cadence: Cadence | null;
  startDate: string;
  endDate: string | null;
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
  options: { sign?: boolean } = {},
): string {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(abs);

  if (!options.sign) return value < 0 ? `−${formatted}` : formatted;
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function currencySymbol(currency = "USD"): string {
  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).formatToParts(0);
  return parts.find((part) => part.type === "currency")?.value ?? "$";
}

export function isCompleteDate(iso: string | null): iso is string {
  return !!iso && /^\d{4}-\d{2}-\d{2}$/.test(iso);
}

export function formatDate(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy");
}

export function formatDateRange(start: string, end: string | null): string {
  if (!end || end === start) return formatDate(start);
  const startDate = parseISO(start);
  const endDate = parseISO(end);
  if (isSameYear(startDate, endDate) && isSameMonth(startDate, endDate)) {
    return `${format(startDate, "MMM d")}–${format(endDate, "d, yyyy")}`;
  }
  if (isSameYear(startDate, endDate)) {
    return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`;
  }
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Stored amount, or the sum of line items when the event is itemized. */
export function eventAmount(event: Pick<BudgetEvent, "amount" | "lineItems">): number {
  if (event.lineItems.length === 0) return event.amount;
  return roundMoney(event.lineItems.reduce((sum, item) => sum + item.amount, 0));
}

export function cadenceLabel(cadence: Cadence | null, kind: EventKind): string {
  if (kind === "balance") return "Balance";
  if (kind === "one_off") return "One-off";
  if (!cadence) return "Custom";
  return CADENCE_LABEL[cadence];
}

export function categoryColor(value: string): string {
  return (CATEGORY_COLORS as readonly string[]).includes(value)
    ? `var(--cat-${value})`
    : value;
}

export function categoryColorLabel(color: CategoryColor): string {
  return color[0].toUpperCase() + color.slice(1);
}

export function accountTypeLabel(type: AccountType): string {
  if (type === "bank") return "Bank";
  if (type === "cash") return "Cash";
  if (type === "investment") return "Investment";
  if (type === "credit") return "Credit";
  return "Other";
}

/** Approximate monthly cash effect of a recurring event. One-offs are 0. */
export function monthlyEquivalent(
  event: Pick<BudgetEvent, "amount" | "lineItems" | "flow" | "kind" | "cadence">,
): number {
  const amount = eventAmount(event);
  const signed = event.flow === "in" ? amount : -amount;
  if (event.kind === "one_off" || event.kind === "balance") return 0;
  switch (event.cadence) {
    case "weekly":
      return signed * (52 / 12);
    case "biweekly":
      return signed * (26 / 12);
    case "semimonthly":
      return signed * 2;
    case "monthly":
      return signed;
    case "quarterly":
      return signed / 3;
    case "yearly":
      return signed / 12;
    default:
      return signed;
  }
}
