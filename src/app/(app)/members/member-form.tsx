import { saveMember } from "@/app/(app)/records-actions";
import { ActionForm } from "@/components/action-form";
import { Grid, Section, SelectField, TextArea, TextField } from "@/components/ui";
import { BRANCHES, HOUSEHOLD_ROLE, MARITAL_STATUS, MEMBER_STATUS } from "@/lib/constants";
import { today } from "@/lib/format";

export type MemberRow = {
  id?: string;
  first_name: string;
  last_name: string;
  other_names: string;
  gender: string | null;
  date_of_birth: string | null;
  phone: string;
  alt_phone: string;
  email: string;
  address: string;
  occupation: string;
  marital_status: string | null;
  household_id: string | null;
  household_role: string | null;
  branch: string;
  status: string;
  date_joined: string | null;
  department: string;
  emergency_contact: string;
  notes: string;
};

export const blankMember: MemberRow = {
  first_name: "",
  last_name: "",
  other_names: "",
  gender: null,
  date_of_birth: null,
  phone: "",
  alt_phone: "",
  email: "",
  address: "",
  occupation: "",
  marital_status: null,
  household_id: null,
  household_role: null,
  branch: "Maya",
  status: "member",
  date_joined: null,
  department: "",
  emergency_contact: "",
  notes: "",
};

export function MemberForm({
  member,
  households,
}: {
  member: MemberRow;
  households: { id: string; name: string }[];
}) {
  const isNew = !member.id;
  const householdOptions = Object.fromEntries(households.map((h) => [h.id, h.name]));

  return (
    <ActionForm
      action={saveMember.bind(null, member.id ?? null)}
      submitLabel={isNew ? "Add member" : "Save changes"}
      cancelHref={isNew ? "/members" : `/members/${member.id}`}
    >
      <Section title="Name">
        <Grid cols={3}>
          <TextField label="First name" name="first_name" defaultValue={member.first_name} required autoComplete="off" />
          <TextField label="Surname" name="last_name" defaultValue={member.last_name} required autoComplete="off" />
          <TextField label="Other names" name="other_names" defaultValue={member.other_names} autoComplete="off" />
        </Grid>
      </Section>

      <Section title="Personal">
        <Grid cols={3}>
          <SelectField label="Sex" name="gender" defaultValue={member.gender ?? ""} blank="—" options={{ male: "Male", female: "Female" }} />
          <TextField label="Date of birth" name="date_of_birth" type="date" defaultValue={member.date_of_birth ?? ""} max={today()} />
          <SelectField label="Marital status" name="marital_status" defaultValue={member.marital_status ?? ""} blank="—" options={MARITAL_STATUS} />
          <TextField label="Occupation" name="occupation" defaultValue={member.occupation} />
        </Grid>
      </Section>

      <Section title="Contact">
        <Grid cols={3}>
          <TextField label="Phone" name="phone" type="tel" defaultValue={member.phone} placeholder="0772 000 000" />
          <TextField label="Other phone" name="alt_phone" type="tel" defaultValue={member.alt_phone} />
          <TextField label="Email" name="email" type="email" defaultValue={member.email} />
          <TextField label="Village / area" name="address" defaultValue={member.address} wrap="sm:col-span-2" />
          <TextField label="Emergency contact" name="emergency_contact" defaultValue={member.emergency_contact} placeholder="Name and phone" />
        </Grid>
      </Section>

      <Section title="Church">
        <Grid cols={3}>
          <SelectField label="Status" name="status" defaultValue={member.status} options={MEMBER_STATUS} />
          <SelectField label="Branch" name="branch" defaultValue={member.branch} options={BRANCHES} />
          <TextField label="Date joined" name="date_joined" type="date" defaultValue={member.date_joined ?? ""} max={today()} />
          <TextField label="Serves in" name="department" defaultValue={member.department} placeholder="Choir, ushering, youth…" wrap="sm:col-span-3" />
        </Grid>
      </Section>

      <Section
        title="Family"
        description={
          households.length === 0 ? "No families have been added yet. Add one under Families to group relatives together." : undefined
        }
      >
        <Grid>
          <SelectField label="Family" name="household_id" defaultValue={member.household_id ?? ""} blank="Not in a family" options={householdOptions} />
          <SelectField label="Place in the family" name="household_role" defaultValue={member.household_role ?? ""} blank="—" options={HOUSEHOLD_ROLE} />
        </Grid>
      </Section>

      <Section title="Notes">
        <TextArea label="Notes" name="notes" defaultValue={member.notes} rows={4} hint="Visible to everyone who can see church records." />
      </Section>
    </ActionForm>
  );
}
