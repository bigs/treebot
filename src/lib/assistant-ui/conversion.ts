import type { UIMessage } from "ai";
import type {
  CompleteAttachment,
  ThreadMessageLike,
  ThreadUserMessagePart,
} from "@assistant-ui/react";
import { getUiAttachmentType } from "@/lib/attachments/policy";

export type FilePart = Extract<UIMessage["parts"][number], { type: "file" }>;

export const buildAttachmentContent = (
  url: string,
  mediaType: string,
  filename?: string
): ThreadUserMessagePart[] => {
  if (mediaType.startsWith("image/")) {
    return [{ type: "image", image: url, filename }];
  }
  return [
    {
      type: "file",
      data: url,
      filename,
      mimeType: mediaType,
    },
  ];
};

const buildAttachmentsFromParts = (
  parts: UIMessage["parts"],
  messageId: string
): CompleteAttachment[] => {
  const attachments: CompleteAttachment[] = [];
  let index = 0;

  for (const part of parts) {
    if (part.type !== "file") continue;
    const mediaType = part.mediaType || "application/octet-stream";
    const name = part.filename || `Attachment ${String(index + 1)}`;
    const attachmentType = getUiAttachmentType(mediaType);
    attachments.push({
      id: `${messageId}-${String(index)}`,
      type: attachmentType,
      name,
      contentType: mediaType,
      status: { type: "complete" },
      content: buildAttachmentContent(part.url, mediaType, part.filename),
    });
    index += 1;
  }

  return attachments;
};

export const attachmentToFilePart = (
  attachment: CompleteAttachment
): FilePart | null => {
  const mediaType = attachment.contentType || "application/octet-stream";
  const name = attachment.name;
  if (attachment.content.length === 0) return null;
  const content = attachment.content[0];
  if (content.type === "image") {
    return {
      type: "file",
      mediaType,
      filename: content.filename ?? name,
      url: content.image,
    };
  }
  if (content.type === "file") {
    return {
      type: "file",
      mediaType: content.mimeType,
      filename: content.filename ?? name,
      url: content.data,
    };
  }
  return null;
};

export const toThreadMessageLike = (
  message: UIMessage,
  idx: number
): ThreadMessageLike => {
  const resolvedId = message.id.trim() ? message.id : `message-${String(idx)}`;
  // Build content array - using explicit type to avoid readonly issues
  const contentArr: Array<
    | { type: "text"; text: string }
    | { type: "reasoning"; text: string }
    | {
        type: "source";
        sourceType: "url";
        id: string;
        url: string;
        title?: string;
      }
    | {
        type: "tool-call";
        toolCallId: string;
        toolName: string;
        args: Record<string, unknown>;
        argsText: string;
        result: unknown;
        isError: boolean;
      }
    | { type: "data"; name: string; data: unknown }
  > = [];
  for (const part of message.parts) {
    if (part.type === "text") {
      contentArr.push({ type: "text", text: part.text });
    } else if (part.type === "reasoning") {
      contentArr.push({ type: "reasoning", text: part.text });
    } else if (part.type === "source-url") {
      contentArr.push({
        type: "source",
        sourceType: "url",
        id: part.sourceId,
        url: part.url,
        title: part.title,
      });
    } else if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
      const toolPart = part as {
        type: string;
        toolName?: string;
        toolCallId?: string;
        input?: unknown;
        output?: unknown;
        errorText?: string;
        state?: string;
      };
      const toolName =
        toolPart.type === "dynamic-tool"
          ? (toolPart.toolName ?? "tool")
          : toolPart.type.slice("tool-".length);
      const toolCallId = toolPart.toolCallId ?? `${toolName}-${resolvedId}`;
      const input = toolPart.input;
      const args =
        input && typeof input === "object"
          ? (input as Record<string, unknown>)
          : {};
      const argsText =
        typeof input === "string" ? input : JSON.stringify(input ?? {});
      const state = toolPart.state;
      const result = toolPart.output;
      const errorText = toolPart.errorText;

      contentArr.push({
        type: "tool-call",
        toolCallId,
        toolName,
        args,
        argsText,
        result: result ?? errorText,
        isError: state === "output-error" || state === "output-denied",
      });
    } else if (part.type.startsWith("data-")) {
      const dataPart = part as { type: string; data: unknown };
      contentArr.push({
        type: "data",
        name: part.type.slice("data-".length),
        data: dataPart.data,
      });
    }
  }

  const attachments =
    message.role === "user"
      ? buildAttachmentsFromParts(message.parts, resolvedId)
      : undefined;

  return {
    role: message.role,
    id: resolvedId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    content: contentArr as any,
    ...(attachments && attachments.length > 0 ? { attachments } : {}),
  };
};
