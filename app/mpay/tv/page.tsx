import type { Metadata } from 'next'
import { TVSubscriptionFlow } from '@/components/mpay/tv-subscription-flow'
export const metadata: Metadata = { title: 'Abonnements TV | PIMOBIPAY', description: 'Gérez votre abonnement TV depuis MPAY.' }
export default function TVPage() { return <TVSubscriptionFlow /> }
