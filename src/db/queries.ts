import { eq, count, isNull, and, desc, inArray, asc } from "drizzle-orm";
import { db } from ".";
import {
  users,
  inviteCodes,
  apiKeys,
  workspaces,
  chats,
  type Platform,
} from "./schema";
import type { ModelParams } from "@/lib/models";

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
  const user = db
    .insert(users)
    .values({ username, password: passwordHash, isAdmin })
    .returning()
    .get();
  createWorkspace(user.id, "Ephemera");
  return user;
}

export function createWorkspace(userId: number, name: string) {
  const now = new Date().toISOString();
  return db
    .insert(workspaces)
    .values({
      userId,
      name,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: workspaces.id })
    .get();
}

export function getWorkspacesByUser(userId: number) {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      createdAt: workspaces.createdAt,
    })
    .from(workspaces)
    .where(eq(workspaces.userId, userId))
    .orderBy(asc(workspaces.createdAt))
    .all();
}

export function getWorkspaceById(workspaceId: string, userId: number) {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      createdAt: workspaces.createdAt,
    })
    .from(workspaces)
    .where(
      and(eq(workspaces.id, workspaceId), eq(workspaces.userId, userId))
    )
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

export function getChatsByWorkspace(userId: number, workspaceId: string) {
  return db
    .select({
      id: chats.id,
      parentId: chats.parentId,
      title: chats.title,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(
      and(eq(chats.userId, userId), eq(chats.workspaceId, workspaceId))
    )
    .orderBy(desc(chats.updatedAt))
    .all();
}

export function getRecentChatsByWorkspace(
  userId: number,
  workspaceId: string,
  limit = 5
) {
  return db
    .select({
      id: chats.id,
      title: chats.title,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(
      and(eq(chats.userId, userId), eq(chats.workspaceId, workspaceId))
    )
    .orderBy(desc(chats.updatedAt))
    .limit(limit)
    .all();
}

export function getMostRecentChatByWorkspace(
  userId: number,
  workspaceId: string
) {
  return db
    .select({
      id: chats.id,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(
      and(eq(chats.userId, userId), eq(chats.workspaceId, workspaceId))
    )
    .orderBy(desc(chats.updatedAt))
    .get();
}

export function getWorkspaceIdForChat(chatId: string, userId: number) {
  return db
    .select({ workspaceId: chats.workspaceId })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .get();
}

export function getChatIdsByWorkspace(userId: number, workspaceId: string) {
  return db
    .select({ id: chats.id })
    .from(chats)
    .where(
      and(eq(chats.userId, userId), eq(chats.workspaceId, workspaceId))
    )
    .all()
    .map((row) => row.id);
}

export function deleteChatsByWorkspace(userId: number, workspaceId: string) {
  return db
    .delete(chats)
    .where(
      and(eq(chats.userId, userId), eq(chats.workspaceId, workspaceId))
    )
    .run();
}

export function deleteWorkspaceById(userId: number, workspaceId: string) {
  return db
    .delete(workspaces)
    .where(
      and(eq(workspaces.userId, userId), eq(workspaces.id, workspaceId))
    )
    .run();
}

export function createChat(
  userId: number,
  workspaceId: string,
  provider: Platform,
  model: string,
  messages: unknown[],
  modelParams?: ModelParams
) {
  const now = new Date().toISOString();
  return db
    .insert(chats)
    .values({
      userId,
      workspaceId,
      provider,
      model,
      messages,
      modelParams,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: chats.id })
    .get();
}

export const createForkedChat = (
  userId: number,
  workspaceId: string,
  parentId: string,
  provider: Platform,
  model: string,
  messages: unknown[],
  modelParams?: ModelParams | null,
  title?: string | null
): { id: string } => {
  const now = new Date().toISOString();
  return db
    .insert(chats)
    .values({
      userId,
      workspaceId,
      parentId,
      provider,
      model,
      messages,
      modelParams,
      title,
      createdAt: now,
      updatedAt: now,
    })
    .returning({ id: chats.id })
    .get();
};

export function getChatById(chatId: string, userId: number) {
  return db
    .select({
      id: chats.id,
      workspaceId: chats.workspaceId,
      parentId: chats.parentId,
      model: chats.model,
      provider: chats.provider,
      modelParams: chats.modelParams,
      messages: chats.messages,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .get();
}

export function getChatByIdInWorkspace(
  chatId: string,
  workspaceId: string,
  userId: number
) {
  return db
    .select({
      id: chats.id,
      workspaceId: chats.workspaceId,
      parentId: chats.parentId,
      model: chats.model,
      provider: chats.provider,
      modelParams: chats.modelParams,
      messages: chats.messages,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.workspaceId, workspaceId),
        eq(chats.userId, userId)
      )
    )
    .get();
}

export function getChatTitleByIdInWorkspace(
  chatId: string,
  workspaceId: string,
  userId: number
) {
  return db
    .select({
      id: chats.id,
      title: chats.title,
      updatedAt: chats.updatedAt,
      workspaceId: chats.workspaceId,
    })
    .from(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.workspaceId, workspaceId),
        eq(chats.userId, userId)
      )
    )
    .get();
}

export function updateChatMessages(
  chatId: string,
  userId: number,
  messages: unknown[]
) {
  return db
    .update(chats)
    .set({ messages, updatedAt: new Date().toISOString() })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .run();
}

export function updateChatTitle(chatId: string, userId: number, title: string) {
  return db
    .update(chats)
    .set({ title, updatedAt: new Date().toISOString() })
    .where(and(eq(chats.id, chatId), eq(chats.userId, userId)))
    .run();
}

function collectChatSubtreeIds(
  chatId: string,
  userId: number,
  workspaceId: string
): string[] {
  const userChats = db
    .select({ id: chats.id, parentId: chats.parentId })
    .from(chats)
    .where(
      and(eq(chats.userId, userId), eq(chats.workspaceId, workspaceId))
    )
    .all();

  let hasRoot = false;
  const childrenMap = new Map<string, string[]>();
  for (const chat of userChats) {
    if (chat.id === chatId) {
      hasRoot = true;
    }
    if (chat.parentId != null) {
      const siblings = childrenMap.get(chat.parentId);
      if (siblings) {
        siblings.push(chat.id);
      } else {
        childrenMap.set(chat.parentId, [chat.id]);
      }
    }
  }

  if (!hasRoot) {
    return [];
  }

  const collected: string[] = [];
  const stack = [chatId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    collected.push(id);
    const children = childrenMap.get(id);
    if (children) {
      stack.push(...children);
    }
  }

  return collected;
}

function rewriteAttachmentUrls(
  messages: unknown,
  chatId: string,
  fromWorkspaceId: string,
  toWorkspaceId: string
): { updated: unknown; changed: boolean } {
  const fromPrefix = `/ws/${fromWorkspaceId}/chats/${chatId}/attachments/`;
  const toPrefix = `/ws/${toWorkspaceId}/chats/${chatId}/attachments/`;
  let serialized: string | undefined;
  try {
    serialized = JSON.stringify(messages);
  } catch {
    return { updated: messages, changed: false };
  }
  if (!serialized) {
    return { updated: messages, changed: false };
  }
  if (!serialized.includes(fromPrefix)) {
    return { updated: messages, changed: false };
  }
  const replaced = serialized.replaceAll(fromPrefix, toPrefix);
  if (replaced === serialized) {
    return { updated: messages, changed: false };
  }
  return { updated: JSON.parse(replaced), changed: true };
}

export function deleteChatWithChildren(
  chatId: string,
  userId: number,
  workspaceId: string
): string[] {
  const toDelete = collectChatSubtreeIds(chatId, userId, workspaceId);
  if (toDelete.length === 0) {
    return [];
  }

  db.delete(chats).where(inArray(chats.id, toDelete)).run();
  return toDelete;
}

export function moveChatWithChildren(
  chatId: string,
  userId: number,
  fromWorkspaceId: string,
  toWorkspaceId: string
): string[] {
  const toMove = collectChatSubtreeIds(chatId, userId, fromWorkspaceId);
  if (toMove.length === 0) {
    return [];
  }

  db.update(chats)
    .set({ workspaceId: toWorkspaceId })
    .where(inArray(chats.id, toMove))
    .run();

  const rows = db
    .select({ id: chats.id, messages: chats.messages })
    .from(chats)
    .where(and(eq(chats.userId, userId), inArray(chats.id, toMove)))
    .all();

  for (const row of rows) {
    const { updated, changed } = rewriteAttachmentUrls(
      row.messages,
      row.id,
      fromWorkspaceId,
      toWorkspaceId
    );
    if (!changed) continue;
    db.update(chats)
      .set({ messages: updated })
      .where(and(eq(chats.id, row.id), eq(chats.userId, userId)))
      .run();
  }

  return toMove;
}
