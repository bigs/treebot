export function normalizeMathDelimiters(markdown: string) {
  if (!markdown) return markdown;

  const applyReplacements = (value: string) =>
    value
      .replace(/\\\[((?:.|\n)*?)\\\]/g, (_match, inner) => `$$${inner}$$`)
      .replace(/\\\(((?:.|\n)*?)\\\)/g, (_match, inner) => `$${inner}$`);

  let result = "";
  let buffer = "";
  let i = 0;

  const flushBuffer = () => {
    if (buffer.length === 0) return;
    result += applyReplacements(buffer);
    buffer = "";
  };

  while (i < markdown.length) {
    const char = markdown[i];
    const atLineStart = i === 0 || markdown[i - 1] === "\n";

    if (
      atLineStart &&
      (markdown.startsWith("```", i) || markdown.startsWith("~~~", i))
    ) {
      flushBuffer();
      const fence = markdown.startsWith("```", i) ? "```" : "~~~";
      const fenceStart = i;
      i += fence.length;
      while (i < markdown.length && markdown[i] !== "\n") i += 1;
      if (i < markdown.length) i += 1;

      while (i < markdown.length) {
        if (
          (i === 0 || markdown[i - 1] === "\n") &&
          markdown.startsWith(fence, i)
        ) {
          i += fence.length;
          while (i < markdown.length && markdown[i] !== "\n") i += 1;
          if (i < markdown.length) i += 1;
          break;
        }
        i += 1;
      }

      result += markdown.slice(fenceStart, i);
      continue;
    }

    if (char === "`") {
      flushBuffer();
      let backtickCount = 1;
      while (
        i + backtickCount < markdown.length &&
        markdown[i + backtickCount] === "`"
      ) {
        backtickCount += 1;
      }
      const start = i;
      i += backtickCount;
      while (i < markdown.length) {
        if (markdown.startsWith("`".repeat(backtickCount), i)) {
          i += backtickCount;
          break;
        }
        i += 1;
      }
      result += markdown.slice(start, i);
      continue;
    }

    buffer += char;
    i += 1;
  }

  flushBuffer();
  return result;
}
