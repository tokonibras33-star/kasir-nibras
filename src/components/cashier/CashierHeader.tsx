"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wallet,
  GitMerge,
  Users,
  History,
  Settings,
  LogOut,
  Menu,
  UserPlus,
  ShieldCheck,
} from "lucide-react";

interface CashierHeaderProps {
  displayStoreName: string;
  cashierName: string;
  onOpenCashLogs: () => void;
  onOpenStockList: () => void;
  onOpenMemberMenu: (type: "MEMBER" | "AGEN" | "RESELLER") => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export function CashierHeader({
  displayStoreName,
  cashierName,
  onOpenCashLogs,
  onOpenStockList,
  onOpenMemberMenu,
  onOpenHistory,
  onOpenSettings,
  onLogout,
}: CashierHeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white/80 backdrop-blur-xl border-b border-neutral-900/10 shrink-0 z-30 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative h-9 w-9 rounded-full overflow-hidden border border-neutral-200 shadow-sm bg-white shrink-0">
          <Image src="/hero/nibras-logo.jpg" alt="Nibras House" fill className="object-cover" />
        </div>
        <div className="flex items-center gap-2.5">
          <div>
            <p className="font-serif font-bold text-sm sm:text-base text-neutral-950 leading-none tracking-wide">
              Nibras House
            </p>
            <p className="text-[9px] text-neutral-500 font-bold uppercase tracking-[0.2em] mt-1">
              Indah Fashion POS
            </p>
          </div>
          <span className="bg-[#C82368]/10 text-[#C82368] text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
            {displayStoreName}
          </span>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2.5">
        <nav className="flex items-center gap-1 bg-[#F5F3F0]/90 p-1 rounded-full border border-neutral-200/80">
          <button
            onClick={onOpenCashLogs}
            className="px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider text-neutral-700 hover:bg-neutral-950 hover:text-white uppercase flex items-center gap-1.5 transition-all btn-press"
          >
            <Wallet className="h-3.5 w-3.5" /> KAS KASIR
          </button>
          <button
            onClick={onOpenStockList}
            className="px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider text-neutral-700 hover:bg-neutral-950 hover:text-white uppercase flex items-center gap-1.5 transition-all btn-press"
          >
            <GitMerge className="h-3.5 w-3.5" /> STOK
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider text-neutral-700 hover:bg-neutral-950 hover:text-white uppercase flex items-center gap-1.5 transition-all btn-press">
                <Users className="h-3.5 w-3.5" /> DATA MEMBER
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-2xl font-bold w-44 border-neutral-200/80 shadow-xl">
              <DropdownMenuItem onClick={() => onOpenMemberMenu("MEMBER")} className="cursor-pointer rounded-xl">
                1. MEMBER
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenMemberMenu("AGEN")} className="cursor-pointer rounded-xl">
                2. AGEN
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenMemberMenu("RESELLER")} className="cursor-pointer rounded-xl">
                3. RESELLER
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={onOpenHistory}
            className="px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider text-neutral-700 hover:bg-neutral-950 hover:text-white uppercase flex items-center gap-1.5 transition-all btn-press"
          >
            <History className="h-3.5 w-3.5" /> RIWAYAT
          </button>
          <button
            onClick={onOpenSettings}
            className="px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-wider text-neutral-700 hover:bg-neutral-950 hover:text-white uppercase flex items-center gap-1.5 transition-all btn-press"
          >
            <Settings className="h-3.5 w-3.5" /> SETING
          </button>
        </nav>
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          title="Keluar"
          className="rounded-full h-9 w-9 bg-neutral-950 text-white hover:bg-[#C82368] hover:text-white transition-all shadow-sm btn-press"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>

      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-[#F5F3F0] text-neutral-900 hover:bg-neutral-950 hover:text-white"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent aria-describedby={undefined} side="right" className="w-72 p-0 border-none">
            <div className="flex flex-col h-full bg-white">
              <SheetHeader className="p-6 bg-neutral-950 text-white text-left">
                <SheetTitle className="sr-only">Menu Kasir</SheetTitle>
                <div className="flex items-center gap-3">
                  <div className="relative h-9 w-9 rounded-full overflow-hidden bg-white border border-white/20 shrink-0">
                    <Image src="/hero/nibras-logo.jpg" alt="Logo" fill className="object-cover" />
                  </div>
                  <div>
                    <p className="font-serif font-bold text-base tracking-wide">
                      {cashierName || "Kasir Nibras"}
                    </p>
                    <p className="text-[10px] text-[#F48FB1] font-bold uppercase tracking-widest">
                      {displayStoreName}
                    </p>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex-1 py-4 overflow-y-auto">
                <nav className="space-y-1">
                  <button
                    onClick={onOpenCashLogs}
                    className="w-full flex items-center gap-4 px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-neutral-800 hover:bg-[#F5F3F0] border-b border-neutral-100 transition-colors"
                  >
                    <Wallet className="h-4 w-4 text-[#C82368]" /> KAS KASIR
                  </button>
                  <button
                    onClick={onOpenStockList}
                    className="w-full flex items-center gap-4 px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-neutral-800 hover:bg-[#F5F3F0] border-b border-neutral-100 transition-colors"
                  >
                    <GitMerge className="h-4 w-4 text-[#C82368]" /> MANAJEMEN STOK
                  </button>
                  <div className="px-6 py-4 border-b border-neutral-100 space-y-2.5 bg-[#F5F3F0]/50">
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Data Member</p>
                    <button
                      onClick={() => onOpenMemberMenu("MEMBER")}
                      className="w-full text-left py-2 text-xs font-extrabold uppercase tracking-wider text-neutral-800 hover:text-[#C82368] flex items-center gap-3"
                    >
                      <UserPlus className="h-4 w-4 text-[#C82368]" /> 1. MEMBER
                    </button>
                    <button
                      onClick={() => onOpenMemberMenu("AGEN")}
                      className="w-full text-left py-2 text-xs font-extrabold uppercase tracking-wider text-neutral-800 hover:text-[#C82368] flex items-center gap-3"
                    >
                      <ShieldCheck className="h-4 w-4 text-[#C82368]" /> 2. AGEN
                    </button>
                    <button
                      onClick={() => onOpenMemberMenu("RESELLER")}
                      className="w-full text-left py-2 text-xs font-extrabold uppercase tracking-wider text-neutral-800 hover:text-[#C82368] flex items-center gap-3"
                    >
                      <Users className="h-4 w-4 text-[#C82368]" /> 3. RESELLER
                    </button>
                  </div>
                  <button
                    onClick={onOpenHistory}
                    className="w-full flex items-center gap-4 px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-neutral-800 hover:bg-[#F5F3F0] border-b border-neutral-100 transition-colors"
                  >
                    <History className="h-4 w-4 text-[#C82368]" /> RIWAYAT PENJUALAN
                  </button>
                  <button
                    onClick={onOpenSettings}
                    className="w-full flex items-center gap-4 px-6 py-4 text-xs font-extrabold uppercase tracking-wider text-neutral-800 hover:bg-[#F5F3F0] border-b border-neutral-100 transition-colors"
                  >
                    <Settings className="h-4 w-4 text-[#C82368]" /> PENGATURAN
                  </button>
                </nav>
              </div>
              <div className="p-6 border-t border-neutral-100">
                <Button
                  className="w-full h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black gap-2 uppercase tracking-wider text-xs transition-all"
                  onClick={onLogout}
                >
                  <LogOut className="h-4 w-4" /> KELUAR
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

