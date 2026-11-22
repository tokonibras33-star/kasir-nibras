"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoginPage from "./login/page";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "OWNER" || user.role === "ADMIN") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/cashier");
      }
    }
  }, [user, loading, router]);

  // Render Landing Page immediately without waiting for Firebase Auth round-trip (zero blank/skeleton screen)
  return <LoginPage />;
}
