import { eq, count, isNull, and } from "drizzle-orm";
import { db } from ".";
import { users, inviteCodes, apiKeys, type Platform } from "./schema";

export function getUserCount() {
  const [row] = db.select({ count: count() }).from(users).all();
  return row.count;
}

export function getUserByUsername(username: string) {
  return db.select().from(users).where(eq(users.username, username)).get();
}

export function createUser(
  username: string,
  passwordHash: string,
  isAdmin: boolean
) {
  return db
    .insert(users)
    .values({ username, password: passwordHash, isAdmin })
    .returning()
    .get();
}

export function getInviteByCode(code: string) {
  return db
    .select()
    .from(inviteCodes)
    .where(and(eq(inviteCodes.code, code), isNull(inviteCodes.redeemedBy)))
    .get();
}

export function redeemInviteCode(codeId: number, userId: number) {
  return db
    .update(inviteCodes)
    .set({ redeemedBy: userId, redeemedAt: new Date().toISOString() })
    .where(eq(inviteCodes.id, codeId))
    .run();
}

export function createInviteCode(code: string, createdBy: number) {
  return db.insert(inviteCodes).values({ code, createdBy }).returning().get();
}

export function upsertApiKey(
  userId: number,
  platform: Platform,
  encryptedKey: string
) {
  return db
    .insert(apiKeys)
    .values({ userId, platform, encryptedKey })
    .onConflictDoUpdate({
      target: [apiKeys.userId, apiKeys.platform],
      set: {
        encryptedKey,
        updatedAt: new Date().toISOString(),
      },
    })
    .run();
}

export function getApiKeysByUser(userId: number) {
  return db
    .select({ platform: apiKeys.platform, updatedAt: apiKeys.updatedAt })
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId))
    .all();
}

export function getApiKeyByUserAndPlatform(userId: number, platform: Platform) {
  return db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.platform, platform)))
    .get();
}
