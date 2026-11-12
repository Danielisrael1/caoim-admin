"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionClient } from "@/lib/auth";
import { bool, date, dbError, int, lines, rows, slugify, text, type ActionState } from "@/lib/forms";
import { isSection, parseSection, type Json } from "@/lib/site-settings";

// ───────── Settings ─────────

export async function saveSection(section: string, _: ActionState, fd: FormData): Promise<ActionState> {
  if (!isSection(section)) return { error: "Unknown section." };
  const ctx = await actionClient("website");
  if (!ctx.ok) return { error: ctx.error };

  const parsed = parseSection(section, fd);
  if ("error" in parsed) return parsed;
  const patch = { ...parsed.patch };

  // The About page's text and its history timeline are edited separately but
  // live under the same `about` key, so merge into what's there.
  if (patch.__about) {
    const { data } = await ctx.supabase.from("site_settings").select("data").eq("id", 1).single();
    const current = ((data?.data as Json | undefined)?.about as Json | undefined) ?? {};
    patch.about = { ...current, ...(patch.__about as Json) };
    delete patch.__about;
  }

  const { error } = await ctx.supabase.rpc("merge_site_settings", { patch });
  if (error) return dbError(error);
  revalidatePath("/website");
  redirect(`/website?saved=${section}`);
}

// ───────── Events ─────────

export async function saveEvent(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("website");
  if (!ctx.ok) return { error: ctx.error };

  const title = text(fd, "title");
  if (!title) return { error: "Give the event a title." };

  const when = text(fd, "when");
  const row = {
    title,
    slug: slugify(text(fd, "slug") || title),
    theme: text(fd, "theme"),
    date: when === "date" ? date(fd, "date") : null,
    repeat_weekday: when === "weekly" ? int(fd, "repeat_weekday") : null,
    date_note: when === "note" ? text(fd, "date_note") : "",
    time_label: text(fd, "time_label"),
    location: text(fd, "location"),
    speakers: text(fd, "speakers"),
    recurring: text(fd, "recurring"),
    summary: text(fd, "summary"),
    poster_url: text(fd, "poster_url"),
    featured: bool(fd, "featured"),
    published: bool(fd, "published"),
  };
  if (when === "date" && !row.date) return { error: "Pick the date the event happens." };
  if (when === "weekly" && row.repeat_weekday === null) return { error: "Pick the day it repeats on." };
  if (when === "note" && !row.date_note) return { error: "Write when it happens, e.g. “A full week every January”." };
  if (!row.slug) return { error: "The web address can only use letters and numbers." };

  // Only one featured event at a time: un-feature the others first.
  if (row.featured) {
    let q = ctx.supabase.from("events").update({ featured: false }).eq("featured", true);
    if (id) q = q.neq("id", id);
    const { error } = await q;
    if (error) return dbError(error);
  }

  const { error } = id
    ? await ctx.supabase.from("events").update(row).eq("id", id)
    : await ctx.supabase.from("events").insert(row);
  if (error) return dbError(error);
  revalidatePath("/website/events");
  redirect("/website/events");
}

export async function deleteEvent(id: string): Promise<ActionState> {
  const ctx = await actionClient("website");
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await ctx.supabase.from("events").delete().eq("id", id);
  if (error) return dbError(error);
  redirect("/website/events");
}

// ───────── Ministries ─────────

export async function saveMinistry(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("website");
  if (!ctx.ok) return { error: ctx.error };
  const name = text(fd, "name");
  if (!name) return { error: "Give the ministry a name." };

  const row = {
    name,
    slug: slugify(text(fd, "slug") || name),
    audience: text(fd, "audience"),
    summary: text(fd, "summary"),
    meets: text(fd, "meets"),
    details: lines(fd, "details"),
    image_url: text(fd, "image_url"),
    gallery: rows<string>(fd, "gallery"),
    sort: int(fd, "sort") ?? 0,
    published: bool(fd, "published"),
  };
  const { error } = id
    ? await ctx.supabase.from("ministries").update(row).eq("id", id)
    : await ctx.supabase.from("ministries").insert(row);
  if (error) return dbError(error);
  revalidatePath("/website/ministries");
  redirect("/website/ministries");
}

export async function deleteMinistry(id: string): Promise<ActionState> {
  const ctx = await actionClient("website");
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await ctx.supabase.from("ministries").delete().eq("id", id);
  if (error) return dbError(error);
  redirect("/website/ministries");
}

// ───────── Leaders ─────────

export async function saveLeader(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("website");
  if (!ctx.ok) return { error: ctx.error };
  const name = text(fd, "name");
  if (!name) return { error: "Enter the leader's name." };

  const row = {
    name,
    department: text(fd, "department"),
    bio: text(fd, "bio"),
    photo_url: text(fd, "photo_url"),
    sort: int(fd, "sort") ?? 0,
    published: bool(fd, "published"),
  };
  const { error } = id
    ? await ctx.supabase.from("leaders").update(row).eq("id", id)
    : await ctx.supabase.from("leaders").insert(row);
  if (error) return dbError(error);
  revalidatePath("/website/leaders");
  redirect("/website/leaders");
}

export async function deleteLeader(id: string): Promise<ActionState> {
  const ctx = await actionClient("website");
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await ctx.supabase.from("leaders").delete().eq("id", id);
  if (error) return dbError(error);
  redirect("/website/leaders");
}

// ───────── Weekly programme ─────────

export async function saveProgramme(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("website");
  if (!ctx.ok) return { error: ctx.error };
  const title = text(fd, "title");
  if (!title) return { error: "Give the programme a title." };

  const row = {
    title,
    detail: text(fd, "detail"),
    poster_url: text(fd, "poster_url"),
    sort: int(fd, "sort") ?? 0,
    published: bool(fd, "published"),
  };
  const { error } = id
    ? await ctx.supabase.from("programmes").update(row).eq("id", id)
    : await ctx.supabase.from("programmes").insert(row);
  if (error) return dbError(error);
  revalidatePath("/website/programmes");
  redirect("/website/programmes");
}

export async function deleteProgramme(id: string): Promise<ActionState> {
  const ctx = await actionClient("website");
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await ctx.supabase.from("programmes").delete().eq("id", id);
  if (error) return dbError(error);
  redirect("/website/programmes");
}
