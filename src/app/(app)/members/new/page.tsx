import type { Metadata } from "next";

import { PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { blankMember, MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Add member" };

export default async function NewMemberPage({ searchParams }: { searchParams: Promise<{ household?: string }> }) {
  await requireArea("records");
  const { household } = await searchParams;
  const supabase = await createClient();
  const { data: households } = await supabase.from("households").select("id, name").order("name");
  const known = households?.some((h) => h.id === household);

  return (
    <>
      <PageHeader title="Add member" back={{ href: "/members", label: "Members" }} description="A member number is given automatically." />
      <MemberForm member={{ ...blankMember, household_id: known ? household! : null }} households={households ?? []} />
    </>
  );
}
