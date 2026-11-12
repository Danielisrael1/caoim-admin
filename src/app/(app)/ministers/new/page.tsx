import type { Metadata } from "next";

import { memberOptions } from "@/components/member-picker";
import { PageHeader } from "@/components/ui";
import { requireArea } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { MinisterForm } from "../minister-form";

export const metadata: Metadata = { title: "Add minister" };

export default async function NewMinisterPage() {
  await requireArea("records");
  const supabase = await createClient();
  const options = await memberOptions(supabase);
  return (
    <>
      <PageHeader title="Add minister" back={{ href: "/ministers", label: "Ministers" }} />
      <MinisterForm minister={{ status: "active", branch: "Maya" }} memberLabel="" memberOptions={options} />
    </>
  );
}
