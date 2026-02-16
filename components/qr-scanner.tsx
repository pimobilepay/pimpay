"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { X, Camera, ScanLine, FlashlightOff, Flashlight } from "lucide-react";

interface QRScannerProps {
  onClose: (data: string) => void;
}

export function QRScanner({ onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(true);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const detectedRef = useRef(false);

  // BarcodeDetector support check
  const barcodeDetectorRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "BarcodeDetector" in window) {
      try {
        barcodeDetectorRef.current = new (window as any).BarcodeDetector({
          formats: ["qr_code"],
        });
      } catch {
        barcodeDetectorRef.current = null;
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const handleDetected = useCallback(
    (data: string) => {
      if (detectedRef.current || !data) return;
      detectedRef.current = true;
      setScanning(false);

      // Vibration feedback si dispo
      if (navigator.vibrate) navigator.vibrate(100);

      stopCamera();
      setTimeout(() => onClose(data), 400);
    },
    [onClose, stopCamera]
  );

  // Scan loop utilisant BarcodeDetector (Chrome, Edge, Android) sinon canvas fallback
  const startScanLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const scan = async () => {
      if (detectedRef.current || !streamRef.current) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Methode 1: BarcodeDetector natif (meilleure perf)
        if (barcodeDetectorRef.current) {
          try {
            const barcodes = await barcodeDetectorRef.current.detect(canvas);
            if (barcodes.length > 0 && barcodes[0].rawValue) {
              handleDetected(barcodes[0].rawValue);
              return;
            }
          } catch {
            // Silently fail, retry next frame
          }
        }

        // Methode 2: ImageBitmap + BarcodeDetector sur video directement
        if (!barcodeDetectorRef.current && typeof createImageBitmap !== "undefined") {
          try {
            const detector = barcodeDetectorRef.current;
            if (detector) {
              const barcodes = await detector.detect(video);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                handleDetected(barcodes[0].rawValue);
                return;
              }
            }
          } catch {
            // fallback
          }
        }
      }

      animationRef.current = requestAnimationFrame(scan);
    };

    animationRef.current = requestAnimationFrame(scan);
  }, [handleDetected]);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Check torch capability
        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities?.torch) setHasTorch(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          startScanLoop();
        }
        setHasPermission(true);
      } catch {
        if (!cancelled) setHasPermission(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [startScanLoop, stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn(!torchOn);
    } catch {
      // torch not available
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose("");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Hidden canvas for decoding */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-12 pb-4 bg-black/80 backdrop-blur-sm z-10 relative">
        <button
          onClick={handleClose}
          className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
          aria-label="Fermer le scanner"
        >
          <X size={20} className="text-white" />
        </button>
        <h2 className="text-sm font-black uppercase tracking-widest text-white">
          Scanner QR
        </h2>
        {hasTorch ? (
          <button
            onClick={toggleTorch}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center"
            aria-label="Toggle flash"
          >
            {torchOn ? (
              <Flashlight size={18} className="text-yellow-400" />
            ) : (
              <FlashlightOff size={18} className="text-white/60" />
            )}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Camera viewport - full screen */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {hasPermission === false ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center">
              <Camera size={40} className="text-slate-600" />
            </div>
            <p className="text-slate-400 text-xs text-center uppercase tracking-wider font-bold">
              Acces camera refuse
            </p>
            <p className="text-slate-500 text-[10px] text-center leading-relaxed">
              Autorisez la camera dans les parametres de votre navigateur ou du Pi Browser pour scanner les QR codes.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-3 bg-blue-600 rounded-2xl text-xs font-black uppercase text-white"
            >
              Fermer
            </button>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Scanning overlay with frame */}
        {scanning && hasPermission && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Dark borders */}
            <div className="absolute inset-0 bg-black/50" />
            {/* Clear scanning zone */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64">
              {/* Cut out the clear zone */}
              <div className="absolute -inset-[2000px] bg-black/50" style={{
                clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, calc(50% - 128px) calc(50% - 128px), calc(50% - 128px) calc(50% + 128px), calc(50% + 128px) calc(50% + 128px), calc(50% + 128px) calc(50% - 128px), calc(50% - 128px) calc(50% - 128px))"
              }} />

              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-3 border-l-3 border-blue-500 rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-3 border-r-3 border-blue-500 rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-3 border-l-3 border-blue-500 rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-3 border-r-3 border-blue-500 rounded-br-lg" />

              {/* Animated scan line */}
              <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-[scanLine_2s_ease-in-out_infinite]" />
            </div>
          </div>
        )}

        {/* Success overlay */}
        {!scanning && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center animate-pulse">
              <ScanLine size={36} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom info */}
      <div className="px-6 py-8 bg-black/80 backdrop-blur-sm text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-blue-500">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {scanning ? "Capteur actif" : "QR detecte"}
          </span>
        </div>
        <p className="text-slate-500 text-[9px] uppercase tracking-widest font-bold">
          Placez le QR code du destinataire dans le cadre
        </p>
      </div>

      <style jsx>{`
        @keyframes scanLine {
          0% { top: 0; }
          50% { top: calc(100% - 2px); }
          100% { top: 0; }
        }
      `}</style>
    </div>
  );
}
