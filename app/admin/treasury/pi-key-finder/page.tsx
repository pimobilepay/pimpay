"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Search,
  Copy,
  AlertTriangle,
} from "lucide-react";

type KeyResult = {
  index: number;
  validStellarFormat: boolean;
  derivedPublicKey_masked: string | null;
  matchesTarget: boolean;
};

type FinderResponse = {
  success?: boolean;
  error?: string;
  targetAddress_masked?: string;
  totalTested?: number;
  matchFound?: boolean;
  matchIndex?: number | null;
  verdict?: string;
  results?: KeyResult[];
  note?: string;
};

export default function PiKeyFinderPage() {
  const router = useRouter();
  const [rawKeys, setRawKeys] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinderResponse | null>(null);

  const keyCount = rawKeys
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean).length;

  const handleTest = useCallback(async () => {
    if (keyCount === 0) return;
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/admin/treasury/pi-diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ secrets: rawKeys }),
      });
      const json = (await res.json()) as FinderResponse;
      setData(json);
      // On efface immédiatement les clés saisies par sécurité une fois testées.
      if (json?.success) setRawKeys("");
    } catch (e: any) {
      setData({ error: e?.message || "Erreur réseau" });
    } finally {
      setLoading(false);
    }
  }, [rawKeys, keyCount]);

  const matched = data?.results?.find((r) => r.matchesTarget) || null;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {/* Header */}
        <header className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
            aria-label="Retour"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold tracking-tight">
              Recherche de clé secrète Pi
            </h1>
          </div>
        </header>

        {/* Sécurité */}
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-border bg-card p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Collez vos clés candidates (commençant par{" "}
            <span className="font-mono text-foreground">S</span>), une par ligne.
            L&apos;outil teste laquelle correspond au wallet opérateur configuré.
            Les clés ne sont{" "}
            <span className="font-medium text-foreground">jamais</span>{" "}
            enregistrées ni renvoyées : seules les adresses publiques (masquées)
            s&apos;affichent.
          </p>
        </div>

        {/* Saisie */}
        <div className="rounded-xl border border-border bg-card p-4">
          <label
            htmlFor="keys"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Clés secrètes candidates
          </label>
          <textarea
            id="keys"
            value={rawKeys}
            onChange={(e) => setRawKeys(e.target.value)}
            rows={8}
            spellCheck={false}
            autoComplete="off"
            placeholder={"SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX\nSYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY\nSZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {keyCount} clé{keyCount > 1 ? "s" : ""} détectée
              {keyCount > 1 ? "s" : ""}
            </span>
            <button
              onClick={handleTest}
              disabled={loading || keyCount === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              {loading ? "Analyse..." : "Tester les clés"}
            </button>
          </div>
        </div>

        {/* Erreur */}
        {data?.error && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{data.error}</p>
          </div>
        )}

        {/* Résultats */}
        {data?.success && (
          <section className="mt-5 space-y-4">
            {/* Verdict */}
            <div
              className={`flex items-start gap-3 rounded-xl border p-4 ${
                data.matchFound
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              {data.matchFound ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {data.verdict}
                </p>
                <p className="text-xs text-muted-foreground">
                  Wallet cible :{" "}
                  <span className="font-mono">{data.targetAddress_masked}</span>
                </p>
              </div>
            </div>

            {/* Clé trouvée — copie de l'index */}
            {data.matchFound && matched && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-sm font-medium text-foreground">
                  Action à effectuer
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  La clé n°
                  <span className="font-semibold text-foreground">
                    {(data.matchIndex ?? 0) + 1}
                  </span>{" "}
                  est la bonne. Copiez-la depuis votre liste (
                  <span className="font-mono">
                    {matched.derivedPublicKey_masked}
                  </span>
                  ) et placez-la dans la variable d&apos;environnement{" "}
                  <span className="font-mono text-foreground">
                    PI_MASTER_WALLET_SECRET
                  </span>
                  .
                </p>
              </div>
            )}

            {/* Détail par clé */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  Détail ({data.totalTested} testée
                  {(data.totalTested ?? 0) > 1 ? "s" : ""})
                </p>
              </div>
              <ul className="divide-y divide-border">
                {data.results?.map((r) => (
                  <li
                    key={r.index}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {r.matchesTarget ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Clé n°{r.index + 1}
                        </p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {r.validStellarFormat
                            ? r.derivedPublicKey_masked
                            : "Format invalide"}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        r.matchesTarget
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.matchesTarget ? "Correspond" : "Non"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {data.note && (
              <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                {data.note}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
