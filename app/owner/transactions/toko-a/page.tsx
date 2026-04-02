
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, Eye, FileText, Calendar, Filter, Trash2 } from "lucide-react";
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

export default function TransactionsTokoAPage() {
  const db = useFirestore();
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedTrx, setSelectedTrx] = useState<any>(null);

  const trxQuery = useMemoFirebase(() => {
    let q = collection(db, "stores", "TOKO_A", "transactions");
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

  const totalSales = useMemo(() => history.reduce((sum, trx) => sum + (trx.total || 0), 0), [history]);
  const avgTicket = history.length > 0 ? totalSales / history.length : 0;

  const filtered = useMemo(() => history.filter(trx => 
    (trx.id || "").toLowerCase().includes(search.toLowerCase()) ||
    (trx.customerName || "").toLowerCase().includes(search.toLowerCase())
  ), [history, search]);

  const handleDeleteSingle = (trxId: string) => {
    if (!trxId) return;
    if (confirm(`Hapus permanen transaksi ${trxId}?`)) {
      deleteDocumentNonBlocking(doc(db, "stores", "TOKO_A", "transactions", trxId));
      toast({ title: "Terhapus", description: "Data berhasil dihapus." });
    }
  };

  const handleDeleteFiltered = () => {
    if (filtered.length === 0) return;
    if (confirm(`HAPUS PERMANEN SEMUA (${filtered.length}) transaksi yang tampil?`)) {
      filtered.forEach(trx => {
        deleteDocumentNonBlocking(doc(db, "stores", "TOKO_A", "transactions", trx.id));
      });
      toast({ title: "Berhasil", description: "Penghapusan sedang diproses." });
    }
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text("Laporan Transaksi Toko A - Nibras House", 105, 10, { align: "center" });
    const tableData = filtered.map(trx => [trx.id, trx.date?.toDate().toLocaleString('id-ID'), trx.customerName || "UMUM", `Rp ${trx.total?.toLocaleString('id-ID')}`, trx.status]);
    (docPdf as any).autoTable({ head: [['ID', 'Waktu', 'Customer', 'Total', 'Status']], body: tableData, startY: 20 });
    docPdf.save(`trx-toko-a-${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary">Transaksi Toko A</h1>
          <p className="text-muted-foreground text-sm">Manajemen riwayat penjualan Cabang A.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" className="h-10 font-bold"><Download className="h-4 w-4 mr-2" /> Export</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end"><DropdownMenuItem onClick={exportToPDF} className="cursor-pointer"><FileText className="h-4 w-4 mr-2 text-rose-600" /> PDF</DropdownMenuItem></DropdownMenuContent>
        </DropdownMenu>
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
          
          <Button 
            variant="destructive" 
            onClick={handleDeleteFiltered} 
            disabled={filtered.length === 0} 
            className="h-10 rounded-xl font-black gap-2 px-4 shrink-0"
          >
            <Trash2 className="h-4 w-4" /> HAPUS TRANSAKSI
          </Button>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari ID atau Nama..." className="pl-10 h-10 rounded-xl bg-slate-50 border-none" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-primary text-white rounded-3xl border-none"><CardHeader className="p-5"><p className="text-[10px] uppercase font-black opacity-70">Total Omzet</p><CardTitle className="text-2xl font-black">Rp {totalSales.toLocaleString('id-ID')}</CardTitle></CardHeader></Card>
        <Card className="bg-blue-600 text-white rounded-3xl border-none"><CardHeader className="p-5"><p className="text-[10px] uppercase font-black opacity-70">Transaksi</p><CardTitle className="text-2xl font-black">{history.length} TRX</CardTitle></CardHeader></Card>
        <Card className="bg-emerald-600 text-white rounded-3xl border-none"><CardHeader className="p-5"><p className="text-[10px] uppercase font-black opacity-70">Rata-rata</p><CardTitle className="text-2xl font-black">Rp {avgTicket.toLocaleString('id-ID')}</CardTitle></CardHeader></Card>
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
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("text-[9px] font-black border-none", trx.status === 'DP' ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>
                      {trx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSelectedTrx(trx)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteSingle(trx.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic">Tidak ada data ditemukan.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedTrx} onOpenChange={o => !o && setSelectedTrx(null)}>
        <DialogContent className="max-w-3xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-primary text-white"><DialogTitle className="text-2xl font-black uppercase">{selectedTrx?.id}</DialogTitle><p className="text-xs opacity-80">{selectedTrx?.date?.toDate().toLocaleString('id-ID')}</p></DialogHeader>
          <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50/50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-[9px] font-black text-muted-foreground uppercase">Customer</p><p className="text-sm font-black uppercase">{selectedTrx?.customerName || "UMUM"}</p></div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-[9px] font-black text-muted-foreground uppercase">Tipe Pelanggan</p><p className="text-sm font-black uppercase">{selectedTrx?.customerType || "UMUM"}</p></div>
              <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-[9px] font-black text-muted-foreground uppercase">Nomor WhatsApp</p><p className="text-sm font-black">{selectedTrx?.customerPhone || "-"}</p></div>
            </div>
            
            <Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white">
              <Table>
                <TableHeader className="bg-slate-50"><TableRow className="text-[9px] font-black uppercase"><TableHead className="pl-4">Produk</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right pr-4">Subtotal</TableHead></TableRow></TableHeader>
                <TableBody>
                  {selectedTrx?.items?.map((item: any, i: number) => (
                    <TableRow key={i} className="text-xs border-b last:border-none">
                      <TableCell className="pl-4 font-bold uppercase">{item.name}<br/><span className="text-[10px] text-muted-foreground font-normal">{item.color} | {item.size}</span></TableCell>
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
          <DialogFooter className="p-4 bg-white border-t"><Button variant="outline" className="w-full rounded-xl font-bold" onClick={() => setSelectedTrx(null)}>TUTUP RINCIAN</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
