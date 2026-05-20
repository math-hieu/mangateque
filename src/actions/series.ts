"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { Series, SeriesCardData, LibraryStats } from "@/lib/types";

export type CreateSeriesInput = {
  anilist_id: number | null;
  title: string;
  cover_url: string | null;
  publisher: string;
  edition_variant: string | null;
  total_volumes: number | null;
  status: "ongoing" | "completed";
};

export async function createSeries(input: CreateSeriesInput): Promise<string> {
  const { data, error } = await supabase()
    .from("series")
    .insert(input)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect(`/series/${data.id}`);
}

export async function updateSeries(id: string, input: Partial<CreateSeriesInput>) {
  const { error } = await supabase().from("series").update(input).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath(`/series/${id}`);
}

export async function deleteSeries(id: string) {
  const { error } = await supabase().from("series").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  redirect("/");
}

export async function getSeries(id: string): Promise<Series | null> {
  const { data, error } = await supabase()
    .from("series")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function listSeriesForLibrary(): Promise<SeriesCardData[]> {
  const { data, error } = await supabase()
    .from("series")
    .select("*, volumes(price, is_read)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: any) => {
    const vols = row.volumes ?? [];
    return {
      ...row,
      volumes: undefined,
      owned_count: vols.length,
      read_count: vols.filter((v: any) => v.is_read).length,
      total_spent: vols.reduce((s: number, v: any) => s + Number(v.price), 0),
    } as SeriesCardData;
  });
}

export async function getLibraryStats(): Promise<LibraryStats> {
  const sb = supabase();
  const [{ data: series }, { data: volumes }] = await Promise.all([
    sb.from("series").select("status"),
    sb.from("volumes").select("price, is_read"),
  ]);
  const vols = volumes ?? [];
  const allSeries = series ?? [];
  const totalSpent = vols.reduce((s, v: any) => s + Number(v.price), 0);
  const readCount = vols.filter((v: any) => v.is_read).length;
  return {
    total_spent: totalSpent,
    series_count: allSeries.length,
    completed_count: allSeries.filter((s: any) => s.status === "completed").length,
    volumes_count: vols.length,
    read_count: readCount,
    read_pct: vols.length === 0 ? 0 : Math.round((readCount / vols.length) * 100),
  };
}
