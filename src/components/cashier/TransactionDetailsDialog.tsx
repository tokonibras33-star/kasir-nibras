
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
import { Package, X, Clock, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { getItemUnitNetPrice, getTrxReturnSummary } from "./types";

interface TransactionDetailsDialogProps {
  trx: any;
  onClose: () => void;
}

export function TransactionDetailsDialog({ trx, onClose }: TransactionDetailsDialogProps) {
  if (!trx) return null;

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
                  {summary.isDpTransaction && (
                    <Badge className="text-[9px] font-black px-2.5 py-1 rounded-full border-none bg-orange-500 text-white">
                      DP
                    </Badge>
                  )}
                  <Badge className={cn("text-[9px] font-black px-3 py-1 rounded-full border-none", summary.effectiveStatus === 'DP' ? "bg-orange-600 text-white" : "bg-[#C82368] text-white")}>
                    {summary.effectiveStatus === 'DP' ? 'BELUM LUNAS' : summary.isDpTransaction ? 'LUNAS (DP)' : summary.effectiveStatus}
                  </Badge>
                </>
              )}
              <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-full transition-colors">
                <X className="h-4 w-4 text-white/70" />
              </button>
            </div>
          </div>
        </DialogHeader>
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
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 px-2">
              <Package className="h-4 w-4 text-[#C82368]" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Daftar Produk</h3>
            </div>
            <Card className="rounded-3xl border border-neutral-200/70 shadow-sm overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-[#F5F3F0]/60">
                  <TableRow className="text-[9px] font-black uppercase border-none hover:bg-transparent">
                    <TableHead className="pl-6">Produk</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right pr-4">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayItems.map((item: any, i: number) => {
                    const labelPrice = item.labelPrice || item.price;
                    const qty = item.quantity || 1;
                    const subtotalBeforeDisc = labelPrice * qty;
                    const discPct = item.storeDiscountPercent || 0;
                    const discNom = item.storeDiscountNominal || 0;
                    const totalItemDisc = (discPct > 0 ? (labelPrice * discPct / 100) : discNom) * qty;

                    return (
                      <TableRow key={i} className="border-b border-neutral-100 last:border-none hover:bg-[#F5F3F0]/40 transition-colors text-xs">
                        <TableCell className="pl-6 py-3">
                          <p className="font-black text-[11px] uppercase leading-tight text-neutral-900">{item.name}</p>
                          <p className="text-[9px] text-neutral-400 uppercase font-bold mt-0.5">
                            {item.brand || '-'} | {item.category || '-'} | {item.color} | {item.size}
                          </p>
                          {totalItemDisc > 0 && (
                            <p className="text-[9px] text-[#C82368] font-black mt-1">
                              Potongan: -Rp {totalItemDisc.toLocaleString('id-ID')} ({discPct > 0 ? `${discPct}%` : 'Fixed'})
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-black text-neutral-900">{qty}</TableCell>
                        <TableCell className="text-right pr-4 font-black text-neutral-900">
                          Rp {subtotalBeforeDisc.toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>

          {summary.hasReturn && (
            <div className="space-y-3">
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

              {summary.hasExchange && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-2">
                    <Package className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                      Barang Pengganti (Tukar dari Retur)
                    </h3>
                  </div>
                  <Card className="rounded-3xl border border-emerald-200/80 shadow-sm overflow-hidden bg-emerald-50/40 p-4 space-y-2">
                    {summary.exchangeItems.map((item: any, idx: number) => {
                      const unitNet = getItemUnitNetPrice(item);
                      const labelPrice = Number(item.labelPrice || item.price || unitNet);
                      const qty = Number(item.quantity || 1);
                      const itemDisc = Math.max(0, labelPrice - unitNet) * qty;
                      return (
                        <div key={idx} className="flex justify-between items-center text-xs border-b border-emerald-100 last:border-none pb-2 last:pb-0">
                          <div>
                            <p className="font-black uppercase text-neutral-900">{item.name}</p>
                            <p className="text-[9px] font-bold text-neutral-500 uppercase">
                              {item.color || "-"} | {item.size || "-"} • {qty}x @Rp {labelPrice.toLocaleString("id-ID")}
                              {itemDisc > 0 ? ` (Disc Rp ${itemDisc.toLocaleString("id-ID")})` : ""}
                            </p>
                          </div>
                          <span className="font-black text-emerald-700">+Rp {(unitNet * qty).toLocaleString("id-ID")}</span>
                        </div>
                      );
                    })}
                  </Card>
                </div>
              )}
            </div>
          )}

          <div className="bg-white p-6 rounded-3xl border border-neutral-200/70 shadow-sm space-y-4">
            {summary.hasReturn && (
              <div className="space-y-2 border-b border-dashed border-neutral-200 pb-3">
                <div className="flex justify-between items-center text-[11px] font-bold text-neutral-500 uppercase">
                  <span>Tagihan Transaksi Awal</span>
                  <span>Rp {summary.originalTotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between items-center text-[11px] font-black text-rose-600 uppercase">
                  <span>Nilai Barang Diretur (-)</span>
                  <span>-Rp {summary.totalRefund.toLocaleString("id-ID")}</span>
                </div>
                {summary.hasExchange && (
                  <div className="flex justify-between items-center text-[11px] font-black text-emerald-700 uppercase">
                    <span>Nilai Barang Pengganti (+)</span>
                    <span>+Rp {summary.exchangeTotal.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="pt-1.5 border-t border-neutral-100 flex justify-between items-center text-[11px] font-black uppercase">
                  {summary.netExchangeDiff > 0 ? (
                    <>
                      <span className="text-orange-700">Selisih Retur (Tambah Bayar)</span>
                      <span className="text-orange-700">+Rp {summary.netExchangeDiff.toLocaleString("id-ID")}</span>
                    </>
                  ) : summary.netExchangeDiff < 0 ? (
                    <>
                      <span className="text-emerald-700">Selisih Retur (Sisa Dikembalikan)</span>
                      <span className="text-emerald-700">Rp {Math.abs(summary.netExchangeDiff).toLocaleString("id-ID")}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-neutral-700">Selisih Tukar Barang</span>
                      <span className="text-neutral-900">Rp 0 (PAS)</span>
                    </>
                  )}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-neutral-900 border-b border-neutral-100 pb-3">
              <span>Total Tagihan {summary.hasReturn ? "Bersih" : ""}</span>
              <span className="font-serif text-xl font-bold">Rp {summary.netTotal.toLocaleString('id-ID')}</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-3.5 w-3.5 text-[#C82368]" />
                <span className="text-[9px] font-black uppercase tracking-widest text-[#C82368]">Sudah dibayar :</span>
              </div>
              
              <div className="space-y-2 border-l-2 border-[#C82368]/25 pl-4 ml-1.5">
                {summary.isDpTransaction && summary.dpStages.length > 0 ? (
                  summary.dpStages.map((st) => (
                    <div key={st.index} className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-neutral-600 uppercase">
                        <strong className={st.isSettlement ? "text-emerald-700" : "text-orange-700"}>{st.label}</strong> • Tgl {st.dateStr}
                        {st.timeStr ? ` (${st.timeStr})` : ""}
                      </span>
                      <span className="font-black text-neutral-900">Rp {st.amount.toLocaleString('id-ID')}</span>
                    </div>
                  ))
                ) : trx.paymentHistory?.length > 0 ? (
                  trx.paymentHistory.map((pay: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-neutral-500 uppercase">
                        Pembayaran ke {pay.index} | {pay.date} | {pay.time}
                      </span>
                      <span className="font-black text-neutral-900">Rp {pay.amount.toLocaleString('id-ID')}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-neutral-500 uppercase">Sudah Dibayar</span>
                    <span className="font-black text-neutral-900">Rp {summary.netPaid.toLocaleString('id-ID')}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 mt-2 border-t border-dashed border-neutral-200 flex justify-between items-center text-xs font-black">
                <span className="uppercase text-[9px] tracking-widest text-emerald-600">Total dibayarkan bersih</span>
                <span className="text-emerald-700">Rp {summary.netPaid.toLocaleString('id-ID')}</span>
              </div>
              
              {summary.effectiveStatus === 'DP' && (
                <div className="flex justify-between items-center text-xs font-black text-orange-600">
                  <span className="uppercase text-[9px] tracking-widest">Kekurangan Bayar (Sisa Pelunasan)</span>
                  <span className="font-serif text-lg font-bold">Rp {summary.netRemaining.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="p-6 bg-white border-t border-neutral-200/70 shrink-0">
          <Button className="w-full h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black uppercase text-[10px] tracking-widest transition-all" onClick={onClose}>Tutup Rincian</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
