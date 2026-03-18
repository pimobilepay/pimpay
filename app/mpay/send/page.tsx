"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Search, Send, Users, Delete,
  Loader2, ShieldCheck, Fingerprint, Zap,
  MessageSquare, CheckCircle2, ChevronRight,
  User, X, UserPlus, Clock, Trash2
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

// Type for contacts from API
interface P2PContact {
  id: string;
  contactId: string;
  name: string;
  username: string | null;
  phone: string | null;
  avatar: string | null;
  initials: string;
  nickname: string | null;
  isFavorite: boolean;
  lastTransaction: string | null;
  transactionCount: number;
}

// Type for searched user from API
interface SearchedUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  avatar: string | null;
  kycStatus: string;
  sidraAddress?: string | null;
  usdtAddress?: string | null;
  walletAddress?: string | null;
  isExternal: boolean;
}

// Type for recent users stored locally
interface RecentUser {
  id: string;
  name: string;
  username: string | null;
  avatar: string | null;
  initials: string;
  lastUsed: number;
}

// Helper to get initials
const getInitials = (name: string): string => {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// Local storage key for recent users
const RECENT_USERS_KEY = "pimpay_recent_p2p_users";

export default function P2PSendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedTo = searchParams.get("to") || "";

  const [step, setStep] = useState(1); // 1: select contact, 2: amount, 3: message, 4: confirm
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<P2PContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<P2PContact | null>(null);
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  // New states for search and recent users
  const [searchedUser, setSearchedUser] = useState<SearchedUser | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [addingToContacts, setAddingToContacts] = useState(false);

  // Load recent users from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_USERS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentUsers(parsed.slice(0, 5)); // Keep only last 5
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  // Save recent user to localStorage
  const saveRecentUser = useCallback((user: RecentUser) => {
    try {
      const stored = localStorage.getItem(RECENT_USERS_KEY);
      let recent: RecentUser[] = stored ? JSON.parse(stored) : [];
      
      // Remove if already exists
      recent = recent.filter(r => r.id !== user.id);
      
      // Add to beginning
      recent.unshift({ ...user, lastUsed: Date.now() });
      
      // Keep only last 5
      recent = recent.slice(0, 5);
      
      localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(recent));
      setRecentUsers(recent);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Remove recent user
  const removeRecentUser = useCallback((userId: string) => {
    try {
      const stored = localStorage.getItem(RECENT_USERS_KEY);
      let recent: RecentUser[] = stored ? JSON.parse(stored) : [];
      recent = recent.filter(r => r.id !== userId);
      localStorage.setItem(RECENT_USERS_KEY, JSON.stringify(recent));
      setRecentUsers(recent);
      toast.success("Utilisateur supprime des recents");
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Search user via API
  const searchUser = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchedUser(null);
      setSearchError("");
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setSearchedUser(null);

    try {
      const res = await fetch(`/api/user/search?query=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (res.ok && data.id) {
        setSearchedUser(data);
      } else if (res.status === 404) {
        setSearchError("Utilisateur non trouve");
      } else {
        setSearchError(data.error || "Erreur de recherche");
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Erreur de connexion");
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        searchUser(searchQuery);
      } else {
        setSearchedUser(null);
        setSearchError("");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, searchUser]);

  // Add searched user to contacts
  const addToContacts = async (user: SearchedUser) => {
    setAddingToContacts(true);
    try {
      const res = await fetch("/api/mpay/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: user.username || user.id,
          nickname: null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Contact ajoute avec succes");
        // Refresh contacts
        const contactsRes = await fetch("/api/mpay/contacts");
        const contactsData = await contactsRes.json();
        if (contactsData.success && contactsData.contacts) {
          setContacts(contactsData.contacts);
        }
      } else {
        toast.error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Erreur lors de l'ajout du contact");
    } finally {
      setAddingToContacts(false);
    }
  };

  // Fetch user balance
  useEffect(() => {
    fetch("/api/user/profile")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          setUserBalance(data.user.balances?.pi || 0);
        }
      })
      .catch(() => setUserBalance(0));
  }, []);

  // Fetch contacts from API
  useEffect(() => {
    const fetchContacts = async () => {
      setContactsLoading(true);
      try {
        const res = await fetch("/api/mpay/contacts");
        const data = await res.json();
        if (data.success && data.contacts) {
          setContacts(data.contacts);
          
          // If there's a preselected contact, find and select it
          if (preSelectedTo) {
            const found = data.contacts.find(
              (c: P2PContact) => 
                c.username === preSelectedTo || 
                c.username === preSelectedTo.replace("@", "") ||
                c.contactId === preSelectedTo
            );
            if (found) {
              setSelectedContact(found);
              setStep(2);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setContactsLoading(false);
      }
    };
    fetchContacts();
  }, [preSelectedTo]);

const filteredContacts = contacts.filter(
    c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.username && c.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.nickname && c.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  const handleSelectContact = (contact: P2PContact) => {
    setSelectedContact(contact);
    // Save to recent users
    saveRecentUser({
      id: contact.contactId,
      name: contact.name,
      username: contact.username,
      avatar: contact.avatar,
      initials: contact.initials,
      lastUsed: Date.now(),
    });
    setStep(2);
  };

  // Select searched user
  const handleSelectSearchedUser = (user: SearchedUser) => {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const contact: P2PContact = {
      id: user.id,
      contactId: user.id,
      name: fullName || user.username || "Utilisateur",
      username: user.username,
      phone: null,
      avatar: user.avatar,
      initials: getInitials(fullName || user.username || "U"),
      nickname: null,
      isFavorite: false,
      lastTransaction: null,
      transactionCount: 0,
    };
    setSelectedContact(contact);
    // Save to recent users
    saveRecentUser({
      id: user.id,
      name: fullName || user.username || "Utilisateur",
      username: user.username,
      avatar: user.avatar,
      initials: getInitials(fullName || user.username || "U"),
      lastUsed: Date.now(),
    });
    setStep(2);
  };

  // Select recent user
  const handleSelectRecentUser = (recent: RecentUser) => {
    const contact: P2PContact = {
      id: recent.id,
      contactId: recent.id,
      name: recent.name,
      username: recent.username,
      phone: null,
      avatar: recent.avatar,
      initials: recent.initials,
      nickname: null,
      isFavorite: false,
      lastTransaction: null,
      transactionCount: 0,
    };
    setSelectedContact(contact);
    // Update last used
    saveRecentUser(recent);
    setStep(2);
  };

  const handleKeyPress = (val: string) => {
    if (val === "delete") {
      setAmount(prev => prev.slice(0, -1));
    } else if (val === ".") {
      if (!amount.includes(".")) setAmount(prev => prev + val);
    } else {
      if (amount.length < 8) setAmount(prev => prev + val);
    }
  };

  const handleAmountNext = () => {
    if (!amount || parseFloat(amount) <= 0) {
      return toast.error("Veuillez entrer un montant valide");
    }
    if (parseFloat(amount) > userBalance) {
      return toast.error("Solde insuffisant");
    }
    setStep(3);
  };

  const handleConfirmSend = async () => {
    if (!selectedContact) return;
    
    setIsLoading(true);
    try {
      // Use the real transaction API
      const res = await fetch("/api/transaction/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: selectedContact.contactId,
          amount: parseFloat(amount),
          description: message || `Transfert P2P a ${selectedContact.name}`
        }),
      });
      
      const data = await res.json();
      
      if (data.success || data.data) {
        const txRef = data.data?.reference || `P2P-${Date.now()}`;
        toast.success("Transfert envoye avec succes !");
        router.push(`/mpay/success?amount=${amount}&to=${selectedContact.name || "Contact"}&txid=${txRef}`);
      } else {
        toast.error(data.error || "Erreur lors du transfert");
        router.push(`/mpay/failed?reason=${encodeURIComponent(data.error || "Erreur inconnue")}`);
      }
    } catch (error: any) {
      console.error("Transfer error:", error);
      toast.error("Erreur lors du transfert");
      router.push(`/mpay/failed?reason=${encodeURIComponent("Erreur de connexion")}`);
    } finally {
      setIsLoading(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button onClick={goBack} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">Envoyer P2P</h1>
          <p className="text-[9px] font-bold text-cyan-500 tracking-[3px] uppercase">
            {"Etape " + step + " / 4"}
          </p>
        </div>
        <button
          onClick={() => router.push("/mpay")}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <X size={20} />
        </button>
      </header>

      <main className="px-6 pt-6 pb-32">
        {/* STEP 1: SELECT CONTACT */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Search bar */}
            <div className="bg-white/5 rounded-[2rem] p-2 flex items-center gap-2 border border-white/10 focus-within:border-cyan-500/50 transition-all">
              <div className="p-3 bg-white/5 rounded-xl text-slate-400">
                <Search size={18} />
              </div>
              <input
                type="text"
                placeholder="RECHERCHER PAR @USERNAME, EMAIL, TELEPHONE..."
                className="bg-transparent flex-1 outline-none font-bold text-xs uppercase placeholder:text-slate-700"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {isSearching && (
                <div className="p-2">
                  <Loader2 className="animate-spin text-cyan-500" size={16} />
                </div>
              )}
              {searchQuery && !isSearching && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSearchedUser(null);
                    setSearchError("");
                  }}
                  className="p-2 bg-white/5 rounded-xl text-slate-400 hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Search Results from API */}
            {searchedUser && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <CheckCircle2 size={12} />
                  Utilisateur trouve
                </p>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4">
                  <button
                    onClick={() => handleSelectSearchedUser(searchedUser)}
                    className="w-full flex items-center gap-4 hover:opacity-80 transition-all"
                  >
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-600/20 to-cyan-600/20 rounded-full flex items-center justify-center border border-emerald-500/20 overflow-hidden">
                      {searchedUser.avatar ? (
                        <img src={searchedUser.avatar} alt={searchedUser.firstName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm font-black text-emerald-400">
                          {getInitials(`${searchedUser.firstName} ${searchedUser.lastName}`.trim() || searchedUser.username || "U")}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-black uppercase tracking-tight">
                        {searchedUser.firstName} {searchedUser.lastName}
                      </p>
                      {searchedUser.username && (
                        <p className="text-[10px] font-bold text-cyan-500">@{searchedUser.username.replace("@", "")}</p>
                      )}
                      <p className="text-[9px] font-bold text-slate-500 mt-0.5">
                        {searchedUser.isExternal ? "Adresse externe" : "Utilisateur PimPay"}
                      </p>
                    </div>
                    <ChevronRight size={18} className="text-emerald-400" />
                  </button>
                  {/* Add to contacts button */}
                  {!searchedUser.isExternal && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToContacts(searchedUser);
                      }}
                      disabled={addingToContacts}
                      className="w-full mt-3 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-white/10 transition-all disabled:opacity-50"
                    >
                      {addingToContacts ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <UserPlus size={14} />
                      )}
                      Ajouter aux contacts
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Search Error */}
            {searchError && searchQuery.length >= 2 && (
              <div className="animate-in fade-in duration-300 py-4 px-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <p className="text-[10px] font-bold text-red-400 uppercase text-center">{searchError}</p>
              </div>
            )}

            {/* Recent Users */}
            {!searchQuery && recentUsers.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2">
                    <Clock size={12} />
                    Utilisateurs recents
                  </p>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
                  {recentUsers.map((recent) => (
                    <div key={recent.id} className="flex-shrink-0 relative group">
                      <button
                        onClick={() => handleSelectRecentUser(recent)}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-14 h-14 bg-gradient-to-br from-slate-600/20 to-slate-500/20 rounded-full flex items-center justify-center border border-slate-500/20 group-hover:border-cyan-500/30 transition-all overflow-hidden">
                          {recent.avatar ? (
                            <img src={recent.avatar} alt={recent.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-black text-slate-400">{recent.initials}</span>
                          )}
                        </div>
                        <span className="text-[8px] font-bold text-slate-500 uppercase max-w-14 truncate">{recent.name}</span>
                      </button>
                      {/* Delete recent user */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentUser(recent.id);
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                      >
                        <X size={10} className="text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contacts */}
            <div>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Users size={12} />
                {searchQuery && !searchedUser ? `${filteredContacts.length} contact(s) correspondant(s)` : "Mes contacts"}
              </p>
              {contactsLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="animate-spin text-cyan-500 mb-3" size={24} />
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Chargement des contacts...
                  </span>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users size={32} className="text-slate-700 mb-3" />
                  <p className="text-xs font-bold text-slate-500 mb-1">
                    {searchQuery ? "Aucun contact correspondant" : "Aucun contact"}
                  </p>
                  <p className="text-[10px] text-slate-600 text-center">
                    {searchQuery
                      ? "Utilisez la recherche ci-dessus pour trouver un utilisateur"
                      : "Ajoutez des contacts depuis la page contacts"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact)}
                      className="w-full flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] active:scale-[0.98] transition-all"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/20 overflow-hidden">
                        {contact.avatar ? (
                          <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm font-black text-cyan-400">{contact.initials}</span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-black uppercase tracking-tight">{contact.nickname || contact.name}</p>
                        <p className="text-[10px] font-bold text-slate-500">
                          {contact.username ? `@${contact.username.replace("@", "")}` : contact.phone || ""}
                        </p>
                      </div>
                      {contact.transactionCount > 0 && (
                        <span className="text-[9px] font-bold text-slate-600 bg-white/5 px-3 py-1 rounded-full">
                          {contact.transactionCount} tx
                        </span>
                      )}
                      <ChevronRight size={16} className="text-slate-600" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: AMOUNT */}
        {step === 2 && selectedContact && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            {/* Contact Info */}
            <div className="flex items-center gap-4 p-4 bg-cyan-600/5 border border-cyan-500/20 rounded-2xl">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/20 overflow-hidden">
                {selectedContact.avatar ? (
                  <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-black text-cyan-400">{selectedContact.initials}</span>
                )}
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-tight">{selectedContact.nickname || selectedContact.name}</p>
                <p className="text-[10px] font-bold text-cyan-500">
                  {selectedContact.username ? `@${selectedContact.username.replace("@", "")}` : selectedContact.phone || ""}
                </p>
              </div>
            </div>

            {/* Amount Display */}
            <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Montant a envoyer</p>
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-black text-cyan-500">Pi</span>
                <span className="text-5xl font-black tracking-tighter">{amount || "0"}</span>
              </div>
              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between px-4">
                <div className="text-left">
                  <p className="text-[9px] font-black text-slate-500 uppercase">Solde</p>
                  <p className="text-sm font-black text-emerald-400">{userBalance.toLocaleString()} Pi</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase">Frais</p>
                  <p className="text-sm font-black text-white">0.00 Pi</p>
                </div>
              </div>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className="h-14 rounded-2xl bg-white/5 border border-white/5 text-lg font-bold hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
                >
                  {key === "delete" ? <Delete size={20} className="text-red-500" /> : key}
                </button>
              ))}
            </div>

            <button
              onClick={handleAmountNext}
              className="w-full bg-cyan-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-cyan-600/30 active:scale-95 transition-all"
            >
              Continuer
            </button>
          </div>
        )}

        {/* STEP 3: MESSAGE (optional) */}
        {step === 3 && selectedContact && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary top */}
            <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/10 rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/20 overflow-hidden">
                  {selectedContact.avatar ? (
                    <img src={selectedContact.avatar} alt={selectedContact.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-black text-cyan-400">{selectedContact.initials}</span>
                  )}
                </div>
                <div>
                  <p className="text-xs font-black uppercase">{selectedContact.nickname || selectedContact.name}</p>
                  <p className="text-[9px] text-slate-500 font-bold">
                    {selectedContact.username ? `@${selectedContact.username.replace("@", "")}` : selectedContact.phone || ""}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black">{amount} <span className="text-cyan-500">Pi</span></p>
              </div>
            </div>

            {/* Message input */}
            <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare size={16} className="text-cyan-500" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Message (optionnel)</p>
              </div>
              <textarea
                placeholder="Ajouter un message pour le destinataire..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm font-medium outline-none resize-none h-28 placeholder:text-slate-700 focus:border-cyan-500/50 transition-all"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={200}
              />
              <p className="text-right text-[9px] font-bold text-slate-600 mt-2">{message.length}/200</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-white/5 border border-white/10 p-5 rounded-[2rem] font-black uppercase tracking-wider text-sm hover:bg-white/10 active:scale-95 transition-all"
              >
                Passer
              </button>
              <button
                onClick={() => setStep(4)}
                className="flex-1 bg-cyan-600 p-5 rounded-[2rem] font-black uppercase tracking-wider text-sm shadow-xl shadow-cyan-600/20 active:scale-95 transition-all"
              >
                Suivant
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRM */}
        {step === 4 && selectedContact && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldCheck size={120} />
              </div>

              <div className="text-center mb-2">
                <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[3px] mb-2">Transfert P2P</p>
                <p className="text-3xl font-black">{amount} <span className="text-cyan-500">Pi</span></p>
              </div>

<div className="space-y-3">
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Destinataire</span>
                  <span className="font-black text-xs text-cyan-400 uppercase">{selectedContact.nickname || selectedContact.name}</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Username</span>
                  <span className="font-black text-xs uppercase">
                    {selectedContact.username ? `@${selectedContact.username.replace("@", "")}` : selectedContact.phone || "-"}
                  </span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Frais</span>
                  <span className="font-black text-xs text-emerald-400 uppercase">0.00 Pi</span>
                </div>
                {message && (
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest block mb-2">Message</span>
                    <p className="text-xs font-medium text-slate-300">{message}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center py-4 gap-3">
                <div className="p-4 rounded-full bg-cyan-600/10 border border-cyan-500/20 text-cyan-500 animate-bounce">
                  <Fingerprint size={32} />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Confirmer le transfert</p>
              </div>
            </div>

            <button
              onClick={handleConfirmSend}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 p-6 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-cyan-600/40 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Send size={18} />}
              {isLoading ? "Envoi en cours..." : "Envoyer maintenant"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
