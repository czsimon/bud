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
  BudgetEvent,
  Cadence,
  Forecast,
  ForecastOccurrence,
  ForecastPoint,
} from "./types";

function toISODate(d: Date): string {
  return formatISO(startOfDay(d), { representation: "date" });
}

function signedAmount(event: BudgetEvent): number {
  return event.flow === "in" ? event.amount : -event.amount;
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

export function eventOccurrences(
  event: BudgetEvent,
  from: Date,
  to: Date,
): Date[] {
  const start = startOfDay(parseISO(event.startDate));
  const end = event.endDate ? startOfDay(parseISO(event.endDate)) : null;
  const rangeFrom = startOfDay(from);
  const rangeTo = startOfDay(to);

  if (event.kind === "one_off") {
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
  startingBalance: number,
  from: Date,
  to: Date,
): Forecast {
  const rangeFrom = startOfDay(from);
  const rangeTo = startOfDay(to);
  const occurrences: ForecastOccurrence[] = [];

  for (const event of events) {
    const delta = signedAmount(event);
    for (const date of eventOccurrences(event, rangeFrom, rangeTo)) {
      occurrences.push({
        date: toISODate(date),
        eventId: event.id,
        name: event.name,
        delta,
      });
    }
  }

  occurrences.sort((a, b) => {
    if (a.date === b.date) return a.name.localeCompare(b.name);
    return a.date.localeCompare(b.date);
  });

  const byDate = new Map<string, number>();
  let totalIn = 0;
  let totalOut = 0;
  for (const occ of occurrences) {
    byDate.set(occ.date, (byDate.get(occ.date) ?? 0) + occ.delta);
    if (occ.delta >= 0) totalIn += occ.delta;
    else totalOut += -occ.delta;
  }

  const points: ForecastPoint[] = [
    { date: toISODate(rangeFrom), balance: startingBalance },
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

  const endDate = toISODate(rangeTo);
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
