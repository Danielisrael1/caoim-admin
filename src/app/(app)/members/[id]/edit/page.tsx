import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { fullName } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

import { MemberForm, type MemberRow } from "../../member-form";

export const metadata: Metadata = { title: "Edit member" };

export default async function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("records");
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const [{ data: member }, { data: households }] = await Promise.all([
    supabase.from("members").select("*").eq("id", id).maybeSingle(),
    supabase.from("households").select("id, name").order("name"),
  ]);
  if (!member) notFound();

  return (
    <>
      <PageHeader title={`Edit ${fullName(member)}`} back={{ href: `/members/${id}`, label: fullName(member) }} />
      <MemberForm member={member as MemberRow} households={households ?? []} />
    </>
  );
}
