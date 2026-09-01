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
    <section className="overflow-hidden rounded-xl border border-rule bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-lg font-medium">Events</h2>
          <p className="text-sm text-muted">
            Recurring pay, household budgets, and one-time hits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterPills value={filter} onChange={onFilter} />
          {categories.length > 0 ? (
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilter(e.target.value)}
              className="field w-auto py-1 text-xs"
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
          <button type="button" className="btn-solid" onClick={onAdd}>
            Add event
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-rule text-[11px] uppercase tracking-[0.14em] text-muted">
              <th className="px-4 py-2 font-medium sm:px-5">Name</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Who</th>
              <th className="px-3 py-2 font-medium">Cadence</th>
              <th className="px-3 py-2 font-medium">Next / date</th>
              <th className="px-4 py-2 text-right font-medium sm:px-5">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-muted">
                  {events.length === 0
                    ? "No events yet. Add salaries, rent, or a one-off like a vacation."
                    : "Nothing matches this filter."}
                </td>
              </tr>
            ) : (
              filtered.map((event) => {
                const next = nextDate(event, from, to);
                const delta = event.flow === "in" ? event.amount : -event.amount;
                const category =
                  event.flow === "out" && event.categoryId
                    ? byId.get(event.categoryId)
                    : undefined;
                return (
                  <tr
                    key={event.id}
                    className="cursor-pointer border-b border-rule/70 last:border-0 hover:bg-paper/70"
                    onClick={() => onEdit(event)}
                  >
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 h-8 w-1 shrink-0 rounded-full ${
                            event.flow === "in" ? "bg-teal" : "bg-copper"
                          }`}
                        />
                        <div>
                          <p className="font-medium">{event.name}</p>
                          {event.notes ? (
                            <p className="mt-0.5 max-w-sm truncate text-muted">
                              {event.notes}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {category ? (
                        <span className="inline-flex items-center gap-1.5 text-muted">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: category.color }}
                          />
                          {category.name}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted">{personLabel(event.person)}</td>
                    <td className="px-3 py-3">{cadenceLabel(event.cadence, event.kind)}</td>
                    <td className="px-3 py-3 font-mono text-[13px] text-muted">
                      {next ? formatDate(next) : "—"}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-mono text-[13px] font-medium sm:px-5 ${
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
        {forecast.occurrences.length} cash movements in this horizon · click a row to
        edit
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
