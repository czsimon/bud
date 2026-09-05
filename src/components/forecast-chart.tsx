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
import { formatMoney, type Forecast } from "@/lib/types";

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
      <p
        className={`mt-1 font-mono text-sm font-medium ${
          point.balance < 0 ? "text-red-600" : ""
        }`}
      >
        {formatMoney(point.balance, currency)}
      </p>
    </div>
  );
}

// Gradient offsets are relative to each path's own bounding box, so the zero
// crossing has to be measured against that path's value span — not the axis.
function zeroSplit(top: number, bottom: number): number {
  if (top <= 0) return 0;
  if (bottom >= 0) return 1;
  return top / (top - bottom);
}

const AXIS_UNIT = 10000;

function timeOf(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).getTime();
}

function monthTicks(fromIso: string, toIso: string): number[] {
  const ticks: number[] = [];
  const end = timeOf(toIso);
  let cursor = new Date(Number(fromIso.slice(0, 4)), Number(fromIso.slice(5, 7)) - 1, 1);
  if (cursor.getTime() < timeOf(fromIso)) {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  while (cursor.getTime() <= end) {
    ticks.push(cursor.getTime());
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  return ticks;
}

// Snap the axis to 10k boundaries and keep gridline labels on round numbers.
function axisBounds(min: number, max: number) {
  const low = Math.floor(min / AXIS_UNIT) * AXIS_UNIT;
  const high = Math.max(Math.ceil(max / AXIS_UNIT) * AXIS_UNIT, low + AXIS_UNIT);
  const step = AXIS_UNIT * Math.ceil((high - low) / AXIS_UNIT / 6);
  const ticks: number[] = [];
  for (let value = low; value <= high; value += step) {
    ticks.push(value);
  }
  if (ticks[ticks.length - 1] !== high) ticks.push(high);
  return { low, high, ticks };
}

export function ForecastChart({ forecast, currency }: Props) {
  const data = useMemo(
    () =>
      forecast.points.map((p) => ({
        ...p,
        t: timeOf(p.date),
      })),
    [forecast.points],
  );

  const { low: yMin, high: yMax, ticks } = useMemo(
    () => axisBounds(forecast.minBalance, forecast.maxBalance),
    [forecast.minBalance, forecast.maxBalance],
  );
  const monthTickTimes = useMemo(
    () => monthTicks(forecast.from, forecast.to),
    [forecast.from, forecast.to],
  );
  const monthTickFormat = forecast.from.slice(0, 4) === forecast.to.slice(0, 4) ? "MMM" : "MMM yy";
  const underZero = forecast.minBalance < 0;
  // The filled area runs from the highest balance down to the axis floor, while
  // the line only covers the balances themselves.
  const fillSplit = zeroSplit(forecast.maxBalance, yMin);
  const strokeSplit = zeroSplit(forecast.maxBalance, forecast.minBalance);

  return (
    <div className="h-[220px] w-full sm:h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset={fillSplit} stopColor="#1f7a6e" stopOpacity={0.32} />
              <stop offset={fillSplit} stopColor="#dc2626" stopOpacity={0.38} />
            </linearGradient>
            <linearGradient id="cashStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={strokeSplit} stopColor="#0f4f47" />
              <stop offset={strokeSplit} stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#c5d4cd" strokeDasharray="0" vertical={false} />
          <CartesianGrid
            stroke="#9aa8a2"
            strokeDasharray="4 4"
            horizontal={false}
          />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={monthTickTimes}
            interval={0}
            tickFormatter={(value) => format(new Date(value as number), monthTickFormat)}
            tick={{ fill: "#5c7069", fontSize: 12 }}
            axisLine={{ stroke: "#c5d4cd" }}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            ticks={ticks}
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
            cursor={{ stroke: underZero ? "#dc2626" : "#0f4f47", strokeWidth: 1 }}
          />
          {underZero ? (
            <ReferenceLine y={0} stroke="#dc2626" strokeDasharray="4 4" />
          ) : null}
          <Area
            type="stepAfter"
            dataKey="balance"
            stroke="url(#cashStroke)"
            strokeWidth={2}
            fill="url(#cashFill)"
            baseValue={yMin}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
