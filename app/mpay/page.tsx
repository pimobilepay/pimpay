"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BottomNav } from "@/components/bottom-nav"
import { ArrowLeft, Smartphone, Send, QrCode, History, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { CountrySelect } from "@/components/country-select"
import { countries, type Country } from "@/lib/country-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function MpayPage() {
  const [amount, setAmount] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0],
  )
  const [selectedOperator, setSelectedOperator] = useState("")
  const [recipientPhone, setRecipientPhone] = useState("")
  const [showBalance, setShowBalance] = useState(true)

  const piBalance = 1250.75
  const piPrice = 314159.0
  const piAmount = amount ? (Number.parseFloat(amount) / piPrice).toFixed(6) : "0.000000"

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-accent to-secondary text-primary-foreground px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">MPay</h1>
            <p className="text-sm opacity-90">Paiement mobile rapide</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-primary-foreground hover:bg-primary-foreground/20 rounded-full"
            onClick={() => setShowBalance(!showBalance)}
          >
            {showBalance ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </Button>
        </div>

        <Card className="bg-white/10 backdrop-blur-xl p-4 border-0 shadow-lg">
          <p className="text-xs text-primary-foreground/80 mb-1">Solde MPay</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary-foreground">
              {showBalance ? `π ${piBalance.toFixed(2)}` : "••••••"}
            </span>
          </div>
        </Card>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Info Card */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">MPay Mobile</p>
              <p className="text-sm text-muted-foreground">Payez et transférez avec votre mobile money</p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="send" className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Envoyer
            </TabsTrigger>
            <TabsTrigger value="scan" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Scanner
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          {/* Send Money Tab */}
          <TabsContent value="send" className="mt-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="country" className="text-foreground">
                    Pays
                  </Label>
                  <CountrySelect value={selectedCountry} onChange={setSelectedCountry} />
                </div>

                <div>
                  <Label htmlFor="operator" className="text-foreground">
                    Opérateur Mobile Money
                  </Label>
                  <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Sélectionner un opérateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCountry.mobileMoneyOperators.map((operator) => (
                        <SelectItem key={operator} value={operator}>
                          {operator}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="recipient" className="text-foreground">
                    Numéro du destinataire
                  </Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input type="text" value={selectedCountry.dialCode} disabled className="w-24 bg-muted" />
                    <Input
                      id="recipient"
                      type="tel"
                      placeholder="Numéro du destinataire"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="amount" className="text-foreground">
                    Montant (USD)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1.5"
                  />
                  {amount && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Équivalent: <span className="font-semibold text-primary">π {piAmount}</span>
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <Button className="w-full" size="lg">
                    Envoyer le paiement
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Scan QR Tab */}
          <TabsContent value="scan" className="mt-6">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Scanner un code QR</p>
                    <p className="text-xs text-muted-foreground mt-1">pour effectuer un paiement</p>
                  </div>
                </div>
                <Button className="w-full" size="lg">
                  Ouvrir le scanner
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card className="p-6">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center py-8">Aucune transaction récente</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium">Paiement rapide</p>
            </div>
          </Card>
          <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-2">
                <QrCode className="h-6 w-6 text-accent" />
              </div>
              <p className="text-sm font-medium">Mon QR Code</p>
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
