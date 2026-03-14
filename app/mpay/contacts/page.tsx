"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, Search, Users, Plus, Star, Trash2,
  Loader2, ChevronRight, Send, User, MoreVertical,
  UserPlus, X, Check
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

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

export default function P2PContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<P2PContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContactIdentifier, setNewContactIdentifier] = useState("");
  const [newContactNickname, setNewContactNickname] = useState("");
  const [addingContact, setAddingContact] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // Fetch contacts from API
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/mpay/contacts");
      const data = await res.json();
      if (data.success && data.contacts) {
        setContacts(data.contacts);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast.error("Erreur lors du chargement des contacts");
    } finally {
      setIsLoading(false);
    }
  };

  // Add new contact
  const handleAddContact = async () => {
    if (!newContactIdentifier.trim()) {
      return toast.error("Veuillez entrer un identifiant");
    }

    setAddingContact(true);
    try {
      const res = await fetch("/api/mpay/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: newContactIdentifier.trim(),
          nickname: newContactNickname.trim() || null,
        }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success("Contact ajoute avec succes");
        setShowAddModal(false);
        setNewContactIdentifier("");
        setNewContactNickname("");
        fetchContacts();
      } else {
        toast.error(data.error || "Erreur lors de l'ajout");
      }
    } catch (error) {
      console.error("Error adding contact:", error);
      toast.error("Erreur lors de l'ajout du contact");
    } finally {
      setAddingContact(false);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (contact: P2PContact) => {
    try {
      const res = await fetch("/api/mpay/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          isFavorite: !contact.isFavorite,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setContacts(prev =>
          prev.map(c =>
            c.id === contact.id ? { ...c, isFavorite: !c.isFavorite } : c
          )
        );
        toast.success(contact.isFavorite ? "Retire des favoris" : "Ajoute aux favoris");
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Erreur lors de la mise a jour");
    }
    setActiveMenu(null);
  };

  // Delete contact
  const handleDeleteContact = async (contact: P2PContact) => {
    try {
      const res = await fetch(`/api/mpay/contacts?id=${contact.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        setContacts(prev => prev.filter(c => c.id !== contact.id));
        toast.success("Contact supprime");
      } else {
        toast.error(data.error || "Erreur lors de la suppression");
      }
    } catch (error) {
      console.error("Error deleting contact:", error);
      toast.error("Erreur lors de la suppression");
    }
    setActiveMenu(null);
  };

  // Filter contacts
  const filteredContacts = contacts.filter(
    c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.username && c.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.nickname && c.nickname.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.phone && c.phone.includes(searchQuery))
  );

  // Separate favorites and regular contacts
  const favoriteContacts = filteredContacts.filter(c => c.isFavorite);
  const regularContacts = filteredContacts.filter(c => !c.isFavorite);

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">Contacts P2P</h1>
          <p className="text-[9px] font-bold text-cyan-500 tracking-[3px] uppercase">
            {contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="p-3 bg-cyan-600 rounded-2xl hover:bg-cyan-700 transition-all"
        >
          <UserPlus size={20} />
        </button>
      </header>

      <main className="px-6 pt-6 pb-32">
        {/* Search bar */}
        <div className="bg-white/5 rounded-[2rem] p-2 flex items-center gap-2 border border-white/10 focus-within:border-cyan-500/50 transition-all mb-6">
          <div className="p-3 bg-white/5 rounded-xl text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="RECHERCHER UN CONTACT..."
            className="bg-transparent flex-1 outline-none font-bold text-xs uppercase placeholder:text-slate-700"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="p-2 bg-white/5 rounded-xl text-slate-400 hover:bg-white/10"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-cyan-500 mb-3" size={32} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Chargement des contacts...
            </span>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users size={48} className="text-slate-700 mb-4" />
            <p className="text-sm font-bold text-slate-500 mb-2">
              {searchQuery ? "Aucun resultat" : "Aucun contact"}
            </p>
            <p className="text-[10px] text-slate-600 text-center max-w-xs">
              {searchQuery
                ? "Essayez avec un autre terme de recherche"
                : "Ajoutez vos premiers contacts pour effectuer des transferts P2P rapidement"}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 px-6 py-3 bg-cyan-600 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2"
              >
                <Plus size={16} /> Ajouter un contact
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Favorites */}
            {favoriteContacts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Favoris ({favoriteContacts.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {favoriteContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onSend={() => router.push(`/mpay/send?to=${contact.username || contact.contactId}`)}
                      onToggleFavorite={() => handleToggleFavorite(contact)}
                      onDelete={() => handleDeleteContact(contact)}
                      isMenuOpen={activeMenu === contact.id}
                      onMenuToggle={() => setActiveMenu(activeMenu === contact.id ? null : contact.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Regular contacts */}
            {regularContacts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users size={12} className="text-slate-500" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Tous les contacts ({regularContacts.length})
                  </p>
                </div>
                <div className="space-y-2">
                  {regularContacts.map((contact) => (
                    <ContactCard
                      key={contact.id}
                      contact={contact}
                      onSend={() => router.push(`/mpay/send?to=${contact.username || contact.contactId}`)}
                      onToggleFavorite={() => handleToggleFavorite(contact)}
                      onDelete={() => handleDeleteContact(contact)}
                      isMenuOpen={activeMenu === contact.id}
                      onMenuToggle={() => setActiveMenu(activeMenu === contact.id ? null : contact.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg bg-slate-900 border-t border-white/10 rounded-t-[2rem] p-6 animate-in slide-in-from-bottom-8 duration-300"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black uppercase tracking-tight">Ajouter un contact</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewContactIdentifier("");
                  setNewContactNickname("");
                }}
                className="p-2 bg-white/5 rounded-xl hover:bg-white/10 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Username ou telephone
                </label>
                <input
                  type="text"
                  placeholder="@username ou +221..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold outline-none placeholder:text-slate-700 focus:border-cyan-500/50 transition-all"
                  value={newContactIdentifier}
                  onChange={(e) => setNewContactIdentifier(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">
                  Surnom (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mon frere, Collegue..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-bold outline-none placeholder:text-slate-700 focus:border-cyan-500/50 transition-all"
                  value={newContactNickname}
                  onChange={(e) => setNewContactNickname(e.target.value)}
                />
              </div>

              <button
                onClick={handleAddContact}
                disabled={addingContact || !newContactIdentifier.trim()}
                className="w-full bg-cyan-600 p-4 rounded-2xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-cyan-700 transition-all mt-4"
              >
                {addingContact ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Recherche...
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    Ajouter le contact
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Contact Card Component
function ContactCard({
  contact,
  onSend,
  onToggleFavorite,
  onDelete,
  isMenuOpen,
  onMenuToggle,
}: {
  contact: P2PContact;
  onSend: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
}) {
  return (
    <div className="relative">
      <div className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all">
        {/* Avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/20 overflow-hidden flex-shrink-0">
          {contact.avatar ? (
            <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-black text-cyan-400">{contact.initials}</span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black uppercase tracking-tight truncate">
              {contact.nickname || contact.name}
            </p>
            {contact.isFavorite && (
              <Star size={10} className="text-amber-500 fill-amber-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-[10px] font-bold text-slate-500 truncate">
            {contact.username ? `@${contact.username.replace("@", "")}` : contact.phone || ""}
          </p>
          {contact.transactionCount > 0 && (
            <p className="text-[8px] font-bold text-cyan-500/60 mt-0.5">
              {contact.transactionCount} transaction{contact.transactionCount > 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSend}
            className="p-3 bg-cyan-600/20 rounded-xl text-cyan-400 hover:bg-cyan-600/30 transition-all"
          >
            <Send size={16} />
          </button>
          <button
            onClick={onMenuToggle}
            className="p-3 bg-white/5 rounded-xl text-slate-400 hover:bg-white/10 transition-all"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isMenuOpen && (
        <div className="absolute right-4 top-16 z-10 bg-slate-800 border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <button
            onClick={onToggleFavorite}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-all"
          >
            <Star
              size={14}
              className={contact.isFavorite ? "text-amber-500 fill-amber-500" : "text-slate-400"}
            />
            <span className="text-xs font-bold">
              {contact.isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            </span>
          </button>
          <button
            onClick={onDelete}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-red-500/10 transition-all text-red-400"
          >
            <Trash2 size={14} />
            <span className="text-xs font-bold">Supprimer</span>
          </button>
        </div>
      )}
    </div>
  );
}
