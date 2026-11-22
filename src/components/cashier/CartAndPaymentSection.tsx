"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  X,
  Wallet,
  Calculator,
  Percent,
  Ticket,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle2,
  Printer,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CartItem,
  CustomerType,
  ExchangeReturnSession,
  Member,
  Agent,
  Reseller,
  formatCurrencyInput,
  getTrxReturnSummary,
  parseCurrencyInput,
} from "./types";

const CartItemRow = ({
  item,
  updateItemDiscountPercent,
  updateItemDiscountNominal,
  removeFromCart,
  updateQuantity,
  isSuccess,
  settlementTrx,
}: any) => {
  const [localPct, setLocalPct] = useState(
    item?.storeDiscountPercent > 0 ? item.storeDiscountPercent.toString() : ""
  );
  const [localNom, setLocalNom] = useState(
    item?.storeDiscountNominal > 0 ? item.storeDiscountNominal.toString() : ""
  );

  useEffect(() => {
    if (item) {
      setLocalPct(item.storeDiscountPercent > 0 ? item.storeDiscountPercent.toString() : "");
      setLocalNom(item.storeDiscountNominal > 0 ? item.storeDiscountNominal.toString() : "");
    }
  }, [item]);

  if (!item) return null;

  const handlePctBlur = () => updateItemDiscountPercent(item.cartId, localPct);
  const handleNomBlur = () => updateItemDiscountNominal(item.cartId, localNom);

  return (
    <div className={cn("flex flex-col gap-1 pb-3 mb-1 border-b last:border-0 border-white/10")}>
      <div className="flex justify-between items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] md:text-[11px] uppercase leading-tight font-black text-white line-clamp-2">
            {item.name}
          </p>
          <p className="text-[7px] md:text-[9px] font-bold text-white/60">
            {item.color}/{item.size}/{item.buyDiscount || "0"}%
          </p>
        </div>
        {!isSuccess && !settlementTrx && (
          <button
            onClick={() => removeFromCart(item.cartId)}
            className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors text-rose-300"
          >
            <Trash2 className="h-3 md:h-3.5 w-3 md:w-3.5" />
          </button>
        )}
      </div>
      {!isSuccess && !settlementTrx && (
        <div className="flex flex-col sm:flex-row items-center gap-1.5 pt-1.5 mt-1 border-t border-dashed border-white/10">
          <div className="flex gap-1 w-full sm:w-auto">
            <div className="flex-1 sm:w-10">
              <Input
                placeholder="%"
                value={localPct}
                onChange={(e) => {
                  setLocalPct(e.target.value);
                  if (e.target.value !== "") setLocalNom("");
                }}
                onBlur={handlePctBlur}
                className="h-6 md:h-7 border-none text-[8px] md:text-[10px] font-black text-center px-1 rounded-xl bg-white/10 text-white placeholder:text-white/40 shadow-none focus-visible:ring-1 focus-visible:ring-[#C82368]"
              />
            </div>
            <div className="flex-1 sm:w-16">
              <Input
                placeholder="DISC"
                value={localNom}
                onChange={(e) => {
                  setLocalNom(e.target.value);
                  if (e.target.value !== "") setLocalPct("");
                }}
                onBlur={handleNomBlur}
                className="h-6 md:h-7 border-none text-[8px] md:text-[10px] font-black text-center px-1 rounded-xl bg-white/10 text-white placeholder:text-white/40 shadow-none focus-visible:ring-1 focus-visible:ring-[#C82368]"
              />
            </div>
          </div>
          <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1 gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => updateQuantity(item.cartId, -1)}
                className="h-6 w-6 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-[#C82368] transition-colors"
              >
                <Minus className="h-2 w-2" />
              </button>
              <span className="text-[9px] font-black w-4 text-center text-white">{item.quantity}</span>
              <button
                onClick={() => updateQuantity(item.cartId, 1)}
                className="h-6 w-6 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-[#C82368] transition-colors"
              >
                <Plus className="h-2 w-2" />
              </button>
            </div>
            <p className="text-[9px] md:text-[10px] font-black leading-none text-white text-right">
              Rp{(item.price * item.quantity).toLocaleString("id-ID")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

interface CartAndPaymentSectionProps {
  cart: CartItem[];
  storeId: string;
  isSuccess: boolean;
  isProcessing: boolean;
  settlementTrx: any;
  onCancelSettlement: () => void;
  exchangeReturnSession?: ExchangeReturnSession | null;
  onCancelExchangeReturn?: () => void;
  isAdditionalDP: boolean;
  setIsAdditionalDP?: (val: boolean) => void;
  additionalDPInput: string;
  setAdditionalDPInput: (val: string) => void;
  receivedCash: string;
  setReceivedCash: (val: string) => void;
  customerType: CustomerType;
  onSelectCustomerType: (type: CustomerType) => void;
  updateItemDiscountPercent: (cartId: string, pct: string) => void;
  updateItemDiscountNominal: (cartId: string, nom: string) => void;
  removeFromCart: (cartId: string) => void;
  updateQuantity: (cartId: string, delta: number) => void;
  isDPMode: boolean;
  setIsDPMode: (val: boolean) => void;
  manualDPInput: string;
  setManualDPInput: (val: string) => void;
  isMultiMode: boolean;
  setIsMultiMode: (val: boolean) => void;
  multiCashAmount: string;
  setMultiCashAmount: (val: string) => void;
  manualAdditionalDiscount: string;
  setManualAdditionalDiscount: (val: string) => void;
  voucherInput: string;
  setVoucherCode: (val: string) => void;
  handleApplyVoucher: () => void;
  isValidatingVoucher: boolean;
  totalPotongan: number;
  totalTagihan: number;
  generalName: string;
  setGeneralName: (val: string) => void;
  generalPhone: string;
  setGeneralPhone: (val: string) => void;
  selectedMember: Member | null;
  selectedAgent: Agent | null;
  selectedReseller: Reseller | null;
  paymentMethod: "CASH" | "TRANSFER" | "QRIS";
  setPaymentMethod: (method: "CASH" | "TRANSFER" | "QRIS") => void;
  lastTrxId: string | null;
  onNewTransaction: () => void;
  onStartProcess: () => void;
}

export function CartAndPaymentSection({
  cart,
  storeId,
  isSuccess,
  isProcessing,
  settlementTrx,
  onCancelSettlement,
  exchangeReturnSession,
  onCancelExchangeReturn,
  isAdditionalDP,
  setIsAdditionalDP,
  additionalDPInput,
  setAdditionalDPInput,
  receivedCash,
  setReceivedCash,
  customerType,
  onSelectCustomerType,
  updateItemDiscountPercent,
  updateItemDiscountNominal,
  removeFromCart,
  updateQuantity,
  isDPMode,
  setIsDPMode,
  manualDPInput,
  setManualDPInput,
  isMultiMode,
  setIsMultiMode,
  multiCashAmount,
  setMultiCashAmount,
  manualAdditionalDiscount,
  setManualAdditionalDiscount,
  voucherInput,
  setVoucherCode,
  handleApplyVoucher,
  isValidatingVoucher,
  totalPotongan,
  totalTagihan,
  generalName,
  setGeneralName,
  generalPhone,
  setGeneralPhone,
  selectedMember,
  selectedAgent,
  selectedReseller,
  paymentMethod,
  setPaymentMethod,
  lastTrxId,
  onNewTransaction,
  onStartProcess,
}: CartAndPaymentSectionProps) {
  return (
    <div className="h-[55vh] md:h-full grid grid-cols-2 md:grid md:grid-cols-6 overflow-hidden md:col-span-6">
      <aside className="border-r border-neutral-900/10 flex flex-col bg-[#ECEAE6] col-span-1 md:col-span-3 h-full overflow-hidden">
        <Card className="flex-1 md:rounded-[2rem] bg-neutral-950 text-white border border-neutral-800 flex flex-col overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.25)] relative md:m-4">
          <div className="p-2 md:p-4 border-b border-white/10 shrink-0">
            <div className="hidden md:flex items-center gap-2 mb-3">
              <ShoppingCart className="h-4 w-4 text-[#F48FB1]" />
              <span className="font-serif text-sm font-bold tracking-wide text-white">Keranjang</span>
              <Badge className="ml-auto bg-[#C82368] text-white border-none h-5 px-2 rounded-full text-[9px] font-black">
                {cart.length}
              </Badge>
            </div>
            {exchangeReturnSession ? (
              <div className="bg-rose-500/20 p-2 md:p-3 rounded-2xl border border-rose-400/30 flex justify-between items-center animate-in slide-in-from-top duration-300">
                <div className="min-w-0 flex-1">
                  <p className="text-[7px] md:text-[8px] font-black text-rose-300 uppercase tracking-widest mb-0.5 truncate flex items-center gap-1">
                    <RotateCcw className="h-2.5 w-2.5" /> MODE TUKAR BARANG RETUR
                  </p>
                  <p className="text-[9px] md:text-[11px] font-black text-white uppercase truncate">
                    {exchangeReturnSession.trx.id} • Kredit Retur Rp{exchangeReturnSession.returnCreditAmount.toLocaleString("id-ID")}
                  </p>
                </div>
                {onCancelExchangeReturn && (
                  <button
                    onClick={onCancelExchangeReturn}
                    className="text-white/60 hover:text-white p-1 bg-white/10 rounded-full transition-all ml-2"
                    title="Batalkan Mode Retur"
                  >
                    <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  </button>
                )}
              </div>
            ) : settlementTrx ? (
              <div className="bg-white/10 p-2 md:p-3 rounded-2xl border border-white/15 flex justify-between items-center animate-in slide-in-from-top duration-300">
                <div className="min-w-0 flex-1">
                  <p className="text-[7px] md:text-[8px] font-black text-[#F48FB1] uppercase tracking-widest mb-0.5 truncate">
                    {isAdditionalDP ? "MODE DP+" : "PELUNASAN"}
                  </p>
                  <p className="text-[9px] md:text-[11px] font-black text-white uppercase truncate">
                    {settlementTrx.id}
                  </p>
                </div>
                <button
                  onClick={onCancelSettlement}
                  className="text-white/50 hover:text-white p-1 bg-white/10 rounded-full transition-all ml-2"
                >
                  <X className="h-3.5 w-3.5 md:h-4 md:w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-1 p-1 bg-white/10 rounded-full border border-white/10 overflow-x-auto scrollbar-hide">
                {(["UMUM", "MEMBER", "AGEN", "RESELLER", "ONLINE"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => onSelectCustomerType(type)}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center py-1.5 md:py-2 rounded-full transition-all min-w-[50px]",
                      customerType === type ? "bg-[#C82368] text-white shadow-sm" : "text-white/55 hover:text-white"
                    )}
                  >
                    <span className="text-[6px] xs:text-[7px] md:text-[8px] font-black uppercase leading-none">
                      {type}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 px-2 md:px-4 py-2">
            {exchangeReturnSession && cart.length === 0 && (
              <div className="p-3 md:p-4 my-2 rounded-2xl border border-dashed border-rose-400/40 bg-rose-500/10 text-center space-y-1">
                <RotateCcw className="h-5 w-5 text-rose-300 mx-auto animate-spin" style={{ animationDuration: '6s' }} />
                <p className="text-[9px] md:text-[10px] font-black uppercase text-rose-200">
                  Pilih Barang Pengganti
                </p>
                <p className="text-[8px] md:text-[9px] text-white/70 leading-relaxed">
                  Klik produk di katalog kiri untuk dimasukkan sebagai barang tukar/pengganti retur ({exchangeReturnSession.returnedItems.reduce((s, i) => s + (i.quantity || 1), 0)} pcs diretur).
                </p>
              </div>
            )}
            {cart.map((item) => (
              <CartItemRow
                key={item.cartId}
                item={item}
                updateItemDiscountPercent={updateItemDiscountPercent}
                updateItemDiscountNominal={updateItemDiscountNominal}
                removeFromCart={removeFromCart}
                updateQuantity={updateQuantity}
                isSuccess={isSuccess}
                settlementTrx={settlementTrx}
              />
            ))}
          </ScrollArea>

          <div className="p-2 md:p-5 border-t border-dashed border-white/15 shrink-0 space-y-2 md:space-y-4 bg-white/[0.03]">
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => setIsDPMode(!isDPMode)}
                  disabled={!!settlementTrx || customerType === "ONLINE"}
                  className={cn(
                    "h-7 md:h-9 rounded-full text-[8px] md:text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1",
                    isDPMode ? "bg-[#C82368] text-white shadow-md" : "bg-white/10 text-white/70 hover:text-white border border-white/10"
                  )}
                >
                  <Wallet className="h-3 w-3 md:h-3.5 md:w-3.5" /> DP
                </button>
                <button
                  onClick={() => setIsMultiMode(!isMultiMode)}
                  disabled={!!settlementTrx || customerType === "ONLINE"}
                  className={cn(
                    "h-7 md:h-9 rounded-full text-[8px] md:text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1",
                    isMultiMode ? "bg-[#C82368] text-white shadow-md" : "bg-white/10 text-white/70 hover:text-white border border-white/10"
                  )}
                >
                  <Calculator className="h-3 w-3 md:h-3.5 md:w-3.5" /> MULTI
                </button>
              </div>
              <div className="relative group">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40">
                  <Percent className="h-3 w-3 md:h-3.5 md:w-3.5" />
                </div>
                <Input
                  placeholder="DISC TAMBAHAN"
                  type="number"
                  value={manualAdditionalDiscount}
                  onChange={(e) => setManualAdditionalDiscount(e.target.value)}
                  disabled={!!settlementTrx}
                  className="h-7 md:h-9 pl-7 md:pl-8 bg-white/10 border-none text-white text-[8px] md:text-[10px] font-black rounded-xl placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#C82368]"
                />
              </div>
            </div>
            <div className="relative group">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40">
                <Ticket className="h-3 w-3 md:h-3.5 md:w-3.5" />
              </div>
              <Input
                placeholder="VOCER"
                value={voucherInput}
                onChange={(e) => setVoucherCode(e.target.value)}
                disabled={!!settlementTrx}
                className="h-7 md:h-10 pl-7 md:pl-8 pr-11 md:pr-14 bg-white/10 border-none text-white text-[8px] md:text-[10px] font-black rounded-xl placeholder:text-white/35 focus-visible:ring-1 focus-visible:ring-[#C82368]"
              />
              <button
                onClick={handleApplyVoucher}
                disabled={isValidatingVoucher}
                className="absolute right-1 top-1 bottom-1 px-2 md:px-3 bg-[#C82368] hover:bg-[#a81b56] text-white rounded-lg text-[7px] md:text-[9px] font-black transition-colors"
              >
                CEK
              </button>
            </div>
            <div className="block md:block space-y-1 pt-1 md:pt-2 border-t border-white/10 md:border-none">
              <div className="flex justify-between items-center text-[7px] md:text-[10px] text-white/60 font-bold">
                <span>Total Potongan</span>
                <span className="text-[#F48FB1]">-Rp {totalPotongan.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex flex-col items-end pt-1 md:pt-2">
                <p className="text-[7px] md:text-[10px] font-black text-white/45 uppercase tracking-widest leading-none mb-1">
                  Tagihan
                </p>
                <p className="font-serif text-base md:text-3xl font-bold text-white tracking-tight leading-none">
                  Rp{totalTagihan.toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </aside>

      <aside className="bg-white/85 backdrop-blur-xl flex flex-col h-full overflow-hidden col-span-1 md:col-span-3 md:border-l border-neutral-900/10">
        <div className="hidden md:flex p-4 md:p-6 shrink-0 items-center gap-3 border-b border-neutral-900/10">
          <div className="bg-[#C82368]/10 p-2 rounded-full text-[#C82368]">
            <CreditCard className="h-4 w-4 md:h-5 md:w-5" />
          </div>
          <span className="font-serif text-base font-bold tracking-wide text-neutral-950">Pembayaran</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5 md:p-6 space-y-3 md:space-y-6 scrollbar-hide">
          {!isSuccess ? (
            <div className="space-y-3 md:space-y-6 animate-in fade-in slide-in-from-right duration-500">
              {exchangeReturnSession ? (
                (() => {
                  const credit = exchangeReturnSession.returnCreditAmount;
                  const replacementTotal = totalTagihan;
                  const diff = replacementTotal - credit;
                  const returnedCount = exchangeReturnSession.returnedItems.reduce(
                    (s, it) => s + Number(it.quantity || 1),
                    0
                  );

                  return (
                    <div className="p-2.5 md:p-4 rounded-2xl md:rounded-3xl border border-rose-200 bg-rose-50/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[7px] md:text-[9px] font-black uppercase tracking-wider text-rose-700">
                          Kalkulasi Tukar Retur ({exchangeReturnSession.trx.id})
                        </span>
                        <Badge className="bg-rose-600 text-white border-none text-[7px] md:text-[8px] px-2 py-0.5 rounded-full font-black">
                          {returnedCount} PCS DIRETUR
                        </Badge>
                      </div>

                      <div className="space-y-1 text-[8px] md:text-[11px] bg-white p-2.5 rounded-xl border border-rose-100">
                        <div className="flex justify-between items-center text-neutral-600 font-bold">
                          <span>Nilai Barang Diretur</span>
                          <span className="text-rose-600 font-black">Rp{credit.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between items-center text-neutral-600 font-bold">
                          <span>Harga Barang Pengganti ({cart.reduce((s, i) => s + i.quantity, 0)} pcs)</span>
                          <span className="text-neutral-900 font-black">Rp{replacementTotal.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="pt-1.5 mt-1 border-t border-dashed border-neutral-200 flex justify-between items-center">
                          {diff > 0 ? (
                            <>
                              <span className="font-black uppercase text-orange-700 text-[8px] md:text-[10px]">
                                Tambah Bayar (Kurang)
                              </span>
                              <span className="font-serif font-bold text-xs md:text-lg text-orange-700">
                                +Rp{diff.toLocaleString("id-ID")}
                              </span>
                            </>
                          ) : diff < 0 ? (
                            <>
                              <span className="font-black uppercase text-emerald-700 text-[8px] md:text-[10px]">
                                Sisa Dikembalikan
                              </span>
                              <span className="font-serif font-bold text-xs md:text-lg text-emerald-700">
                                Rp{Math.abs(diff).toLocaleString("id-ID")}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-black uppercase text-neutral-700 text-[8px] md:text-[10px]">
                                Selisih Tukar
                              </span>
                              <span className="font-serif font-bold text-xs md:text-lg text-neutral-900">
                                Rp 0 (PAS)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : settlementTrx ? (
                (() => {
                  const settleSummary = getTrxReturnSummary(settlementTrx);
                  const nextDpIdx = (settleSummary.dpStages?.length || 1) + 1;
                  return (
                    <div className="p-2.5 md:p-5 rounded-2xl md:rounded-3xl border border-orange-200 bg-orange-50/80 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[7px] md:text-[10px] font-black uppercase text-orange-700 leading-none">
                          {isAdditionalDP ? `TAMBAH DP KE-${nextDpIdx}` : "PELUNASAN KEKURANGAN DP"}
                        </p>
                        <Badge className="bg-orange-600 text-white border-none text-[7px] md:text-[8px] px-2 py-0.5 rounded-full font-black">
                          {settlementTrx.id}
                        </Badge>
                      </div>

                      {setIsAdditionalDP && (
                        <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-full border border-orange-200">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAdditionalDP(true);
                              setAdditionalDPInput("");
                            }}
                            className={cn(
                              "py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase transition-all",
                              isAdditionalDP ? "bg-orange-600 text-white shadow-sm" : "text-orange-700 hover:bg-orange-50"
                            )}
                          >
                            + Bayar DP {nextDpIdx}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAdditionalDP(false);
                              setReceivedCash(settleSummary.netRemaining.toString());
                            }}
                            className={cn(
                              "py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase transition-all",
                              !isAdditionalDP ? "bg-orange-600 text-white shadow-sm" : "text-orange-700 hover:bg-orange-50"
                            )}
                          >
                            Pelunasan
                          </button>
                        </div>
                      )}

                      {/* Riwayat DP Sebelumnya Lengkap dengan Tanggal */}
                      <div className="bg-white p-2.5 rounded-xl border border-orange-100 space-y-1 text-[8px] md:text-[10px]">
                        <div className="flex justify-between font-bold text-neutral-500">
                          <span>Total Tagihan</span>
                          <span className="text-neutral-900 font-black">Rp{settleSummary.netTotal.toLocaleString("id-ID")}</span>
                        </div>
                        {settleSummary.dpStages.map((st) => (
                          <div key={st.index} className="flex justify-between font-bold text-orange-700">
                            <span>
                              {st.label} ({st.dateStr})
                            </span>
                            <span className="font-black">Rp{st.amount.toLocaleString("id-ID")}</span>
                          </div>
                        ))}
                        <div className="pt-1 border-t border-dashed border-orange-200 flex justify-between font-black text-rose-600">
                          <span>Kekurangan Bayar</span>
                          <span>Rp{settleSummary.netRemaining.toLocaleString("id-ID")}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[7px] md:text-[10px] font-black uppercase text-orange-700">
                          {isAdditionalDP ? `NOMINAL DP KE-${nextDpIdx} (RP)` : "NOMINAL PELUNASAN (RP)"}
                        </Label>
                        <input
                          type="text"
                          value={
                            isAdditionalDP
                              ? formatCurrencyInput(additionalDPInput)
                              : formatCurrencyInput(settleSummary.netRemaining)
                          }
                          readOnly={!isAdditionalDP}
                          onChange={(e) => {
                            if (isAdditionalDP) {
                              setAdditionalDPInput(parseCurrencyInput(e.target.value));
                            }
                          }}
                          className="h-9 md:h-12 w-full text-[10px] md:text-xl font-black bg-white border border-orange-200 text-orange-700 text-center rounded-2xl shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                          placeholder="Rp 0"
                        />
                      </div>
                    </div>
                  );
                })()
              ) : (
                <>
                  {isDPMode && (
                    <div className="p-2.5 md:p-5 bg-orange-50/80 rounded-2xl md:rounded-3xl border border-orange-200 space-y-1">
                      <Label className="text-[7px] md:text-[10px] font-black uppercase text-orange-600">
                        BAYAR DP (RP)
                      </Label>
                      <input
                        type="text"
                        value={formatCurrencyInput(manualDPInput)}
                        onChange={(e) => setManualDPInput(parseCurrencyInput(e.target.value))}
                        className="h-9 md:h-14 w-full text-[10px] md:text-2xl font-black bg-white border border-orange-200 text-orange-700 text-center rounded-2xl shadow-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
                        placeholder="Rp 0"
                      />
                    </div>
                  )}
                  {isMultiMode && (
                    <div className="p-2.5 md:p-5 bg-[#F5F3F0] rounded-2xl md:rounded-3xl border border-neutral-200 space-y-1">
                      <Label className="text-[7px] md:text-[10px] font-black uppercase text-[#C82368]">
                        INPUT TUNAI
                      </Label>
                      <input
                        type="text"
                        value={formatCurrencyInput(multiCashAmount)}
                        onChange={(e) => setMultiCashAmount(parseCurrencyInput(e.target.value))}
                        className="h-9 md:h-14 w-full text-[10px] md:text-2xl font-black bg-white border border-neutral-200 text-neutral-950 text-center rounded-2xl shadow-sm focus:outline-none focus:ring-1 focus:ring-[#C82368]"
                        placeholder="Rp 0"
                      />
                    </div>
                  )}
                  {(customerType === "UMUM" || customerType === "ONLINE") && (
                    <div className="space-y-2 md:space-y-3">
                      <Input
                        value={generalName}
                        onChange={(e) => setGeneralName(e.target.value)}
                        placeholder="Nama..."
                        className="h-9 md:h-12 rounded-2xl bg-[#F5F3F0] border-transparent focus-visible:ring-1 focus-visible:ring-neutral-900 font-bold text-[9px] md:text-sm"
                      />
                      <Input
                        value={generalPhone}
                        onChange={(e) => setGeneralPhone(e.target.value)}
                        placeholder="No WA..."
                        className="h-9 md:h-12 rounded-2xl bg-[#F5F3F0] border-transparent focus-visible:ring-1 focus-visible:ring-neutral-900 font-bold text-[9px] md:text-sm"
                      />
                    </div>
                  )}
                  {customerType === "MEMBER" && selectedMember && (
                    <Card className="p-2 md:p-4 rounded-2xl bg-[#C82368]/5 border border-[#C82368]/20 shadow-none">
                      <p className="text-[6px] md:text-[10px] font-black text-[#C82368] uppercase leading-none mb-1">
                        MEMBER:
                      </p>
                      <p className="font-black text-[9px] md:text-sm uppercase text-neutral-900 truncate">
                        {selectedMember.name}
                      </p>
                    </Card>
                  )}
                  {customerType === "AGEN" && selectedAgent && (
                    <Card className="p-2 md:p-4 rounded-2xl bg-[#C82368]/5 border border-[#C82368]/20 shadow-none">
                      <p className="text-[6px] md:text-[10px] font-black text-[#C82368] uppercase leading-none mb-1">
                        AGEN:
                      </p>
                      <p className="font-black text-[9px] md:text-sm uppercase text-neutral-900 truncate">
                        {selectedAgent.name}
                      </p>
                    </Card>
                  )}
                  {customerType === "RESELLER" && selectedReseller && (
                    <Card className="p-2 md:p-4 rounded-2xl bg-[#C82368]/5 border border-[#C82368]/20 shadow-none">
                      <p className="text-[6px] md:text-[10px] font-black text-[#C82368] uppercase leading-none mb-1">
                        RESELLER:
                      </p>
                      <p className="font-black text-[9px] md:text-sm uppercase text-neutral-900 truncate">
                        {selectedReseller.name}
                      </p>
                    </Card>
                  )}
                </>
              )}
              <div className="grid grid-cols-1 gap-2 md:gap-2.5">
                {(["CASH", "TRANSFER", "QRIS"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPaymentMethod(m)}
                    disabled={customerType === "ONLINE" && m !== "TRANSFER"}
                    className={cn(
                      "flex flex-row items-center h-11 md:h-16 px-3 md:px-5 gap-2.5 md:gap-4 rounded-2xl border transition-all btn-press",
                      paymentMethod === m
                        ? "border-neutral-950 bg-[#F5F3F0] text-neutral-950 shadow-sm"
                        : "border-neutral-200/70 bg-white text-neutral-400 hover:border-neutral-300",
                      customerType === "ONLINE" && m !== "TRANSFER" && "opacity-30 grayscale cursor-not-allowed"
                    )}
                  >
                    <div
                      className={cn(
                        "p-1.5 md:p-2.5 rounded-xl transition-all",
                        paymentMethod === m ? "bg-[#C82368] text-white shadow-sm" : "bg-[#F5F3F0] text-neutral-400"
                      )}
                    >
                      {m === "CASH" ? (
                        <Banknote className="h-3.5 w-3.5 md:h-5 md:w-5" />
                      ) : m === "TRANSFER" ? (
                        <CreditCard className="h-3.5 w-3.5 md:h-5 md:w-5" />
                      ) : (
                        <QrCode className="h-3.5 w-3.5 md:h-5 md:w-5" />
                      )}
                    </div>
                    <span className="text-[9px] md:text-xs font-black uppercase tracking-wider">{m}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4 md:space-y-6 animate-in zoom-in duration-500 h-full flex flex-col justify-center text-center">
              <div className="bg-[#F5F3F0] p-4 md:p-8 rounded-3xl border border-neutral-200/80 flex flex-col items-center gap-2">
                <div className="bg-[#C82368] p-2 md:p-4 rounded-full text-white shadow-lg">
                  <CheckCircle2 className="h-5 w-5 md:h-9 md:w-9" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-neutral-400">
                  Transaksi Sukses
                </p>
                <p className="font-serif text-sm md:text-xl font-bold text-neutral-950 truncate w-full">
                  {lastTrxId}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  className="h-10 md:h-12 rounded-full font-black text-[10px] md:text-xs tracking-wider uppercase bg-neutral-950 hover:bg-[#C82368] text-white flex items-center justify-center gap-2 transition-all btn-press"
                  onClick={() => window.open(`/cashier/print?id=${lastTrxId}&store=${storeId}`, "_blank")}
                >
                  <Printer className="h-3.5 w-3.5" /> STRUK
                </button>
                <button
                  className="h-10 md:h-12 rounded-full font-black text-[10px] md:text-xs tracking-wider uppercase bg-[#F5F3F0] hover:bg-neutral-200 text-neutral-900 transition-all btn-press"
                  onClick={onNewTransaction}
                >
                  BARU
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="p-2.5 md:p-6 shrink-0 border-t border-neutral-900/10 bg-[#F5F3F0]/60">
          {!isSuccess && (
            <Button
              className={cn(
                "w-full h-11 md:h-16 rounded-full font-black text-[10px] md:text-sm tracking-[0.12em] uppercase shadow-xl transition-all duration-300 text-white btn-press",
                exchangeReturnSession
                  ? "bg-[#C82368] hover:bg-neutral-950"
                  : settlementTrx
                  ? "bg-orange-600 hover:bg-orange-700"
                  : "bg-neutral-950 hover:bg-[#C82368]"
              )}
              disabled={isProcessing || (cart.length === 0 && !settlementTrx)}
              onClick={onStartProcess}
            >
              {isProcessing ? (
                <Loader2 className="animate-spin h-4 w-4 md:h-7 md:w-7" />
              ) : exchangeReturnSession ? (
                cart.length === 0 ? (
                  "PILIH BARANG PENGGANTI"
                ) : totalTagihan - exchangeReturnSession.returnCreditAmount > 0 ? (
                  `BAYAR SELISIH (+Rp${(totalTagihan - exchangeReturnSession.returnCreditAmount).toLocaleString("id-ID")})`
                ) : totalTagihan - exchangeReturnSession.returnCreditAmount < 0 ? (
                  `TUKAR & KEMBALIKAN SISA (Rp${Math.abs(totalTagihan - exchangeReturnSession.returnCreditAmount).toLocaleString("id-ID")})`
                ) : (
                  "SELESAIKAN TUKAR (PAS)"
                )
              ) : (
                "BAYAR"
              )}
            </Button>
          )}
        </div>
      </aside>
    </div>
  );
}

