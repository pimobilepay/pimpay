type ReloadlyProduct = {
  operatorId: number;
  name: string;
};

async function requestReloadlyToken(audience: string) {
  const clientId = process.env.RELOADLY_CLIENT_ID;
  const clientSecret = process.env.RELOADLY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Reloadly n'est pas encore configuré");

  const response = await fetch("https://auth.reloadly.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      audience,
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Authentification Reloadly impossible");
  const data = await response.json();
  return data.access_token as string;
}

export async function getReloadlyToken() {
  return requestReloadlyToken("https://giftcards.reloadly.com");
}

export async function getReloadlyAirtimeToken() {
  return requestReloadlyToken("https://topups.reloadly.com");
}

export async function findReloadlyOperator(countryCode: string, operatorName: string) {
  const token = await getReloadlyAirtimeToken();
  const response = await fetch(
    `https://topups.reloadly.com/operators/countries/${encodeURIComponent(countryCode)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
  );
  if (!response.ok) throw new Error("Opérateurs Reloadly indisponibles");

  const operators = (await response.json()) as ReloadlyProduct[];
  const normalizedName = operatorName.trim().toLowerCase();
  const operator = operators.find((item) => item.name.trim().toLowerCase() === normalizedName)
    ?? operators.find((item) => item.name.toLowerCase().includes(normalizedName) || normalizedName.includes(item.name.toLowerCase()));

  if (!operator) throw new Error("Opérateur mobile introuvable chez Reloadly");
  return { token, operatorId: operator.operatorId };
}

export async function sendReloadlyTopup({
  token,
  operatorId,
  amount,
  recipientPhone,
  customIdentifier,
}: {
  token: string;
  operatorId: number;
  amount: number;
  recipientPhone: string;
  customIdentifier: string;
}) {
  const response = await fetch("https://topups.reloadly.com/topups", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ operatorId, amount, useLocalAmount: false, recipientPhone, customIdentifier }),
  });
  if (!response.ok) throw new Error("La recharge Reloadly a été refusée");
  return response.json();
}

export function getReloadlyCountryCode(countryName: string) {
  const codes: Record<string, string> = { "République démocratique du Congo": "CD", "Congo": "CG" };
  return codes[countryName] ?? countryName;
}
