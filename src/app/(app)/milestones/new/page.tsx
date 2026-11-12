import type { Metadata } from "next";

import { memberOptions } from "@/components/member-picker";
import { PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { isMilestoneKind, MILESTONE_KINDS } from "@/lib/constants";
import { activeMinisters } from "@/lib/milestones";
import { createClient } from "@/lib/supabase/server";

import { MilestoneForm } from "../milestone-form";

export const metadata: Metadata = { title: "New record" };

export default async function NewMilestonePage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  await requireArea("records");
  const { kind: k } = await searchParams;
  const kind = isMilestoneKind(k) ? k : "baptism";
  const supabase = await createClient();
  const [ministers, options] = await Promise.all([activeMinisters(supabase), memberOptions(supabase)]);

  return (
    <>
      <PageHeader title={`Record a ${MILESTONE_KINDS[kind].label.toLowerCase()}`} back={{ href: `/milestones?kind=${kind}`, label: MILESTONE_KINDS[kind].plural }} />
      <MilestoneForm
        kind={kind}
        ministers={ministers}
        memberOptions={options}
        values={{ date: "", place: "CAOIM, Maya", officiant_id: "", officiant_name: "", certificate_no: "", notes: "", people: {} }}
      />
    </>
  );
}
