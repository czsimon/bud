"use client";

import { ForecastChart } from "@/components/forecast-chart";
import { useHousehold } from "@/components/household-provider";
import { formatMoney } from "@/lib/types";

const HORIZON_OPTIONS = [
  { months: 12, label: "1 year" },
  { months: 24, label: "2 years" },
  { months: 60, label: "5 years" },
  { months: 120, label: "10 years" },
] as const;

export function ShortTermView() {
  const { profile, forecast, persistProfile } = useHousehold();
  const endTone =
    forecast.endBalance < 0
      ? "text-copper"
      : forecast.endBalance >= forecast.startBalance
        ? "text-teal-deep"
        : "text-ink";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface">
      <div className="flex shrink-0 flex-col gap-4 border-b border-rule px-4 py-3 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted">
            Projected cash
          </p>
          <p
            className={`mt-1 font-mono text-3xl font-medium tracking-tight sm:text-4xl ${endTone}`}
          >
            {formatMoney(forecast.endBalance, profile.currency)}
          </p>
        </div>
        <div>
          <span className="mb-1 block text-[11px] uppercase tracking-[0.16em] text-muted">
            Horizon
          </span>
          <div className="flex flex-wrap gap-1 rounded-full border border-rule p-1">
            {HORIZON_OPTIONS.map((option) => {
              const active = profile.horizonMonths === option.months;
              return (
                <button
                  key={option.months}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    void persistProfile({
                      ...profile,
                      horizonMonths: option.months,
                    })
                  }
                  className={`rounded-full px-2.5 py-1 text-xs ${
                    active
                      ? "bg-teal-deep text-on-accent"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 px-1 py-1 sm:px-3">
        <ForecastChart
          forecast={forecast}
          currency={profile.currency}
          className="h-full w-full"
        />
      </div>
      <p className="shrink-0 px-4 pb-3 text-xs text-muted sm:px-6">
        {forecast.occurrences.length} cash movements across this forecast
        horizon
      </p>
    </div>
  );
}
