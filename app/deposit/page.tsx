"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import BottomNav from "@/components/bottom-nav"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Smartphone,
  ArrowLeft,
  CreditCard,
  Bitcoin,
  Wallet
} from "lucide-react"
import Link from "next/link"

import { worldCountries, type WorldCountry } from "@/lib/world-countries"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"

export default function DepositPage() {
  const [amount, setAmount] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<WorldCountry>(worldCountries[0])
  const [selectedOperator, setSelectedOperator] = useState("")
  const [phone, setPhone] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [piWallet, setPiWallet] = useState("")

  const piPrice = 314159
  const piAmount = amount ? (Number(amount) / piPrice).toFixed(6) : "0.000000"

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* HEADER PREMIUM */}
      <div className="
        px-4 py-6 
        bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200 
        dark:from-gray-900 dark:via-gray-950 dark:to-black
        border-b border-border backdrop-blur-xl
      ">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button size="icon" variant="ghost" className="rounded-xl hover:bg-black/5 dark:hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl font-bold">Dépôt</h1>
            <p className="text-muted-foreground text-sm">Ajouter des fonds</p>
          </div>
        </div>

        {/* TABS */}
        <Tabs defaultValue="mobile" className="mt-4">
          <TabsList className="grid grid-cols-3 bg-white/40 dark:bg-white/10 backdrop-blur-xl rounded-2xl border">
            <TabsTrigger value="mobile" className="gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Money
            </TabsTrigger>
            <TabsTrigger value="card" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Carte
            </TabsTrigger>
            <TabsTrigger value="pi" className="gap-2">
              <Bitcoin className="h-4 w-4" />
              PI Network
            </TabsTrigger>
          </TabsList>

          {/* ——————————————————————— */}
          {/* MOBILE MONEY */}
          <TabsContent value="mobile" className="mt-6">
            <Card className="premium-card p-6 rounded-2xl">
              <CardContent className="space-y-4 p-0">

                {/* Country */}
                <div>
                  <Label>Pays</Label>
                  <Select
                    value={selectedCountry.code}
                    onValueChange={(code) => setSelectedCountry(worldCountries.find(c => c.code === code)!)}
                  >
                    <SelectTrigger className="premium-input mt-1.5">
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {worldCountries.map((c) => (
                        <SelectItem value={c.code} key={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Operator */}
                <div>
                  <Label>Opérateur Mobile Money</Label>
                  <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                    <SelectTrigger className="premium-input mt-1.5">
                      <SelectValue placeholder="Choisir opérateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCountry.mobileOperators.map((op) => (
                        <SelectItem value={op} key={op}>{op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Phone */}
                <div>
                  <Label>Numéro Mobile Money</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input value={selectedCountry.dialCode} disabled className="premium-input w-24" />
                    <Input
                      placeholder="Numéro"
                      className="premium-input flex-1"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <Label>Montant (USD)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="premium-input mt-1.5"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />

                  {amount && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Vous recevrez : <span className="text-yellow-600 dark:text-yellow-300">π {piAmount}</span>
                    </p>
                  )}
                </div>

                <Button className="premium-button w-full mt-2">
                  Continuer
                </Button>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ——————————————————————— */}
          {/* CARD PAYMENT */}
          <TabsContent value="card" className="mt-6">
            <Card className="premium-card p-6 rounded-2xl">
              <CardContent className="space-y-4 p-0">

                <div>
                  <Label>Nom sur la carte</Label>
                  <Input
                    placeholder="EX: JEAN KABONGO"
                    className="premium-input mt-1.5"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Numéro de carte</Label>
                  <Input
                    placeholder="1234 5678 9012 3456"
                    className="premium-input mt-1.5"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date d'expiration</Label>
                    <Input
                      placeholder="MM/AA"
                      className="premium-input mt-1.5"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>CVV</Label>
                    <Input
                      placeholder="123"
                      className="premium-input mt-1.5"
                      maxLength={3}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label>Montant (USD)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="premium-input mt-1.5"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  {amount && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Conversion : <span className="font-semibold text-yellow-500">π {piAmount}</span>
                    </p>
                  )}
                </div>

                <Button className="premium-button w-full mt-2">
                  Payer par carte
                </Button>

              </CardContent>
            </Card>
          </TabsContent>

          {/* ——————————————————————— */}
          {/* PI NETWORK */}
          <TabsContent value="pi" className="mt-6">
            <Card className="premium-card p-6 rounded-2xl">
              <CardContent className="space-y-4 p-0">

                <div>
                  <Label>Adresse portefeuille PI</Label>
                  <Input
                    placeholder="Votre adresse PI"
                    className="premium-input mt-1.5"
                    value={piWallet}
                    onChange={(e) => setPiWallet(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Montant (USD)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    className="premium-input mt-1.5"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                {amount && (
                  <p className="text-sm text-muted-foreground">
                    Conversion : <span className="text-yellow-500 font-semibold">π {piAmount}</span>
                  </p>
                )}

                <Button className="premium-button w-full mt-2">
                  Continuer avec PI Network
                </Button>

              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>

      </div>

      <BottomNav />
    </div>
  )
}
