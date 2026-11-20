
"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Calendar, 
  Wallet, 
  ArrowDownToLine, 
  Coins, 
  ShoppingCart, 
  AlertCircle,
  Download,
  FileText,
  Clock,
  User,
  Store,
  Edit2,
  Trash2,
  Save,
  X,
  CreditCard,
  QrCode,
  Banknote,
  RotateCcw,
  TrendingUp,
  ArrowRight,
  FileSearch,
  CheckCircle2,
  Info,
  ShieldCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useCollection, useUser } from "@/firebase";
import { doc, collection, query, where, Timestamp, orderBy, getDocs } from "firebase/firestore";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { toast } from "@/hooks/use-toast";
import { getTrxReturnSummary } from "@/components/cashier/types";

const STORES = [
  { id: "TOKO_A", name: "NHS KWT" },
  { id: "TOKO_B", name: "IND CO" },
  { id: "TOKO_C", name: "NHS GDM" },
];

export default function CashReportsPage() {
  const db = useFirestore();
  const { user: authUser } = useUser();
  const [selectedStore, setSelectedStore] = useState("TOKO_A");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Edit Withdrawal States
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editWithdrawalData, setEditWithdrawalData] = useState({ amount: "", note: "" });

  // 1. Fetch Cash Log (Modal, Pengambilan, Pengeluaran)
  const cashLogRef = useMemoFirebase(() => 
    doc(db, "stores", selectedStore, "cashLogs", selectedDate), 
    [db, selectedStore, selectedDate]
  );
  const { data: cashLog, isLoading: isLogLoading } = useDoc<any>(cashLogRef);

  // 2. Fetch Transactions for the specific day
  const trxQuery = useMemoFirebase(() => {
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return query(
      collection(db, "stores", selectedStore, "transactions"),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end))
    );
  }, [db, selectedStore, selectedDate]);
  
  const { data: transactions, isLoading: isTrxLoading } = useCollection<any>(trxQuery);

  // 3. Fetch Yesterday's transactions for the split calculation
  const yesterdayId = format(subDays(new Date(selectedDate), 1), "yyyy-MM-dd");
  const [yesterdayTrx, setYesterdayTrx] = useState<any[]>([]);
  useEffect(() => {
    if (selectedDate && db) {
      const start = new Date(yesterdayId); start.setHours(0, 0, 0, 0);
      const end = new Date(yesterdayId); end.setHours(23, 59, 59, 999);
      const q = query(collection(db, "stores", selectedStore, "transactions"), where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)));
      getDocs(q).then(snap => {
        setYesterdayTrx(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      });
    }
  }, [selectedDate, selectedStore, db, yesterdayId]);

  // 4. Fetch Yesterday Cash Log for Carry Forward calculation
  const yesterdayLogRef = useMemoFirebase(() => 
    doc(db, "stores", selectedStore, "cashLogs", yesterdayId), 
    [db, selectedStore, yesterdayId]
  );
  const { data: yesterdayLog } = useDoc<any>(yesterdayLogRef);

  const liveSalesStats = useMemo(() => {
    if (!transactions) return { cash: 0, transfer: 0, qris: 0 };
    return transactions.reduce((acc, trx) => {
      const summary = getTrxReturnSummary(trx);
      if (trx.paymentBreakdown) {
        const cashPart = Number(trx.paymentBreakdown.cash || 0);
        const otherPart = Number(trx.paymentBreakdown.other || 0);
        acc.cash += Math.max(0, cashPart - summary.cashRefunded);
        const otherMethod = String(trx.paymentBreakdown.otherMethod || "").toUpperCase();
        if (otherMethod === "TRANSFER") acc.transfer += Math.max(0, otherPart - summary.transferRefunded);
        if (otherMethod === "QRIS") acc.qris += Math.max(0, otherPart - summary.qrisRefunded);
      } else {
        const method = String(trx.paymentMethod || "CASH").toUpperCase();
        if (method === "CASH" || method.includes("CASH")) acc.cash += summary.netPaid;
        else if (method === "TRANSFER") acc.transfer += summary.netPaid;
        else if (method === "QRIS") acc.qris += summary.netPaid;
      }
      return acc;
    }, { cash: 0, transfer: 0, qris: 0 });
  }, [transactions]);

  const yesterdaySplit = useMemo(() => {
    if (!yesterdayLog) return { murni: 0, lanjutan: 0, totalOpening: 0, totalCash: 0, totalWithdrawals: 0, totalExpenses: 0, closingBalance: 0 };
    
    const openingY = (yesterdayLog.saldo_awal_kemarin || 0) + (yesterdayLog.modal_awal || 0);
    const withdrawalsY = yesterdayLog.pengambilan || [];
    const totalWithdrawalsY = withdrawalsY.reduce((s: number, w: any) => s + w.amount, 0);
    
    const expensesY = yesterdayLog.pengeluaran || [];
    const totalExpensesY = expensesY.reduce((s: number, e: any) => s + e.amount, 0);

    const getTrxCashNet = (t: any) => {
      const summary = getTrxReturnSummary(t);
      if (t.paymentBreakdown) {
        return Math.max(0, Number(t.paymentBreakdown.cash || 0) - summary.cashRefunded);
      }
      const method = String(t.paymentMethod || "CASH").toUpperCase();
      if (method === "CASH" || method.includes("CASH")) return summary.netPaid;
      return 0;
    };
    
    const cashTrxY = yesterdayTrx.filter(t => {
      if (t.paymentBreakdown) return (t.paymentBreakdown.cash || 0) > 0;
      const method = String(t.paymentMethod || "CASH").toUpperCase();
      return method === "CASH" || method.includes("CASH");
    }).sort((a, b) => (a.date?.toDate?.()?.getTime() || 0) - (b.date?.toDate?.()?.getTime() || 0));

    const totalCashSalesY = cashTrxY.reduce((s, t) => s + getTrxCashNet(t), 0);

    if (withdrawalsY.length === 0 && expensesY.length === 0) {
      return { murni: openingY, lanjutan: totalCashSalesY, totalOpening: openingY, totalCash: totalCashSalesY, totalWithdrawals: 0, totalExpenses: 0, closingBalance: openingY + totalCashSalesY };
    }

    const latestWithdrawal = withdrawalsY.length > 0 ? [...withdrawalsY].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp : "1970-01-01";
    const latestExpense = expensesY.length > 0 ? [...expensesY].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp : "1970-01-01";
    const lastActionTime = Math.max(new Date(latestWithdrawal).getTime(), new Date(latestExpense).getTime());

    let salesBefore = 0;
    let salesAfter = 0;
    cashTrxY.forEach(t => {
      const tTime = t.date?.toDate?.()?.getTime() || 0;
      const cash = getTrxCashNet(t);
      if (tTime <= lastActionTime) salesBefore += cash;
      else salesAfter += cash;
    });

    const murni = openingY + salesBefore - totalWithdrawalsY - totalExpensesY;
    const lanjutan = salesAfter;

    return { murni, lanjutan, totalOpening: openingY, totalCash: totalCashSalesY, totalWithdrawals: totalWithdrawalsY, totalExpenses: totalExpensesY, closingBalance: murni + lanjutan };
  }, [yesterdayLog, yesterdayTrx]);

  const yesterdayRemaining = yesterdaySplit.closingBalance;
  const totalWithdrawal = useMemo(() => cashLog?.pengambilan?.reduce((s: number, w: any) => s + w.amount, 0) || 0, [cashLog]);
  const totalExpense = useMemo(() => cashLog?.pengeluaran?.reduce((s: number, e: any) => s + e.amount, 0) || 0, [cashLog]);
  const totalCrossDayReturn = useMemo(() => cashLog?.retur_tunai?.reduce((s: number, r: any) => s + Number(r.amount || 0), 0) || 0, [cashLog]);
  const expectedBalance = yesterdayRemaining + (cashLog?.modal_awal || 0) + liveSalesStats.cash - totalCrossDayReturn - totalWithdrawal - totalExpense;

  const handleEditClick = (item: any, index: number) => {
    setEditingIndex(index);
    setEditWithdrawalData({ amount: item.amount.toString(), note: item.note || "" });
    setIsEditOpen(true);
  };

  const handleUpdateWithdrawal = () => {
    if (editingIndex === null || !cashLog) return;
    const newAmount = parseFloat(editWithdrawalData.amount);
    if (isNaN(newAmount)) return;
    const newWithdrawals = [...(cashLog.pengambilan || [])];
    newWithdrawals[editingIndex] = { ...newWithdrawals[editingIndex], amount: newAmount, note: editWithdrawalData.note };
    updateDocumentNonBlocking(cashLogRef!, { pengambilan: newWithdrawals });
    setIsEditOpen(false);
    toast({ title: "Berhasil Diperbarui" });
  };

  const handleDeleteWithdrawal = (index: number) => {
    if (!cashLog || !confirm("Hapus data pengambilan ini?")) return;
    const newWithdrawals = (cashLog.pengambilan || []).filter((_: any, i: number) => i !== index);
    updateDocumentNonBlocking(cashLogRef!, { pengambilan: newWithdrawals });
    toast({ title: "Terhapus" });
  };

  const handleDeleteExpense = (index: number) => {
    if (!cashLog || !confirm("Hapus data pengeluaran ini?")) return;
    const newExpenses = (cashLog.pengeluaran || []).filter((_: any, i: number) => i !== index);
    updateDocumentNonBlocking(cashLogRef!, { pengeluaran: newExpenses });
    toast({ title: "Terhapus" });
  };

  const handleResetCashLog = () => {
    if (!cashLog) return;
    if (confirm(`HAPUS LOG KAS ${STORES.find(s => s.id === selectedStore)?.name} pada ${selectedDate}?`)) {
      deleteDocumentNonBlocking(cashLogRef!);
      toast({ title: "Log Direset" });
    }
  };

  const exportPDF = () => {
    if (!cashLog) return;
    const docPdf = new jsPDF();
    docPdf.text(`LAPORAN KAS RUNNING - ${STORES.find(s => s.id === selectedStore)?.name}`, 105, 15, { align: "center" });
    (docPdf as any).autoTable({
      startY: 35,
      head: [['Deskripsi', 'Nominal']],
      body: [
        ['Saldo Carry Over (Start)', `Rp ${yesterdayRemaining.toLocaleString('id-ID')}`],
        ['Modal Baru Hari Ini', `Rp ${(cashLog.modal_awal || 0).toLocaleString('id-ID')}`],
        ['Total Penjualan Tunai', `Rp ${liveSalesStats.cash.toLocaleString('id-ID')}`],
        ['Total Pengeluaran Toko', `Rp ${totalExpense.toLocaleString('id-ID')}`],
        ['Total Pengambilan Owner', `Rp ${totalWithdrawal.toLocaleString('id-ID')}`],
        ['SALDO AKHIR SISTEM', `Rp ${expectedBalance.toLocaleString('id-ID')}`],
      ],
      theme: 'grid',
      headStyles: { fillColor: [31, 122, 99] }
    });
    docPdf.save(`lap-kas-${selectedStore}-${selectedDate}.pdf`);
  };

  const isLoading = isLogLoading || isTrxLoading;

  return (
    <div className="space-y-4 sm:space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Cash Audit</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">Audit Kas Berjalan</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Monitoring saldo kas berkelanjutan dan operasional cabang.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleResetCashLog} disabled={!cashLog} className="flex-1 sm:flex-none h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-rose-200 bg-white text-rose-600 hover:bg-rose-50">
            <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> RESET LOG
          </Button>
          <Button variant="outline" onClick={exportPDF} disabled={!cashLog} className="flex-1 sm:flex-none h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50">
            <Download className="h-3.5 w-3.5 mr-1.5 text-[#C82368]" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/70">
        <div className="space-y-1">
          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Cabang</Label>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="h-9 sm:h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-2xl">{STORES.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Tanggal</Label>
          <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" /><Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-9 sm:h-10 pl-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs" /></div>
        </div>
        <div className="col-span-2 md:col-span-1 flex items-end pb-0.5">
          {isLoading ? <Badge className="bg-[#F5F3F0] text-neutral-500 border-none px-3.5 py-1.5 rounded-full animate-pulse text-[10px] font-bold">SYNCING...</Badge> : !cashLog ? <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 px-3.5 py-1.5 rounded-full font-bold text-[10px]">BELUM ADA LOG</Badge> : <Badge className={cn("px-3.5 py-1.5 rounded-full font-bold text-[10px] border-none text-white shadow-sm", cashLog.isClosed ? "bg-emerald-600" : "bg-[#C82368]")}>{cashLog.isClosed ? "KAS TUTUP" : "KAS AKTIF"}</Badge>}
        </div>
      </div>

      {!isLoading && cashLog && (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <SummaryCard title="Carry Over" value={yesterdayRemaining} icon={ShieldCheck} color="dark" />
            <SummaryCard title="Penjualan Tunai" value={liveSalesStats.cash} icon={Banknote} color="emerald" />
            <SummaryCard title="Pengeluaran Toko" value={totalExpense} icon={ArrowDownToLine} color="berry" />
            <SummaryCard title="Pengambilan Owner" value={totalWithdrawal} icon={User} color="neutral" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-neutral-950 text-white p-4 sm:p-5"><CardTitle className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-neutral-300">Rekapitulasi Saldo Berjalan</CardTitle></CardHeader>
              <CardContent className="p-4 sm:p-5 space-y-3.5">
                <div className="space-y-2.5">
                  <div className="flex justify-between text-[11px] sm:text-xs font-bold text-neutral-700"><span>SALDO CARRY OVER</span><span>Rp {yesterdayRemaining.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-[11px] sm:text-xs font-bold text-neutral-700"><span>MODAL BARU</span><span>Rp {(cashLog.modal_awal || 0).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-[11px] sm:text-xs font-bold text-emerald-700"><span>TOTAL JUAL TUNAI</span><span>Rp {liveSalesStats.cash.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-[11px] sm:text-xs font-bold text-rose-600"><span>TOTAL PENGELUARAN TOKO</span><span>- Rp {totalExpense.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-[11px] sm:text-xs font-bold text-rose-600"><span>TOTAL PENGAMBILAN OWNER</span><span>- Rp {totalWithdrawal.toLocaleString('id-ID')}</span></div>
                </div>
                <div className="pt-3.5 border-t border-dashed border-neutral-200 space-y-2.5">
                  <div className="flex justify-between items-center text-[#C82368]"><span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest">SALDO SISTEM</span><span className="font-serif font-bold text-lg sm:text-2xl">Rp {expectedBalance.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between items-center p-3 bg-[#F5F3F0] rounded-xl sm:rounded-2xl border border-neutral-200/70"><span className="text-[10px] sm:text-[11px] font-bold uppercase text-neutral-600">UANG FISIK KASIR</span><span className="font-serif font-bold text-base sm:text-lg text-neutral-900">Rp {(cashLog.uang_fisik || 0).toLocaleString('id-ID')}</span></div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-neutral-950 text-white p-4 sm:p-5 flex flex-row items-center justify-between"><CardTitle className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-neutral-200 flex items-center gap-2"><ArrowDownToLine className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#C82368]" /> Riwayat Pengeluaran Operasional</CardTitle><Badge className="bg-[#C82368] text-white border-none font-bold rounded-full px-2.5 text-[9px] sm:text-[10px]">{cashLog.pengeluaran?.length || 0} TRX</Badge></CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <ScrollArea className="h-[250px]">
                      <Table>
                        <TableHeader className="bg-[#F5F3F0]"><TableRow className="border-none"><TableHead className="pl-6 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Waktu</TableHead><TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Jenis &amp; Qty</TableHead><TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Nominal</TableHead><TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Ket &amp; Bukti</TableHead><TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 text-right pr-6">Aksi</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {cashLog.pengeluaran?.map((e: any, idx: number) => (
                            <TableRow key={idx} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 last:border-none">
                              <TableCell className="pl-6 py-4 font-bold text-xs whitespace-nowrap">{format(new Date(e.timestamp), "HH:mm:ss")}</TableCell>
                              <TableCell className="font-bold uppercase text-xs text-neutral-900">{e.type} <span className="text-neutral-400">({e.qty})</span></TableCell>
                              <TableCell className="font-bold text-rose-600 text-sm whitespace-nowrap">Rp {e.amount.toLocaleString('id-ID')}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] text-neutral-500 italic max-w-[100px] truncate">{e.note || "-"}</span>
                                  {e.image && <button onClick={() => window.open(e.image, '_blank')} className="p-1.5 bg-[#F5F3F0] rounded-full hover:bg-[#C82368]/10 text-neutral-500 hover:text-[#C82368]"><FileSearch className="h-3.5 w-3.5" /></button>}
                                </div>
                              </TableCell>
                              <TableCell className="text-right pr-6"><button onClick={() => handleDeleteExpense(idx)} className="p-2 hover:bg-rose-50 rounded-full text-neutral-400 hover:text-rose-600 transition-all"><Trash2 className="h-3.5 w-3.5" /></button></TableCell>
                            </TableRow>
                          ))}
                          {(!cashLog.pengeluaran || cashLog.pengeluaran.length === 0) && (<TableRow><TableCell colSpan={5} className="h-24 text-center text-neutral-400 italic text-sm">Tidak ada pengeluaran operasional.</TableCell></TableRow>)}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-neutral-200/70 shadow-sm bg-white overflow-hidden">
                <CardHeader className="bg-neutral-950 text-white p-5 flex flex-row items-center justify-between"><CardTitle className="text-xs font-bold uppercase tracking-widest text-neutral-200 flex items-center gap-2"><User className="h-4 w-4 text-[#C82368]" /> Riwayat Pengambilan Owner</CardTitle><Badge className="bg-white text-neutral-900 border-none font-bold rounded-full px-3 text-[10px]">{cashLog.pengambilan?.length || 0} TRX</Badge></CardHeader>
                <CardContent className="p-0">
                  <div className="w-full overflow-x-auto">
                    <ScrollArea className="h-[250px]">
                      <Table>
                        <TableHeader className="bg-[#F5F3F0]"><TableRow className="border-none"><TableHead className="pl-6 text-[10px] font-bold uppercase tracking-widest text-neutral-500">Waktu</TableHead><TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Nominal</TableHead><TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Catatan</TableHead><TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 text-right pr-6">Aksi</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {cashLog.pengambilan?.map((w: any, idx: number) => (
                            <TableRow key={idx} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 last:border-none">
                              <TableCell className="pl-6 py-4 font-bold text-xs whitespace-nowrap">{format(new Date(w.timestamp), "HH:mm:ss")}</TableCell>
                              <TableCell className="font-bold text-rose-600 text-sm whitespace-nowrap">Rp {w.amount.toLocaleString('id-ID')}</TableCell>
                              <TableCell className="text-[11px] text-neutral-600 uppercase font-bold">{w.note || "-"}</TableCell>
                              <TableCell className="text-right pr-6">
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => handleEditClick(w, idx)} className="p-2 hover:bg-neutral-100 rounded-full text-neutral-400 hover:text-neutral-900 transition-all"><Edit2 className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => handleDeleteWithdrawal(idx)} className="p-2 hover:bg-rose-50 rounded-full text-neutral-400 hover:text-rose-600 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!cashLog.pengambilan || cashLog.pengambilan.length === 0) && (<TableRow><TableCell colSpan={4} className="h-24 text-center text-neutral-400 italic text-sm">Tidak ada riwayat pengambilan.</TableCell></TableRow>)}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Edit Withdrawal Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-neutral-950 text-white shrink-0 text-center">
            <DialogTitle className="text-2xl font-serif">Edit Pengambilan</DialogTitle>
          </DialogHeader>
          <div className="p-6 space-y-5 bg-[#F5F3F0]">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-2">Nominal (Rp)</Label>
              <Input type="number" value={editWithdrawalData.amount} onChange={e => setEditWithdrawalData({...editWithdrawalData, amount: e.target.value})} className="h-12 rounded-full bg-white border border-neutral-200/70 font-serif font-bold text-xl text-[#C82368] text-center" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-2">Catatan</Label>
              <Input value={editWithdrawalData.note} onChange={e => setEditWithdrawalData({...editWithdrawalData, note: e.target.value})} className="h-11 rounded-full bg-white border border-neutral-200/70 font-bold text-xs px-4" />
            </div>
          </div>
          <DialogFooter className="p-5 bg-white border-t border-neutral-100 flex gap-2">
            <Button variant="outline" className="flex-1 h-11 rounded-full font-bold text-xs" onClick={() => setIsEditOpen(false)}>BATAL</Button>
            <Button className="flex-1 h-11 rounded-full font-bold text-xs bg-[#C82368] hover:bg-[#a61c55] text-white" onClick={handleUpdateWithdrawal}><Save className="h-4 w-4 mr-2" /> SIMPAN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: any) {
  const cardMap: any = {
    dark: "bg-neutral-950 text-white border-none",
    berry: "bg-[#C82368] text-white border-none",
    emerald: "bg-white text-neutral-900 border border-neutral-200/70",
    neutral: "bg-white text-neutral-900 border border-neutral-200/70",
  };
  const iconMap: any = {
    dark: "bg-white/10 text-white",
    berry: "bg-white/15 text-white",
    emerald: "bg-emerald-50 text-emerald-700",
    neutral: "bg-[#F5F3F0] text-neutral-700",
  };
  const isDark = color === "dark" || color === "berry";
  return (
    <Card className={cn("rounded-2xl sm:rounded-3xl shadow-sm transition-transform hover:scale-[1.01]", cardMap[color] || cardMap.neutral)}>
      <CardContent className="p-3 sm:p-5">
        <div className={cn("p-2 sm:p-2.5 rounded-full w-fit mb-2 sm:mb-3", iconMap[color] || iconMap.neutral)}><Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></div>
        <p className={cn("text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-0.5 truncate", isDark ? "text-white/75" : "text-neutral-400")}>{title}</p>
        <h3 className={cn("text-sm sm:text-xl md:text-2xl font-serif font-bold truncate", isDark ? "text-white" : "text-neutral-900")}>Rp {value.toLocaleString('id-ID')}</h3>
      </CardContent>
    </Card>
  );
}
