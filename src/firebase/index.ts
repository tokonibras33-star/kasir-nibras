'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage';

// Singleton instance untuk mencegah re-initialization error dan menjaga stabilitas
let firestoreInstance: Firestore | null = null;

/**
 * Menginisialisasi aplikasi Firebase dan mengembalikan instance layanan yang diperlukan.
 */
export function initializeFirebase() {
  const app = getApps().length === 0 
    ? initializeApp(firebaseConfig) 
    : getApp();

  return getSdks(app);
}

/**
 * Mengambil instance layanan Firebase (Auth, Firestore, Storage).
 */
export function getSdks(firebaseApp: FirebaseApp) {
  if (!firestoreInstance) {
    try {
<<<<<<< HEAD
      // Mengaktifkan long polling untuk stabilitas maksimal di lingkungan cloud/proxy
      firestoreInstance = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
=======
      // Mengaktifkan long polling dan menonaktifkan streams untuk stabilitas maksimal di lingkungan cloud/proxy
      firestoreInstance = initializeFirestore(firebaseApp, {
        experimentalForceLongPolling: true,
        useFetchStreams: false,
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
      });
    } catch (e) {
      // Fallback jika instance sudah ada atau terjadi kegagalan inisialisasi eksplisit
      firestoreInstance = getFirestore(firebaseApp);
    }
  }

  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: firestoreInstance,
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
