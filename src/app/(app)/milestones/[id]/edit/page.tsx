import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { memberOptions } from "@/components/member-picker";
import { PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { MILESTONE_KINDS } from "@/lib/constants";
import { isUuid } from "@/lib/ids";
import { activeMinisters, loadMilestone } from "@/lib/milestones";
import { createClient } from "@/lib/supabase/server";

import { MilestoneForm } from "../../milestone-form";

export const metadata: Metadata = { title: "Edit record" };

export default async function EditMilestonePage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("records");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const [ms, ministers, options] = await Promise.all([loadMilestone(supabase, id), activeMinisters(supabase), memberOptions(supabase)]);
  if (!ms) notFound();

  // Rebuild "role:index" slots from the stored people.
  const counters: Record<string, number> = {};
  const people: Record<string, string> = {};
  for (const p of ms.people) {
    const i = counters[p.role] ?? 0;
    counters[p.role] = i + 1;
    people[`${p.role}:${i}`] = p.member ? p.member.label : p.name;
  }

  return (
    <>
      <PageHeader title={`Edit ${MILESTONE_KINDS[ms.kind].label.toLowerCase()}`} back={{ href: `/milestones/${id}`, label: ms.certificate_no }} />
      <MilestoneForm
        kind={ms.kind}
        ministers={ministers}
        memberOptions={options}
        values={{
          id,
          date: ms.date,
          place: ms.place,
          officiant_id: ms.officiant_id ?? "",
          officiant_name: ms.officiant_id ? "" : ms.officiant_name,
          certificate_no: ms.certificate_no,
          notes: ms.notes,
          people,
        }}
      />
    </>
  );
}
