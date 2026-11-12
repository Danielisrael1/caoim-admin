import type { SupabaseClient } from "@supabase/supabase-js";

import { Field } from "@/components/ui";
import { memberLabel } from "@/lib/format";

/** All member labels, e.g. "Jane Nakato (M-00012)", for a <datalist>. */
export async function memberOptions(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("member_directory")
    .select("member_no, first_name, last_name, other_names")
    .neq("status", "deceased")
    .order("last_name")
    .order("first_name")
    .limit(5000);
  return (data ?? []).map(memberLabel);
}

export function MemberDatalist({ id, options }: { id: string; options: string[] }) {
  return (
    <datalist id={id}>
      {options.map((o) => (
        <option key={o} value={o} />
      ))}
    </datalist>
  );
}

/**
 * A text box that suggests members as you type. Picking a suggestion links the
 * record to that member; typing any other name stores just the name.
 */
export function MemberInput({
  name,
  label,
  listId,
  defaultValue,
  hint,
  wrap,
}: {
  name: string;
  label: string;
  listId: string;
  defaultValue?: string;
  hint?: string;
  wrap?: string;
}) {
  return (
    <Field label={label} name={name} hint={hint} className={wrap}>
      <input id={name} name={name} list={listId} defaultValue={defaultValue} autoComplete="off" className="input" />
    </Field>
  );
}
