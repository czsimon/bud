"use client";

import { useId, useState } from "react";
import { EditorSidebar } from "@/components/management-ui";
import {
  CADENCES,
  cadenceLabel,
  categoryColor,
  currencySymbol,
  eventAmount,
  formatDate,
  formatDateRange,
  formatMoney,
  isCompleteDate,
  monthlyEquivalent,
  roundMoney,
  type BudgetEvent,
  type Cadence,
  type Category,
  type EventDraft,
  type EventKind,
  type EventLineItem,
  type Flow,
} from "@/lib/types";

type Props = {
  event: BudgetEvent | null;
  categories: Category[];
  initialKind?: EventKind;
  onClose: () => void;
  onSave: (draft: EventDraft) => Promise<void> | void;
  onCreateCategory: (name: string) => Promise<Category>;
  onDelete?: (id: string) => Promise<void> | void;
  currency?: string;
};

type Errors = {
  name?: string;
  amount?: string;
  dates?: string;
  category?: string;
  form?: string;
};

const newLineItem = (amount = 0): EventLineItem => ({
  id: crypto.randomUUID(),
  name: "",
  amount,
});

const emptyDraft = (kind: EventKind = "recurring"): EventDraft => ({
  name: "",
  amount: 0,
  lineItems: [],
  flow: "out",
  kind,
  cadence: kind === "recurring" ? "monthly" : null,
  startDate: new Date().toISOString().slice(0, 10),
  endDate: null,
  notes: "",
  categoryId: null,
});

export function EventEditor({
  event,
  categories,
  initialKind,
  onClose,
  onSave,
  onCreateCategory,
  onDelete,
  currency = "USD",
}: Props) {
  const [draft, setDraft] = useState<EventDraft>(() =>
    event
      ? { ...event, lineItems: event.lineItems ?? [] }
      : emptyDraft(initialKind ?? "recurring"),
  );
  const [itemized, setItemized] = useState(
    () => (event?.lineItems.length ?? 0) > 0,
  );
  const [showEnd, setShowEnd] = useState(() => Boolean(event?.endDate));
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);

  const symbol = currencySymbol(currency);
  const isBalance = draft.kind === "balance";
  const noun =
    draft.kind === "recurring"
      ? "budget line"
      : isBalance
        ? "balance"
        : "event";
  const total = itemized
    ? eventAmount({ amount: 0, lineItems: draft.lineItems })
    : draft.amount;
  const signedTotal = isBalance
    ? total
    : draft.flow === "in"
      ? total
      : -total;
  const monthly = monthlyEquivalent({
    amount: total,
    lineItems: [],
    flow: draft.flow,
    kind: draft.kind,
    cadence: draft.cadence,
  });
  const sortedCategories = [...categories].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name),
  );

  function patch(changes: Partial<EventDraft>) {
    setDraft((current) => ({ ...current, ...changes }));
  }

  function updateItem(id: string, changes: Partial<EventLineItem>) {
    patch({
      lineItems: draft.lineItems.map((item) =>
        item.id === id ? { ...item, ...changes } : item,
      ),
    });
  }

  function addItem() {
    const item = newLineItem();
    setFocusItemId(item.id);
    patch({ lineItems: [...draft.lineItems, item] });
  }

  function removeItem(id: string) {
    const remaining = draft.lineItems.filter((item) => item.id !== id);
    patch({ lineItems: remaining.length > 0 ? remaining : [newLineItem()] });
  }

  function setItemizedMode(next: boolean) {
    setItemized(next);
    setErrors({ ...errors, amount: undefined });
    if (next) {
      patch({
        lineItems:
          draft.lineItems.length > 0
            ? draft.lineItems
            : [newLineItem(draft.amount)],
      });
    } else {
      patch({
        amount: eventAmount({
          amount: draft.amount,
          lineItems: draft.lineItems,
        }),
        lineItems: [],
      });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const name = draft.name.trim();
    const lineItems =
      draft.kind === "balance"
        ? []
        : itemized
          ? draft.lineItems
              .map((item) => ({
                ...item,
                name: item.name.trim(),
                amount: roundMoney(item.amount),
              }))
              .filter((item) => item.name.length > 0 && item.amount > 0)
          : [];
    const amount =
      draft.kind === "balance"
        ? roundMoney(draft.amount)
        : itemized
          ? eventAmount({ amount: 0, lineItems })
          : roundMoney(draft.amount);
    const endDate =
      draft.kind === "recurring" && isCompleteDate(draft.endDate)
        ? draft.endDate
        : null;

    const nextErrors: Errors = {};
    if (!name) nextErrors.name = "Give this line a name so you recognize it later.";
    if (draft.kind !== "balance" && !(amount > 0)) {
      nextErrors.amount = itemized
        ? "Every item needs a name and an amount above zero."
        : "Enter an amount above zero.";
    }
    if (draft.kind === "balance" && !Number.isFinite(amount)) {
      nextErrors.amount = "Enter the balance on that date.";
    }
    if (!isCompleteDate(draft.startDate)) {
      nextErrors.dates = "Pick a start date.";
    } else if (endDate && endDate < draft.startDate) {
      nextErrors.dates = "The end date comes before the start date.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await onSave({
        ...draft,
        name,
        amount,
        lineItems,
        notes: draft.notes?.trim() || null,
        categoryId:
          draft.kind === "balance" ? null : draft.categoryId || null,
        endDate,
        cadence: draft.kind === "recurring" ? draft.cadence : null,
      });
      onClose();
    } catch (err) {
      setErrors({
        form:
          err instanceof Error ? err.message : `Could not save this ${noun}.`,
      });
    } finally {
      setSaving(false);
    }
  }

  const whenSummary =
    draft.kind === "balance"
      ? isCompleteDate(draft.startDate)
        ? `Set to ${formatMoney(total, currency)} on ${formatDate(draft.startDate)}`
        : "Pick a date"
      : draft.kind === "one_off"
      ? isCompleteDate(draft.startDate)
        ? formatDateRange(draft.startDate, showEnd ? draft.endDate : null)
        : "Pick a date"
      : `${cadenceLabel(draft.cadence, "recurring")}${
          isCompleteDate(draft.startDate)
            ? ` from ${formatDate(draft.startDate)}`
            : ""
        }${
          showEnd && isCompleteDate(draft.endDate)
            ? ` until ${formatDate(draft.endDate)}`
            : ""
        }`;

  return (
    <EditorSidebar
      eyebrow={
        isBalance
          ? "Known balance"
          : draft.flow === "in"
            ? "Money in"
            : "Money out"
      }
      title={event ? `Edit ${noun}` : `New ${noun}`}
      onClose={onClose}
    >
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
              <Section title="What is it">
                <Field label="Name" error={errors.name}>
                  <input
                    autoFocus
                    value={draft.name}
                    onChange={(e) => patch({ name: e.target.value })}
                    placeholder={
                      isBalance ? "March statement, known checking…" : "Trip to Bermuda"
                    }
                    aria-invalid={errors.name ? true : undefined}
                    className="field"
                  />
                </Field>

                {isBalance ? null : (
                <Group label="Direction">
                  <Segmented
                    value={draft.flow}
                    onChange={(flow) => patch({ flow: flow as Flow })}
                    options={[
                      { value: "in", label: "Income" },
                      { value: "out", label: "Expense" },
                    ]}
                  />
                </Group>
                )}
              </Section>

              <Section
                title={isBalance ? "Balance" : "How much"}
                hint={
                  isBalance
                    ? "Whatever the forecast thought net worth would be, it becomes this instead."
                    : itemized
                      ? "Each item adds up to the total below."
                      : "One price for the whole thing."
                }
                action={
                  isBalance ? undefined : (
                  <Segmented
                    size="sm"
                    value={itemized ? "itemized" : "single"}
                    onChange={(value) => setItemizedMode(value === "itemized")}
                    options={[
                      { value: "single", label: "Single price" },
                      { value: "itemized", label: "Itemized" },
                    ]}
                  />
                  )
                }
              >
                {itemized && !isBalance ? (
                  <div>
                    <div className="overflow-hidden rounded-lg border border-rule">
                      <div className="grid grid-cols-[1fr_6.5rem_2.25rem] items-center gap-2 border-b border-rule bg-paper px-3 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted sm:grid-cols-[1fr_8.5rem_2.25rem]">
                        <span>Item</span>
                        <span className="text-right">Amount</span>
                        <span aria-hidden />
                      </div>
                      {draft.lineItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="grid grid-cols-[1fr_6.5rem_2.25rem] items-center gap-2 border-b border-rule/60 px-3 py-1 sm:grid-cols-[1fr_8.5rem_2.25rem]"
                        >
                          <input
                            autoFocus={item.id === focusItemId}
                            value={item.name}
                            onChange={(e) =>
                              updateItem(item.id, { name: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addItem();
                              }
                            }}
                            placeholder={
                              index === 0 ? "Flights" : "Hotel, food, tickets…"
                            }
                            aria-label={`Item ${index + 1} name`}
                            className="cell-input"
                          />
                          <MoneyInput
                            variant="cell"
                            symbol={symbol}
                            value={item.amount}
                            onValueChange={(amount) =>
                              updateItem(item.id, { amount })
                            }
                            onEnter={addItem}
                            ariaLabel={`Item ${index + 1} amount`}
                          />
                          <button
                            type="button"
                            className="icon-btn icon-btn-danger"
                            aria-label={`Remove ${item.name || `item ${index + 1}`}`}
                            onClick={() => removeItem(item.id)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <button
                          type="button"
                          className="text-sm font-medium text-teal-deep hover:underline"
                          onClick={addItem}
                        >
                          + Add item
                        </button>
                        <p className="flex items-baseline gap-2">
                          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
                            Total
                          </span>
                          <span className="font-mono text-base font-medium">
                            {formatMoney(total, currency)}
                          </span>
                        </p>
                      </div>
                    </div>
                    {errors.amount ? (
                      <p role="alert" className="mt-1.5 text-xs text-warn">
                        {errors.amount}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <Field
                    label={isBalance ? "Net worth on that date" : "Amount"}
                    error={errors.amount}
                  >
                    <MoneyInput
                      size="lg"
                      symbol={symbol}
                      value={draft.amount}
                      allowNegative={isBalance}
                      onValueChange={(amount) => patch({ amount })}
                      invalid={Boolean(errors.amount)}
                    />
                  </Field>
                )}
              </Section>

              <Section title="When">
                <Group label="Schedule">
                  <Segmented
                    value={draft.kind}
                    onChange={(kind) => {
                      const next = kind as EventKind;
                      setItemized(next === "balance" ? false : itemized);
                      setShowEnd(next === "recurring" ? showEnd : false);
                      patch({
                        kind: next,
                        cadence: next === "recurring" ? (draft.cadence ?? "monthly") : null,
                        endDate: next === "recurring" ? draft.endDate : null,
                        lineItems: next === "balance" ? [] : draft.lineItems,
                        categoryId: next === "balance" ? null : draft.categoryId,
                      });
                    }}
                    options={[
                      { value: "recurring", label: "Repeats" },
                      { value: "one_off", label: "One time" },
                      { value: "balance", label: "Balance" },
                    ]}
                  />
                </Group>

                {draft.kind === "recurring" ? (
                  <Field label="How often">
                    <select
                      value={draft.cadence ?? "monthly"}
                      onChange={(e) =>
                        patch({ cadence: e.target.value as Cadence })
                      }
                      className="field"
                    >
                      {CADENCES.map((cadence) => (
                        <option key={cadence} value={cadence}>
                          {cadenceLabel(cadence, "recurring")}
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label={draft.kind === "recurring" ? "Starts" : "Date"}
                    error={errors.dates}
                  >
                    <input
                      type="date"
                      value={draft.startDate}
                      onChange={(e) => patch({ startDate: e.target.value })}
                      aria-invalid={errors.dates ? true : undefined}
                      className="field"
                    />
                  </Field>
                  {showEnd && !isBalance ? (
                    <div className="flex items-end gap-2">
                      <div className="min-w-0 flex-1">
                        <Field label="Ends">
                          <input
                            type="date"
                            value={draft.endDate ?? ""}
                            min={draft.startDate}
                            onChange={(e) =>
                              patch({ endDate: e.target.value || null })
                            }
                            className="field"
                          />
                        </Field>
                      </div>
                      <button
                        type="button"
                        className="icon-btn mb-0.5"
                        aria-label="Remove end date"
                        onClick={() => {
                          setShowEnd(false);
                          patch({ endDate: null });
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : null}
                </div>

                {showEnd || isBalance ? null : (
                  <button
                    type="button"
                    className="text-sm font-medium text-teal-deep hover:underline"
                    onClick={() => setShowEnd(true)}
                  >
                    {draft.kind === "recurring"
                      ? "+ Add an end date"
                      : "+ Spans several days"}
                  </button>
                )}
              </Section>

              {!isBalance ? (
                <Section
                  title="Category"
                  hint="Optional. Groups this with other lines that share a label."
                >
                  <div
                    role="group"
                    aria-label="Category"
                    className="flex flex-wrap gap-2"
                  >
                    <button
                      type="button"
                      className="chip"
                      aria-pressed={!draft.categoryId}
                      onClick={() => patch({ categoryId: null })}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: "var(--muted)" }}
                      />
                      Uncategorized
                    </button>
                    {sortedCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        className="chip"
                        aria-pressed={draft.categoryId === category.id}
                        onClick={() => patch({ categoryId: category.id })}
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ background: categoryColor(category.color) }}
                        />
                        {category.name}
                      </button>
                    ))}
                    {showCategoryInput ? null : (
                      <button
                        type="button"
                        className="chip"
                        onClick={() => setShowCategoryInput(true)}
                      >
                        + New category
                      </button>
                    )}
                  </div>

                  {showCategoryInput ? (
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.preventDefault();
                        }}
                        placeholder="Travel"
                        aria-label="New category name"
                        className="field flex-1"
                      />
                      <button
                        type="button"
                        className="btn-solid shrink-0"
                        disabled={addingCategory}
                        onClick={async () => {
                          const trimmed = newCategoryName.trim();
                          if (!trimmed) {
                            setErrors({
                              ...errors,
                              category: "Name the new category first.",
                            });
                            return;
                          }
                          setAddingCategory(true);
                          setErrors({ ...errors, category: undefined });
                          try {
                            const created = await onCreateCategory(trimmed);
                            patch({ categoryId: created.id });
                            setNewCategoryName("");
                            setShowCategoryInput(false);
                          } catch (err) {
                            setErrors({
                              ...errors,
                              category:
                                err instanceof Error
                                  ? err.message
                                  : "Could not add that category.",
                            });
                          } finally {
                            setAddingCategory(false);
                          }
                        }}
                      >
                        {addingCategory ? "Adding…" : "Add"}
                      </button>
                      <button
                        type="button"
                        className="btn-ghost shrink-0"
                        onClick={() => {
                          setShowCategoryInput(false);
                          setNewCategoryName("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : null}

                  {errors.category ? (
                    <p role="alert" className="text-xs text-warn">
                      {errors.category}
                    </p>
                  ) : null}
                </Section>
              ) : null}

              <Section title="Details">
                <Field label="Notes" hint="Optional. Only you see this.">
                  <textarea
                    value={draft.notes ?? ""}
                    onChange={(e) => patch({ notes: e.target.value })}
                    rows={3}
                    placeholder="Booking reference, cancellation date…"
                    className="field resize-none"
                  />
                </Field>
              </Section>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-4 border-t border-rule bg-paper px-5 py-3 sm:px-6">
            <p className="min-w-0 truncate text-xs text-muted">{whenSummary}</p>
            <p className="flex shrink-0 items-baseline gap-2">
              <span
                className={`font-mono text-sm font-medium ${
                  isBalance
                    ? "text-ink"
                    : draft.flow === "in"
                      ? "text-teal-deep"
                      : "text-copper"
                }`}
              >
                {isBalance
                  ? formatMoney(signedTotal, currency)
                  : formatMoney(signedTotal, currency, { sign: true })}
              </span>
              {draft.kind === "recurring" && draft.cadence !== "monthly" ? (
                <span className="text-xs text-muted">
                  ≈ {formatMoney(monthly, currency, { sign: true })} a month
                </span>
              ) : null}
            </p>
          </div>

          {errors.form ? (
            <p
              role="alert"
              className="shrink-0 border-t border-warn/40 px-5 py-2.5 text-sm text-warn sm:px-6"
            >
              {errors.form}
            </p>
          ) : null}

          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-rule px-5 py-4 sm:px-6">
            {event && onDelete ? (
              confirmingDelete ? (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted">Delete this {noun}?</span>
                  <button
                    type="button"
                    className="font-medium text-warn hover:underline"
                    onClick={async () => {
                      try {
                        await onDelete(event.id);
                        onClose();
                      } catch (err) {
                        setConfirmingDelete(false);
                        setErrors({
                          form:
                            err instanceof Error
                              ? err.message
                              : `Could not delete this ${noun}.`,
                        });
                      }
                    }}
                  >
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    className="text-muted hover:text-ink"
                    onClick={() => setConfirmingDelete(false)}
                  >
                    Keep
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="text-sm text-muted hover:text-warn"
                  onClick={() => setConfirmingDelete(true)}
                >
                  Delete
                </button>
              )
            ) : (
              <span />
            )}
            <div className="flex shrink-0 gap-2">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-solid" disabled={saving}>
                {saving ? "Saving…" : `Save ${noun}`}
              </button>
            </div>
          </footer>
        </form>
    </EditorSidebar>
  );
}

/** Keeps its own text so partial entries like "0." survive a keystroke. */
function MoneyInput({
  value,
  onValueChange,
  symbol,
  size = "md",
  variant = "shell",
  invalid = false,
  ariaLabel,
  onEnter,
  allowNegative = false,
}: {
  value: number;
  onValueChange: (value: number) => void;
  symbol: string;
  size?: "md" | "lg";
  variant?: "shell" | "cell";
  invalid?: boolean;
  ariaLabel?: string;
  onEnter?: () => void;
  allowNegative?: boolean;
}) {
  const [text, setText] = useState(() => (value === 0 ? "" : String(value)));

  const input = (
    <input
      type="number"
      inputMode="decimal"
      min={allowNegative ? undefined : "0"}
      step="0.01"
      placeholder="0.00"
      value={text}
      aria-label={ariaLabel}
      aria-invalid={invalid ? true : undefined}
      onChange={(e) => {
        setText(e.target.value);
        const parsed = Number(e.target.value);
        if (!Number.isFinite(parsed)) {
          onValueChange(0);
          return;
        }
        if (!allowNegative && parsed < 0) {
          onValueChange(0);
          return;
        }
        onValueChange(parsed);
      }}
      onKeyDown={(e) => {
        if (onEnter && e.key === "Enter") {
          e.preventDefault();
          onEnter();
        }
      }}
      className={
        variant === "cell"
          ? "cell-input text-right font-mono"
          : `money-input ${size === "lg" ? "money-input-lg" : ""}`
      }
    />
  );

  if (variant === "cell") {
    return (
      <div className="flex items-center gap-1">
        <span className="money-symbol text-sm" aria-hidden>
          {symbol}
        </span>
        {input}
      </div>
    );
  }

  return (
    <div
      className={`money-shell ${size === "lg" ? "money-shell-lg" : ""}`}
      data-invalid={invalid ? "true" : undefined}
    >
      <span
        className={`money-symbol ${size === "lg" ? "text-xl" : ""}`}
        aria-hidden
      >
        {symbol}
      </span>
      {input}
    </div>
  );
}

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-rule px-5 py-5 last:border-b-0 sm:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            {title}
          </h3>
          {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
      </span>
      {hint ? (
        <span className="mb-1.5 block text-xs text-muted">{hint}</span>
      ) : null}
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-xs text-warn">
          {error}
        </span>
      ) : null}
    </label>
  );
}

/** Labelled wrapper for controls that aren't a single form element. */
function Group({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const labelId = useId();
  return (
    <div role="group" aria-labelledby={labelId}>
      <span
        id={labelId}
        className="mb-1.5 block text-[13px] font-medium text-ink"
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
  size = "md",
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  size?: "sm" | "md";
}) {
  return (
    <div
      className="grid gap-0.5 rounded-lg border border-rule bg-paper p-0.5"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md whitespace-nowrap ${
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-2 text-sm"
          } ${
            value === option.value
              ? "bg-surface font-medium text-ink shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
