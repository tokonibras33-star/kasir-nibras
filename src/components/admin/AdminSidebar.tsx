
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Package, 
  Database, 
  Receipt, 
  BarChart3, 
  LogOut,
  Shirt,
  ChevronDown,
  ClipboardCheck,
  Percent,
  Settings,
  Wallet,
  RotateCcw,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useState, useMemo } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Image from "next/image";

interface AdminSidebarProps {
  onNavItemClick?: () => void;
}

interface NavItem {
  label: string;
  icon: any;
  href: string;
  isExpandable?: boolean;
  stateKey?: string;
  subItems?: { label: string; href: string }[];
  allowedRoles: string[];
}

const LOGO_URL = "https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png";

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard", allowedRoles: ["ADMIN", "OWNER"] },
  { label: "Katalog Produk", icon: Package, href: "/admin/products", allowedRoles: ["ADMIN", "OWNER"] },
  { 
    label: "Stok Toko", 
    icon: Database, 
    href: "/admin/stock",
    isExpandable: true,
    stateKey: "stok",
    allowedRoles: ["ADMIN", "OWNER", "KASIR_TOKO_A", "KASIR_TOKO_B", "KASIR_TOKO_C"],
    subItems: [
      { label: "Semua Stok", href: "/admin/stock" },
      { label: "Stok NHS KWT", href: "/admin/stock/toko-a" },
      { label: "Stok IND CO", href: "/admin/stock/toko-b" },
      { label: "Stok NHS GDM", href: "/admin/stock/toko-c" },
    ]
  },
  { 
    label: "Stock Opname", 
    icon: ClipboardCheck, 
    href: "/admin/stock-opname",
    isExpandable: true,
    stateKey: "opname",
    allowedRoles: ["ADMIN", "OWNER"],
    subItems: [
      { label: "Opname NHS KWT", href: "/admin/stock-opname/toko-a" },
      { label: "Opname IND CO", href: "/admin/stock-opname/toko-b" },
      { label: "Opname NHS GDM", href: "/admin/stock-opname/toko-c" },
    ]
  },
  { 
    label: "Transaksi", 
    icon: Receipt, 
    href: "/owner/transactions",
    isExpandable: true,
    stateKey: "transaksi",
    allowedRoles: ["OWNER"],
    subItems: [
      { label: "Semua Toko", href: "/owner/transactions/semua-toko" },
      { label: "Rincian NHS KWT", href: "/owner/transactions/toko-a" },
      { label: "Rincian IND CO", href: "/owner/transactions/toko-b" },
      { label: "Rincian NHS GDM", href: "/owner/transactions/toko-c" },
      { label: "Histori Retur", href: "/owner/transactions/returns" },
      { label: "Histori DP", href: "/owner/transactions/dp" },
    ]
  },
  {
    label: "Kas Kasir",
    icon: Wallet,
    href: "/owner/cash-reports",
    allowedRoles: ["OWNER"]
  },
  { 
    label: "Pelanggan Diskon", 
    icon: Percent, 
    href: "/admin/discounts",
    isExpandable: true,
    stateKey: "discounts",
    allowedRoles: ["ADMIN", "OWNER"],
    subItems: [
      { label: "Database Member", href: "/admin/members" },
      { label: "Kupon Diskon", href: "/admin/coupons" },
      { label: "Agen Diskon", href: "/admin/agents" },
    ]
  },
  { label: "Laporan", icon: BarChart3, href: "/admin/reports", allowedRoles: ["ADMIN", "OWNER"] },
  { label: "Seting", icon: Settings, href: "/owner/settings", allowedRoles: ["OWNER"] },
];

export function AdminSidebar({ onNavItemClick }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const filteredNavItems = useMemo(() => {
    if (!user) return [];
    return navItems
      .filter(item => item.allowedRoles.includes(user.role))
      .map(item => {
        if (item.subItems && user.role.startsWith("KASIR_")) {
          const myStoreLabel = user.role === "KASIR_TOKO_A" ? "NHS KWT" : user.role === "KASIR_TOKO_B" ? "IND CO" : "NHS GDM";
          return {
            ...item,
            subItems: item.subItems.filter(sub => sub.label.includes(myStoreLabel))
          };
        }
        return item;
      });
  }, [user]);

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    stok: pathname.startsWith("/admin/stock"),
    opname: pathname.startsWith("/admin/stock-opname"),
    transaksi: pathname.startsWith("/owner/transactions"),
    discounts: pathname.startsWith("/admin/members") || pathname.startsWith("/admin/coupons") || pathname.startsWith("/admin/agents")
  });

  const toggleMenu = (key: string) => {
    setOpenMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="h-full w-full bg-sidebar border-r flex flex-col">
      <div className="p-6 hidden md:block">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 p-1 rounded-lg overflow-hidden flex items-center justify-center min-w-[40px] min-h-[40px] relative border border-primary/10">
            <Image 
              src={LOGO_URL} 
              alt="Logo" 
              width={36} 
              height={36} 
              className="object-contain" 
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-xl font-headline tracking-tight text-foreground leading-none">
              Nibras House
            </span>
            <span className="text-[10px] font-black text-primary mt-1 uppercase tracking-widest">
              {user?.role.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          if (item.isExpandable) {
            const isOpen = openMenus[item.stateKey!];
            const isActiveGroup = pathname.startsWith(item.href) || (item.subItems?.some(sub => pathname === sub.href));
            
            return (
              <Collapsible
                key={item.href}
                open={isOpen}
                onOpenChange={() => toggleMenu(item.stateKey!)}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between px-3 py-2.5 h-auto font-medium transition-colors",
                      isActiveGroup
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {item.subItems?.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      onClick={onNavItemClick}
                      className={cn(
                        "flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors",
                        pathname === sub.href
                          ? "text-primary bg-primary/5"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavItemClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Button 
          variant="ghost" 
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5"
          onClick={() => {
            logout().then(() => {
              window.location.href = "/login";
            });
          }}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Keluar
        </Button>
      </div>
    </div>
  );
}
