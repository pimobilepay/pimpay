"use client";

import { useEffect, useState } from "react";
import { Users, Shield, UserSearch, X, Check, Loader2 } from "lucide-react";

export type AudienceScope = "ALL" | "ROLES" | "USERS";

export interface AudienceValue {
  scope: AudienceScope;
  roles: string[];
  userIds: string[];
}

interface UserRow {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  USER: "Utilisateurs",
  AGENT: "Agents",
  MERCHANT: "Marchands",
  ADMIN: "Administrateurs",
  BANK_ADMIN: "Admins bancaires",
  BUSINESS_ADMIN: "Admins entreprise",
};

const SCOPES: { value: AudienceScope; label: string; hint: string; icon: typeof Users }[] = [
  { value: "ALL", label: "Tous", hint: "Tous les comptes", icon: Users },
  { value: "ROLES", label: "Par rôle", hint: "Cibler des rôles", icon: Shield },
  { value: "USERS", label: "Sélection", hint: "Comptes choisis", icon: UserSearch },
];

/**
 * Sélecteur d'audience réutilisable :
 * TOUS · PAR RÔLE · UTILISATEURS SÉLECTIONNÉS.
 * Utilisé pour la diffusion de notifications et les exceptions de plafonds.
 */
export function AudienceSelector({
  value,
  onChange,
  roles = ["USER", "AGENT", "MERCHANT", "ADMIN", "BANK_ADMIN", "BUSINESS_ADMIN"],
  label = "Destinataires",
}: {
  value: AudienceValue;
  onChange: (next: AudienceValue) => void;
  roles?: string[];
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [selected, setSelected] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);

  // Réhydrate les libellés des utilisateurs déjà sélectionnés
  useEffect(() => {
    const missing = value.userIds.filter((id) => !selected.some((s) => s.id === id));
    if (value.scope !== "USERS" || missing.length === 0) return;
    let cancelled = false;
    fetch(`/api/admin/users/search?ids=${missing.join(",")}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.users?.length) {
          setSelected((prev) => [
            ...prev,
            ...d.users.filter((u: UserRow) => !prev.some((p) => p.id === u.id)),
          ]);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.scope, value.userIds.join(",")]);

  // Recherche avec anti-rebond
  useEffect(() => {
    if (value.scope !== "USERS") return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/admin/users/search?q=${encodeURIComponent(query.trim())}`)
        .then((r) => r.json())
        .then((d) => setResults(d.users ?? []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, value.scope]);

  const toggleRole = (role: string) => {
    const next = value.roles.includes(role)
      ? value.roles.filter((r) => r !== role)
      : [...value.roles, role];
    onChange({ ...value, roles: next });
  };

  const addUser = (user: UserRow) => {
    if (value.userIds.includes(user.id)) return;
    setSelected((prev) => [...prev, user]);
    onChange({ ...value, userIds: [...value.userIds, user.id] });
    setQuery("");
    setResults([]);
  };

  const removeUser = (id: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== id));
    onChange({ ...value, userIds: value.userIds.filter((u) => u !== id) });
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>

      {/* Choix de la portée */}
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={label}>
        {SCOPES.map((s) => {
          const Icon = s.icon;
          const active = value.scope === s.value;
          return (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ ...value, scope: s.value })}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition-all ${
                active
                  ? "border-blue-500/60 bg-blue-500/10 text-blue-300"
                  : "border-white/10 bg-black/30 text-slate-400 hover:bg-white/5"
              }`}
            >
              <Icon size={16} />
              <span className="text-[10px] font-bold uppercase">{s.label}</span>
              <span className="text-[9px] text-slate-500">{s.hint}</span>
            </button>
          );
        })}
      </div>

      {/* Rôles */}
      {value.scope === "ROLES" && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
          {roles.map((role) => {
            const active = value.roles.includes(role);
            return (
              <button
                key={role}
                type="button"
                aria-pressed={active}
                onClick={() => toggleRole(role)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase transition-all ${
                  active
                    ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                    : "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200"
                }`}
              >
                {active && <Check size={12} />}
                {ROLE_LABELS[role] ?? role}
              </button>
            );
          })}
          {value.roles.length === 0 && (
            <p className="w-full text-[10px] text-amber-400">
              Sélectionnez au moins un rôle.
            </p>
          )}
        </div>
      )}

      {/* Utilisateurs précis */}
      {value.scope === "USERS" && (
        <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/30 p-3">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher par nom, @username, email ou téléphone"
              className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-xs text-white outline-none transition-all placeholder:text-slate-600 focus:border-blue-500/50"
            />
            {searching && (
              <Loader2
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-slate-500"
              />
            )}
          </div>

          {results.length > 0 && (
            <ul className="max-h-40 divide-y divide-white/5 overflow-y-auto rounded-lg border border-white/10 bg-black/50">
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => addUser(u)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-white/5"
                  >
                    <span className="truncate text-[11px] text-white">
                      {u.name || u.username || u.email}
                      {u.username && (
                        <span className="ml-1 text-slate-500">@{u.username}</span>
                      )}
                    </span>
                    <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-400">
                      {u.role}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {selected.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((u) => (
                <span
                  key={u.id}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-500/15 px-2 py-1 text-[10px] font-semibold text-blue-200"
                >
                  {u.username || u.name || u.email}
                  <button
                    type="button"
                    onClick={() => removeUser(u.id)}
                    aria-label={`Retirer ${u.username || u.name}`}
                    className="text-blue-300/70 hover:text-white"
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-amber-400">
              Aucun utilisateur sélectionné. Tapez au moins 2 caractères pour rechercher.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export { ROLE_LABELS };
