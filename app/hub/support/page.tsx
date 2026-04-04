"use client";

import { useState, useEffect } from "react";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Headphones,
  MessageCircle,
  Phone,
  Mail,
  FileQuestion,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  Trash2,
  Eye,
  Loader2,
} from "lucide-react";

interface Ticket {
  id: string;
  type: string;
  subject: string;
  message: string;
  status: "pending" | "in_progress" | "resolved";
  date: string;
  createdAt: number;
}

const STORAGE_KEY = "pimpay_hub_support_tickets";

export default function AgentSupportPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ticketType, setTicketType] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showTicketDetail, setShowTicketDetail] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // Load tickets from localStorage on mount
  useEffect(() => {
    const savedTickets = localStorage.getItem(STORAGE_KEY);
    if (savedTickets) {
      try {
        setTickets(JSON.parse(savedTickets));
      } catch {
        setTickets([]);
      }
    }
  }, []);

  // Save tickets to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
  }, [tickets]);

  const faqItems = [
    {
      question: "Comment recharger mon float?",
      answer: "Vous pouvez recharger votre float via virement bancaire ou en contactant votre superviseur regional. Contactez-nous au +242 065 54 03 05 pour plus d'assistance.",
    },
    {
      question: "Que faire en cas de transaction echouee?",
      answer: "Verifiez d'abord votre connexion internet. Si le probleme persiste, creez un ticket de support ci-dessus ou contactez-nous directement via WhatsApp.",
    },
    {
      question: "Comment modifier mes informations?",
      answer: "Rendez-vous dans la section Parametres pour modifier vos informations personnelles et professionnelles.",
    },
    {
      question: "Quels sont les horaires de support?",
      answer: "Notre equipe de support est disponible 24h/24 et 7j/7 pour vous assister par telephone, WhatsApp ou email.",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Resolu
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            En traitement
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "transaction":
        return "Probleme de transaction";
      case "float":
        return "Rechargement float";
      case "account":
        return "Probleme de compte";
      case "technical":
        return "Probleme technique";
      case "other":
        return "Autre";
      default:
        return type;
    }
  };

  const generateTicketId = () => {
    const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `TKT-${num}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubmitTicket = async () => {
    if (!ticketType || !subject.trim() || !message.trim()) {
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));

    const newTicket: Ticket = {
      id: generateTicketId(),
      type: ticketType,
      subject: subject.trim(),
      message: message.trim(),
      status: "pending",
      date: formatDate(new Date()),
      createdAt: Date.now(),
    };

    setTickets(prev => [newTicket, ...prev]);
    setTicketType("");
    setSubject("");
    setMessage("");
    setIsSubmitting(false);
    setSubmitSuccess(true);

    setTimeout(() => setSubmitSuccess(false), 3000);
  };

  const handleDeleteTicket = (ticketId: string) => {
    setTickets(prev => prev.filter(t => t.id !== ticketId));
    if (selectedTicket?.id === ticketId) {
      setShowTicketDetail(false);
      setSelectedTicket(null);
    }
  };

  const handleViewTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setShowTicketDetail(true);
  };

  const handleCall = () => {
    window.location.href = "tel:+242065540305";
  };

  const handleWhatsApp = () => {
    window.open("https://wa.me/242065540305", "_blank");
  };

  const handleEmail = () => {
    window.location.href = "mailto:pimobilepay@gmail.com";
  };

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AgentSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center justify-center flex-1">
                <div>
                  <h1 className="text-sm font-black text-white text-center">PIMPAY</h1>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase text-center">Agent Hub</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <AgentSidebar isMobile />
          </div>
        </div>
      )}

      {/* Ticket Detail Dialog */}
      <Dialog open={showTicketDetail} onOpenChange={setShowTicketDetail}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Headphones className="h-5 w-5 text-emerald-500" />
              Details du ticket
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {selectedTicket?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && (
            <div className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm">Statut</span>
                {getStatusBadge(selectedTicket.status)}
              </div>
              <div>
                <span className="text-slate-400 text-sm">Type</span>
                <p className="text-white font-medium mt-1">{getTypeLabel(selectedTicket.type)}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">Sujet</span>
                <p className="text-white font-medium mt-1">{selectedTicket.subject}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">Message</span>
                <p className="text-slate-300 mt-1 p-3 bg-slate-800/50 rounded-xl text-sm">
                  {selectedTicket.message}
                </p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">Date de creation</span>
                <p className="text-white font-medium mt-1">{selectedTicket.date}</p>
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                  onClick={() => setShowTicketDetail(false)}
                >
                  Fermer
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Mobile Header */}
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 text-slate-400">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-black text-white">PIMPAY</h1>
          <div className="w-9" />
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Support</h1>
            <p className="text-sm text-slate-500 mt-1">Nous sommes la pour vous aider</p>
          </div>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card 
            className="bg-slate-900/50 border-white/5 rounded-3xl hover:border-emerald-500/30 transition-colors cursor-pointer group"
            onClick={handleCall}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500/20 transition-colors">
                <Phone className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-white font-bold">Appeler</p>
                <p className="text-sm text-slate-500">+242 065 54 03 05</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-slate-900/50 border-white/5 rounded-3xl hover:border-green-500/30 transition-colors cursor-pointer group"
            onClick={handleWhatsApp}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-2xl group-hover:bg-green-500/20 transition-colors">
                <MessageCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-white font-bold">WhatsApp</p>
                <p className="text-sm text-slate-500">+242 065 54 03 05</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="bg-slate-900/50 border-white/5 rounded-3xl hover:border-purple-500/30 transition-colors cursor-pointer group"
            onClick={handleEmail}
          >
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl group-hover:bg-purple-500/20 transition-colors">
                <Mail className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-white font-bold">Email</p>
                <p className="text-sm text-slate-500">pimobilepay@gmail.com</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Create Ticket */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Headphones className="h-5 w-5 text-emerald-500" />
                Creer un ticket
              </CardTitle>
              <CardDescription className="text-slate-500">
                Decrivez votre probleme et nous vous repondrons rapidement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {submitSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <p className="text-emerald-500 text-sm font-medium">
                    Votre ticket a ete cree avec succes! Nous vous repondrons bientot.
                  </p>
                </div>
              )}
              <div>
                <Select value={ticketType} onValueChange={setTicketType}>
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue placeholder="Type de probleme" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    <SelectItem value="transaction">Probleme de transaction</SelectItem>
                    <SelectItem value="float">Rechargement float</SelectItem>
                    <SelectItem value="account">Probleme de compte</SelectItem>
                    <SelectItem value="technical">Probleme technique</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Input
                  placeholder="Sujet"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500"
                />
              </div>
              <div>
                <Textarea
                  placeholder="Decrivez votre probleme en detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-slate-800/50 border-white/10 text-white min-h-[120px] placeholder:text-slate-500"
                />
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                onClick={handleSubmitTicket}
                disabled={isSubmitting || !ticketType || !subject.trim() || !message.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer le ticket
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Mes tickets recents
                {tickets.length > 0 && (
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 ml-2">
                    {tickets.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tickets.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Aucun ticket</p>
                  <p className="text-slate-600 text-sm mt-1">Creez un ticket pour obtenir de l&apos;aide</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                  {tickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold truncate">{ticket.subject}</p>
                          <p className="text-xs text-slate-500 mt-1">{ticket.id} - {ticket.date}</p>
                          <p className="text-xs text-slate-400 mt-1">{getTypeLabel(ticket.type)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getStatusBadge(ticket.status)}
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleViewTicket(ticket)}
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
                              title="Voir les details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTicket(ticket.id)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* FAQ */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl mt-6">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <FileQuestion className="h-5 w-5 text-amber-500" />
              Questions frequentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <p className="text-white font-bold pr-4">{item.question}</p>
                    <ChevronRight 
                      className={`h-5 w-5 text-slate-500 shrink-0 transition-transform duration-200 ${
                        expandedFaq === index ? "rotate-90" : ""
                      }`} 
                    />
                  </button>
                  {expandedFaq === index && (
                    <div className="px-4 pb-4">
                      <p className="text-sm text-slate-400">{item.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
