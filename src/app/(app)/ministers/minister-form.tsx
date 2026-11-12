import { saveMinister } from "@/app/(app)/records-actions";
import { ActionForm } from "@/components/action-form";
import { MemberDatalist, MemberInput } from "@/components/member-picker";
import { Grid, Section, SelectField, TextArea, TextField } from "@/components/ui";
import { BRANCHES, MARITAL_STATUS, MINISTER_STATUS } from "@/lib/constants";
import { today } from "@/lib/format";

export type MinisterRow = Record<string, string | number | null> & { id?: string };

const TITLES = ["Pr.", "Rev.", "Ap.", "Bishop", "Ev.", "Prophet", "Elder", "Deacon", "Deaconess", "Mr.", "Mrs.", "Ms."];

export function MinisterForm({
  minister,
  memberLabel,
  memberOptions,
}: {
  minister: MinisterRow;
  memberLabel: string;
  memberOptions: string[];
}) {
  const v = (k: string) => (minister[k] ?? "") as string;
  const isNew = !minister.id;

  return (
    <ActionForm
      action={saveMinister.bind(null, (minister.id as string | undefined) ?? null)}
      submitLabel={isNew ? "Add minister" : "Save changes"}
      cancelHref={isNew ? "/ministers" : `/ministers/${minister.id}`}
    >
      <MemberDatalist id="member-options" options={memberOptions} />

      <Section title="Ministry">
        <Grid cols={3}>
          <SelectField label="Title" name="title" defaultValue={v("title")} blank="—" options={TITLES} />
          <TextField label="Full name" name="full_name" defaultValue={v("full_name")} required wrap="sm:col-span-2" />
          <TextField label="Position" name="position" defaultValue={v("position")} placeholder="Youth Pastor" />
          <SelectField label="Branch" name="branch" defaultValue={v("branch") || "Maya"} options={BRANCHES} />
          <SelectField label="Status" name="status" defaultValue={v("status") || "active"} options={MINISTER_STATUS} />
          <TextField label="Saved on" name="salvation_date" type="date" defaultValue={v("salvation_date")} max={today()} />
          <TextField label="Ordained on" name="ordination_date" type="date" defaultValue={v("ordination_date")} max={today()} />
          <TextField label="Ordained by" name="ordained_by" defaultValue={v("ordained_by")} />
          <TextField label="Started serving at CAOIM" name="date_started" type="date" defaultValue={v("date_started")} />
          <TextField label="Left / retired" name="date_left" type="date" defaultValue={v("date_left")} />
          <MemberInput
            name="member"
            label="Member record (optional)"
            listId="member-options"
            defaultValue={memberLabel}
            hint="Start typing to link their member record."
          />
        </Grid>
      </Section>

      <Section title="Personal">
        <Grid cols={3}>
          <SelectField label="Sex" name="gender" defaultValue={v("gender")} blank="—" options={{ male: "Male", female: "Female" }} />
          <TextField label="Date of birth" name="date_of_birth" type="date" defaultValue={v("date_of_birth")} max={today()} />
          <TextField label="National ID (NIN)" name="national_id" defaultValue={v("national_id")} autoComplete="off" className="input uppercase" />
          <SelectField label="Marital status" name="marital_status" defaultValue={v("marital_status")} blank="—" options={MARITAL_STATUS} />
          <TextField label="Spouse's name" name="spouse_name" defaultValue={v("spouse_name")} />
          <TextField label="Number of children" name="children_count" type="number" min={0} defaultValue={v("children_count")} />
          <TextField label="Home district" name="home_district" defaultValue={v("home_district")} />
        </Grid>
      </Section>

      <Section title="Contact">
        <Grid cols={3}>
          <TextField label="Phone" name="phone" type="tel" defaultValue={v("phone")} />
          <TextField label="Other phone" name="alt_phone" type="tel" defaultValue={v("alt_phone")} />
          <TextField label="Email" name="email" type="email" defaultValue={v("email")} />
          <TextField label="Where they live" name="address" defaultValue={v("address")} wrap="sm:col-span-3" />
        </Grid>
      </Section>

      <Section title="Education & training">
        <Grid>
          <TextArea label="Education" name="education" defaultValue={v("education")} rows={3} />
          <TextArea label="Theological training" name="theological_training" defaultValue={v("theological_training")} rows={3} />
        </Grid>
      </Section>

      <Section title="Next of kin">
        <Grid cols={3}>
          <TextField label="Name" name="next_of_kin_name" defaultValue={v("next_of_kin_name")} />
          <TextField label="Relationship" name="next_of_kin_relationship" defaultValue={v("next_of_kin_relationship")} />
          <TextField label="Phone" name="next_of_kin_phone" type="tel" defaultValue={v("next_of_kin_phone")} />
        </Grid>
      </Section>

      <Section title="Notes">
        <TextArea label="Notes" name="notes" defaultValue={v("notes")} rows={4} />
      </Section>
    </ActionForm>
  );
}
