import type { Metadata } from "next";
import Link from "next/link";

import { Notice, PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { dateTime } from "@/lib/format";
import { SECTIONS, type Json } from "@/lib/site-settings";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Website" };

export default async function WebsitePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireArea("website");
  const { saved } = await searchParams;
  const supabase = await createClient();

  const [{ data: settings }, events, ministries, leaders, programmes] = await Promise.all([
    supabase.from("site_settings").select("data, updated_at").eq("id", 1).maybeSingle(),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("ministries").select("id", { count: "exact", head: true }),
    supabase.from("leaders").select("id", { count: "exact", head: true }),
    supabase.from("programmes").select("id", { count: "exact", head: true }),
  ]);
  const empty = !settings || Object.keys((settings.data as Json) ?? {}).length === 0;
  const savedTitle = saved && saved in SECTIONS ? SECTIONS[saved as keyof typeof SECTIONS].title : null;

  const lists = [
    { href: "/website/events", label: "Events", count: events.count, note: "Conferences, crusades and weekly services" },
    { href: "/website/programmes", label: "Weekly programme", count: programmes.count, note: "Service posters on the Events page" },
    { href: "/website/ministries", label: "Ministries", count: ministries.count, note: "Children, youth, men, women, outreach" },
    { href: "/website/leaders", label: "Leaders", count: leaders.count, note: "Leadership cards on the About page" },
  ];

  return (
    <>
      <PageHeader
        title="Website"
        description={
          <>
            Everything here appears on caoim.org. Changes go live within about a minute of saving; there is no
            separate publish step.
          </>
        }
      />

      <div className="space-y-8">
        {savedTitle && <Notice tone="ok">Saved “{savedTitle}”. The website will show it within a minute.</Notice>}
        {empty && (
          <Notice>
            The website settings are empty, so caoim.org is still showing the text built into its code. Run the
            import described in the README to copy the current website in, or fill in each section below.
          </Notice>
        )}

        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Lists</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {lists.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="panel flex items-start justify-between gap-4 p-5 transition-colors hover:border-line-strong">
                  <span>
                    <span className="block font-medium text-ink">{l.label}</span>
                    <span className="mt-1 block text-[13px] text-ink-2">{l.note}</span>
                  </span>
                  <span className="figure text-[20px] text-ink">{l.count ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-semibold">Pages &amp; settings</h2>
            {settings?.updated_at && !empty && (
              <p className="text-[13px] text-ink-2">Last changed {dateTime(settings.updated_at)}</p>
            )}
          </div>
          <ul className="panel divide-y divide-line">
            {Object.entries(SECTIONS).map(([key, s]) => (
              <li key={key}>
                <Link href={`/website/settings/${key}`} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-paper/70">
                  <span>
                    <span className="block font-medium text-ink">{s.title}</span>
                    <span className="mt-0.5 block text-[13px] text-ink-2">{s.description}</span>
                  </span>
                  <span aria-hidden className="text-ink-3">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
