import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { memberLabel } from "@/lib/format";

export async function activeMinisters(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("ministers")
    .select("id, title, full_name, status")
    .order("full_name");
  return (data ?? []).map((m) => ({
    id: m.id as string,
    name: [m.title, m.full_name].filter(Boolean).join(" ") + (m.status === "active" ? "" : " (former)"),
  }));
}

export type MilestoneDetail = {
  id: string;
  kind: "baptism" | "wedding" | "dedication" | "funeral";
  date: string;
  place: string;
  officiant_id: string | null;
  officiant_name: string;
  certificate_no: string;
  notes: string;
  officiant: string;
  people: { role: string; name: string; sort: number; member: { id: string; member_no: string; label: string } | null }[];
};

export async function loadMilestone(supabase: SupabaseClient, id: string): Promise<MilestoneDetail | null> {
  const { data } = await supabase
    .from("milestones")
    .select(
      "*, ministers(title, full_name), milestone_people(role, name, sort, members(id, member_no, first_name, last_name, other_names))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);
  const minister = one(data.ministers) as { title: string; full_name: string } | null;

  return {
    ...data,
    officiant: minister ? [minister.title, minister.full_name].filter(Boolean).join(" ") : data.officiant_name,
    people: ((data.milestone_people ?? []) as { role: string; name: string; sort: number; members: unknown }[])
      .sort((a, b) => a.sort - b.sort)
      .map((p) => {
        const m = one(p.members as never) as { id: string; member_no: string; first_name: string; last_name: string; other_names: string } | null;
        return { role: p.role, name: p.name, sort: p.sort, member: m ? { id: m.id, member_no: m.member_no, label: memberLabel(m) } : null };
      }),
  } as MilestoneDetail;
}
