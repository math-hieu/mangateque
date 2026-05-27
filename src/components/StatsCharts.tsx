"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyCount, MonthlySpend, WeeklyCount } from "@/actions/stats";

const AMBER = "#e8a14a";

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
  readPerWeek,
  readPerMonth,
  spendPerMonth,
  purchasesPerMonth,
}: {
  readPerWeek: WeeklyCount[];
  readPerMonth: MonthlyCount[];
  spendPerMonth: MonthlySpend[];
  purchasesPerMonth: MonthlyCount[];
}) {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <ChartSection title="Lectures par semaine">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={readPerWeek}>
            <XAxis dataKey="week" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} width={30} />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: MUTED, strokeDasharray: "4 4" }} />
            <Line type="monotone" dataKey="count" stroke={AMBER} strokeWidth={2} dot={{ fill: AMBER, r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartSection>

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

      <ChartSection title="Dépenses mensuelles">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={spendPerMonth}>
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={50} tickFormatter={(v: number) => `${v} €`} />
            <Tooltip content={<SpendTooltip />} cursor={{ fill: SURFACE_2 }} />
            <Bar dataKey="total" fill={AMBER} radius={[4, 4, 0, 0]} />
          </BarChart>
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
