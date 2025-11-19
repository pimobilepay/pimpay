// createWallet.ts (client)
async function createWallet() {
  const r = await fetch("/api/pi/create-wallet", { method: "POST" });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// usage in a page
createWallet().then(data => {
  console.log("wallet created", data.walletId, data.publicKey);
  // afficher publicKey et walletId à l'utilisateur
});
