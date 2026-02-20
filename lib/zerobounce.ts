export async function verifyEmail(email: string) {
  const apiKey = process.env.ZEROBOUNCE_API_KEY;
  const url = `https://api.zerobounce.net/v2/validate?api_key=${apiKey}&email=${encodeURIComponent(email)}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    // On considère l'email valide seulement si le statut est "valid"
    return {
      isValid: data.status === "valid",
      status: data.status,
      subStatus: data.sub_status,
      data: data
    };
  } catch (error) {
    console.error("Erreur ZeroBounce:", error);
    return { isValid: false, status: "error" };
  }
}
