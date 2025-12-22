"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BottomNav } from "@/components/bottom-nav"
import { ArrowLeft, ArrowDownToLine, CreditCard, Smartphone, Bitcoin } from "lucide-react"
import Link from "next/link"
import { CountrySelect } from "@/components/country-select"
import { countries, type Country } from "@/lib/country-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import "flag-icons/css/flag-icons.min.css" // <-- Import flag-icons

export default function DepositPage() {
  const [amount, setAmount] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0],
  )
  const [selectedOperator, setSelectedOperator] = useState("")
  const [cardNumber, setCardNumber] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [cardName, setCardName] = useState("")
  const [selectedCrypto, setSelectedCrypto] = useState("")
  const [cryptoAddress, setCryptoAddress] = useState("")

  const piPrice = 314159.0
  const piAmount = amount ? (Number.parseFloat(amount) / piPrice).toFixed(6) : "0.000000"
  const localAmount = amount
    ? ((Number.parseFloat(amount) * selectedCountry.piToLocalRate) / piPrice).toFixed(2)
    : "0.00"

  const cryptoOptions = [
    { value: "BTC", label: "Bitcoin (BTC)", network: "Bitcoin Network" },
    { value: "BNB", label: "Binance Coin (BNB)", network: "BNB Smart Chain" },
    { value: "XRP", label: "Ripple (XRP)", network: "XRP Ledger" },
    { value: "XLM", label: "Stellar (XLM)", network: "Stellar Network" },
    { value: "USDT", label: "Tether (USDT)", network: "ERC-20 / TRC-20" },
    { value: "PI", label: "Pi Network (PI)", network: "Pi Network" },
  ]

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
          <div>
            <h1 className="text-2xl font-bold">Dépôt</h1>
            <p className="text-sm opacity-90">Déposer des Pi coins</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Info Card */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
              <ArrowDownToLine className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Dépôt sécurisé</p>
              <p className="text-sm text-muted-foreground">
                Effectuez un dépôt via Mobile Money, carte bancaire ou crypto
              </p>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="mobile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mobile" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Money
            </TabsTrigger>
            <TabsTrigger value="card" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Carte
            </TabsTrigger>
            <TabsTrigger value="crypto" className="flex items-center gap-2">
              <Bitcoin className="h-4 w-4" />
              Crypto
            </TabsTrigger>
          </TabsList>

          {/* Mobile Money Tab */}
          <TabsContent value="mobile" className="mt-6">
            <Card className="p-6 space-y-4">
              {/* Country */}
              <div>
                <Label htmlFor="country" className="text-foreground">Pays</Label>
                <CountrySelect value={selectedCountry} onChange={setSelectedCountry} />
              </div>

              {/* Operator */}
              <div>
                <Label htmlFor="operator" className="text-foreground">Opérateur Mobile Money</Label>
                <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Sélectionner un opérateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedCountry.mobileMoneyOperators.map((operator: any) => (
                      <SelectItem key={operator.providerCode || operator} value={operator.providerCode || operator} className="flex items-center gap-2">
                        {/* Flag */}
                        <span className={`fi fi-${selectedCountry.code.toLowerCase()}`}></span>
                        <span>{operator.name || operator}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Phone */}
              <div>
                <Label htmlFor="phone" className="text-foreground">Numéro de téléphone</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input type="text" value={selectedCountry.dialCode} disabled className="w-24 bg-muted" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Votre numéro"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Amount */}
              <div>
                <Label htmlFor="amount" className="text-foreground">Montant (USD)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1.5"
                />
                {amount && (
                  <div className="space-y-1 mt-2">
                    <p className="text-sm text-muted-foreground">
                      Vous recevrez: <span className="font-semibold text-primary">π {piAmount}</span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Équivalent:{" "}
                      <span className="font-semibold text-secondary">{localAmount} {selectedCountry.currency}</span>
                    </p>
                  </div>
                )}
              </div>

              <Button className="w-full mt-2" size="lg">Continuer</Button>
            </Card>
          </TabsContent>

          {/* Bank Card Tab */}
          <TabsContent value="card" className="mt-6">
            {/* ... le reste reste identique ... */}
          </TabsContent>

          {/* Crypto Tab */}
          <TabsContent value="crypto" className="mt-6">
            {/* ... le reste reste identique ... */}
          </TabsContent>
        </Tabs>
      </div>

      <BottomNav />
    </div>
  )
}
