"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Calendar, 
  ArrowDownToLine, 
  Download, 
  FileText, 
  Clock, 
  Store, 
  Trash2, 
  Plus, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  FileSearch,
  Filter,
  User,
  Image as ImageIcon,
  Building2,
  Edit2,
  Save,
  X
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  setDocumentNonBlocking, 
  updateDocumentNonBlocking,
  useStorage
} from "@/firebase";
import { collection, doc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const STORES = [
  { id: "TOKO_A", name: "NHS KWT" },
  { id: "TOKO_B", name: "IND CO" },
  { id: "TOKO_C", name: "NHS GDM" },
];

export default function OperationalExpensesPage() {
  const db = useFirestore();
  const storage = useStorage();
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Owner Expense Form States
  const [expenseTarget, setExpenseTarget] = useState("OWNER");
  const [expenseType, setExpenseType] = useState("");
  const [expenseQty, setExpenseQty] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseNote, setExpenseNote] = useState("");
  const [expenseImage, setExpenseImage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit States
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetching Data Logic
  const storesQueryA = useMemoFirebase(() => collection(db, "stores", "TOKO_A", "cashLogs"), [db]);
  const storesQueryB = useMemoFirebase(() => collection(db, "stores", "TOKO_B", "cashLogs"), [db]);
  const storesQueryC = useMemoFirebase(() => collection(db, "stores", "TOKO_C", "cashLogs"), [db]);
  const ownerQuery = useMemoFirebase(() => collection(db, "ownerExpenses"), [db]);

  const { data: logsA } = useCollection<any>(storesQueryA);
  const { data: logsB } = useCollection<any>(storesQueryB);
  const { data: logsC } = useCollection<any>(storesQueryC);
  const { data: logsOwner } = useCollection<any>(ownerQuery);

  const aggregatedExpenses = useMemo(() => {
    const list: any[] = [];
    const filterId = filterMode === "daily" ? selectedDate : selectedMonth;

    const processLogs = (logs: any[], sourceName: string, sourceId: string) => {
      logs?.forEach(log => {
        if (log.id.startsWith(filterId) && log.pengeluaran) {
          log.pengeluaran.forEach((exp: any, idx: number) => {
            list.push({
              ...exp,
              source: sourceName,
              sourceId: sourceId,
              logId: log.id,
              originalIdx: idx,
              typeKey: 'pengeluaran'
            });
          });
        }
      });
    };

    if (storeFilter === "ALL" || storeFilter === "TOKO_A") processLogs(logsA || [], "NHS KWT", "TOKO_A");
    if (storeFilter === "ALL" || storeFilter === "TOKO_B") processLogs(logsB || [], "IND CO", "TOKO_B");
    if (storeFilter === "ALL" || storeFilter === "TOKO_C") processLogs(logsC || [], "NHS GDM", "TOKO_C");
    if (storeFilter === "ALL" || storeFilter === "OWNER") {
      logsOwner?.forEach(log => {
        if (log.id.startsWith(filterId) && log.expenses) {
          log.expenses.forEach((exp: any, idx: number) => {
            list.push({
              ...exp,
              source: "OWNER PUSAT",
              sourceId: "OWNER",
              logId: log.id,
              originalIdx: idx,
              typeKey: 'expenses'
            });
          });
        }
      });
    }

    return list
      .filter(item => 
        item.type.toLowerCase().includes(search.toLowerCase()) || 
        item.note?.toLowerCase().includes(search.toLowerCase()) ||
        item.source.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logsA, logsB, logsC, logsOwner, selectedDate, selectedMonth, filterMode, storeFilter, search]);

  const totalAmount = useMemo(() => aggregatedExpenses.reduce((s, i) => s + i.amount, 0), [aggregatedExpenses]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast({ title: "File Terlalu Besar", description: "Maksimal 500KB.", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `expenses/${isEdit ? 'edit' : 'new'}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      if (isEdit) {
        setEditingExpense({ ...editingExpense, image: url });
      } else {
        setExpenseImage(url);
      }
      toast({ title: "Gambar Berhasil Diunggah" });
    } catch (err) {
      toast({ title: "Gagal Mengunggah", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddOwnerExpense = () => {
    const amount = parseFloat(expenseAmount);
    if (!expenseType || !amount || amount <= 0) {
      toast({ title: "Gagal", description: "Lengkapi Jenis dan Nominal.", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    const dateId = format(new Date(), "yyyy-MM-dd");
    const timestamp = new Date().toISOString();

    const expenseObject = {
      type: expenseType,
      qty: expenseQty,
      amount,
      note: expenseNote,
      image: expenseImage,
      timestamp: timestamp,
      cashier: "OWNER"
    };

    try {
      if (expenseTarget === "OWNER") {
        const docRef = doc(db, "ownerExpenses", dateId);
        const existingLog = logsOwner?.find(l => l.id === dateId);
        const newExpenses = [...(existingLog?.expenses || []), expenseObject];
        setDocumentNonBlocking(docRef, { expenses: newExpenses, lastUpdated: serverTimestamp() }, { merge: true });
      } else {
        const storeRef = doc(db, "stores", expenseTarget, "cashLogs", dateId);
        let existingStoreLog;
        if (expenseTarget === "TOKO_A") existingStoreLog = logsA?.find(l => l.id === dateId);
        else if (expenseTarget === "TOKO_B") existingStoreLog = logsB?.find(l => l.id === dateId);
        else if (expenseTarget === "TOKO_C") existingStoreLog = logsC?.find(l => l.id === dateId);

        const newExpenses = [...(existingStoreLog?.pengeluaran || []), expenseObject];
        setDocumentNonBlocking(storeRef, { pengeluaran: newExpenses, lastUpdated: serverTimestamp() }, { merge: true });
      }

      setTimeout(() => {
        setIsProcessing(false);
        setExpenseType(""); setExpenseQty(""); setExpenseAmount(""); setExpenseNote(""); setExpenseImage("");
        toast({ title: "Pengeluaran Berhasil Dicatat" });
      }, 500);
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      toast({ title: "Gagal Menyimpan", variant: "destructive" });
    }
  };

  const handleUpdateExpense = () => {
    if (!editingExpense) return;
    setIsProcessing(true);

    try {
      const { sourceId, logId, originalIdx, typeKey, ...data } = editingExpense;
      const updatedItem = {
        type: data.type,
        qty: data.qty,
        amount: parseFloat(data.amount.toString()),
        note: data.note,
        image: data.image,
        timestamp: data.timestamp,
        cashier: data.cashier
      };

      if (sourceId === "OWNER") {
        const docRef = doc(db, "ownerExpenses", logId);
        const logData = logsOwner?.find(l => l.id === logId);
        const newExpenses = [...(logData?.expenses || [])];
        newExpenses[originalIdx] = updatedItem;
        updateDocumentNonBlocking(docRef, { expenses: newExpenses, lastUpdated: serverTimestamp() });
      } else {
        const docRef = doc(db, "stores", sourceId, "cashLogs", logId);
        let logData;
        if (sourceId === "TOKO_A") logData = logsA?.find(l => l.id === logId);
        else if (sourceId === "TOKO_B") logData = logsB?.find(l => l.id === logId);
        else if (sourceId === "TOKO_C") logData = logsC?.find(l => l.id === logId);

        const newExpenses = [...(logData?.pengeluaran || [])];
        newExpenses[originalIdx] = updatedItem;
        updateDocumentNonBlocking(docRef, { pengeluaran: newExpenses, lastUpdated: serverTimestamp() });
      }

      setTimeout(() => {
        setIsProcessing(false);
        setIsEditOpen(false);
        setEditingExpense(null);
        toast({ title: "Berhasil Diperbarui" });
      }, 500);
    } catch (err) {
      setIsProcessing(false);
      toast({ title: "Gagal Memperbarui", variant: "destructive" });
    }
  };

  const handleDeleteExpense = (item: any) => {
    if (!confirm("Hapus data pengeluaran ini secara permanen?")) return;

    try {
      if (item.sourceId === "OWNER") {
        const docRef = doc(db, "ownerExpenses", item.logId);
        const logData = logsOwner?.find(l => l.id === item.logId);
        const newExpenses = (logData?.expenses || []).filter((_: any, i: number) => i !== item.originalIdx);
        updateDocumentNonBlocking(docRef, { expenses: newExpenses, lastUpdated: serverTimestamp() });
      } else {
        const docRef = doc(db, "stores", item.sourceId, "cashLogs", item.logId);
        let logData;
        if (item.sourceId === "TOKO_A") logData = logsA?.find(l => l.id === item.logId);
        else if (item.sourceId === "TOKO_B") logData = logsB?.find(l => l.id === item.logId);
        else if (item.sourceId === "TOKO_C") logData = logsC?.find(l => l.id === item.logId);

        const newExpenses = (logData?.pengeluaran || []).filter((_: any, i: number) => i !== item.originalIdx);
        updateDocumentNonBlocking(docRef, { pengeluaran: newExpenses, lastUpdated: serverTimestamp() });
      }
      toast({ title: "Pengeluaran Dihapus" });
    } catch (err) {
      toast({ title: "Gagal Menghapus", variant: "destructive" });
    }
  };

  const exportPDF = () => {
    const docPdf = new jsPDF({ orientation: 'landscape' });
    docPdf.text("Laporan Operasional Pengeluaran - Nibras House", 148, 15, { align: "center" });
    docPdf.text(`Periode: ${filterMode === 'daily' ? selectedDate : selectedMonth} | Filter: ${storeFilter}`, 148, 22, { align: "center" });

    const tableData = aggregatedExpenses.map(item => [
      format(new Date(item.timestamp), "dd/MM/yyyy HH:mm"),
      item.source,
      item.type,
      item.qty || "-",
      `Rp ${item.amount.toLocaleString('id-ID')}`,
      item.note || "-"
    ]);

    (docPdf as any).autoTable({
      head: [['Waktu', 'Sumber', 'Jenis Pengeluaran', 'Qty', 'Nominal', 'Keterangan']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [31, 122, 99] }
    });

    docPdf.save(`laporan-pengeluaran-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary uppercase flex items-center gap-3">
            <ArrowDownToLine className="h-8 w-8 text-rose-600" /> Operasional Pengeluaran Toko
          </h1>
          <p className="text-muted-foreground text-sm">Rekapitulasi biaya operasional cabang dan pengeluaran owner pusat.</p>
        </div>
        <Button variant="outline" onClick={exportPDF} className="h-11 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50">
          <Download className="h-4 w-4 mr-2" /> PDF REKAP
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filter & Input Owner */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl border-none soft-shadow bg-white overflow-hidden">
            <CardHeader className="bg-slate-50 border-b p-5">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" /> Filter Laporan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Mode Tampilan</Label>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>HARIAN</button>
                  <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>BULANAN</button>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Pilih Waktu</Label>
                {filterMode === "daily" ? (
                  <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
                ) : (
                  <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400">Sumber Kas</Label>
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="ALL" className="font-bold">SEMUA SUMBER</SelectItem>
                    <SelectItem value="OWNER" className="font-bold">OWNER PUSAT</SelectItem>
                    {STORES.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-2xl bg-slate-900 text-white overflow-hidden">
            <CardHeader className="bg-white/5 border-b border-white/5 p-5">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Plus className="h-4 w-4 text-rose-400" /> Input Pengeluaran Owner
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Untuk Siapa / Cabang Mana?</Label>
                  <Select value={expenseTarget} onValueChange={setExpenseTarget}>
                    <SelectTrigger className="h-10 bg-white/10 border-none text-white text-xs font-bold rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="OWNER" className="font-bold">OWNER PUSAT</SelectItem>
                      {STORES.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Jenis Pembelian</Label>
                  <Input value={expenseType} onChange={e => setExpenseType(e.target.value)} placeholder="Mis: Gaji, Listrik.." className="h-10 bg-white/10 border-none text-white text-xs font-bold rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Qty</Label>
                    <Input value={expenseQty} onChange={e => setExpenseQty(e.target.value)} placeholder="1" className="h-10 bg-white/10 border-none text-white text-xs font-bold text-center rounded-xl" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-black uppercase text-slate-400">Nominal Rp</Label>
                    <Input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder="0" className="h-10 bg-white/10 border-none text-white text-xs font-bold rounded-xl" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Keterangan</Label>
                  <Input value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="Opsional.." className="h-10 bg-white/10 border-none text-white text-xs font-bold rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-black uppercase text-slate-400">Bukti Struk</Label>
                  <div className="relative group h-10">
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="h-full w-full bg-white/10 rounded-xl flex items-center justify-between px-3">
                      <span className="text-[10px] text-white/40">{isUploading ? "Uploading..." : expenseImage ? "Gambar Terpilih" : "Upload Foto"}</span>
                      {expenseImage ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Camera className="h-4 w-4 text-white/40" />}
                    </div>
                  </div>
                </div>
                <Button onClick={handleAddOwnerExpense} disabled={isProcessing || isUploading} className="w-full h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest shadow-lg shadow-rose-600/20 mt-2">
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "CATAT PENGELUARAN"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main List Area */}
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="rounded-3xl border-none soft-shadow bg-rose-600 text-white p-6">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Total Pengeluaran Periode Ini</p>
              <h3 className="text-3xl font-black">Rp {totalAmount.toLocaleString('id-ID')}</h3>
            </Card>
            <Card className="rounded-3xl border-none soft-shadow bg-white p-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Jumlah Transaksi</p>
                <h3 className="text-3xl font-black text-slate-800">{aggregatedExpenses.length} <span className="text-xs opacity-40">TRX</span></h3>
              </div>
              <div className="bg-slate-100 p-4 rounded-[2rem]"><ArrowDownToLine className="h-8 w-8 text-rose-600" /></div>
            </Card>
          </div>

          <Card className="rounded-[2.5rem] border-none soft-shadow bg-white overflow-hidden">
            <CardHeader className="p-6 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="relative flex-1 w-full max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Cari jenis, sumber, atau catatan..." value={search} onChange={e => setSearch(e.target.value)} className="h-11 pl-11 rounded-2xl bg-slate-50 border-none font-bold text-xs" />
              </div>
              <Badge variant="outline" className="h-11 px-6 rounded-2xl bg-slate-50 border-none font-black text-[10px] tracking-widest text-slate-400 uppercase">
                HASIL FILTER: {aggregatedExpenses.length} DATA
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                <Table>
                  <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm">
                    <TableRow className="border-none">
                      <TableHead className="pl-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Waktu & Sumber</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Jenis & Qty</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nominal</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bukti</TableHead>
                      <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aggregatedExpenses.map((exp, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors border-b last:border-none">
                        <TableCell className="pl-8 py-5">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-slate-800">{format(new Date(exp.timestamp), "dd/MM/yyyy HH:mm:ss")}</span>
                            <Badge className={cn("w-fit mt-1 text-[8px] font-black border-none px-2", exp.sourceId === 'OWNER' ? "bg-slate-800 text-white" : "bg-primary/10 text-primary")}>
                              {exp.source}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-black uppercase text-slate-700">{exp.type}</span>
                            <span className="text-[10px] font-bold text-slate-400">{exp.qty ? `${exp.qty} Unit` : "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-black text-rose-600">Rp {exp.amount.toLocaleString('id-ID')}</span>
                        </TableCell>
                        <TableCell>
                          {exp.image ? (
                            <button onClick={() => window.open(exp.image, '_blank')} className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-primary/10 text-slate-400 hover:text-primary transition-all">
                              <FileSearch className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-300 italic">Tanpa Bukti</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => { setEditingExpense(exp); setIsEditOpen(true); }}
                              className="p-2.5 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteExpense(exp)}
                              className="p-2.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {aggregatedExpenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center opacity-20">
                            <FileText className="h-16 w-16 mb-4" />
                            <p className="font-black uppercase tracking-widest">Tidak ada data pengeluaran</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-primary text-white shrink-0">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-xl font-black uppercase flex items-center gap-3">
                <Edit2 className="h-5 w-5" /> Edit Pengeluaran
              </DialogTitle>
              <button onClick={() => setIsEditOpen(false)} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <DialogDescription className="text-white/70 mt-1">Sesuaikan rincian operasional.</DialogDescription>
          </DialogHeader>
          
          <div className="p-8 space-y-5 bg-slate-50/50">
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Jenis Pembelian</Label>
                <Input 
                  value={editingExpense?.type || ""} 
                  onChange={e => setEditingExpense({...editingExpense, type: e.target.value})}
                  className="h-12 rounded-xl bg-white border-none font-bold shadow-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Qty</Label>
                  <Input 
                    value={editingExpense?.qty || ""} 
                    onChange={e => setEditingExpense({...editingExpense, qty: e.target.value})}
                    className="h-12 rounded-xl bg-white border-none font-bold text-center shadow-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nominal (Rp)</Label>
                  <Input 
                    type="number"
                    value={editingExpense?.amount || ""} 
                    onChange={e => setEditingExpense({...editingExpense, amount: e.target.value})}
                    className="h-12 rounded-xl bg-white border-none font-black text-primary shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Keterangan</Label>
                <Input 
                  value={editingExpense?.note || ""} 
                  onChange={e => setEditingExpense({...editingExpense, note: e.target.value})}
                  className="h-12 rounded-xl bg-white border-none font-bold shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Bukti Struk</Label>
                <div className="relative group h-12">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, true)} 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    disabled={isUploading}
                  />
                  <div className="h-full w-full bg-white border-none rounded-xl shadow-sm flex items-center justify-between px-4">
                    <span className="text-xs font-bold text-slate-400">
                      {isUploading ? "Uploading..." : editingExpense?.image ? "Gambar Tersedia" : "Upload Baru"}
                    </span>
                    {editingExpense?.image ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <div className="h-6 w-6 rounded overflow-hidden border"><img src={editingExpense.image} className="w-full h-full object-cover" /></div>
                      </div>
                    ) : <Camera className="h-4 w-4 text-slate-300" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-white border-t">
            <Button 
              className="w-full h-14 rounded-2xl font-black shadow-xl shadow-primary/20 text-sm uppercase tracking-widest" 
              onClick={handleUpdateExpense}
              disabled={isProcessing || isUploading}
            >
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : <><Save className="h-4 w-4 mr-2" /> SIMPAN PERUBAHAN</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
