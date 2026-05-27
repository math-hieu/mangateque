"use server";

import { supabase } from "@/lib/supabase";

export type MonthlyCount = { month: string; count: number };
export type CumulativeSpend = { month: string; total: number };

export type ReadingStats = {
  readPerMonth: MonthlyCount[];
  cumulativeSpend: CumulativeSpend[];
  purchasesPerMonth: MonthlyCount[];
};

function toMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
  const purchaseCounts = new Map<string, number>();
  const spendByMonth = new Map<string, number>();

  for (const v of volumes ?? []) {
    const purchaseKey = toMonthKey(v.created_at);
    purchaseCounts.set(purchaseKey, (purchaseCounts.get(purchaseKey) ?? 0) + 1);
    spendByMonth.set(purchaseKey, (spendByMonth.get(purchaseKey) ?? 0) + v.price);

    if (v.read_at) {
      const readKey = toMonthKey(v.read_at);
      readCounts.set(readKey, (readCounts.get(readKey) ?? 0) + 1);
    }
  }

  const readPerMonth: MonthlyCount[] = [...readCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ month: formatMonthLabel(key), count }));

  const purchasesPerMonth: MonthlyCount[] = [...purchaseCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ month: formatMonthLabel(key), count }));

  let runningTotal = 0;
  const cumulativeSpend: CumulativeSpend[] = [...spendByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => {
      runningTotal += amount;
      return { month: formatMonthLabel(key), total: parseFloat(runningTotal.toFixed(2)) };
    });

  return { readPerMonth, cumulativeSpend, purchasesPerMonth };
}
