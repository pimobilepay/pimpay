import type { Metadata } from "next"
import MerchantShell from "@/components/merchant/MerchantShell"

export const metadata: Metadata = {
  title: "Espace marchand | PiMobiPay",
  description: "Gérez vos encaissements, transactions et boutique PiMobiPay.",
}

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
  return <MerchantShell>{children}</MerchantShell>
}
