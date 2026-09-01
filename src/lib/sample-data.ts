import { addDays, addMonths, formatISO, startOfMonth } from "date-fns";
import type { BudgetEvent, Profile } from "@/lib/types";

function iso(date: Date): string {
  return formatISO(date, { representation: "date" });
}

export function sampleProfile(): Profile {
  return {
    id: "local",
    displayName: "Household",
    startingBalance: 18420,
    currency: "USD",
    horizonMonths: 12,
  };
}

export function sampleEvents(): BudgetEvent[] {
  const thisMonth = startOfMonth(new Date());
  const nextYearBonus = addMonths(thisMonth, 3);
  const vacation = addMonths(thisMonth, 5);

  return [
    {
      id: "evt-you-salary",
      name: "Salary — you",
      amount: 4100,
      flow: "in",
      kind: "recurring",
      cadence: "biweekly",
      startDate: iso(thisMonth),
      endDate: null,
      person: "you",
      notes: "Direct deposit",
    },
    {
      id: "evt-partner-salary",
      name: "Salary — partner",
      amount: 3650,
      flow: "in",
      kind: "recurring",
      cadence: "biweekly",
      startDate: iso(addDays(thisMonth, 7)),
      endDate: null,
      person: "partner",
      notes: "Payday one week after yours — change the start date if needed",
    },
    {
      id: "evt-rent",
      name: "Rent",
      amount: 2450,
      flow: "out",
      kind: "recurring",
      cadence: "monthly",
      startDate: iso(thisMonth),
      endDate: null,
      person: "shared",
      notes: null,
    },
    {
      id: "evt-groceries",
      name: "Groceries",
      amount: 780,
      flow: "out",
      kind: "recurring",
      cadence: "monthly",
      startDate: iso(thisMonth),
      endDate: null,
      person: "shared",
      notes: "Household budget, not a subscription",
    },
    {
      id: "evt-childcare",
      name: "Childcare",
      amount: 1600,
      flow: "out",
      kind: "recurring",
      cadence: "monthly",
      startDate: iso(thisMonth),
      endDate: null,
      person: "shared",
      notes: null,
    },
    {
      id: "evt-internet",
      name: "Internet",
      amount: 89,
      flow: "out",
      kind: "recurring",
      cadence: "monthly",
      startDate: iso(thisMonth),
      endDate: null,
      person: "shared",
      notes: null,
    },
    {
      id: "evt-bonus",
      name: "Annual bonus",
      amount: 8500,
      flow: "in",
      kind: "one_off",
      cadence: null,
      startDate: iso(nextYearBonus),
      endDate: null,
      person: "you",
      notes: "Expected, not guaranteed",
    },
    {
      id: "evt-vacation",
      name: "Portugal trip",
      amount: 4200,
      flow: "out",
      kind: "one_off",
      cadence: null,
      startDate: iso(vacation),
      endDate: null,
      person: "shared",
      notes: "Flights + lodging",
    },
  ];
}
