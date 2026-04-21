
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
      const method = trx.paymentMethod || "CASH";
      const paid = trx.paidAmount || 0;
      if (trx.paymentBreakdown) {
        acc.cash += trx.paymentBreakdown.cash || 0;
        const otherMethod = trx.paymentBreakdown.otherMethod;
        if (otherMethod === "TRANSFER") acc.transfer += trx.paymentBreakdown.other || 0;
        if (otherMethod === "QRIS") acc.qris += trx.paymentBreakdown.other || 0;
      } else {
        if (method === "CASH" || method.includes("CASH")) acc.cash += paid;
        else if (method === "TRANSFER") acc.transfer += paid;
        else if (method === "QRIS") acc.qris += paid;
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
    
    const cashTrxY = yesterdayTrx.filter(t => {
      if (t.paymentBreakdown) return (t.paymentBreakdown.cash || 0) > 0;
      return t.paymentMethod === "CASH" || t.paymentMethod.includes("CASH");
    }).sort((a, b) => (a.date?.toDate?.()?.getTime() || 0) - (b.date?.toDate?.()?.getTime() || 0));

    const totalCashSalesY = cashTrxY.reduce((s, t) => {
      const cash = t.paymentBreakdown ? (t.paymentBreakdown.cash || 0) : (t.paidAmount || 0);
      return s + cash;
    }, 0);

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
      const cash = t.paymentBreakdown ? (t.paymentBreakdown.cash || 0) : (t.paidAmount || 0);
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
  const expectedBalance = yesterdayRemaining + (cashLog?.modal_awal || 0) + liveSalesStats.cash - totalWithdrawal - totalExpense;

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
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary uppercase">Audit Kas Berjalan</h1>
          <p className="text-muted-foreground text-sm">Monitoring saldo kas berkelanjutan dan operasional cabang.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleResetCashLog} disabled={!cashLog} className="flex-1 sm:flex-none h-11 rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50">
            <RotateCcw className="h-4 w-4 mr-2" /> RESET LOG
          </Button>
          <Button variant="outline" onClick={exportPDF} disabled={!cashLog} className="flex-1 sm:flex-none h-11 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl soft-shadow border">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400">Cabang</Label>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none font-black text-sm"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-2xl">{STORES.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400">Tanggal</Label>
          <div className="relative"><Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-12 pl-11 rounded-2xl bg-slate-50 border-none font-black text-sm" /></div>
        </div>
        <div className="flex items-end pb-1">
          {isLoading ? <Badge className="bg-slate-100 text-slate-400 border-none px-4 py-2 rounded-xl animate-pulse">SYNCING...</Badge> : !cashLog ? <Badge variant="outline" className="text-rose-500 border-rose-100 bg-rose-50 px-4 py-2 rounded-xl font-black text-[10px]">BELUM ADA LOG</Badge> : <Badge className={cn("px-4 py-2 rounded-xl font-black text-[10px] border-none shadow-sm", cashLog.isClosed ? "bg-emerald-500" : "bg-blue-500")}>{cashLog.isClosed ? "KAS TUTUP" : "KAS AKTIF"}</Badge>}
        </div>
      </div>

      {!isLoading && cashLog && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SummaryCard title="Carry Over" value={yesterdayRemaining} icon={ShieldCheck} color="primary" />
            <SummaryCard title="Penjualan Tunai" value={liveSalesStats.cash} icon={Banknote} color="emerald" />
            <SummaryCard title="Pengeluaran Toko" value={totalExpense} icon={ArrowDownToLine} color="rose" />
            <SummaryCard title="Pengambilan Owner" value={totalWithdrawal} icon={User} color="rose" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="rounded-[2rem] border-none soft-shadow bg-white overflow-hidden">
              <CardHeader className="bg-primary/5 p-6 border-b"><CardTitle className="text-xs font-black uppercase tracking-widest text-primary">Rekapitulasi Saldo Berjalan</CardTitle></CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-[11px] font-bold"><span>SALDO CARRY OVER</span><span>Rp {yesterdayRemaining.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-[11px] font-bold"><span>MODAL BARU</span><span>Rp {(cashLog.modal_awal || 0).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-[11px] font-bold text-emerald-600"><span>TOTAL JUAL TUNAI</span><span>Rp {liveSalesStats.cash.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-[11px] font-bold text-rose-600"><span>TOTAL PENGELUARAN TOKO</span><span>- Rp {totalExpense.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-[11px] font-bold text-rose-600"><span>TOTAL PENGAMBILAN OWNER</span><span>- Rp {totalWithdrawal.toLocaleString('id-ID')}</span></div>
                </div>
                <div className="pt-4 border-t border-dashed space-y-3">
                  <div className="flex justify-between items-center text-primary"><span className="text-[11px] font-black uppercase">SALDO SISTEM</span><span className="font-black text-xl">Rp {expectedBalance.toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100"><span className="text-[11px] font-black uppercase">UANG FISIK KASIR</span><span className="font-black text-lg">Rp {(cashLog.uang_fisik || 0).toLocaleString('id-ID')}</span></div>
                </div>
              </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-6">
              <Card className="rounded-[2rem] border-none soft-shadow bg-white overflow-hidden">
                <CardHeader className="bg-rose-50 p-6 border-b flex flex-row items-center justify-between"><CardTitle className="text-xs font-black uppercase tracking-widest text-rose-600 flex items-center gap-2"><ArrowDownToLine className="h-4 w-4" /> Riwayat Pengeluaran Operasional</CardTitle><Badge className="bg-rose-500 text-white border-none font-black text-[10px]">{cashLog.pengeluaran?.length || 0} TRX</Badge></CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableHeader className="bg-slate-50/50"><TableRow className="border-none"><TableHead className="pl-8 text-[10px] font-black uppercase">Waktu</TableHead><TableHead className="text-[10px] font-black uppercase">Jenis & Qty</TableHead><TableHead className="text-[10px] font-black uppercase">Nominal</TableHead><TableHead className="text-[10px] font-black uppercase">Ket & Bukti</TableHead><TableHead className="text-[10px] font-black uppercase text-right pr-8">Aksi</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {cashLog.pengeluaran?.map((e: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-rose-50/30 border-b border-slate-50 last:border-none">
                            <TableCell className="pl-8 py-4 font-black text-xs">{format(new Date(e.timestamp), "HH:mm:ss")}</TableCell>
                            <TableCell className="font-black uppercase text-xs">{e.type} <span className="opacity-50">({e.qty})</span></TableCell>
                            <TableCell className="font-black text-rose-600 text-sm">Rp {e.amount.toLocaleString('id-ID')}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 italic max-w-[80px] truncate">{e.note || "-"}</span>
                                {e.image && <button onClick={() => window.open(e.image, '_blank')} className="p-1.5 bg-slate-100 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary"><FileSearch className="h-3.5 w-3.5" /></button>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-8"><button onClick={() => handleDeleteExpense(idx)} className="p-2 hover:bg-rose-100 rounded-lg text-slate-400 hover:text-rose-600 transition-all"><Trash2 className="h-3.5 w-3.5" /></button></TableCell>
                          </TableRow>
                        ))}
                        {(!cashLog.pengeluaran || cashLog.pengeluaran.length === 0) && (<TableRow><TableCell colSpan={5} className="h-24 text-center text-slate-400 italic text-sm">Tidak ada pengeluaran operasional.</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-none soft-shadow bg-white overflow-hidden">
                <CardHeader className="bg-slate-50 p-6 border-b flex flex-row items-center justify-between"><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2"><User className="h-4 w-4" /> Riwayat Pengambilan Owner</CardTitle><Badge className="bg-slate-800 text-white border-none font-black text-[10px]">{cashLog.pengambilan?.length || 0} TRX</Badge></CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[250px]">
                    <Table>
                      <TableHeader className="bg-slate-50/50"><TableRow className="border-none"><TableHead className="pl-8 text-[10px] font-black uppercase">Waktu</TableHead><TableHead className="text-[10px] font-black uppercase">Nominal</TableHead><TableHead className="text-[10px] font-black uppercase">Catatan</TableHead><TableHead className="text-[10px] font-black uppercase text-right pr-8">Aksi</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {cashLog.pengambilan?.map((w: any, idx: number) => (
                          <TableRow key={idx} className="hover:bg-slate-50/30 border-b border-slate-50 last:border-none">
                            <TableCell className="pl-8 py-4 font-black text-xs">{format(new Date(w.timestamp), "HH:mm:ss")}</TableCell>
                            <TableCell className="font-black text-rose-600 text-sm">Rp {w.amount.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-[10px] text-slate-500 uppercase font-bold">{w.note || "-"}</TableCell>
                            <TableCell className="text-right pr-8">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => handleEditClick(w, idx)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-primary transition-all"><Edit2 className="h-3.5 w-3.5" /></button>
                                <button onClick={() => handleDeleteWithdrawal(idx)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-all"><Trash2 className="h-3.5 w-3.5" /></button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!cashLog.pengambilan || cashLog.pengambilan.length === 0) && (<TableRow><TableCell colSpan={4} className="h-24 text-center text-slate-400 italic text-sm">Tidak ada riwayat pengambilan.</TableCell></TableRow>)}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Edit Withdrawal Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}><DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl"><DialogHeader className="p-6 bg-primary text-white shrink-0 text-center"><DialogTitle className="text-xl font-black uppercase">Edit Pengambilan</DialogTitle></DialogHeader><div className="p-8 space-y-6 bg-slate-50/50"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nominal (Rp)</Label><Input type="number" value={editWithdrawalData.amount} onChange={e => setEditWithdrawalData({...editWithdrawalData, amount: e.target.value})} className="h-14 rounded-2xl bg-white border-none font-black text-xl text-primary shadow-sm text-center" /></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Catatan</Label><Input value={editWithdrawalData.note} onChange={e => setEditWithdrawalData({...editWithdrawalData, note: e.target.value})} className="h-12 rounded-xl bg-white border-none font-bold shadow-sm" /></div></div><DialogFooter className="p-6 bg-white border-t flex gap-2"><Button variant="outline" className="flex-1 h-12 rounded-xl font-black" onClick={() => setIsEditOpen(false)}>BATAL</Button><Button className="flex-1 h-12 rounded-xl font-black shadow-lg shadow-primary/20" onClick={handleUpdateWithdrawal}><Save className="h-4 w-4 mr-2" /> SIMPAN</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    primary: "bg-primary/10 text-primary",
    blue: "bg-blue-50 text-blue-600",
    rose: "bg-rose-50 text-rose-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  };
  return (
    <Card className="rounded-3xl border-none soft-shadow group hover:scale-[1.02] transition-transform">
      <CardContent className="p-5">
        <div className={cn("p-3 rounded-2xl w-fit mb-3 transition-all group-hover:rotate-6", colorMap[color])}><Icon className="h-5 w-5" /></div>
        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{title}</p>
        <h3 className="text-lg font-black text-slate-800">Rp {value.toLocaleString('id-ID')}</h3>
      </CardContent>
    </Card>
  );
}
