
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, Eye, FileText, Calendar, Filter, Trash2, Store, FileSpreadsheet, Banknote, CreditCard, QrCode } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, where, Timestamp, doc } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function TransactionsAllStoresPage() {
  const db = useFirestore();
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedTrx, setSelectedTrx] = useState<any>(null);

  const buildQuery = (storeId: string) => {
    let q = collection(db, "stores", storeId, "transactions");
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
  };

  const qA = useMemoFirebase(() => buildQuery("TOKO_A"), [db, filterMode, selectedDate, selectedMonth]);
  const qB = useMemoFirebase(() => buildQuery("TOKO_B"), [db, filterMode, selectedDate, selectedMonth]);
  const qC = useMemoFirebase(() => buildQuery("TOKO_C"), [db, filterMode, selectedDate, selectedMonth]);

  const { data: hA } = useCollection<any>(qA);
  const { data: hB } = useCollection<any>(qB);
  const { data: hC } = useCollection<any>(qC);

  const history = useMemo(() => {
    const combined = [
      ...(hA || []).map(t => ({ ...t, storeId: 'TOKO_A' })),
      ...(hB || []).map(t => ({ ...t, storeId: 'TOKO_B' })),
      ...(hC || []).map(t => ({ ...t, storeId: 'TOKO_C' })),
    ];
    return combined.sort((a, b) => {
      const dateA = a.date?.toDate?.()?.getTime() || 0;
      const dateB = b.date?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    });
  }, [hA, hB, hC]);

  const filtered = useMemo(() => history.filter(trx => 
    (trx.id || "").toLowerCase().includes(search.toLowerCase()) ||
    (trx.customerName || "").toLowerCase().includes(search.toLowerCase())
  ), [history, search]);

  const stats = useMemo(() => {
    return filtered.reduce((acc, trx) => {
      acc.total += (trx.total || 0);
      const method = trx.paymentMethod || "CASH";
      const paid = trx.paidAmount || 0;

      if (trx.paymentBreakdown) {
        acc.cash += (trx.paymentBreakdown.cash || 0);
        if (trx.paymentBreakdown.otherMethod === "TRANSFER") acc.transfer += (trx.paymentBreakdown.other || 0);
        if (trx.paymentBreakdown.otherMethod === "QRIS") acc.qris += (trx.paymentBreakdown.other || 0);
      } else {
        if (method === "CASH") acc.cash += paid;
        else if (method === "TRANSFER") acc.transfer += paid;
        else if (method === "QRIS") acc.qris += paid;
      }
      return acc;
    }, { total: 0, cash: 0, transfer: 0, qris: 0 });
  }, [filtered]);

  const avgTicket = filtered.length > 0 ? stats.total / filtered.length : 0;

  const handleDeleteSingle = (trx: any) => {
    if (!trx.id) return;
    const storeName = trx.storeId === 'TOKO_A' ? 'NHS KWT' : trx.storeId === 'TOKO_B' ? 'IND CO' : 'NHS GDM';
    if (confirm(`Hapus permanen transaksi ${trx.id} dari ${storeName}?`)) {
      deleteDocumentNonBlocking(doc(db, "stores", trx.storeId, "transactions", trx.id));
      toast({ title: "Terhapus", description: "Data berhasil dihapus." });
    }
  };

  const handleDeleteFiltered = () => {
    if (filtered.length === 0) return;
    if (confirm(`HAPUS PERMANEN SEMUA (${filtered.length}) transaksi dari SEMUA CABANG yang tampil?`)) {
      filtered.forEach(trx => {
        deleteDocumentNonBlocking(doc(db, "stores", trx.storeId, "transactions", trx.id));
      });
      toast({ title: "Berhasil", description: "Proses penghapusan massal dijalankan." });
    }
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text("Laporan Transaksi Gabungan - Nibras House", 105, 10, { align: "center" });
    const tableData = filtered.map(trx => [
      trx.id, 
      trx.storeId === 'TOKO_A' ? 'NHS KWT' : trx.storeId === 'TOKO_B' ? 'IND CO' : 'NHS GDM',
      trx.date?.toDate().toLocaleString('id-ID'), 
      trx.customerName || "UMUM", 
      `Rp ${trx.total?.toLocaleString('id-ID')}`
    ]);
    (docPdf as any).autoTable({ head: [['ID', 'Cabang', 'Waktu', 'Customer', 'Total']], body: tableData, startY: 20 });
    docPdf.save(`trx-gabungan-${selectedDate}.pdf`);
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) return;
    const headers = ["ID TRX", "Cabang", "Tanggal", "Customer", "Total", "Status"];
    const data = filtered.map(t => [
      t.id,
      t.storeId === 'TOKO_A' ? 'NHS KWT' : t.storeId === 'TOKO_B' ? 'IND CO' : 'NHS GDM',
      t.date?.toDate().toLocaleString('id-ID'),
      t.customerName || "UMUM",
      t.total,
      t.status
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
    XLSX.writeFile(wb, `transaksi-semua-toko-${selectedDate}.xlsx`);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-primary">Transaksi Semua Toko</h1>
          <p className="text-muted-foreground text-[10px] md:text-sm">Konsolidasi riwayat penjualan (NHS KWT, IND CO, NHS GDM).</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button variant="outline" size="sm" onClick={exportToPDF} className="h-8 md:h-10 text-[10px] md:text-sm font-bold gap-1 md:gap-2 px-3">
            <FileText className="h-3 w-3 md:h-4 md:w-4 text-rose-600" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="h-8 md:h-10 text-[10px] md:text-sm font-bold gap-1 md:gap-2 px-3">
            <Download className="h-3 w-3 md:h-4 md:w-4 text-emerald-600" /> EXCEL
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:gap-4 bg-white p-3 md:p-4 rounded-2xl shadow-sm border">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="grid grid-cols-2 md:flex gap-2 w-full md:w-auto shrink-0">
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setFilterMode("daily")} className={cn("flex-1 px-3 md:px-4 py-2 text-[10px] md:text-xs font-black rounded-lg transition-all", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>HARIAN</button>
              <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 px-3 md:px-4 py-2 text-[10px] md:text-xs font-black rounded-lg transition-all", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>BULANAN</button>
            </div>
            <div className="flex-1">
              {filterMode === "daily" ? (
                <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full md:w-44 h-10 rounded-xl bg-slate-50 border-none font-bold text-xs" />
              ) : (
                <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full md:w-44 h-10 rounded-xl bg-slate-50 border-none font-bold text-xs" />
              )}
            </div>
          </div>
          <div className="hidden md:block h-8 w-px bg-slate-100" />
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari ID atau Nama..." className="pl-10 h-10 rounded-xl bg-slate-50 border-none w-full text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="destructive" size="sm" onClick={handleDeleteFiltered} disabled={filtered.length === 0} className="rounded-xl font-black gap-2 px-4 h-9 text-xs">
            <Trash2 className="h-3.5 w-3.5" /> HAPUS TRANSAKSI
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-primary text-white rounded-3xl border-none shadow-sm"><CardHeader className="p-4 md:p-5"><p className="text-[9px] md:text-[10px] uppercase font-black opacity-70">Omzet Gabungan</p><CardTitle className="text-xl md:text-2xl font-black">Rp {stats.total.toLocaleString('id-ID')}</CardTitle></CardHeader></Card>
        <Card className="bg-blue-600 text-white rounded-3xl border-none shadow-sm"><CardHeader className="p-4 md:p-5"><p className="text-[9px] md:text-[10px] uppercase font-black opacity-70">Total Transaksi</p><CardTitle className="text-xl md:text-2xl font-black">{filtered.length} TRX</CardTitle></CardHeader></Card>
        <Card className="bg-emerald-600 text-white rounded-3xl border-none shadow-sm"><CardHeader className="p-4 md:p-5"><p className="text-[9px] md:text-[10px] uppercase font-black opacity-70">Rata-rata Penjualan</p><CardTitle className="text-xl md:text-2xl font-black">Rp {avgTicket.toLocaleString('id-ID')}</CardTitle></CardHeader></Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-white rounded-3xl border border-slate-100 soft-shadow flex flex-row items-center p-4 gap-4">
          <div className="bg-emerald-50 p-2 rounded-xl"><Banknote className="h-5 w-5 text-emerald-600" /></div>
          <div><p className="text-[9px] font-black uppercase text-slate-400">Total Cash</p><p className="text-sm font-black text-emerald-700">Rp {stats.cash.toLocaleString('id-ID')}</p></div>
        </Card>
        <Card className="bg-white rounded-3xl border border-slate-100 soft-shadow flex flex-row items-center p-4 gap-4">
          <div className="bg-blue-50 p-2 rounded-xl"><CreditCard className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-[9px] font-black uppercase text-slate-400">Total Transfer</p><p className="text-sm font-black text-blue-700">Rp {stats.transfer.toLocaleString('id-ID')}</p></div>
        </Card>
        <Card className="bg-white rounded-3xl border border-slate-100 soft-shadow flex flex-row items-center p-4 gap-4">
          <div className="bg-purple-50 p-2 rounded-xl"><QrCode className="h-5 w-5 text-purple-600" /></div>
          <div><p className="text-[9px] font-black uppercase text-slate-400">Total QRIS</p><p className="text-sm font-black text-purple-700">Rp {stats.qris.toLocaleString('id-ID')}</p></div>
        </Card>
      </div>

      <Card className="soft-shadow border-none rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50"><TableRow className="text-[10px] font-black uppercase"><TableHead className="pl-6">ID TRX</TableHead><TableHead>Cabang</TableHead><TableHead className="hidden md:table-cell">Waktu</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-center">Status</TableHead><TableHead className="text-right pr-6">Aksi</TableHead></TableRow></TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((trx) => (
                  <TableRow key={trx.id} className="hover:bg-muted/20 border-b border-muted/50 transition-colors">
                    <TableCell className="pl-6 font-bold text-primary text-[11px] md:text-sm">{trx.id}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[8px] md:text-[9px] font-black border-none bg-slate-100 text-slate-700">
                        {trx.storeId === 'TOKO_A' ? 'NHS KWT' : trx.storeId === 'TOKO_B' ? 'IND CO' : 'NHS GDM'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[10px] md:text-xs hidden md:table-cell">{trx.date?.toDate().toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-[11px] md:text-sm font-bold uppercase truncate max-w-[80px] md:max-w-none">{trx.customerName || "UMUM"}</TableCell>
                    <TableCell className="text-right font-black text-[11px] md:text-sm">Rp {trx.total?.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[8px] md:text-[9px] font-black border-none", trx.status === 'DP' ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>
                        {trx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-primary" onClick={() => setSelectedTrx(trx)}><Eye className="h-3.5 w-3.5 md:h-4 md:w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSingle(trx)}><Trash2 className="h-3.5 w-3.5 md:h-4 md:w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : <TableRow><TableCell colSpan={7} className="h-40 text-center text-muted-foreground italic">Tidak ada data ditemukan untuk semua toko.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTrx} onOpenChange={o => !o && setSelectedTrx(null)}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 md:p-8 bg-primary text-white">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-xl md:text-2xl font-black uppercase">{selectedTrx?.id}</DialogTitle>
                <p className="text-[10px] md:text-xs opacity-80 mt-1">{selectedTrx?.date?.toDate().toLocaleString('id-ID')}</p>
              </div>
              <Badge className="bg-white text-primary border-none font-black px-3 md:px-4 text-[10px]">{selectedTrx?.storeId === 'TOKO_A' ? 'NHS KWT' : selectedTrx?.storeId === 'TOKO_B' ? 'IND CO' : 'NHS GDM'}</Badge>
            </div>
          </DialogHeader>
          <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50/50">
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
                    <TableRow key={i} className="text-[11px] border-b last:border-none">
                      <TableCell className="pl-4 font-bold uppercase">{item.name}<br/><span className="text-[9px] text-muted-foreground font-normal">{item.color} | {item.size}</span></TableCell>
                      <TableCell className="text-center font-black">{item.quantity} PCS</TableCell>
                      <TableCell className="text-right pr-4 font-black">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-2xl border space-y-2">
                <p className="text-[10px] font-black uppercase text-muted-foreground">Rincian Potongan</p>
                <div className="flex justify-between text-xs font-medium"><span>Total Potongan</span><span className="text-rose-600 font-bold">-Rp {(selectedTrx?.totalDiscount || 0).toLocaleString('id-ID')}</span></div>
              </div>
              <div className="bg-white p-5 rounded-2xl border flex items-center justify-between">
                <span className="text-xs font-black uppercase">Grand Total</span>
                <span className="text-xl font-black text-primary">Rp {(selectedTrx?.total || 0).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-white border-t"><Button variant="outline" className="w-full rounded-xl font-bold h-12" onClick={() => setSelectedTrx(null)}>TUTUP RINCIAN</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
