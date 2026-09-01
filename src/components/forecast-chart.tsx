"use client";

import { format, parseISO } from "date-fns";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, formatShortDate } from "@/lib/format";
import type { Forecast } from "@/lib/types";

type Props = {
  forecast: Forecast;
  currency: string;
};

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: { date: string; balance: number } }>;
  currency: string;
}) {
  if (!active || !payload?.[0]) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-rule bg-surface px-3 py-2 shadow-sm">
      <p className="text-xs uppercase tracking-[0.14em] text-muted">
        {format(parseISO(point.date), "EEE, MMM d yyyy")}
      </p>
      <p className="mt-1 font-mono text-sm font-medium">
        {formatMoney(point.balance, currency)}
      </p>
    </div>
  );
}

export function ForecastChart({ forecast, currency }: Props) {
  const data = useMemo(
    () =>
      forecast.points.map((p) => ({
        ...p,
        label: formatShortDate(p.date),
      })),
    [forecast.points],
  );

  const crossesZero = forecast.minBalance < 0 && forecast.maxBalance > 0;

  return (
    <div className="h-[280px] w-full sm:h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1f7a6e" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#1f7a6e" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#c5d4cd" strokeDasharray="0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => format(parseISO(value), "MMM")}
            interval="preserveStartEnd"
            minTickGap={48}
            tick={{ fill: "#5c7069", fontSize: 12 }}
            axisLine={{ stroke: "#c5d4cd" }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) =>
              new Intl.NumberFormat("en-US", {
                notation: "compact",
                maximumFractionDigits: 1,
              }).format(value as number)
            }
            tick={{ fill: "#5c7069", fontSize: 12, fontFamily: "IBM Plex Mono, monospace" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ stroke: "#0f4f47", strokeWidth: 1 }}
          />
          {crossesZero ? (
            <ReferenceLine y={0} stroke="#c0562a" strokeDasharray="4 4" />
          ) : null}
          <Area
            type="stepAfter"
            dataKey="balance"
            stroke="#0f4f47"
            strokeWidth={2}
            fill="url(#cashFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
