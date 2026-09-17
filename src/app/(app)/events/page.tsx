import { EventSection } from "@/components/event-section";

export default function EventsPage() {
  return (
    <EventSection
      kind="one_off"
      title="Events"
      description="One-off hits, windfalls, and known balances."
      addLabel="Add event"
      emptyLabel="No events yet."
    />
  );
}
