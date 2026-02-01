import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getChatByIdInWorkspace } from "@/db/queries";
import { getModels, type ModelParams } from "@/lib/models";
import { ChatView } from "./chat-view";
import type { UIMessage } from "ai";

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string; workspaceId: string }>;
}) {
  const { id, workspaceId } = await params;

  const session = await getSession();
  if (!session) notFound();

  const chat = getChatByIdInWorkspace(id, workspaceId, session.sub);
  if (!chat) notFound();

  const models = await getModels();
  const modelInfo = models.find((m) => m.id === chat.model);

  const storedParams = chat.modelParams as ModelParams | null;
  const reasoningLevels = modelInfo?.reasoningLevels ?? [];
  const initialReasoningLevel =
    storedParams?.reasoning_effort ?? modelInfo?.defaultReasoningLevel ?? "";

  return (
    <ChatView
      workspaceId={workspaceId}
      chatId={chat.id}
      platform={chat.provider}
      modelName={modelInfo?.name ?? chat.model}
      reasoningLevels={reasoningLevels}
      initialReasoningLevel={initialReasoningLevel}
      initialMessages={chat.messages as UIMessage[]}
      initialTitle={chat.title ?? undefined}
      initialParentId={chat.parentId}
      initialCreatedAt={chat.createdAt}
      initialUpdatedAt={chat.updatedAt}
    />
  );
}
