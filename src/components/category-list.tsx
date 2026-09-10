"use client";

import { useMemo, useState } from "react";
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
import {
  EditorFooter,
  EditorSidebar,
  ManagementHeader,
} from "@/components/management-ui";
import {
  CATEGORY_COLORS,
  categoryColor,
  categoryColorLabel,
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
  const [saving, setSaving] = useState(false);

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

  function startAdd() {
    setEditingId("new");
    setNewName("");
    setNewColor(CATEGORY_COLORS[0]);
    setError(null);
  }

  function startEdit(category: Category) {
    setEditingId(category.id);
    setNewName(category.name);
    setNewColor(category.color);
    setError(null);
  }

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setError("Give the category a name.");
      return;
    }
    const current = categories.find((category) => category.id === editingId);
    const clash = categories.some(
      (category) =>
        category.id !== current?.id &&
        category.name.toLowerCase() === name.toLowerCase(),
    );
    if (clash) {
      setError("That category already exists.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        id: current?.id,
        name,
        color: newColor,
        position:
          current?.position ??
          categories.reduce(
            (max, category) => Math.max(max, category.position),
            -1,
          ) + 1,
      });
      setEditingId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the category.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col bg-surface">
        <ManagementHeader
          title="Categories"
          description="Labels you invent. Monthly totals come from the budget lines and events you assign."
          action={
            <button type="button" className="btn-solid" onClick={startAdd}>
              Add category
            </button>
          }
        />

      <DataTableViewport>
        <DataTable>
          <DataTableHeader>
            <DataTableHead pad="edge">Category</DataTableHead>
            <DataTableHead>Lines</DataTableHead>
            <DataTableHead pad="edge" className="text-right">
              Monthly
            </DataTableHead>
          </DataTableHeader>
          <DataTableBody>
            {rows.length === 0 ? (
              <DataTableEmptyRow colSpan={3}>
                No categories yet. Add one to start grouping budget lines and events.
              </DataTableEmptyRow>
            ) : (
              rows.map(({ category, count, monthly }) => {
                return (
                  <DataTableRow
                    key={category.id}
                    interactive
                    onClick={() => startEdit(category)}
                  >
                    <DataTableCell pad="edge">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ background: categoryColor(category.color) }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </span>
                    </DataTableCell>
                    <DataTableCell className="font-mono text-xs text-muted">
                      {count}
                    </DataTableCell>
                    <DataTableCell
                      pad="edge"
                      className={`text-right font-mono text-sm font-medium ${
                        monthly < 0
                          ? "text-copper"
                          : monthly > 0
                            ? "text-teal-deep"
                            : "text-muted"
                      }`}
                    >
                      {formatMoney(monthly, currency, { sign: monthly !== 0 })}
                    </DataTableCell>
                  </DataTableRow>
                );
              })
            )}
          </DataTableBody>
        </DataTable>
      </DataTableViewport>
      </section>

      {editingId ? (
        <EditorSidebar
          eyebrow="Category"
          title={editingId === "new" ? "New category" : "Edit category"}
          onClose={() => setEditingId(null)}
        >
          <form
            onSubmit={(event) => void saveCategory(event)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6 sm:px-6">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Name</span>
                <input
                  autoFocus
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Utilities, Home, Baby…"
                  className="field"
                />
              </label>
              <fieldset>
                <legend className="mb-2 text-sm font-medium">Color</legend>
                <ColorSwatches value={newColor} onChange={setNewColor} />
              </fieldset>
              {error ? (
                <p className="text-sm text-warn" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <EditorFooter
              onCancel={() => setEditingId(null)}
              onDelete={
                editingId === "new"
                  ? undefined
                  : async () => {
                      const category = categories.find(
                        (item) => item.id === editingId,
                      );
                      if (
                        !category ||
                        !confirm(
                          `Remove “${category.name}”? Linked expenses stay uncategorized.`,
                        )
                      )
                        return;
                      await onDelete(category.id);
                      setEditingId(null);
                    }
              }
              saving={saving}
              saveLabel={editingId === "new" ? "Add category" : "Save changes"}
            />
          </form>
        </EditorSidebar>
      ) : null}
    </>
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
    <div className="flex flex-wrap gap-2">
      {CATEGORY_COLORS.map((swatch) => {
        const selected = value === swatch;
        return (
          <button
            key={swatch}
            type="button"
            aria-label={categoryColorLabel(swatch)}
            aria-pressed={selected}
            title={categoryColorLabel(swatch)}
            onClick={() => onChange(swatch)}
            className={`flex h-10 w-10 items-center justify-center rounded-full text-base leading-none text-paper transition-transform hover:scale-105 ${
              selected ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : ""
            }`}
            style={{ background: categoryColor(swatch) }}
          >
            {selected ? "✓" : null}
          </button>
        );
      })}
    </div>
  );
}
