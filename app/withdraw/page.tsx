"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import BottomNav from "@/components/bottom-nav"
import { ArrowLeft, Banknote, Smartphone, Landmark } from "lucide-react"
import Link from "next/link"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

//
//  🔥  DATABASE : WORLD COUNTRIES + MOBILE OPERATORS + BANKS
//

const worldCountries = [
  {
    code: "CD",
    name: "République Démocratique du Congo",
    dialCode: "+243",
    currency: "CDF",
    mobileOperators: ["Airtel Money", "M-Pesa", "Orange Money"],
    banks: ["RawBank", "Equity Bank", "Ecobank", "FBN Bank"]
  },
  {
    code: "CM",
    name: "Cameroun",
    dialCode: "+237",
    currency: "XAF",
    mobileOperators: ["MTN Mobile Money", "Orange Money"],
    banks: ["Afriland First Bank", "UBA", "Ecobank"]
  },
  {
    code: "NG",
    name: "Nigeria",
    dialCode: "+234",
    currency: "NGN",
    mobileOperators: ["Airtel Money", "MTN MoMo", "9Mobile"],
    banks: ["GTBank", "UBA", "First Bank", "Zenith Bank"]
  },
  {
    code: "US",
    name: "États-Unis",
    dialCode: "+1",
    currency: "USD",
    mobileOperators: ["PayPal Mobile", "CashApp"],
    banks: ["Chase", "Bank of America", "Wells Fargo", "CitiBank"]
  },
  {
    code: "FR",
    name: "France",
    dialCode: "+33",
    currency: "EUR",
    mobileOperators: ["Orange", "SFR", "Bouygues"],
    banks: ["BNP Paribas", "Crédit Agricole", "Société Générale"]
  },
  {
    code: "KE",
    name: "Kenya",
    dialCode: "+254",
    currency: "KES",
    mobileOperators: ["M-Pesa (Safaricom)", "Airtel Money"],
    banks: ["Equity Bank", "KCB Bank", "Cooperative Bank"]
  },
  {
    code: "IN",
    name: "Inde",
    dialCode: "+91",
    currency: "INR",
    mobileOperators: ["Airtel Money", "JioMoney"],
    banks: ["ICICI Bank", "HDFC Bank", "State Bank of India"]
  },
  // 👉 Je peux te fournir le dataset COMPLET (240 pays) à part si tu veux
]

export default function WithdrawPage() {
  const [method, setMethod] = useState("mobile")
  const [selectedCountry, setSelectedCountry] = useState(worldCountries[0])
  const [selectedOperator, setSelectedOperator] = useState("")
  const [selectedBank, setSelectedBank] = useState("")
  const [recipient, setRecipient] = useState("")
  const [bankAccount, setBankAccount] = useState("")
  const [amount, setAmount] = useState("")

  const piPrice = 314159
  const piAmount = amount ? (Number(amount) / piPrice).toFixed(6) : "0.000000"

  return (
    <div className="min-h-screen bg-background pb-24">

      {/* HEADER PREMIUM */}
      <div className="
        px-4 py-6 
        bg-gradient-to-br 
        from-gray-100 via-gray-50 to-gray-200 
        dark:from-gray-900 dark:via-gray-950 dark:to-black
        border-b border-border
        backdrop-blur-xl
      ">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-black/5 dark:hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl font-bold">Retrait</h1>
            <p className="text-muted-foreground text-sm">Retirer vos Pi coins</p>
          </div>
        </div>

        {/* METHOD TABS */}
        <div className="flex gap-3 mt-3">
          <Button
            onClick={() => setMethod("mobile")}
            className={`flex-1 rounded-xl ${
              method === "mobile"
                ? "premium-button"
                : "bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-border"
            }`}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Mobile Money
          </Button>

          <Button
            onClick={() => setMethod("bank")}
            className={`flex-1 rounded-xl ${
              method === "bank"
                ? "premium-button"
                : "bg-white/40 dark:bg-white/10 backdrop-blur-xl border border-border"
            }`}
          >
            <Landmark className="h-4 w-4 mr-2" />
            Banque
          </Button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-4 py-6 space-y-6">

        {/* INTRO CARD */}
        <Card className="premium-card rounded-2xl">
          <CardContent className="p-5 flex gap-3 items-center">
            <Banknote className="h-10 w-10 text-yellow-500 dark:text-yellow-300" />
            <div>
              <p className="font-semibold text-lg">Retrait Premium</p>
              <p className="text-sm text-muted-foreground">
                Taux automatique, traitement rapide, support international.
              </p>
            </div>
          </CardContent>
        </Card>

        {method === "mobile" && (
          <>
            {/* MOBILE MONEY SECTION */}
            <Card className="premium-card p-6 rounded-2xl">
              <CardContent className="space-y-4 p-0">

                {/* COUNTRY SELECT */}
                <div>
                  <Label>Pays</Label>
                  <Select
                    value={selectedCountry.code}
                    onValueChange={(code) =>
                      setSelectedCountry(worldCountries.find((c) => c.code === code)!)
                    }
                  >
                    <SelectTrigger className="premium-input mt-1.5">
                      <SelectValue placeholder="Sélectionner le pays" />
                    </SelectTrigger>
                    <SelectContent>
                      {worldCountries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* OPERATOR */}
                <div>
                  <Label>Opérateur Mobile Money</Label>
                  <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                    <SelectTrigger className="premium-input mt-1.5">
                      <SelectValue placeholder="Choisir l'opérateur" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCountry.mobileOperators.map((op) => (
                        <SelectItem key={op} value={op}>{op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* PHONE */}
                <div>
                  <Label>Numéro</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input value={selectedCountry.dialCode} disabled className="premium-input w-24" />
                    <Input
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      placeholder="Numéro du destinataire"
                      className="premium-input flex-1"
                    />
                  </div>
                </div>

                {/* AMOUNT */}
                <div>
                  <Label>Montant (USD)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="premium-input mt-1.5"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    Montant en PI :{" "}
                    <span className="text-yellow-600 dark:text-yellow-300 font-semibold">
                      π {piAmount}
                    </span>
                  </p>
                </div>

                <Button className="premium-button w-full mt-2">
                  Confirmer le retrait
                </Button>

              </CardContent>
            </Card>
          </>
        )}

        {method === "bank" && (
          <>
            {/* BANK SECTION */}
            <Card className="premium-card p-6 rounded-2xl">
              <CardContent className="space-y-4 p-0">

                {/* COUNTRY */}
                <div>
                  <Label>Pays de la banque</Label>
                  <Select
                    value={selectedCountry.code}
                    onValueChange={(code) =>
                      setSelectedCountry(worldCountries.find((c) => c.code === code)!)
                    }
                  >
                    <SelectTrigger className="premium-input mt-1.5">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      {worldCountries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* BANK */}
                <div>
                  <Label>Banque</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger className="premium-input mt-1.5">
                      <SelectValue placeholder="Sélectionner la banque" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedCountry.banks.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* ACCOUNT NUMBER */}
                <div>
                  <Label>Numéro de compte bancaire</Label>
                  <Input
                    value={bankAccount}
                    onChange={(e) => setBankAccount(e.target.value)}
                    placeholder="Numéro de compte"
                    className="premium-input mt-1.5"
                  />
                </div>

                {/* AMOUNT */}
                <div>
                  <Label>Montant (USD)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="premium-input mt-1.5"
                  />
                </div>

                <p className="text-sm text-muted-foreground mt-1">
                  Conversion en PI :{" "}
                  <span className="text-yellow-600 dark:text-yellow-300 font-semibold">
                    π {piAmount}
                  </span>
                </p>

                <Button className="premium-button w-full mt-2">
                  Retirer vers la banque
                </Button>

              </CardContent>
            </Card>
          </>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
