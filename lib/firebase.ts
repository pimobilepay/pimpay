import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

// Initialisation sécurisée
let app: FirebaseApp;

if (getApps().length === 0) {
  // On initialise avec une valeur vide si les clés manquent au build
  // pour éviter le crash (app/no-app)
  app = initializeApp(firebaseConfig.apiKey ? firebaseConfig : { apiKey: "dummy" });
} else {
  app = getApp();
}

export const auth: Auth = getAuth(app);
