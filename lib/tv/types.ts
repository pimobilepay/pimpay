export type TVCountry = { code: string; name: string; flag: string }
export type TVService = { id: string; name: string; country: string; logo?: string; icon?: 'canal' | 'dstv' | 'startimes'; available: boolean }
export type TVPackage = { id: string; name: string; price: number; currency: string; duration: string; channels?: number }
export type TVSubscriber = { id: string; name: string; status: 'ACTIVE' | 'INACTIVE' | 'UNKNOWN' }
export type TVProvider = { verifySubscriber(input: { serviceId: string; subscriberNumber: string }): Promise<TVSubscriber>; getPackages(input: { serviceId: string; subscriberNumber: string }): Promise<TVPackage[]>; pay(input: { serviceId: string; subscriberNumber: string; packageId: string }): Promise<{ status: 'PENDING' | 'SUCCESS' | 'FAILED'; reference?: string }> }
export const TV_COUNTRIES: TVCountry[] = [{ code: 'CD', name: 'République démocratique du Congo', flag: 'CD' }, { code: 'CM', name: 'Cameroun', flag: 'CM' }, { code: 'CI', name: "Côte d'Ivoire", flag: 'CI' }, { code: 'SN', name: 'Sénégal', flag: 'SN' }]
export const TV_SERVICES: TVService[] = [{ id: 'canalplus', name: 'Canal+', country: 'CD', icon: 'canal', available: true }, { id: 'dstv', name: 'DStv', country: 'CM', icon: 'dstv', available: true }, { id: 'startimes', name: 'StarTimes', country: 'CD', icon: 'startimes', available: true }, { id: 'canalplus-ci', name: 'Canal+', country: 'CI', icon: 'canal', available: true }, { id: 'canalplus-sn', name: 'Canal+', country: 'SN', icon: 'canal', available: true }]
export const DEVELOPMENT_PACKAGES: TVPackage[] = [{ id: 'demo-essential', name: 'Essentiel', price: 0, currency: 'XAF', duration: '30 jours', channels: 80 }, { id: 'demo-premium', name: 'Premium', price: 0, currency: 'XAF', duration: '30 jours', channels: 150 }]
export const sanitizeSubscriber = (value: string) => value.trim().replace(/[^a-zA-Z0-9+_-]/g, '').slice(0, 64)
export const isDevelopmentMode = () => !process.env.MAISHAPAY_API_KEY || !process.env.MAISHAPAY_BASE_URL
export const providerConfig = () => ({ provider: process.env.TV_PROVIDER || 'maishapay', developmentMode: isDevelopmentMode() })

export function getServices(country: string) { return TV_SERVICES.filter((service) => service.country === country.toUpperCase()) }
export function isKnownPackage(id: string) { return DEVELOPMENT_PACKAGES.some((item) => item.id === id) }

export async function verifySubscriber(input: { serviceId: string; subscriberNumber: string }): Promise<TVSubscriber> {
  if (isDevelopmentMode()) return { id: input.subscriberNumber, name: 'Vérification indisponible en développement', status: 'UNKNOWN' }
  const response = await fetch(`${process.env.MAISHAPAY_BASE_URL}/tv/verify`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.MAISHAPAY_API_KEY}` }, body: JSON.stringify(input), signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('TV_PROVIDER_ERROR')
  return response.json()
}
export async function getPackages(input: { serviceId: string; subscriberNumber: string }): Promise<TVPackage[]> {
  if (isDevelopmentMode()) return DEVELOPMENT_PACKAGES
  const response = await fetch(`${process.env.MAISHAPAY_BASE_URL}/tv/packages`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.MAISHAPAY_API_KEY}` }, body: JSON.stringify(input), signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error('TV_PROVIDER_ERROR')
  return response.json()
}
export async function payTV(input: { serviceId: string; subscriberNumber: string; packageId: string }) { if (isDevelopmentMode()) return { status: 'PENDING' as const }; throw new Error('TV_PAYMENT_NOT_CONFIGURED') }
export async function requireTVAuth() { const { getAuthPayload } = await import('@/lib/auth'); const auth = await getAuthPayload(); if (!auth?.id) throw new Error('UNAUTHORIZED'); return auth }
export function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : 'TV_REQUEST_FAILED'; const status = message === 'UNAUTHORIZED' ? 401 : message.includes('NOT_CONFIGURED') ? 503 : 400; return Response.json({ error: message, ...providerConfig() }, { status }) }
