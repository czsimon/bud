"use client";

import { sampleEvents, sampleProfile } from "@/lib/sample-data";
import type { BudgetEvent, EventDraft, Profile } from "@/lib/types";

const KEY = "bud.local.v1";

type Snapshot = {
  profile: Profile;
  events: BudgetEvent[];
};

function read(): Snapshot {
  if (typeof window === "undefined") {
    return { profile: sampleProfile(), events: sampleEvents() };
  }
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    const initial = { profile: sampleProfile(), events: sampleEvents() };
    window.localStorage.setItem(KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(raw) as Snapshot;
  } catch {
    const initial = { profile: sampleProfile(), events: sampleEvents() };
    window.localStorage.setItem(KEY, JSON.stringify(initial));
    return initial;
  }
}

function write(snapshot: Snapshot) {
  window.localStorage.setItem(KEY, JSON.stringify(snapshot));
}

export const localStore = {
  load(): Snapshot {
    return read();
  },
  saveProfile(profile: Profile) {
    const snap = read();
    write({ ...snap, profile });
  },
  upsertEvent(draft: EventDraft): BudgetEvent {
    const snap = read();
    const event: BudgetEvent = {
      ...draft,
      id: draft.id ?? crypto.randomUUID(),
      cadence: draft.kind === "one_off" ? null : draft.cadence,
    };
    const index = snap.events.findIndex((e) => e.id === event.id);
    const events =
      index === -1
        ? [...snap.events, event]
        : snap.events.map((e) => (e.id === event.id ? event : e));
    write({ ...snap, events });
    return event;
  },
  deleteEvent(id: string) {
    const snap = read();
    write({ ...snap, events: snap.events.filter((e) => e.id !== id) });
  },
};
