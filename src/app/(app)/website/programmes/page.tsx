import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Empty, PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Weekly programme" };

export default async function ProgrammesPage() {
  await requireArea("website");
  const supabase = await createClient();
  const { data } = await supabase.from("programmes").select("id, title, detail, poster_url, published").order("sort").order("title");
  const items = data ?? [];

  return (
    <>
      <PageHeader
        title="Weekly programme"
        description="The service posters shown on the Events page."
        actions={
          <Link href="/website/programmes/new" className="btn btn-primary">
            Add programme
          </Link>
        }
      />
      {items.length === 0 ? (
        <Empty title="No programmes yet" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <li key={p.id}>
              <Link href={`/website/programmes/${p.id}`} className="panel block overflow-hidden hover:border-line-strong">
                <div className="aspect-[4/5] bg-sunken">
                  {p.poster_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- Storage URL
                    <img src={p.poster_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex items-start justify-between gap-3 p-4">
                  <span>
                    <span className="block font-medium">{p.title}</span>
                    <span className="mt-0.5 block text-[13px] text-ink-2">{p.detail}</span>
                  </span>
                  {!p.published && <Badge>Hidden</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
