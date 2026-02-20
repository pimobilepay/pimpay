"use client";
import { useState } from "react";

export default function RescuePage() {
  const [status, setStatus] = useState<string>("Attente d'action...");
  const [loading, setLoading] = useState(false);

  const paymentId = "lEU8r9rfLhKBOqLOz46CQWcarAgF"; // Ton ID bloqué

  const handleFix = async (action: "complete" | "cancel") => {
    setLoading(true);
    setStatus(`Tentative de ${action}...`);
    
    try {
      // On appelle ton API de récupération que nous avons corrigée
      const res = await fetch("/api/pi/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentId: paymentId,
          txid: "RECOVERY_FORCE_" + Date.now() // On simule un TXID pour forcer
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`✅ Succès : ${data.message || "Paiement traité !"}`);
      } else {
        setStatus(`❌ Erreur : ${data.error || "Échec de la récupération"}`);
      }
    } catch (err: any) {
      setStatus(`❌ Erreur réseau : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif", backgroundColor: "#1a1a1a", color: "white", minHeight: "100vh" }}>
      <h1 style={{ color: "#facc15" }}>PimPay Rescue Admin</h1>
      <p>ID Bloqué : <code>{paymentId}</code></p>
      
      <div style={{ margin: "20px 0", padding: "15px", border: "1px solid #333", borderRadius: "8px" }}>
        <strong>Statut :</strong> 
        <pre style={{ backgroundColor: "#000", padding: "10px", marginTop: "10px" }}>{status}</pre>
      </div>

      <button 
        onClick={() => handleFix("complete")}
        disabled={loading}
        style={{
          width: "100%",
          padding: "15px",
          backgroundColor: "#facc15",
          color: "black",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          marginBottom: "10px"
        }}
      >
        {loading ? "Chargement..." : "FORCER LA VALIDATION (COMPLETE)"}
      </button>

      <p style={{ fontSize: "12px", color: "#666" }}>
        Cette page va tenter de dire à Pi Network que le paiement est validé dans la base de données de PimPay.
      </p>
    </div>
  );
}
