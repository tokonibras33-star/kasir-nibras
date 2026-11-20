"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OwnerReportsIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/owner/reports/sales");
  }, [router]);

  return null;
}
