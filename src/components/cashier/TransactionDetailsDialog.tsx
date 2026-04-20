
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
import { Package, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TransactionDetailsDialogProps {
  trx: any;
  onClose: () => void;
}

export function TransactionDetailsDialog({ trx, onClose }: TransactionDetailsDialogProps) {
  if (!trx) return null;

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
              </button>
            </div>
          </div>
        </DialogHeader>
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
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <Package className="h-4 w-4 text-primary" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Daftar Produk</h3>
            </div>
            <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow className="text-[9px] font-black uppercase border-none hover:bg-transparent">
                    <TableHead className="pl-6">Produk</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right pr-6">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trx.items?.map((item: any, i: number) => {
                    const labelPrice = item.labelPrice || item.price;
                    const qty = item.quantity || 1;
                    const subtotalBeforeDisc = labelPrice * qty;
                    const discPct = item.storeDiscountPercent || 0;
                    const discNom = item.storeDiscountNominal || 0;
                    const totalItemDisc = (discPct > 0 ? (labelPrice * discPct / 100) : discNom) * qty;

                    return (
                      <TableRow key={i} className="border-b last:border-none hover:bg-slate-50/50 transition-colors">
                        <TableCell className="pl-6 py-3">
                          <p className="font-black text-[11px] uppercase leading-tight text-slate-800">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold mt-0.5">
                            {item.brand || '-'} | {item.category || '-'} | {item.color} | {item.size}
                          </p>
                          {totalItemDisc > 0 && (
                            <p className="text-[9px] text-rose-600 font-black mt-1">
                              Potongan: -Rp {totalItemDisc.toLocaleString('id-ID')} ({discPct > 0 ? `${discPct}%` : 'Fixed'})
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-black text-xs text-slate-800">{qty}</TableCell>
                        <TableCell className="text-right pr-6 font-black text-xs text-slate-800">
                          Rp {subtotalBeforeDisc.toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2.5">
            <div className="flex justify-between text-[11px] font-bold text-slate-400">
              <span>SUBTOTAL (HARGA LABEL)</span>
              <span>Rp {(trx.subtotalLabel || 0).toLocaleString('id-ID')}</span>
            </div>
            
            <div className="flex justify-between text-[11px] font-bold text-rose-500">
              <span>DISKON TOKO</span>
              <span>-Rp {(trx.storeDiscount || 0).toLocaleString('id-ID')}</span>
            </div>
            
            <div className="flex justify-between text-[11px] font-bold text-rose-500">
              <span>DISKON TAMBAHAN</span>
              <span>-Rp {((trx.additionalManualDiscount || 0) + (trx.voucherDiscount || 0)).toLocaleString('id-ID')}</span>
            </div>

            <div className="pt-1.5 mt-1.5 border-t border-dashed flex justify-between text-[11px] font-black text-rose-600 uppercase tracking-tight">
              <span>Total Seluruh Potongan</span>
              <span>-Rp {(trx.totalDiscount || 0).toLocaleString('id-ID')}</span>
            </div>

            <div className="pt-3 mt-3 border-t-2 border-primary/10 flex justify-between items-center">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">Total Tagihan</span>
              <span className="text-xl font-black text-primary tracking-tighter">Rp {trx.total.toLocaleString('id-ID')}</span>
            </div>
            
            <div className="flex justify-between text-xs font-black text-emerald-600 pt-1">
              <span className="uppercase text-[9px] tracking-widest">Sudah Dibayar</span>
              <span>Rp {trx.paidAmount.toLocaleString('id-ID')}</span>
            </div>
            
            {trx.status === 'DP' && (
              <div className="flex justify-between text-xs font-black text-orange-600 border-t border-orange-100 pt-2 mt-1">
                <span className="uppercase text-[9px] tracking-widest">Sisa Pelunasan</span>
                <span>Rp {trx.remainingAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="p-6 bg-white border-t shrink-0">
          <Button variant="outline" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={onClose}>Tutup Rincian</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
