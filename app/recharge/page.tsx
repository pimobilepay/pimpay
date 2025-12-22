"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { BottomNav } from "@/components/bottom-nav"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { CountrySelect } from "@/components/country-select"
import { countries, type Country } from "@/lib/country-data"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function RechargePage() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [amount, setAmount] = useState("")
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0],
  )
  const [selectedOperator, setSelectedOperator] = useState("")

  const piPrice = 314159.0
  const piAmount = amount ? (Number.parseFloat(amount) / piPrice).toFixed(6) : "0.000000"
  const localAmount = amount
    ? ((Number.parseFloat(amount) * selectedCountry.piToLocalRate) / piPrice).toFixed(2)
    : "0.00"

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-chart-3 via-accent to-primary text-white px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Recharge Mobile</h1>
            <p className="text-sm opacity-90">Rechargez votre crédit</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Info Card */}
        <Card className="p-4 bg-chart-3/5 border-chart-3/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-chart-3 to-accent flex items-center justify-center flex-shrink-0">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">Recharge avec Pi</p>
              <p className="text-sm text-muted-foreground">Rechargez votre crédit mobile en utilisant vos Pi coins</p>
            </div>
          </div>
        </Card>

        {/* Recharge Form */}
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
                Opérateur Mobile
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
              <Label htmlFor="phone" className="text-foreground">
                Numéro à recharger
              </Label>
              <div className="flex gap-2 mt-1.5">
                <Input type="text" value={selectedCountry.dialCode} disabled className="w-24 bg-muted" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Numéro de téléphone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
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
                <div className="space-y-1 mt-2">
                  <p className="text-sm text-muted-foreground">
                    Coût: <span className="font-semibold text-chart-3">π {piAmount}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Équivalent:{" "}
                    <span className="font-semibold text-accent">
                      {localAmount} {selectedCountry.currency}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button className="w-full bg-chart-3 hover:bg-chart-3/90 text-white" size="lg">
                Recharger
              </Button>
            </div>
          </div>
        </Card>

        {/* Quick Amounts */}
        <div>
          <Label className="text-foreground mb-3 block">Montants rapides</Label>
          <div className="grid grid-cols-4 gap-2">
            {["5", "10", "20", "50"].map((value) => (
              <Button key={value} variant="outline" onClick={() => setAmount(value)} className="h-12">
                ${value}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
