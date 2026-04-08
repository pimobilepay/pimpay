'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// ─── Icons ────────────────────────────────────────────────────────────────────
const Icon = ({ d, size = 20 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const icons = {
  dashboard:       'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  transactions:    'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  accounts:        'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8',
  monitoring:      'M22 12h-4l-3 9L9 3l-3 9H2',
  correspondents:  'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  fx:              'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 0c2.5 2.5 3.5 5 3.5 10S14.5 19.5 12 22m0-20c-2.5 2.5-3.5 5-3.5 10s1 7.5 3.5 10M2 12h20',
  treasury:        'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  compliance:      'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0 1 12 2.944a11.955 11.955 0 0 1-8.618 3.04A12.02 12.02 0 0 0 3 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  audit:           'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8',
  users:           'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0 M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  settings:        'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  chevronLeft:     'M15 18l-6-6 6-6',
  chevronRight:    'M9 18l6-6-6-6',
  bell:            'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0',
  search:          'M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  logout:          'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  zap:             'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  plus:            'M12 5v14M5 12h14',
  download:        'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  globe:           'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 0c2.5 2.5 4 6 4 10s-1.5 7.5-4 10m0-20C9.5 4.5 8 8 8 12s1.5 7.5 4 10M2 12h20',
  arrowDown:       'M6 9l6 6 6-6',
  x:               'M18 6L6 18M6 6l12 12',
  keyboard:        'M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zM8 15v-4 M12 15V9 M16 15v-2',
};

// ─── Nav Config ───────────────────────────────────────────────────────────────
const navSections = [
  {
    label: 'PRINCIPAL',
    items: [
      { label: 'Dashboard',     href: '/bank',                 icon: icons.dashboard },
      { label: 'Transactions',  href: '/bank/transactions',    icon: icons.transactions },
      { label: 'Comptes',       href: '/bank/accounts',        icon: icons.accounts },
    ],
  },
  {
    label: 'OPÉRATIONS',
    items: [
      { label: 'Monitoring',      href: '/bank/monitoring',      icon: icons.monitoring },
      { label: 'Correspondants',  href: '/bank/correspondents',  icon: icons.correspondents },
      { label: 'FX / Change',     href: '/bank/fx',              icon: icons.fx },
      { label: 'Trésorerie',      href: '/bank/treasury',        icon: icons.treasury },
    ],
  },
  {
    label: 'CONFORMITÉ',
    items: [
      { label: 'Compliance',  href: '/bank/compliance',  icon: icons.compliance },
      { label: 'Audit Log',   href: '/bank/audit',       icon: icons.audit },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { label: 'Utilisateurs',  href: '/bank/settings/users',  icon: icons.users },
      { label: 'Paramètres',    href: '/bank/settings',        icon: icons.settings },
    ],
  },
];

// ─── Breadcrumb mapping ────────────────────────────────────────────────────────
const breadcrumbMap: Record<string, string> = {
  bank:           'Dashboard',
  transactions:   'Transactions',
  accounts:       'Comptes',
  monitoring:     'Monitoring',
  correspondents: 'Correspondants',
  fx:             'FX / Change',
  treasury:       'Trésorerie',
  compliance:     'Compliance',
  audit:          'Audit Log',
  settings:       'Paramètres',
  users:          'Utilisateurs',
};

// ─── Quick Actions ─────────────────────────────────────────────────────────────
const quickActions = [
  { label: 'Nouveau virement',    icon: icons.plus },
  { label: 'Télécharger relevé',  icon: icons.download },
  { label: 'Taux de change',      icon: icons.globe },
  { label: 'Action rapide',       icon: icons.zap },
];

// ─── Mock notifications ────────────────────────────────────────────────────────
const notifications = [
  { id: 1, title: 'Virement en attente',  time: 'Il y a 2 min',   dot: '#C8A961' },
  { id: 2, title: 'Alerte compliance',    time: 'Il y a 15 min',  dot: '#EF4444' },
  { id: 3, title: 'Rapport FX généré',    time: 'Il y a 1 h',     dot: '#22C55E' },
  { id: 4, title: 'Connexion détectée',   time: 'Il y a 3 h',     dot: '#3B82F6' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const [collapsed,        setCollapsed]        = useState(false);
  const [notifOpen,        setNotifOpen]        = useState(false);
  const [quickOpen,        setQuickOpen]        = useState(false);
  const [searchFocused,    setSearchFocused]    = useState(false);
  const [searchValue,      setSearchValue]      = useState('');

  const notifRef  = useRef<HTMLDivElement>(null);
  const quickRef  = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node))  setNotifOpen(false);
      if (quickRef.current && !quickRef.current.contains(e.target as Node))  setQuickOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
        setSearchFocused(true);
      }
      if (e.key === 'Escape') {
        searchRef.current?.blur();
        setSearchFocused(false);
        setNotifOpen(false);
        setQuickOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Breadcrumb
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = segments.map((seg, i) => ({
    label: breadcrumbMap[seg] ?? seg,
    href:  '/' + segments.slice(0, i + 1).join('/'),
    last:  i === segments.length - 1,
  }));

  const isActive = (href: string) => {
    if (href === '/bank') return pathname === '/bank';
    return pathname.startsWith(href);
  };

  const sidebarW = collapsed ? '72px' : '280px';

  return (
    <div
      style={{ backgroundColor: '#0A0E17', minHeight: '100vh', display: 'flex', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          width: sidebarW,
          minWidth: sidebarW,
          backgroundColor: '#0D1117',
          borderRight: '1px solid #1F2937',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 50,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'space-between',
            padding: collapsed ? '0 16px' : '0 20px',
            borderBottom: '1px solid #1F2937',
            flexShrink: 0,
          }}
        >
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#0A0E17', fontWeight: 900, fontSize: '14px', letterSpacing: '-0.5px' }}>P</span>
              </div>
              <div>
                <div style={{ color: '#F3F4F6', fontWeight: 800, fontSize: '18px', letterSpacing: '-0.5px', lineHeight: 1 }}>
                  PIM<span style={{ color: '#C8A961' }}>PAY</span>
                </div>
                <div style={{ color: '#6B7280', fontSize: '10px', letterSpacing: '2px', marginTop: '2px' }}>BANKING PORTAL</div>
              </div>
            </div>
          )}

          {collapsed && (
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#0A0E17', fontWeight: 900, fontSize: '14px' }}>P</span>
            </div>
          )}

          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              style={{
                background: 'none',
                border: '1px solid #1F2937',
                borderRadius: '6px',
                padding: '4px',
                cursor: 'pointer',
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#C8A961'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#C8A961'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1F2937'; }}
            >
              <Icon d={icons.chevronLeft} size={16} />
            </button>
          )}
        </div>

        {/* Collapse button when collapsed */}
        {collapsed && (
          <div style={{ padding: '8px 12px 0', flexShrink: 0 }}>
            <button
              onClick={() => setCollapsed(false)}
              style={{
                width: '100%',
                background: 'none',
                border: '1px solid #1F2937',
                borderRadius: '6px',
                padding: '6px',
                cursor: 'pointer',
                color: '#6B7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.2s, border-color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#C8A961'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#C8A961'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6B7280'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#1F2937'; }}
            >
              <Icon d={icons.chevronRight} size={16} />
            </button>
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px 0', scrollbarWidth: 'none' }}>
          {navSections.map(section => (
            <div key={section.label} style={{ marginBottom: '4px' }}>
              {!collapsed && (
                <div
                  style={{
                    padding: '12px 20px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '1.5px',
                    color: '#4B5563',
                  }}
                >
                  {section.label}
                </div>
              )}
              {collapsed && (
                <div style={{ margin: '8px 12px 4px', height: '1px', backgroundColor: '#1F2937' }} />
              )}
              {section.items.map(item => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: collapsed ? '10px 0' : '10px 20px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      margin: '1px 8px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: active ? '#E5E7EB' : '#9CA3AF',
                      backgroundColor: active ? 'rgba(200,169,97,0.08)' : 'transparent',
                      borderLeft: active && !collapsed ? '3px solid #C8A961' : active && collapsed ? 'none' : '3px solid transparent',
                      paddingLeft: active && !collapsed ? '17px' : collapsed ? undefined : '20px',
                      fontWeight: active ? 600 : 400,
                      fontSize: '14px',
                      transition: 'background-color 0.15s, color 0.15s',
                      position: 'relative',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'rgba(255,255,255,0.04)';
                        (e.currentTarget as HTMLAnchorElement).style.color = '#D1D5DB';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLAnchorElement).style.backgroundColor = 'transparent';
                        (e.currentTarget as HTMLAnchorElement).style.color = '#9CA3AF';
                      }
                    }}
                  >
                    <span
                      style={{
                        color: active ? '#C8A961' : 'currentColor',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Icon d={item.icon} size={18} />
                    </span>
                    {!collapsed && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>}
                    {active && collapsed && (
                      <span
                        style={{
                          position: 'absolute',
                          right: '4px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '3px',
                          height: '20px',
                          backgroundColor: '#C8A961',
                          borderRadius: '2px',
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div
          style={{
            borderTop: '1px solid #1F2937',
            padding: collapsed ? '12px 8px' : '12px 16px',
            flexShrink: 0,
          }}
        >
          {!collapsed ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #C8A961 0%, #6B3E00 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    border: '2px solid rgba(200,169,97,0.3)',
                  }}
                >
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>AM</span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: '#F3F4F6', fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Amadou Mbaye</div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: 'rgba(200,169,97,0.12)',
                      border: '1px solid rgba(200,169,97,0.25)',
                      borderRadius: '4px',
                      padding: '1px 6px',
                      marginTop: '2px',
                    }}
                  >
                    <span style={{ color: '#C8A961', fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px' }}>SUPER ADMIN</span>
                  </div>
                </div>
              </div>
              <button
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '7px',
                  padding: '7px 12px',
                  cursor: 'pointer',
                  color: '#F87171',
                  fontSize: '13px',
                  fontWeight: 500,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.06)'; }}
              >
                <Icon d={icons.logout} size={15} />
                <span>Déconnexion</span>
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <div
                title="Amadou Mbaye — SUPER ADMIN"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #C8A961 0%, #6B3E00 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid rgba(200,169,97,0.3)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>AM</span>
              </div>
              <button
                title="Déconnexion"
                style={{
                  width: '38px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  color: '#F87171',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.12)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(239,68,68,0.06)'; }}
              >
                <Icon d={icons.logout} size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div
        style={{
          marginLeft: sidebarW,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          transition: 'margin-left 0.3s cubic-bezier(0.4,0,0.2,1)',
          minWidth: 0,
        }}
      >
        {/* ── Header ── */}
        <header
          style={{
            height: '64px',
            backgroundColor: '#0D1117',
            borderBottom: '1px solid #1F2937',
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: '16px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Breadcrumb */}
          <nav style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            {crumbs.map((crumb, i) => (
              <React.Fragment key={crumb.href}>
                {i > 0 && (
                  <span style={{ color: '#374151', fontSize: '14px' }}>/</span>
                )}
                {crumb.last ? (
                  <span style={{ color: '#F3F4F6', fontSize: '14px', fontWeight: 600 }}>{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    style={{ color: '#6B7280', fontSize: '14px', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#C8A961'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = '#6B7280'; }}
                  >
                    {crumb.label}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>

          {/* Search */}
          <div
            style={{
              position: 'relative',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: searchFocused ? '#111827' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${searchFocused ? '#C8A961' : '#1F2937'}`,
                borderRadius: '8px',
                padding: '0 12px',
                height: '38px',
                width: searchFocused ? '280px' : '220px',
                transition: 'all 0.25s',
              }}
            >
              <span style={{ color: '#6B7280', flexShrink: 0, display: 'flex' }}>
                <Icon d={icons.search} size={15} />
              </span>
              <input
                ref={searchRef}
                value={searchValue}
                onChange={e => setSearchValue(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Rechercher..."
                style={{
                  background: 'none',
                  border: 'none',
                  outline: 'none',
                  color: '#F3F4F6',
                  fontSize: '13px',
                  flex: 1,
                  minWidth: 0,
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  flexShrink: 0,
                  opacity: searchFocused ? 0 : 1,
                  transition: 'opacity 0.2s',
                }}
              >
                <span
                  style={{
                    backgroundColor: '#1F2937',
                    borderRadius: '4px',
                    padding: '1px 5px',
                    fontSize: '10px',
                    color: '#6B7280',
                    fontFamily: 'monospace',
                    border: '1px solid #374151',
                  }}
                >
                  Ctrl
                </span>
                <span
                  style={{
                    backgroundColor: '#1F2937',
                    borderRadius: '4px',
                    padding: '1px 5px',
                    fontSize: '10px',
                    color: '#6B7280',
                    fontFamily: 'monospace',
                    border: '1px solid #374151',
                  }}
                >
                  K
                </span>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div ref={quickRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => { setQuickOpen(v => !v); setNotifOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: quickOpen ? 'rgba(200,169,97,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${quickOpen ? '#C8A961' : '#1F2937'}`,
                borderRadius: '8px',
                padding: '0 12px',
                height: '38px',
                cursor: 'pointer',
                color: quickOpen ? '#C8A961' : '#9CA3AF',
                fontSize: '13px',
                fontWeight: 500,
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!quickOpen) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#374151'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)'; } }}
              onMouseLeave={e => { if (!quickOpen) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1F2937'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.03)'; } }}
            >
              <Icon d={icons.zap} size={15} />
              <span>Actions</span>
              <span
                style={{
                  transform: quickOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                  display: 'flex',
                }}
              >
                <Icon d={icons.arrowDown} size={13} />
              </span>
            </button>

            {quickOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: '#111827',
                  border: '1px solid #1F2937',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  minWidth: '200px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  animation: 'fadeSlideDown 0.15s ease',
                  zIndex: 100,
                }}
              >
                <div style={{ padding: '6px' }}>
                  {quickActions.map((action, i) => (
                    <button
                      key={i}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '7px',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#D1D5DB',
                        fontSize: '13px',
                        fontWeight: 500,
                        textAlign: 'left',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                    >
                      <span style={{ color: '#C8A961', display: 'flex' }}><Icon d={action.icon} size={15} /></span>
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notification bell */}
          <div ref={notifRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => { setNotifOpen(v => !v); setQuickOpen(false); }}
              style={{
                position: 'relative',
                width: '38px',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: notifOpen ? 'rgba(200,169,97,0.1)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${notifOpen ? '#C8A961' : '#1F2937'}`,
                borderRadius: '8px',
                cursor: 'pointer',
                color: notifOpen ? '#C8A961' : '#9CA3AF',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!notifOpen) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#374151'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.05)'; } }}
              onMouseLeave={e => { if (!notifOpen) { (e.currentTarget as HTMLButtonElement).style.borderColor = '#1F2937'; (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.03)'; } }}
            >
              <Icon d={icons.bell} size={17} />
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '16px',
                  height: '16px',
                  backgroundColor: '#EF4444',
                  borderRadius: '50%',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1.5px solid #0D1117',
                }}
              >
                {notifications.length}
              </span>
            </button>

            {notifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  backgroundColor: '#111827',
                  border: '1px solid #1F2937',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  width: '320px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  zIndex: 100,
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #1F2937',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ color: '#F3F4F6', fontWeight: 600, fontSize: '14px' }}>Notifications</span>
                  <span
                    style={{
                      backgroundColor: 'rgba(200,169,97,0.12)',
                      border: '1px solid rgba(200,169,97,0.2)',
                      borderRadius: '4px',
                      padding: '1px 7px',
                      fontSize: '11px',
                      color: '#C8A961',
                      fontWeight: 600,
                    }}
                  >
                    {notifications.length} nouvelles
                  </span>
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #1A2233',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.03)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'; }}
                    >
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: n.dot,
                          flexShrink: 0,
                          boxShadow: `0 0 6px ${n.dot}88`,
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#E5E7EB', fontSize: '13px', fontWeight: 500 }}>{n.title}</div>
                        <div style={{ color: '#6B7280', fontSize: '11px', marginTop: '2px' }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '10px 16px', borderTop: '1px solid #1F2937' }}>
                  <button
                    style={{
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: '#C8A961',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(200,169,97,0.08)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'; }}
                  >
                    Voir toutes les notifications
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* ── Page content ── */}
        <main
          style={{
            flex: 1,
            padding: '28px 28px',
            minWidth: 0,
            overflowX: 'hidden',
          }}
        >
          {children}
        </main>

        {/* ── Footer ── */}
        <footer
          style={{
            borderTop: '1px solid #1F2937',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <span style={{ color: '#374151', fontSize: '12px' }}>© 2024 PIMPAY — Tous droits réservés</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ color: '#374151', fontSize: '12px' }}>v2.4.1</span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: '#22C55E',
                fontSize: '12px',
              }}
            >
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#22C55E',
                  boxShadow: '0 0 6px #22C55E88',
                }}
              />
              Système opérationnel
            </span>
          </div>
        </footer>
      </div>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background-color: #0A0E17; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1F2937; border-radius: 2px; }
        ::-webkit-scrollbar-thumb:hover { background: #374151; }
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
