"use client";

import { useState } from "react";
import { CATEGORY_COLORS, type Category, type CategoryDraft } from "@/lib/types";

type Props = {
  categories: Category[];
  usage: Record<string, number>;
  onSave: (draft: CategoryDraft) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
};

export function CategoryList({ categories, usage, onSave, onDelete }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [colorOpenId, setColorOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sorted = [...categories].sort(
    (a, b) => a.position - b.position || a.name.localeCompare(b.name),
  );

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the category a name.");
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setError("That category already exists.");
      return;
    }
    setError(null);
    setBusy(true);
    const nextPosition = categories.reduce((max, c) => Math.max(max, c.position), -1) + 1;
    try {
      await onSave({ name: trimmed, color, position: nextPosition });
      setName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that category.");
    } finally {
      setBusy(false);
    }
  }

  async function move(category: Category, direction: -1 | 1) {
    const index = sorted.findIndex((c) => c.id === category.id);
    const swapWith = sorted[index + direction];
    if (!swapWith) return;
    await Promise.all([
      onSave({ ...category, position: swapWith.position }),
      onSave({ ...swapWith, position: category.position }),
    ]);
  }

  async function commitRename(category: Category) {
    const trimmed = editingName.trim();
    setEditingId(null);
    if (!trimmed || trimmed === category.name) return;
    if (
      categories.some(
        (c) => c.id !== category.id && c.name.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setError("That category already exists.");
      return;
    }
    setError(null);
    try {
      await onSave({ ...category, name: trimmed });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename that category.");
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-rule bg-surface">
      <div className="border-b border-rule px-4 py-3 sm:px-5">
        <h2 className="text-lg font-medium">Categories</h2>
        <p className="text-sm text-muted">
          Your expense tags. Rename, recolor, reorder, or add your own.
        </p>
      </div>

      <ul className="divide-y divide-rule/70">
        {sorted.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-muted">
            No categories yet. Add Home, Baby, Food, or anything else below.
          </li>
        ) : (
          sorted.map((category, index) => {
            const count = usage[category.id] ?? 0;
            const isEditing = editingId === category.id;
            return (
              <li key={category.id} className="px-4 py-2.5 sm:px-5">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      aria-label={`Move ${category.name} up`}
                      disabled={index === 0}
                      className="px-1 text-xs text-muted disabled:opacity-30"
                      onClick={() => void move(category, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      aria-label={`Move ${category.name} down`}
                      disabled={index === sorted.length - 1}
                      className="px-1 text-xs text-muted disabled:opacity-30"
                      onClick={() => void move(category, 1)}
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    aria-label={`Color for ${category.name}`}
                    aria-expanded={colorOpenId === category.id}
                    className="h-5 w-5 shrink-0 rounded-full border border-ink/20"
                    style={{ background: category.color }}
                    onClick={() =>
                      setColorOpenId((id) => (id === category.id ? null : category.id))
                    }
                  />
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => void commitRename(category)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="field min-w-0 flex-1 py-1.5"
                    />
                  ) : (
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left font-medium"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                    >
                      {category.name}
                    </button>
                  )}
                  <span className="shrink-0 font-mono text-xs text-muted">
                    {count} {count === 1 ? "event" : "events"}
                  </span>
                  <button
                    type="button"
                    className="shrink-0 text-sm text-warn hover:underline"
                    onClick={() => {
                      if (
                        !confirm(
                          count
                            ? `Delete “${category.name}”? ${count} event${count === 1 ? "" : "s"} will become uncategorized.`
                            : `Delete “${category.name}”?`,
                        )
                      ) {
                        return;
                      }
                      void onDelete(category.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
                {colorOpenId === category.id ? (
                  <div className="mt-2 pl-9">
                    <ColorDots
                      value={category.color}
                      onChange={(next) => {
                        setColorOpenId(null);
                        void Promise.resolve(onSave({ ...category, color: next })).catch(
                          () => undefined,
                        );
                      }}
                    />
                  </div>
                ) : null}
              </li>
            );
          })
        )}
      </ul>

      <form
        onSubmit={addCategory}
        className="flex flex-col gap-2 border-t border-rule px-4 py-3 sm:flex-row sm:items-center sm:px-5"
      >
        <ColorDots value={color} onChange={setColor} />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category — Home, Baby, Food…"
          className="field flex-1"
        />
        <button type="submit" className="btn-solid shrink-0" disabled={busy}>
          {busy ? "Adding…" : "Add category"}
        </button>
      </form>
      {error ? (
        <p className="px-5 pb-3 text-sm text-warn" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}

function ColorDots({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex max-w-[11rem] shrink-0 flex-wrap gap-1" role="radiogroup" aria-label="Color">
      {CATEGORY_COLORS.map((swatch) => (
        <button
          key={swatch}
          type="button"
          role="radio"
          aria-checked={value === swatch}
          aria-label={swatch}
          onClick={() => onChange(swatch)}
          className={`h-4 w-4 rounded-full border ${
            value === swatch ? "border-ink scale-110" : "border-transparent"
          }`}
          style={{ background: swatch }}
        />
      ))}
    </div>
  );
}
