import { getApp, getApps, initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Configuration is checked on submission, so missing deployment variables do
// not prevent customers from browsing the storefront.
let orderDatabase;
export function getFirebaseApp() {
  if (Object.values(firebaseConfig).some((value) => !value)) {
    const error = new Error(
      "Firebase environment configuration is incomplete.",
    );
    error.code = "app/missing-config";
    throw error;
  }
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getOrderDatabase() {
  if (orderDatabase) return orderDatabase;
  orderDatabase = getFirestore(getFirebaseApp());
  // Test runners opt into a local demo project. Production builds never use it.
  if (import.meta.env.DEV && import.meta.env.VITE_FIRESTORE_EMULATOR_HOST) {
    const [host, port] = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST.split(
      ":",
    );
    connectFirestoreEmulator(orderDatabase, host, Number(port));
  }
  return orderDatabase;
}
