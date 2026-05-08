"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ReportsRedirect() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === "OWNER") {
      router.replace("/owner/reports/sales");
    } else {
      router.replace("/admin/reports/sales");
    }
  }, [router, user]);

  return null;
}
