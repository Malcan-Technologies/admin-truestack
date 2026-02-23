"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export type ChartDataPoint = {
  label: string;
  [key: string]: string | number;
};

export type ChartSeries = {
  key: string;
  name: string;
  color: string;
};

interface BaseChartProps {
  data: ChartDataPoint[];
  series: ChartSeries[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

const chartColors = {
  grid: "#334155",
  axis: "#64748b",
  tooltip: {
    bg: "#1e293b",
    border: "#334155",
    text: "#f1f5f9",
  },
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 shadow-lg"
      style={{
        backgroundColor: chartColors.tooltip.bg,
        borderColor: chartColors.tooltip.border,
      }}
    >
      <p className="mb-1 text-xs font-medium text-slate-400">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-slate-300">{entry.name}:</span>
          <span className="font-medium text-white">
            {entry.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

export function AreaChartComponent({
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = false,
  className = "",
}: BaseChartProps) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          )}
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColors.axis, fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColors.axis, fontSize: 12 }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarChartComponent({
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = false,
  className = "",
}: BaseChartProps) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          )}
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColors.axis, fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColors.axis, fontSize: 12 }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function LineChartComponent({
  data,
  series,
  height = 300,
  showGrid = true,
  showLegend = false,
  className = "",
}: BaseChartProps) {
  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          )}
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColors.axis, fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColors.axis, fontSize: 12 }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: s.color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Monthly growth chart with two Y axes: tenants (left) and loan volume (right) */
export function MonthlyGrowthChart({
  data,
  height = 300,
  className = "",
}: {
  data: Array<{ label: string; tenants: number; loanVolume: number }>;
  height?: number;
  className?: string;
}) {
  const formatLoanVolume = (value: number) =>
    `RM ${value.toLocaleString("en-MY", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 50, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColors.axis, fontSize: 12 }}
          />
          <YAxis
            yAxisId="tenants"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColors.axis, fontSize: 12 }}
            width={32}
          />
          <YAxis
            yAxisId="loanVolume"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: chartColors.axis, fontSize: 12 }}
            width={50}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div
                  className="rounded-lg border px-3 py-2 shadow-lg"
                  style={{
                    backgroundColor: chartColors.tooltip.bg,
                    borderColor: chartColors.tooltip.border,
                  }}
                >
                  <p className="mb-1 text-xs font-medium text-slate-400">{label}</p>
                  {payload.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-slate-300">{entry.name}:</span>
                      <span className="font-medium text-white">
                        {entry.dataKey === "loanVolume"
                          ? formatLoanVolume(Number(entry.value))
                          : Number(entry.value).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }}
          />
          <Legend />
          <Bar
            yAxisId="tenants"
            dataKey="tenants"
            name="Tenants"
            fill="#6366f1"
            radius={[4, 4, 0, 0]}
          />
          <Line
            yAxisId="loanVolume"
            type="monotone"
            dataKey="loanVolume"
            name="Loan Volume (RM)"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#22c55e" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
