"use server";

import argon2 from "argon2";
import { getSession } from "@/lib/auth";
import { getUserById, updateUserPassword } from "@/db/queries";

export type ChangePasswordState =
  | { error: string }
  | { success: string }
  | undefined;

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData
): Promise<ChangePasswordState> {
  const session = await getSession();
  if (!session) {
    return { error: "Not authenticated." };
  }

  const currentPassword = formData.get("currentPassword") as string | null;
  const newPassword = formData.get("newPassword") as string | null;
  const confirmPassword = formData.get("confirmPassword") as string | null;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All fields are required." };
  }

  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const user = getUserById(session.sub);
  if (!user) {
    return { error: "User not found." };
  }

  const valid = await argon2.verify(user.password, currentPassword);
  if (!valid) {
    return { error: "Current password is incorrect." };
  }

  const hash = await argon2.hash(newPassword, { type: argon2.argon2id });
  updateUserPassword(user.id, hash);

  return { success: "Password changed successfully." };
}
