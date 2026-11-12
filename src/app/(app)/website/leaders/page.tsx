import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Empty, PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Leaders" };

export default async function LeadersPage() {
  await requireArea("website");
  const supabase = await createClient();
  const { data } = await supabase.from("leaders").select("id, name, department, photo_url, published").order("sort").order("name");
  const items = data ?? [];

  return (
    <>
      <PageHeader
        title="Leaders"
        description={
          <>
            The leadership cards on the About page, in this order. The lead pastors&apos; card is edited under{" "}
            <Link href="/website/settings/lead-pastors" className="link">
              Lead pastors
            </Link>
            . A minister&apos;s private details belong in Church records, not here.
          </>
        }
        actions={
          <Link href="/website/leaders/new" className="btn btn-primary">
            Add leader
          </Link>
        }
      />
      {items.length === 0 ? (
        <Empty title="No leaders yet" />
      ) : (
        <ul className="panel divide-y divide-line">
          {items.map((l) => (
            <li key={l.id}>
              <Link href={`/website/leaders/${l.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-paper/70">
                <span className="size-12 shrink-0 overflow-hidden rounded-full bg-sunken">
                  {l.photo_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- Storage URL
                    <img src={l.photo_url} alt="" className="h-full w-full object-cover" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{l.name}</span>
                  <span className="block text-[13px] text-ink-2">{l.department}</span>
                </span>
                {!l.published && <Badge>Hidden</Badge>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
