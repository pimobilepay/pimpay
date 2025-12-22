"use client";
import Script from "next/script";

export default function PiSDK() {
  return (
    <Script
      src="https://sdk.minepi.com/pi-sdk.js"
      strategy="beforeInteractive"
    />
  );
}
