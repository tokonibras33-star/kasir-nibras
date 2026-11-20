'use client';

import { useState, useMemo } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  History, 
  X, 
  Eye, 
  Printer, 
  MessageSquare, 
  RotateCcw,
  Calendar,
  Filter,
  Wallet,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTrxReturnSummary } from "./types";

interface TransactionHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMobile: boolean;
  historyDate: string;
  setHistoryDate: (date: string) => void;
  historyFilterMode: "daily" | "monthly";
  setHistoryFilterMode: (mode: "daily" | "monthly") => void;
  showOnlyDP: boolean;
  setShowOnlyDP: (show: boolean) => void;
  history: any[];
  storeId: string;
  onViewDetails: (trx: any) => void;
  onPrint: (trxId: string) => void;
  onWhatsApp: (trx: any) => void;
  onReturn: (trx: any) => void;
  onSettle: (trx: any, isAdd: boolean) => void;
}

export function TransactionHistorySheet({
  open,
  onOpenChange,
  isMobile,
  historyDate,
  setHistoryDate,
  historyFilterMode,
  setHistoryFilterMode,
  showOnlyDP,
  setShowOnlyDP,
  history,
  storeId,
  onViewDetails,
  onPrint,
  onWhatsApp,
  onReturn,
  onSettle
}: TransactionHistorySheetProps) {
  const [searchTrx, setSearchTrx] = useState("");

  const displayedHistory = useMemo(() => {
    let list = showOnlyDP
      ? history.filter((t) => getTrxReturnSummary(t).effectiveStatus === "DP")
      : history;
    const q = searchTrx.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        [t.id, t.customerName, t.customerPhone, t.paymentMethod]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    return list;
  }, [history, showOnlyDP, searchTrx]);

  const periodTotals = useMemo(() => {
    return displayedHistory.reduce(
      (acc, trx) => {
        const summary = getTrxReturnSummary(trx);
        acc.netSales += summary.netTotal;
        acc.totalReturn += summary.totalRefund;
        return acc;
      },
      { netSales: 0, totalReturn: 0 }
    );
  }, [displayedHistory]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-describedby={undefined}
        side={isMobile ? "bottom" : "left"}
        className={cn(
          "p-0 border-none shadow-2xl bg-[#F5F3F0] [&>button]:hidden",
          isMobile
            ? "h-[92vh] w-full max-w-full rounded-t-[2rem] overflow-hidden"
            : "w-full sm:max-w-[440px]"
        )}
      >
        <div className="flex flex-col h-full w-full overflow-hidden">
          <SheetHeader className="px-3.5 py-2.5 sm:px-5 sm:py-4 border-b border-white/10 bg-neutral-950 text-white flex flex-row items-center justify-between space-y-0 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <SheetTitle className="font-serif font-bold text-sm sm:text-base tracking-wide flex items-center gap-2 text-white truncate">
                <History className="h-4 w-4 text-[#F48FB1] shrink-0" />
                <span className="truncate">Riwayat Penjualan</span>
              </SheetTitle>
              <Badge className="bg-[#C82368] text-white border-none text-[9px] font-black px-2 py-0.5 rounded-full shrink-0">
                {displayedHistory.length}
              </Badge>
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="bg-white/10 hover:bg-[#C82368] p-1.5 rounded-full text-white transition-colors shrink-0"
              aria-label="Tutup Riwayat"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </SheetHeader>
          
          <div className="px-3.5 py-2.5 sm:px-5 sm:py-3 border-b border-neutral-200/70 bg-white space-y-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex bg-[#F5F3F0] p-0.5 rounded-full h-8">
                <button 
                  type="button"
                  onClick={() => setHistoryFilterMode("daily")} 
                  className={cn("flex-1 text-[9px] sm:text-[10px] font-black rounded-full transition-all", historyFilterMode === "daily" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}
                >
                  HARIAN
                </button>
                <button 
                  type="button"
                  onClick={() => setHistoryFilterMode("monthly")} 
                  className={cn("flex-1 text-[9px] sm:text-[10px] font-black rounded-full transition-all", historyFilterMode === "monthly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}
                >
                  BULANAN
                </button>
              </div>

              <Button 
                type="button"
                variant={showOnlyDP ? "default" : "outline"} 
                onClick={() => setShowOnlyDP(!showOnlyDP)}
                className={cn("h-8 px-3 rounded-full font-black text-[9px] uppercase gap-1.5 shrink-0 transition-all", showOnlyDP ? "bg-[#C82368] hover:bg-neutral-950 text-white border-none shadow-sm" : "border-neutral-300 text-neutral-700 hover:bg-[#F5F3F0]")}
              >
                <Wallet className="h-3 w-3" />
                {showOnlyDP ? "DP SAJA" : "FILTER DP"}
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                {historyFilterMode === "daily" ? (
                  <>
                    <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
                    <Input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="h-8 sm:h-9 pl-7 pr-2 rounded-full bg-[#F5F3F0] text-[11px] sm:text-xs font-bold border-transparent" />
                  </>
                ) : (
                  <>
                    <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
                    <Input type="month" value={historyDate.substring(0, 7)} onChange={e => setHistoryDate(e.target.value)} className="h-8 sm:h-9 pl-7 pr-2 rounded-full bg-[#F5F3F0] text-[11px] sm:text-xs font-bold border-transparent" />
                  </>
                )}
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-neutral-400 pointer-events-none" />
                <Input
                  value={searchTrx}
                  onChange={e => setSearchTrx(e.target.value)}
                  placeholder="Cari ID / nama..."
                  className="h-8 sm:h-9 pl-7 pr-6 rounded-full bg-[#F5F3F0] text-[11px] sm:text-xs font-bold border-transparent"
                />
                {searchTrx && (
                  <button
                    type="button"
                    onClick={() => setSearchTrx("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
                    aria-label="Hapus pencarian"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1 w-full bg-[#F5F3F0]">
            <div className="p-3 sm:p-4 space-y-2.5 pb-6 w-full">
              {displayedHistory.length > 0 ? displayedHistory.map(trx => {
                const summary = getTrxReturnSummary(trx);
                return (
                <Card key={trx.id} className="p-3 sm:p-4 rounded-2xl border border-neutral-200/80 bg-white shadow-sm hover:border-[#C82368]/30 transition-all group w-full overflow-hidden">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] sm:text-[11px] font-black text-[#C82368] truncate">{trx.id}</p>
                      <p className="text-[11px] sm:text-xs font-black uppercase text-neutral-900 truncate mt-0.5">{trx.customerName || "UMUM"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                      {summary.hasReturn && !summary.allReturned && (
                        <Badge className="bg-rose-100 text-rose-700 text-[8px] font-black border-none px-2 py-0.5 rounded-full">RETUR SEBAGIAN</Badge>
                      )}
                      {summary.allReturned ? (
                        <Badge className="bg-rose-600 text-white text-[8px] font-black border-none rounded-full px-2 py-0.5">DIRETUR</Badge>
                      ) : (
                        <Badge className={cn("text-[8px] font-black border-none rounded-full px-2 py-0.5", summary.effectiveStatus === 'DP' ? "bg-orange-100 text-orange-700" : "bg-neutral-950 text-white")}>
                          {summary.effectiveStatus}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                    <p className="text-[9px] sm:text-[10px] text-neutral-400 font-bold truncate">{trx.date?.toDate?.()?.toLocaleString('id-ID') || "Baru"}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {summary.hasReturn && summary.totalRefund > 0 && (
                        <span className="text-[8px] sm:text-[9px] font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                          Retur: -Rp{summary.totalRefund.toLocaleString('id-ID')}
                        </span>
                      )}
                      {summary.effectiveStatus === 'DP' && summary.netRemaining > 0 && (
                        <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                          Sisa: Rp{summary.netRemaining.toLocaleString('id-ID')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-dashed border-neutral-100 flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex flex-col">
                      {summary.hasReturn && summary.originalTotal > summary.netTotal && (
                        <span className="text-[9px] font-bold text-neutral-400 line-through leading-none mb-0.5">
                          Rp{summary.originalTotal.toLocaleString('id-ID')}
                        </span>
                      )}
                      <p className={cn("font-serif text-sm sm:text-base font-bold shrink-0 leading-tight", summary.allReturned ? "text-rose-600" : "text-neutral-950")}>
                        Rp{summary.netTotal.toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 flex-wrap justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-700 hover:bg-[#F5F3F0] rounded-full" onClick={() => onViewDetails(trx)} title="Lihat Detail"><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-neutral-700 hover:bg-[#F5F3F0] rounded-full" onClick={() => onPrint(trx.id)} title="Cetak Struk"><Printer className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-[#25D366] hover:bg-[#25D366]/10 rounded-full" onClick={() => onWhatsApp(trx)} title="WhatsApp"><MessageSquare className="h-3.5 w-3.5" /></Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={summary.allReturned}
                        className={cn("h-7 w-7 rounded-full", summary.allReturned ? "text-neutral-300 cursor-not-allowed" : "text-rose-500 hover:bg-rose-50")}
                        onClick={() => onReturn(trx)}
                        title={summary.allReturned ? "Sudah Diretur Penuh" : "Retur Barang"}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      {summary.effectiveStatus === 'DP' && (
                        <>
                          <Button size="sm" variant="outline" className="h-6 sm:h-7 px-2.5 border-orange-200 text-orange-600 hover:bg-orange-50 text-[8px] sm:text-[9px] font-black rounded-full ml-0.5" onClick={() => onSettle(trx, true)}>+DP</Button>
                          <Button size="sm" className="h-6 sm:h-7 px-2.5 bg-orange-600 hover:bg-orange-700 text-white text-[8px] sm:text-[9px] font-black rounded-full" onClick={() => onSettle(trx, false)}>LUNASI</Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
                );
              }) : (
                <div className="py-16 text-center opacity-40 flex flex-col items-center">
                  <History className="h-14 w-14 mb-3 text-neutral-400" />
                  <p className="font-black uppercase tracking-widest text-xs text-neutral-500">Tidak ada data transaksi</p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="px-4 py-3 border-t border-neutral-200 bg-white flex items-center justify-between gap-3 shrink-0">
            <div>
              <p className="text-[9px] font-black uppercase tracking-wider text-neutral-400">Omset Bersih Periode Ini</p>
              <p className="font-serif text-sm sm:text-base font-bold text-neutral-950">Rp{periodTotals.netSales.toLocaleString('id-ID')}</p>
            </div>
            {periodTotals.totalReturn > 0 && (
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-wider text-rose-500">Total Retur</p>
                <p className="text-xs sm:text-sm font-black text-rose-600">-Rp{periodTotals.totalReturn.toLocaleString('id-ID')}</p>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
