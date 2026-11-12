import { saveMilestone } from "@/app/(app)/records-actions";
import { ActionForm } from "@/components/action-form";
import { MemberDatalist, MemberInput } from "@/components/member-picker";
import { Grid, Section, SelectField, TextArea, TextField } from "@/components/ui";
import { MILESTONE_KINDS, type MilestoneKind } from "@/lib/constants";
import { today } from "@/lib/format";

export type MilestoneValues = {
  id?: string;
  date: string;
  place: string;
  officiant_id: string;
  officiant_name: string;
  certificate_no: string;
  notes: string;
  people: Record<string, string>; // "groom:0" → "John Doe (M-00012)"
};

export function MilestoneForm({
  kind,
  values,
  ministers,
  memberOptions,
}: {
  kind: MilestoneKind;
  values: MilestoneValues;
  ministers: { id: string; name: string }[];
  memberOptions: string[];
}) {
  const info = MILESTONE_KINDS[kind];
  const isNew = !values.id;
  const slots = info.roles.flatMap((r) =>
    "many" in r && r.many
      ? [
          { slot: `${r.role}:0`, label: `${r.label} 1` },
          { slot: `${r.role}:1`, label: `${r.label} 2` },
        ]
      : [{ slot: `${r.role}:0`, label: r.label }],
  );

  return (
    <ActionForm
      action={saveMilestone.bind(null, values.id ?? null, kind)}
      submitLabel={isNew ? `Record ${info.label.toLowerCase()}` : "Save changes"}
      cancelHref={isNew ? `/milestones?kind=${kind}` : `/milestones/${values.id}`}
    >
      <MemberDatalist id="member-options" options={memberOptions} />

      <Section title="Who" description="Start typing to pick a member; that links this record to their file. Anyone who isn't a member can be typed in by name.">
        <Grid>
          {slots.map((s, i) => (
            <MemberInput key={s.slot} name={`person_${s.slot}`} label={i === 0 ? `${s.label} (required)` : s.label} listId="member-options" defaultValue={values.people[s.slot] ?? ""} />
          ))}
        </Grid>
      </Section>

      <Section title="When & where">
        <Grid cols={3}>
          <TextField label="Date" name="date" type="date" required defaultValue={values.date || (isNew ? today() : "")} />
          <TextField label="Place" name="place" defaultValue={values.place} placeholder="CAOIM, Maya" wrap="sm:col-span-2" />
          <SelectField
            label="Officiated by"
            name="officiant_id"
            defaultValue={values.officiant_id}
            blank="Someone else (type below)"
            options={Object.fromEntries(ministers.map((m) => [m.id, m.name]))}
            wrap="sm:col-span-2"
          />
          <TextField label="Officiant's name, if not listed" name="officiant_name" defaultValue={values.officiant_name} />
        </Grid>
      </Section>

      <Section title="Certificate">
        <TextField
          label="Certificate number"
          name="certificate_no"
          defaultValue={values.certificate_no}
          wrap="max-w-sm"
          className="input figure"
          hint={isNew ? "Leave empty to number it automatically, e.g. BAP-2026-004. Fill it in when copying an old paper record." : undefined}
        />
      </Section>

      <Section title="Notes">
        <TextArea label="Notes" name="notes" defaultValue={values.notes} rows={3} />
      </Section>
    </ActionForm>
  );
}
