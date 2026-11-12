import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteProgramme, saveProgramme } from "@/app/(app)/website/actions";
import { ActionForm, DeleteButton } from "@/components/action-form";
import { ImageField } from "@/components/image-field";
import { Checkbox, PageHeader, Section, TextField } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Programme" };

type Programme = { title: string; detail: string; poster_url: string; sort: number; published: boolean };

export default async function ProgrammePage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("website");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !isUuid(id)) notFound();

  let p: Programme = { title: "", detail: "", poster_url: "", sort: 0, published: true };
  if (!isNew) {
    const supabase = await createClient();
    const { data } = await supabase.from("programmes").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    p = data as Programme;
  }

  return (
    <>
      <PageHeader
        title={isNew ? "Add programme" : p.title}
        back={{ href: "/website/programmes", label: "Weekly programme" }}
        actions={!isNew && <DeleteButton action={deleteProgramme.bind(null, id)} label="Delete" confirm={`Delete “${p.title}”?`} />}
      />
      <ActionForm action={saveProgramme.bind(null, isNew ? null : id)} submitLabel={isNew ? "Add programme" : "Save changes"} cancelHref="/website/programmes">
        <Section>
          <div className="space-y-5">
            <TextField label="Title" name="title" defaultValue={p.title} required placeholder="Sunday Main Service" />
            <TextField label="When" name="detail" defaultValue={p.detail} placeholder="Every Sunday · 9:00 AM – 2:00 PM" />
            <ImageField name="poster_url" label="Poster" folder="programmes" defaultValue={p.poster_url} />
            <TextField label="Order" name="sort" type="number" defaultValue={p.sort} wrap="max-w-[140px]" hint="Lower numbers come first." />
            <Checkbox name="published" label="Show on the website" defaultChecked={p.published} />
          </div>
        </Section>
      </ActionForm>
    </>
  );
}
