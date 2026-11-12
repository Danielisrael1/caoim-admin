"use server";

import { redirect } from "next/navigation";

import { text, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = text(fd, "email");
  const password = text(fd, "password");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return {
      error:
        error.code === "invalid_credentials"
          ? "That email and password don't match. Check them and try again."
          : `Couldn't sign in: ${error.message}`,
    };
  }
  const next = text(fd, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function changePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const password = text(fd, "password");
  const confirm = text(fd, "confirm");
  if (password.length < 10) return { error: "Use at least 10 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: `Couldn't change the password: ${error.message}` };
  redirect("/account?changed=1");
}
