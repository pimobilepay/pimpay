"use client";

import { useEffect, useRef, useState } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Bonjour 👋, je suis l’assistant virtuel de PIMPAY. Comment puis-je vous aider aujourd’hui ?"
    }
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("pimpay_token")
      : null;

  // scroll auto
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(e: any) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput("");

    // Ajout du message utilisateur
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg }
    ]);

    // Message IA provisoire
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "" }
    ]);

    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: userMsg })
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let aiMessage = "";

    // Lecture du streaming
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      aiMessage += decoder.decode(value);

      // maj en temps réel du dernier message assistant
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: aiMessage
        };
        return updated;
      });
    }

    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">
      <Card className="shadow-sm bg-card border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">
            Assistant virtuel
          </CardTitle>
          <CardDescription>
            Posez vos questions, l’IA PIMPAY vous répond en temps réel.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6">
          <ScrollArea className="h-[420px] pr-2">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex mb-4 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] px-4 py-2 text-sm rounded-xl ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-muted text-foreground rounded-bl-none"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            <div ref={bottomRef} />
          </ScrollArea>
        </CardContent>

        <CardFooter>
          <form
            onSubmit={sendMessage}
            className="flex items-center gap-3 w-full"
          >
            <Input
              placeholder="Écrire un message…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1"
            />

            <Button
              type="submit"
              disabled={!input.trim() || loading}
              className="min-w-[90px]"
            >
              {loading ? (
                <Loader2 className="animate-spin h-4 w-4" />
              ) : (
                "Envoyer"
              )}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}
