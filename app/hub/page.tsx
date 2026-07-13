import { Metadata } from 'next'
import PimPayHub from '@/components/PimPayHub'

export const metadata: Metadata = {
  title: 'PIMOBIPAY Hub - Agent Dashboard',
  description: 'Financial agent dashboard for PIMOBIPAY partners. Manage float balance, process transactions, and track commissions.',
}

export default function HubPage() {
  return <PimPayHub />
}
