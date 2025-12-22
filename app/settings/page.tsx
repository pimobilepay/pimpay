"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BottomNav } from "@/components/bottom-nav"
import { ArrowLeft, Bell, Lock, Globe, HelpCircle, LogOut, Shield } from "lucide-react"
import Link from "next/link"

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-6">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Paramètres</h1>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Account Settings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">COMPTE</h3>
          <Card className="divide-y divide-border">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-foreground">Notifications</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
              <Lock className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-foreground">Sécurité</span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-foreground">Confidentialité</span>
            </button>
          </Card>
        </div>

        {/* App Settings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">APPLICATION</h3>
          <Card className="divide-y divide-border">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
              <Globe className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-foreground">Langue</span>
              <span className="text-sm text-muted-foreground">Français</span>
            </button>
          </Card>
        </div>

        {/* Support */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-2">SUPPORT</h3>
          <Card className="divide-y divide-border">
            <button className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-left font-medium text-foreground">Centre d'aide</span>
            </button>
          </Card>
        </div>

        {/* Logout */}
        <Button variant="destructive" className="w-full" size="lg">
          <LogOut className="h-4 w-4 mr-2" />
          Se déconnecter
        </Button>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-4">
          <p>Pimpay v1.0.0</p>
          <p className="mt-1">© 2025 Pimpay. Tous droits réservés.</p>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
