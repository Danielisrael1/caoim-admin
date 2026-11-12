import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteContribution, updateContribution } from "@/app/(app)/finance/actions";
import { ActionForm, DeleteButton } from "@/components/action-form";
import { MemberDatalist, MemberInput, memberOptions } from "@/components/member-picker";
import { Grid, PageHeader, Section, SelectField, TextArea, TextField } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { BRANCHES, PAY_METHOD, SERVICES } from "@/lib/constants";
import { loadFunds, optionsOf } from "@/lib/finance";
import { dateTime, memberLabel, money } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Gift" };

export default async function ContributionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("finance");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const [{ data: c }, funds, options] = await Promise.all([
    supabase.from("contributions").select("*").eq("id", id).maybeSingle(),
    loadFunds(supabase),
    memberOptions(supabase),
  ]);
  if (!c) notFound();

  let giver = c.giver_name as string;
  if (c.member_id) {
    const { data: m } = await supabase.from("member_directory").select("member_no, first_name, last_name, other_names").eq("id", c.member_id).maybeSingle();
    if (m) giver = memberLabel(m);
  }

  return (
    <>
      <PageHeader
        title={money(c.amount)}
        eyebrow={`Recorded ${dateTime(c.created_at)}`}
        back={{ href: "/finance/giving", label: "Giving" }}
        actions={<DeleteButton action={deleteContribution.bind(null, id)} label="Delete" confirm={`Delete this ${money(c.amount)} entry?`} />}
      />
      <ActionForm action={updateContribution.bind(null, id)} submitLabel="Save changes" cancelHref="/finance/giving">
        <MemberDatalist id="member-options" options={options} />
        <Section>
          <Grid cols={3}>
            <TextField label="Date" name="date" type="date" required defaultValue={c.date} />
            <TextField label="Amount (UGX)" name="amount" inputMode="numeric" required defaultValue={String(c.amount)} className="input figure" />
            <SelectField label="Fund" name="fund_id" defaultValue={c.fund_id} options={optionsOf(funds, c.fund_id)} />
            <SelectField label="Method" name="method" defaultValue={c.method} options={PAY_METHOD} />
            <TextField label="Reference" name="reference" defaultValue={c.reference} className="input figure" />
            <SelectField label="Branch" name="branch" defaultValue={c.branch} options={BRANCHES} />
            <MemberInput name="giver" label="From" listId="member-options" defaultValue={giver} wrap="sm:col-span-2" hint="Empty for a general collection." />
            <SelectField label="Service" name="service" defaultValue={c.service} options={SERVICES.includes(c.service) || !c.service ? SERVICES : [c.service, ...SERVICES]} blank="—" />
          </Grid>
          <div className="mt-5">
            <TextArea label="Notes" name="notes" defaultValue={c.notes} rows={2} />
          </div>
        </Section>
      </ActionForm>
    </>
  );
}
