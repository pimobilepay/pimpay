"use client";
import { useState } from "react";

export default function RescuePage() {
  const [status, setStatus] = useState<string>("En attente...");
  const [loading, setLoading] = useState(false);

  // L'ID que nous avons vu dans tes logs
  const paymentId = "lEU8r9rfLhKBOqLOz46CQWcarAgF"; 

  const handleFix = async () => {
    setLoading(true);
    setStatus("🚀 Connexion à PimPay API...");
    
    try {
      // CORRECTION : On utilise le chemin exact que tu viens de me donner
      const res = await fetch("/api/payments/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentId: paymentId,
          txid: "RECOVERY_" + Date.now() 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus(`✅ SUCCÈS : ${data.message || "Paiement synchronisé !"}`);
      } else {
        // Affiche l'erreur précise retournée par l'API
        setStatus(`❌ ERREUR API (${res.status}) : ${data.error || JSON.stringify(data)}`);
      }
    } catch (err: any) {
      setStatus(`❌ ERREUR RÉSEAU : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "30px", fontFamily: "sans-serif", backgroundColor: "#0f172a", color: "white", minHeight: "100vh", textAlign: "center" }}>
      <h1 style={{ color: "#facc15", fontSize: "24px" }}>PimPay Admin Rescue</h1>
      <p style={{ color: "#94a3b8" }}>Récupération du paiement Pi Network</p>
      
      <div style={{ margin: "20px auto", maxWidth: "400px", padding: "20px", border: "1px solid #334155", borderRadius: "12px", backgroundColor: "#1e293b" }}>
        <p style={{ fontSize: "12px", color: "#94a3b8" }}>ID DE TRANSACTION :</p>
        <code style={{ color: "#f87171", wordBreak: "break-all" }}>{paymentId}</code>
        
        <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#000", borderRadius: "8px", minHeight: "60px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: "14px", color: status.includes("✅") ? "#4ade80" : status.includes("❌") ? "#f87171" : "#fff" }}>
            {status}
          </span>
        </div>
      </div>

      <button 
        onClick={handleFix}
        disabled={loading}
        style={{
          width: "100%",
          maxWidth: "400px",
          padding: "16px",
          backgroundColor: loading ? "#475569" : "#facc15",
          color: "#000",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          fontSize: "16px",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
        }}
      >
        {loading ? "TRAITEMENT EN COURS..." : "DÉBLOQUER MON COMPTE PI"}
      </button>

      <footer style={{ marginTop: "30px", fontSize: "11px", color: "#64748b" }}>
        Note: Cette action appelle /api/payments/incomplete/route.ts
      </footer>
    </div>
  );
}
