"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BottomNav } from "@/components/bottom-nav"
import { ArrowLeft, Send } from "lucide-react"
import Link from "next/link"

export default function TransferPage() {
  const [recipient, setRecipient] = useState("")
  const [amount, setAmount] = useState("")
  const availableBalance = 1250.75

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-accent text-accent-foreground px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-accent-foreground hover:bg-accent-foreground/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Transfert</h1>
            <p className="text-sm opacity-90">Envoyer des Pi coins</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Balance Card */}
        <Card className="p-4 bg-accent/5 border-accent/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Solde disponible</span>
            <span className="text-xl font-bold text-foreground">π {availableBalance.toFixed(2)}</span>
          </div>
        </Card>

        {/* Transfer Form */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="recipient" className="text-foreground">
                Destinataire
              </Label>
              <Input
                id="recipient"
                type="text"
                placeholder="Nom d'utilisateur ou ID Pi"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="amount" className="text-foreground">
                Montant (π)
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="note" className="text-foreground">
                Note (optionnel)
              </Label>
              <Input id="note" type="text" placeholder="Ajouter une note" className="mt-1.5" />
            </div>

            <div className="pt-2">
              <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg">
                <Send className="h-4 w-4 mr-2" />
                Envoyer
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              <Send className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Transfert gratuit</p>
              <p className="text-sm text-muted-foreground">Envoyez des Pi coins à d'autres utilisateurs sans frais</p>
            </div>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
