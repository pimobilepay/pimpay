import { getServices, providerConfig } from '@/lib/tv/types'
export async function GET(request: Request) { const country = new URL(request.url).searchParams.get('country')?.slice(0, 2) || ''; return Response.json({ services: getServices(country), ...providerConfig() }) }
