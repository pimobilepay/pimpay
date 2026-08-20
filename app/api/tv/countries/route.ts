import { TV_COUNTRIES, providerConfig } from '@/lib/tv/types'
export async function GET() { return Response.json({ countries: TV_COUNTRIES, ...providerConfig() }) }
