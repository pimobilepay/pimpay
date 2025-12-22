"use client";

import { useEffect } from "react";
import Script from "next/script";
import { initPiSDK } from "@/lib/pi-sdk";

export default function PiClientProvider() {
  useEffect(() => {
    // On essaie d'initialiser si le script est déjà là
    initPiSDK();
  }, []);

  return (
    <Script
      src="https://sdk.minepi.com/pi-sdk.js"
      strategy="afterInteractive"
      onLoad={() => {
        initPiSDK();
      }}
    />
  );
}
