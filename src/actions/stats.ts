"use server";

import { supabase } from "@/lib/supabase";

export type MonthlyCount = { key: string; month: string; count: number };
export type MonthlySpend = { key: string; month: string; total: number };
export type WeeklyCount = { key: string; week: string; count: number };

export type ReadVolume = {
  id: string;
  series_id: string;
  series_title: string;
  series_publisher: string;
  cover_url: string | null;
  number: number;
  read_at: string;
};

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
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
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
    .map(([key, count]) => ({ key, month: formatMonthLabel(key), count }));

  const purchasesPerMonth: MonthlyCount[] = [...purchaseCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ key, month: formatMonthLabel(key), count }));

  const spendPerMonth: MonthlySpend[] = [...spendByMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => ({ key, month: formatMonthLabel(key), total: parseFloat(amount.toFixed(2)) }));

  const now = new Date();
  const readPerWeek: WeeklyCount[] = Array.from({ length: 4 }, (_, i) => {
    const d = new Date(now.getTime() - (3 - i) * 7 * 86400000);
    const key = toWeekKey(d.toISOString());
    return { key, week: formatWeekLabel(key), count: readWeekCounts.get(key) ?? 0 };
  });

  return { readPerWeek, readPerMonth, spendPerMonth, purchasesPerMonth };
}

function weekKeyToRange(key: string): { start: Date; end: Date } {
  const [yearStr, wStr] = key.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(wStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (jan4Day - 1) + (week - 1) * 7);
  const nextMonday = new Date(monday);
  nextMonday.setUTCDate(monday.getUTCDate() + 7);
  return { start: monday, end: nextMonday };
}

function monthKeyToRange(key: string): { start: Date; end: Date } {
  const [yearStr, monthStr] = key.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  return {
    start: new Date(Date.UTC(year, month, 1)),
    end: new Date(Date.UTC(year, month + 1, 1)),
  };
}

export async function getVolumesReadInPeriod(params: {
  type: "week" | "month";
  key: string;
}): Promise<ReadVolume[]> {
  const { start, end } = params.type === "week" ? weekKeyToRange(params.key) : monthKeyToRange(params.key);

  const { data, error } = await supabase()
    .from("volumes")
    .select("id, series_id, number, read_at, series(title, publisher, cover_url)")
    .gte("read_at", start.toISOString())
    .lt("read_at", end.toISOString())
    .order("read_at", { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: any) => ({
    id: row.id,
    series_id: row.series_id,
    series_title: row.series?.title ?? "",
    series_publisher: row.series?.publisher ?? "",
    cover_url: row.series?.cover_url ?? null,
    number: row.number,
    read_at: row.read_at,
  }));
}
