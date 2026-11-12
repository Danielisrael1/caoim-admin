"use server";

import { randomInt } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { actionClient } from "@/lib/auth";
import { text, type ActionState } from "@/lib/forms";
import { isRole } from "@/lib/roles";
import { adminClient } from "@/lib/supabase/admin";

/** A temporary password that's easy to read out over the phone: four words of letters and digits. */
function tempPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const chunk = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
  return `${chunk()}-${chunk()}-${chunk()}`;
}

async function adminsLeft(excluding: string) {
  const { count } = await adminClient().from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin").neq("id", excluding);
  return count ?? 0;
}

export async function createUser(_: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("admin");
  if (!ctx.ok) return { error: ctx.error };

  const email = text(fd, "email").toLowerCase();
  const full_name = text(fd, "full_name");
  const role = text(fd, "role");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." };
  if (!full_name) return { error: "Enter the person's name." };
  if (!isRole(role)) return { error: "Choose a role." };

  const password = tempPassword();
  const admin = adminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });
  if (error) {
    return { error: error.code === "email_exists" ? "There's already an account with that email." : `Couldn't create the account: ${error.message}` };
  }
  // The profile row is created by a trigger; set the role and name on it.
  const { error: pErr } = await admin.from("profiles").update({ role, full_name }).eq("id", data.user.id);
  if (pErr) return { error: `Account created, but the role couldn't be set: ${pErr.message}` };

  revalidatePath("/users");
  return {
    ok: `Account created for ${email}. Temporary password: ${password} — give it to them in person or by phone; it isn't shown again. They can change it under My account.`,
  };
}

export async function setRole(userId: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const ctx = await actionClient("admin");
  if (!ctx.ok) return { error: ctx.error };
  const role = text(fd, "role");
  if (!isRole(role)) return { error: "Choose a role." };
  if (role !== "admin" && (await adminsLeft(userId)) === 0) {
    return { error: "This is the last administrator. Make someone else an administrator first." };
  }
  // Through the signed-in admin's own session, so the change is audited under their name.
  const { error } = await ctx.supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/users");
  redirect("/users?updated=1");
}

export async function resetPassword(userId: string): Promise<ActionState> {
  const ctx = await actionClient("admin");
  if (!ctx.ok) return { error: ctx.error };
  const password = tempPassword();
  const { data, error } = await adminClient().auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  return { ok: `New temporary password for ${data.user.email}: ${password}. It isn't shown again.` };
}

export async function deleteUser(userId: string): Promise<ActionState> {
  const ctx = await actionClient("admin");
  if (!ctx.ok) return { error: ctx.error };
  if (userId === ctx.viewer.id) return { error: "You can't delete your own account." };
  if ((await adminsLeft(userId)) === 0) return { error: "This is the last administrator." };
  const { error } = await adminClient().auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/users");
  redirect("/users?removed=1");
}
