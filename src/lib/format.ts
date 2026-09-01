import { format, parseISO } from "date-fns";
import type { Cadence } from "./types";

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
