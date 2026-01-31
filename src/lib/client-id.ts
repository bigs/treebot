export function generateClientId() {
  if (typeof crypto !== "undefined") {
    if (typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    if (typeof crypto.getRandomValues === "function") {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      // UUID v4 format.
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0")
      );
      return `${hex.slice(0, 4).join("")}-${hex
        .slice(4, 6)
        .join("")}-${hex.slice(6, 8).join("")}-${hex
        .slice(8, 10)
        .join("")}-${hex.slice(10, 16).join("")}`;
    }
  }
  return `id-${String(Date.now())}-${Math.random().toString(16).slice(2)}`;
}
