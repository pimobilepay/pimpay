"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, Download, Loader2, ExternalLink } from "lucide-react";

/**
 * Visionneuse d'image plein écran (lightbox) intégrée à la plateforme.
 * Remplace l'ouverture d'une popup/onglet externe (ex: res.cloudinary.com)
 * pour visualiser les images directement dans l'application.
 *
 * Fonctions : zoom +/-, rotation, téléchargement, ouverture dans un onglet,
 * fermeture via le bouton, la touche Échap, ou un clic sur l'arrière-plan.
 */
export default function ImageLightbox({
  url,
  alt = "Image",
  flip = false,
  onClose,
}: {
  url: string | null;
  alt?: string;
  flip?: boolean;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [loaded, setLoaded] = useState(false);

  // Réinitialise zoom/rotation à chaque changement d'image.
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setLoaded(false);
  }, [url]);

  // Fermeture au clavier (Échap) + blocage du scroll de l'arrière-plan.
  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [url, onClose]);

  const handleDownload = useCallback(async () => {
    if (!url) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = (url.split("/").pop() || "image").split("?")[0];
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank");
    }
  }, [url]);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      {/* Barre d'outils */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-4 z-10 bg-gradient-to-b from-black/60 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 truncate max-w-[40%]">
          {alt}
        </span>
        <div className="flex items-center gap-2">
          <ToolBtn label="Dezoomer" onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}>
            <ZoomOut size={18} />
          </ToolBtn>
          <ToolBtn label="Zoomer" onClick={() => setScale((s) => Math.min(4, s + 0.25))}>
            <ZoomIn size={18} />
          </ToolBtn>
          <ToolBtn label="Pivoter" onClick={() => setRotation((r) => r + 90)}>
            <RotateCw size={18} />
          </ToolBtn>
          <ToolBtn label="Telecharger" onClick={handleDownload}>
            <Download size={18} />
          </ToolBtn>
          <ToolBtn label="Ouvrir dans un onglet" onClick={() => window.open(url, "_blank")}>
            <ExternalLink size={18} />
          </ToolBtn>
          <ToolBtn label="Fermer" onClick={onClose}>
            <X size={18} />
          </ToolBtn>
        </div>
      </div>

      {/* Image */}
      <div
        className="relative max-w-[92vw] max-h-[82vh] flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        {!loaded && <Loader2 className="absolute animate-spin text-white/60" size={40} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url || "/placeholder.svg"}
          alt={alt}
          onLoad={() => setLoaded(true)}
          className="max-w-[92vw] max-h-[82vh] object-contain select-none transition-transform duration-200"
          style={{
            transform: `scale(${scale}) rotate(${rotation}deg) ${flip ? "scaleX(-1)" : ""}`,
            opacity: loaded ? 1 : 0,
          }}
          draggable={false}
        />
      </div>

      <p className="absolute bottom-5 left-0 right-0 text-center text-[9px] font-bold uppercase tracking-widest text-white/40">
        Touchez en dehors ou Echap pour fermer
      </p>
    </div>
  );
}

function ToolBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/20 active:scale-90 transition-all"
    >
      {children}
    </button>
  );
}
