"use client";

import { useState } from "react";
import { BankSidebar } from "@/components/bank/BankSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  MessageSquare,
  Landmark,
  Menu,
  X,
  Search,
  Send,
  Paperclip,
  Phone,
  Video,
  MoreVertical,
  Check,
  CheckCheck,
  Clock,
  Plus,
  Users,
  Star,
  Archive,
  Bell,
} from "lucide-react";

// Mock conversations
const conversations = [
  { 
    id: 1, 
    name: "Support Technique", 
    type: "channel",
    lastMessage: "Les nouvelles procedures de conformite sont en place.", 
    time: "10:38", 
    unread: 3,
    avatar: "ST",
    members: 12
  },
  { 
    id: 2, 
    name: "Banque Centrale du Congo", 
    type: "external",
    lastMessage: "Confirmation du transfert de $5M recu.", 
    time: "09:45", 
    unread: 1,
    avatar: "BC",
    members: 0
  },
  { 
    id: 3, 
    name: "Equipe Conformite", 
    type: "channel",
    lastMessage: "Validation KYC urgente requise pour Global Trade.", 
    time: "Hier", 
    unread: 0,
    avatar: "EC",
    members: 6
  },
  { 
    id: 4, 
    name: "Marie Tshimanga", 
    type: "direct",
    lastMessage: "J'ai finalise le rapport mensuel.", 
    time: "Hier", 
    unread: 0,
    avatar: "MT",
    members: 0
  },
  { 
    id: 5, 
    name: "Rawbank", 
    type: "external",
    lastMessage: "Demande de clarification sur le transfert IB-2456.", 
    time: "Lun", 
    unread: 2,
    avatar: "RB",
    members: 0
  },
  { 
    id: 6, 
    name: "Alertes Systeme", 
    type: "channel",
    lastMessage: "Maintenance programmee pour ce soir 23h00.", 
    time: "Lun", 
    unread: 0,
    avatar: "AS",
    members: 24
  },
];

// Mock messages for selected conversation
const messages = [
  { id: 1, sender: "Support Admin", content: "Bonjour a tous, les nouvelles procedures de conformite entrent en vigueur aujourd'hui.", time: "10:30", isOwn: false, status: "read" },
  { id: 2, sender: "Vous", content: "Merci pour l'information. Pouvez-vous confirmer les nouveaux seuils de verification?", time: "10:35", isOwn: true, status: "read" },
  { id: 3, sender: "Support Admin", content: "Les seuils ont ete mis a jour:\n- 50,000 USD pour les entreprises\n- 10,000 USD pour les particuliers\n\nToute transaction depassant ces montants necessite une verification renforcee.", time: "10:38", isOwn: false, status: "read" },
  { id: 4, sender: "Marie Tshimanga", content: "Parfait, je vais mettre a jour les procedures internes.", time: "10:42", isOwn: false, status: "read" },
  { id: 5, sender: "Vous", content: "Et concernant les delais de traitement?", time: "10:45", isOwn: true, status: "delivered" },
];

export default function MessagesPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(conversations[0]);
  const [messageInput, setMessageInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showConversationList, setShowConversationList] = useState(true);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "channel":
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[8px] font-bold">Canal</Badge>;
      case "external":
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[8px] font-bold">Externe</Badge>;
      case "direct":
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[8px] font-bold">Direct</Badge>;
      default:
        return null;
    }
  };

  const getMessageStatus = (status: string) => {
    switch (status) {
      case "read":
        return <CheckCheck className="h-3.5 w-3.5 text-blue-500" />;
      case "delivered":
        return <CheckCheck className="h-3.5 w-3.5 text-slate-500" />;
      case "sent":
        return <Check className="h-3.5 w-3.5 text-slate-500" />;
      case "pending":
        return <Clock className="h-3.5 w-3.5 text-slate-500" />;
      default:
        return null;
    }
  };

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      // In real app, send message to backend
      setMessageInput("");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <BankSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
                  <Landmark className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-black text-white">PIMPAY</h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Institution</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <BankSidebar isMobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-white/5">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 text-slate-400">
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-black text-white">Messagerie</h1>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
            <Landmark className="h-5 w-5 text-white" />
          </div>
        </div>

        {/* Messages Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Conversation List */}
          <div className={`${showConversationList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-80 border-r border-white/5 bg-slate-950/50`}>
            {/* Header */}
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-white">Messages</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-800/50 border-white/10 text-white text-xs"
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="px-4 py-2 flex gap-2 border-b border-white/5">
              <Button variant="ghost" size="sm" className="text-[10px] font-bold h-7 px-2 text-slate-400 hover:text-white">
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Tous
              </Button>
              <Button variant="ghost" size="sm" className="text-[10px] font-bold h-7 px-2 text-slate-400 hover:text-white">
                <Star className="h-3.5 w-3.5 mr-1" />
                Importants
              </Button>
              <Button variant="ghost" size="sm" className="text-[10px] font-bold h-7 px-2 text-slate-400 hover:text-white">
                <Archive className="h-3.5 w-3.5 mr-1" />
                Archives
              </Button>
            </div>

            {/* Conversation List */}
            <ScrollArea className="flex-1">
              <div className="p-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv);
                      setShowConversationList(false);
                    }}
                    className={`w-full p-3 rounded-2xl mb-1 text-left transition-colors ${
                      selectedConversation.id === conv.id 
                        ? 'bg-white/10' 
                        : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 bg-slate-800">
                        <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                          {conv.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{conv.name}</p>
                            {getTypeBadge(conv.type)}
                          </div>
                          <span className="text-[10px] text-slate-500 shrink-0">{conv.time}</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-1">{conv.lastMessage}</p>
                        <div className="flex items-center justify-between mt-1">
                          {conv.members > 0 && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {conv.members}
                            </span>
                          )}
                          {conv.unread > 0 && (
                            <Badge className="bg-blue-500 text-white text-[9px] font-bold h-5 min-w-5 flex items-center justify-center">
                              {conv.unread}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={`${!showConversationList ? 'flex' : 'hidden'} lg:flex flex-col flex-1 bg-[#02040a]`}>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowConversationList(true)}
                  className="lg:hidden p-2 rounded-xl bg-white/5 text-slate-400"
                >
                  <X className="h-4 w-4" />
                </button>
                <Avatar className="h-10 w-10 bg-slate-800">
                  <AvatarFallback className="bg-slate-800 text-white text-xs font-bold">
                    {selectedConversation.avatar}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-white">{selectedConversation.name}</p>
                    {getTypeBadge(selectedConversation.type)}
                  </div>
                  {selectedConversation.members > 0 && (
                    <p className="text-[10px] text-slate-500">{selectedConversation.members} membres</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white">
                  <Bell className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-white">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${msg.isOwn ? 'order-2' : 'order-1'}`}>
                      {!msg.isOwn && (
                        <p className="text-[10px] font-bold text-slate-500 mb-1 ml-1">{msg.sender}</p>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          msg.isOwn
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-slate-800/80 text-white rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{msg.content}</p>
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${msg.isOwn ? 'justify-end' : 'justify-start'} px-1`}>
                        <span className="text-[10px] text-slate-500">{msg.time}</span>
                        {msg.isOwn && getMessageStatus(msg.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-white/5">
              <div className="flex items-end gap-3">
                <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white shrink-0">
                  <Paperclip className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                  <Textarea
                    placeholder="Ecrivez un message..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    className="min-h-[44px] max-h-32 bg-slate-800/50 border-white/10 text-white text-sm resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                </div>
                <Button 
                  onClick={handleSendMessage}
                  className="h-10 w-10 bg-blue-600 hover:bg-blue-700 rounded-xl shrink-0"
                  size="icon"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
