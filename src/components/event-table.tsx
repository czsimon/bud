"use client";

import { addDays, formatISO, startOfDay } from "date-fns";
import { useState } from "react";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmptyRow,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
  DataTableViewport,
} from "@/components/data-table";
import { ManagementHeader } from "@/components/management-ui";
import { eventOccurrences } from "@/lib/forecast";
import {
  cadenceLabel,
  categoryColor,
  eventAmount,
  formatDate,
  formatDateRange,
  formatMoney,
  type BudgetEvent,
  type Category,
} from "@/lib/types";

type Filter = "all" | "in" | "out";
type SortColumn = "name" | "category" | "schedule" | "next" | "amount";
type SortDir = "asc" | "desc";
type SortState = { column: SortColumn; dir: SortDir };

type Row = {
  event: BudgetEvent;
  next: string | null;
  categoryName: string;
  categoryFill: string;
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
    case "schedule":
      return compareText(a.schedule, b.schedule);
    case "next":
      return (a.next ?? a.event.startDate).localeCompare(
        b.next ?? b.event.startDate,
      );
    case "amount":
      return a.amount - b.amount;
  }
}

function SortHeader({
  label,
  column,
  sort,
  onCycle,
  pad,
  align = "left",
}: {
  label: string;
  column: SortColumn;
  sort: SortState | null;
  onCycle: (column: SortColumn) => void;
  pad?: "cell" | "edge";
  align?: "left" | "right";
}) {
  const active = sort?.column === column;
  const dir = active ? sort.dir : null;
  const ariaSort =
    dir === "asc" ? "ascending" : dir === "desc" ? "descending" : "none";
  const nextHint =
    dir === "asc"
      ? "descending"
      : dir === "desc"
        ? "original order"
        : "ascending";

  return (
    <DataTableHead aria-sort={ariaSort} pad={pad}>
      <button
        type="button"
        onClick={() => onCycle(column)}
        aria-label={`Sort by ${label}, ${nextHint}`}
        className={`inline-flex w-full items-center gap-1.5 hover:text-ink ${
          align === "right" ? "justify-end" : ""
        } ${active ? "text-ink" : ""}`}
      >
        {label}
        <span
          className={`font-mono text-[10px] ${active ? "text-ink" : "text-muted/50"}`}
        >
          {dir === "asc" ? "↑" : dir === "desc" ? "↓" : "↕"}
        </span>
      </button>
    </DataTableHead>
  );
}

export function EventTable({
  title,
  description,
  addLabel,
  emptyLabel,
  events,
  categories,
  currency,
  onAdd,
  onEdit,
}: Props) {
  const from = startOfDay(new Date());
  const to = addDays(from, 400);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<SortState | null>(null);

  const categoryById = new Map(
    categories.map((category) => [category.id, category]),
  );

  function matchesFilter(event: BudgetEvent) {
    if (filter === "all") return true;
    if (event.kind === "balance") return false;
    return event.flow === filter;
  }

  function categoryCell(event: BudgetEvent) {
    if (event.kind === "balance") {
      return { name: "Balance", color: "var(--teal-deep)" };
    }
    const category = event.categoryId
      ? categoryById.get(event.categoryId)
      : undefined;
    return category
      ? { name: category.name, color: categoryColor(category.color) }
      : { name: "Uncategorized", color: "var(--muted)" };
  }

  const rows = events.filter(matchesFilter).map((event) => {
    const category = categoryCell(event);
    const amount = eventAmount(event);
    return {
      event,
      next: nextDate(event, from, to),
      categoryName: category.name,
      categoryFill: category.color,
      schedule: cadenceLabel(event.cadence, event.kind),
      amount:
        event.kind === "balance" || event.flow === "in" ? amount : -amount,
    };
  });

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
    <section className="@container flex min-h-0 flex-col overflow-hidden rounded-lg border border-rule bg-surface xl:h-full">
      <ManagementHeader
        title={title}
        description={description}
        aside={<FilterPills value={filter} onChange={setFilter} />}
        action={
          <button type="button" className="btn-solid" onClick={onAdd}>
            {addLabel}
          </button>
        }
      />

      <DataTableViewport>
        <DataTable className="min-w-125">
          <DataTableHeader>
            <SortHeader
              label="Event"
              column="name"
              sort={sort}
              onCycle={cycleSort}
              pad="edge"
            />
            <SortHeader
              label="Category"
              column="category"
              sort={sort}
              onCycle={cycleSort}
            />
            <SortHeader
              label="Schedule"
              column="schedule"
              sort={sort}
              onCycle={cycleSort}
            />
            <SortHeader
              label="Next / date"
              column="next"
              sort={sort}
              onCycle={cycleSort}
            />
            <SortHeader
              label="Amount"
              column="amount"
              sort={sort}
              onCycle={cycleSort}
              pad="edge"
              align="right"
            />
          </DataTableHeader>
          <DataTableBody>
            {sortedRows.length === 0 ? (
              <DataTableEmptyRow colSpan={5}>{emptyLabel}</DataTableEmptyRow>
            ) : (
              sortedRows.map(
                ({ event, next, categoryName, categoryFill, amount }) => {
                  const isBalance = event.kind === "balance";
                  const when =
                    event.kind === "one_off" || isBalance
                      ? formatDateRange(event.startDate, event.endDate)
                      : next
                        ? formatDate(next)
                        : "—";
                  return (
                    <DataTableRow
                      key={event.id}
                      interactive
                      onClick={() => onEdit(event)}
                    >
                      <DataTableCell pad="edge">
                        <p className="font-medium">{event.name}</p>
                        {event.lineItems.length > 0 ? (
                          <p className="mt-0.5 max-w-md truncate text-xs text-muted">
                            {event.lineItems
                              .map((item) => item.name)
                              .join(" · ")}
                          </p>
                        ) : null}
                        {event.notes ? (
                          <p className="mt-0.5 max-w-md truncate text-xs text-muted">
                            {event.notes}
                          </p>
                        ) : null}
                      </DataTableCell>
                      <DataTableCell>
                        <span
                          className="inline-flex items-center gap-2 w-full rounded-sm px-2 py-1 text-xs font-medium"
                          style={{
                            background: categoryFill,
                            color: "var(--paper)",
                          }}
                        >
                          {categoryName}
                        </span>
                      </DataTableCell>
                      <DataTableCell>
                        {cadenceLabel(event.cadence, event.kind)}
                      </DataTableCell>
                      <DataTableCell className="font-mono text-xs text-muted">
                        {when}
                      </DataTableCell>
                      <DataTableCell
                        pad="edge"
                        className={`text-right font-mono text-xs font-medium ${
                          isBalance
                            ? "text-ink"
                            : event.flow === "in"
                              ? "text-teal-deep"
                              : "text-copper"
                        }`}
                      >
                        {isBalance
                          ? formatMoney(amount, currency)
                          : formatMoney(amount, currency, { sign: true })}
                      </DataTableCell>
                    </DataTableRow>
                  );
                },
              )
            )}
          </DataTableBody>
        </DataTable>
      </DataTableViewport>
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
