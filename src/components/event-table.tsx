"use client";

import { addDays, formatISO, startOfDay } from "date-fns";
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

type Filter = "all" | "in" | "out" | "recurring" | "one_off";

type Props = {
  events: BudgetEvent[];
  categories: Category[];
  forecast: Forecast;
  currency: string;
  filter: Filter;
  categoryFilter: string;
  onFilter: (filter: Filter) => void;
  onCategoryFilter: (id: string) => void;
  onAdd: () => void;
  onEdit: (event: BudgetEvent) => void;
};

function nextDate(event: BudgetEvent, from: Date, to: Date): string | null {
  const dates = eventOccurrences(event, from, to);
  return dates[0]
    ? formatISO(dates[0], { representation: "date" })
    : event.startDate;
}

export function EventTable({
  events,
  categories,
  forecast,
  currency,
  filter,
  categoryFilter,
  onFilter,
  onCategoryFilter,
  onAdd,
  onEdit,
}: Props) {
  const from = startOfDay(new Date());
  const to = addDays(from, 400);
  const byId = new Map(categories.map((c) => [c.id, c]));

  const filtered = events.filter((event) => {
    if (filter === "all") {
      /* keep */
    } else if (filter === "in" || filter === "out") {
      if (event.flow !== filter) return false;
    } else if (event.kind !== filter) {
      return false;
    }
    if (categoryFilter && event.categoryId !== categoryFilter) return false;
    return true;
  });

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-rule bg-surface lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)]">
      <div className="flex flex-col gap-3 border-b border-rule px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium">Events</h2>
            <p className="text-sm text-muted">Pay, budgets, and one-offs.</p>
          </div>
          <button type="button" className="btn-solid shrink-0" onClick={onAdd}>
            Add
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPills value={filter} onChange={onFilter} />
          {categories.length > 0 ? (
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilter(e.target.value)}
              className="field w-full py-1 text-xs"
              aria-label="Filter by category"
            >
              <option value="">All categories</option>
              {[...categories]
                .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-muted">
            {events.length === 0
              ? "No events yet. Add salaries, rent, or a one-off like a vacation."
              : "Nothing matches this filter."}
          </p>
        ) : (
          <ul>
            {filtered.map((event) => {
              const next = nextDate(event, from, to);
              const delta = event.flow === "in" ? event.amount : -event.amount;
              const category =
                event.flow === "out" && event.categoryId
                  ? byId.get(event.categoryId)
                  : undefined;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    className="flex w-full items-start gap-3 border-b border-rule/70 px-4 py-3 text-left hover:bg-paper/70"
                    onClick={() => onEdit(event)}
                  >
                    <span
                      className={`mt-1 h-8 w-1 shrink-0 rounded-full ${
                        event.flow === "in" ? "bg-teal" : "bg-copper"
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-medium">{event.name}</span>
                        <span
                          className={`shrink-0 font-mono text-[13px] font-medium ${
                            event.flow === "in" ? "text-teal-deep" : "text-copper"
                          }`}
                        >
                          {formatMoney(delta, currency, { sign: true })}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {category ? `${category.name} · ` : ""}
                        {cadenceLabel(event.cadence, event.kind)}
                        {next ? ` · ${formatDate(next)}` : ""}
                        {` · ${personLabel(event.person)}`}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <p className="border-t border-rule px-4 py-2 text-xs text-muted">
        {forecast.occurrences.length} cash movements in this horizon
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
    { id: "recurring", label: "Repeating" },
    { id: "one_off", label: "One-off" },
  ];
  return (
    <div className="flex flex-wrap gap-1 rounded-full border border-rule p-1">
      {pills.map((pill) => (
        <button
          key={pill.id}
          type="button"
          onClick={() => onChange(pill.id)}
          className={`rounded-full px-2.5 py-1 text-xs ${
            value === pill.id ? "bg-teal-deep text-surface" : "text-muted hover:text-ink"
          }`}
        >
          {pill.label}
        </button>
      ))}
    </div>
  );
}
