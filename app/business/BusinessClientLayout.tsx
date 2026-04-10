'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Users,
  Truck,
  BarChart3,
  UserCog,
  Settings,
  Building2,
  Bell,
  Search,
  ChevronRight,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  Info,
  LogOut,
  ChevronDown,
  Command,
  Zap,
  Shield,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'PRINCIPAL',
    items: [
      { label: 'Dashboard', href: '/business', icon: LayoutDashboard },
      { label: 'Factures', href: '/business/invoices', icon: FileText },
      { label: 'Paiements', href: '/business/payments', icon: CreditCard },
    ],
  },
  {
    label: 'GESTION',
    items: [
      { label: 'Employes', href: '/business/employees', icon: Users },
      { label: 'Fournisseurs', href: '/business/suppliers', icon: Truck },
      { label: 'Rapports', href: '/business/reports', icon: BarChart3 },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      { label: 'Utilisateurs', href: '/business/users', icon: UserCog },
      { label: 'Parametres', href: '/business/settings', icon: Settings },
      { label: 'Banque', href: '/business/banking', icon: Building2 },
    ],
  },
];

const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'payment',
    icon: DollarSign,
    iconColor: '#34d399',
    iconBg: 'rgba(52,211,153,0.12)',
    title: 'Paiement recu',
    message: 'Facture #INV-2024-089 payee par Acme Corp — 12 450,00 EUR',
    timestamp: 'Il y a 3 min',
    read: false,
  },
  {
    id: 2,
    type: 'alert',
    icon: AlertTriangle,
    iconColor: '#f59e0b',
    iconBg: 'rgba(245,158,11,0.12)',
    title: 'Echeance imminente',
    message: 'Facture #INV-2024-091 due dans 2 jours — 8 200,00 EUR',
    timestamp: 'Il y a 15 min',
    read: false,
  },
  {
    id: 3,
    type: 'system',
    icon: Shield,
    iconColor: '#6366f1',
    iconBg: 'rgba(99,102,241,0.12)',
    title: 'Connexion detectee',
    message: 'Nouvelle connexion depuis Paris, France (Chrome/macOS)',
    timestamp: 'Il y a 42 min',
    read: false,
  },
  {
    id: 4,
    type: 'payment',
    icon: TrendingUp,
    iconColor: '#22d3ee',
    iconBg: 'rgba(34,211,238,0.12)',
    title: 'Rapport mensuel pret',
    message: 'Le rapport financier de novembre 2024 est disponible',
    timestamp: 'Il y a 1h',
    read: true,
  },
  {
    id: 5,
    type: 'alert',
    icon: AlertCircle,
    iconColor: '#f87171',
    iconBg: 'rgba(248,113,113,0.12)',
    title: 'Paiement echoue',
    message: 'Virement vers Fournisseur XYZ a echoue — 3 600,00 EUR',
    timestamp: 'Il y a 2h',
    read: true,
  },
  {
    id: 6,
    type: 'system',
    icon: Zap,
    iconColor: '#a78bfa',
    iconBg: 'rgba(167,139,250,0.12)',
    title: 'Mise a jour systeme',
    message: 'PimPay Business v2.4.1 deploye avec succes',
    timestamp: 'Il y a 3h',
    read: true,
  },
];

const BREADCRUMB_MAP: Record<string, string[]> = {
  '/business': ['Business', 'Dashboard'],
  '/business/invoices': ['Business', 'Factures'],
  '/business/payments': ['Business', 'Paiements'],
  '/business/employees': ['Business', 'Employes'],
  '/business/suppliers': ['Business', 'Fournisseurs'],
  '/business/reports': ['Business', 'Rapports'],
  '/business/users': ['Business', 'Utilisateurs'],
  '/business/settings': ['Business', 'Parametres'],
  '/business/banking': ['Business', 'Banque'],
};

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [notifFilter, setNotifFilter] = useState<'all' | 'payment' | 'alert' | 'system'>('all');
  const [searchFocused, setSearchFocused] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifs = notifications.filter(
    (n) => notifFilter === 'all' || n.type === notifFilter
  );

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const breadcrumbs = BREADCRUMB_MAP[pathname] || ['Business'];

  const isActive = (href: string) => {
    if (href === '/business') return pathname === '/business';
    return pathname.startsWith(href);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#02040a',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 40,
            backdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* SIDEBAR */}
      <aside
        style={{
          width: 260,
          minWidth: 260,
          background: '#0A0E17',
          borderRight: '1px solid #1F2937',
          display: 'flex',
          flexDirection: 'column',
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
        className="lg:translate-x-0"
      >
        {/* Logo */}
        <div
          style={{
            padding: '24px 20px 20px',
            borderBottom: '1px solid #1F2937',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 18,
              color: '#02040a',
              letterSpacing: '-0.5px',
              flexShrink: 0,
              boxShadow: '0 4px 16px rgba(200,169,97,0.35)',
            }}
          >
            P
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.3px',
                lineHeight: 1.2,
              }}
            >
              PimPay
              <span
                style={{
                  background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  marginLeft: 4,
                }}
              >
                Business
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: '#6B7280',
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginTop: 1,
              }}
            >
              Portail Entreprise
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} style={{ marginBottom: 4 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#4B5563',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '12px 20px 6px',
                }}
              >
                {section.label}
              </div>
              {section.items.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '9px 20px',
                      margin: '1px 8px',
                      borderRadius: 10,
                      textDecoration: 'none',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      background: active
                        ? 'rgba(200,169,97,0.08)'
                        : 'transparent',
                      borderLeft: active
                        ? '2px solid #C8A961'
                        : '2px solid transparent',
                      paddingLeft: active ? 16 : 18,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background =
                          'rgba(255,255,255,0.04)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background =
                          'transparent';
                      }
                    }}
                  >
                    <Icon
                      size={16}
                      style={{
                        color: active ? '#C8A961' : '#6B7280',
                        flexShrink: 0,
                        transition: 'color 0.2s',
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        color: active ? '#E5C97A' : '#9CA3AF',
                        transition: 'color 0.2s',
                      }}
                    >
                      {item.label}
                    </span>
                    {active && (
                      <div
                        style={{
                          marginLeft: 'auto',
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: '#C8A961',
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div
          style={{
            padding: '16px 16px 20px',
            borderTop: '1px solid #1F2937',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'rgba(255,255,255,0.03)';
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              AM
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#E5E7EB',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                Ahmed Martin
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  marginTop: 1,
                }}
              >
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: '#C8A961',
                    background: 'rgba(200,169,97,0.12)',
                    border: '1px solid rgba(200,169,97,0.25)',
                    borderRadius: 4,
                    padding: '1px 5px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Admin
                </span>
              </div>
            </div>
            <LogOut
              size={14}
              style={{ color: '#4B5563', flexShrink: 0 }}
            />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          marginLeft: 0,
          transition: 'margin-left 0.3s',
        }}
        className="lg:ml-[260px]"
      >
        {/* TOP BAR */}
        <header
          style={{
            height: 64,
            background: '#0D1117',
            borderBottom: '1px solid #1F2937',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 16,
            position: 'sticky',
            top: 0,
            zIndex: 30,
            flexShrink: 0,
          }}
        >
          {/* Hamburger (mobile) */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#9CA3AF',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
            className="lg:hidden"
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = '#9CA3AF';
            }}
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Breadcrumb */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flex: 1,
              minWidth: 0,
            }}
          >
            {breadcrumbs.map((crumb, i) => (
              <div
                key={crumb}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {i > 0 && (
                  <ChevronRight
                    size={13}
                    style={{ color: '#374151', flexShrink: 0 }}
                  />
                )}
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: i === breadcrumbs.length - 1 ? 600 : 400,
                    color:
                      i === breadcrumbs.length - 1 ? '#E5E7EB' : '#6B7280',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {crumb}
                </span>
              </div>
            ))}
          </nav>

          {/* Search */}
          <div
            style={{
              position: 'relative',
              flexShrink: 0,
            }}
            className="hidden sm:block"
          >
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#4B5563',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Rechercher..."
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                width: 220,
                height: 36,
                background: searchFocused
                  ? 'rgba(255,255,255,0.07)'
                  : 'rgba(255,255,255,0.04)',
                border: `1px solid ${
                  searchFocused
                    ? 'rgba(99,102,241,0.5)'
                    : 'rgba(255,255,255,0.08)'
                }`,
                borderRadius: 8,
                color: '#E5E7EB',
                fontSize: 13,
                paddingLeft: 32,
                paddingRight: 54,
                outline: 'none',
                transition: 'all 0.2s',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 8,
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  padding: '2px 5px',
                }}
              >
                <Command size={9} style={{ color: '#6B7280' }} />
                <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 500 }}>K</span>
              </div>
            </div>
          </div>

          {/* Notification Bell */}
          <div ref={notifRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => {
                setNotifOpen(!notifOpen);
                setUserMenuOpen(false);
              }}
              style={{
                position: 'relative',
                width: 36,
                height: 36,
                borderRadius: 8,
                background: notifOpen
                  ? 'rgba(255,255,255,0.07)'
                  : 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#9CA3AF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  'rgba(255,255,255,0.07)';
                (e.currentTarget as HTMLElement).style.color = '#fff';
              }}
              onMouseLeave={(e) => {
                if (!notifOpen) {
                  (e.currentTarget as HTMLElement).style.background =
                    'transparent';
                  (e.currentTarget as HTMLElement).style.color = '#9CA3AF';
                }
              }}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#ef4444',
                    border: '1.5px solid #0D1117',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
              )}
            </button>

            {/* Notification Panel */}
            {notifOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: 380,
                  background: '#0D1117',
                  border: '1px solid #1F2937',
                  borderRadius: 16,
                  boxShadow:
                    '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
                  zIndex: 100,
                  animation: 'slideDown 0.2s ease',
                  overflow: 'hidden',
                }}
              >
                <style>{`
                  @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>

                {/* Panel Header */}
                <div
                  style={{
                    padding: '16px 16px 12px',
                    borderBottom: '1px solid #1F2937',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#E5E7EB',
                      }}
                    >
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: '#fff',
                          background: '#ef4444',
                          borderRadius: 20,
                          padding: '1px 7px',
                        }}
                      >
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#6366f1',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>

                {/* Filter tabs */}
                <div
                  style={{
                    display: 'flex',
                    gap: 2,
                    padding: '8px 12px',
                    borderBottom: '1px solid #1F2937',
                  }}
                >
                  {(['all', 'payment', 'alert', 'system'] as const).map(
                    (filter) => (
                      <button
                        key={filter}
                        onClick={() => setNotifFilter(filter)}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color:
                            notifFilter === filter ? '#E5E7EB' : '#6B7280',
                          background:
                            notifFilter === filter
                              ? 'rgba(255,255,255,0.08)'
                              : 'transparent',
                          border: '1px solid',
                          borderColor:
                            notifFilter === filter
                              ? 'rgba(255,255,255,0.12)'
                              : 'transparent',
                          borderRadius: 6,
                          padding: '4px 10px',
                          cursor: 'pointer',
                          textTransform: 'capitalize',
                          transition: 'all 0.2s',
                        }}
                      >
                        {filter === 'all' ? 'Tout' : filter === 'payment' ? 'Paiements' : filter === 'alert' ? 'Alertes' : 'Systeme'}
                      </button>
                    )
                  )}
                </div>

                {/* Notification List */}
                <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                  {filteredNotifs.length === 0 ? (
                    <div
                      style={{
                        padding: '32px',
                        textAlign: 'center',
                        color: '#4B5563',
                        fontSize: 13,
                      }}
                    >
                      Aucune notification
                    </div>
                  ) : (
                    filteredNotifs.map((notif) => {
                      const Icon = notif.icon;
                      return (
                        <div
                          key={notif.id}
                          onClick={() => markRead(notif.id)}
                          style={{
                            display: 'flex',
                            gap: 12,
                            padding: '12px 16px',
                            cursor: 'pointer',
                            background: notif.read
                              ? 'transparent'
                              : 'rgba(99,102,241,0.04)',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                            transition: 'background 0.2s',
                            position: 'relative',
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              'rgba(255,255,255,0.04)';
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background =
                              notif.read
                                ? 'transparent'
                                : 'rgba(99,102,241,0.04)';
                          }}
                        >
                          {!notif.read && (
                            <div
                              style={{
                                position: 'absolute',
                                left: 6,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                width: 4,
                                height: 4,
                                borderRadius: '50%',
                                background: '#6366f1',
                              }}
                            />
                          )}
                          <div
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 10,
                              background: notif.iconBg,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Icon
                              size={16}
                              style={{ color: notif.iconColor }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: notif.read ? '#9CA3AF' : '#E5E7EB',
                                marginBottom: 2,
                              }}
                            >
                              {notif.title}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: '#6B7280',
                                lineHeight: 1.4,
                                marginBottom: 4,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {notif.message}
                            </div>
                            <div
                              style={{
                                fontSize: 10,
                                color: '#4B5563',
                                fontWeight: 500,
                              }}
                            >
                              {notif.timestamp}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                <div
                  style={{
                    padding: '10px 16px',
                    borderTop: '1px solid #1F2937',
                    textAlign: 'center',
                  }}
                >
                  <button
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#6366f1',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Voir toutes les notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Avatar */}
          <div ref={userMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => {
                setUserMenuOpen(!userMenuOpen);
                setNotifOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 10px 4px 4px',
                borderRadius: 10,
                background: userMenuOpen
                  ? 'rgba(255,255,255,0.07)'
                  : 'transparent',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  'rgba(255,255,255,0.07)';
              }}
              onMouseLeave={(e) => {
                if (!userMenuOpen) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                AM
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#E5E7EB',
                  whiteSpace: 'nowrap',
                }}
                className="hidden sm:block"
              >
                Ahmed Martin
              </span>
              <ChevronDown
                size={13}
                style={{
                  color: '#6B7280',
                  transform: userMenuOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
                className="hidden sm:block"
              />
            </button>

            {/* User Dropdown */}
            {userMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: 220,
                  background: '#0D1117',
                  border: '1px solid #1F2937',
                  borderRadius: 12,
                  boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                  zIndex: 100,
                  overflow: 'hidden',
                  animation: 'slideDown 0.2s ease',
                }}
              >
                <div
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid #1F2937',
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: '#E5E7EB',
                    }}
                  >
                    Ahmed Martin
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: '#6B7280',
                      marginTop: 2,
                    }}
                  >
                    ahmed.martin@pimpay.com
                  </div>
                </div>
                {[
                  { icon: UserCog, label: 'Mon profil', href: '/business/settings' },
                  { icon: Settings, label: 'Parametres', href: '/business/settings' },
                  { icon: Shield, label: 'Securite', href: '/business/settings' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 16px',
                        textDecoration: 'none',
                        color: '#9CA3AF',
                        fontSize: 13,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          'rgba(255,255,255,0.05)';
                        (e.currentTarget as HTMLElement).style.color = '#E5E7EB';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background =
                          'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#9CA3AF';
                      }}
                    >
                      <Icon size={14} />
                      {item.label}
                    </Link>
                  );
                })}
                <div style={{ borderTop: '1px solid #1F2937' }}>
                  <button
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 16px',
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      color: '#f87171',
                      fontSize: 13,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        'rgba(248,113,113,0.08)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        'transparent';
                    }}
                  >
                    <LogOut size={14} />
                    Se deconnecter
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            background: '#02040a',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
