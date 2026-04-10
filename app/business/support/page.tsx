'use client';

import React, { useState, useMemo } from 'react';
import {
  HeadphonesIcon, Plus, Search, Eye, X, Send, MessageSquare, Clock,
  CheckCircle, AlertTriangle, ChevronDown, ChevronRight, Paperclip,
  BookOpen, HelpCircle, XCircle, User, Filter,
} from 'lucide-react';

type TicketStatus = 'ouvert' | 'en_cours' | 'resolu' | 'ferme';
type Priority = 'urgent' | 'haute' | 'moyenne' | 'basse';
type Category = 'paiement' | 'technique' | 'facturation' | 'compte' | 'autre';

interface Message { id: number; author: string; role: 'client' | 'agent'; content: string; timestamp: string; avatar: string; }
interface Ticket {
  id: string; subject: string; category: Category; priority: Priority;
  status: TicketStatus; createdAt: string; lastReply: string; assignedTo: string;
  messages: Message[];
}

const STATUS_CFG: Record<TicketStatus, { label: string; color: string }> = {
  ouvert: { label: 'Ouvert', color: 'bg-blue-500/10 text-blue-400' },
  en_cours: { label: 'En cours', color: 'bg-amber-500/10 text-amber-400' },
  resolu: { label: 'Résolu', color: 'bg-emerald-500/10 text-emerald-400' },
  ferme: { label: 'Fermé', color: 'bg-gray-500/10 text-gray-400' },
};

const PRIORITY_CFG: Record<Priority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: 'bg-red-500/10 text-red-400' },
  haute: { label: 'Haute', color: 'bg-orange-500/10 text-orange-400' },
  moyenne: { label: 'Moyenne', color: 'bg-blue-500/10 text-blue-400' },
  basse: { label: 'Basse', color: 'bg-gray-500/10 text-gray-400' },
};

const CAT_LABELS: Record<Category, string> = {
  paiement: 'Paiement', technique: 'Technique', facturation: 'Facturation', compte: 'Compte', autre: 'Autre',
};

const TICKETS: Ticket[] = [
  { id: 'TKT-001', subject: 'Paiement Mobile Money bloqué depuis 48h', category: 'paiement', priority: 'urgent', status: 'ouvert', createdAt: '2024-04-10 09:15', lastReply: '2024-04-10 14:30', assignedTo: 'Marie Ngo',
    messages: [
      { id: 1, author: 'Jean-Pierre Mbarga', role: 'client', content: 'Bonjour, un paiement de 15 200 000 XAF via Orange Money est bloqué depuis 48h. Référence PAY-2024-004. Merci de vérifier.', timestamp: '2024-04-10 09:15', avatar: 'JPM' },
      { id: 2, author: 'Marie Ngo (Support)', role: 'agent', content: 'Bonjour M. Mbarga, nous avons identifié le problème. Le paiement est en file d\'attente côté opérateur. Nous avons relancé la demande.', timestamp: '2024-04-10 10:30', avatar: 'MN' },
      { id: 3, author: 'Jean-Pierre Mbarga', role: 'client', content: 'Merci pour le retour rapide. Pouvez-vous me tenir informé de l\'avancement ?', timestamp: '2024-04-10 14:30', avatar: 'JPM' },
    ]},
  { id: 'TKT-002', subject: 'Impossible de générer le rapport mensuel', category: 'technique', priority: 'haute', status: 'en_cours', createdAt: '2024-04-09 16:45', lastReply: '2024-04-10 11:00', assignedTo: 'Paul Essomba',
    messages: [
      { id: 1, author: 'Sandrine Ateba', role: 'client', content: 'Le rapport financier de mars ne se génère pas. J\'obtiens une erreur 500 à chaque tentative.', timestamp: '2024-04-09 16:45', avatar: 'SA' },
      { id: 2, author: 'Paul Essomba (Support)', role: 'agent', content: 'Nous avons identifié un problème avec le module de génération PDF. L\'équipe technique travaille sur le correctif.', timestamp: '2024-04-10 11:00', avatar: 'PE' },
    ]},
  { id: 'TKT-003', subject: 'Demande de modification du plan tarifaire', category: 'facturation', priority: 'moyenne', status: 'ouvert', createdAt: '2024-04-09 10:00', lastReply: '2024-04-09 10:00', assignedTo: 'Non assigné',
    messages: [{ id: 1, author: 'François Ekotto', role: 'client', content: 'Nous souhaitons passer du Plan Entreprise au Plan Premium pour bénéficier de 50 000 transactions/mois.', timestamp: '2024-04-09 10:00', avatar: 'FE' }]},
  { id: 'TKT-004', subject: 'Erreur lors de l\'ajout d\'un employé', category: 'technique', priority: 'moyenne', status: 'en_cours', createdAt: '2024-04-08 14:20', lastReply: '2024-04-09 09:30', assignedTo: 'Marie Ngo',
    messages: [{ id: 1, author: 'Alain Fotso', role: 'client', content: 'Je n\'arrive pas à ajouter un nouvel employé. Le formulaire affiche "Erreur de validation" sans précision.', timestamp: '2024-04-08 14:20', avatar: 'AF' }]},
  { id: 'TKT-005', subject: 'API webhook ne reçoit plus les événements', category: 'technique', priority: 'urgent', status: 'ouvert', createdAt: '2024-04-08 08:00', lastReply: '2024-04-08 15:45', assignedTo: 'Paul Essomba',
    messages: [{ id: 1, author: 'Samuel Ngah', role: 'client', content: 'Notre endpoint webhook ne reçoit plus de notifications depuis ce matin. URL: https://api.cloudafrica.io/webhooks/pimpay', timestamp: '2024-04-08 08:00', avatar: 'SN' }]},
  { id: 'TKT-006', subject: 'Facture en double pour mars 2024', category: 'facturation', priority: 'haute', status: 'resolu', createdAt: '2024-04-05 11:30', lastReply: '2024-04-07 16:00', assignedTo: 'Marie Ngo',
    messages: [{ id: 1, author: 'Jean-Pierre Mbarga', role: 'client', content: 'Nous avons reçu deux factures identiques pour mars 2024 (BILL-2024-03). Merci de corriger.', timestamp: '2024-04-05 11:30', avatar: 'JPM' }]},
  { id: 'TKT-007', subject: 'Demande d\'accès API pour intégration', category: 'compte', priority: 'basse', status: 'resolu', createdAt: '2024-04-03 09:00', lastReply: '2024-04-04 14:20', assignedTo: 'Paul Essomba',
    messages: [{ id: 1, author: 'Marc Eyinga', role: 'client', content: 'Nous souhaitons obtenir des clés API pour intégrer PimPay à notre ERP.', timestamp: '2024-04-03 09:00', avatar: 'ME' }]},
  { id: 'TKT-008', subject: 'Problème de connexion 2FA', category: 'compte', priority: 'haute', status: 'resolu', createdAt: '2024-04-02 07:45', lastReply: '2024-04-02 10:30', assignedTo: 'Marie Ngo',
    messages: [{ id: 1, author: 'Pauline Ndam', role: 'client', content: 'Je ne reçois plus les codes SMS 2FA. Mon numéro est +237 699 88 77 66.', timestamp: '2024-04-02 07:45', avatar: 'PN' }]},
  { id: 'TKT-009', subject: 'Exportation CSV des transactions incomplète', category: 'technique', priority: 'moyenne', status: 'ferme', createdAt: '2024-03-28 13:15', lastReply: '2024-03-30 09:00', assignedTo: 'Paul Essomba',
    messages: [{ id: 1, author: 'Sandrine Ateba', role: 'client', content: 'L\'export CSV ne contient que les 100 premières transactions au lieu de toutes.', timestamp: '2024-03-28 13:15', avatar: 'SA' }]},
  { id: 'TKT-010', subject: 'Mise à jour des informations de l\'entreprise', category: 'compte', priority: 'basse', status: 'ferme', createdAt: '2024-03-25 10:00', lastReply: '2024-03-26 11:00', assignedTo: 'Marie Ngo',
    messages: [{ id: 1, author: 'Jean-Pierre Mbarga', role: 'client', content: 'Nous avons changé d\'adresse. Merci de mettre à jour: Rue de la Joie, Bonapriso, Douala.', timestamp: '2024-03-25 10:00', avatar: 'JPM' }]},
];

const FAQ = [
  { q: 'Comment effectuer un paiement Mobile Money ?', a: 'Allez dans Paiements > Nouveau Paiement > sélectionnez Mobile Money comme méthode. Entrez le numéro du bénéficiaire et le montant, puis confirmez.' },
  { q: 'Comment ajouter un nouvel employé ?', a: 'Rendez-vous dans Employés > Ajouter un employé. Remplissez les informations requises (nom, email, poste, département, salaire) et validez.' },
  { q: 'Comment générer un rapport financier ?', a: 'Accédez à Rapports > sélectionnez la période souhaitée > cliquez sur Générer. Le rapport sera disponible en PDF et Excel.' },
  { q: 'Comment configurer les webhooks ?', a: 'Dans Paramètres > Intégrations, vous trouverez votre URL webhook. Configurez votre endpoint pour recevoir les notifications en temps réel.' },
  { q: 'Quels sont les frais de transaction ?', a: 'Les virements bancaires: 0.5%, Mobile Money: 1%, Chèque: 500 XAF fixe, Carte: 1.5%. Les frais sont plafonnés à 50 000 XAF par transaction.' },
];

type TabFilter = 'all' | 'ouvert' | 'en_cours' | 'resolu' | 'ferme';

export default function SupportPage() {
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showFaq, setShowFaq] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');

  const filtered = useMemo(() => {
    let list = TICKETS;
    if (tabFilter !== 'all') list = list.filter(t => t.status === tabFilter);
    if (priorityFilter !== 'all') list = list.filter(t => t.priority === priorityFilter);
    if (search) list = list.filter(t => t.subject.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [search, tabFilter, priorityFilter]);

  const openCount = TICKETS.filter(t => t.status === 'ouvert').length;
  const inProgressCount = TICKETS.filter(t => t.status === 'en_cours').length;
  const resolvedCount = TICKETS.filter(t => t.status === 'resolu').length;

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Tous' }, { key: 'ouvert', label: 'Ouverts' }, { key: 'en_cours', label: 'En Cours' },
    { key: 'resolu', label: 'Résolus' }, { key: 'ferme', label: 'Fermés' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center"><HeadphonesIcon className="w-5 h-5 text-purple-400" /></div>
          <div><h1 className="text-xl font-bold text-white">Support Client</h1><p className="text-sm text-gray-400">Centre d&apos;aide et gestion des tickets</p></div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowFaq(true)} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"><BookOpen className="w-4 h-4" />Base de Connaissances</button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all"><Plus className="w-4 h-4" />Nouveau Ticket</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tickets Ouverts', value: openCount, icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'En Traitement', value: inProgressCount, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { label: 'Résolus ce mois', value: resolvedCount, icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { label: 'Temps moyen réponse', value: '2.4h', icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/20' },
        ].map((c, i) => (
          <div key={i} className="bg-[#0a0f1c] border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium">{c.label}</span>
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}><c.icon className={`w-4 h-4 ${c.color}`} /></div>
            </div>
            <p className="text-2xl font-bold text-white">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {tabs.map(t => (<button key={t.key} onClick={() => setTabFilter(t.key)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tabFilter === t.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>{t.label}</button>))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-56" /></div>
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
            <option value="all">Toutes priorités</option><option value="urgent">Urgent</option><option value="haute">Haute</option><option value="moyenne">Moyenne</option><option value="basse">Basse</option>
          </select>
        </div>
      </div>

      <div className="bg-[#0a0f1c] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 text-xs uppercase bg-white/[0.02]">
            <th className="px-4 py-3">ID</th><th className="px-4 py-3">Sujet</th><th className="px-4 py-3">Catégorie</th><th className="px-4 py-3">Priorité</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Créé le</th><th className="px-4 py-3">Assigné à</th><th className="px-4 py-3">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map(t => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-gray-300 font-mono text-xs">{t.id}</td>
                <td className="px-4 py-3 text-white max-w-xs truncate">{t.subject}</td>
                <td className="px-4 py-3 text-gray-400">{CAT_LABELS[t.category]}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${PRIORITY_CFG[t.priority].color}`}>{PRIORITY_CFG[t.priority].label}</span></td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CFG[t.status].color}`}>{STATUS_CFG[t.status].label}</span></td>
                <td className="px-4 py-3 text-gray-400 text-xs">{t.createdAt}</td>
                <td className="px-4 py-3 text-gray-300 text-xs">{t.assignedTo}</td>
                <td className="px-4 py-3"><button onClick={() => setSelected(t)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><Eye className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ticket Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-[#0d1321] border border-white/10 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-white/5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 font-mono">{selected.id}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CFG[selected.status].color}`}>{STATUS_CFG[selected.status].label}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CFG[selected.priority].color}`}>{PRIORITY_CFG[selected.priority].label}</span>
                </div>
                <h2 className="text-lg font-semibold text-white mt-1">{selected.subject}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {selected.messages.map(m => (
                <div key={m.id} className={`flex gap-3 ${m.role === 'agent' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${m.role === 'agent' ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-gradient-to-br from-cyan-600 to-blue-600'}`}>{m.avatar}</div>
                  <div className={`max-w-[80%] p-3 rounded-xl ${m.role === 'agent' ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-white/5 border border-white/10'}`}>
                    <div className="flex items-center gap-2 mb-1"><span className="text-xs font-medium text-white">{m.author}</span><span className="text-xs text-gray-500">{m.timestamp}</span></div>
                    <p className="text-sm text-gray-300">{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-white/5">
              <div className="flex items-center gap-3">
                <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400"><Paperclip className="w-4 h-4" /></button>
                <input value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Écrire une réponse..." className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" />
                <button className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"><Send className="w-4 h-4" />Envoyer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-[#0d1321] border border-white/10 rounded-xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Nouveau Ticket</h2><button onClick={() => setShowNew(false)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>
            <div><label className="block text-xs text-gray-400 mb-1.5">Sujet</label><input placeholder="Décrivez votre problème en quelques mots" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-400 mb-1.5">Catégorie</label><select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"><option>Paiement</option><option>Technique</option><option>Facturation</option><option>Compte</option><option>Autre</option></select></div>
              <div><label className="block text-xs text-gray-400 mb-1.5">Priorité</label><select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"><option>Basse</option><option>Moyenne</option><option>Haute</option><option>Urgent</option></select></div>
            </div>
            <div><label className="block text-xs text-gray-400 mb-1.5">Description</label><textarea rows={4} placeholder="Décrivez votre problème en détail..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none" /></div>
            <button className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all">Créer le ticket</button>
          </div>
        </div>
      )}

      {/* FAQ Modal */}
      {showFaq && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowFaq(false)}>
          <div className="bg-[#0d1321] border border-white/10 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white flex items-center gap-2"><BookOpen className="w-5 h-5 text-purple-400" />Base de Connaissances</h2><button onClick={() => setShowFaq(false)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>
            <div className="space-y-2">
              {FAQ.map((faq, i) => (
                <div key={i} className="bg-white/5 rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedFaq(expandedFaq === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
                    <span className="text-sm font-medium text-white flex items-center gap-2"><HelpCircle className="w-4 h-4 text-purple-400" />{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedFaq === i && <div className="px-4 pb-4 text-sm text-gray-400">{faq.a}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}