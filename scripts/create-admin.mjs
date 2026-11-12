#!/usr/bin/env node
// Creates the first administrator (or promotes an existing account).
//
//   npm run create-admin -- you@example.com "Your Name"
//
// Prints a temporary password once. Sign in with it, then change it under
// My account. Every other account is created from Users & roles in the app.

import { randomInt } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const [email, ...nameParts] = process.argv.slice(2);
const fullName = nameParts.join(" ");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run create-admin -- you@example.com "Your Name"');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
const chunk = () => Array.from({ length: 4 }, () => alphabet[randomInt(alphabet.length)]).join("");
const password = `${chunk()}-${chunk()}-${chunk()}`;

const { data: created, error } = await supabase.auth.admin.createUser({
  email: email.toLowerCase(),
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

let userId = created?.user?.id;
let newPassword = true;
if (error) {
  if (error.code !== "email_exists") {
    console.error(`Couldn't create the account: ${error.message}`);
    process.exit(1);
  }
  const { data: existing } = await supabase.from("profiles").select("id").eq("email", email.toLowerCase()).maybeSingle();
  if (!existing) {
    console.error("That email already has an account, but no profile was found for it.");
    process.exit(1);
  }
  userId = existing.id;
  newPassword = false;
}

const patch = fullName ? { role: "admin", full_name: fullName } : { role: "admin" };
const { error: roleErr } = await supabase.from("profiles").update(patch).eq("id", userId);
if (roleErr) {
  console.error(`Couldn't make the account an administrator: ${roleErr.message}`);
  process.exit(1);
}

console.log(`\n${email} is an administrator.`);
if (newPassword) console.log(`Temporary password: ${password}\nSign in, then change it under My account.\n`);
else console.log("The account already existed, so its password is unchanged.\n");
