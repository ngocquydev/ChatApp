import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    process.env.VITE_FIREBASE_API_KEY ||
    "",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    "",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    process.env.VITE_FIREBASE_APP_ID ||
    "",
  measurementId:
    process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
    process.env.VITE_FIREBASE_MEASUREMENT_ID,
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

let authInstance: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    const instance = getFirebaseAuth();
    const value = Reflect.get(instance, prop);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

export const googleProvider = new GoogleAuthProvider();
export const facebookProvider = new FacebookAuthProvider();
