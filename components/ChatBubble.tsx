// components/ChatBubble.tsx
import React from "react";

export default function ChatBubble({
  role,
  children,
  time,
}: {
  role: "user" | "assistant";
  children: React.ReactNode;
  time?: string;
}) {
  const isUser = role === "user";
  return (
    <div className={`flex mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`
          max-w-[80%] px-4 py-2 text-sm rounded-xl break-words
          ${isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-muted/30 text-foreground rounded-bl-none"}
          shadow-sm
        `}
      >
        <div className="whitespace-pre-wrap">{children}</div>
        {time && (
          <div className="text-[10px] text-muted-foreground mt-1 text-right">
            {time}
          </div>
        )}
      </div>
    </div>
  );
}
