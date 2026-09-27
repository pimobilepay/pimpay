export async function getReloadlyToken() {
  const clientId = process.env.RELOADLY_CLIENT_ID;
  const clientSecret = process.env.RELOADLY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Reloadly n'est pas encore configuré");
  const response = await fetch("https://auth.reloadly.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials", audience: "https://giftcards.reloadly.com" }), cache: "no-store" });
  if (!response.ok) throw new Error("Authentification Reloadly impossible");
  return (await response.json()).access_token as string;
}
