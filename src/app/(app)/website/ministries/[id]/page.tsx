import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteMinistry, saveMinistry } from "@/app/(app)/website/actions";
import { ActionForm, DeleteButton } from "@/components/action-form";
import { GalleryField, ImageField } from "@/components/image-field";
import { Checkbox, Grid, PageHeader, Section, TextArea, TextField } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ministry" };

type Ministry = {
  name: string;
  slug: string;
  audience: string;
  summary: string;
  meets: string;
  details: string[];
  image_url: string;
  gallery: string[];
  sort: number;
  published: boolean;
};

export default async function MinistryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("website");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !isUuid(id)) notFound();

  let m: Ministry = { name: "", slug: "", audience: "", summary: "", meets: "", details: [], image_url: "", gallery: [], sort: 0, published: true };
  if (!isNew) {
    const supabase = await createClient();
    const { data } = await supabase.from("ministries").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    m = data as Ministry;
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Add ministry" : m.name}
        back={{ href: "/website/ministries", label: "Ministries" }}
        actions={
          !isNew && <DeleteButton action={deleteMinistry.bind(null, id)} label="Delete ministry" confirm={`Delete the ${m.name} ministry from the website?`} />
        }
      />
      <ActionForm action={saveMinistry.bind(null, isNew ? null : id)} submitLabel={isNew ? "Add ministry" : "Save changes"} cancelHref="/website/ministries">
        <Section>
          <div className="space-y-5">
            <Grid>
              <TextField label="Name" name="name" defaultValue={m.name} required />
              <TextField label="Who it's for" name="audience" defaultValue={m.audience} placeholder="13 – 25 years" />
              <TextField label="When it meets" name="meets" defaultValue={m.meets} placeholder="Sundays + midweek fellowships" />
              <TextField
                label="Web address"
                name="slug"
                defaultValue={m.slug}
                hint={isNew ? "Leave empty to make one from the name." : "Changing this breaks links people may have saved."}
              />
            </Grid>
            <TextArea label="Summary" name="summary" defaultValue={m.summary} rows={4} />
            <TextArea label="Details" name="details" defaultValue={m.details.join("\n")} rows={4} hint="One point per line." />
          </div>
        </Section>
        <Section title="Photos">
          <div className="space-y-6">
            <ImageField name="image_url" label="Main photo" folder="ministries" defaultValue={m.image_url} />
            <GalleryField name="gallery" label="Gallery (optional)" folder="ministries" defaultValue={m.gallery} />
          </div>
        </Section>
        <Section title="On the website">
          <div className="space-y-4">
            <TextField label="Order" name="sort" type="number" defaultValue={m.sort} wrap="max-w-[140px]" hint="Lower numbers come first." />
            <Checkbox name="published" label="Show on the website" defaultChecked={m.published} />
          </div>
        </Section>
      </ActionForm>
    </>
  );
}
