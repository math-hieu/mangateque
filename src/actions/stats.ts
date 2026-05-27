"use server";

import { supabase } from "@/lib/supabase";

export type MonthlyCount = { month: string; count: number };
export type MonthlySpend = { month: string; total: number };
export type WeeklyCount = { week: string; count: number };

export type ReadingStats = {
  readPerWeek: WeeklyCount[];
  readPerMonth: MonthlyCount[];
  spendPerMonth: MonthlySpend[];
  purchasesPerMonth: MonthlyCount[];
};

function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function toWeekKey(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function formatWeekLabel(key: string): string {
  const [year, w] = key.split("-W");
  return `S${parseInt(w, 10)} ${year}`;
}

function formatMonthLabel(key: string): string {
  const [year, month] = key.split("-");
  const names = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
  return `${names[parseInt(month, 10) - 1]} ${year}`;
}

export async function getReadingStats(): Promise<ReadingStats> {
  const { data: volumes, error } = await supabase()
    .from("volumes")
    .select("created_at, price, read_at")
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);

  const readCounts = new Map<string, number>();
  const readWeekCounts = new Map<string, number>();
  const purchaseCounts = new Map<string, number>();
  const spendByMonth = new Map<string, number>();

  for (const v of volumes ?? []) {
    const purchaseKey = toMonthKey(v.created_at);
    purchaseCounts.set(purchaseKey, (purchaseCounts.get(purchaseKey) ?? 0) + 1);
    spendByMonth.set(purchaseKey, (spendByMonth.get(purchaseKey) ?? 0) + v.price);

    if (v.read_at) {
      const readKey = toMonthKey(v.read_at);
      readCounts.set(readKey, (readCounts.get(readKey) ?? 0) + 1);
      const weekKey = toWeekKey(v.read_at);
      readWeekCounts.set(weekKey, (readWeekCounts.get(weekKey) ?? 0) + 1);
    }
  }

  const readPerMonth: MonthlyCount[] = [...readCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ month: formatMonthLabel(key), count }));

  const purchasesPerMonth: MonthlyCount[] = [...purchaseCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ month: formatMonthLabel(key), count }));

  const spendPerMonth: MonthlySpend[] = [...spendByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({ month: formatMonthLabel(key), total: parseFloat(amount.toFixed(2)) }));

  const now = new Date();
  const readPerWeek: WeeklyCount[] = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getTime() - (3 - i) * 7 * 86400000);
    const key = toWeekKey(d.toISOString());
    return { week: formatWeekLabel(key), count: readWeekCounts.get(key) ?? 0 };
  });

  return { readPerWeek, readPerMonth, spendPerMonth, purchasesPerMonth };
}
