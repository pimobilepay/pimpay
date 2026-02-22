"use client";

import { MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ChatBubbleProps {
  className?: string;
}

export default function ChatBubble({ className = "" }: ChatBubbleProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/chat")}
      aria-label="Open Elara AI Chat"
      className={`fixed bottom-24 right-5 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-blue-600 shadow-lg shadow-blue-600/30 active:scale-90 transition-all hover:bg-blue-500 group ${className}`}
    >
      <MessageCircle size={24} className="text-white" />
      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#020617] animate-pulse" />
      <span className="sr-only">Chat with Elara AI</span>
    </button>
  );
}
