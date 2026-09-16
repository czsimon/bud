"use client";

import { useEffect, useId, type ReactNode } from "react";

export function ManagementHeader({
  title,
  description,
  action,
  aside,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 border-b border-rule px-4 py-4 @2xl:flex-row @2xl:items-center @2xl:justify-between @2xl:px-5">
      <div className="min-w-0">
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-muted">{description}</p>
      </div>
      {action || aside ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 @2xl:justify-end">
          {aside}
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function EditorSidebar({
  eyebrow,
  title,
  onClose,
  children,
}: {
  eyebrow: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <button
        type="button"
        aria-label="Close editor"
        className="drawer-scrim absolute inset-0 bg-scrim"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="drawer-panel relative z-10 flex h-full w-full max-w-lg flex-col overflow-hidden border-l border-rule bg-surface shadow-xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-rule px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
              {eyebrow}
            </p>
            <h2 id={titleId} className="mt-1 text-xl font-medium">
              {title}
            </h2>
          </div>
          <button
            type="button"
            className="icon-btn -mr-1.5"
            aria-label="Close editor"
            onClick={onClose}
          >
            ✕
          </button>
        </header>
        {children}
      </aside>
    </div>
  );
}

export function EditorFooter({
  onCancel,
  onDelete,
  deleteDisabled,
  saving,
  saveLabel,
}: {
  onCancel: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
  saving?: boolean;
  saveLabel: string;
}) {
  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-rule px-5 py-4 sm:px-6">
      {onDelete ? (
        <button
          type="button"
          className="text-sm text-muted hover:text-warn disabled:cursor-not-allowed disabled:opacity-40"
          disabled={deleteDisabled || saving}
          onClick={onDelete}
        >
          Delete
        </button>
      ) : (
        <span />
      )}
      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn-solid" disabled={saving}>
          {saving ? "Saving…" : saveLabel}
        </button>
      </div>
    </footer>
  );
}
