"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionClient } from "@/lib/auth";
import { BRANCHES, isMilestoneKind, MILESTONE_KINDS } from "@/lib/constants";
import { date, dbError, int, memberNoFrom, opt, text, type ActionState } from "@/lib/forms";
import { isUuid } from "@/lib/ids";

const branch = (fd: FormData) => {
  const b = text(fd, "branch");
  return (BRANCHES as readonly string[]).includes(b) ? b : "Maya";
};

// ───────── Members ─────────

export async function saveMember(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("records");
  if (!ctx.ok) return { error: ctx.error };

  const first_name = text(fd, "first_name");
  const last_name = text(fd, "last_name");
  if (!first_name || !last_name) return { error: "Enter both the first name and the surname." };

  const householdId = text(fd, "household_id");
  const row = {
    first_name,
    last_name,
    other_names: text(fd, "other_names"),
    gender: opt(fd, "gender"),
    date_of_birth: date(fd, "date_of_birth"),
    phone: text(fd, "phone"),
    alt_phone: text(fd, "alt_phone"),
    email: text(fd, "email"),
    address: text(fd, "address"),
    occupation: text(fd, "occupation"),
    marital_status: opt(fd, "marital_status"),
    household_id: isUuid(householdId) ? householdId : null,
    household_role: isUuid(householdId) ? opt(fd, "household_role") : null,
    branch: branch(fd),
    status: text(fd, "status") || "member",
    date_joined: date(fd, "date_joined"),
    department: text(fd, "department"),
    emergency_contact: text(fd, "emergency_contact"),
    notes: text(fd, "notes"),
  };

  if (id) {
    const { error } = await ctx.supabase.from("members").update(row).eq("id", id);
    if (error) return dbError(error);
    revalidatePath(`/members/${id}`);
    redirect(`/members/${id}`);
  }
  const { data, error } = await ctx.supabase.from("members").insert(row).select("id").single();
  if (error) return dbError(error);
  redirect(`/members/${data.id}?added=1`);
}

export async function deleteMember(id: string): Promise<ActionState> {
  const ctx = await actionClient("records");
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await ctx.supabase.from("members").delete().eq("id", id);
  if (error) return dbError(error);
  redirect("/members");
}

// ───────── Households ─────────

export async function saveHousehold(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("records");
  if (!ctx.ok) return { error: ctx.error };
  const name = text(fd, "name");
  if (!name) return { error: "Name the family, e.g. “The Tamale family”." };

  const row = { name, address: text(fd, "address"), phone: text(fd, "phone"), notes: text(fd, "notes") };
  if (id) {
    const { error } = await ctx.supabase.from("households").update(row).eq("id", id);
    if (error) return dbError(error);
    redirect(`/households/${id}`);
  }
  const { data, error } = await ctx.supabase.from("households").insert(row).select("id").single();
  if (error) return dbError(error);
  redirect(`/households/${data.id}`);
}

export async function deleteHousehold(id: string): Promise<ActionState> {
  const ctx = await actionClient("records");
  if (!ctx.ok) return { error: ctx.error };
  // Members stay; they're just no longer grouped (household_id → null).
  const { error } = await ctx.supabase.from("households").delete().eq("id", id);
  if (error) return dbError(error);
  redirect("/households");
}

// ───────── Ministers ─────────

export async function saveMinister(id: string | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("records");
  if (!ctx.ok) return { error: ctx.error };
  const full_name = text(fd, "full_name");
  if (!full_name) return { error: "Enter the minister's full name." };

  // Optional link to their member record.
  let member_id: string | null = null;
  const memberNo = memberNoFrom(text(fd, "member"));
  if (memberNo) {
    const { data } = await ctx.supabase.from("members").select("id").eq("member_no", memberNo).maybeSingle();
    member_id = data?.id ?? null;
  }

  const row = {
    member_id,
    title: text(fd, "title"),
    full_name,
    position: text(fd, "position"),
    branch: branch(fd),
    status: text(fd, "status") || "active",
    gender: opt(fd, "gender"),
    date_of_birth: date(fd, "date_of_birth"),
    national_id: text(fd, "national_id").toUpperCase(),
    marital_status: opt(fd, "marital_status"),
    spouse_name: text(fd, "spouse_name"),
    children_count: int(fd, "children_count"),
    phone: text(fd, "phone"),
    alt_phone: text(fd, "alt_phone"),
    email: text(fd, "email"),
    address: text(fd, "address"),
    home_district: text(fd, "home_district"),
    education: text(fd, "education"),
    theological_training: text(fd, "theological_training"),
    salvation_date: date(fd, "salvation_date"),
    ordination_date: date(fd, "ordination_date"),
    ordained_by: text(fd, "ordained_by"),
    date_started: date(fd, "date_started"),
    date_left: date(fd, "date_left"),
    next_of_kin_name: text(fd, "next_of_kin_name"),
    next_of_kin_relationship: text(fd, "next_of_kin_relationship"),
    next_of_kin_phone: text(fd, "next_of_kin_phone"),
    notes: text(fd, "notes"),
  };

  if (id) {
    const { error } = await ctx.supabase.from("ministers").update(row).eq("id", id);
    if (error) return dbError(error);
    redirect(`/ministers/${id}`);
  }
  const { data, error } = await ctx.supabase.from("ministers").insert(row).select("id").single();
  if (error) return dbError(error);
  redirect(`/ministers/${data.id}`);
}

export async function deleteMinister(id: string): Promise<ActionState> {
  const ctx = await actionClient("records");
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await ctx.supabase.from("ministers").delete().eq("id", id);
  if (error) return dbError(error);
  redirect("/ministers");
}

// ───────── Milestones: baptisms, weddings, dedications, funerals ─────────

export async function saveMilestone(id: string | null, kindInput: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("records");
  if (!ctx.ok) return { error: ctx.error };
  if (!isMilestoneKind(kindInput)) return { error: "Unknown record type." };
  const kind = kindInput;

  const when = date(fd, "date");
  if (!when) return { error: "Enter the date." };

  // Collect the people, resolving "Name (M-00012)" picks to member records.
  const slots = MILESTONE_KINDS[kind].roles.flatMap((r) =>
    "many" in r && r.many ? [`${r.role}:0`, `${r.role}:1`] : [`${r.role}:0`],
  );
  const picked = slots
    .map((slot, sort) => ({ role: slot.split(":")[0], label: text(fd, `person_${slot}`), sort }))
    .filter((p) => p.label);

  const primary = MILESTONE_KINDS[kind].roles[0];
  if (!picked.some((p) => p.role === primary.role)) return { error: `Enter the ${primary.label.toLowerCase()}'s name.` };

  const nos = picked.map((p) => memberNoFrom(p.label)).filter((n): n is string => !!n);
  const byNo = new Map<string, string>();
  if (nos.length) {
    const { data } = await ctx.supabase.from("members").select("id, member_no").in("member_no", nos);
    data?.forEach((m) => byNo.set(m.member_no, m.id));
  }
  const people = picked.map((p) => {
    const no = memberNoFrom(p.label);
    return {
      role: p.role,
      sort: p.sort,
      member_id: no ? (byNo.get(no) ?? null) : null,
      name: p.label.replace(/\s*\(M-\d+\)\s*$/, ""),
    };
  });

  const officiant = text(fd, "officiant_id");
  const row = {
    kind,
    date: when,
    place: text(fd, "place"),
    officiant_id: isUuid(officiant) ? officiant : null,
    officiant_name: text(fd, "officiant_name"),
    notes: text(fd, "notes"),
    ...(text(fd, "certificate_no") ? { certificate_no: text(fd, "certificate_no") } : {}),
  };

  let milestoneId = id;
  if (id) {
    const { error } = await ctx.supabase.from("milestones").update(row).eq("id", id);
    if (error) return dbError(error);
    const { error: delErr } = await ctx.supabase.from("milestone_people").delete().eq("milestone_id", id);
    if (delErr) return dbError(delErr);
  } else {
    const { data, error } = await ctx.supabase.from("milestones").insert(row).select("id").single();
    if (error) return dbError(error);
    milestoneId = data.id;
  }

  const { error: peopleErr } = await ctx.supabase
    .from("milestone_people")
    .insert(people.map((p) => ({ ...p, milestone_id: milestoneId })));
  if (peopleErr) return dbError(peopleErr);

  // A funeral for a member marks them deceased in the register.
  if (kind === "funeral") {
    const ids = people.filter((p) => p.role === "deceased" && p.member_id).map((p) => p.member_id!);
    if (ids.length) await ctx.supabase.from("members").update({ status: "deceased" }).in("id", ids);
  }

  revalidatePath("/milestones");
  redirect(`/milestones/${milestoneId}`);
}

export async function deleteMilestone(id: string): Promise<ActionState> {
  const ctx = await actionClient("records");
  if (!ctx.ok) return { error: ctx.error };
  const { error } = await ctx.supabase.from("milestones").delete().eq("id", id);
  if (error) return dbError(error);
  redirect("/milestones");
}
