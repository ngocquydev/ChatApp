import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    process.env.VITE_FIREBASE_APP_ID,
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
