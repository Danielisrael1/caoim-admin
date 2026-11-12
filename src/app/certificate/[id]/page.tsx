import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { PrintButton } from "@/components/print-button";
import { requireArea } from "@/lib/auth";
import { longDay } from "@/lib/format";
import { isUuid } from "@/lib/ids";
import { loadMilestone, type MilestoneDetail } from "@/lib/milestones";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Certificate" };

function wording(ms: MilestoneDetail) {
  const name = (role: string, i = 0) => ms.people.filter((p) => p.role === role)[i]?.name ?? "";
  const when = longDay(ms.date);
  const where = ms.place ? ` at ${ms.place}` : "";

  switch (ms.kind) {
    case "baptism":
      return {
        title: "Certificate of Baptism",
        name: name("candidate"),
        body: `was baptised in water in the name of the Father, and of the Son, and of the Holy Spirit, on ${when}${where}.`,
        verse: "“Therefore go and make disciples of all nations, baptising them in the name of the Father and of the Son and of the Holy Spirit.” — Matthew 28:19",
        witnesses: [] as string[],
      };
    case "wedding":
      return {
        title: "Certificate of Holy Matrimony",
        name: [name("groom"), name("bride")].filter(Boolean).join("  &  "),
        body: `were joined together in holy matrimony before God and this congregation on ${when}${where}.`,
        verse: "“Therefore what God has joined together, let no one separate.” — Mark 10:9",
        witnesses: [name("witness", 0), name("witness", 1)].filter(Boolean),
      };
    case "dedication": {
      const parents = [name("father"), name("mother")].filter(Boolean).join(" and ");
      return {
        title: "Certificate of Dedication",
        name: name("child"),
        body: `${parents ? `child of ${parents}, ` : ""}was presented and dedicated to the Lord on ${when}${where}.`,
        verse: "“Children are a heritage from the Lord, offspring a reward from him.” — Psalm 127:3",
        witnesses: [] as string[],
      };
    }
    case "funeral":
      return {
        title: "In Loving Memory",
        name: name("deceased"),
        body: `was laid to rest, and a service of thanksgiving for their life was held on ${when}${where}.`,
        verse: "“I am the resurrection and the life. The one who believes in me will live, even though they die.” — John 11:25",
        witnesses: [] as string[],
      };
  }
}

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  await requireArea("records");
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const supabase = await createClient();
  const ms = await loadMilestone(supabase, id);
  if (!ms) notFound();

  const [{ data: settings }] = await Promise.all([supabase.from("site_settings").select("data").eq("id", 1).maybeSingle()]);
  const church = ((settings?.data as Record<string, unknown> | undefined)?.name as string) || "Christ the Alpha & Omega International Ministries";
  const w = wording(ms);

  return (
    <main className="min-h-dvh bg-sunken px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 0; }`}</style>
      <div className="no-print mx-auto mb-6 flex max-w-[1000px] items-center justify-between gap-3">
        <a href={`/milestones/${id}`} className="text-sm text-ink-2 hover:text-ink">
          ← Back to the record
        </a>
        <PrintButton />
      </div>

      <article className="mx-auto flex aspect-[297/210] w-full max-w-[1000px] flex-col bg-white p-[3%] shadow-sm print:max-w-none print:shadow-none">
        <div className="flex flex-1 flex-col items-center border-[3px] border-double border-brand px-[7%] py-[4%] text-center">
          <Image src="/logo.png" alt="" width={188} height={98} className="h-auto w-[13%]" priority />
          <p className="mt-[1.5%] font-serif text-[clamp(12px,1.7vw,17px)] tracking-[0.08em] text-brand uppercase">{church}</p>
          <h1 className="mt-[2.5%] font-serif text-[clamp(22px,3.6vw,38px)] font-semibold text-ink">{w.title}</h1>
          <span aria-hidden className="mt-[1.5%] block h-[3px] w-16 bg-gold" />

          <p className="mt-[3%] text-[clamp(11px,1.4vw,14px)] text-ink-2">This is to certify that</p>
          <p className="mt-[1.2%] font-serif text-[clamp(20px,3.2vw,34px)] font-semibold text-ink">{w.name}</p>
          <p className="mx-auto mt-[1.2%] max-w-[80%] text-[clamp(11px,1.5vw,16px)] leading-relaxed text-ink">{w.body}</p>
          <p className="mx-auto mt-[2.5%] max-w-[75%] font-serif text-[clamp(10px,1.25vw,13px)] text-ink-2 italic">{w.verse}</p>

          <div className="mt-auto grid w-full grid-cols-2 gap-[8%] pt-[4%] text-[clamp(10px,1.2vw,13px)]">
            <div>
              <div className="border-t border-ink pt-1.5">{ms.officiant || "Officiating minister"}</div>
              <div className="text-ink-2">Officiating minister</div>
            </div>
            <div>
              <div className="border-t border-ink pt-1.5">&nbsp;</div>
              <div className="text-ink-2">Lead Pastor</div>
            </div>
            {w.witnesses.map((name, i) => (
              <div key={i}>
                <div className="border-t border-ink pt-1.5">{name}</div>
                <div className="text-ink-2">Witness</div>
              </div>
            ))}
          </div>
          <p className="figure mt-[2.5%] text-[clamp(9px,1vw,11px)] text-ink-3">Certificate no. {ms.certificate_no}</p>
        </div>
      </article>
    </main>
  );
}
