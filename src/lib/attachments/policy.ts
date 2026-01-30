import type { Platform } from "@/db/schema";

export type AttachmentCategory = "image" | "audio" | "video" | "document";

export type AttachmentPolicy = {
  accept: string;
  allowedMimeTypes: Set<string>;
  maxBytesByCategory: Partial<Record<AttachmentCategory, number>>;
  maxTotalBytes?: number;
};

export type AttachmentValidationResult =
  | { ok: true; category: AttachmentCategory; maxBytes?: number }
  | { ok: false; reason: string; maxBytes?: number };

const MB = 1024 * 1024;

const OPENAI_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

const GEMINI_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
  "image/heif",
];

const GEMINI_AUDIO_MIME_TYPES = [
  "audio/aac",
  "audio/flac",
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/mpga",
  "audio/ogg",
  "audio/opus",
  "audio/pcm",
  "audio/wav",
  "audio/webm",
  "audio/x-m4a",
];

const GEMINI_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/mpeg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-flv",
  "video/webm",
  "video/x-ms-wmv",
  "video/3gpp",
];

const GEMINI_DOCUMENT_MIME_TYPES = ["application/pdf"];

const OPENAI_POLICY: AttachmentPolicy = {
  accept: OPENAI_IMAGE_MIME_TYPES.join(","),
  allowedMimeTypes: new Set(OPENAI_IMAGE_MIME_TYPES),
  maxBytesByCategory: {
    image: 50 * MB,
  },
  maxTotalBytes: 50 * MB,
};

const GEMINI_POLICY: AttachmentPolicy = {
  accept: [
    ...GEMINI_IMAGE_MIME_TYPES,
    ...GEMINI_AUDIO_MIME_TYPES,
    ...GEMINI_VIDEO_MIME_TYPES,
    ...GEMINI_DOCUMENT_MIME_TYPES,
  ].join(","),
  allowedMimeTypes: new Set([
    ...GEMINI_IMAGE_MIME_TYPES,
    ...GEMINI_AUDIO_MIME_TYPES,
    ...GEMINI_VIDEO_MIME_TYPES,
    ...GEMINI_DOCUMENT_MIME_TYPES,
  ]),
  maxBytesByCategory: {
    image: 100 * MB,
    audio: 100 * MB,
    video: 100 * MB,
    document: 50 * MB,
  },
};

export function getAttachmentPolicy(platform: Platform): AttachmentPolicy {
  return platform === "openai" ? OPENAI_POLICY : GEMINI_POLICY;
}

export function getAttachmentCategory(
  mediaType: string
): AttachmentCategory | null {
  if (!mediaType) return null;
  if (mediaType.startsWith("image/")) return "image";
  if (mediaType.startsWith("audio/")) return "audio";
  if (mediaType.startsWith("video/")) return "video";
  if (mediaType === "application/pdf") return "document";
  return null;
}

export function getUiAttachmentType(
  mediaType: string
): "image" | "document" | "file" {
  const category = getAttachmentCategory(mediaType);
  if (category === "image") return "image";
  if (category === "document") return "document";
  return "file";
}

export function validateAttachment(
  platform: Platform,
  mediaType: string,
  sizeBytes: number
): AttachmentValidationResult {
  const policy = getAttachmentPolicy(platform);
  if (!policy.allowedMimeTypes.has(mediaType)) {
    return {
      ok: false,
      reason: "Unsupported file type",
    };
  }

  const category = getAttachmentCategory(mediaType);
  if (!category) {
    return {
      ok: false,
      reason: "Unsupported file category",
    };
  }

  const maxBytes = policy.maxBytesByCategory[category];
  if (maxBytes != null && sizeBytes > maxBytes) {
    return {
      ok: false,
      reason: "File is too large",
      maxBytes,
    };
  }

  return { ok: true, category, maxBytes };
}
