"use client";

import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyCount, CumulativeSpend } from "@/actions/stats";

const AMBER = "#e8a14a";
const AMBER_SOFT = "rgba(232, 161, 74, 0.14)";
const MUTED = "#8a7e6a";
const SURFACE_2 = "#2f271f";

const axisProps = {
  tick: { fill: MUTED, fontSize: 11 },
  axisLine: false,
  tickLine: false,
};

function ChartSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-[var(--border)] bg-surface p-4 sm:p-6">
      <h2 className="mt-label mb-4">{title}</h2>
      <div className="h-[220px] sm:h-[280px]">
        {children}
      </div>
    </section>
  );
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[var(--border-2)] bg-surface-2 px-3 py-2 text-xs text-cream shadow-lg">
      <p className="text-cream-mute">{label}</p>
      <p className="mt-tabular font-medium">{payload[0].value}</p>
    </div>
  );
}

function SpendTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-[var(--border-2)] bg-surface-2 px-3 py-2 text-xs text-cream shadow-lg">
      <p className="text-cream-mute">{label}</p>
      <p className="mt-tabular font-medium">{payload[0].value.toFixed(2).replace(".", ",")} €</p>
    </div>
  );
}

export function StatsCharts({
  readPerMonth,
  cumulativeSpend,
  purchasesPerMonth,
}: {
  readPerMonth: MonthlyCount[];
  cumulativeSpend: CumulativeSpend[];
  purchasesPerMonth: MonthlyCount[];
}) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <ChartSection title="Lectures par mois">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={readPerMonth}>
            <XAxis dataKey="month" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} width={30} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: SURFACE_2 }} />
            <Bar dataKey="count" fill={AMBER} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Dépenses cumulées">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={cumulativeSpend}>
            <defs>
              <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={AMBER} stopOpacity={0.3} />
                <stop offset="100%" stopColor={AMBER} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={50} tickFormatter={(v: number) => `${v} €`} />
            <Tooltip content={<SpendTooltip />} cursor={{ stroke: MUTED, strokeDasharray: "4 4" }} />
            <Area
              type="monotone"
              dataKey="total"
              stroke={AMBER}
              strokeWidth={2}
              fill="url(#amberGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartSection>

      <ChartSection title="Achats par mois">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={purchasesPerMonth}>
            <XAxis dataKey="month" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} width={30} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: SURFACE_2 }} />
            <Bar dataKey="count" fill={AMBER} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartSection>
    </div>
  );
}
