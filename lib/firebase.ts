import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// On ajoute une vérification : si l'API_KEY est manquante, on n'initialise pas.
// Cela évite que Firebase ne crash pendant que Next.js analyse tes fichiers au build.
const app = (getApps().length === 0 && process.env.FIREBASE_API_KEY) 
  ? initializeApp(firebaseConfig) 
  : getApp();

export const auth = getAuth(app);
