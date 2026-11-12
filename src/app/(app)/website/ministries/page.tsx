import type { Metadata } from "next";
import Link from "next/link";

import { Badge, Empty, PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Ministries" };

export default async function MinistriesPage() {
  await requireArea("website");
  const supabase = await createClient();
  const { data } = await supabase
    .from("ministries")
    .select("id, name, audience, image_url, published, sort")
    .order("sort")
    .order("name");
  const items = data ?? [];

  return (
    <>
      <PageHeader
        title="Ministries"
        description="Each ministry gets a card on the Ministries page, in this order."
        actions={
          <Link href="/website/ministries/new" className="btn btn-primary">
            Add ministry
          </Link>
        }
      />
      {items.length === 0 ? (
        <Empty title="No ministries yet" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => (
            <li key={m.id}>
              <Link href={`/website/ministries/${m.id}`} className="panel block overflow-hidden transition-colors hover:border-line-strong">
                <div className="aspect-[16/10] bg-sunken">
                  {m.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element -- Storage URL
                    <img src={m.image_url} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex items-start justify-between gap-3 p-4">
                  <span>
                    <span className="block font-medium">{m.name}</span>
                    <span className="mt-0.5 block text-[13px] text-ink-2">{m.audience}</span>
                  </span>
                  {!m.published && <Badge>Hidden</Badge>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
