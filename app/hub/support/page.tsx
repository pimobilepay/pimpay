"use client";

import { useState } from "react";
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
} from "lucide-react";

export default function AgentSupportPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ticketType, setTicketType] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const faqItems = [
    {
      question: "Comment recharger mon float?",
      answer: "Vous pouvez recharger votre float via virement bancaire ou en contactant votre superviseur regional.",
    },
    {
      question: "Que faire en cas de transaction echouee?",
      answer: "Verifiez d&apos;abord votre connexion internet. Si le probleme persiste, creez un ticket de support.",
    },
    {
      question: "Comment modifier mes informations?",
      answer: "Rendez-vous dans la section Parametres pour modifier vos informations personnelles et professionnelles.",
    },
    {
      question: "Quels sont les horaires de support?",
      answer: "Notre equipe de support est disponible 24h/24 et 7j/7 pour vous assister.",
    },
  ];

  const recentTickets = [
    { id: "TKT-001", subject: "Probleme de transaction", status: "resolved", date: "15 Jan 2024" },
    { id: "TKT-002", subject: "Rechargement float", status: "pending", date: "18 Jan 2024" },
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
      case "pending":
        return (
          <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            <Clock className="h-3 w-3 mr-1" />
            En cours
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
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
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl hover:border-emerald-500/30 transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 rounded-2xl">
                <Phone className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-white font-bold">Appeler</p>
                <p className="text-sm text-slate-500">+242 065 54 03 05</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl hover:border-blue-500/30 transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-2xl">
                <MessageCircle className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-white font-bold">WhatsApp</p>
                <p className="text-sm text-slate-500">Chat en direct</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-white/5 rounded-3xl hover:border-purple-500/30 transition-colors cursor-pointer">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-2xl">
                <Mail className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-white font-bold">Email</p>
                <p className="text-sm text-slate-500">support@pimpay.com</p>
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
                  className="bg-slate-800/50 border-white/10 text-white"
                />
              </div>
              <div>
                <Textarea
                  placeholder="Decrivez votre probleme en detail..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-slate-800/50 border-white/10 text-white min-h-[120px]"
                />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Send className="h-4 w-4 mr-2" />
                Envoyer le ticket
              </Button>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Mes tickets recents
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentTickets.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Aucun ticket</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white font-bold">{ticket.subject}</p>
                          <p className="text-xs text-slate-500 mt-1">{ticket.id} - {ticket.date}</p>
                        </div>
                        {getStatusBadge(ticket.status)}
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
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div
                  key={index}
                  className="p-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-white font-bold">{item.question}</p>
                      <p className="text-sm text-slate-400 mt-2">{item.answer}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
