"use client";
import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Clock, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function AdminMessages() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await fetch("/api/admin/tickets"); // Crée cette API pour GET les tickets
      const data = await res.json();
      setTickets(data);
    } catch (err) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <header className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl"><ArrowLeft /></button>
        <h1 className="text-xl font-bold uppercase tracking-widest">Inbox Admin</h1>
      </header>

      <div className="space-y-4">
        {tickets.map((ticket: any) => (
          <div key={ticket.id} className="bg-slate-900/50 border border-white/5 p-5 rounded-[24px]">
            <div className="flex justify-between items-start mb-3">
              <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md uppercase">
                {ticket.status}
              </span>
              <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                <Clock size={12} /> {new Date(ticket.createdAt).toLocaleDateString()}
              </div>
            </div>
            <h3 className="font-bold text-sm uppercase mb-2">{ticket.subject}</h3>
            <p className="text-xs text-slate-400 line-clamp-2 italic">
              {ticket.messages[0]?.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
