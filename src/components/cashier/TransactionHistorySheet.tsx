'use client';

import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Wallet
} from "lucide-react";
import { cn } from "@/lib/utils";

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
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
