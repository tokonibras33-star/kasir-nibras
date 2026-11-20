
'use client';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
<<<<<<< HEAD
import { Package, X, Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getItemUnitNetPrice, getTrxReturnSummary } from "./types";
=======
import { Package, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68

interface TransactionDetailsDialogProps {
  trx: any;
  onClose: () => void;
}

export function TransactionDetailsDialog({ trx, onClose }: TransactionDetailsDialogProps) {
  if (!trx) return null;

<<<<<<< HEAD
  const summary = getTrxReturnSummary(trx);
  const displayItems = Array.isArray(trx.originalItems)
    ? trx.originalItems
    : Array.isArray(trx.items)
    ? trx.items
    : [];

  return (
    <Dialog open={!!trx} onOpenChange={(o) => !o && onClose()}>
      <DialogContent aria-describedby={undefined} className="max-w-2xl w-[95vw] rounded-[2rem] sm:rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl [&>button]:hidden">
        <DialogHeader className="p-5 sm:p-7 bg-neutral-950 text-white shrink-0">
          <div className="flex justify-between items-start gap-2">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F48FB1] mb-1">Rincian Transaksi</p>
              <DialogTitle className="font-serif text-xl sm:text-2xl font-bold tracking-tight">{trx.id}</DialogTitle>
              <p className="text-[10px] font-bold text-white/60 mt-1">{trx.date?.toDate?.()?.toLocaleString('id-ID') || "Baru"}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {summary.allReturned ? (
                <Badge className="text-[9px] font-black px-3 py-1 rounded-full border-none bg-rose-600 text-white">
                  DIRETUR
                </Badge>
              ) : (
                <>
                  {summary.hasReturn && (
                    <Badge className="text-[9px] font-black px-2.5 py-1 rounded-full border-none bg-rose-500 text-white">
                      RETUR SEBAGIAN
                    </Badge>
                  )}
                  <Badge className={cn("text-[9px] font-black px-3 py-1 rounded-full border-none", summary.effectiveStatus === 'DP' ? "bg-orange-500 text-white" : "bg-[#C82368] text-white")}>
                    {summary.effectiveStatus}
                  </Badge>
                </>
              )}
              <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-full transition-colors">
                <X className="h-4 w-4 text-white/70" />
=======
  return (
    <Dialog open={!!trx} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-[#1F7A63] text-white shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Rincian Transaksi</p>
              <DialogTitle className="text-2xl font-black tracking-tighter uppercase">{trx.id}</DialogTitle>
              <p className="text-[10px] font-bold opacity-80 mt-1">{trx.date?.toDate?.().toLocaleString('id-ID') || "Baru"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={cn("text-[9px] font-black px-3 py-1 rounded-full border-none", trx.status === 'DP' ? "bg-orange-500 text-white" : "bg-white text-primary")}>
                {trx.status}
              </Badge>
              <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <X className="h-5 w-5 text-white/50" />
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
              </button>
            </div>
          </div>
        </DialogHeader>
<<<<<<< HEAD
        <div className="p-4 sm:p-7 space-y-5 overflow-y-auto max-h-[65vh] bg-[#F5F3F0]">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-neutral-200/70 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <p className="text-[9px] font-black text-neutral-400 uppercase mb-1">Kategori & Customer</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[8px] font-black border-[#C82368]/30 text-[#C82368] px-2 h-4 bg-[#C82368]/10 uppercase rounded-full">
                  {trx.customerType || "UMUM"}
                </Badge>
                <p className="text-sm font-black uppercase text-neutral-900">{trx.customerName || "UMUM"}</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-neutral-400 uppercase mb-1">Metode Bayar</p>
              <p className="text-sm font-black uppercase text-neutral-900">{trx.paymentMethod || "CASH"}</p>
=======
        <div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] bg-slate-50/50">
          <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase mb-0.5">Kategori & Customer</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[8px] font-black border-primary text-primary px-1.5 h-4 bg-primary/5 uppercase">
                  {trx.customerType || "UMUM"}
                </Badge>
                <p className="text-sm font-black uppercase text-slate-800">{trx.customerName || "UMUM"}</p>
              </div>
            </div>
            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase mb-0.5">Metode Bayar</p>
              <p className="text-sm font-black uppercase text-slate-800">{trx.paymentMethod || "CASH"}</p>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
<<<<<<< HEAD
              <Package className="h-4 w-4 text-[#C82368]" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Daftar Produk</h3>
            </div>
            <Card className="rounded-3xl border border-neutral-200/70 shadow-sm overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-[#F5F3F0]/60">
=======
              <Package className="h-4 w-4 text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daftar Produk</h3>
            </div>
            <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                  <TableRow className="text-[9px] font-black uppercase border-none hover:bg-transparent">
                    <TableHead className="pl-6">Produk</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right pr-4">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
<<<<<<< HEAD
                  {displayItems.map((item: any, i: number) => {
=======
                  {trx.items?.map((item: any, i: number) => {
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                    const labelPrice = item.labelPrice || item.price;
                    const qty = item.quantity || 1;
                    const subtotalBeforeDisc = labelPrice * qty;
                    const discPct = item.storeDiscountPercent || 0;
                    const discNom = item.storeDiscountNominal || 0;
                    const totalItemDisc = (discPct > 0 ? (labelPrice * discPct / 100) : discNom) * qty;

                    return (
<<<<<<< HEAD
                      <TableRow key={i} className="border-b border-neutral-100 last:border-none hover:bg-[#F5F3F0]/40 transition-colors text-xs">
                        <TableCell className="pl-6 py-3">
                          <p className="font-black text-[11px] uppercase leading-tight text-neutral-900">{item.name}</p>
                          <p className="text-[9px] text-neutral-400 uppercase font-bold mt-0.5">
                            {item.brand || '-'} | {item.category || '-'} | {item.color} | {item.size}
                          </p>
                          {totalItemDisc > 0 && (
                            <p className="text-[9px] text-[#C82368] font-black mt-1">
=======
                      <TableRow key={i} className="border-b last:border-none hover:bg-slate-50/50 transition-colors text-xs">
                        <TableCell className="pl-6 py-3">
                          <p className="font-black text-[11px] uppercase leading-tight text-slate-800">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5">
                            {item.brand || '-'} | {item.category || '-'} | {item.color} | {item.size}
                          </p>
                          {totalItemDisc > 0 && (
                            <p className="text-[9px] text-rose-600 font-black mt-1">
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                              Potongan: -Rp {totalItemDisc.toLocaleString('id-ID')} ({discPct > 0 ? `${discPct}%` : 'Fixed'})
                            </p>
                          )}
                        </TableCell>
<<<<<<< HEAD
                        <TableCell className="text-center font-black text-neutral-900">{qty}</TableCell>
                        <TableCell className="text-right pr-4 font-black text-neutral-900">
=======
                        <TableCell className="text-center font-black text-slate-800">{qty}</TableCell>
                        <TableCell className="text-right pr-4 font-black text-slate-800">
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                          Rp {subtotalBeforeDisc.toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

<<<<<<< HEAD
          {summary.hasReturn && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-2">
                <RotateCcw className="h-4 w-4 text-rose-600" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-600">Barang Diretur</h3>
              </div>
              <Card className="rounded-3xl border border-rose-200/80 shadow-sm overflow-hidden bg-rose-50/40 p-4 space-y-2">
                {(trx.returnLog?.items || []).map((item: any, idx: number) => {
                  const unitNet = getItemUnitNetPrice(item);
                  return (
                    <div key={idx} className="flex justify-between items-center text-xs border-b border-rose-100 last:border-none pb-2 last:pb-0">
                      <div>
                        <p className="font-black uppercase text-neutral-900">{item.name}</p>
                        <p className="text-[9px] font-bold text-neutral-500 uppercase">
                          {item.color || "-"} | {item.size || "-"} • {item.quantity}x @Rp {unitNet.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <span className="font-black text-rose-600">-Rp {(unitNet * (item.quantity || 1)).toLocaleString("id-ID")}</span>
                    </div>
                  );
                })}
                {trx.returnLog?.returnedAt && (
                  <p className="text-[9px] font-bold text-rose-500 pt-1">
                    Diretur pada {new Date(trx.returnLog.returnedAt).toLocaleString("id-ID")} oleh {trx.returnLog.returnedBy || "Kasir"}
                  </p>
                )}
              </Card>
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl border border-neutral-200/70 shadow-sm space-y-4">
            {summary.hasReturn && (
              <div className="space-y-2 border-b border-dashed border-neutral-200 pb-3">
                <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 uppercase">
                  <span>Tagihan Awal</span>
                  <span>Rp {summary.originalTotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-black text-rose-600 uppercase">
                  <span>Total Retur Barang</span>
                  <span>-Rp {summary.totalRefund.toLocaleString("id-ID")}</span>
                </div>
              </div>
            )}
            <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-3">
              <span>Total Tagihan {summary.hasReturn ? "Bersih" : ""}</span>
              <span className="font-serif text-xl font-bold">Rp {summary.netTotal.toLocaleString('id-ID')}</span>
=======
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-slate-800 border-b pb-3">
              <span>Total Tagihan</span>
              <span className="text-lg">Rp {(trx.total || 0).toLocaleString('id-ID')}</span>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
<<<<<<< HEAD
                <Clock className="h-3.5 w-3.5 text-[#C82368]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#C82368]">Sudah dibayar :</span>
              </div>
              
              <div className="space-y-2 border-l-2 border-[#C82368]/25 pl-4 ml-1.5">
                {trx.paymentHistory?.length > 0 ? trx.paymentHistory.map((pay: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-neutral-500 uppercase">
                      Pembayaran ke {pay.index} | {pay.date} | {pay.time}
                    </span>
                    <span className="font-black text-neutral-900">Rp {pay.amount.toLocaleString('id-ID')}</span>
                  </div>
                )) : (
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-neutral-500 uppercase">Sudah Dibayar</span>
                    <span className="font-black text-neutral-900">Rp {summary.netPaid.toLocaleString('id-ID')}</span>
=======
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Sudah dibayar :</span>
              </div>
              
              <div className="space-y-2 border-l-2 border-primary/20 pl-4 ml-1.5">
                {trx.paymentHistory?.length > 0 ? trx.paymentHistory.map((pay: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-500 uppercase">
                      Pembayaran ke {pay.index} | {pay.date} | {pay.time}
                    </span>
                    <span className="font-black text-slate-800">Rp {pay.amount.toLocaleString('id-ID')}</span>
                  </div>
                )) : (
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-500 uppercase">Sudah Dibayar</span>
                    <span className="font-black text-slate-800">Rp {(trx.paidAmount || 0).toLocaleString('id-ID')}</span>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                  </div>
                )}
              </div>

<<<<<<< HEAD
              <div className="pt-3 mt-2 border-t border-dashed border-neutral-200 flex justify-between items-center text-xs font-black">
                <span className="uppercase text-[9px] tracking-widest text-emerald-600">Total dibayarkan bersih</span>
                <span className="text-emerald-700">Rp {summary.netPaid.toLocaleString('id-ID')}</span>
              </div>
              
              {summary.effectiveStatus === 'DP' && (
                <div className="flex justify-between items-center text-xs font-black text-orange-600">
                  <span className="uppercase text-[9px] tracking-widest">Sisa Pelunasan</span>
                  <span className="font-serif text-lg font-bold">Rp {summary.netRemaining.toLocaleString('id-ID')}</span>
=======
              <div className="pt-3 mt-2 border-t border-dashed flex justify-between items-center text-xs font-black">
                <span className="uppercase text-[9px] tracking-widest text-emerald-600">Total dibayarkan</span>
                <span className="text-emerald-700">Rp {(trx.paidAmount || 0).toLocaleString('id-ID')}</span>
              </div>
              
              {trx.status === 'DP' && (
                <div className="flex justify-between items-center text-xs font-black text-orange-600">
                  <span className="uppercase text-[9px] tracking-widest">Sisa Pelunasan</span>
                  <span className="text-lg">Rp {(trx.remainingAmount || 0).toLocaleString('id-ID')}</span>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                </div>
              )}
            </div>
          </div>
        </div>
<<<<<<< HEAD
        <DialogFooter className="p-6 bg-white border-t border-neutral-200/70 shrink-0">
          <Button className="w-full h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black uppercase text-[10px] tracking-widest transition-all" onClick={onClose}>Tutup Rincian</Button>
=======
        <DialogFooter className="p-6 bg-white border-t shrink-0">
          <Button variant="outline" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={onClose}>Tutup Rincian</Button>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
