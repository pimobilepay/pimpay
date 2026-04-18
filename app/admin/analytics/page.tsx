"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Activity, TrendingUp, TrendingDown,
  Globe, ShieldCheck, BarChart3, RefreshCw, Loader2,
  UserPlus, ArrowUpRight, ArrowDownRight, X, LayoutGrid,
  Wallet, Headphones, Settings, Shield, Menu,
  Eye, Monitor, Smartphone, Clock, MapPin, Zap, Target,
  Laptop, Tablet, Radio, XCircle, Timer, MousePointerClick,
  Layers, ArrowRight, Wifi
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line
} from "recharts";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup
} from "react-simple-maps";

// --- TYPES ---
type KPIs = {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  activeUsers: number;
  bannedUsers: number;
  suspendedUsers: number;
  totalTransactions: number;
  transactionsToday: number;
  transactionsWeek: number;
  userGrowth: number;
  txGrowth: number;
};

type ChartPoint = {
  date: string;
  label: string;
  newUsers: number;
  transactions: number;
  volume: number;
};

type RecentUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  country: string | null;
  role: string;
  status: string;
  createdAt: string;
};

type CountryData = {
  country: string;
  count: number;
  activeCount: number;
  newCount: number;
};

type AnalyticsData = {
  kpis: KPIs;
  roles: Record<string, number>;
  kyc: Record<string, number>;
  chartData: ChartPoint[];
  topCountries: CountryData[];
  recentSignups: RecentUser[];
};

type OnlineUser = {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  currentPage: string;
  device: string | null;
  lastSeen: string;
};

type OnlineUserGeo = {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  userRole: string;
  userStatus: string;
  country: string | null;
  countryFlag: string | null;
  latitude: number | null;
  longitude: number | null;
  currentPage: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  ip: string | null;
  lastSeen: string;
};

type UserSessionData = {
  user: {
    id: string;
    name: string | null;
    email: string;
    username: string | null;
    avatar: string | null;
    role: string;
    status: string;
    country: string | null;
    lastLogin: string | null;
    createdAt: string;
  };
  isOnline: boolean;
  currentPage: string | null;
  currentDevice: string | null;
  currentBrowser: string | null;
  currentOS: string | null;
  currentIP: string | null;
  sessionStartTime: string | null;
  totalDuration: number;
  totalPageViews: number;
  totalClicks: number;
  pageVisits: { page: string; count: number }[];
  pageJourney: {
    page: string;
    timestamp: string;
    duration: number;
    nextPage: string | null;
  }[];
  recentActivities: {
    id: string;
    page: string;
    action: string;
    duration: number | null;
    device: string | null;
    browser: string | null;
    os: string | null;
    ip: string | null;
    createdAt: string;
  }[];
};

// Country coordinates for map markers
// Keys are normalized to lowercase-no-accent for fuzzy matching
const COUNTRY_COORDINATES_RAW: Array<{ keys: string[]; coords: [number, number] }> = [
  { keys: ["france"], coords: [2.3522, 46.6034] },
  { keys: ["senegal", "sénégal"], coords: [-14.4524, 14.4974] },
  { keys: ["cameroun", "cameroon", "cameroun"], coords: [12.3547, 5.9631] },
  { keys: ["cote d'ivoire", "côte d'ivoire", "cote divoire", "ivory coast", "cote-d'ivoire"], coords: [-5.5471, 7.5399] },
  { keys: ["mali"], coords: [-3.9962, 17.5707] },
  { keys: ["guinee", "guinée", "guinea"], coords: [-10.9408, 10.7672] },
  { keys: ["burkina faso", "burkina"], coords: [-1.5616, 12.2383] },
  { keys: ["togo"], coords: [1.1679, 8.6195] },
  { keys: ["benin", "bénin"], coords: [2.3158, 9.3077] },
  { keys: ["niger"], coords: [9.0820, 17.6078] },
  { keys: ["congo"], coords: [15.8277, -0.2280] },
  { keys: ["rdc", "republique democratique du congo", "democratic republic of the congo", "dr congo"], coords: [21.7587, -4.0383] },
  { keys: ["gabon"], coords: [11.6094, -0.8037] },
  { keys: ["madagascar"], coords: [46.8691, -18.7669] },
  { keys: ["maroc", "morocco"], coords: [-7.0926, 31.7917] },
  { keys: ["tunisie", "tunisia"], coords: [9.5375, 33.8869] },
  { keys: ["algerie", "algérie", "algeria"], coords: [1.6596, 28.0339] },
  { keys: ["usa", "united states", "united states of america", "etats-unis", "états-unis"], coords: [-95.7129, 37.0902] },
  { keys: ["canada"], coords: [-106.3468, 56.1304] },
  { keys: ["uk", "united kingdom", "royaume-uni", "grande-bretagne"], coords: [-3.4360, 55.3781] },
  { keys: ["germany", "allemagne"], coords: [10.4515, 51.1657] },
  { keys: ["belgium", "belgique"], coords: [4.4699, 50.5039] },
  { keys: ["switzerland", "suisse"], coords: [8.2275, 46.8182] },
  { keys: ["nigeria"], coords: [8.6753, 9.0820] },
  { keys: ["ghana"], coords: [-1.0232, 7.9465] },
  { keys: ["kenya"], coords: [37.9062, -0.0236] },
  { keys: ["south africa", "afrique du sud"], coords: [22.9375, -30.5595] },
  { keys: ["spain", "espagne"], coords: [-3.7038, 40.4168] },
  { keys: ["italy", "italie"], coords: [12.5674, 41.8719] },
  { keys: ["portugal"], coords: [-8.2245, 39.3999] },
  { keys: ["netherlands", "pays-bas", "pays bas"], coords: [5.2913, 52.1326] },
  { keys: ["rwanda"], coords: [29.8739, -1.9403] },
  { keys: ["burundi"], coords: [29.9189, -3.3731] },
  { keys: ["tchad", "chad"], coords: [18.7322, 15.4542] },
  { keys: ["mauritanie", "mauritania"], coords: [-10.9408, 21.0079] },
  { keys: ["centrafrique", "central african republic", "republique centrafricaine"], coords: [20.9394, 6.6111] },
  { keys: ["haiti", "haïti"], coords: [-72.2852, 18.9712] },
  { keys: ["brazil", "bresil", "brésil"], coords: [-51.9253, -14.2350] },
  { keys: ["china", "chine"], coords: [104.1954, 35.8617] },
  { keys: ["india", "inde"], coords: [78.9629, 20.5937] },
  { keys: ["japan", "japon"], coords: [138.2529, 36.2048] },
  { keys: ["australia", "australie"], coords: [133.7751, -25.2744] },
  { keys: ["ethiopia", "ethiopie", "éthiopie"], coords: [40.4897, 9.1450] },
  { keys: ["tanzania", "tanzanie"], coords: [34.8888, -6.3690] },
  { keys: ["mozambique"], coords: [35.5296, -18.6657] },
  { keys: ["angola"], coords: [17.8739, -11.2027] },
  { keys: ["zambia", "zambie"], coords: [27.8493, -13.1339] },
  { keys: ["zimbabwe"], coords: [29.1549, -20.0004] },
  { keys: ["uganda", "ouganda"], coords: [32.2903, 1.3733] },
  { keys: ["ghana"], coords: [-1.0232, 7.9465] },
  { keys: ["liberia"], coords: [-9.4295, 6.4281] },
  { keys: ["sierra leone"], coords: [-11.7799, 8.4606] },
  { keys: ["guinea-bissau", "guinee-bissau", "guinée-bissau"], coords: [-15.1804, 11.8037] },
  { keys: ["equatorial guinea", "guinee equatoriale"], coords: [10.2679, 1.6508] },
  { keys: ["cape verde", "cap vert"], coords: [-24.0132, 16.5388] },
  { keys: ["comoros", "comores"], coords: [43.8722, -11.8751] },
  { keys: ["djibouti"], coords: [42.5903, 11.8251] },
  { keys: ["eritrea", "erythree"], coords: [39.7823, 15.1794] },
  { keys: ["somalia", "somalie"], coords: [46.1996, 5.1521] },
  { keys: ["sudan", "soudan"], coords: [30.2176, 12.8628] },
  { keys: ["egypt", "egypte", "égypte"], coords: [30.8025, 26.8206] },
  { keys: ["libya", "libye"], coords: [17.2283, 26.3351] },
  { keys: ["namibia", "namibie"], coords: [18.4904, -22.9576] },
  { keys: ["botswana"], coords: [24.6849, -22.3285] },
  { keys: ["lesotho"], coords: [28.2336, -29.6100] },
  { keys: ["swaziland", "eswatini"], coords: [31.4659, -26.5225] },
  { keys: ["malawi"], coords: [34.3015, -13.2543] },
  { keys: ["singapore", "singapour"], coords: [103.8198, 1.3521] },
  { keys: ["malaysia", "malaisie"], coords: [109.6978, 4.2105] },
  { keys: ["indonesia", "indonesie", "indonésie"], coords: [113.9213, -0.7893] },
  { keys: ["philippines"], coords: [121.7740, 12.8797] },
  { keys: ["vietnam", "viet nam"], coords: [108.2772, 14.0583] },
  { keys: ["thailand", "thailande", "thaïlande"], coords: [100.9925, 15.8700] },
  { keys: ["south korea", "coree du sud"], coords: [127.7669, 35.9078] },
  { keys: ["pakistan"], coords: [69.3451, 30.3753] },
  { keys: ["bangladesh"], coords: [90.3563, 23.6850] },
  { keys: ["sri lanka"], coords: [80.7718, 7.8731] },
  { keys: ["mexico", "mexique"], coords: [-102.5528, 23.6345] },
  { keys: ["argentina", "argentine"], coords: [-63.6167, -38.4161] },
  { keys: ["colombia", "colombie"], coords: [-74.2973, 4.5709] },
  { keys: ["peru", "perou", "pérou"], coords: [-75.0152, -9.1900] },
  { keys: ["chile", "chili"], coords: [-71.5430, -35.6751] },
  { keys: ["venezuela"], coords: [-66.5897, 6.4238] },
  { keys: ["ecuador", "equateur"], coords: [-78.1834, -1.8312] },
  { keys: ["russia", "russie"], coords: [105.3188, 61.5240] },
  { keys: ["ukraine"], coords: [31.1656, 48.3794] },
  { keys: ["poland", "pologne"], coords: [19.1451, 51.9194] },
  { keys: ["sweden", "suede", "suède"], coords: [18.6435, 60.1282] },
  { keys: ["norway", "norvege", "norvège"], coords: [8.4689, 60.4720] },
  { keys: ["denmark", "danemark"], coords: [9.5018, 56.2639] },
  { keys: ["finland", "finlande"], coords: [25.7482, 61.9241] },
  { keys: ["austria", "autriche"], coords: [14.5501, 47.5162] },
  { keys: ["greece", "grece", "grèce"], coords: [21.8243, 39.0742] },
  { keys: ["turkey", "turquie"], coords: [35.2433, 38.9637] },
  { keys: ["israel"], coords: [34.8516, 31.0461] },
  { keys: ["saudi arabia", "arabie saoudite"], coords: [45.0792, 23.8859] },
  { keys: ["uae", "united arab emirates", "emirats arabes unis"], coords: [53.8478, 23.4241] },
  { keys: ["qatar"], coords: [51.1839, 25.3548] },
  { keys: ["kuwait", "koweit"], coords: [47.4818, 29.3117] },
  { keys: ["iraq"], coords: [43.6793, 33.2232] },
  { keys: ["iran"], coords: [53.6880, 32.4279] },
];

// Normalize a string for fuzzy matching: lowercase, remove accents, trim
function normalizeCountry(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[''`]/g, "'")
    .trim();
}

// Build a lookup map: normalized key → coordinates
const COUNTRY_COORD_MAP = new Map<string, [number, number]>();
for (const entry of COUNTRY_COORDINATES_RAW) {
  for (const key of entry.keys) {
    COUNTRY_COORD_MAP.set(normalizeCountry(key), entry.coords);
  }
}

function getCountryCoords(country: string): [number, number] | null {
  const norm = normalizeCountry(country);
  return COUNTRY_COORD_MAP.get(norm) ?? null;
}

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}j`;
}

function getPageLabel(page: string): string {
  const labels: Record<string, string> = {
    "/": "Accueil",
    "/dashboard": "Dashboard",
    "/wallet": "Portefeuille",
    "/cards": "Cartes",
    "/send": "Envoi",
    "/deposit": "Depot",
    "/withdraw": "Retrait",
    "/exchange": "Echange",
    "/chat": "Chat",
    "/profile": "Profil",
    "/settings": "Parametres",
    "/airtime": "Recharge",
    "/notifications": "Notifications",
    "/staking": "Staking",
  };
  return labels[page] || page;
}

function getPageColor(page: string): string {
  const colors: Record<string, string> = {
    "/dashboard": "bg-blue-500/10 text-blue-400",
    "/wallet": "bg-emerald-500/10 text-emerald-400",
    "/send": "bg-violet-500/10 text-violet-400",
    "/deposit": "bg-green-500/10 text-green-400",
    "/withdraw": "bg-orange-500/10 text-orange-400",
    "/exchange": "bg-cyan-500/10 text-cyan-400",
    "/profile": "bg-pink-500/10 text-pink-400",
    "/settings": "bg-slate-500/10 text-slate-400",
    "/airtime": "bg-amber-500/10 text-amber-400",
    "/staking": "bg-indigo-500/10 text-indigo-400",
  };
  return colors[page] || "bg-slate-500/10 text-slate-400";
}

function getDeviceIcon(device: string | null) {
  switch (device?.toLowerCase()) {
    case "mobile":
      return Smartphone;
    case "tablet":
      return Tablet;
    default:
      return Laptop;
  }
}

// --- COMPONENTS ---

function KpiCard({ label, value, sub, trend, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; trend?: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full ${trend > 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {trend > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-white tracking-tight">{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</p>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mt-1">{label}</p>
        {sub && <p className="text-[9px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[10px] font-black text-blue-500 uppercase tracking-[3px] mb-4">{children}</h2>
  );
}

const ROLE_COLORS: Record<string, string> = { USER: "#3b82f6", AGENT: "#10b981", MERCHANT: "#f59e0b", ADMIN: "#ef4444" };
const KYC_COLORS: Record<string, string> = { NONE: "#475569", PENDING: "#f59e0b", VERIFIED: "#10b981", APPROVED: "#3b82f6", REJECTED: "#ef4444" };

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-3 shadow-2xl">
      <p className="text-[10px] font-bold text-slate-400 mb-2">{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-[10px]">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-400">{entry.name}:</span>
          <span className="text-white font-bold">{entry.value.toLocaleString("fr-FR")}</span>
        </div>
      ))}
    </div>
  );
}

function CustomPieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { fill: string } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-3 shadow-2xl">
      <div className="flex items-center gap-2 text-[10px]">
        <div className="w-2 h-2 rounded-full" style={{ background: d.payload.fill }} />
        <span className="text-slate-400">{d.name}:</span>
        <span className="text-white font-bold">{d.value.toLocaleString("fr-FR")}</span>
      </div>
    </div>
  );
}

// --- PAGE ---
export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [chartTab, setChartTab] = useState<"users" | "transactions" | "volume">("users");
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineUsersGeo, setOnlineUsersGeo] = useState<OnlineUserGeo[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<CountryData | null>(null);
  const [mapView, setMapView] = useState<"world" | "africa">("africa");
  
  // User session panel state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userSession, setUserSession] = useState<UserSessionData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [selectedMapUser, setSelectedMapUser] = useState<OnlineUserGeo | null>(null);
  const [showPageDetail, setShowPageDetail] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(false);
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) throw new Error("Erreur API");
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
      toast.error("Impossible de charger les analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAnalytics(); }, []);

  // Fetch user session details
  const fetchUserSession = useCallback(async (userId: string) => {
    try {
      setSessionLoading(true);
      const res = await fetch(`/api/admin/user-session/${userId}`);
      if (!res.ok) throw new Error("Erreur API");
      const json = await res.json();
      setUserSession(json);
    } catch {
      toast.error("Impossible de charger la session utilisateur");
      setUserSession(null);
    } finally {
      setSessionLoading(false);
    }
  }, []);

  // Fetch online users
  const fetchOnlineUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/user-activity?limit=1&page=1");
      if (res.ok) {
        const json = await res.json();
        setOnlineUsers(json.onlineUsers || []);
      }
    } catch {
      // silent fail for polling
    }
  }, []);

  // Fetch online users with geo data
  const fetchOnlineUsersGeo = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/online-users-geo");
      if (res.ok) {
        const json = await res.json();
        setOnlineUsersGeo(json.onlineUsers || []);
      }
    } catch {
      // silent fail for polling
    }
  }, []);

  // Initial fetch + polling every 15 seconds
  useEffect(() => {
    fetchOnlineUsers();
    fetchOnlineUsersGeo();
    const interval = setInterval(() => {
      fetchOnlineUsers();
      fetchOnlineUsersGeo();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchOnlineUsers, fetchOnlineUsersGeo]);

  // Auto-refresh user session every 5 seconds when enabled
  useEffect(() => {
    if (!autoRefresh || !selectedUserId) return;
    
    const interval = setInterval(() => {
      fetchUserSession(selectedUserId);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, selectedUserId, fetchUserSession]);

  // Fetch session when user is selected
  useEffect(() => {
    if (selectedUserId) {
      fetchUserSession(selectedUserId);
    }
  }, [selectedUserId, fetchUserSession]);

  // Pie chart data
  const rolePieData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.roles).filter(([, v]) => v > 0).map(([name, value]) => ({
      name, value, fill: ROLE_COLORS[name] || "#64748b",
    }));
  }, [data]);

  const kycPieData = useMemo(() => {
    if (!data) return [];
    return Object.entries(data.kyc).filter(([, v]) => v > 0).map(([name, value]) => ({
      name, value, fill: KYC_COLORS[name] || "#64748b",
    }));
  }, [data]);

  // Country markers for map
  const countryMarkers = useMemo(() => {
    if (!data?.topCountries) return [];
    return data.topCountries
      .map(c => {
        const coords = getCountryCoords(c.country);
        if (!coords) return null;
        return { ...c, coordinates: coords };
      })
      .filter(Boolean) as Array<CountryData & { coordinates: [number, number] }>;
  }, [data]);

  // Calculate total users by country
  const totalCountryUsers = useMemo(() => {
    return data?.topCountries?.reduce((sum, c) => sum + c.count, 0) || 0;
  }, [data]);

  // Map center based on view
  const mapCenter = mapView === "africa" ? [10, 5] : [0, 20];
  const mapZoom = mapView === "africa" ? 2.5 : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-blue-500/50 text-[10px] font-black uppercase tracking-[5px]">Chargement Analytics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6">
        <div className="bg-slate-900/60 border border-red-500/20 rounded-[1.5rem] p-8 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <BarChart3 size={24} className="text-red-400" />
          </div>
          <h2 className="text-sm font-black text-white uppercase tracking-wider mb-2">Erreur de chargement</h2>
          <p className="text-[10px] text-slate-500 mb-6">Impossible de charger les analytics. Veuillez reessayer.</p>
          <button
            onClick={fetchAnalytics}
            className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
          >
            <RefreshCw size={14} />
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  const { kpis, chartData, topCountries, recentSignups } = data;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32" translate="no">

      {/* SIDEMENU */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="absolute right-0 top-0 h-full w-4/5 max-w-xs bg-slate-900 border-l border-white/10 p-8 shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-black text-white">ADMIN<span className="text-blue-500">MENU</span></h2>
              <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-white/5 rounded-full text-white"><X size={20}/></button>
            </div>
            <div className="space-y-3">
              <Button onClick={() => { setIsMenuOpen(false); router.push("/admin/dashboard"); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><LayoutGrid size={18}/> Dashboard</Button>
              <Button onClick={() => { setIsMenuOpen(false); router.push("/admin/messages"); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><Activity size={18}/> Messages</Button>
              <Button onClick={() => { setIsMenuOpen(false); router.push("/admin/analytics"); }} className="w-full justify-start gap-4 h-14 bg-blue-600/20 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase text-blue-400"><BarChart3 size={18}/> Analytics</Button>
              <Button onClick={() => { setIsMenuOpen(false); router.push("/admin/settings"); }} className="w-full justify-start gap-4 h-14 bg-white/5 rounded-2xl text-[10px] font-black uppercase"><Settings size={18}/> Parametres</Button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button onClick={() => router.push("/admin/dashboard")} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">Analytics</h1>
          </div>
          <button onClick={fetchAnalytics} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-8">

        {/* KPIs */}
        <div>
          <SectionTitle>Indicateurs Cles</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon={Users} label="Total Utilisateurs" value={kpis.totalUsers}
              sub={`+${kpis.newUsersToday} aujourd'hui`}
              color="bg-blue-500/10 text-blue-400"
            />
            <KpiCard
              icon={UserPlus} label="Nouveaux (7j)" value={kpis.newUsersWeek}
              trend={kpis.userGrowth}
              color="bg-emerald-500/10 text-emerald-400"
            />
            <KpiCard
              icon={Activity} label="Total Transactions" value={kpis.totalTransactions}
              sub={`+${kpis.transactionsToday} aujourd'hui`}
              color="bg-violet-500/10 text-violet-400"
            />
            <KpiCard
              icon={TrendingUp} label="Transactions (7j)" value={kpis.transactionsWeek}
              trend={kpis.txGrowth}
              color="bg-amber-500/10 text-amber-400"
            />
          </div>
          {/* Status row */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-lg font-black text-emerald-400">{kpis.activeUsers.toLocaleString("fr-FR")}</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[2px] mt-1">Actifs</p>
            </div>
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-lg font-black text-red-400">{kpis.bannedUsers.toLocaleString("fr-FR")}</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[2px] mt-1">Bannis</p>
            </div>
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 text-center">
              <p className="text-lg font-black text-orange-400">{kpis.suspendedUsers.toLocaleString("fr-FR")}</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-[2px] mt-1">Suspendus</p>
            </div>
          </div>
        </div>

        {/* WORLD MAP - Interactive */}
        <div>
          <SectionTitle>Repartition Geographique</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] overflow-hidden">
            {/* Map view toggle */}
            <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-blue-400" />
                <span className="text-[10px] font-black text-white uppercase tracking-wider">
                  {topCountries.length} Pays
                </span>
                <span className="text-[9px] text-slate-500">
                  ({totalCountryUsers.toLocaleString("fr-FR")} utilisateurs)
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setMapView("africa")}
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                    mapView === "africa"
                      ? "bg-blue-600 text-white"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  Afrique
                </button>
                <button
                  onClick={() => setMapView("world")}
                  className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${
                    mapView === "world"
                      ? "bg-blue-600 text-white"
                      : "bg-white/5 text-slate-400 hover:text-white"
                  }`}
                >
                  Monde
                </button>
              </div>
            </div>
            
            {/* Map */}
            <div className="h-64 bg-slate-950/50">
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  scale: mapView === "africa" ? 350 : 120,
                  center: mapView === "africa" ? [15, 5] : [0, 20],
                }}
                style={{ width: "100%", height: "100%" }}
              >
                <Geographies geography={geoUrl}>
                  {({ geographies }) =>
                    geographies.map((geo) => (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill="#1e293b"
                        stroke="#334155"
                        strokeWidth={0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { fill: "#334155", outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    ))
                  }
                </Geographies>
                {countryMarkers.map((marker) => (
                  <Marker
                    key={marker.country}
                    coordinates={marker.coordinates}
                    onClick={() => setSelectedCountry(marker)}
                  >
                    <circle
                      r={Math.min(Math.max(marker.count / 5, 4), 15)}
                      fill="#3b82f6"
                      fillOpacity={0.7}
                      stroke="#60a5fa"
                      strokeWidth={1.5}
                      className="cursor-pointer hover:fill-opacity-100 transition-all"
                    />
                    <circle
                      r={Math.min(Math.max(marker.count / 5, 4), 15)}
                      fill="transparent"
                      className="animate-ping"
                      style={{ animationDuration: "3s" }}
                    />
                  </Marker>
                ))}
                {/* Online user markers with device icons */}
                {onlineUsersGeo.filter(u => u.latitude && u.longitude).map((user) => {
                  const DeviceIcon = getDeviceIcon(user.device);
                  return (
                    <Marker
                      key={`online-${user.userId}`}
                      coordinates={[user.longitude!, user.latitude!]}
                      onClick={() => {
                        setSelectedMapUser(user);
                        setSelectedUserId(user.userId);
                      }}
                    >
                      <g className="cursor-pointer">
                        {/* Pulse animation */}
                        <circle
                          r={12}
                          fill="#10b981"
                          fillOpacity={0.2}
                          className="animate-ping"
                          style={{ animationDuration: "2s" }}
                        />
                        {/* Device icon background */}
                        <circle
                          r={10}
                          fill={selectedMapUser?.userId === user.userId ? "#10b981" : "#1e293b"}
                          stroke="#10b981"
                          strokeWidth={2}
                        />
                        {/* Device icon using foreignObject */}
                        <foreignObject x={-6} y={-6} width={12} height={12}>
                          <div className="flex items-center justify-center w-full h-full">
                            <DeviceIcon size={8} className="text-emerald-400" />
                          </div>
                        </foreignObject>
                      </g>
                    </Marker>
                  );
                })}
              </ComposableMap>
            </div>

            {/* Selected country detail */}
            {selectedCountry && (
              <div className="p-4 bg-blue-500/5 border-t border-blue-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <MapPin size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{selectedCountry.country}</p>
                      <p className="text-[9px] text-slate-500">
                        {selectedCountry.count.toLocaleString("fr-FR")} utilisateurs
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCountry(null)}
                    className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="text-center p-2 bg-white/[0.02] rounded-xl">
                    <p className="text-sm font-black text-blue-400">{selectedCountry.count}</p>
                    <p className="text-[8px] text-slate-500 uppercase">Total</p>
                  </div>
                  <div className="text-center p-2 bg-white/[0.02] rounded-xl">
                    <p className="text-sm font-black text-emerald-400">{selectedCountry.activeCount}</p>
                    <p className="text-[8px] text-slate-500 uppercase">Actifs</p>
                  </div>
                  <div className="text-center p-2 bg-white/[0.02] rounded-xl">
                    <p className="text-sm font-black text-amber-400">{selectedCountry.newCount}</p>
                    <p className="text-[8px] text-slate-500 uppercase">Nouveaux</p>
                  </div>
                </div>
              </div>
            )}

            {/* Selected online user from map */}
            {selectedMapUser && (
              <div className="p-4 bg-emerald-500/5 border-t border-emerald-500/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-sm">
                        {selectedMapUser.userName.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{selectedMapUser.userName}</p>
                      <p className="text-[9px] text-slate-500">{selectedMapUser.userEmail}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMapUser(null);
                      setSelectedUserId(null);
                      setUserSession(null);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                </div>
                
                {/* Location & Device Info */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin size={10} className="text-emerald-400" />
                      <span className="text-[8px] font-black text-slate-500 uppercase">Localisation</span>
                    </div>
                    <p className="text-[10px] font-bold text-white flex items-center gap-1">
                      {selectedMapUser.countryFlag && <span>{selectedMapUser.countryFlag}</span>}
                      {selectedMapUser.country || "Inconnu"}
                    </p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Wifi size={10} className="text-blue-400" />
                      <span className="text-[8px] font-black text-slate-500 uppercase">IP</span>
                    </div>
                    <p className="text-[10px] font-bold text-white font-mono">{selectedMapUser.ip || "N/A"}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-black/20 rounded-lg p-2 text-center">
                    {(() => {
                      const DeviceIcon = getDeviceIcon(selectedMapUser.device);
                      return <DeviceIcon size={14} className="text-violet-400 mx-auto mb-1" />;
                    })()}
                    <p className="text-[8px] font-bold text-slate-500">{selectedMapUser.device || "N/A"}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 text-center">
                    <Globe size={14} className="text-cyan-400 mx-auto mb-1" />
                    <p className="text-[8px] font-bold text-slate-500">{selectedMapUser.browser || "N/A"}</p>
                  </div>
                  <div className="bg-black/20 rounded-lg p-2 text-center">
                    <Monitor size={14} className="text-amber-400 mx-auto mb-1" />
                    <p className="text-[8px] font-bold text-slate-500">{selectedMapUser.os || "N/A"}</p>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center justify-between p-2 bg-emerald-500/10 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Eye size={12} className="text-emerald-400" />
                    <span className="text-[9px] font-bold text-emerald-400">Page actuelle:</span>
                  </div>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded ${getPageColor(selectedMapUser.currentPage)}`}>
                    {getPageLabel(selectedMapUser.currentPage)}
                  </span>
                </div>
              </div>
            )}

            {/* Country list */}
            <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
              {topCountries.map((c, i) => (
                <button
                  key={c.country}
                  onClick={() => setSelectedCountry(c)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                    selectedCountry?.country === c.country
                      ? "bg-blue-500/20 border border-blue-500/30"
                      : "bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="text-[10px] font-black text-slate-500 w-5">{i + 1}</span>
                  <MapPin size={14} className={getCountryCoords(c.country) ? "text-blue-400" : "text-slate-600"} />
                  <span className="text-[11px] font-bold text-white flex-1 text-left truncate">{c.country}</span>
                  <div className="flex items-center gap-3 text-right">
                    <div>
                      <p className="text-[10px] font-black text-blue-400">{c.count}</p>
                      <p className="text-[7px] text-slate-600 uppercase">Total</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-400">{c.activeCount}</p>
                      <p className="text-[7px] text-slate-600 uppercase">Actifs</p>
                    </div>
                    {c.newCount > 0 && (
                      <div className="px-1.5 py-0.5 bg-amber-500/10 rounded">
                        <p className="text-[8px] font-black text-amber-400">+{c.newCount}</p>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ONLINE USERS - Real-time */}
        <div>
          <SectionTitle>
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Utilisateurs en Ligne ({onlineUsersGeo.length})
            </span>
          </SectionTitle>

          {onlineUsersGeo.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
              {onlineUsersGeo.map((user) => {
                const DeviceIcon = getDeviceIcon(user.device);
                return (
                  <button
                    key={user.userId}
                    onClick={() => {
                      setSelectedUserId(user.userId);
                      setSelectedMapUser(user);
                    }}
                    className={`flex-shrink-0 bg-slate-900/60 border rounded-[1.5rem] p-4 min-w-[170px] text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                      selectedUserId === user.userId 
                        ? "border-emerald-500/50 ring-2 ring-emerald-500/20" 
                        : "border-emerald-500/10 hover:border-emerald-500/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-black text-[10px]">
                          {user.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#020617]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-white truncate">{user.userName}</p>
                        <p className="text-[8px] text-slate-500 truncate">{user.userEmail}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {user.countryFlag && <span className="text-xs">{user.countryFlag}</span>}
                      <span className="text-[8px] text-slate-500 truncate">{user.country || "Inconnu"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye size={10} className="text-emerald-400" />
                      <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider truncate">
                        {getPageLabel(user.currentPage)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <DeviceIcon size={9} className="text-slate-500" />
                      <span className="text-[8px] text-slate-600">{user.device || "Inconnu"}</span>
                      <Clock size={9} className="text-slate-500 ml-auto" />
                      <span className="text-[8px] text-slate-600">{formatTimeAgo(user.lastSeen)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                <Users size={20} className="text-slate-600" />
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aucun utilisateur en ligne</p>
              <p className="text-[8px] text-slate-600 mt-1">Les utilisateurs actifs apparaitront ici en temps reel</p>
            </div>
          )}

          {/* USER SESSION PANEL */}
          {selectedUserId && userSession && (
            <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl overflow-hidden mt-4">
              {/* Session Panel Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/5 bg-emerald-500/5">
                <div className="flex items-center gap-3">
                  <Radio size={16} className={`${userSession.isOnline ? "text-emerald-400 animate-pulse" : "text-slate-500"}`} />
                  <div>
                    <p className="text-[10px] font-black text-white uppercase tracking-wider">
                      Session en Temps Reel
                    </p>
                    <p className="text-[8px] text-slate-500">
                      {userSession.user.name || userSession.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
                      autoRefresh 
                        ? "bg-emerald-600 text-white" 
                        : "bg-white/5 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    <RefreshCw size={10} className={autoRefresh ? "animate-spin" : ""} />
                    Auto
                  </button>
                  <button
                    onClick={() => fetchUserSession(selectedUserId)}
                    disabled={sessionLoading}
                    className="p-2 bg-white/5 rounded-lg text-white hover:bg-white/10 transition-all"
                  >
                    <RefreshCw size={12} className={sessionLoading ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedUserId(null);
                      setUserSession(null);
                      setSelectedMapUser(null);
                      setAutoRefresh(false);
                    }}
                    className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  >
                    <XCircle size={12} />
                  </button>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Current Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Layers size={12} className="text-emerald-400" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Page Actuelle</span>
                    </div>
                    <p className={`text-[11px] font-black ${userSession.currentPage ? getPageColor(userSession.currentPage).split(" ")[1] : "text-slate-500"}`}>
                      {userSession.currentPage ? getPageLabel(userSession.currentPage) : "Hors ligne"}
                    </p>
                    {userSession.currentPage && (
                      <p className="text-[8px] text-slate-600 mt-0.5 truncate">{userSession.currentPage}</p>
                    )}
                  </div>
                  <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer size={12} className="text-blue-400" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider">Duree Session</span>
                    </div>
                    <p className="text-[11px] font-black text-white">
                      {Math.floor(userSession.totalDuration / 60)}min {userSession.totalDuration % 60}s
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                    <p className="text-[14px] font-black text-blue-400">{userSession.totalPageViews}</p>
                    <p className="text-[7px] font-bold text-slate-600 uppercase">Pages</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                    <p className="text-[14px] font-black text-amber-400">{userSession.totalClicks}</p>
                    <p className="text-[7px] font-bold text-slate-600 uppercase">Clics</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                    {(() => {
                      const DeviceIcon = getDeviceIcon(userSession.currentDevice);
                      return <DeviceIcon size={14} className="text-emerald-400 mx-auto" />;
                    })()}
                    <p className="text-[7px] font-bold text-slate-600 uppercase">{userSession.currentDevice || "N/A"}</p>
                  </div>
                  <div className="bg-black/30 rounded-xl p-2.5 text-center border border-white/5">
                    <Globe size={14} className="text-cyan-400 mx-auto" />
                    <p className="text-[7px] font-bold text-slate-600 uppercase">{userSession.currentBrowser || "N/A"}</p>
                  </div>
                </div>

                {/* Page Journey Schema */}
                {userSession.pageJourney.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                        <Layers size={12} />
                        Parcours de Navigation
                      </p>
                      <span className="text-[8px] text-slate-600">{userSession.pageJourney.length} pages</span>
                    </div>
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5 overflow-x-auto">
                      <div className="flex items-center gap-1 min-w-max">
                        {userSession.pageJourney.slice(-10).map((step, i, arr) => (
                          <div key={i} className="flex items-center gap-1">
                            <button
                              onClick={() => setShowPageDetail(showPageDetail === step.page ? null : step.page)}
                              className={`flex flex-col items-center p-2 rounded-lg transition-all hover:scale-105 ${
                                showPageDetail === step.page 
                                  ? "bg-blue-600/20 border border-blue-500/30" 
                                  : "bg-white/5 hover:bg-white/10"
                              } ${i === arr.length - 1 ? "ring-2 ring-emerald-500/30" : ""}`}
                            >
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded ${getPageColor(step.page)}`}>
                                {getPageLabel(step.page)}
                              </span>
                              {step.duration > 0 && (
                                <span className="text-[7px] text-slate-500 mt-1">{step.duration}s</span>
                              )}
                            </button>
                            {i < arr.length - 1 && (
                              <ArrowRight size={10} className="text-slate-600 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Page Detail Panel */}
                {showPageDetail && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">
                        Details: {getPageLabel(showPageDetail)}
                      </p>
                      <button
                        onClick={() => setShowPageDetail(null)}
                        className="p-1 text-slate-500 hover:text-white transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      {userSession.recentActivities
                        .filter(a => a.page === showPageDetail)
                        .slice(0, 10)
                        .map((activity) => (
                          <div 
                            key={activity.id}
                            className="flex items-center justify-between p-2 bg-black/20 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              {activity.action === "CLICK" ? (
                                <MousePointerClick size={10} className="text-amber-400" />
                              ) : (
                                <Eye size={10} className="text-blue-400" />
                              )}
                              <span className="text-[9px] font-bold text-white">{activity.action}</span>
                              {activity.duration && (
                                <span className="text-[8px] text-slate-500">({activity.duration}s)</span>
                              )}
                            </div>
                            <span className="text-[8px] text-slate-600">
                              {formatTimeAgo(activity.createdAt)}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Recent Activities */}
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                    Activites Recentes
                  </p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {userSession.recentActivities.slice(0, 10).map((activity) => (
                      <div 
                        key={activity.id}
                        className="flex items-center justify-between p-2 bg-black/20 rounded-lg hover:bg-black/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {activity.action === "CLICK" ? (
                            <MousePointerClick size={10} className="text-amber-400" />
                          ) : (
                            <Eye size={10} className="text-blue-400" />
                          )}
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${getPageColor(activity.page)}`}>
                            {getPageLabel(activity.page)}
                          </span>
                          <span className="text-[9px] text-slate-400">{activity.action}</span>
                        </div>
                        <span className="text-[8px] text-slate-600">{formatTimeAgo(activity.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading state for session */}
          {selectedUserId && sessionLoading && !userSession && (
            <div className="bg-slate-900/80 border border-emerald-500/20 rounded-2xl p-8 text-center mt-4">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
              <p className="text-[9px] text-slate-500 uppercase tracking-widest">Chargement de la session...</p>
            </div>
          )}
        </div>

        {/* PERFORMANCE METRICS */}
        <div>
          <SectionTitle>Metriques de Performance</SectionTitle>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center mb-3">
                <Zap size={16} className="text-violet-400" />
              </div>
              <p className="text-lg font-black text-white">
                {kpis.transactionsWeek > 0 ? Math.round(kpis.transactionsWeek / 7) : 0}
              </p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mt-1">TX/Jour</p>
            </div>
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-3">
                <Target size={16} className="text-cyan-400" />
              </div>
              <p className="text-lg font-black text-white">
                {kpis.totalUsers > 0 ? Math.round((kpis.activeUsers / kpis.totalUsers) * 100) : 0}%
              </p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mt-1">Taux Actif</p>
            </div>
            <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4">
              <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center mb-3">
                <Globe size={16} className="text-pink-400" />
              </div>
              <p className="text-lg font-black text-white">{topCountries.length}</p>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider mt-1">Pays</p>
            </div>
          </div>
        </div>

        {/* CHART - 30 Days */}
        <div>
          <SectionTitle>Tendance 30 Jours</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            {/* Chart tabs */}
            <div className="flex gap-2 mb-5">
              {([
                { key: "users", label: "Utilisateurs" },
                { key: "transactions", label: "Transactions" },
                { key: "volume", label: "Volume" },
              ] as const).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setChartTab(t.key)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                    chartTab === t.key
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                      : "bg-white/5 text-slate-500 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="label" tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                  <YAxis tick={{ fill: "#475569", fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                  <Tooltip content={<CustomTooltip />} />
                  {chartTab === "users" && (
                    <Area type="monotone" dataKey="newUsers" name="Nouveaux" stroke="#3b82f6" strokeWidth={2} fill="url(#gradBlue)" />
                  )}
                  {chartTab === "transactions" && (
                    <Area type="monotone" dataKey="transactions" name="Transactions" stroke="#10b981" strokeWidth={2} fill="url(#gradGreen)" />
                  )}
                  {chartTab === "volume" && (
                    <Area type="monotone" dataKey="volume" name="Volume" stroke="#f59e0b" strokeWidth={2} fill="url(#gradAmber)" />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* DISTRIBUTION: Roles + KYC */}
        <div className="grid grid-cols-2 gap-4">
          {/* Roles Pie */}
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mb-3">Roles</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rolePieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
                    {rolePieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {rolePieData.map((r) => (
                <div key={r.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: r.fill }} />
                  <span className="text-[8px] font-bold text-slate-500 uppercase">{r.name}</span>
                  <span className="text-[8px] font-bold text-white">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* KYC Pie */}
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] mb-3">KYC</p>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kycPieData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value" stroke="none">
                    {kycPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {kycPieData.map((k) => (
                <div key={k.name} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: k.fill }} />
                  <span className="text-[8px] font-bold text-slate-500 uppercase">{k.name}</span>
                  <span className="text-[8px] font-bold text-white">{k.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* GOOGLE ANALYTICS EMBED */}
        <div>
          <SectionTitle>Google Analytics</SectionTitle>
          <div className="bg-slate-900/60 border border-white/[0.06] rounded-[1.5rem] p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <BarChart3 size={18} className="text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-black text-white uppercase">G-W8HP6W3DM4</p>
                <p className="text-[9px] text-slate-500">Property ID active</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Google Analytics est actif sur toutes les pages de PimPay. Pour voir les rapports complets en temps reel (audience, acquisition, comportement, conversions), accedez directement au tableau de bord Google Analytics.
            </p>
            <a
              href="https://analytics.google.com/analytics/web/#/p/G-W8HP6W3DM4"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
            >
              <Globe size={16} />
              Ouvrir Google Analytics
            </a>
          </div>
        </div>

        {/* RECENT SIGNUPS */}
        <div>
          <SectionTitle>Derniers Inscrits</SectionTitle>
          <div className="space-y-2">
            {recentSignups.map((u) => (
              <div key={u.id} className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Users size={16} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">{u.name || u.username || "Sans nom"}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] text-slate-500 truncate">{u.email || "Pas d'email"}</p>
                    {u.country && (
                      <span className="text-[8px] text-blue-400 flex items-center gap-1">
                        <MapPin size={8} />
                        {u.country}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${
                    u.role === "ADMIN" ? "bg-red-500/10 text-red-400" :
                    u.role === "MERCHANT" ? "bg-amber-500/10 text-amber-400" :
                    u.role === "AGENT" ? "bg-emerald-500/10 text-emerald-400" :
                    "bg-blue-500/10 text-blue-400"
                  }`}>
                    {u.role}
                  </span>
                  <p className="text-[8px] text-slate-600 mt-1">
                    {new Date(u.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
