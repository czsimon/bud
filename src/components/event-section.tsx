"use client";

import { useState } from "react";
import { EventEditor } from "@/components/event-editor";
import { EventTable } from "@/components/event-table";
import { useHousehold } from "@/components/household-provider";
import type { BudgetEvent, EventKind } from "@/lib/types";

export function EventSection({
  kind,
  title,
  description,
  addLabel,
  emptyLabel,
}: {
  kind: EventKind;
  title: string;
  description: string;
  addLabel: string;
  emptyLabel: string;
}) {
  const {
    events,
    categories,
    profile,
    saveEvent,
    deleteEvent,
    createCategory,
  } = useHousehold();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetEvent | null>(null);

  const visible =
    kind === "recurring"
      ? events.filter((event) => event.kind === "recurring")
      : events.filter((event) => event.kind !== "recurring");

  function openNew() {
    setEditing(null);
    setEditorOpen(true);
  }

  function openEdit(event: BudgetEvent) {
    setEditing(event);
    setEditorOpen(true);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4">
      <EventTable
        title={title}
        description={description}
        addLabel={addLabel}
        emptyLabel={emptyLabel}
        events={visible}
        categories={categories}
        currency={profile.currency}
        onAdd={openNew}
        onEdit={openEdit}
      />
      {editorOpen ? (
        <EventEditor
          key={editing?.id ?? `new-${kind}`}
          event={editing}
          categories={categories}
          initialKind={editing?.kind ?? kind}
          onClose={() => setEditorOpen(false)}
          onSave={saveEvent}
          onCreateCategory={createCategory}
          onDelete={deleteEvent}
          currency={profile.currency}
        />
      ) : null}
    </div>
  );
}
