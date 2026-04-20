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
      { label: "Kupon Diskon", href: "/admin/coupons" },
      { label: "Agen Diskon", href: "/admin/agents" },
    ]
  },
  { 
    label: "Laporan", 
    icon: BarChart3, 
    href: "/admin/reports",
    isExpandable: true,
    stateKey: "reports",
    allowedRoles: ["ADMIN", "OWNER"],
    subItems: [
      { label: "Laporan Penjualan", href: "/admin/reports/sales" },
      { label: "Laporan Pembelian", href: "/admin/reports/purchases" },
      { label: "Laporan Pengeluaran", href: "/admin/reports/expenses" },
      { label: "Laporan Arus Kas", href: "/admin/reports/cash-flow" },
    ]
  },
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
    discounts: pathname.startsWith("/admin/members") || pathname.startsWith("/admin/coupons") || pathname.startsWith("/admin/agents"),
    reports: pathname.startsWith("/admin/reports")
  });

  return (
    <div className="h-full w-full bg-sidebar border-r flex flex-col">
      <div className="p-6 hidden md:block">
        <div className="flex items-center gap-3">
          <div className="bg-primary/5 p-1 rounded-lg overflow-hidden flex items-center justify-center min-w-[40px] min-h-[40px] border border-primary/10 relative">
            <Image src={LOGO_URL} alt="Logo" width={36} height={36} className="object-contain" />
          </div>
          <div className="flex flex-col"><span className="font-bold text-xl font-headline tracking-tight">Nibras House</span><span className="text-[10px] font-black text-primary uppercase tracking-widest">{user?.role.replace('_', ' ')}</span></div>
        </div>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {filteredNavItems.map((item) => {
          if (item.isExpandable) {
            const isOpen = openMenus[item.stateKey!];
            return (
              <Collapsible key={item.href} open={isOpen} onOpenChange={v => setOpenMenus({...openMenus, [item.stateKey!]: v})}>
                <CollapsibleTrigger asChild><Button variant="ghost" className={cn("w-full justify-between h-auto py-2.5 font-medium", pathname.startsWith(item.href) && "bg-primary/10 text-primary")}><div className="flex items-center gap-3"><item.icon className="h-4 w-4" />{item.label}</div><ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} /></Button></CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">{item.subItems?.map(sub => (<Link key={sub.href} href={sub.href} className={cn("flex items-center pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-colors", pathname === sub.href ? "text-primary bg-primary/5" : "text-muted-foreground hover:bg-muted")}>{sub.label}</Link>))}</CollapsibleContent>
              </Collapsible>
            );
          }
          return (<Link key={item.href} href={item.href} className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors", pathname === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}><item.icon className="h-4 w-4" />{item.label}</Link>);
        })}
      </nav>
      <div className="p-4 border-t"><Button variant="ghost" className="w-full justify-start text-muted-foreground" onClick={() => logout()}><LogOut className="h-4 w-4 mr-3" /> Keluar</Button></div>
    </div>
  );
}
