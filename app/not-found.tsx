// app/not-found.tsx
import React from "react";

/**
 * 404 Page – Compatible Next.js App Router
 * - PAS de "use client"
 * - PAS de hooks
 * - PAS d’état
 * - Hover en CSS pur
 */

export default function NotFound(): JSX.Element {
  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    textAlign: "center",
    background: "linear-gradient(135deg, #0a0f1f, #111827, #1e3a8a)",
    color: "#ffffff",
    animation: "fadeIn 1.2s ease",
  };

  const titleStyle: React.CSSProperties = {
    fontSize: "6rem",
    fontWeight: 700,
    margin: 0,
    lineHeight: 1,
    textShadow: "0 0 18px rgba(0, 150, 255, 0.6)",
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: "1.8rem",
    fontWeight: 600,
    marginTop: "14px",
    marginBottom: "20px",
  };

  const textStyle: React.CSSProperties = {
    color: "#d1d5db",
    maxWidth: "520px",
    marginBottom: "26px",
    fontSize: "1rem",
  };

  return (
    <div style={containerStyle} role="dialog">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .btn404 {
          display: inline-block;
          padding: 14px 26px;
          border-radius: 16px;
          background: #2563eb;
          color: #fff;
          text-decoration: none;
          font-weight: 600;
          box-shadow: 0 8px 22px rgba(37,99,235,0.45);
          transition: all .25s ease;
        }
        .btn404:hover {
          transform: scale(1.05);
          box-shadow: 0 10px 28px rgba(37,99,235,0.6);
        }
      `}</style>

      <h1 style={titleStyle}>404</h1>

      <h2 style={subtitleStyle}>Page non trouvée</h2>

      <p style={textStyle}>
        Désolé, la page que vous recherchez n'existe pas ou a été déplacée.
      </p>

      <a href="/" className="btn404">
        Retour à l'accueil
      </a>
    </div>
  );
}
