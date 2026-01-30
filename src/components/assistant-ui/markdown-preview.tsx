"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { markdownComponents } from "@/components/assistant-ui/markdown-text";
import { normalizeMathDelimiters } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type MarkdownPreviewProps = {
  content: string;
  className?: string;
};

export function MarkdownPreview({ content, className }: MarkdownPreviewProps) {
  const processed = normalizeMathDelimiters(content);

  return (
    <ReactMarkdown
      className={cn("aui-md", className)}
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeKatex, { strict: "ignore" }]]}
      components={markdownComponents as Components}
    >
      {processed}
    </ReactMarkdown>
  );
}
