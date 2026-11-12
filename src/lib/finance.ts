import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export type Named = { id: string; name: string; active: boolean; sort: number };

export async function loadFunds(supabase: SupabaseClient) {
  const { data } = await supabase.from("funds").select("id, name, active, sort").order("sort").order("name");
  return (data ?? []) as Named[];
}

export async function loadCategories(supabase: SupabaseClient) {
  const { data } = await supabase.from("expense_categories").select("id, name, active, sort").order("sort").order("name");
  return (data ?? []) as Named[];
}

/** {id: name} for <select>, active ones only unless `include` is one of them. */
export function optionsOf(items: Named[], include?: string | null) {
  return Object.fromEntries(items.filter((i) => i.active || i.id === include).map((i) => [i.id, i.name]));
}

export function monthRange(month: string) {
  // "2026-11" → ["2026-11-01", "2026-11-30"]
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${month}-01`, `${month}-${String(last).padStart(2, "0")}`] as const;
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
