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
    "dummy-api-key-for-build",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    process.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "dummy-project.firebaseapp.com",
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    "dummy-project",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "dummy-project.firebasestorage.app",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "000000000000",
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    process.env.VITE_FIREBASE_APP_ID ||
    "1:000000000000:web:0000000000000000000000",
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

// Proxy hỗ trợ backward compatibility cho `import { auth }`
// Khởi tạo trễ (Lazy init) để tránh lỗi invalid-api-key khi Next.js prerender / SSR tại build time
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
