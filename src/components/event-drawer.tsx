"use client";

import { useEffect, useId, useState } from "react";
import { CADENCES } from "@/lib/types";
import { cadenceLabel } from "@/lib/format";
import type { BudgetEvent, Cadence, EventDraft, EventKind, Flow } from "@/lib/types";

type Props = {
  open: boolean;
  event: BudgetEvent | null;
  onClose: () => void;
  onSave: (draft: EventDraft) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
};

const emptyDraft = (): EventDraft => ({
  name: "",
  amount: 0,
  flow: "out",
  kind: "recurring",
  cadence: "monthly",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: null,
  person: "shared",
  notes: "",
});

export function EventDrawer({ open, event, onClose, onSave, onDelete }: Props) {
  const titleId = useId();
  const [draft, setDraft] = useState<EventDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (event) {
      setDraft({ ...event });
    } else {
      setDraft(emptyDraft());
    }
  }, [open, event]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!draft.name.trim()) {
      setError("Give this event a name.");
      return;
    }
    if (!(draft.amount > 0)) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (draft.kind === "recurring" && !draft.cadence) {
      setError("Pick how often this repeats.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...draft,
        name: draft.name.trim(),
        notes: draft.notes?.trim() || null,
        person: draft.person?.trim() || null,
        endDate: draft.kind === "one_off" ? null : draft.endDate || null,
        cadence: draft.kind === "one_off" ? null : draft.cadence,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this event.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        className="absolute inset-0 bg-ink/25"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-labelledby={titleId}
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-rule bg-surface shadow-xl"
      >
        <header className="border-b border-rule px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Ledger line
          </p>
          <h2 id={titleId} className="mt-1 text-xl font-medium">
            {event ? "Edit event" : "New event"}
          </h2>
        </header>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            <Field label="Name">
              <input
                autoFocus
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Partner salary, rent, vacation…"
                className="field"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Direction">
                <Segmented
                  value={draft.flow}
                  onChange={(flow) => setDraft({ ...draft, flow: flow as Flow })}
                  options={[
                    { value: "in", label: "Income" },
                    { value: "out", label: "Expense" },
                  ]}
                />
              </Field>
              <Field label="Amount">
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={draft.amount || ""}
                  onChange={(e) =>
                    setDraft({ ...draft, amount: Number(e.target.value) })
                  }
                  className="field font-mono"
                />
              </Field>
            </div>

            <Field label="Schedule">
              <Segmented
                value={draft.kind}
                onChange={(kind) =>
                  setDraft({
                    ...draft,
                    kind: kind as EventKind,
                    cadence:
                      kind === "one_off"
                        ? null
                        : draft.cadence ?? "monthly",
                  })
                }
                options={[
                  { value: "recurring", label: "Repeats" },
                  { value: "one_off", label: "Once" },
                ]}
              />
            </Field>

            {draft.kind === "recurring" ? (
              <Field label="Cadence">
                <select
                  value={draft.cadence ?? "monthly"}
                  onChange={(e) =>
                    setDraft({ ...draft, cadence: e.target.value as Cadence })
                  }
                  className="field"
                >
                  {CADENCES.map((c) => (
                    <option key={c} value={c}>
                      {cadenceLabel(c, "recurring")}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <Field label={draft.kind === "one_off" ? "Date" : "Starts"}>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
                  className="field"
                />
              </Field>
              {draft.kind === "recurring" ? (
                <Field label="Ends (optional)">
                  <input
                    type="date"
                    value={draft.endDate ?? ""}
                    onChange={(e) =>
                      setDraft({ ...draft, endDate: e.target.value || null })
                    }
                    className="field"
                  />
                </Field>
              ) : (
                <div />
              )}
            </div>

            <Field label="Who">
              <select
                value={draft.person ?? "shared"}
                onChange={(e) => setDraft({ ...draft, person: e.target.value })}
                className="field"
              >
                <option value="you">You</option>
                <option value="partner">Partner</option>
                <option value="shared">Shared / household</option>
              </select>
            </Field>

            <Field label="Notes">
              <textarea
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                rows={3}
                placeholder="Anything you want to remember"
                className="field resize-none"
              />
            </Field>

            {error ? (
              <p className="text-sm text-warn" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <footer className="flex items-center justify-between gap-3 border-t border-rule px-5 py-4">
            {event && onDelete ? (
              <button
                type="button"
                className="text-sm text-warn hover:underline"
                onClick={async () => {
                  if (!confirm(`Remove “${event.name}” from the ledger?`)) return;
                  await onDelete(event.id);
                  onClose();
                }}
              >
                Delete
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-solid" disabled={saving}>
                {saving ? "Saving…" : "Save event"}
              </button>
            </div>
          </footer>
        </form>
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      {children}
    </label>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="grid grid-cols-2 rounded-md border border-rule bg-paper p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-[5px] px-2 py-1.5 text-sm ${
            value === opt.value
              ? "bg-surface text-ink shadow-sm"
              : "text-muted hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
