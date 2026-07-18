// lib/elara-web-search.ts
// -----------------------------------------------------------------------------
// ALGORITHME N°1 : recherche sur d'autres plateformes / le web.
//
// Permet à Elara de chercher une information en dehors de PimPay quand ni la
// base de connaissances (lib/elara-brain.ts) ni la recherche interne
// (lib/elara-platform-search.ts) n'ont de réponse — par exemple des questions
// générales sur Pi Network, une blockchain, un taux de change, etc.
//
// Utilise l'API Tavily (https://tavily.com), pensée pour la recherche
// assistée par IA (résultats déjà nettoyés, pas de scraping HTML à gérer).
//
// ⚠️ CONFIGURATION REQUISE : ajoutez `TAVILY_API_KEY` dans les variables
// d'environnement (Vercel → Project Settings → Environment Variables) pour
// activer cette fonctionnalité. Sans cette clé, la fonction renvoie
// simplement `null` — Elara continue alors avec ses autres sources, sans
// jamais planter ni bloquer une réponse.
// -----------------------------------------------------------------------------

export interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function searchWeb(query: string, maxResults = 4): Promise<WebSearchResult[] | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey || !query.trim()) return null;

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: maxResults,
        include_answer: false,
      }),
      // Ne bloque jamais la conversation trop longtemps : au-delà de 8s, on
      // abandonne la recherche web et on retombe sur le reste du pipeline.
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.error("[v0] ELARA_WEB_SEARCH_HTTP_ERROR:", res.status);
      return null;
    }

    const data = await res.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    if (results.length === 0) return null;

    return results.slice(0, maxResults).map((r: Record<string, unknown>) => ({
      title: String(r.title || "").slice(0, 200),
      snippet: String(r.content || "").slice(0, 400),
      url: String(r.url || ""),
    }));
  } catch (error) {
    console.error("[v0] ELARA_WEB_SEARCH_ERROR:", (error as Error)?.message);
    return null;
  }
}

/** Met en forme des résultats de recherche web en un court texte lisible. */
export function formatWebResults(results: WebSearchResult[]): string {
  return results
    .map((r, i) => `${i + 1}. ${r.title}\n${r.snippet}\n${r.url}`)
    .join("\n\n");
}
