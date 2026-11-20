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

const formatCurrencyInput = (val: string | number) => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? val.replace(/[^0-9]/g, '') : Math.round(val).toString();
  if (!num) return '';
  return 'Rp ' + parseInt(num).toLocaleString('id-ID');
};

const parseCurrencyInput = (val: string) => {
  return val.replace(/[^0-9]/g, '');
};

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
    <div className="space-y-4 sm:space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Operational Ledger</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">Operasional Pengeluaran Toko</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Rekapitulasi biaya operasional cabang dan pengeluaran owner pusat.</p>
        </div>
        <Button variant="outline" onClick={exportPDF} className="h-8 sm:h-9 rounded-full px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50 w-full sm:w-auto">
          <Download className="h-3.5 w-3.5 mr-1.5 text-[#C82368]" /> PDF REKAP
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Sidebar Filter & Input Owner */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 shadow-sm bg-white overflow-hidden">
            <CardHeader className="bg-neutral-950 text-white p-3.5 sm:p-4">
              <CardTitle className="text-[11px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-neutral-200">
                <Filter className="h-3.5 w-3.5 text-[#C82368]" /> Filter Laporan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 space-y-3">
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Mode Tampilan</Label>
                  <div className="flex bg-[#F5F3F0] p-1 rounded-full border border-neutral-200/70">
                    <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all", filterMode === "daily" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>HARIAN</button>
                    <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all", filterMode === "monthly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>BULANAN</button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Pilih Waktu</Label>
                  {filterMode === "daily" ? (
                    <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5" />
                  ) : (
                    <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5" />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Sumber Kas</Label>
                <Select value={storeFilter} onValueChange={setStoreFilter}>
                  <SelectTrigger className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="ALL" className="font-bold text-xs">SEMUA SUMBER</SelectItem>
                    <SelectItem value="OWNER" className="font-bold text-xs">OWNER PUSAT</SelectItem>
                    {STORES.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl sm:rounded-3xl border-none shadow-lg bg-neutral-950 text-white overflow-hidden">
            <CardHeader className="border-b border-white/10 p-3.5 sm:p-4">
              <CardTitle className="text-[11px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-neutral-200">
                <Plus className="h-3.5 w-3.5 text-[#C82368]" /> Input Pengeluaran Owner
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-4 space-y-2.5">
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 ml-1">Sumber / Cabang</Label>
                    <Select value={expenseTarget} onValueChange={setExpenseTarget}>
                      <SelectTrigger className="h-9 bg-white/10 border border-white/10 text-white text-[11px] sm:text-xs font-bold rounded-full px-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="OWNER" className="font-bold text-xs">OWNER PUSAT</SelectItem>
                        {STORES.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 ml-1">Jenis Pembelian</Label>
                    <Input value={expenseType} onChange={e => setExpenseType(e.target.value)} placeholder="Mis: Gaji, Listrik.." className="h-9 bg-white/10 border border-white/10 text-white placeholder:text-white/40 text-[11px] sm:text-xs font-bold rounded-full px-3" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 ml-1">Qty</Label>
                    <Input value={expenseQty} onChange={e => setExpenseQty(e.target.value)} placeholder="1" className="h-9 bg-white/10 border border-white/10 text-white placeholder:text-white/40 text-[11px] sm:text-xs font-bold text-center rounded-full" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 ml-1">Nominal Rp</Label>
                    <Input 
                      type="text" 
                      value={formatCurrencyInput(expenseAmount)} 
                      onChange={e => setExpenseAmount(parseCurrencyInput(e.target.value))} 
                      placeholder="Rp 0" 
                      className="h-9 bg-white/10 border border-white/10 text-white placeholder:text-white/40 text-[11px] sm:text-xs font-bold rounded-full px-3" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 ml-1">Keterangan</Label>
                    <Input value={expenseNote} onChange={e => setExpenseNote(e.target.value)} placeholder="Opsional.." className="h-9 bg-white/10 border border-white/10 text-white placeholder:text-white/40 text-[11px] sm:text-xs font-bold rounded-full px-3" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 ml-1">Bukti Struk</Label>
                    <div className="relative group h-9">
                      <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      <div className="h-full w-full bg-white/10 border border-white/10 rounded-full flex items-center justify-between px-3">
                        <span className="text-[10px] text-white/60 truncate">{isUploading ? "Uploading..." : expenseImage ? "Terpilih" : "Upload Foto"}</span>
                        {expenseImage ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> : <Camera className="h-3.5 w-3.5 text-white/50 shrink-0" />}
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={handleAddOwnerExpense} disabled={isProcessing || isUploading} className="w-full h-9 sm:h-10 rounded-full bg-[#C82368] hover:bg-[#a61c55] text-white font-bold text-[11px] sm:text-xs uppercase tracking-widest mt-1">
                  {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "CATAT PENGELUARAN"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main List Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
            <Card className="rounded-2xl sm:rounded-3xl border-none shadow-sm bg-[#C82368] text-white p-3.5 sm:p-5">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-white/75 mb-0.5 truncate">Total Pengeluaran</p>
              <h3 className="text-base sm:text-2xl font-serif font-bold truncate">Rp {totalAmount.toLocaleString('id-ID')}</h3>
            </Card>
            <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 shadow-sm bg-white p-3.5 sm:p-5 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-0.5 truncate">Jumlah Transaksi</p>
                <h3 className="text-base sm:text-2xl font-serif font-bold text-neutral-900 truncate">{aggregatedExpenses.length} <span className="text-[10px] sm:text-xs font-sans text-neutral-400">TRX</span></h3>
              </div>
              <div className="bg-[#F5F3F0] p-2.5 sm:p-3.5 rounded-full shrink-0"><ArrowDownToLine className="h-4 w-4 sm:h-6 sm:w-6 text-[#C82368]" /></div>
            </Card>
          </div>

          <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 shadow-sm bg-white overflow-hidden">
            <CardHeader className="p-3.5 sm:p-4 border-b border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input placeholder="Cari jenis, sumber, atau catatan..." value={search} onChange={e => setSearch(e.target.value)} className="h-9 pl-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-medium text-xs" />
              </div>
              <Badge variant="outline" className="h-8 sm:h-9 px-4 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[9px] sm:text-[10px] tracking-widest text-neutral-500 uppercase flex items-center justify-center">
                HASIL FILTER: {aggregatedExpenses.length} DATA
              </Badge>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile Compact Cards (Zero Horizontal Scroll) */}
              <div className="md:hidden divide-y divide-neutral-100">
                {aggregatedExpenses.length > 0 ? aggregatedExpenses.map((exp, idx) => (
                  <div key={idx} className="p-3 space-y-2 hover:bg-[#F5F3F0]/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className={cn("text-[8px] font-bold border-none rounded-full px-2 py-0 h-4", exp.sourceId === 'OWNER' ? "bg-neutral-950 text-white" : "bg-[#C82368]/10 text-[#C82368]")}>
                            {exp.source}
                          </Badge>
                          <span className="text-[9px] text-neutral-400 font-medium">{format(new Date(exp.timestamp), "dd/MM/yy HH:mm")}</span>
                        </div>
                        <p className="text-xs font-bold uppercase text-neutral-900 mt-1 leading-snug break-words">
                          {exp.type} {exp.qty ? <span className="text-neutral-400 font-semibold">({exp.qty} Unit)</span> : null}
                        </p>
                        {exp.note && <p className="text-[10px] text-neutral-500 italic mt-0.5 break-words">{exp.note}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {exp.image && (
                          <button onClick={() => window.open(exp.image, '_blank')} className="h-7 w-7 rounded-full bg-[#F5F3F0] flex items-center justify-center text-neutral-600 hover:text-[#C82368]">
                            <FileSearch className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button onClick={() => { setEditingExpense(exp); setIsEditOpen(true); }} className="h-7 w-7 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-100">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDeleteExpense(exp)} className="h-7 w-7 rounded-full border border-rose-200 flex items-center justify-center text-rose-600 hover:bg-rose-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100">
                      <span className="text-[9px] font-bold uppercase text-neutral-400">Nominal</span>
                      <span className="text-xs font-bold text-rose-600">Rp {exp.amount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                )) : (
                  <div className="p-10 text-center opacity-40">
                    <FileText className="h-10 w-10 mx-auto mb-2" />
                    <p className="font-bold text-[10px] uppercase tracking-widest">Tidak ada data pengeluaran</p>
                  </div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block w-full overflow-x-auto">
                <ScrollArea className="h-[60vh]">
                  <Table>
                    <TableHeader className="bg-neutral-950 text-white sticky top-0 z-10">
                      <TableRow className="border-none hover:bg-neutral-950">
                        <TableHead className="pl-6 py-4 text-[10px] font-bold uppercase tracking-widest text-neutral-300">Waktu &amp; Sumber</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Jenis &amp; Qty</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Nominal</TableHead>
                        <TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Bukti</TableHead>
                        <TableHead className="text-right pr-6 text-[10px] font-bold uppercase tracking-widest text-neutral-300">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {aggregatedExpenses.map((exp, idx) => (
                        <TableRow key={idx} className="hover:bg-[#F5F3F0]/60 transition-colors border-b border-neutral-100 last:border-none">
                          <TableCell className="pl-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-bold text-neutral-800 whitespace-nowrap">{format(new Date(exp.timestamp), "dd/MM/yyyy HH:mm:ss")}</span>
                              <Badge className={cn("w-fit mt-1 text-[9px] font-bold border-none rounded-full px-2.5", exp.sourceId === 'OWNER' ? "bg-neutral-950 text-white" : "bg-[#C82368]/10 text-[#C82368]")}>
                                {exp.source}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-bold uppercase text-neutral-900">{exp.type}</span>
                              <span className="text-[10px] font-bold text-neutral-400">{exp.qty ? `${exp.qty} Unit` : "-"}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-bold text-rose-600 whitespace-nowrap">Rp {exp.amount.toLocaleString('id-ID')}</span>
                          </TableCell>
                          <TableCell>
                            {exp.image ? (
                              <button onClick={() => window.open(exp.image, '_blank')} className="h-9 w-9 rounded-full bg-[#F5F3F0] flex items-center justify-center hover:bg-[#C82368]/10 text-neutral-500 hover:text-[#C82368] transition-all">
                                <FileSearch className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] font-bold text-neutral-300 italic">Tanpa Bukti</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-1">
                              <button 
                                onClick={() => { setEditingExpense(exp); setIsEditOpen(true); }}
                                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 transition-all"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteExpense(exp)}
                                className="p-2 rounded-full hover:bg-rose-50 text-neutral-400 hover:text-rose-600 transition-all"
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
                            <div className="flex flex-col items-center justify-center opacity-25">
                              <FileText className="h-14 w-14 mb-3" />
                              <p className="font-bold text-xs uppercase tracking-widest">Tidak ada data pengeluaran</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Expense Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-5 md:p-6 bg-neutral-950 text-white shrink-0">
            <div className="flex justify-between items-center">
              <DialogTitle className="text-2xl font-serif flex items-center gap-3">
                <Edit2 className="h-5 w-5 text-[#C82368]" /> Edit Pengeluaran
              </DialogTitle>
              <button onClick={() => setIsEditOpen(false)} className="text-white/50 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <DialogDescription className="text-neutral-400 mt-1">Sesuaikan rincian operasional.</DialogDescription>
          </DialogHeader>
          
          <div className="p-6 space-y-5 bg-[#F5F3F0]">
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-2">Jenis Pembelian</Label>
                <Input 
                  value={editingExpense?.type || ""} 
                  onChange={e => setEditingExpense({...editingExpense, type: e.target.value})}
                  className="h-11 rounded-full bg-white border border-neutral-200/70 font-bold text-xs px-4"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-2">Qty</Label>
                  <Input 
                    value={editingExpense?.qty || ""} 
                    onChange={e => setEditingExpense({...editingExpense, qty: e.target.value})}
                    className="h-11 rounded-full bg-white border border-neutral-200/70 font-bold text-center text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-2">Nominal (Rp)</Label>
                  <Input 
                    type="text"
                    value={formatCurrencyInput(editingExpense?.amount || "")} 
                    onChange={e => setEditingExpense({...editingExpense, amount: parseCurrencyInput(e.target.value)})}
                    className="h-11 rounded-full bg-white border border-neutral-200/70 font-bold text-[#C82368] text-xs px-4"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-2">Keterangan</Label>
                <Input 
                  value={editingExpense?.note || ""} 
                  onChange={e => setEditingExpense({...editingExpense, note: e.target.value})}
                  className="h-11 rounded-full bg-white border border-neutral-200/70 font-bold text-xs px-4"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-2">Bukti Struk</Label>
                <div className="relative group h-11">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, true)} 
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                    disabled={isUploading}
                  />
                  <div className="h-full w-full bg-white border border-neutral-200/70 rounded-full flex items-center justify-between px-4">
                    <span className="text-xs font-bold text-neutral-500">
                      {isUploading ? "Uploading..." : editingExpense?.image ? "Gambar Tersedia" : "Upload Baru"}
                    </span>
                    {editingExpense?.image ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <div className="h-6 w-6 rounded-full overflow-hidden border"><img src={editingExpense.image} className="w-full h-full object-cover" /></div>
                      </div>
                    ) : <Camera className="h-4 w-4 text-neutral-400" />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-5 bg-white border-t border-neutral-100">
            <Button 
              className="w-full h-11 rounded-full bg-[#C82368] hover:bg-[#a61c55] text-white font-bold text-xs uppercase tracking-widest" 
              onClick={handleUpdateExpense}
              disabled={isProcessing || isUploading}
            >
              {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : <><Save className="h-4 w-4 mr-2" /> SIMPAN PERUBAHAN</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
