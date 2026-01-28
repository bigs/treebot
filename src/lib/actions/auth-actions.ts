"use server";

import argon2 from "argon2";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  getUserCount,
  getUserByUsername,
  createUser,
  getInviteByCode,
  redeemInviteCode,
} from "@/db/queries";
import { createSession, destroySession } from "@/lib/auth";

export type ActionState = { error?: string } | undefined;

export async function createAdmin(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = formData.get("username") as string | null;
  const password = formData.get("password") as string | null;

  if (!username || !password) {
    return { error: "Username and password are required." };
  }
  if (username.length < 3) {
    return { error: "Username must be at least 3 characters." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // Pre-check before expensive hash
  if (getUserCount() > 0) {
    return { error: "Admin account already exists." };
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });

  // Transaction: double-check no users exist after async hash, then insert
  const user = db.transaction(() => {
    if (getUserCount() > 0) return null;
    return createUser(username, hash, true);
  });

  if (!user) {
    return { error: "Admin account already exists." };
  }

  await createSession({
    sub: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
  });

  redirect("/onboarding/step-2");
}

export async function login(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = formData.get("username") as string | null;
  const password = formData.get("password") as string | null;

  if (!username || !password) {
    return { error: "Username and password are required." };
  }

  const user = getUserByUsername(username);
  if (!user) {
    return { error: "Invalid username or password." };
  }

  const valid = await argon2.verify(user.password, password);
  if (!valid) {
    return { error: "Invalid username or password." };
  }

  await createSession({
    sub: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
  });

  redirect("/");
}

export async function register(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const username = formData.get("username") as string | null;
  const password = formData.get("password") as string | null;
  const inviteCode = formData.get("inviteCode") as string | null;

  if (!username || !password || !inviteCode) {
    return { error: "All fields are required." };
  }
  if (username.length < 3) {
    return { error: "Username must be at least 3 characters." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const invite = getInviteByCode(inviteCode);
  if (!invite) {
    return { error: "Invalid or already used invite code." };
  }

  const existing = getUserByUsername(username);
  if (existing) {
    return { error: "Username is already taken." };
  }

  const hash = await argon2.hash(password, { type: argon2.argon2id });

  const user = db.transaction(() => {
    // Re-check invite hasn't been redeemed in the meantime
    const freshInvite = getInviteByCode(inviteCode);
    if (!freshInvite) return null;

    const newUser = createUser(username, hash, false);
    redeemInviteCode(freshInvite.id, newUser.id);
    return newUser;
  });

  if (!user) {
    return { error: "Invite code was already used. Please try again." };
  }

  await createSession({
    sub: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
  });

  redirect("/");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
