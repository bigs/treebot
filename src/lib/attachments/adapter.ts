import type {
  PendingAttachment,
  CompleteAttachment,
} from "@assistant-ui/react";
import {
  validateAttachment,
  getUiAttachmentType,
} from "@/lib/attachments/policy";
import { generateClientId } from "@/lib/client-id";
import { buildAttachmentContent } from "@/lib/assistant-ui/conversion";
import type { Platform } from "@/db/schema";
import type { UploadResponse } from "@/lib/attachments/types";

export function createPendingAttachment(
  platform: Platform,
  file: File
): PendingAttachment {
  const validation = validateAttachment(platform, file.type, file.size);
  if (!validation.ok) {
    throw new Error(validation.reason);
  }
  const mediaType = file.type || "application/octet-stream";
  return {
    id: generateClientId(),
    type: getUiAttachmentType(mediaType),
    name: file.name,
    contentType: mediaType,
    file,
    status: { type: "requires-action", reason: "composer-send" },
  };
}

export function buildCompleteAttachment(
  pending: PendingAttachment,
  upload: UploadResponse
): CompleteAttachment {
  const name = upload.originalName || pending.name;
  const mediaType = upload.mediaType || pending.contentType;
  return {
    ...pending,
    name,
    contentType: mediaType,
    status: { type: "complete" },
    content: buildAttachmentContent(upload.url, mediaType, name),
  };
}
