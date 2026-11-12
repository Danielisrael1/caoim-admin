import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { allowed, isRole, type Area, type Role } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

export type Viewer = { id: string; email: string; name: string; role: Role };

/** The signed-in staff member, or null. Cached for the length of one request. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? "",
    name: profile?.full_name || user.email || "",
    role: isRole(profile?.role) ? profile.role : "none",
  };
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/** For pages: sends people without access back to the overview. */
export async function requireArea(area: Area) {
  const viewer = await requireViewer();
  if (!allowed(viewer.role, area)) redirect("/");
  return viewer;
}

/** For server actions: returns a client, or an error state the form can show. */
export async function actionClient(area: Area) {
  const viewer = await getViewer();
  if (!viewer) return { error: "Your session has ended. Sign in again." } as const;
  if (!allowed(viewer.role, area)) return { error: "Your account isn't allowed to make this change." } as const;
  return { supabase: await createClient(), viewer } as const;
}
