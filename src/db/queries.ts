import { eq, count, isNull, and, desc, inArray } from "drizzle-orm";
import { db } from ".";
import { users, inviteCodes, apiKeys, chats, type Platform } from "./schema";

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

export function getUserById(id: number) {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function updateUserPassword(userId: number, hashedPassword: string) {
  return db
    .update(users)
    .set({ password: hashedPassword })
    .where(eq(users.id, userId))
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

export function getChatsByUser(userId: number) {
  return db
    .select({
      id: chats.id,
      parentId: chats.parentId,
      title: chats.title,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.updatedAt))
    .all();
}

export function createChat(
  userId: number,
  provider: Platform,
  model: string,
  messages: unknown[]
) {
  return db
    .insert(chats)
    .values({ userId, provider, model, messages })
    .returning({ id: chats.id })
    .get();
}

export function deleteChatWithChildren(chatId: string, userId: number) {
  const userChats = db
    .select({ id: chats.id, parentId: chats.parentId })
    .from(chats)
    .where(eq(chats.userId, userId))
    .all();

  const childrenMap = new Map<string, string[]>();
  for (const chat of userChats) {
    if (chat.parentId != null) {
      const siblings = childrenMap.get(chat.parentId);
      if (siblings) {
        siblings.push(chat.id);
      } else {
        childrenMap.set(chat.parentId, [chat.id]);
      }
    }
  }

  // Verify the target chat belongs to this user
  if (!userChats.some((c) => c.id === chatId)) {
    return;
  }

  const toDelete: string[] = [];
  const stack = [chatId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    toDelete.push(id);
    const children = childrenMap.get(id);
    if (children) {
      stack.push(...children);
    }
  }

  db.delete(chats).where(inArray(chats.id, toDelete)).run();
}
