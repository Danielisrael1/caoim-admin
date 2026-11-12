import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { deleteEvent, saveEvent } from "@/app/(app)/website/actions";
import { ActionForm, DeleteButton } from "@/components/action-form";
import { ImageField } from "@/components/image-field";
import { EventWhen } from "@/components/event-when";
import { Checkbox, Grid, PageHeader, Section, TextArea, TextField } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { isUuid } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Event" };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("website");
  const { id } = await params;
  const isNew = id === "new";
  if (!isNew && !isUuid(id)) notFound();

  let e: Record<string, string | number | boolean | null> = { published: true };
  if (!isNew) {
    const supabase = await createClient();
    const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
    if (!data) notFound();
    e = data;
  }
  const v = (k: string) => (e[k] ?? "") as string;
  const when = e.date ? "date" : e.repeat_weekday !== null && e.repeat_weekday !== undefined ? "weekly" : e.date_note ? "note" : "date";

  return (
    <>
      <PageHeader
        title={isNew ? "Add event" : v("title")}
        back={{ href: "/website/events", label: "Events" }}
        actions={
          !isNew && (
            <DeleteButton action={deleteEvent.bind(null, id)} label="Delete event" confirm={`Delete “${v("title")}”? It will disappear from the website.`} />
          )
        }
      />
      <ActionForm action={saveEvent.bind(null, isNew ? null : id)} submitLabel={isNew ? "Add event" : "Save changes"} cancelHref="/website/events">
        <Section title="What">
          <div className="space-y-5">
            <Grid>
              <TextField label="Title" name="title" defaultValue={v("title")} required />
              <TextField label="Theme (optional)" name="theme" defaultValue={v("theme")} placeholder="“None Found Like Them” — Daniel 1:19" />
            </Grid>
            <TextArea label="Description" name="summary" defaultValue={v("summary")} rows={4} />
            <Grid>
              <TextField label="Speakers (optional)" name="speakers" defaultValue={v("speakers")} />
              <TextField label="Location" name="location" defaultValue={v("location")} placeholder="CAOIM, Maya" />
            </Grid>
          </div>
        </Section>

        <Section title="When it happens" description="Choose one.">
          <EventWhen
            initial={when}
            date={v("date")}
            weekday={e.repeat_weekday === null || e.repeat_weekday === undefined ? "" : String(e.repeat_weekday)}
            note={v("date_note")}
          />
          <div className="mt-5">
            <Grid>
              <TextField label="Time" name="time_label" defaultValue={v("time_label")} placeholder="3:00 PM" />
              <TextField label="Repeats label (optional)" name="recurring" defaultValue={v("recurring")} placeholder="Every Sunday" hint="Shown as a tag on the event card." />
            </Grid>
          </div>
        </Section>

        <Section title="Poster">
          <ImageField name="poster_url" label="Poster" folder="events" defaultValue={v("poster_url")} hint="Portrait posters look best. Optional." />
        </Section>

        <Section title="On the website">
          <div className="space-y-2">
            <Checkbox name="published" label="Show on the website" defaultChecked={!!e.published} />
            <Checkbox name="featured" label="Feature on the Home page" defaultChecked={!!e.featured} hint="Only one event is featured at a time; ticking this un-features the current one." />
          </div>
        </Section>
      </ActionForm>
    </>
  );
}
