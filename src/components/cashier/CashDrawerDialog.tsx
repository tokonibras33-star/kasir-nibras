'use client';

import { useState, useMemo, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Wallet, 
  Coins, 
  ShoppingCart, 
  ArrowDownToLine, 
  UserCheck, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  FileSearch,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  useFirestore, 
  useStorage, 
  setDocumentNonBlocking, 
  updateDocumentNonBlocking 
} from "@/firebase";
import { doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "@/hooks/use-toast";

interface CashDrawerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  displayStoreName: string;
  cashierName: string;
  cashLog: any;
  yesterdayRemaining: number;
  todaySalesStats: { cash: number; grossCash?: number; cashReturn?: number; transfer: number; qris: number };
  yesterdaySplit: any;
}

const formatCurrencyInput = (val: string | number) => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? val.replace(/[^0-9]/g, '') : Math.round(val).toString();
  if (!num) return '';
  return 'Rp ' + parseInt(num).toLocaleString('id-ID');
};

const parseCurrencyInput = (val: string) => {
  return val.replace(/[^0-9]/g, '');
};

export function CashDrawerDialog({ 
  open, 
  onOpenChange, 
  storeId, 
  displayStoreName, 
  cashierName,
  cashLog,
  yesterdayRemaining,
  todaySalesStats,
  yesterdaySplit
}: CashDrawerDialogProps) {
  const db = useFirestore();
  const storage = useStorage();
  const todayId = format(new Date(), "yyyy-MM-dd");

  const [initialCapitalInput, setInitialCapitalInput] = useState("");
  const [withdrawalAmountInput, setWithdrawalAmountInput] = useState("");
  const [withdrawalNoteInput, setWithdrawalNoteInput] = useState("");
  const [physicalCashInput, setPhysicalCashInput] = useState("");
  
  const [expenseType, setExpenseType] = useState("");
  const [expenseQty, setExpenseQty] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseImage, setExpenseImage] = useState("");
  const [isUploadingExpense, setIsUploadingExpense] = useState(false);

  useEffect(() => {
    if (cashLog?.modal_awal) setInitialCapitalInput(cashLog.modal_awal.toString());
    if (cashLog?.uang_fisik) setPhysicalCashInput(cashLog.uang_fisik.toString());
  }, [cashLog]);

  const totalWithdrawal = cashLog?.pengambilan?.reduce((s: number, w: any) => s + w.amount, 0) || 0;
  const totalExpense = cashLog?.pengeluaran?.reduce((s: number, e: any) => s + e.amount, 0) || 0;
  const grossCashSales = todaySalesStats.grossCash ?? todaySalesStats.cash ?? 0;
  const totalCashReturn = todaySalesStats.cashReturn ?? 0;

  // Hitung Saldo Akhir Sistem (expectedBalance)
  const expectedBalance =
    yesterdayRemaining + (cashLog?.modal_awal || 0) + grossCashSales - totalCashReturn - totalWithdrawal - totalExpense;

  const handlePrintAudit = async () => {
    try {
      const { jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const docPdf = new jsPDF();
      docPdf.text(`AUDIT KAS KASIR - ${displayStoreName}`, 105, 14, { align: "center" });
      docPdf.setFontSize(10);
      docPdf.text(`Tanggal: ${todayId} | Kasir: ${(cashierName || "-").toUpperCase()}`, 105, 21, { align: "center" });
      (docPdf as any).autoTable({
        startY: 28,
        head: [["Komponen", "Nominal"]],
        body: [
          ["Saldo Carry Over (Kemarin)", `Rp ${yesterdayRemaining.toLocaleString("id-ID")}`],
          ["Modal Baru Hari Ini", `Rp ${(cashLog?.modal_awal || 0).toLocaleString("id-ID")}`],
          ["Penjualan Tunai (+)", `Rp ${grossCashSales.toLocaleString("id-ID")}`],
          ["Retur Tunai (-)", `-Rp ${totalCashReturn.toLocaleString("id-ID")}`],
          ["Pengeluaran Toko (-)", `-Rp ${totalExpense.toLocaleString("id-ID")}`],
          ["Pengambilan Owner (-)", `-Rp ${totalWithdrawal.toLocaleString("id-ID")}`],
          ["Penjualan Transfer (Non-Tunai)", `Rp ${todaySalesStats.transfer.toLocaleString("id-ID")}`],
          ["Penjualan QRIS (Non-Tunai)", `Rp ${todaySalesStats.qris.toLocaleString("id-ID")}`],
          ["SALDO FISIK SISTEM", `Rp ${expectedBalance.toLocaleString("id-ID")}`],
        ],
        theme: "grid",
        headStyles: { fillColor: [23, 23, 23] },
      });
      docPdf.save(`audit-kas-${storeId}-${todayId}.pdf`);
      toast({ title: "Audit Kas PDF Diunduh" });
    } catch {
      toast({ title: "Gagal mencetak audit", variant: "destructive" });
    }
  };

  const handleSaveModal = () => { 
    const modal = parseFloat(initialCapitalInput) || 0; 
    setDocumentNonBlocking(doc(db, "stores", storeId, "cashLogs", todayId), { 
      modal_awal: modal, 
      saldo_awal_kemarin: yesterdayRemaining, 
      lastUpdated: serverTimestamp(), 
      updatedBy: cashierName 
    }, { merge: true }); 
    toast({ title: "Modal Awal Disimpan" }); 
  };

  const handleAddWithdrawal = () => { 
    const amount = parseFloat(withdrawalAmountInput); 
    if (!amount || amount <= 0) return; 
    const newWithdrawals = [...(cashLog?.pengambilan || []), { 
      amount, 
      timestamp: new Date().toISOString(), 
      note: withdrawalNoteInput, 
      cashier: cashierName 
    }]; 
    setDocumentNonBlocking(doc(db, "stores", storeId, "cashLogs", todayId), { 
      pengambilan: newWithdrawals, 
      lastUpdated: serverTimestamp() 
    }, { merge: true }); 
    setWithdrawalAmountInput(""); 
    setWithdrawalNoteInput(""); 
    toast({ title: "Pengambilan Dicatat" }); 
  };
  
  const handleAddExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (!expenseType || !amount || amount <= 0) {
      toast({ title: "Gagal", description: "Jenis dan Nominal wajib diisi.", variant: "destructive" });
      return;
    }
    const newExpenses = [...(cashLog?.pengeluaran || []), {
      type: expenseType,
      qty: expenseQty,
      amount,
      note: expenseNote,
      image: expenseImage,
      timestamp: new Date().toISOString(),
      cashier: cashierName
    }];
    setDocumentNonBlocking(doc(db, "stores", storeId, "cashLogs", todayId), { 
      pengeluaran: newExpenses, 
      lastUpdated: serverTimestamp() 
    }, { merge: true });
    setExpenseType(""); setExpenseQty(""); setExpenseAmount(""); setExpenseNote(""); setExpenseImage("");
    toast({ title: "Pengeluaran Dicatat" });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingExpense(true);
    try {
      const storageRef = ref(storage, `cashier/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setExpenseImage(downloadURL);
      toast({ title: "Berhasil Diunggah" });
    } catch (error) {
      toast({ title: "Upload Gagal", variant: "destructive" });
    } finally { setIsUploadingExpense(false); }
  };

  const handleSaveCashSettlement = () => { 
    const physical = parseFloat(physicalCashInput) || 0; 
    const diff = physical - expectedBalance; 
    setDocumentNonBlocking(doc(db, "stores", storeId, "cashLogs", todayId), { 
      uang_fisik: physical, 
      selisih: diff, 
      saldo_awal_kemarin: yesterdayRemaining, 
      total_cash: Math.max(0, grossCashSales - totalCashReturn), 
      total_retur_tunai: totalCashReturn,
      total_transfer: todaySalesStats.transfer, 
      total_qris: todaySalesStats.qris, 
      status: diff === 0 ? "SESUAI" : diff > 0 ? "LEBIH" : "KURANG", 
      isClosed: true, 
      closedAt: serverTimestamp(), 
      closedBy: cashierName 
    }, { merge: true }); 
    toast({ title: "Kas Berhasil Ditutup" }); 
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-w-5xl w-[95vw] h-[90vh] md:h-[85vh] p-0 flex flex-col rounded-[2.25rem] overflow-hidden border border-neutral-200 shadow-2xl">
        <DialogHeader className="p-5 md:p-7 bg-neutral-950 text-white shrink-0">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="bg-[#C82368]/20 p-2.5 md:p-3 rounded-2xl border border-[#C82368]/30">
                <Wallet className="h-5 w-5 md:h-6 md:w-6 text-[#F48FB1]" />
              </div>
              <div>
                <DialogTitle className="font-serif text-lg md:text-2xl font-bold tracking-wide">Kas Kasir (Running)</DialogTitle>
                <p className="text-[9px] md:text-xs font-bold text-[#F48FB1] uppercase tracking-widest mt-0.5">{displayStoreName} • {todayId}</p>
              </div>
            </div>
            <Button type="button" onClick={handlePrintAudit} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-[#C82368] hover:border-[#C82368] hover:text-white rounded-full font-bold text-[10px] md:text-xs h-10 px-4 md:px-5 gap-2 transition-all">
              <Download className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="hidden sm:inline">CETAK AUDIT</span><span className="sm:hidden">CETAK</span>
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 md:space-y-8 bg-[#F5F3F0] scrollbar-hide">
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-neutral-300/70" />
              <span className="text-[9px] md:text-[10px] font-black text-neutral-500 uppercase tracking-[0.15em] md:tracking-[0.2em]">Audit Kemarin (Closed)</span>
              <div className="h-px flex-1 bg-neutral-300/70" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5 md:gap-3">
              <StatBox label="Modal Awal" value={yesterdaySplit.totalOpening} sub="Y_O" />
              <StatBox label="Cash Masuk" value={yesterdaySplit.totalCash} sub="Y_S" color="emerald" />
              <StatBox label="Pengeluaran Toko" value={yesterdaySplit.totalExpenses} sub="Y_E" color="rose" />
              <StatBox label="Pengambilan Owner" value={yesterdaySplit.totalWithdrawals} sub="Y_W" color="rose" />
              <div className="col-span-2 md:col-span-1">
                <StatBox label="Carry Over (Today)" value={yesterdayRemaining} sub="Start" color="primary" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-[#C82368]/25" />
              <span className="text-[9px] md:text-[10px] font-black text-[#C82368] uppercase tracking-[0.15em] md:tracking-[0.2em]">Audit Hari Ini (Running)</span>
              <div className="h-px flex-1 bg-[#C82368]/25" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Card className="rounded-3xl border border-neutral-200/70 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-[#F5F3F0]/60 border-b border-neutral-200/60 p-4 md:p-5">
                  <CardTitle className="text-[10px] md:text-xs font-black uppercase text-neutral-500 flex items-center gap-2"><Coins className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#C82368]" /> Rincian Saldo Awal</CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase">1. Saldo Carry Over</span><span className="text-xs font-black text-neutral-900">Rp {yesterdayRemaining.toLocaleString('id-ID')}</span></div>
                    <div className="flex flex-col gap-1.5 pt-1">
                      <Label className="text-[9px] font-black uppercase text-neutral-400">2. Modal Baru Hari Ini</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="text" 
                          value={formatCurrencyInput(initialCapitalInput)} 
                          onChange={e => setInitialCapitalInput(parseCurrencyInput(e.target.value))} 
                          className="h-10 rounded-2xl bg-[#F5F3F0] border-transparent font-black text-sm" 
                          placeholder="Rp 0"
                        />
                        <Button onClick={handleSaveModal} size="sm" className="rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black h-10 px-5 transition-colors">OK</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-neutral-200/70 shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-[#F5F3F0]/60 border-b border-neutral-200/60 p-4 md:p-5">
                  <CardTitle className="text-[10px] md:text-xs font-black uppercase text-neutral-500 flex items-center gap-2"><ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#C82368]" /> Arus Kas Hari Ini</CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6 space-y-4">
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase">Cash Jual (+)</span><span className="text-sm font-black text-emerald-600">Rp {grossCashSales.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase">Retur Tunai (-)</span><span className="text-sm font-black text-rose-600">Rp {totalCashReturn.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase">Pengeluaran Toko (-)</span><span className="text-sm font-black text-rose-600">Rp {totalExpense.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-bold text-neutral-400 uppercase">Pengambilan Owner (-)</span><span className="text-sm font-black text-rose-600">Rp {totalWithdrawal.toLocaleString('id-ID')}</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border border-neutral-800 shadow-2xl bg-neutral-950 text-white flex flex-col justify-center text-center p-6 md:p-8">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-white/55 mb-1.5 md:mb-2">Saldo Fisik Di Kasir (Sistem)</p>
                <p className="font-serif text-2xl md:text-4xl font-bold tracking-tight">Rp {expectedBalance.toLocaleString('id-ID')}</p>
                <div className="mt-3 md:mt-4 inline-flex items-center gap-2 mx-auto bg-white/10 px-3.5 py-1 rounded-full border border-white/10"><div className="h-1.5 w-1.5 rounded-full bg-[#C82368] animate-pulse" /><span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-white/80">Running Real-time</span></div>
              </Card>
            </div>
          </div>

          <Card className="rounded-3xl border border-neutral-200/70 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-[#C82368]/5 border-b border-neutral-200/60 p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-[10px] md:text-xs font-black uppercase text-[#C82368] flex items-center gap-2"><ArrowDownToLine className="h-3.5 w-3.5 md:h-4 md:w-4" /> Pengeluaran Toko (Operasional)</CardTitle>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Input value={expenseType} onChange={e => setExpenseType(e.target.value)} placeholder="Jenis..." className="h-9 w-full sm:w-32 rounded-xl bg-white border-neutral-200 text-[10px] shadow-sm" />
                <Input value={expenseQty} onChange={e => setExpenseQty(e.target.value)} placeholder="Qty" className="h-9 w-full sm:w-16 rounded-xl bg-white border-neutral-200 text-[10px] text-center shadow-sm" />
                <Input 
                  type="text" 
                  value={formatCurrencyInput(expenseAmount)} 
                  onChange={e => setExpenseAmount(parseCurrencyInput(e.target.value))} 
                  placeholder="Rp 0" 
                  className="h-9 w-full sm:w-28 rounded-xl bg-white border-neutral-200 text-[10px] shadow-sm font-bold" 
                />
                <div className="relative h-9 w-9">
                  <Input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={isUploadingExpense} />
                  <Button variant="outline" size="icon" className="h-full w-full rounded-xl bg-white border-neutral-200 shadow-sm">{isUploadingExpense ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : expenseImage ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Camera className="h-3.5 w-3.5 text-neutral-400" />}</Button>
                </div>
                <Button size="sm" onClick={handleAddExpense} className="h-9 rounded-full px-4 font-black bg-[#C82368] hover:bg-neutral-950 text-white text-[10px] transition-colors">CATAT</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-[#F5F3F0]/50"><TableRow className="border-none"><TableHead className="text-[9px] font-black uppercase pl-5">Waktu</TableHead><TableHead className="text-[9px] font-black uppercase">Jenis & Qty</TableHead><TableHead className="text-[9px] font-black uppercase">Nominal</TableHead><TableHead className="text-[9px] font-black uppercase">Bukti</TableHead><TableHead className="text-[9px] font-black uppercase text-right pr-5">Kasir</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cashLog?.pengeluaran?.map((e: any, idx: number) => (
                    <TableRow key={idx} className="border-b border-neutral-100 last:border-none">
                      <TableCell className="text-[9px] font-bold pl-5">{format(new Date(e.timestamp), "HH:mm:ss")}</TableCell>
                      <TableCell className="text-[9px] font-black uppercase">{e.type} ({e.qty})</TableCell>
                      <TableCell className="text-[9px] font-black text-rose-600">Rp {e.amount.toLocaleString('id-ID')}</TableCell>
                      <TableCell>{e.image ? <button onClick={() => window.open(e.image, '_blank')} className="p-1 hover:bg-[#F5F3F0] rounded border"><FileSearch className="h-3 w-3 text-neutral-400" /></button> : "-"}</TableCell>
                      <TableCell className="text-[9px] text-right pr-5 font-bold text-neutral-400">{e.cashier || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border border-neutral-200/70 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-[#F5F3F0]/60 border-b border-neutral-200/60 p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-[10px] md:text-xs font-black uppercase text-neutral-700 flex items-center gap-2"><UserCheck className="h-3.5 w-3.5 md:h-4 md:w-4 text-[#C82368]" /> Pengambilan Uang (Owner)</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <Input 
                  type="text" 
                  value={formatCurrencyInput(withdrawalAmountInput)} 
                  onChange={e => setWithdrawalAmountInput(parseCurrencyInput(e.target.value))} 
                  placeholder="Rp 0" 
                  className="h-9 flex-1 sm:w-32 rounded-xl bg-white border-neutral-200 text-[10px] shadow-sm font-bold" 
                />
                <Input value={withdrawalNoteInput} onChange={e => setWithdrawalNoteInput(e.target.value)} placeholder="Catatan" className="h-9 flex-1 sm:w-40 rounded-xl bg-white border-neutral-200 text-[10px] shadow-sm" />
                <Button size="sm" onClick={handleAddWithdrawal} className="h-9 rounded-full px-4 font-black bg-neutral-950 hover:bg-[#C82368] text-white text-[10px] transition-colors">CATAT</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-[#F5F3F0]/50"><TableRow className="border-none"><TableHead className="text-[9px] font-black uppercase pl-5">Waktu Ambil</TableHead><TableHead className="text-[9px] font-black uppercase">Nominal</TableHead><TableHead className="text-[9px] font-black uppercase">Catatan</TableHead><TableHead className="text-[9px] font-black uppercase text-right pr-5">Kasir</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cashLog?.pengambilan?.map((w: any, idx: number) => (
                    <TableRow key={idx} className="border-b border-neutral-100 last:border-none">
                      <TableCell className="text-[9px] font-bold pl-5">{format(new Date(w.timestamp), "HH:mm:ss")}</TableCell>
                      <TableCell className="text-[9px] font-black text-rose-600">Rp {w.amount.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-[9px] text-neutral-500 uppercase font-bold">{w.note || "-"}</TableCell>
                      <TableCell className="text-[9px] text-right pr-5 font-bold text-neutral-400">{w.cashier || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter className="p-5 md:p-7 bg-white border-t border-neutral-200/70 shrink-0">
          <div className="w-full flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 space-y-1 w-full">
              <Label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Uang Fisik di Tangan Kasir (Hasil Opname)</Label>
              <Input 
                type="text" 
                value={formatCurrencyInput(physicalCashInput)} 
                onChange={e => setPhysicalCashInput(parseCurrencyInput(e.target.value))} 
                placeholder="Rp 0" 
                className="h-12 md:h-14 rounded-2xl bg-[#F5F3F0] border-transparent font-black text-lg md:text-xl text-neutral-950 text-center" 
              />
            </div>
            <Button className="w-full md:w-auto h-12 md:h-14 px-10 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black text-xs md:text-sm shadow-xl uppercase tracking-widest transition-all" disabled={!physicalCashInput} onClick={handleSaveCashSettlement}>SIMPAN & TUTUP KAS</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, sub, color = "slate" }: any) {
  const colorMap: any = {
    slate: "text-neutral-700 bg-white border border-neutral-200/70",
    emerald: "text-emerald-700 bg-emerald-50 border border-emerald-100",
    rose: "text-rose-700 bg-rose-50 border border-rose-100",
    primary: "text-white bg-neutral-950 shadow-lg border border-neutral-800",
  };
  return (
    <div className={cn("p-3.5 rounded-2xl flex flex-col items-center text-center transition-all", colorMap[color])}>
      <p className="text-[7px] font-black uppercase opacity-60 leading-none mb-1">{label}</p>
      <p className="text-xs font-black tracking-tight">Rp {value.toLocaleString('id-ID')}</p>
      {sub && <p className="text-[6px] font-bold opacity-45 mt-0.5">{sub}</p>}
    </div>
  );
}
