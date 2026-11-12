import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { saveSection } from "@/app/(app)/website/actions";
import { ActionForm } from "@/components/action-form";
import { GalleryField, ImageField } from "@/components/image-field";
import { Repeater } from "@/components/repeater";
import { Grid, PageHeader, Section, TextArea, TextField } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { get, isSection, list, objects, SECTIONS, str, type Json, type SectionKey } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ section: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section } = await params;
  return { title: isSection(section) ? SECTIONS[section].title : "Website" };
}

const paras = (v: unknown) => list(v).join("\n\n");
const linesOf = (v: unknown) => list(v).join("\n");

function fields(section: SectionKey, d: Json): ReactNode {
  const s = (path: string) => str(get(d, path));

  switch (section) {
    case "general":
      return (
        <>
          <Section title="Name">
            <Grid>
              <TextField label="Church name" name="name" defaultValue={s("name")} required wrap="sm:col-span-2" />
              <TextField label="Short name" name="shortName" defaultValue={s("shortName")} hint="Used in the logo area and page titles, e.g. CAOIM." />
              <TextField label="Campus" name="campus" defaultValue={s("campus")} />
              <TextField label="Full legal name" name="legalNote" defaultValue={s("legalNote")} wrap="sm:col-span-2" hint="Shown in the footer's copyright line." />
            </Grid>
          </Section>
          <Section title="Tagline" description="The verse the church is built on.">
            <Grid>
              <TextArea label="Tagline" name="tagline" defaultValue={s("tagline")} rows={3} wrap="sm:col-span-2" />
              <TextField label="Reference" name="taglineRef" defaultValue={s("taglineRef")} placeholder="Isaiah 61:1" />
            </Grid>
          </Section>
          <Section title="Home page headline" description="The large words over the video at the top of the Home page.">
            <div className="space-y-5">
              <TextField label="Headline" name="headline" defaultValue={s("hero.headline")} />
              <TextArea label="Line under the headline" name="subhead" defaultValue={s("hero.subhead")} rows={2} />
            </div>
          </Section>
        </>
      );

    case "welcome":
      return (
        <Section>
          <div className="space-y-5">
            <Grid>
              <TextField label="Small heading" name="eyebrow" defaultValue={s("homeWelcome.eyebrow")} placeholder="Meet our pastor" />
              <TextField label="Name" name="name" defaultValue={s("homeWelcome.name")} />
              <TextField label="Role" name="role" defaultValue={s("homeWelcome.role")} placeholder="Lead Pastor" />
            </Grid>
            <ImageField name="photo" label="Photo" folder="welcome" defaultValue={s("homeWelcome.photo")} hint="A landscape photo works best. Leave empty to keep the current one on the website." />
            <TextArea label="Welcome text" name="bio" defaultValue={paras(get(d, "homeWelcome.bio"))} rows={10} hint="Leave a blank line between paragraphs." />
          </div>
        </Section>
      );

    case "contact":
      return (
        <>
          <Section title="Phone & email">
            <Grid>
              <TextArea label="Phone numbers" name="phones" defaultValue={linesOf(get(d, "contact.phones"))} rows={4} hint="One per line, written the way people dial them, e.g. 0705 555 177." />
              <div className="space-y-5">
                <TextField label="Email" name="email" type="email" defaultValue={s("contact.email")} />
                <TextField label="Postal address" name="poBox" defaultValue={s("contact.poBox")} placeholder="P.O. Box 12362, Kampala, Uganda" />
              </div>
            </Grid>
          </Section>
          <Section title="Location">
            <div className="space-y-5">
              <TextArea label="Address" name="addressLines" defaultValue={linesOf(get(d, "contact.addressLines"))} rows={3} hint="One line per line of the address." />
              <TextArea label="Directions" name="addressNote" defaultValue={s("contact.addressNote")} rows={2} />
              <TextField label="Map search" name="mapQuery" defaultValue={s("contact.mapQuery")} hint="What Google Maps should search for to show the church, e.g. Maya, Wakiso, Uganda." />
            </div>
          </Section>
        </>
      );

    case "social":
      return (
        <>
          <Section title="Social links" description="Full links starting with https://. Leave one empty to hide it.">
            <Grid>
              <TextField label="Facebook" name="facebook" type="url" defaultValue={s("social.facebook")} />
              <TextField label="Instagram" name="instagram" type="url" defaultValue={s("social.instagram")} />
              <TextField label="YouTube" name="youtube" type="url" defaultValue={s("social.youtube")} />
              <TextField label="TikTok" name="tiktok" type="url" defaultValue={s("social.tiktok")} />
            </Grid>
          </Section>
          <Section title="YouTube channel" description="The Home page plays the channel's latest upload unless you pin one video.">
            <Grid>
              <TextField label="Handle" name="handle" defaultValue={s("youtube.handle")} placeholder="@caoimug" />
              <TextField label="Channel ID" name="channelId" defaultValue={s("youtube.channelId")} hint="Starts with UC…" />
              <TextField label="Channel link" name="channelUrl" type="url" defaultValue={s("youtube.channelUrl")} wrap="sm:col-span-2" />
              <TextField label="Pinned video (optional)" name="featuredVideoId" defaultValue={s("youtube.featuredVideoId")} wrap="sm:col-span-2" hint="Paste a YouTube link to feature that message instead of the latest upload. Clear it to go back to the latest." />
            </Grid>
          </Section>
        </>
      );

    case "services":
      return (
        <Section>
          <Repeater
            name="serviceTimes"
            label="Services"
            addLabel="Add a service"
            hint="Write times like 9:00 AM – 2:00 PM so Google can read them."
            defaultValue={objects(get(d, "serviceTimes")) as Record<string, string>[]}
            columns={[
              { key: "name", label: "Name", placeholder: "Main Service" },
              { key: "day", label: "Day", placeholder: "Sunday" },
              { key: "time", label: "Time", placeholder: "9:00 AM – 2:00 PM" },
              { key: "note", label: "Note", placeholder: "In person & online" },
            ]}
          />
        </Section>
      );

    case "about":
      return (
        <Section>
          <div className="space-y-5">
            <TextArea label="Introduction" name="intro" defaultValue={s("about.intro")} rows={4} />
            <TextArea label="Our story" name="story" defaultValue={paras(get(d, "about.story"))} rows={12} hint="Leave a blank line between paragraphs." />
            <TextArea label="Mission" name="mission" defaultValue={s("about.mission")} rows={3} />
            <TextArea label="Vision" name="vision" defaultValue={s("about.vision")} rows={3} />
          </div>
        </Section>
      );

    case "history":
      return (
        <Section>
          <div className="space-y-6">
            <Repeater
              name="history"
              label="Timeline"
              addLabel="Add a milestone"
              hint="Oldest first. The year can also be a word, like “Today”."
              defaultValue={objects(get(d, "about.history")) as Record<string, string>[]}
              columns={[
                { key: "year", label: "Year", placeholder: "2014" },
                { key: "label", label: "Date (optional)", placeholder: "September" },
                { key: "title", label: "Title", placeholder: "Our first home" },
                { key: "body", label: "What happened", type: "textarea" },
              ]}
            />
            <TextArea label="Closing paragraph" name="historyClosing" defaultValue={s("about.historyClosing")} rows={4} />
          </div>
        </Section>
      );

    case "lead-pastors":
      return (
        <>
          <Section>
            <div className="space-y-5">
              <Grid>
                <TextField label="Names" name="names" defaultValue={s("leadPastors.names")} placeholder="Pr. Robert & Justine Tamale" />
                <TextField label="Role" name="role" defaultValue={s("leadPastors.role")} placeholder="Lead Pastors" />
              </Grid>
              <ImageField name="photo" label="Photo" folder="lead-pastors" defaultValue={s("leadPastors.photo")} />
              <TextArea label="Biography" name="bio" defaultValue={paras(get(d, "leadPastors.bio"))} rows={14} hint="Leave a blank line between paragraphs." />
            </div>
          </Section>
          <Section title="Highlights" description="The small figures shown beside the biography.">
            <Repeater
              name="highlights"
              label="Figures"
              addLabel="Add a figure"
              defaultValue={objects(get(d, "leadPastors.highlights")) as Record<string, string>[]}
              columns={[
                { key: "value", label: "Figure", placeholder: "2012" },
                { key: "label", label: "Meaning", placeholder: "Founded the ministry in Maya" },
              ]}
            />
          </Section>
          <Section title="Photo strip">
            <div className="space-y-5">
              <TextField label="Caption" name="galleryCaption" defaultValue={s("leadPastors.galleryCaption")} />
              <GalleryField name="gallery" label="Photos" folder="lead-pastors" defaultValue={list(get(d, "leadPastors.gallery"))} />
            </div>
          </Section>
        </>
      );

    case "giving":
      return (
        <>
          <Section>
            <div className="space-y-5">
              <TextArea label="Introduction" name="intro" defaultValue={s("giving.intro")} rows={3} />
              <Grid>
                <TextArea label="Scripture" name="scriptureText" defaultValue={s("giving.scripture.text")} rows={3} />
                <TextField label="Reference" name="scriptureRef" defaultValue={s("giving.scripture.ref")} placeholder="2 Corinthians 9:7" />
              </Grid>
              <TextField label="Account name" name="accountName" defaultValue={s("giving.accountName")} />
              <ImageField name="poster" label="Poster" folder="giving" defaultValue={s("giving.poster")} />
              <TextArea label="Giving in person" name="inPerson" defaultValue={s("giving.inPerson")} rows={2} />
            </div>
          </Section>
          <Section title="Mobile money">
            <Repeater
              name="mobileMoney"
              label="Merchant codes"
              addLabel="Add a provider"
              defaultValue={objects(get(d, "giving.mobileMoney")) as Record<string, string | string[]>[]}
              columns={[
                { key: "provider", label: "Provider", placeholder: "MTN MoMo" },
                { key: "label", label: "Label", placeholder: "Merchant Code" },
                { key: "code", label: "Code", placeholder: "635500" },
                { key: "steps", label: "Steps (one per line)", type: "lines" },
              ]}
            />
          </Section>
        </>
      );
  }
}

export default async function SettingsSectionPage({ params }: Props) {
  await requireArea("website");
  const { section } = await params;
  if (!isSection(section)) notFound();

  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("data").eq("id", 1).maybeSingle();
  const settings = (data?.data as Json) ?? {};
  const info = SECTIONS[section];

  return (
    <>
      <PageHeader title={info.title} description={info.description} back={{ href: "/website", label: "Website" }} />
      <ActionForm action={saveSection.bind(null, section)} submitLabel="Save and publish" cancelHref="/website">
        {fields(section, settings)}
      </ActionForm>
    </>
  );
}
