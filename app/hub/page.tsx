import { Metadata } from 'next'
import PimPayHub from '@/components/PimPayHub'

export const metadata: Metadata = {
  title: 'PimPay Hub - Agent Dashboard',
  description: 'Financial agent dashboard for PimPay partners. Manage float balance, process transactions, and track commissions.',
}

export default function HubPage() {
  return <PimPayHub />
}
