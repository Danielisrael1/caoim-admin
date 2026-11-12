#!/usr/bin/env node
// Copies everything currently on caoim.org — text and photos — into Supabase,
// so the admin starts from the real website instead of empty forms.
//
//   npm run import-website -- ../path/to/caoim-website
//   npm run import-website -- ../path/to/caoim-website --replace
//
// Without --replace, lists that already have entries (events, leaders, …) are
// left alone, so it's safe to run twice. Settings are always merged in.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const replace = args.includes("--replace");
const siteDir = path.resolve(args.find((a) => !a.startsWith("--")) ?? "../caoim-website");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
const contentFile = path.join(siteDir, "src/content/site.js");
if (!existsSync(contentFile)) {
  console.error(`Can't find ${contentFile}. Pass the website folder, e.g. npm run import-website -- ~/Downloads/caoim-website`);
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const site = (await import(pathToFileURL(contentFile).href)).default;

// ── Photos: /media/x.jpg in the website → Storage public URL ──
const uploaded = new Map();
const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif" };

async function media(webPath) {
  if (!webPath || typeof webPath !== "string" || !webPath.startsWith("/")) return webPath ?? "";
  if (uploaded.has(webPath)) return uploaded.get(webPath);
  const file = path.join(siteDir, "public", webPath);
  if (!existsSync(file)) {
    console.warn(`  ! missing ${webPath} — leaving the link as it is`);
    uploaded.set(webPath, webPath);
    return webPath;
  }
  const dest = `imported${webPath.replace(/^\/media/, "")}`;
  const { error } = await supabase.storage.from("site-media").upload(dest, await readFile(file), {
    contentType: TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`Upload of ${webPath} failed: ${error.message}`);
  const publicUrl = supabase.storage.from("site-media").getPublicUrl(dest).data.publicUrl;
  uploaded.set(webPath, publicUrl);
  console.log(`  ↑ ${webPath}`);
  return publicUrl;
}
const mediaAll = (list) => Promise.all((list ?? []).map(media));

// ── Settings ──
console.log("Settings…");
const settings = {
  name: site.name,
  shortName: site.shortName,
  campus: site.campus,
  legalNote: site.legalNote,
  tagline: site.tagline,
  taglineRef: site.taglineRef,
  hero: site.hero,
  // The Home page photo was hard-coded in the website; it's editable now.
  homeWelcome: { ...site.homeWelcome, photo: await media(site.homeWelcome?.photo ?? "/media/pastor-robert.jpg") },
  contact: site.contact,
  social: site.social,
  youtube: site.youtube,
  serviceTimes: site.serviceTimes,
  about: site.about,
  values: site.values,
  beliefs: site.beliefs,
  leadPastors: {
    ...site.leadPastors,
    photo: await media(site.leadPastors?.photo),
    gallery: await mediaAll(site.leadPastors?.gallery),
  },
  giving: { ...site.giving, poster: await media(site.giving?.poster) },
};
{
  const { error } = await supabase.rpc("merge_site_settings", { patch: settings });
  if (error) throw new Error(`Settings: ${error.message}`);
}

// ── Lists ──
async function list(table, rows) {
  const { count, error: countErr } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (countErr) throw new Error(`${table}: ${countErr.message}`);
  if (count && !replace) {
    console.log(`${table}: already has ${count} — skipped (use --replace to overwrite)`);
    return;
  }
  if (count) {
    const { error } = await supabase.from(table).delete().not("id", "is", null);
    if (error) throw new Error(`${table}: ${error.message}`);
  }
  const { error } = await supabase.from(table).insert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`${table}: imported ${rows.length}`);
}

console.log("Leaders…");
await list(
  "leaders",
  await Promise.all(
    (site.leadership ?? []).map(async (l, i) => ({
      name: l.name,
      department: l.department ?? l.role ?? "",
      bio: l.bio ?? "",
      photo_url: await media(l.photo),
      sort: (i + 1) * 10,
    })),
  ),
);

console.log("Ministries…");
await list(
  "ministries",
  await Promise.all(
    (site.ministries ?? []).map(async (m, i) => ({
      slug: m.slug,
      name: m.name,
      audience: m.audience ?? "",
      summary: m.summary ?? "",
      meets: m.meets ?? "",
      details: m.details ?? [],
      image_url: await media(m.image),
      gallery: await mediaAll(m.gallery),
      sort: (i + 1) * 10,
    })),
  ),
);

console.log("Events…");
await list(
  "events",
  await Promise.all(
    (site.events ?? []).map(async (e) => ({
      slug: e.slug,
      title: e.title,
      theme: e.theme ?? "",
      date: e.date ?? null,
      repeat_weekday: e.repeatWeekday ?? null,
      // An event with none of the three would break the "when" rule; keep it as a note.
      date_note: e.dateNote ?? (e.date || e.repeatWeekday !== undefined ? "" : "Date to be announced"),
      time_label: e.time ?? "",
      location: e.location ?? "",
      speakers: e.speakers ?? "",
      recurring: e.recurring ?? "",
      summary: e.summary ?? "",
      poster_url: await media(e.poster),
      featured: !!e.featured,
    })),
  ),
);

console.log("Weekly programme…");
await list(
  "programmes",
  await Promise.all(
    (site.programmes ?? []).map(async (p, i) => ({
      title: p.title,
      detail: p.detail ?? "",
      poster_url: await media(p.poster),
      sort: (i + 1) * 10,
    })),
  ),
);

console.log(`\nDone. ${uploaded.size} photos in Storage.`);
