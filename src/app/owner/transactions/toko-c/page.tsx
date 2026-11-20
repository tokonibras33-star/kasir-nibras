<<<<<<< HEAD
=======

>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import { Search, Download, Eye, FileText, Calendar, Filter, Trash2, RotateCcw } from "lucide-react";
=======
import { Search, Download, Eye, FileText, Calendar, Filter, Trash2 } from "lucide-react";
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, where, Timestamp, doc } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
<<<<<<< HEAD
import { getTrxReturnSummary, TrxReturnSummary, getItemUnitNetPrice } from "@/components/cashier/types";

const safeFormatDate = (rawDate: any): string => {
  if (!rawDate) return "-";
  try {
    if (typeof rawDate?.toDate === "function") return rawDate.toDate().toLocaleString("id-ID");
    if (rawDate instanceof Date) return rawDate.toLocaleString("id-ID");
    if (typeof rawDate === "string" || typeof rawDate === "number") {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) return d.toLocaleString("id-ID");
    }
    if (rawDate.seconds) return new Date(rawDate.seconds * 1000).toLocaleString("id-ID");
  } catch (e) {
    return "-";
  }
  return "-";
};
=======
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68

export default function TransactionsTokoCPage() {
  const db = useFirestore();
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedTrx, setSelectedTrx] = useState<any>(null);

  const trxQuery = useMemoFirebase(() => {
    let q = collection(db, "stores", "TOKO_C", "transactions");
    if (filterMode === "daily") {
      const start = new Date(selectedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate);
      end.setHours(23, 59, 59, 999);
      return query(q, where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)), orderBy("date", "desc"));
    } else {
      const [year, month] = selectedMonth.split("-");
      const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
      const lastDay = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      return query(q, where("date", ">=", Timestamp.fromDate(firstDay)), where("date", "<=", Timestamp.fromDate(lastDay)), orderBy("date", "desc"));
    }
  }, [db, filterMode, selectedDate, selectedMonth]);

  const { data: historyData } = useCollection<any>(trxQuery);
  const history = historyData || [];

<<<<<<< HEAD
  const totalSales = useMemo(() => {
    return history.reduce((sum, trx) => sum + getTrxReturnSummary(trx).netTotal, 0);
  }, [history]);

=======
  const totalSales = useMemo(() => history.reduce((sum, trx) => sum + (trx.total || 0), 0), [history]);
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
  const avgTicket = history.length > 0 ? totalSales / history.length : 0;

  const filtered = useMemo(() => history.filter(trx => 
    (trx.id || "").toLowerCase().includes(search.toLowerCase()) ||
<<<<<<< HEAD
    (trx.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
    (trx.customerPhone || "").includes(search)
=======
    (trx.customerName || "").toLowerCase().includes(search.toLowerCase())
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
  ), [history, search]);

  const handleDeleteSingle = (trxId: string) => {
    if (!trxId) return;
    if (confirm(`Hapus permanen transaksi ${trxId}?`)) {
      deleteDocumentNonBlocking(doc(db, "stores", "TOKO_C", "transactions", trxId));
      toast({ title: "Terhapus", description: "Data berhasil dihapus." });
    }
  };

  const handleDeleteFiltered = () => {
    if (filtered.length === 0) return;
    if (confirm(`HAPUS PERMANEN SEMUA (${filtered.length}) transaksi yang tampil?`)) {
      filtered.forEach(trx => {
        deleteDocumentNonBlocking(doc(db, "stores", "TOKO_C", "transactions", trx.id));
      });
      toast({ title: "Berhasil", description: "Penghapusan sedang diproses." });
    }
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF();
<<<<<<< HEAD
    docPdf.text("Laporan Transaksi NHS GDM - Nibras House", 105, 10, { align: "center" });
    const tableData = filtered.map(trx => {
      const summary = getTrxReturnSummary(trx);
      let statusStr = trx.status || "COMPLETED";
      if (summary.allReturned) statusStr = "DIRETUR";
      else if (summary.hasReturn) statusStr = `RETUR (${summary.effectiveStatus === 'DP' ? 'DP' : 'LUNAS'})`;
      else if (summary.effectiveStatus === 'DP') statusStr = "DP";

      return [
        trx.id, 
        safeFormatDate(trx.date), 
        trx.customerName || "UMUM", 
        `Rp ${summary.netTotal.toLocaleString('id-ID')}`, 
        statusStr
      ];
    });
    (docPdf as any).autoTable({ head: [['ID', 'Waktu', 'Customer', 'Total Net', 'Status']], body: tableData, startY: 20 });
    docPdf.save(`trx-toko-c-${filterMode === 'daily' ? selectedDate : selectedMonth}.pdf`);
  };

  const selectedSummary: TrxReturnSummary | null = useMemo(() => {
    if (!selectedTrx) return null;
    return getTrxReturnSummary(selectedTrx);
  }, [selectedTrx]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Branch Sales Log</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">Transaksi NHS GDM (Toko C)</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Manajemen riwayat penjualan Cabang NHS GDM dengan kalkulasi retur &amp; DP.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" className="h-8 sm:h-9 rounded-full px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50"><Download className="h-3.5 w-3.5 mr-1.5" /> Export</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-2xl"><DropdownMenuItem onClick={exportToPDF} className="cursor-pointer font-medium text-xs"><FileText className="h-3.5 w-3.5 mr-2 text-[#C82368]" /> PDF</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/70">
        <div className="grid grid-cols-2 md:flex gap-2 shrink-0">
          <div className="flex bg-[#F5F3F0] p-1 rounded-full border border-neutral-200/70">
            <button onClick={() => setFilterMode("daily")} className={cn("flex-1 md:flex-none px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-full transition-all", filterMode === "daily" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>HARIAN</button>
            <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 md:flex-none px-3 sm:px-4 py-1.5 text-[10px] sm:text-xs font-bold rounded-full transition-all", filterMode === "monthly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>BULANAN</button>
          </div>
          {filterMode === "daily" ? (
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full md:w-44 h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5" />
          ) : (
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full md:w-44 h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5" />
          )}
        </div>
        
        <div className="flex-1 flex items-center gap-2 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input placeholder="Cari ID atau Nama..." className="pl-9 h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 text-[11px] sm:text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

=======
    docPdf.text("Laporan Transaksi Toko C", 105, 10, { align: "center" });
    const tableData = filtered.map(trx => [trx.id, trx.customerName || "UMUM", trx.total]);
    (docPdf as any).autoTable({ head: [['ID', 'Customer', 'Total']], body: tableData, startY: 20 });
    docPdf.save(`trx-toko-c-${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Transaksi Toko C</h1>
          <p className="text-muted-foreground text-sm">Riwayat penjualan Cabang C.</p>
        </div>
        <Button variant="outline" onClick={exportToPDF} className="h-10 font-bold"><Download className="h-4 w-4 mr-2" /> PDF</Button>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button onClick={() => setFilterMode("daily")} className={cn("px-4 py-2 text-xs font-black rounded-lg transition-all", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>HARIAN</button>
          <button onClick={() => setFilterMode("monthly")} className={cn("px-4 py-2 text-xs font-black rounded-lg transition-all", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>BULANAN</button>
        </div>
        <div className="flex-1 flex items-center gap-2 w-full">
          {filterMode === "daily" ? (
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44 h-10 rounded-xl bg-slate-50 border-none font-bold" />
          ) : (
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-44 h-10 rounded-xl bg-slate-50 border-none font-bold" />
          )}
          
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
          <Button 
            variant="destructive" 
            onClick={handleDeleteFiltered} 
            disabled={filtered.length === 0} 
<<<<<<< HEAD
            className="h-9 rounded-full font-bold gap-1.5 px-3.5 sm:px-4 text-[10px] sm:text-xs shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">HAPUS TRANSAKSI</span><span className="sm:hidden">HAPUS</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-neutral-950 text-white rounded-2xl sm:rounded-3xl border-none shadow-sm"><CardHeader className="p-2.5 sm:p-5"><p className="text-[8px] sm:text-[10px] uppercase font-bold text-neutral-400 tracking-wider truncate">Omzet (Net)</p><CardTitle className="text-xs sm:text-xl md:text-2xl font-serif truncate">Rp {totalSales.toLocaleString('id-ID')}</CardTitle></CardHeader></Card>
        <Card className="bg-[#C82368] text-white rounded-2xl sm:rounded-3xl border-none shadow-sm"><CardHeader className="p-2.5 sm:p-5"><p className="text-[8px] sm:text-[10px] uppercase font-bold text-white/75 tracking-wider truncate">Transaksi</p><CardTitle className="text-xs sm:text-xl md:text-2xl font-serif truncate">{history.length} TRX</CardTitle></CardHeader></Card>
        <Card className="bg-white text-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/70 shadow-sm"><CardHeader className="p-2.5 sm:p-5"><p className="text-[8px] sm:text-[10px] uppercase font-bold text-neutral-400 tracking-wider truncate">Rata-rata</p><CardTitle className="text-xs sm:text-xl md:text-2xl font-serif truncate">Rp {Math.round(avgTicket).toLocaleString('id-ID')}</CardTitle></CardHeader></Card>
      </div>

      <Card className="shadow-sm border border-neutral-200/70 bg-white rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {/* Mobile Compact Cards (Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {filtered.length > 0 ? filtered.map((trx) => {
              const summary = getTrxReturnSummary(trx);
              const isDP = trx.status === "DP" || summary.effectiveStatus === "DP";
              return (
                <div key={trx.id} className="p-3 space-y-2 hover:bg-[#F5F3F0]/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono font-bold text-[#C82368] text-[11px]">{trx.id}</p>
                      <p className="text-[9px] text-neutral-400 mt-0.5">{safeFormatDate(trx.date)}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1 shrink-0">
                      {summary.allReturned ? (
                        <Badge variant="outline" className="text-[8px] font-bold border-none rounded-full px-2 bg-rose-100 text-rose-700">DIRETUR</Badge>
                      ) : summary.hasReturn ? (
                        <>
                          <Badge variant="outline" className="text-[8px] font-bold border-none rounded-full px-2 bg-rose-100 text-rose-700">RETUR</Badge>
                          <Badge variant="outline" className={cn("text-[8px] font-bold border-none rounded-full px-2", isDP ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700")}>{isDP ? "DP" : "LUNAS"}</Badge>
                        </>
                      ) : (
                        <Badge variant="outline" className={cn("text-[8px] font-bold border-none rounded-full px-2", isDP ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700")}>
                          {isDP ? "DP" : "COMPLETED"}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-bold uppercase text-neutral-900 truncate">{trx.customerName || "UMUM"}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                    <div>
                      <span className="font-bold text-xs text-neutral-900">Rp {summary.netTotal.toLocaleString('id-ID')}</span>
                      {summary.hasReturn && (
                        <span className="text-[9px] text-neutral-400 line-through ml-1.5">Rp {summary.originalTotal.toLocaleString('id-ID')}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7 text-neutral-700 rounded-full border-neutral-200" onClick={() => setSelectedTrx(trx)}><Eye className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 text-rose-600 rounded-full border-rose-200 hover:bg-rose-50" onClick={() => handleDeleteSingle(trx.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-xs text-neutral-400 italic">Tidak ada data ditemukan.</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white">
                <TableRow className="text-[10px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                  <TableHead className="pl-6 text-neutral-300">ID TRX</TableHead>
                  <TableHead className="text-neutral-300">Waktu</TableHead>
                  <TableHead className="text-neutral-300">Customer</TableHead>
                  <TableHead className="text-right text-neutral-300">Total Net</TableHead>
                  <TableHead className="text-center text-neutral-300">Status</TableHead>
                  <TableHead className="text-right pr-6 text-neutral-300">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((trx) => {
                  const summary = getTrxReturnSummary(trx);
                  const isDP = trx.status === "DP" || summary.effectiveStatus === "DP";
                  return (
                    <TableRow key={trx.id} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 transition-colors">
                      <TableCell className="pl-6 font-mono font-bold text-[#C82368] whitespace-nowrap">{trx.id}</TableCell>
                      <TableCell className="text-xs text-neutral-500 whitespace-nowrap">{safeFormatDate(trx.date)}</TableCell>
                      <TableCell className="text-sm font-bold uppercase text-neutral-900">{trx.customerName || "UMUM"}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {summary.hasReturn ? (
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-sm text-neutral-900">Rp {summary.netTotal.toLocaleString('id-ID')}</span>
                            <span className="text-[10px] text-neutral-400 line-through">Rp {summary.originalTotal.toLocaleString('id-ID')}</span>
                          </div>
                        ) : (
                          <span className="font-bold text-sm text-neutral-900">Rp {summary.netTotal.toLocaleString('id-ID')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          {summary.allReturned ? (
                            <Badge variant="outline" className="text-[9px] font-bold border-none rounded-full px-3 bg-rose-100 text-rose-700">
                              DIRETUR
                            </Badge>
                          ) : summary.hasReturn ? (
                            <div className="flex flex-wrap justify-center gap-1">
                              <Badge variant="outline" className="text-[9px] font-bold border-none rounded-full px-2.5 bg-rose-100 text-rose-700">
                                RETUR
                              </Badge>
                              <Badge variant="outline" className={cn("text-[9px] font-bold border-none rounded-full px-2.5", isDP ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700")}>
                                {isDP ? "DP" : "LUNAS"}
                              </Badge>
                            </div>
                          ) : (
                            <Badge variant="outline" className={cn("text-[9px] font-bold rounded-full px-3 border-none", isDP ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700")}>
                              {isDP ? "DP (BELUM LUNAS)" : "COMPLETED"}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-700 rounded-full hover:bg-neutral-100" onClick={() => setSelectedTrx(trx)}><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 rounded-full hover:bg-rose-50" onClick={() => handleDeleteSingle(trx.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : <TableRow><TableCell colSpan={6} className="h-40 text-center text-neutral-400 italic">Tidak ada data ditemukan.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
=======
            className="h-10 rounded-xl font-black gap-2 px-4 shrink-0"
          >
            <Trash2 className="h-4 w-4" /> HAPUS TRANSAKSI
          </Button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari..." className="pl-10 h-10 rounded-xl bg-slate-50 border-none" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-primary text-white rounded-3xl border-none shadow-sm"><CardHeader className="p-5"><p className="text-[10px] font-black uppercase opacity-70">Total Omzet</p><CardTitle className="text-2xl font-black">Rp {totalSales.toLocaleString('id-ID')}</CardTitle></CardHeader></Card>
        <Card className="bg-blue-600 text-white rounded-3xl border-none shadow-sm"><CardHeader className="p-5"><p className="text-[10px] font-black uppercase opacity-70">Transaksi</p><CardTitle className="text-2xl font-black">{history.length} TRX</CardTitle></CardHeader></Card>
        <Card className="bg-emerald-600 text-white rounded-3xl border-none shadow-sm"><CardHeader className="p-5"><p className="text-[10px] font-black uppercase opacity-70">Rata-rata</p><CardTitle className="text-2xl font-black">Rp {avgTicket.toLocaleString('id-ID')}</CardTitle></CardHeader></Card>
      </div>

      <Card className="soft-shadow border-none rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50"><TableRow className="text-[10px] font-black uppercase"><TableHead className="pl-6">ID TRX</TableHead><TableHead>Waktu</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right pr-6">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((trx) => (
                <TableRow key={trx.id} className="hover:bg-muted/20 border-b border-muted/50 transition-colors">
                  <TableCell className="pl-6 font-bold text-primary">{trx.id}</TableCell>
                  <TableCell className="text-xs">{trx.date?.toDate().toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-sm font-bold uppercase">{trx.customerName || "UMUM"}</TableCell>
                  <TableCell className="text-right font-black">Rp {trx.total?.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-center"><Badge variant="outline" className="text-[9px] font-black border-none bg-emerald-100 text-emerald-700">{trx.status}</Badge></TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSelectedTrx(trx)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSingle(trx.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic">Data riwayat Toko C belum tersedia.</TableCell></TableRow>}
            </TableBody>
          </Table>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
        </CardContent>
      </Card>

      <Dialog open={!!selectedTrx} onOpenChange={o => !o && setSelectedTrx(null)}>
<<<<<<< HEAD
        <DialogContent className="w-[95vw] max-w-3xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 md:p-7 bg-neutral-950 text-white">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div>
                <DialogTitle className="text-2xl font-serif uppercase">{selectedTrx?.id}</DialogTitle>
                <p className="text-xs text-neutral-400 mt-1">{safeFormatDate(selectedTrx?.date)}</p>
              </div>
              {selectedSummary?.allReturned ? (
                <Badge className="bg-rose-600 text-white border-none font-bold px-3 py-1 rounded-full text-[10px]">DIRETUR PENUH</Badge>
              ) : selectedSummary?.hasReturn ? (
                <Badge className="bg-amber-600 text-white border-none font-bold px-3 py-1 rounded-full text-[10px]">RETUR SEBAGIAN</Badge>
              ) : null}
            </div>
          </DialogHeader>

          <div className="p-5 md:p-8 space-y-6 max-h-[65vh] overflow-y-auto bg-[#F5F3F0]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-sm"><p className="text-[9px] font-bold text-neutral-400 uppercase">Customer</p><p className="text-sm font-bold uppercase text-neutral-900">{selectedTrx?.customerName || "UMUM"}</p></div>
              <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-sm"><p className="text-[9px] font-bold text-neutral-400 uppercase">Tipe Pelanggan</p><p className="text-sm font-bold uppercase text-neutral-900">{selectedTrx?.customerType || "UMUM"}</p></div>
              <div className="bg-white p-4 rounded-2xl border border-neutral-200/70 shadow-sm"><p className="text-[9px] font-bold text-neutral-400 uppercase">Nomor WhatsApp</p><p className="text-sm font-bold text-neutral-900">{selectedTrx?.customerPhone || "-"}</p></div>
            </div>

            {selectedSummary?.hasReturn && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-900 space-y-2">
                <div className="flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-rose-600" />
                  <p className="text-xs font-bold uppercase tracking-wider">Informasi Retur Barang</p>
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <span>Total Refund / Potongan: <strong>Rp {selectedSummary.totalRefund.toLocaleString('id-ID')}</strong></span>
                  {selectedSummary.refundFromPaid > 0 && (
                    <span>Pengembalian Kas: <strong>Rp {selectedSummary.refundFromPaid.toLocaleString('id-ID')}</strong></span>
                  )}
                  {selectedTrx?.returnLog?.returnedAt && (
                    <span className="text-[10px] text-rose-700">Waktu: {safeFormatDate(selectedTrx.returnLog.returnedAt)}</span>
                  )}
                </div>
              </div>
            )}
            
            <Card className="rounded-3xl border border-neutral-200/70 shadow-sm overflow-hidden bg-white">
              <div className="w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-neutral-950 text-white">
                    <TableRow className="text-[9px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                      <TableHead className="pl-5 text-neutral-300">Produk</TableHead>
                      <TableHead className="text-center text-neutral-300">Qty</TableHead>
                      <TableHead className="text-center text-neutral-300">Status Retur</TableHead>
                      <TableHead className="text-right pr-5 text-neutral-300">Subtotal Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedTrx?.items || []).map((item: any, i: number) => {
                      const key = `${item.productId}-${item.variantId}`;
                      const returnedQty = selectedSummary?.returnedQtyMap[key] || 0;
                      const unitNet = getItemUnitNetPrice(item);
                      const isFullReturn = returnedQty >= (item.quantity || 1);

                      return (
                        <TableRow key={i} className="text-xs border-b border-neutral-100 last:border-none">
                          <TableCell className="pl-5 font-bold uppercase text-neutral-900">
                            <span className={cn(isFullReturn && "line-through text-neutral-400")}>{item.name}</span>
                            <br/>
                            <span className="text-[10px] text-neutral-400 font-normal">{item.color} | {item.size}</span>
                          </TableCell>
                          <TableCell className="text-center font-bold">{item.quantity} PCS</TableCell>
                          <TableCell className="text-center">
                            {returnedQty > 0 ? (
                              <Badge className="bg-rose-100 text-rose-700 border-none font-bold text-[9px]">
                                Retur {returnedQty} PCS
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-neutral-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right pr-5 font-bold whitespace-nowrap">
                            Rp {(unitNet * (item.quantity || 1)).toLocaleString('id-ID')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-neutral-200/70 space-y-2 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Rincian Pembayaran</p>
                <div className="flex justify-between text-xs font-medium"><span>Metode Bayar</span><span className="font-bold uppercase">{selectedTrx?.paymentMethod || "CASH"}</span></div>
                {selectedSummary?.effectiveStatus === "DP" || selectedSummary?.netRemaining ? (
                  <>
                    <div className="flex justify-between text-xs font-medium"><span>Sudah Dibayar (Net)</span><span className="text-emerald-700 font-bold">Rp {selectedSummary.netPaid.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between text-xs font-medium"><span>Sisa Pelunasan</span><span className="text-amber-600 font-bold">Rp {selectedSummary.netRemaining.toLocaleString('id-ID')}</span></div>
                  </>
                ) : null}
                <div className="flex justify-between text-xs font-medium"><span>Total Potongan</span><span className="text-rose-600 font-bold">-Rp {(selectedTrx?.totalDiscount || 0).toLocaleString('id-ID')}</span></div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-neutral-200/70 flex flex-col justify-center shadow-sm">
                <span className="text-xs font-bold uppercase text-neutral-500">Grand Total Net</span>
                <span className="text-2xl font-serif font-bold text-[#C82368]">Rp {(selectedSummary?.netTotal ?? selectedTrx?.total ?? 0).toLocaleString('id-ID')}</span>
                {selectedSummary?.hasReturn && (
                  <span className="text-[10px] text-neutral-400 line-through">Semula: Rp {selectedSummary.originalTotal.toLocaleString('id-ID')}</span>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="p-5 bg-white border-t border-neutral-100"><Button className="w-full h-11 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest" onClick={() => setSelectedTrx(null)}>TUTUP RINCIAN</Button></DialogFooter>
=======
        <DialogContent className="max-w-3xl rounded-[2rem] p-0 border-none shadow-2xl overflow-hidden">
          <DialogHeader className="p-8 bg-primary text-white"><DialogTitle className="text-2xl font-black uppercase">{selectedTrx?.id}</DialogTitle></DialogHeader>
          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-[9px] font-black text-muted-foreground uppercase">Customer</p><p className="text-sm font-black uppercase">{selectedTrx?.customerName || "UMUM"}</p></div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-[9px] font-black text-muted-foreground uppercase">Tipe</p><p className="text-sm font-black uppercase">{selectedTrx?.customerType || "UMUM"}</p></div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-[9px] font-black text-muted-foreground uppercase">WhatsApp</p><p className="text-sm font-black">{selectedTrx?.customerPhone || "-"}</p></div>
            </div>
            <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50"><TableRow className="text-[9px] font-black uppercase"><TableHead className="pl-4">Produk</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right pr-4">Subtotal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedTrx?.items?.map((item: any, i: number) => (
                    <TableRow key={i} className="text-xs border-b last:border-none">
                      <TableCell className="pl-4 font-bold uppercase">{item.name}</TableCell>
                      <TableCell className="text-center font-black">{item.quantity} PCS</TableCell>
                      <TableCell className="text-right pr-4 font-black">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <div className="flex justify-end">
              <div className="bg-white p-5 rounded-2xl border flex gap-8 items-center shadow-sm">
                <span className="text-xs font-black uppercase">Grand Total</span>
                <span className="text-xl font-black text-primary">Rp {selectedTrx?.total?.toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-white border-t"><Button variant="outline" className="w-full rounded-xl font-bold h-12" onClick={() => setSelectedTrx(null)}>TUTUP</Button></DialogFooter>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
        </DialogContent>
      </Dialog>
    </div>
  );
}
