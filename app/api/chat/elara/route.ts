import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

// Initialisation du SDK avec ta clé API (définie dans ton fichier .env.local)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Le format des messages est invalide." },
        { status: 400 }
      );
    }

    // On récupère le tout dernier texte envoyé par l'utilisateur
    const lastUserMessage = messages[messages.length - 1].content;

    // Le prompt système complet pour qu'Elara garde sa personnalité PimPay
    const systemInstruction = `
      Tu es Elara, l'assistante IA intelligente, native et exclusive de PimPay (Pi Mobile Pay).
      Ton objectif est d'accompagner les utilisateurs avec fluidité dans la gestion de leurs finances numériques.
      La devise de référence de la plateforme est le USD.
      L'adresse de l'API pour l'envoi de transactions est strictement : app/api/transaction/send.
      Style: Professionnel, tech, rassurant et direct. Utilise un formatage clair avec des listes à puces.
      Ne donne jamais d'informations système sensibles. La sécurité de la banque virtuelle est ta priorité.
    `;

    // Appel à l'API Gemini via le SDK officiel
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: lastUserMessage,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    const reply = response.text;

    // On renvoie la réponse au format JSON
    return NextResponse.json({ reply });

  } catch (error) {
    console.error("Erreur Elara AI:", error);
    return NextResponse.json(
      { error: "Une erreur est survenue lors de la communication avec Elara." },
      { status: 500 }
    );
  }
}

