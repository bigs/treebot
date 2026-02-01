import path from "path";

const MIME_BY_EXTENSION: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".pdf": "application/pdf",
  ".mp3": "audio/mpeg",
  ".mpeg": "audio/mpeg",
  ".mpga": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".webm": "video/webm",
  ".ogg": "audio/ogg",
  ".opus": "audio/opus",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".flv": "video/x-flv",
  ".wmv": "video/x-ms-wmv",
  ".3gp": "video/3gpp",
  ".3gpp": "video/3gpp",
};

export function getMimeTypeForFilename(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? "application/octet-stream";
}
