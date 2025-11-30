"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, RefreshCcw, Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

export default function VirtualCardPage() {
  const [loading, setLoading] = useState(true);
  const [card, setCard] = useState<any>(null);
  const [showNumber, setShowNumber] = useState(false);

  // Charger la carte depuis l’API
  useEffect(() => {
    (async () => {
      const res = await fetch("/api/card");
      const data = await res.json();

      if (res.ok) {
        setCard(data);
      }

      setLoading(false);
    })();
  }, []);

  async function regenerate() {
    const res = await fetch("/api/card/regenerate", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error);
      return;
    }

    toast.success("Numéro de carte régénéré ✔");
    setCard(data.card);
  }

  async function toggleLock() {
    const res = await fetch("/api/card/lock", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error);
      return;
    }

    setCard(data.card);
    toast.success(data.card.locked ? "Carte verrouillée 🔒" : "Carte déverrouillée 🔓");
  }

  if (loading) return <p className="text-center mt-10">Chargement…</p>;

  return (
    <div className="max-w-lg mx-auto mt-10">

      {/* Carte virtuelle */}
      <div className="relative rounded-2xl bg-gradient-to-br from-[#0b0c10] to-[#17191f] text-white p-6 shadow-xl">
        <p className="text-lg font-semibold">PIMPAY Virtual Card</p>

        <div className="mt-6">
          <p className="text-sm opacity-70">Numéro</p>

          <p className="text-xl font-mono tracking-widest">
            {showNumber ? card.number : "**** **** **** " + card.number.slice(-4)}
          </p>
        </div>

        <div className="flex justify-between mt-6">
          <div>
            <p className="text-sm opacity-70">Expiration</p>
            <p className="text-lg">{card.exp}</p>
          </div>

          <div>
            <p className="text-sm opacity-70">Titulaire</p>
            <p className="text-lg">{card.holder}</p>
          </div>
        </div>

        {/* Afficher / masquer */}
        <button
          className="absolute bottom-4 right-4 text-white opacity-80"
          onClick={() => setShowNumber(!showNumber)}
        >
          {showNumber ? <EyeOff /> : <Eye />}
        </button>
      </div>

      {/* Paramètres */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Paramètres de la carte</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button onClick={regenerate} className="w-full" variant="secondary">
            <RefreshCcw className="mr-2 h-4 w-4" /> Régénérer le numéro
          </Button>

          <Button onClick={toggleLock} className="w-full" variant={card.locked ? "destructive" : "default"}>
            {card.locked ? (
              <>
                <Unlock className="mr-2 h-4 w-4" /> Déverrouiller la carte
              </>
            ) : (
              <>
                <Lock className="mr-2 h-4 w-4" /> Verrouiller la carte
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}