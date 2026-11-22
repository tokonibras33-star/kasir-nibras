
"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import Image from "next/image";
import { jsPDF } from "jspdf";
import { applyPlugin } from "jspdf-autotable";

try {
  applyPlugin(jsPDF);
} catch {
  // Ignore if already registered
}

const LOGO_URL = "/hero/nibras-logo.jpg";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || (user.role !== "ADMIN" && user.role !== "OWNER" && !user.role.startsWith("KASIR_")))) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user || (user.role !== "ADMIN" && user.role !== "OWNER" && !user.role.startsWith("KASIR_"))) return null;

  return (
    <div className="min-h-screen bg-[#F5F3F0] flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 h-16 border-b border-neutral-200/70 bg-white/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="bg-white rounded-full w-9 h-9 flex items-center justify-center overflow-hidden relative border border-neutral-200 shadow-sm">
            <Image 
              src={LOGO_URL} 
              alt="Logo" 
              fill 
              className="object-cover" 
            />
          </div>
          <div className="flex flex-col">
            <span className="font-serif font-bold text-base tracking-tight text-neutral-950 leading-none">
              Nibras House
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#C82368] mt-1">
              {user.role.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full border-neutral-200 bg-white hover:bg-neutral-950 hover:text-white h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 border-r border-neutral-200">
            <SheetHeader className="sr-only">
              <SheetTitle>Menu Navigasi</SheetTitle>
            </SheetHeader>
            <AdminSidebar onNavItemClick={() => setIsMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 fixed inset-y-0 left-0 z-30">
        <AdminSidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 sm:p-6 md:p-8 min-w-0">
        <div className="max-w-7xl mx-auto pb-20 md:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
