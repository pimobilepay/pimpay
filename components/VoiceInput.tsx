// components/VoiceInput.tsx
"use client";
import React, { useEffect, useRef, useState } from "react";

export default function VoiceInput({ onResult }: { onResult: (text: string) => void }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.lang = "fr-FR";
    rec.interimResults = true;
    rec.continuous = false;

    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      // send final transcript when isFinal true
      if (e.results[e.results.length - 1].isFinal) {
        onResult(transcript.trim());
      }
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, [onResult]);

  function toggle() {
    const rec = recognitionRef.current;
    if (!rec) return alert("Voice API non supportée sur ce navigateur.");
    if (listening) {
      rec.stop();
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch {
        // Chrome sometimes throws when started twice
      }
    }
  }

  return (
    <button
      onClick={toggle}
      className={`px-3 py-2 rounded-md ${listening ? "bg-red-600 text-white" : "bg-white/5 text-foreground"}`}
      aria-pressed={listening}
    >
      {listening ? "Enregistrement..." : "🎙️ Parler"}
    </button>
  );
}
