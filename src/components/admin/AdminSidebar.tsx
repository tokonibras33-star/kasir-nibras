
'use client';

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
  Clock,
  Store
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

const LOGO_URL = "/hero/nibras-logo.jpg";

const navItems: NavItem[] = [
  { label: "Terminal Kasir (POS)", icon: Store, href: "/cashier", allowedRoles: ["KASIR_TOKO_A", "KASIR_TOKO_B", "KASIR_TOKO_C"] },
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
      { label: "Histori Retur", href: "/owner/transactions/returns" },
      { label: "Histori DP", href: "/owner/transactions/dp" },
    ]
  },
  {
    label: "Kas Kasir",
    icon: Wallet,
    href: "/owner/cash-reports",
    isExpandable: true,
    stateKey: "kaskasir",
    allowedRoles: ["OWNER"],
    subItems: [
      { label: "Audit Kas Berjalan", href: "/owner/cash-reports" },
      { label: "Operasional Pengeluaran Toko", href: "/owner/expenses" },
    ]
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
      { label: "Agen Diskon", href: "/admin/agents" },
      { label: "Reseller Diskon", href: "/admin/resellers" },
      { label: "Kupon Diskon", href: "/admin/coupons" },
    ]
  },
  { 
    label: "Laporan", 
    icon: BarChart3, 
    href: "/owner/reports",
    isExpandable: true,
    stateKey: "reports_owner",
    allowedRoles: ["OWNER"],
    subItems: [
      { label: "Laporan Penjualan", href: "/owner/reports/sales" },
      { label: "Laporan Pembelian", href: "/owner/reports/purchases" },
      { label: "Laporan Pengeluaran", href: "/owner/reports/expenses" },
      { label: "Laporan Arus Kas", href: "/owner/reports/cash-flow" },
      { label: "Perbandingan Keuangan", href: "/owner/reports/financial-comparison" },
    ]
  },
  { 
    label: "Laporan", 
    icon: BarChart3, 
    href: "/admin/reports",
    isExpandable: true,
    stateKey: "reports_admin",
    allowedRoles: ["ADMIN"],
    subItems: [
      { label: "Laporan Penjualan", href: "/admin/reports/sales" },
      { label: "Laporan Pembelian", href: "/admin/reports/purchases" },
    ]
  },
  { label: "Absensi Karyawan", icon: Clock, href: "/owner/absensi", allowedRoles: ["OWNER"] },
  { label: "Seting", icon: Settings, href: "/owner/settings", allowedRoles: ["OWNER"] },
];

export function AdminSidebar({ onNavItemClick }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout, user } = useAuth();

  const filteredNavItems = useMemo(() => {
    if (!user) return [];
    return navItems.filter(item => item.allowedRoles.includes(user.role));
  }, [user]);

  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    stok: pathname.startsWith("/admin/stock"),
    opname: pathname.startsWith("/admin/stock-opname"),
    transaksi: pathname.startsWith("/owner/transactions"),
    kaskasir: pathname.startsWith("/owner/cash-reports") || pathname.startsWith("/owner/expenses"),
    discounts: pathname.startsWith("/admin/members") || pathname.startsWith("/admin/coupons") || pathname.startsWith("/admin/agents") || pathname.startsWith("/admin/resellers"),
    reports_owner: pathname.startsWith("/owner/reports"),
    reports_admin: pathname.startsWith("/admin/reports")
  });

  return (
    <div className="h-full w-full bg-white/95 backdrop-blur-xl border-r border-neutral-200/70 flex flex-col">
      <div className="p-6 border-b border-neutral-200/60">
        <div className="flex items-center gap-3.5">
          <div className="rounded-full overflow-hidden flex items-center justify-center w-10 h-10 border border-neutral-200 bg-white shadow-sm shrink-0 relative">
            <Image src={LOGO_URL} alt="Logo" fill className="object-cover" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-serif font-bold text-lg tracking-tight text-neutral-950 truncate leading-none">
              Nibras House
            </span>
            <span className="text-[9px] font-bold text-[#C82368] uppercase tracking-[0.2em] mt-1.5">
              {user?.role.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3.5 py-5 space-y-1.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          if (item.isExpandable) {
            const isOpen = openMenus[item.stateKey!];
            const isSectionActive = pathname.startsWith(item.href);
            return (
              <Collapsible key={item.href} open={isOpen} onOpenChange={v => setOpenMenus({...openMenus, [item.stateKey!]: v})}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-between h-11 px-4 rounded-full font-medium text-xs transition-all",
                      isSectionActive
                        ? "bg-neutral-950 text-white hover:bg-neutral-900 hover:text-white shadow-sm"
                        : "text-neutral-600 hover:bg-[#F5F3F0] hover:text-neutral-950"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className={cn("h-4 w-4", isSectionActive ? "text-[#C82368]" : "text-neutral-400")} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronDown className={cn("h-4 w-4 transition-transform opacity-70", isOpen && "rotate-180")} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1.5 pl-3">
                  {item.subItems?.map(sub => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={onNavItemClick}
                        className={cn(
                          "flex items-center pl-8 pr-4 py-2 rounded-full text-xs font-medium transition-all",
                          isSubActive
                            ? "text-[#C82368] bg-[#C82368]/10 font-bold"
                            : "text-neutral-500 hover:bg-[#F5F3F0] hover:text-neutral-950"
                        )}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          }
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavItemClick}
              className={cn(
                "flex items-center gap-3 px-4 h-11 rounded-full text-xs font-medium transition-all",
                isActive
                  ? "bg-neutral-950 text-white font-semibold shadow-sm"
                  : "text-neutral-600 hover:bg-[#F5F3F0] hover:text-neutral-950"
              )}
            >
              <item.icon className={cn("h-4 w-4", isActive ? "text-[#C82368]" : "text-neutral-400")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-200/60 space-y-3">
        {user && (
          <div className="bg-[#F5F3F0] border border-neutral-200/70 rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-neutral-950 truncate">{user.name}</p>
              <p className="text-[9px] font-medium text-neutral-500 truncate">{user.email}</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Sesi Aktif" />
          </div>
        )}
        <Button
          variant="ghost"
          className="w-full justify-center rounded-full h-10 bg-neutral-950 text-white hover:bg-[#C82368] hover:text-white text-xs font-bold tracking-wide transition-colors"
          onClick={() => logout()}
        >
          <LogOut className="h-3.5 w-3.5 mr-2" /> Keluar Sesi
        </Button>
      </div>
    </div>
  );
}
