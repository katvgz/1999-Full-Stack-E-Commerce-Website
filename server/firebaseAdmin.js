import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export function serverFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID || "clothing-98be8";
  if (projectId !== "clothing-98be8" || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Server Firebase credentials are not configured.");
  }
  // A key copied from service-account JSON can retain its quotes and comma
  // after dotenv parsing. Remove that wrapper without changing the PEM body.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.trim()
    .replace(/^(["'])([\s\S]*)\1,?$/, "$2")
    .replace(/\\n/g, "\n");
  const name = "1999-server";
  const app = getApps().find((candidate) => candidate.name === name) || initializeApp({
    projectId,
    credential: cert({ projectId, clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey }),
  }, name);
  return { auth: getAuth(app), db: getFirestore(app) };
}
