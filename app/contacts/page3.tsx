"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import BottomNav from "@/components/bottom-nav"
import { ArrowLeft, Mail, Phone, MessageCircle, MapPin, Facebook, Instagram, Twitter } from "lucide-react"

export default function ContactsPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulation d'envoi
    setSent(true)
    setTimeout(() => setSent(false), 4000)
  }

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
        {/* Informations de contact */}
        <div className="grid gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a href="mailto:pimobilepay@gmail.com" className="font-medium text-foreground hover:underline">
                  pimobilepay@gmail.com
                </a>
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
                <a href="tel:+242065540305" className="font-medium text-foreground hover:underline">
                  +242 065 540 305
                </a>
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
                <a
                  href="https://wa.me/242065540305"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground hover:underline"
                >
                  +242 065 540 305
                </a>
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
                <p className="text-sm text-muted-foreground">Lun - Sam : 8h00 à 18h00</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Formulaire de contact */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Envoyez-nous un message</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name" className="text-foreground">Nom complet</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jean Kabongo" />
            </div>

            <div>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jean@example.com" />
            </div>

            <div>
              <Label htmlFor="subject" className="text-foreground">Sujet</Label>
              <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Comment puis-je vous aider ?" />
            </div>

            <div>
              <Label htmlFor="message" className="text-foreground">Message</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Décrivez votre demande..." />
            </div>

            <Button className="w-full" size="lg" type="submit">Envoyer le message</Button>

            {sent && (
              <p className="text-center text-green-500 text-sm mt-2">✅ Votre message a été envoyé avec succès !</p>
            )}
          </form>
        </Card>

        {/* Réseaux sociaux */}
        <Card className="p-6 text-center">
          <h2 className="text-lg font-semibold mb-3">Suivez-nous</h2>
          <div className="flex justify-center gap-6 text-muted-foreground">
            <a href="https://facebook.com/pimobilepay" target="_blank" className="hover:text-blue-500" rel="noopener noreferrer">
              <Facebook />
            </a>
            <a href="https://instagram.com/pimobilepay" target="_blank" className="hover:text-pink-500" rel="noopener noreferrer">
              <Instagram />
            </a>
            <a href="https://twitter.com/pimobilepay" target="_blank" className="hover:text-sky-400" rel="noopener noreferrer">
              <Twitter />
            </a>
          </div>
        </Card>

        {/* Carte de localisation */}
        <Card className="p-3 overflow-hidden">
          <iframe
            title="Carte PimPay"
            src="https://www.google.com/maps?q=Kinshasa,+RDC&output=embed"
            width="100%"
            height="250"
            loading="lazy"
            className="rounded-xl border-none"
          ></iframe>
        </Card>
      </div>

      <BottomNav />
    </div>
  )
}
