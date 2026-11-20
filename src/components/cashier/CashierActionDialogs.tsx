"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { RotateCcw, Plus, Minus, Loader2, MessageSquare } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrencyInput, getItemUnitNetPrice, getTrxReturnSummary, parseCurrencyInput } from "./types";

interface CashierActionDialogsProps {
  showSettings: boolean;
  setShowSettings: (open: boolean) => void;
  cashierName: string;
  setCashierName: (name: string) => void;

  isCashDialogOpen: boolean;
  setIsCashDialogOpen: (open: boolean) => void;
  amountToProcess: number;
  receivedCash: string;
  setReceivedCash: (val: string) => void;
  settlementTrx: any;
  onConfirmCashPayment: (payload: { received: number; change: number }) => void;

  isReturnDialogOpen: boolean;
  setIsReturnDialogOpen: (open: boolean) => void;
  trxForReturn: any;
  returnQtys: Record<string, number>;
  setReturnQtys: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  isProcessing: boolean;
  onConfirmReturn: () => void;

  waReceiptTrx: any;
  waReceiptPhone: string;
  setWaReceiptPhone: (phone: string) => void;
  onCloseWaReceipt: () => void;
  onSendWaReceiptWithPhone: (trx: any, phone: string) => void;
}

export function CashierActionDialogs({
  showSettings,
  setShowSettings,
  cashierName,
  setCashierName,
  isCashDialogOpen,
  setIsCashDialogOpen,
  amountToProcess,
  receivedCash,
  setReceivedCash,
  onConfirmCashPayment,
  isReturnDialogOpen,
  setIsReturnDialogOpen,
  trxForReturn,
  returnQtys,
  setReturnQtys,
  isProcessing,
  onConfirmReturn,
  waReceiptTrx,
  waReceiptPhone,
  setWaReceiptPhone,
  onCloseWaReceipt,
  onSendWaReceiptWithPhone,
}: CashierActionDialogsProps) {
  return (
    <>
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-6 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-xl font-bold tracking-wide">Pengaturan Kasir</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5 bg-white">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-600 ml-1">
                Nama Tampilan Kasir
              </Label>
              <Input
                value={cashierName}
                onChange={(e) => setCashierName(e.target.value)}
                placeholder="Nama Kasir..."
                className="h-12 rounded-2xl bg-[#F5F3F0] border-transparent focus-visible:ring-1 focus-visible:ring-neutral-900 font-bold"
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 bg-white">
            <Button
              className="w-full h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black text-xs uppercase tracking-widest transition-all"
              onClick={() => {
                localStorage.setItem("nibras_house_cashier_name", cashierName);
                setShowSettings(false);
                toast({ title: "Tersimpan" });
              }}
            >
              SIMPAN PENGATURAN
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-[2.25rem] p-0 overflow-hidden text-center border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-6 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-2xl font-bold mx-auto">Input Tunai</DialogTitle>
          </DialogHeader>
          <div className="p-7 space-y-5 bg-white">
            <div>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Tagihan</p>
              <p className="font-serif text-3xl font-bold text-[#C82368]">
                {formatCurrencyInput(amountToProcess)}
              </p>
            </div>
            <input
              type="text"
              value={formatCurrencyInput(receivedCash)}
              onChange={(e) => setReceivedCash(parseCurrencyInput(e.target.value))}
              className="h-16 w-full text-center text-3xl font-black border-none bg-[#F5F3F0] text-neutral-950 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#C82368]"
              placeholder="Rp 0"
              autoFocus
            />
            {parseFloat(receivedCash) >= amountToProcess && (
              <div className="p-4 bg-[#F5F3F0] rounded-2xl border border-neutral-200">
                <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Kembalian</p>
                <p className="font-serif text-2xl font-bold text-emerald-700">
                  Rp{(parseFloat(receivedCash) - amountToProcess).toLocaleString("id-ID")}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="p-6 pt-0 bg-white flex gap-3">
            <Button
              variant="ghost"
              className="flex-1 rounded-full font-bold h-12 hover:bg-[#F5F3F0]"
              onClick={() => setIsCashDialogOpen(false)}
            >
              BATAL
            </Button>
            <Button
              className="flex-1 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black h-12 shadow-lg uppercase tracking-wider text-xs transition-all"
              disabled={!receivedCash || parseFloat(receivedCash) < amountToProcess}
              onClick={() =>
                onConfirmCashPayment({
                  received: parseFloat(receivedCash),
                  change: parseFloat(receivedCash) - amountToProcess,
                })
              }
            >
              PROSES
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-2xl rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-6 sm:p-7 bg-neutral-950 text-white shrink-0 flex flex-row items-center justify-between gap-3">
            <div>
              <DialogTitle className="font-serif text-xl sm:text-2xl font-bold flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-[#F48FB1]" /> Retur Barang
              </DialogTitle>
              {trxForReturn && (
                <p className="text-[10px] font-bold text-white/60 mt-1 uppercase tracking-widest">
                  {trxForReturn.id} • {trxForReturn.customerName || "UMUM"}
                </p>
              )}
            </div>
            {(() => {
              const itemsToReturn = getTrxReturnSummary(trxForReturn).returnableItems;
              if (itemsToReturn.length === 0) return null;
              return (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-[#C82368] hover:border-[#C82368] rounded-full text-[10px] font-black uppercase px-3.5 h-8"
                  onClick={() => {
                    const next: Record<string, number> = {};
                    itemsToReturn.forEach((it: any) => {
                      next[`${it.productId}-${it.variantId}`] = it.quantity;
                    });
                    setReturnQtys(next);
                  }}
                >
                  Pilih Semua
                </Button>
              );
            })()}
          </DialogHeader>
          {(() => {
            const returnSummary = getTrxReturnSummary(trxForReturn);
            const returnableItems = returnSummary.returnableItems;
            const totalSelectedQty = returnableItems.reduce(
              (s: number, it: any) => s + Math.min(it.quantity, returnQtys[`${it.productId}-${it.variantId}`] || 0),
              0
            );
            const totalReturnableQty = returnableItems.reduce((s: number, it: any) => s + (it.quantity || 0), 0);
            const isSelectingAll = totalReturnableQty > 0 && totalSelectedQty === totalReturnableQty;
            const estimatedRefund = isSelectingAll
              ? returnSummary.netTotal
              : Math.min(
                  returnSummary.netTotal,
                  returnableItems.reduce((sum: number, it: any) => {
                    const key = `${it.productId}-${it.variantId}`;
                    const q = Math.min(it.quantity, returnQtys[key] || 0);
                    return sum + getItemUnitNetPrice(it) * q;
                  }, 0)
                );

            return (
              <>
                <div className="p-5 sm:p-7 space-y-3 max-h-[55vh] overflow-y-auto bg-[#F5F3F0]">
                  {returnableItems.length > 0 ? (
                    returnableItems.map((item: any) => {
                      const key = `${item.productId}-${item.variantId}`;
                      const unitNet = getItemUnitNetPrice(item);
                      const selectedQty = returnQtys[key] || 0;
                      return (
                        <Card
                          key={key}
                          className="p-4 rounded-2xl border border-neutral-200/70 bg-white shadow-sm flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-xs uppercase text-neutral-900 truncate">{item.name}</p>
                            <p className="text-[9px] text-neutral-400 uppercase font-bold mt-0.5">
                              {item.color} | {item.size} • @Rp {unitNet.toLocaleString("id-ID")}
                            </p>
                            {item.alreadyReturnedQuantity > 0 && (
                              <p className="text-[9px] text-rose-500 font-bold mt-0.5">
                                Sudah diretur sebelumnya: {item.alreadyReturnedQuantity} pcs
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] font-bold text-neutral-400">Max: {item.quantity}</span>
                            <div className="flex items-center gap-2 bg-[#F5F3F0] p-1 rounded-full">
                              <button
                                type="button"
                                className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-neutral-950 hover:text-white transition-colors"
                                onClick={() =>
                                  setReturnQtys((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - 1) }))
                                }
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </button>
                              <span className="w-6 text-center font-black text-neutral-900">{selectedQty}</span>
                              <button
                                type="button"
                                className="h-8 w-8 bg-white rounded-full flex items-center justify-center shadow-sm hover:bg-[#C82368] hover:text-white transition-colors"
                                onClick={() =>
                                  setReturnQtys((prev) => ({
                                    ...prev,
                                    [key]: Math.min(item.quantity, (prev[key] || 0) + 1),
                                  }))
                                }
                              >
                                <Plus className="h-2.5 w-2.5" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  ) : (
                    <div className="py-10 text-center text-xs font-black uppercase tracking-widest text-neutral-400">
                      Seluruh barang pada transaksi ini sudah diretur.
                    </div>
                  )}
                </div>
                <DialogFooter className="p-5 sm:p-6 bg-white border-t border-neutral-200/70 flex flex-col sm:flex-col gap-3">
                  <div className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-rose-50 border border-rose-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-700">
                      Estimasi Pengembalian Dana ({totalSelectedQty} pcs)
                    </span>
                    <span className="font-serif text-lg font-bold text-rose-700">
                      Rp {estimatedRefund.toLocaleString("id-ID")}
                    </span>
                  </div>
                  <Button
                    className="w-full h-12 rounded-full font-black bg-[#C82368] hover:bg-neutral-950 uppercase tracking-widest text-white shadow-lg transition-all"
                    disabled={isProcessing || totalSelectedQty === 0}
                    onClick={onConfirmReturn}
                  >
                    {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "KONFIRMASI RETUR"}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!waReceiptTrx}
        onOpenChange={(o) => {
          if (!o) onCloseWaReceipt();
        }}
      >
        <DialogContent className="max-w-md w-[92vw] rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-6 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-lg sm:text-xl font-bold flex items-center gap-2.5">
              <MessageSquare className="h-5 w-5 text-[#25D366]" />
              Kirim Struk via WhatsApp
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Transaksi {waReceiptTrx?.id} belum memiliki nomor WhatsApp tersimpan.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6 space-y-3 bg-white">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-500">
                Nomor WhatsApp Tujuan
              </Label>
              <Input
                type="tel"
                value={waReceiptPhone}
                onChange={(e) => setWaReceiptPhone(e.target.value)}
                placeholder="Contoh: 081234567890"
                className="h-12 rounded-2xl bg-[#F5F3F0] border-transparent font-bold text-sm"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 bg-white flex gap-2.5">
            <Button
              variant="ghost"
              className="flex-1 rounded-full font-bold h-11 hover:bg-[#F5F3F0]"
              onClick={onCloseWaReceipt}
            >
              BATAL
            </Button>
            <Button
              className="flex-1 rounded-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-black h-11 shadow-md uppercase tracking-wider text-xs"
              onClick={() => {
                if (waReceiptTrx) onSendWaReceiptWithPhone(waReceiptTrx, waReceiptPhone.trim());
              }}
            >
              KIRIM SEKARANG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

