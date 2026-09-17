import { EventSection } from "@/components/event-section";

export default function BudgetPage() {
  return (
    <EventSection
      kind="recurring"
      title="Budget"
      description="Recurring income and expenses."
      addLabel="Add line"
      emptyLabel="No budget lines yet. Add a salary, rent, or monthly expense."
    />
  );
}
