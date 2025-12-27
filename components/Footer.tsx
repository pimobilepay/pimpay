// components/Footer.tsx
"use client";
import { useEffect, useState } from "react";

export default function Footer() {
  const [version, setVersion] = useState("1.0.0");

  useEffect(() => {
    fetch("/api/admin/config")
      .then(res => res.json())
      .then(data => setVersion(data.appVersion || "1.0.0"));
  }, []);

  return (
    <footer className="py-6 border-t text-center text-gray-500 text-sm">
      <p>© 2025 PIMPAY. Tous droits réservés.</p>
      <p className="mt-1 font-mono text-[10px] opacity-50">v{version}</p>
    </footer>
  );
}
