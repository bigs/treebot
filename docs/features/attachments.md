# Attachments

Treebot supports file attachments in chat messages using assistant-ui’s
attachment primitives. Files are uploaded to the server, stored locally, and
then inlined when sending prompts to the model so attachments remain private.

## Supported file types

Attachment types are enforced per provider:

- **OpenAI (GPT-5.2):** images (`image/png`, `image/jpeg`, `image/webp`, `image/gif`).
- **Gemini 3:** images (PNG/JPEG/WebP/HEIC/HEIF), audio (MP3/WAV/FLAC/M4A/etc),
  video (MP4/MOV/AVI/WEBM/etc), and PDFs (`application/pdf`).

## Size limits

- **OpenAI images:** up to 50 MB per file (aligned with OpenAI request limits).
- **Gemini media:** up to 100 MB per file; PDFs up to 50 MB.

These limits are enforced at upload time to match provider constraints.

## Upload flow

1. The composer uploads each file to `POST /chats/[id]/attachments`.
2. Files are stored in `uploads/{userId}/{chatId}/{filename}` (gitignored).
3. Messages store file parts with relative URLs to
   `GET /chats/[id]/attachments/[filename]`.
4. The streaming backend loads attachments from disk and converts them to
   `data:` URLs before calling the model, so attachments remain private.

## Rendering

- Image attachments render a thumbnail with a lightbox preview.
- Non-image attachments show a generic file icon with the filename.
