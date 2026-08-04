"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Crown,
  Network,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

export interface ReferralNodeView {
  id: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  country?: string | null;
  status?: string;
  role?: string;
  kycVerified: boolean;
  referralCode?: string | null;
  createdAt: string;
  level: number;
  directCount: number;
  children: ReferralNodeView[];
}

export interface ReferralTopologyView {
  root: ReferralNodeView;
  upline: ReferralNodeView[];
  levels: { level: number; count: number; verified: number }[];
  totalDescendants: number;
  verifiedDescendants: number;
  maxDepthReached: number;
  truncated: boolean;
}

const LEVEL_ACCENT = [
  "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "text-slate-300 bg-white/5 border-white/10",
];

function accentFor(level: number) {
  return LEVEL_ACCENT[Math.min(Math.max(level, 0), LEVEL_ACCENT.length - 1)];
}

function displayName(node: ReferralNodeView) {
  return node.name || node.username || "Utilisateur";
}

function initial(node: ReferralNodeView) {
  return displayName(node).charAt(0).toUpperCase();
}

function Avatar({ node, size = 36 }: { node: ReferralNodeView; size?: number }) {
  if (node.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={node.avatar || "/placeholder.svg"}
        alt={displayName(node)}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-xl object-cover border border-white/10 shrink-0"
        crossOrigin="anonymous"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[11px] font-black text-white shrink-0"
      aria-hidden="true"
    >
      {initial(node)}
    </div>
  );
}

function NodeCard({
  node,
  isRoot,
  expandable,
  expanded,
  onToggle,
  onSelect,
}: {
  node: ReferralNodeView;
  isRoot?: boolean;
  expandable: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSelect?: (node: ReferralNodeView) => void;
}) {
  const accent = accentFor(node.level);

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${
        isRoot
          ? "bg-blue-600/10 border-blue-500/30"
          : "bg-slate-900/50 border-white/5 hover:border-white/15"
      } transition-colors`}
    >
      {expandable ? (
        <button
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Replier la branche" : "Deplier la branche"}
          className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:text-white shrink-0"
        >
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      ) : (
        <span className="w-6 shrink-0" aria-hidden="true" />
      )}

      <Avatar node={node} size={isRoot ? 42 : 34} />

      <button
        onClick={onSelect ? () => onSelect(node) : undefined}
        disabled={!onSelect}
        className="flex-1 min-w-0 text-left disabled:cursor-default"
      >
        <div className="flex items-center gap-2 min-w-0">
          {isRoot && <Crown size={12} className="text-amber-400 shrink-0" />}
          <p className="text-[12px] font-black text-white truncate uppercase tracking-tight">
            {displayName(node)}
          </p>
          {node.kycVerified && (
            <ShieldCheck size={12} className="text-emerald-400 shrink-0" aria-label="KYC verifie" />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-[9px] font-bold text-slate-500 truncate">
            @{node.username || node.id.slice(0, 8)}
          </span>
          <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">
            {new Date(node.createdAt).toLocaleDateString("fr-FR")}
          </span>
        </div>
      </button>

      <div className="flex items-center gap-2 shrink-0">
        {node.directCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400">
            <Users size={11} />
            {node.directCount}
          </span>
        )}
        <span
          className={`text-[8px] font-black px-2 py-1 rounded-full border uppercase tracking-wider ${accent}`}
        >
          {isRoot ? "N0" : `N${node.level}`}
        </span>
      </div>
    </div>
  );
}

function TreeBranch({
  node,
  isRoot,
  defaultExpandedDepth,
  onSelect,
}: {
  node: ReferralNodeView;
  isRoot?: boolean;
  defaultExpandedDepth: number;
  onSelect?: (node: ReferralNodeView) => void;
}) {
  const [expanded, setExpanded] = useState(node.level < defaultExpandedDepth);
  const hasChildren = node.children.length > 0;
  const hiddenChildren = !hasChildren && node.directCount > 0;

  return (
    <li className="relative pl-6 first:pt-0">
      {/* connecteurs */}
      {!isRoot && (
        <>
          <span
            className="absolute left-0 top-0 bottom-0 w-px bg-white/10 last:h-6"
            aria-hidden="true"
          />
          <span className="absolute left-0 top-7 w-5 h-px bg-white/10" aria-hidden="true" />
        </>
      )}

      <NodeCard
        node={node}
        isRoot={isRoot}
        expandable={hasChildren}
        expanded={expanded}
        onToggle={() => setExpanded((v) => !v)}
        onSelect={onSelect}
      />

      {hiddenChildren && (
        <p className="pl-9 pt-1.5 text-[9px] font-black uppercase tracking-widest text-slate-600">
          {node.directCount} filleul(s) au niveau suivant
        </p>
      )}

      {hasChildren && expanded && (
        <ul className="mt-2 space-y-2">
          {node.children.map((child) => (
            <TreeBranch
              key={child.id}
              node={child}
              defaultExpandedDepth={defaultExpandedDepth}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ReferralTree({
  topology,
  showUpline = true,
  defaultExpandedDepth = 2,
  onSelect,
  emptyLabel = "Aucun affilie dans votre reseau",
}: {
  topology: ReferralTopologyView;
  showUpline?: boolean;
  defaultExpandedDepth?: number;
  onSelect?: (node: ReferralNodeView) => void;
  emptyLabel?: string;
}) {
  const { root, upline, levels, totalDescendants, verifiedDescendants, truncated } = topology;

  const directCount = useMemo(
    () => (root.children.length > 0 ? root.children.length : root.directCount),
    [root]
  );

  return (
    <div className="space-y-4">
      {/* Synthese du reseau */}
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Reseau total" value={totalDescendants} tone="blue" />
        <Stat label="Directs (N1)" value={directCount} tone="slate" />
        <Stat label="KYC valides" value={verifiedDescendants} tone="emerald" />
      </div>

      {/* Repartition par niveau */}
      {levels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {levels.map((lvl) => (
            <span
              key={lvl.level}
              className={`text-[9px] font-black px-2.5 py-1.5 rounded-xl border uppercase tracking-wider ${accentFor(
                lvl.level
              )}`}
            >
              N{lvl.level} · {lvl.count} · {lvl.verified} KYC
            </span>
          ))}
        </div>
      )}

      {/* Parrains (upline) */}
      {showUpline && upline.length > 0 && (
        <div className="space-y-2">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            Ligne ascendante
          </p>
          <ul className="space-y-2">
            {[...upline].reverse().map((parent, index) => (
              <li key={parent.id} className="relative pl-6">
                <span className="absolute left-0 top-7 w-5 h-px bg-white/10" aria-hidden="true" />
                <span
                  className="absolute left-0 top-0 bottom-0 w-px bg-white/10"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                  <UserRound size={14} className="text-slate-500 shrink-0" />
                  <Avatar node={parent} size={30} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-200 truncate uppercase tracking-tight">
                      {displayName(parent)}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 truncate">
                      @{parent.username || parent.id.slice(0, 8)}
                    </p>
                  </div>
                  <span className="text-[8px] font-black px-2 py-1 rounded-full border border-white/10 bg-white/5 text-slate-400 uppercase tracking-wider">
                    Parrain {upline.length - index}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Arbre descendant */}
      <div className="space-y-2">
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
          <Network size={12} className="text-blue-400" />
          Arbre des affilies
        </p>
        <ul className="space-y-2">
          <TreeBranch
            node={root}
            isRoot
            defaultExpandedDepth={Math.max(defaultExpandedDepth, 1)}
            onSelect={onSelect}
          />
        </ul>
      </div>

      {root.children.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center">
          <Users size={26} className="mx-auto text-slate-700 mb-2" />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 text-balance">
            {emptyLabel}
          </p>
        </div>
      )}

      {truncated && (
        <p className="text-[9px] font-bold uppercase tracking-widest text-amber-400/80 text-balance">
          Affichage partiel : le reseau depasse la limite de noeuds charges.
        </p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "blue" | "emerald" | "slate";
}) {
  const tones = {
    blue: "text-blue-400 border-blue-500/20 bg-blue-500/10",
    emerald: "text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
    slate: "text-slate-200 border-white/10 bg-white/5",
  } as const;

  return (
    <div className={`rounded-2xl border p-3 text-center ${tones[tone]}`}>
      <p className="text-lg font-black leading-none tabular-nums">{value}</p>
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mt-1">{label}</p>
    </div>
  );
}
