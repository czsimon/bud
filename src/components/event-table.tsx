"use client";

import { addDays, formatISO, startOfDay } from "date-fns";
import { useState } from "react";
import { eventOccurrences } from "@/lib/forecast";
import {
  cadenceLabel,
  formatDate,
  formatMoney,
  personLabel,
  type BudgetEvent,
  type Category,
  type Forecast,
} from "@/lib/types";

type Filter = "all" | "in" | "out";
type SortColumn = "name" | "category" | "who" | "schedule" | "next" | "amount";
type SortDir = "asc" | "desc";
type SortState = { column: SortColumn; dir: SortDir };

type Row = {
  event: BudgetEvent;
  next: string | null;
  categoryName: string;
  who: string;
  schedule: string;
  amount: number;
};

type Props = {
  title: string;
  description: string;
  addLabel: string;
  emptyLabel: string;
  events: BudgetEvent[];
  categories: Category[];
  forecast: Forecast;
  currency: string;
  onAdd: () => void;
  onEdit: (event: BudgetEvent) => void;
};

function nextDate(event: BudgetEvent, from: Date, to: Date): string | null {
  const dates = eventOccurrences(event, from, to);
  return dates[0]
    ? formatISO(dates[0], { representation: "date" })
    : event.startDate;
}

function originalCompare(a: Row, b: Row) {
  const dateCompare = (a.next ?? a.event.startDate).localeCompare(
    b.next ?? b.event.startDate,
  );
  if (dateCompare !== 0) return dateCompare;
  return a.event.name.localeCompare(b.event.name);
}

function compareText(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function compareColumn(a: Row, b: Row, column: SortColumn) {
  switch (column) {
    case "name":
      return compareText(a.event.name, b.event.name);
    case "category":
      return compareText(a.categoryName, b.categoryName);
    case "who":
      return compareText(a.who, b.who);
    case "schedule":
      return compareText(a.schedule, b.schedule);
    case "next":
      return (a.next ?? a.event.startDate).localeCompare(b.next ?? b.event.startDate);
    case "amount":
      return a.amount - b.amount;
  }
}

function SortHeader({
  label,
  column,
  sort,
  onCycle,
  className,
  align = "left",
}: {
  label: string;
  column: SortColumn;
  sort: SortState | null;
  onCycle: (column: SortColumn) => void;
  className: string;
  align?: "left" | "right";
}) {
  const active = sort?.column === column;
  const dir = active ? sort.dir : null;
  const ariaSort = dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none";
  const nextHint =
    dir === "asc" ? "descending" : dir === "desc" ? "original order" : "ascending";

  return (
    <th aria-sort={ariaSort} className={`${className} font-medium`}>
      <button
        type="button"
        onClick={() => onCycle(column)}
        aria-label={`Sort by ${label}, ${nextHint}`}
        className={`inline-flex w-full items-center gap-1.5 hover:text-ink ${
          align === "right" ? "justify-end" : ""
        } ${active ? "text-ink" : ""}`}
      >
        {label}
        <span className={`font-mono text-[10px] ${active ? "text-ink" : "text-muted/50"}`}>
          {dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}
        </span>
      </button>
    </th>
  );
}

export function EventTable({
  title,
  description,
  addLabel,
  emptyLabel,
  events,
  categories,
  forecast,
  currency,
  onAdd,
  onEdit,
}: Props) {
  const from = startOfDay(new Date());
  const to = addDays(from, 400);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortState | null>(null);

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  function matchesFilter(event: BudgetEvent) {
    if (filter === "all") return true;
    return event.flow === filter;
  }

  function categoryCell(event: BudgetEvent) {
    if (event.flow === "in") {
      return { name: "Income", color: "var(--teal)" };
    }
    const category = event.categoryId ? categoryById.get(event.categoryId) : undefined;
    return category
      ? { name: category.name, color: category.color }
      : { name: "Uncategorized", color: "var(--muted)" };
  }

  const rows = events
    .filter(matchesFilter)
    .map((event) => ({
      event,
      next: nextDate(event, from, to),
      categoryName: categoryCell(event).name,
      who: personLabel(event.person),
      schedule: cadenceLabel(event.cadence, event.kind),
      amount: event.flow === "in" ? event.amount : -event.amount,
    }));

  const sortedRows = [...rows].sort((a, b) => {
    const original = originalCompare(a, b);
    if (!sort) return original;
    const compared = compareColumn(a, b, sort.column);
    const directed = sort.dir === "asc" ? compared : -compared;
    return directed || original;
  });

  function cycleSort(column: SortColumn) {
    setSort((current) => {
      if (!current || current.column !== column) return { column, dir: "asc" };
      if (current.dir === "asc") return { column, dir: "desc" };
      return null;
    });
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-surface">
      <div className="flex flex-col gap-3 border-b border-rule px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h2 className="text-lg font-medium">{title}</h2>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPills value={filter} onChange={setFilter} />
          <button type="button" className="btn-solid" onClick={onAdd}>
            {addLabel}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-190 text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-muted">
              <SortHeader
                label="Event"
                column="name"
                sort={sort}
                onCycle={cycleSort}
                className="px-5 py-2"
              />
              <SortHeader
                label="Category"
                column="category"
                sort={sort}
                onCycle={cycleSort}
                className="px-3 py-2"
              />
              <SortHeader
                label="Who"
                column="who"
                sort={sort}
                onCycle={cycleSort}
                className="px-3 py-2"
              />
              <SortHeader
                label="Schedule"
                column="schedule"
                sort={sort}
                onCycle={cycleSort}
                className="px-3 py-2"
              />
              <SortHeader
                label="Next / date"
                column="next"
                sort={sort}
                onCycle={cycleSort}
                className="px-3 py-2"
              />
              <SortHeader
                label="Amount"
                column="amount"
                sort={sort}
                onCycle={cycleSort}
                className="px-5 py-2"
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-7 text-center text-sm text-muted">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              sortedRows.map(({ event, next }) => {
                const delta = event.flow === "in" ? event.amount : -event.amount;
                const category = categoryCell(event);
                return (
                  <tr
                    key={event.id}
                    className="cursor-pointer border-t border-rule/60 hover:bg-paper/70"
                    onClick={() => onEdit(event)}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium">{event.name}</p>
                      {event.notes ? (
                        <p className="mt-0.5 max-w-md truncate text-xs text-muted">
                          {event.notes}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: category.color }}
                        />
                        {category.name}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted">{personLabel(event.person)}</td>
                    <td className="px-3 py-3">{cadenceLabel(event.cadence, event.kind)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">
                      {next ? formatDate(next) : "—"}
                    </td>
                    <td
                      className={`px-5 py-3 text-right font-mono text-sm font-medium ${
                        event.flow === "in" ? "text-teal-deep" : "text-copper"
                      }`}
                    >
                      {formatMoney(delta, currency, { sign: true })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="border-t border-rule px-5 py-2 text-xs text-muted">
        {forecast.occurrences.length} cash movements across this forecast horizon
      </p>
    </section>
  );
}

function FilterPills({
  value,
  onChange,
}: {
  value: Filter;
  onChange: (value: Filter) => void;
}) {
  const pills: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "in", label: "Income" },
    { id: "out", label: "Expenses" },
  ];
  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-rule p-1">
      {pills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() => onChange(pill.id)}
          className={`rounded-full px-2.5 py-1 text-xs ${
            value === pill.id
              ? "bg-teal-deep text-on-accent"
              : "text-muted hover:text-ink"
          }`}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}
