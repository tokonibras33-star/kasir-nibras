
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useFirebase } from "@/firebase";
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export type UserRole = "ADMIN" | "OWNER" | "KASIR_TOKO_A" | "KASIR_TOKO_B" | "KASIR_TOKO_C";

interface User {
  uid: string;
  email: string | null;
  name: string;
  role: UserRole;
  associatedStoreId?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * DAFTAR KREDENSIAL RESMI (MASTER)
 * Catatan: Firebase Auth mewajibkan password minimal 6 karakter.
 */
const OFFICIAL_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  OWNER: { email: "owner@nibrashouse.id", pass: "123owner" },
  ADMIN: { email: "admin@nibrashouse.id", pass: "123admin" },
  KASIR_TOKO_A: { email: "nhskwt@kasir.id", pass: "nhskwt" },
  KASIR_TOKO_B: { email: "indco@kasir.id", pass: "indco123" }, // Diubah ke 6+ karakter agar valid di Firebase
  KASIR_TOKO_C: { email: "nhsgdm@kasir.id", pass: "nhsgdm" },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { auth, firestore } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(firestore, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: firebaseUser.uid,
              email: userData.email || null,
              name: userData.displayName || "USER",
              role: userData.role as UserRole,
              associatedStoreId: userData.associatedStoreId || null
            });
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("[AUTH] Gagal memuat profil sesi:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firestore]);

  const login = async (email: string, password: string, role: UserRole) => {
    setLoading(true);
    const normalizedEmail = email.toLowerCase().trim();
    
    try {
      // 1. Validasi terhadap Daftar Kredensial Resmi
      const official = OFFICIAL_CREDENTIALS[role];
      if (!official) throw new Error("Role tidak valid.");

      if (normalizedEmail !== official.email || password !== official.pass) {
        throw new Error("Email atau Password tidak cocok dengan daftar otoritas sistem.");
      }

      // 2. Bersihkan Sesi Sebelumnya
      await signOut(auth);

      // 3. Masuk ke Firebase Authentication
      let firebaseUser;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
        firebaseUser = userCredential.user;
      } catch (authError: any) {
        // Jika akun belum ada di Auth, daftarkan otomatis (karena sudah lolos cek official list)
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
            firebaseUser = userCredential.user;
          } catch (createError: any) {
            if (createError.code === 'auth/email-already-in-use') {
              throw new Error("Email sudah terdaftar dengan password berbeda di server. Hubungi Admin.");
            }
            if (createError.code === 'auth/weak-password') {
              throw new Error("Password terlalu lemah. Minimal harus 6 karakter.");
            }
            throw createError;
          }
        } else {
          throw authError;
        }
      }

      if (!firebaseUser) throw new Error("Gagal menginisialisasi sesi.");

      // 4. Update Profil Sesi di Firestore
      let storeId: string | null = null;
      if (role === "KASIR_TOKO_A") storeId = "TOKO_A";
      else if (role === "KASIR_TOKO_B") storeId = "TOKO_B";
      else if (role === "KASIR_TOKO_C") storeId = "TOKO_C";

      const sessionData = {
        uid: firebaseUser.uid,
        email: normalizedEmail,
        displayName: normalizedEmail.split("@")[0].toUpperCase(),
        role: role,
        associatedStoreId: storeId,
        lastLogin: serverTimestamp()
      };

      await setDoc(doc(firestore, "users", firebaseUser.uid), sessionData, { merge: true });
      
    } catch (error: any) {
      console.error("[LOGIN ERROR]:", error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout Error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
