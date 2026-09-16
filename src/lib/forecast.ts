import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  formatISO,
  isAfter,
  isBefore,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfDay,
} from "date-fns";
import type {
  Account,
  AccountBalance,
  BudgetEvent,
  Cadence,
  Forecast,
  ForecastOccurrence,
  ForecastPoint,
} from "./types";
import { eventAmount, roundMoney, sortAccountBalances } from "./types";

function toISODate(d: Date): string {
  return formatISO(startOfDay(d), { representation: "date" });
}

function signedAmount(event: BudgetEvent): number {
  const amount = eventAmount(event);
  return event.flow === "in" ? amount : -amount;
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function addCalendarMonths(date: Date, months: number, dayOfMonth: number): Date {
  const raw = addMonths(date, months);
  const clamped = Math.min(dayOfMonth, lastDayOfMonth(raw.getFullYear(), raw.getMonth()));
  return new Date(raw.getFullYear(), raw.getMonth(), clamped);
}

function step(date: Date, cadence: Cadence, start: Date): Date {
  switch (cadence) {
    case "weekly":
      return addWeeks(date, 1);
    case "biweekly":
      return addWeeks(date, 2);
    case "monthly":
      return addCalendarMonths(date, 1, start.getDate());
    case "quarterly":
      return addCalendarMonths(date, 3, start.getDate());
    case "yearly":
      return addYears(date, 1);
    case "semimonthly":
      return addDays(date, 15);
  }
}

function semimonthlyDates(start: Date, from: Date, to: Date, end: Date | null): Date[] {
  const windowStart = maxDate([start, from]);
  const windowEnd = end ? minDate([end, to]) : to;
  const dates: Date[] = [];
  let cursor = new Date(windowStart.getFullYear(), windowStart.getMonth(), 1);

  while (!isAfter(cursor, windowEnd)) {
    for (const day of [1, 15]) {
      const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), day);
      if (
        !isBefore(candidate, windowStart) &&
        !isAfter(candidate, windowEnd)
      ) {
        dates.push(candidate);
      }
    }
    cursor = addMonths(cursor, 1);
  }

  return dates;
}

function owedOnDate(account: Account, date: string): number {
  const latest = sortAccountBalances(account.balances, "desc").find(
    (snapshot) => snapshot.asOf <= date,
  );
  return latest ? roundMoney(Math.abs(latest.amount)) : 0;
}

function monthlyFrom(start: Date, from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  let cursor = startOfDay(start);
  const rangeFrom = startOfDay(from);
  const rangeTo = startOfDay(to);
  let guard = 0;
  while (isBefore(cursor, rangeFrom)) {
    cursor = addCalendarMonths(cursor, 1, start.getDate());
    if (++guard > 10000) break;
  }
  while (!isAfter(cursor, rangeTo)) {
    dates.push(cursor);
    cursor = addCalendarMonths(cursor, 1, start.getDate());
    if (++guard > 10000) break;
  }
  return dates;
}

export function nextMonthlyOnOrAfter(startIso: string, fromIso: string): string {
  const start = startOfDay(parseISO(startIso));
  const from = startOfDay(parseISO(fromIso));
  let cursor = start;
  let guard = 0;
  while (isBefore(cursor, from)) {
    cursor = addCalendarMonths(cursor, 1, start.getDate());
    if (++guard > 10000) break;
  }
  return toISODate(cursor);
}

function pendingName(item: {
  type: "snapshot" | "event" | "payment";
  account?: Account;
  event?: BudgetEvent;
}): string {
  if (item.type === "event") return item.event?.name ?? "";
  return item.account?.name ?? "";
}

export function eventOccurrences(
  event: BudgetEvent,
  from: Date,
  to: Date,
): Date[] {
  const start = startOfDay(parseISO(event.startDate));
  const end = event.endDate ? startOfDay(parseISO(event.endDate)) : null;
  const rangeFrom = startOfDay(from);
  const rangeTo = startOfDay(to);

  if (event.kind === "one_off" || event.kind === "balance") {
    if (!isBefore(start, rangeFrom) && !isAfter(start, rangeTo)) {
      if (!end || !isAfter(start, end)) return [start];
    }
    return [];
  }

  if (!event.cadence) return [];

  if (end && isBefore(end, rangeFrom)) return [];
  if (isAfter(start, rangeTo)) return [];

  if (event.cadence === "semimonthly") {
    return semimonthlyDates(start, rangeFrom, rangeTo, end);
  }

  const dates: Date[] = [];
  let cursor = start;
  while (isBefore(cursor, rangeFrom)) {
    cursor = step(cursor, event.cadence, start);
    if (dates.length > 10000) break;
  }

  while (!isAfter(cursor, rangeTo)) {
    if (!end || !isAfter(cursor, end)) {
      dates.push(cursor);
    } else {
      break;
    }
    cursor = step(cursor, event.cadence, start);
    if (dates.length > 10000) break;
  }

  return dates;
}

export function buildForecast(
  events: BudgetEvent[],
  accounts: Account[],
  from: Date,
  to: Date,
): Forecast {
  const rangeFrom = startOfDay(from);
  const rangeTo = startOfDay(to);
  const rangeFromIso = toISODate(rangeFrom);
  const rangeToIso = toISODate(rangeTo);

  type Pending =
    | {
        type: "snapshot";
        account: Account;
        snapshot: AccountBalance;
        previousAmount: number | null;
        date: string;
      }
    | { type: "event"; event: BudgetEvent; date: string }
    | { type: "payment"; account: Account; amount: number; date: string };
  const pending: Pending[] = [];

  let replayFrom = rangeFrom;
  for (const account of accounts) {
    const snapshots = sortAccountBalances(account.balances, "asc").filter(
      (snapshot) => snapshot.asOf <= rangeToIso,
    );
    let previousAmount: number | null = null;
    for (const snapshot of snapshots) {
      if (account.type !== "credit") {
        pending.push({
          type: "snapshot",
          account,
          snapshot,
          previousAmount,
          date: snapshot.asOf,
        });
        previousAmount = snapshot.amount;
        const start = startOfDay(parseISO(snapshot.asOf));
        if (isBefore(start, replayFrom)) replayFrom = start;
      }
    }

    if (
      account.type === "credit" &&
      account.paymentDueDate &&
      account.paymentDueDate <= rangeToIso
    ) {
      const dueStart = startOfDay(parseISO(account.paymentDueDate));
      for (const date of monthlyFrom(dueStart, rangeFrom, rangeTo)) {
        const iso = toISODate(date);
        const amount = owedOnDate(account, iso);
        if (amount <= 0) continue;
        pending.push({ type: "payment", account, amount, date: iso });
      }
    }
  }

  for (const event of events) {
    for (const date of eventOccurrences(event, replayFrom, rangeTo)) {
      pending.push({ type: "event", event, date: toISODate(date) });
    }
  }

  pending.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const order = (item: Pending) => {
      if (item.type === "snapshot") return 0;
      if (item.type === "payment") return 1;
      return item.event.kind === "balance" ? 2 : 1;
    };
    const orderDiff = order(a) - order(b);
    if (orderDiff !== 0) return orderDiff;
    return pendingName(a).localeCompare(pendingName(b));
  });

  const occurrences: ForecastOccurrence[] = [];
  const byDate = new Map<string, number>();
  let totalIn = 0;
  let totalOut = 0;
  let running = 0;

  function apply(item: Pending, record: boolean) {
    let delta: number;
    let eventId: string;
    let name: string;
    if (item.type === "snapshot") {
      const previous = item.previousAmount ?? 0;
      delta = roundMoney(item.snapshot.amount - previous);
      running = roundMoney(running + delta);
      eventId = `account:${item.account.id}:${item.snapshot.id}`;
      name =
        item.previousAmount == null
          ? `${item.account.name} starting balance`
          : `${item.account.name} balance`;
    } else if (item.type === "payment") {
      delta = roundMoney(-item.amount);
      running = roundMoney(running + delta);
      eventId = `account-payment:${item.account.id}:${item.date}`;
      name = `${item.account.name} payment`;
    } else if (item.event.kind === "balance") {
      const target = eventAmount(item.event);
      delta = roundMoney(target - running);
      running = target;
      eventId = item.event.id;
      name = item.event.name;
    } else {
      delta = signedAmount(item.event);
      running = roundMoney(running + delta);
      eventId = item.event.id;
      name = item.event.name;
    }
    if (!record) return;
    occurrences.push({
      date: item.date,
      eventId,
      name,
      delta,
    });
    byDate.set(item.date, (byDate.get(item.date) ?? 0) + delta);
    if (
      item.type === "payment" ||
      (item.type === "event" && item.event.kind !== "balance")
    ) {
      if (delta >= 0) totalIn += delta;
      else totalOut += -delta;
    }
  }

  for (const item of pending) {
    if (item.date < rangeFromIso) apply(item, false);
  }

  const startingBalance = running;

  for (const item of pending) {
    if (item.date >= rangeFromIso) apply(item, true);
  }

  const points: ForecastPoint[] = [
    { date: rangeFromIso, balance: startingBalance },
  ];
  let balance = startingBalance;
  const sortedDates = [...byDate.keys()].sort();
  for (const date of sortedDates) {
    balance += byDate.get(date) ?? 0;
    const last = points[points.length - 1];
    if (last.date === date) {
      last.balance = balance;
    } else {
      points.push({ date, balance });
    }
  }

  const endDate = rangeToIso;
  const last = points[points.length - 1];
  if (last.date !== endDate) {
    points.push({ date: endDate, balance });
  }

  const balances = points.map((p) => p.balance);
  return {
    points,
    occurrences,
    startBalance: startingBalance,
    endBalance: balance,
    minBalance: Math.min(...balances),
    maxBalance: Math.max(...balances),
    totalIn,
    totalOut,
    from: toISODate(rangeFrom),
    to: endDate,
  };
}
