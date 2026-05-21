"use server";

import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";
import type { Volume } from "@/lib/types";

export async function listVolumes(seriesId: string): Promise<Volume[]> {
  const { data, error } = await supabase()
    .from("volumes")
    .select("*")
    .eq("series_id", seriesId)
    .order("number", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function addVolume(seriesId: string, number: number, price: number) {
  const { error } = await supabase().from("volumes").insert({
    series_id: seriesId,
    number,
    price,
    is_read: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/series/${seriesId}`);
  revalidatePath("/");
}

export async function toggleVolumeRead(volumeId: string, isRead: boolean) {
  const { data, error } = await supabase()
    .from("volumes")
    .update({ is_read: isRead })
    .eq("id", volumeId)
    .select("series_id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/series/${data.series_id}`);
  revalidatePath("/");
}

export async function updateVolumePrice(volumeId: string, price: number) {
  if (!(price >= 0)) throw new Error("Prix invalide");
  const { data, error } = await supabase()
    .from("volumes")
    .update({ price })
    .eq("id", volumeId)
    .select("series_id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/series/${data.series_id}`);
  revalidatePath("/");
}

export async function deleteVolume(volumeId: string) {
  const { data, error } = await supabase()
    .from("volumes")
    .delete()
    .eq("id", volumeId)
    .select("series_id")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/series/${data.series_id}`);
  revalidatePath("/");
}
