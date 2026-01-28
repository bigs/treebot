"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReasoningOption } from "@/lib/models";

interface ChatViewProps {
  chatId: string;
  modelName: string;
  reasoningLevels: ReasoningOption[];
  initialReasoningLevel: string;
}

export function ChatView({
  chatId,
  modelName,
  reasoningLevels,
  initialReasoningLevel,
}: ChatViewProps) {
  const [reasoningLevel, setReasoningLevel] = useState(initialReasoningLevel);

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium">{modelName}</h1>
          {reasoningLevels.length > 0 && (
            <Select value={reasoningLevel} onValueChange={setReasoningLevel}>
              <SelectTrigger className="w-[160px]" size="sm">
                <SelectValue placeholder="Reasoning" />
              </SelectTrigger>
              <SelectContent>
                {reasoningLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    {level.label} reasoning
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">Chat {chatId}</p>
      </main>
    </div>
  );
}
