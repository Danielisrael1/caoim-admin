import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteLeader, saveLeader } from "@/app/(app)/website/actions";
import { ActionForm, DeleteButton } from "@/components/action-form";
import { ImageField } from "@/components/image-field";
import { Checkbox, Grid, PageHeader, Section, TextArea, TextField } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leader" };

type Leader = { name: string; department: string; bio: string; photo_url: string; sort: number; published: boolean };

export default async function LeaderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("website");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !isUuid(id)) notFound();

  let l: Leader = { name: "", department: "", bio: "", photo_url: "", sort: 0, published: true };
  if (!isNew) {
    const supabase = await createClient();
    const { data } = await supabase.from("leaders").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    l = data as Leader;
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Add leader" : l.name}
        back={{ href: "/website/leaders", label: "Leaders" }}
        actions={!isNew && <DeleteButton action={deleteLeader.bind(null, id)} label="Remove leader" confirm={`Remove ${l.name} from the website?`} />}
      />
      <ActionForm action={saveLeader.bind(null, isNew ? null : id)} submitLabel={isNew ? "Add leader" : "Save changes"} cancelHref="/website/leaders">
        <Section>
          <div className="space-y-5">
            <Grid>
              <TextField label="Name" name="name" defaultValue={l.name} required placeholder="Pr. Teo Kisakye" />
              <TextField label="Role" name="department" defaultValue={l.department} placeholder="Evangelism Leader" />
            </Grid>
            <TextArea label="Short bio" name="bio" defaultValue={l.bio} rows={3} hint="One or two sentences." />
            <ImageField name="photo_url" label="Photo" folder="leaders" defaultValue={l.photo_url} hint="A head-and-shoulders photo. Without one, the website shows a plain placeholder." />
          </div>
        </Section>
        <Section title="On the website">
          <div className="space-y-4">
            <TextField label="Order" name="sort" type="number" defaultValue={l.sort} wrap="max-w-[140px]" hint="Lower numbers come first." />
            <Checkbox name="published" label="Show on the website" defaultChecked={l.published} />
          </div>
        </Section>
      </ActionForm>
    </>
  );
}
