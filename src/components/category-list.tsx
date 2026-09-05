"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_COLORS,
  formatMoney,
  monthlyEquivalent,
  type BudgetEvent,
  type Category,
  type CategoryDraft,
} from "@/lib/types";

type Props = {
  categories: Category[];
  events: BudgetEvent[];
  currency: string;
  onSave: (draft: CategoryDraft) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

export function CategoryList({
  categories,
  events,
  currency,
  onSave,
  onDelete,
}: Props) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const rows = useMemo(() => {
    const sorted = [...categories].sort(
      (a, b) => a.position - b.position || a.name.localeCompare(b.name),
    );
    return sorted.map((category) => {
      const linked = events.filter((event) => event.categoryId === category.id);
      const monthly = linked.reduce((sum, event) => sum + monthlyEquivalent(event), 0);
      return { category, count: linked.length, monthly };
    });
  }, [categories, events]);

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError("Give the category a name.");
      return;
    }
    if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      setError("That category already exists.");
      return;
    }
    setError(null);
    const position =
      categories.reduce((max, category) => Math.max(max, category.position), -1) + 1;
    await onSave({ name, color: newColor, position });
    setNewName("");
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditColor(category.color);
    setError(null);
  }

  async function commitEdit() {
    if (!editingId) return;
    const current = categories.find((category) => category.id === editingId);
    if (!current) return;
    const name = editName.trim();
    if (!name) {
      setError("Give the category a name.");
      return;
    }
    const clash = categories.some(
      (category) =>
        category.id !== editingId && category.name.toLowerCase() === name.toLowerCase(),
    );
    if (clash) {
      setError("That category already exists.");
      return;
    }
    setError(null);
    await onSave({
      id: current.id,
      name,
      color: editColor,
      position: current.position,
    });
    setEditingId(null);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-surface">
      <div className="border-b border-rule px-4 py-4 sm:px-5">
        <h2 className="text-lg font-medium">Categories</h2>
        <p className="text-sm text-muted">
          Labels for expenses. Monthly totals come from recurring lines in each category.
        </p>
      </div>

      <form
        onSubmit={(e) => void addCategory(e)}
        className="flex flex-wrap items-center gap-2 border-b border-rule bg-paper/30 px-4 py-3 sm:px-5"
      >
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          New category
        </span>
        <ColorSwatches value={newColor} onChange={setNewColor} />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Utilities, Home, Baby…"
          className="field min-w-44 flex-1 py-1.5"
        />
        <button type="submit" className="btn-ghost py-1.5">
          Add category
        </button>
      </form>

      {error ? (
        <p className="border-b border-rule px-5 py-2 text-sm text-warn" role="alert">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.14em] text-muted">
              <th className="px-5 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Lines</th>
              <th className="px-5 py-2 text-right font-medium">Monthly</th>
              <th className="w-24 px-5 py-2 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-7 text-center text-sm text-muted">
                  No categories yet. Add one to start grouping expenses.
                </td>
              </tr>
            ) : (
              rows.map(({ category, count, monthly }) => {
                const editing = editingId === category.id;
                return (
                  <tr key={category.id} className="border-t border-rule/60">
                    <td className="px-5 py-3">
                      {editing ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <ColorSwatches value={editColor} onChange={setEditColor} />
                          <input
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void commitEdit();
                              }
                              if (e.key === "Escape") setEditingId(null);
                            }}
                            className="field max-w-64 py-1.5"
                          />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className="inline-flex items-center gap-2 text-left hover:text-teal-deep"
                        >
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: category.color }}
                          />
                          {category.name}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">{count}</td>
                    <td
                      className={`px-5 py-3 text-right font-mono text-sm font-medium ${
                        monthly < 0
                          ? "text-copper"
                          : monthly > 0
                            ? "text-teal-deep"
                            : "text-muted"
                      }`}
                    >
                      {formatMoney(monthly, currency, { sign: monthly !== 0 })}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {editing ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="text-xs text-muted hover:text-ink"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="text-xs font-medium text-teal-deep hover:underline"
                            onClick={() => void commitEdit()}
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="text-xs text-warn hover:underline"
                          onClick={async () => {
                            if (
                              !confirm(
                                `Remove “${category.name}”? Linked expenses stay, uncategorized.`,
                              )
                            ) {
                              return;
                            }
                            await onDelete(category.id);
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex gap-1">
      {CATEGORY_COLORS.map((swatch) => (
        <button
          key={swatch}
          type="button"
          aria-label={swatch}
          onClick={() => onChange(swatch)}
          className={`h-4 w-4 rounded-full border ${
            value === swatch ? "border-ink" : "border-transparent"
          }`}
          style={{ background: swatch }}
        />
      ))}
    </div>
  );
}
