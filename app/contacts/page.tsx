"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { BottomNav } from "@/components/bottom-nav"
import { ArrowLeft, Mail, Phone, MessageCircle, MapPin } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function ContactsPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-chart-2 via-accent to-primary text-primary-foreground px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Contacts</h1>
            <p className="text-sm opacity-90">Contactez notre équipe</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Contact Info Cards */}
        <div className="grid gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">support@pimpay.com</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                <Phone className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Téléphone</p>
                <p className="font-medium text-foreground">+243 123 456 789</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp</p>
                <p className="font-medium text-foreground">+243 987 654 321</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-chart-2/10 flex items-center justify-center">
                <MapPin className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Adresse</p>
                <p className="font-medium text-foreground">Kinshasa, RD Congo</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Contact Form */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Envoyez-nous un message</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-foreground">
                Nom complet
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Jean Kabongo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jean@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="subject" className="text-foreground">
                Sujet
              </Label>
              <Input
                id="subject"
                type="text"
                placeholder="Comment puis-je vous aider?"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="message" className="text-foreground">
                Message
              </Label>
              <Textarea
                id="message"
                placeholder="Décrivez votre demande..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="mt-1.5 min-h-[120px]"
              />
            </div>

            <Button className="w-full" size="lg">
              Envoyer le message
            </Button>
          </div>
        </Card>

        {/* FAQ Section */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Questions fréquentes</h2>
          <div className="space-y-4">
            <div>
              <p className="font-medium text-foreground mb-1">Comment effectuer un dépôt?</p>
              <p className="text-sm text-muted-foreground">
                Allez dans la section Dépôt, sélectionnez votre pays et opérateur, puis suivez les instructions.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Combien de temps prend un retrait?</p>
              <p className="text-sm text-muted-foreground">
                Les retraits sont généralement traités en 5-10 minutes pour Mobile Money et 1-2 heures pour MoneyGram.
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Quels sont les frais?</p>
              <p className="text-sm text-muted-foreground">
                Les frais varient selon l'opérateur: 1-2% pour Mobile Money, 2.5% pour MoneyGram.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
