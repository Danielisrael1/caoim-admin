import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { memberOptions } from "@/components/member-picker";
import { PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { memberLabel } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

import { MinisterForm, type MinisterRow } from "../../minister-form";

export const metadata: Metadata = { title: "Edit minister" };

export default async function EditMinisterPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("records");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: minister } = await supabase
    .from("ministers")
    .select("*, members(member_no, first_name, last_name, other_names)")
    .eq("id", id)
    .maybeSingle();
  if (!minister) notFound();
  const options = await memberOptions(supabase);
  const linked = Array.isArray(minister.members) ? minister.members[0] : minister.members;
  const { members: _omit, ...row } = minister;
  void _omit;

  return (
    <>
      <PageHeader title={`Edit ${minister.full_name}`} back={{ href: `/ministers/${id}`, label: minister.full_name }} />
      <MinisterForm minister={row as MinisterRow} memberLabel={linked ? memberLabel(linked) : ""} memberOptions={options} />
    </>
  );
}
