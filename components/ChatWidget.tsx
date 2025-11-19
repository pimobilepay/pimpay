// components/ChatWidget.tsx
"use client";

import React, { useState, useRef } from "react";

type Msg = { role: "user" | "assistant" | "system"; content: string };

export default function ChatWidget({ systemPrompt }: { systemPrompt?: string }) {
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Msg[]>(
    systemPrompt ? [{ role: "system", content: systemPrompt }] : []
  );
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function send() {
    if (!text.trim()) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setText("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const json = await res.json();
      if (!res.ok) {
        console.error("Chat API error", json);
        setMessages((m) => [...m, { role: "assistant", content: "Désolé, une erreur est survenue." }]);
        return;
      }
      const assistant = json.assistant?.content || json.assistant?.message || "Désolé, réponse vide.";
      setMessages((m) => [...m, { role: "assistant", content: assistant }]);
    } catch (e) {
      console.error(e);
      setMessages((m) => [...m, { role: "assistant", content: "Erreur réseau." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="max-w-xl w-full bg-card border p-4 rounded-xl">
      <div className="h-64 overflow-y-auto mb-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-lg ${m.role === "user" ? "bg-white/5 ml-auto text-right" : "bg-white/7 mr-auto text-left"}`}>
            <div className="text-sm">{m.content}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.role}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          className="flex-1 rounded-lg border px-3 py-2 bg-background"
          placeholder="Pose ta question sur PIMPAY..."
        />
        <button
          onClick={send}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
        >
          {loading ? "..." : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
// components/ChatWidget.tsx
"use client";

import React, { useRef, useState } from "react";

type Msg = { role: "user" | "assistant" | "system"; content: string };

export default function ChatWidget({ systemPrompt }: { systemPrompt?: string }) {
  const [messages, setMessages] = useState<Msg[]>(
    systemPrompt ? [{ role: "system", content: systemPrompt }] : []
  );
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const streamAbortRef = useRef<AbortController | null>(null);

  // Get JWT from localStorage (example) — in prod use secure cookie or session
  const token = typeof window !== "undefined" ? localStorage.getItem("pimpay_token") : null;

  async function send() {
    if (!text.trim()) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setText("");
    setLoading(true);

    try {
      const controller = new AbortController();
      streamAbortRef.current = controller;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ messages: next }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const textErr = await res.text();
        setMessages((m) => [...m, { role: "assistant", content: "Erreur du serveur: " + textErr }]);
        setLoading(false);
        return;
      }

      // read stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantAccum = "";
      // append placeholder assistant message
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        // Depending on server stream format, you may need to parse SSE events
        assistantAccum += chunk;
        // Update last assistant message content with current accumulation
        setMessages((m) => {
          const copy = [...m];
          const lastIndex = copy.length - 1;
          copy[lastIndex] = { role: "assistant", content: assistantAccum };
          return copy;
        });
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMessages((m) => [...m, { role: "assistant", content: "Streaming aborted." }]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: "Erreur réseau." }]);
      }
    } finally {
      setLoading(false);
      streamAbortRef.current = null;
    }
  }

  return (
    <div className="max-w-xl w-full bg-card border p-4 rounded-xl">
      <div className="h-64 overflow-y-auto mb-3 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`p-3 rounded-lg ${m.role === "user" ? "bg-white/5 ml-auto text-right" : "bg-white/7 mr-auto text-left"}`}>
            <div className="text-sm whitespace-pre-wrap">{m.content}</div>
            <div className="text-xs text-muted-foreground mt-1">{m.role}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          className="flex-1 rounded-lg border px-3 py-2 bg-background"
          placeholder="Pose ta question sur PIMPAY..."
        />
        <button onClick={send} disabled={loading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40">
          {loading ? "..." : "Envoyer"}
        </button>
      </div>
    </div>
  );
}
