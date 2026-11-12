// The editable sections of caoim.org's settings. Each one reads a form and
// returns the top-level keys of site.js it replaces.

import { lines, paragraphs, rows, text } from "@/lib/forms";

export type Json = Record<string, unknown>;

export const SECTIONS = {
  general: {
    title: "Church name & hero",
    description: "The church's name, the Isaiah 61 tagline, and the big headline over the Home page video.",
  },
  welcome: {
    title: "Pastor's welcome",
    description: "The “Meet our pastor” band on the Home page.",
  },
  contact: {
    title: "Contact & location",
    description: "Phone numbers, email, postal address and directions. Shown in the footer and on the About page.",
  },
  social: {
    title: "Social media & YouTube",
    description: "Links in the footer, and the YouTube channel the sermons section plays from.",
  },
  services: {
    title: "Service times",
    description: "Listed in the footer and the About page, and given to Google as the church's opening hours.",
  },
  about: {
    title: "About: story, mission & vision",
    description: "The opening sections of the About page.",
  },
  history: {
    title: "About: history timeline",
    description: "The dated timeline on the About page, and its closing paragraph.",
  },
  "lead-pastors": {
    title: "Lead pastors",
    description: "The large featured card at the top of the About page's leadership section.",
  },
  giving: {
    title: "Give page",
    description: "Mobile money merchant codes, steps, and the Give page text.",
  },
} as const;

export type SectionKey = keyof typeof SECTIONS;
export const isSection = (s: string): s is SectionKey => s in SECTIONS;

/** Read a nested value: get(data, "hero.headline"). */
export function get(data: Json | null | undefined, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Json)[k] : undefined), data);
}
export const str = (v: unknown) => (typeof v === "string" ? v : "");
export const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
export const objects = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is Json => !!x && typeof x === "object" && !Array.isArray(x)) : [];

type Parsed = { patch: Json } | { error: string };

export function parseSection(section: SectionKey, fd: FormData): Parsed {
  switch (section) {
    case "general": {
      const name = text(fd, "name");
      if (!name) return { error: "The church name can't be empty." };
      return {
        patch: {
          name,
          shortName: text(fd, "shortName"),
          campus: text(fd, "campus"),
          legalNote: text(fd, "legalNote"),
          tagline: text(fd, "tagline"),
          taglineRef: text(fd, "taglineRef"),
          hero: { headline: text(fd, "headline"), subhead: text(fd, "subhead") },
        },
      };
    }
    case "welcome":
      return {
        patch: {
          homeWelcome: {
            eyebrow: text(fd, "eyebrow"),
            name: text(fd, "name"),
            role: text(fd, "role"),
            photo: text(fd, "photo"),
            bio: paragraphs(fd, "bio"),
          },
        },
      };
    case "contact": {
      const email = text(fd, "email");
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "That email address doesn't look right." };
      return {
        patch: {
          contact: {
            phones: lines(fd, "phones"),
            email,
            poBox: text(fd, "poBox"),
            addressLines: lines(fd, "addressLines"),
            addressNote: text(fd, "addressNote"),
            mapQuery: text(fd, "mapQuery"),
          },
        },
      };
    }
    case "social": {
      const urls = ["facebook", "instagram", "youtube", "tiktok", "channelUrl"].map((k) => text(fd, k));
      if (urls.some((u) => u && !/^https:\/\//.test(u))) return { error: "Links must start with https://" };
      return {
        patch: {
          social: {
            facebook: text(fd, "facebook"),
            instagram: text(fd, "instagram"),
            youtube: text(fd, "youtube"),
            tiktok: text(fd, "tiktok"),
          },
          youtube: {
            handle: text(fd, "handle"),
            channelId: text(fd, "channelId"),
            channelUrl: text(fd, "channelUrl"),
            featuredVideoId: youtubeId(text(fd, "featuredVideoId")),
          },
        },
      };
    }
    case "services":
      return { patch: { serviceTimes: rows(fd, "serviceTimes") } };
    case "about":
      return {
        patch: {
          // Keep history (edited in its own section) by merging inside `about`.
          __about: {
            intro: text(fd, "intro"),
            story: paragraphs(fd, "story"),
            mission: text(fd, "mission"),
            vision: text(fd, "vision"),
          },
        },
      };
    case "history":
      return { patch: { __about: { history: rows(fd, "history"), historyClosing: text(fd, "historyClosing") } } };
    case "lead-pastors":
      return {
        patch: {
          leadPastors: {
            names: text(fd, "names"),
            role: text(fd, "role"),
            photo: text(fd, "photo"),
            bio: paragraphs(fd, "bio"),
            highlights: rows(fd, "highlights"),
            galleryCaption: text(fd, "galleryCaption"),
            gallery: rows<string>(fd, "gallery"),
          },
        },
      };
    case "giving":
      return {
        patch: {
          giving: {
            intro: text(fd, "intro"),
            scripture: { text: text(fd, "scriptureText"), ref: text(fd, "scriptureRef") },
            accountName: text(fd, "accountName"),
            poster: text(fd, "poster"),
            mobileMoney: rows(fd, "mobileMoney"),
            inPerson: text(fd, "inPerson"),
          },
        },
      };
  }
}

/** Accepts a bare ID or any YouTube link and returns the 11-character video ID. */
export function youtubeId(input: string) {
  if (!input) return "";
  const m = input.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : input;
}
