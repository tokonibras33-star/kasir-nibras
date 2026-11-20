'use client';

<<<<<<< HEAD
import { useState, useMemo } from "react";
=======
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
<<<<<<< HEAD
=======
import { Label } from "@/components/ui/label";
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
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
<<<<<<< HEAD
  Wallet,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getTrxReturnSummary } from "./types";
=======
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68

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
<<<<<<< HEAD
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
=======
  
  const displayedHistory = showOnlyDP ? history.filter(t => t.status === "DP") : history;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? "bottom" : "left"} className={cn("p-0 border-none shadow-2xl bg-white", isMobile ? "h-[90vh] rounded-t-[2.5rem]" : "w-[450px]")}>
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 border-b bg-slate-50/50 flex flex-row items-center justify-between">
            <SheetTitle className="font-black uppercase text-xs tracking-widest flex items-center gap-3">
              <History className="h-5 w-5 text-primary" /> Riwayat Penjualan
            </SheetTitle>
            {isMobile && <button onClick={() => onOpenChange(false)} className="bg-slate-200 p-2 rounded-full"><X className="h-4 w-4" /></button>}
          </SheetHeader>
          
          <div className="p-6 border-b space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => setHistoryFilterMode("daily")} 
                className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", historyFilterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}
              >
                HARIAN
              </button>
              <button 
                onClick={() => setHistoryFilterMode("monthly")} 
                className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", historyFilterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}
              >
                BULANAN
              </button>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">
                {historyFilterMode === "daily" ? "Pilih Tanggal" : "Pilih Bulan"}
              </Label>
              {historyFilterMode === "daily" ? (
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="h-12 pl-10 rounded-2xl bg-slate-50 font-bold border-none shadow-inner" />
                </div>
              ) : (
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="month" value={historyDate.substring(0, 7)} onChange={e => setHistoryDate(e.target.value)} className="h-12 pl-10 rounded-2xl bg-slate-50 font-bold border-none shadow-inner" />
                </div>
              )}
            </div>

            <Button 
              variant={showOnlyDP ? "default" : "outline"} 
              onClick={() => setShowOnlyDP(!showOnlyDP)}
              className={cn("w-full h-10 rounded-xl font-black text-[10px] uppercase gap-2 transition-all", showOnlyDP ? "bg-orange-600 hover:bg-orange-700 text-white border-none shadow-lg" : "border-orange-200 text-orange-600")}
            >
              <Wallet className="h-3.5 w-3.5" />
              {showOnlyDP ? "MENAMPILKAN DP SAJA" : "FILTER DP (BELUM LUNAS)"}
            </Button>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4 pb-10">
              {displayedHistory.length > 0 ? displayedHistory.map(trx => (
                <Card key={trx.id} className="p-5 rounded-[1.5rem] border-none soft-shadow hover:bg-primary/5 transition-all group">
                  <div className="flex justify-between mb-2">
                    <p className="text-[10px] font-black text-primary">{trx.id}</p>
                    <div className="flex gap-1">
                      {trx.returnLog && <Badge className="bg-rose-100 text-rose-700 text-[8px] font-black border-none px-2">RETUR</Badge>}
                      <Badge className={cn("text-[8px] font-black border-none rounded-lg px-2", trx.status === 'DP' ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>{trx.status}</Badge>
                    </div>
                  </div>
                  <p className="text-sm font-black uppercase text-slate-800">{trx.customerName}</p>
                  <p className="text-[9px] text-muted-foreground font-bold">{trx.date?.toDate?.().toLocaleString('id-ID') || "Baru"}</p>
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-slate-200">
                    <p className="text-sm font-black text-primary">Rp{trx.total?.toLocaleString('id-ID')}</p>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={() => onViewDetails(trx)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={() => onPrint(trx.id)}><Printer className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-[#25D366] hover:bg-[#25D366]/10 rounded-xl" onClick={() => onWhatsApp(trx)}><MessageSquare className="h-4 w-4" /></Button>
                      {trx.status === 'DP' && (
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-9 border-orange-200 text-orange-600 text-[8px] font-black px-2 rounded-xl" onClick={() => onSettle(trx, true)}>+DP</Button>
                          <Button size="sm" className="h-9 bg-orange-600 text-[8px] font-black px-2 rounded-xl" onClick={() => onSettle(trx, false)}>LUNASI</Button>
                        </div>
                      )}
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl" onClick={() => onReturn(trx)}><RotateCcw className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              )) : (
                <div className="py-20 text-center opacity-20 flex flex-col items-center">
                  <History className="h-16 w-16 mb-4" />
                  <p className="font-black uppercase tracking-widest text-xs">Tidak ada data</p>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                </div>
              )}
            </div>
          </ScrollArea>
<<<<<<< HEAD

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
=======
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
        </div>
      </SheetContent>
    </Sheet>
  );
}
