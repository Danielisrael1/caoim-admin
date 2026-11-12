import type { Metadata } from "next";
import Link from "next/link";

import { recordGiving } from "@/app/(app)/finance/actions";
import { ActionForm } from "@/components/action-form";
import { MemberDatalist, memberOptions } from "@/components/member-picker";
import { Grid, Notice, PageHeader, Section, SelectField, TextField } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { BRANCHES, PAY_METHOD, SERVICES } from "@/lib/constants";
import { loadFunds } from "@/lib/finance";
import { today } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Record giving" };

const LINES = 8;

export default async function RecordGivingPage() {
  await requireArea("finance");
  const supabase = await createClient();
  const [funds, options] = await Promise.all([loadFunds(supabase), memberOptions(supabase)]);
  const active = funds.filter((f) => f.active);

  return (
    <>
      <PageHeader
        title="Record giving"
        back={{ href: "/finance/giving", label: "Giving" }}
        description="One line per amount. Leave “From” empty for a general collection; pick a member to credit their giving record. Empty lines are ignored."
      />
      {active.length === 0 ? (
        <Notice>
          There are no active funds yet.{" "}
          <Link href="/finance/funds" className="link">
            Add a fund first
          </Link>
          .
        </Notice>
      ) : (
        <ActionForm action={recordGiving} submitLabel="Save all lines" cancelHref="/finance/giving">
          <MemberDatalist id="member-options" options={options} />
          <Section title="Service">
            <Grid cols={3}>
              <TextField label="Date" name="date" type="date" required defaultValue={today()} />
              <SelectField label="Service" name="service" options={SERVICES} blank="—" />
              <SelectField label="Branch" name="branch" options={BRANCHES} defaultValue="Maya" />
            </Grid>
          </Section>

          <Section title="Amounts">
            <div className="hidden grid-cols-[1.1fr_1fr_0.9fr_1.4fr_1fr] gap-3 pb-2 text-[12px] font-semibold tracking-wide text-ink-2 uppercase md:grid">
              <span>Fund</span>
              <span>Amount (UGX)</span>
              <span>Method</span>
              <span>From (optional)</span>
              <span>Reference</span>
            </div>
            <ol className="space-y-4 md:space-y-2">
              {Array.from({ length: LINES }, (_, i) => (
                <li key={i} className="grid grid-cols-2 gap-2 rounded-md border border-line p-3 md:grid-cols-[1.1fr_1fr_0.9fr_1.4fr_1fr] md:gap-3 md:border-0 md:p-0">
                  <label className="sr-only" htmlFor={`fund-${i}`}>
                    Line {i + 1} fund
                  </label>
                  <select id={`fund-${i}`} name="fund_id" className="input col-span-2 md:col-span-1" defaultValue={active[i]?.id ?? active[0].id}>
                    {active.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`amount-${i}`}>
                    Line {i + 1} amount
                  </label>
                  <input id={`amount-${i}`} name="amount" inputMode="numeric" placeholder="0" className="input figure" autoComplete="off" />
                  <label className="sr-only" htmlFor={`method-${i}`}>
                    Line {i + 1} method
                  </label>
                  <select id={`method-${i}`} name="method" className="input" defaultValue="cash">
                    {Object.entries(PAY_METHOD).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <label className="sr-only" htmlFor={`giver-${i}`}>
                    Line {i + 1} from
                  </label>
                  <input id={`giver-${i}`} name="giver" list="member-options" placeholder="General collection" className="input col-span-2 md:col-span-1" autoComplete="off" />
                  <label className="sr-only" htmlFor={`reference-${i}`}>
                    Line {i + 1} reference
                  </label>
                  <input id={`reference-${i}`} name="reference" placeholder="MoMo ID / receipt" className="input figure col-span-2 md:col-span-1" autoComplete="off" />
                </li>
              ))}
            </ol>
            <p className="hint">Need more than {LINES} lines? Save these, then record the rest.</p>
          </Section>
        </ActionForm>
      )}
    </>
  );
}
