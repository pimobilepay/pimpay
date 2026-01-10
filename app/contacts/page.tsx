"use client";

import { useState } from "react";
import { 
  ArrowLeft, Mail, Phone, MessageCircle, MapPin, 
  Send, ShieldCheck, Headphones, ExternalLink 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

export default function ContactsPage() {
  const router = useRouter();
  
  // CORRECTION : Définition de la fonction requise par BottomNav
  const handleOpenMenu = () => {
    console.log("Menu navigation cliqué");
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    setTimeout(() => {
      toast.success("Message transmis au protocole de support");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setIsSending(false);
    }, 1500);
  };

  // ... (le reste de ton tableau contactMethods reste identique)

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans selection:bg-blue-500/30">
      
      {/* ... (Tout ton design Header et Main reste identique) ... */}

      {/* CORRECTION : On passe la prop manquante ici à la ligne 179 */}
      <BottomNav onOpenMenu={handleOpenMenu} />
    </div>
  );
}
