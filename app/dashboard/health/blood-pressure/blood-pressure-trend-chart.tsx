"use client";

import { useMemo, useState } from "react";

type TrendPoint = {
  date: string;
  diastolic: number;
  systolic: number;
};

type RangeKey = "week" | "month" | "year" | "all";

const ranges: Array<{ key: RangeKey; label: string; days: number | null }> = [
  { key: "week", label: "Week", days: 7 },
  { key: "month", label: "Month", days: 30 },
  { key: "year", label: "Year", days: 365 },
  { key: "all", label: "All Time", days: null },
];

function buildPath(
  points: TrendPoint[],
  valueKey: "systolic" | "diastolic",
  minValue: number,
  maxValue: number,
) {
  if (points.length === 0) return "";

  const left = 48;
  const right = 24;
  const top = 20;
  const bottom = 38;
  const width = 760;
  const height = 260;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;
  const valueRange = Math.max(1, maxValue - minValue);

  return points
    .map((point, index) => {
      const x =
        left +
        (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
      const y =
        top + ((maxValue - point[valueKey]) / valueRange) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function formatRangeLabel(points: TrendPoint[]) {
  if (points.length === 0) return "No readings in this range";
  const first = new Date(points[0].date).toLocaleDateString();
  const last = new Date(points[points.length - 1].date).toLocaleDateString();
  return points.length === 1 ? first : `${first} - ${last}`;
}

export function BloodPressureTrendChart({ points }: { points: TrendPoint[] }) {
  const [range, setRange] = useState<RangeKey>("month");
  const filteredPoints = useMemo(() => {
    const sorted = [...points].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const selectedRange = ranges.find((item) => item.key === range);

    if (!selectedRange?.days || sorted.length === 0) {
      return sorted;
    }

    const latestTime = new Date(sorted[sorted.length - 1].date).getTime();
    const startTime = latestTime - selectedRange.days * 24 * 60 * 60 * 1000;
    return sorted.filter((point) => new Date(point.date).getTime() >= startTime);
  }, [points, range]);
  const values = filteredPoints.flatMap((point) => [
    point.systolic,
    point.diastolic,
  ]);
  const minValue = values.length > 0 ? Math.max(0, Math.min(...values) - 10) : 50;
  const maxValue = values.length > 0 ? Math.max(...values) + 10 : 150;
  const systolicPath = buildPath(
    filteredPoints,
    "systolic",
    minValue,
    maxValue,
  );
  const diastolicPath = buildPath(
    filteredPoints,
    "diastolic",
    minValue,
    maxValue,
  );

  return (
    <section className="mt-6 rounded-md border border-foreground/10 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-normal">Trend</h2>
          <p className="mt-1 text-sm text-foreground/60">
            {formatRangeLabel(filteredPoints)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ranges.map((item) => (
            <button
              className={`h-9 rounded-md border px-3 text-sm font-medium transition-colors ${
                range === item.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/20 hover:border-foreground/45 hover:bg-foreground/5"
              }`}
              key={item.key}
              onClick={() => setRange(item.key)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-x-auto">
        <svg
          aria-label="Blood pressure trend chart"
          className="h-[260px] min-w-[760px] w-full"
          role="img"
          viewBox="0 0 760 260"
        >
          <line stroke="currentColor" strokeOpacity="0.12" x1="48" x2="736" y1="20" y2="20" />
          <line stroke="currentColor" strokeOpacity="0.12" x1="48" x2="736" y1="121" y2="121" />
          <line stroke="currentColor" strokeOpacity="0.12" x1="48" x2="736" y1="222" y2="222" />
          <text className="fill-current text-[11px]" opacity="0.55" x="8" y="24">
            {maxValue}
          </text>
          <text className="fill-current text-[11px]" opacity="0.55" x="8" y="125">
            {Math.round((minValue + maxValue) / 2)}
          </text>
          <text className="fill-current text-[11px]" opacity="0.55" x="8" y="226">
            {minValue}
          </text>
          {filteredPoints.length > 0 ? (
            <>
              <path
                d={systolicPath}
                fill="none"
                stroke="#dc2626"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
              <path
                d={diastolicPath}
                fill="none"
                stroke="#2563eb"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
              />
            </>
          ) : (
            <text className="fill-current text-sm" opacity="0.55" x="310" y="130">
              No readings in this range
            </text>
          )}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap gap-5 text-sm">
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-red-600" />
          Systolic
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-blue-600" />
          Diastolic
        </span>
      </div>
    </section>
  );
}
