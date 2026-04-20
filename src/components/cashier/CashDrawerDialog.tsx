
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
  todaySalesStats: { cash: number; transfer: number; qris: number };
  yesterdaySplit: any;
}

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

  const totalWithdrawal = cashLog?.pengambilan?.reduce((s: number, w: any) => s + w.amount, 0) || 0;
  const totalExpense = cashLog?.pengeluaran?.reduce((s: number, e: any) => s + e.amount, 0) || 0;

  // Hitung Saldo Akhir Sistem (expectedBalance)
  const expectedBalance = yesterdayRemaining + (cashLog?.modal_awal || 0) + todaySalesStats.cash - totalWithdrawal - totalExpense;

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
      total_cash: todaySalesStats.cash, 
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
      <DialogContent className="max-w-5xl w-[95vw] h-[90vh] md:h-[85vh] p-0 flex flex-col rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-5 md:p-8 bg-[#1F7A63] text-white shrink-0">
          <div className="flex flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/10 p-2 md:p-3 rounded-2xl">
                <Wallet className="h-5 w-5 md:h-6 md:w-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-lg md:text-2xl font-black uppercase">Kas Kasir (Running)</DialogTitle>
                <p className="text-[9px] md:text-xs font-bold opacity-70 uppercase tracking-widest mt-0.5">{displayStoreName} • {todayId}</p>
              </div>
            </div>
            <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-primary rounded-xl font-bold text-[10px] md:text-sm h-10 md:h-11 px-3 md:px-4 gap-2">
              <Download className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="hidden sm:inline">CETAK AUDIT</span><span className="sm:hidden">CETAK</span>
            </Button>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 scrollbar-hide">
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] md:tracking-[0.2em]">Audit Kemarin (Closed)</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
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
              <div className="h-px flex-1 bg-primary/20" />
              <span className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-[0.1em] md:tracking-[0.2em]">Audit Hari Ini (Running)</span>
              <div className="h-px flex-1 bg-primary/20" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b p-4 md:p-5">
                  <CardTitle className="text-[10px] md:text-xs font-black uppercase text-slate-400 flex items-center gap-2"><Coins className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" /> Rincian Saldo Awal</CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">1. Saldo Carry Over</span><span className="text-xs font-black">Rp {yesterdayRemaining.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">2. Modal Baru</span><span className="text-xs font-black">Rp {(cashLog?.modal_awal || 0).toLocaleString('id-ID')}</span></div>
                    <div className="pt-3 border-t border-dashed flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-black text-slate-800 uppercase">Total Modal Start</span><span className="text-sm font-black text-primary">Rp {(yesterdayRemaining + (cashLog?.modal_awal || 0)).toLocaleString('id-ID')}</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b p-4 md:p-5">
                  <CardTitle className="text-[10px] md:text-xs font-black uppercase text-slate-400 flex items-center gap-2"><ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" /> Arus Kas Hari Ini</CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Cash Jual (+)</span><span className="text-sm font-black text-emerald-600">Rp {todaySalesStats.cash.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Pengeluaran Toko (-)</span><span className="text-sm font-black text-rose-600">Rp {totalExpense.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between items-center"><span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Pengambilan Owner (-)</span><span className="text-sm font-black text-rose-600">Rp {totalWithdrawal.toLocaleString('id-ID')}</span></div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] md:rounded-[2.5rem] border-none shadow-2xl bg-primary text-white flex flex-col justify-center text-center p-6 md:p-8">
                <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] opacity-60 mb-1 md:mb-2">Saldo Fisik Di Kasir (Sistem)</p>
                <p className="text-2xl md:text-4xl font-black tracking-tighter">Rp {expectedBalance.toLocaleString('id-ID')}</p>
                <div className="mt-3 md:mt-4 inline-flex items-center gap-2 mx-auto bg-white/10 px-3 py-1 rounded-full"><div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">Running Real-time</span></div>
              </Card>
            </div>
          </div>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-rose-50 border-b p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-[10px] md:text-xs font-black uppercase text-rose-600 flex items-center gap-2"><ArrowDownToLine className="h-3.5 w-3.5 md:h-4 md:w-4" /> Pengeluaran Toko (Operasional)</CardTitle>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <Input value={expenseType} onChange={e => setExpenseType(e.target.value)} placeholder="Jenis..." className="h-9 w-full sm:w-32 rounded-xl text-[10px] shadow-sm" />
                <Input value={expenseQty} onChange={e => setExpenseQty(e.target.value)} placeholder="Qty" className="h-9 w-full sm:w-16 rounded-xl text-[10px] text-center shadow-sm" />
                <Input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="Rp" className="h-9 w-full sm:w-24 rounded-xl text-[10px] shadow-sm" />
                <div className="relative h-9 w-9">
                  <Input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={isUploadingExpense} />
                  <Button variant="outline" size="icon" className="h-full w-full rounded-xl bg-white shadow-sm">{isUploadingExpense ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : expenseImage ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Camera className="h-3.5 w-3.5 text-slate-400" />}</Button>
                </div>
                <Button size="sm" onClick={handleAddExpense} className="h-9 rounded-xl font-black bg-rose-600 hover:bg-rose-700 text-[10px]">CATAT</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50"><TableRow className="border-none"><TableHead className="text-[9px] font-black uppercase pl-5">Waktu</TableHead><TableHead className="text-[9px] font-black uppercase">Jenis & Qty</TableHead><TableHead className="text-[9px] font-black uppercase">Nominal</TableHead><TableHead className="text-[9px] font-black uppercase">Bukti</TableHead><TableHead className="text-[9px] font-black uppercase text-right pr-5">Kasir</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cashLog?.pengeluaran?.map((e: any, idx: number) => (
                    <TableRow key={idx} className="border-b last:border-none">
                      <TableCell className="text-[9px] font-bold pl-5">{format(new Date(e.timestamp), "HH:mm:ss")}</TableCell>
                      <TableCell className="text-[9px] font-black uppercase">{e.type} ({e.qty})</TableCell>
                      <TableCell className="text-[9px] font-black text-rose-600">Rp {e.amount.toLocaleString('id-ID')}</TableCell>
                      <TableCell>{e.image ? <button onClick={() => window.open(e.image, '_blank')} className="p-1 hover:bg-slate-100 rounded border"><FileSearch className="h-3 w-3 text-slate-400" /></button> : "-"}</TableCell>
                      <TableCell className="text-[9px] text-right pr-5 font-bold text-slate-400">{e.cashier || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-50 border-b p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-[10px] md:text-xs font-black uppercase text-slate-600 flex items-center gap-2"><UserCheck className="h-3.5 w-3.5 md:h-4 md:w-4" /> Pengambilan Uang (Owner)</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <Input type="number" value={withdrawalAmountInput} onChange={e => setWithdrawalAmountInput(e.target.value)} placeholder="Nominal Rp" className="h-9 flex-1 sm:w-32 rounded-xl text-[10px] shadow-sm" />
                <Input value={withdrawalNoteInput} onChange={e => setWithdrawalNoteInput(e.target.value)} placeholder="Catatan" className="h-9 flex-1 sm:w-40 rounded-xl text-[10px] shadow-sm" />
                <Button size="sm" onClick={handleAddWithdrawal} className="h-9 rounded-xl font-black bg-slate-800 text-[10px]">CATAT</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50/50"><TableRow className="border-none"><TableHead className="text-[9px] font-black uppercase pl-5">Waktu Ambil</TableHead><TableHead className="text-[9px] font-black uppercase">Nominal</TableHead><TableHead className="text-[9px] font-black uppercase">Catatan</TableHead><TableHead className="text-[9px] font-black uppercase text-right pr-5">Kasir</TableHead></TableRow></TableHeader>
                <TableBody>
                  {cashLog?.pengambilan?.map((w: any, idx: number) => (
                    <TableRow key={idx} className="border-b last:border-none">
                      <TableCell className="text-[9px] font-bold pl-5">{format(new Date(w.timestamp), "HH:mm:ss")}</TableCell>
                      <TableCell className="text-[9px] font-black text-rose-600">Rp {w.amount.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-[9px] text-slate-500 uppercase font-bold">{w.note || "-"}</TableCell>
                      <TableCell className="text-[9px] text-right pr-5 font-bold text-slate-400">{w.cashier || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter className="p-5 md:p-8 bg-white border-t shrink-0">
          <div className="w-full flex flex-col md:flex-row gap-4 items-center">
            <div className="flex-1 space-y-1 w-full">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Uang Fisik di Tangan Kasir (Hasil Opname)</Label>
              <Input type="number" value={physicalCashInput || cashLog?.uang_fisik || ""} onChange={e => setPhysicalCashInput(e.target.value)} placeholder="Input nominal fisik..." className="h-12 md:h-14 rounded-2xl bg-slate-50 border-none font-black text-lg md:text-xl text-primary text-center shadow-inner" />
            </div>
            <Button className="w-full md:w-auto h-12 md:h-14 px-10 rounded-2xl font-black text-xs md:text-sm shadow-xl shadow-primary/20 uppercase tracking-widest" disabled={!physicalCashInput} onClick={handleSaveCashSettlement}>SIMPAN & TUTUP KAS</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatBox({ label, value, sub, color = "slate" }: any) {
  const colorMap: any = {
    slate: "text-slate-600 bg-slate-100",
    emerald: "text-emerald-700 bg-emerald-50",
    rose: "text-rose-700 bg-rose-50",
    primary: "text-white bg-[#1F7A63] shadow-lg shadow-primary/20",
  };
  return (
    <div className={cn("p-3 rounded-2xl flex flex-col items-center text-center transition-all", colorMap[color])}>
      <p className="text-[7px] font-black uppercase opacity-60 leading-none mb-1">{label}</p>
      <p className="text-xs font-black tracking-tight">Rp {value.toLocaleString('id-ID')}</p>
      {sub && <p className="text-[5px] font-bold opacity-40 mt-0.5">{sub}</p>}
    </div>
  );
}
