const isMissingEnv = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (isMissingEnv && typeof window !== "undefined") {
  console.error(
    "[FIREBASE] NEXT_PUBLIC_FIREBASE_API_KEY belum diset di Environment Variables (Vercel / .env.local)."
  );
}

export const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "missing-project-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:000000000000:web:0000000000000000000000",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-api-key-set-in-vercel-env",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "missing-project-id.firebaseapp.com",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "missing-project-id.firebasestorage.app",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
};
