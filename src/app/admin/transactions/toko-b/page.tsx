
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, Eye, FileSpreadsheet, FileText, Calendar, Filter, User, Package, CreditCard, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from "@/firebase";
import { collection, query, orderBy, where, Timestamp, doc } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

export default function TransactionsTokoBPage() {
  const db = useFirestore();
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedTrx, setSelectedTrx] = useState<any>(null);

  const trxQuery = useMemoFirebase(() => {
    let q = collection(db, "stores", "TOKO_B", "transactions");
    
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
    trx.id.toLowerCase().includes(search.toLowerCase()) ||
    (trx.customerName || "").toLowerCase().includes(search.toLowerCase())
  ), [history, search]);

  const handleDeleteFiltered = () => {
    if (filtered.length === 0) return;
    const confirmMsg = filterMode === "daily" 
      ? `Hapus semua (${filtered.length}) transaksi pada tanggal ${selectedDate}? Tindakan ini permanen.`
      : `Hapus semua (${filtered.length}) transaksi pada bulan ${selectedMonth}? Tindakan ini permanen.`;
    
    if (confirm(confirmMsg)) {
      filtered.forEach(trx => {
        deleteDocumentNonBlocking(doc(db, "stores", "TOKO_B", "transactions", trx.id));
      });
      toast({ title: "Berhasil", description: `${filtered.length} transaksi telah dihapus.` });
    }
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text("Laporan Transaksi Toko B - Nibras House", 105, 10, { align: "center" });
    const tableData = filtered.map(trx => [
      trx.id,
      trx.date?.toDate().toLocaleString('id-ID') || "-",
      trx.customerName || "UMUM",
      `Rp ${(trx.total || 0).toLocaleString('id-ID')}`,
      trx.status === 'DP' ? 'BELUM LUNAS' : 'LUNAS'
    ]);
    (docPdf as any).autoTable({
      head: [['ID Transaksi', 'Waktu', 'Customer', 'Total', 'Status']],
      body: tableData,
      startY: 20
    });
    docPdf.save(`transaksi-toko-b-${filterMode}-${filterMode === 'daily' ? selectedDate : selectedMonth}.pdf`);
  };

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Branch Sales Log</p>
          <h1 className="text-3xl md:text-4xl font-serif text-neutral-900 tracking-tight">Transaksi IND CO (Toko B)</h1>
          <p className="text-neutral-500 text-sm mt-1">Monitoring riwayat penjualan cabang IND CO (Toko B).</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button 
            variant="destructive" 
            className="h-10 rounded-full px-5 font-bold text-xs gap-2 flex-1 sm:flex-none" 
            disabled={filtered.length === 0}
            onClick={handleDeleteFiltered}
          >
            <Trash2 className="h-4 w-4" /> HAPUS FILTERED
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 rounded-full px-5 font-bold text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none"><Download className="h-4 w-4 mr-2" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer font-medium"><FileText className="h-4 w-4 mr-2 text-[#C82368]" /> PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 bg-white p-4 rounded-3xl shadow-sm border border-neutral-200/70">
        <div className="flex bg-[#F5F3F0] p-1 rounded-full border border-neutral-200/70 shrink-0">
          <button 
            onClick={() => setFilterMode("daily")}
            className={cn("flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-full transition-all", filterMode === "daily" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}
          >
            HARIAN
          </button>
          <button 
            onClick={() => setFilterMode("monthly")}
            className={cn("flex-1 md:flex-none px-5 py-2 text-xs font-bold rounded-full transition-all", filterMode === "monthly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}
          >
            BULANAN
          </button>
        </div>

        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {filterMode === "daily" ? (
            <div className="relative flex-1 sm:max-w-xs">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="pl-11 h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-xs" />
            </div>
          ) : (
            <div className="relative flex-1 sm:max-w-xs">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="pl-11 h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-xs" />
            </div>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <Input placeholder="Cari ID atau Nama customer..." className="pl-11 h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border-none bg-neutral-950 text-white rounded-3xl">
          <CardHeader className="p-5 md:p-6">
            <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Total Omzet</p>
            <CardTitle className="text-2xl md:text-3xl font-serif">Rp {totalSales.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-sm border-none bg-[#C82368] text-white rounded-3xl">
          <CardHeader className="p-5 md:p-6">
            <p className="text-[10px] uppercase font-bold text-white/75 tracking-widest">Jumlah Transaksi</p>
            <CardTitle className="text-2xl md:text-3xl font-serif">{history.length} TRX</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-sm border border-neutral-200/70 bg-white text-neutral-900 rounded-3xl">
          <CardHeader className="p-5 md:p-6">
            <p className="text-[10px] uppercase font-bold text-neutral-400 tracking-widest">Rata-rata Penjualan</p>
            <CardTitle className="text-2xl md:text-3xl font-serif">Rp {avgTicket.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="shadow-sm border border-neutral-200/70 bg-white overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white">
                <TableRow className="text-[10px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                  <TableHead className="pl-6 text-neutral-300">ID TRX</TableHead>
                  <TableHead className="text-neutral-300">Waktu</TableHead>
                  <TableHead className="text-neutral-300">Customer</TableHead>
                  <TableHead className="text-right text-neutral-300">Total</TableHead>
                  <TableHead className="text-center text-neutral-300">Status</TableHead>
                  <TableHead className="text-right pr-6 text-neutral-300">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((trx) => (
                  <TableRow key={trx.id} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 transition-colors">
                    <TableCell className="pl-6 font-mono font-bold text-[#C82368] whitespace-nowrap">{trx.id}</TableCell>
                    <TableCell className="text-xs text-neutral-500 whitespace-nowrap">{trx.date?.toDate().toLocaleString('id-ID') || "-"}</TableCell>
                    <TableCell>
                      <p className="font-bold text-sm uppercase text-neutral-900">{trx.customerName || "UMUM"}</p>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold">{trx.customerType || "UMUM"}</p>
                    </TableCell>
                    <TableCell className="text-right font-bold text-neutral-900 whitespace-nowrap">Rp {(trx.total || 0).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={cn("text-[9px] font-bold rounded-full px-3 border-none", trx.status === 'DP' ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700")}>
                        {trx.status === 'DP' ? 'DP / BELUM LUNAS' : 'LUNAS'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-700 rounded-full hover:bg-neutral-100" onClick={() => setSelectedTrx(trx)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="h-48 text-center text-neutral-400 italic">Tidak ada transaksi ditemukan.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* DETAIL DIALOG */}
      <Dialog open={!!selectedTrx} onOpenChange={o => !o && setSelectedTrx(null)}>
        <DialogContent className="w-[95vw] max-w-3xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-5 md:p-7 bg-neutral-950 text-white shrink-0">
            <div className="flex flex-wrap justify-between items-start gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Rincian Transaksi</p>
                <DialogTitle className="text-2xl md:text-3xl font-serif tracking-tight uppercase">{selectedTrx?.id}</DialogTitle>
                <p className="text-xs font-medium text-neutral-400 mt-1">{selectedTrx?.date?.toDate().toLocaleString('id-ID')}</p>
              </div>
              <Badge className={cn("text-[10px] font-bold px-4 py-1.5 rounded-full border-none", selectedTrx?.status === 'DP' ? "bg-amber-500 text-white" : "bg-[#C82368] text-white")}>
                {selectedTrx?.status === 'DP' ? 'DP / BELUM LUNAS' : 'LUNAS / SELESAI'}
              </Badge>
            </div>
          </DialogHeader>

          <div className="p-5 md:p-8 space-y-6 overflow-y-auto max-h-[65vh] bg-[#F5F3F0]">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200/70 flex items-center gap-3">
                <div className="bg-[#C82368]/10 p-3 rounded-full"><User className="h-4 w-4 text-[#C82368]" /></div>
                <div><p className="text-[9px] font-bold text-neutral-400 uppercase mb-0.5">Nama Customer</p><p className="text-sm font-bold uppercase text-neutral-900">{selectedTrx?.customerName || "UMUM"}</p></div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200/70 flex items-center gap-3">
                <div className="bg-neutral-100 p-3 rounded-full"><CreditCard className="h-4 w-4 text-neutral-800" /></div>
                <div><p className="text-[9px] font-bold text-neutral-400 uppercase mb-0.5">Jenis Pelanggan</p><p className="text-sm font-bold uppercase text-neutral-900">{selectedTrx?.customerType || "UMUM"}</p></div>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200/70 flex items-center gap-3">
                <div className="bg-emerald-50 p-3 rounded-full"><FileText className="h-4 w-4 text-emerald-700" /></div>
                <div><p className="text-[9px] font-bold text-neutral-400 uppercase mb-0.5">No. Telepon</p><p className="text-sm font-bold uppercase text-neutral-900">{selectedTrx?.customerPhone || "-"}</p></div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1"><Package className="h-4 w-4 text-[#C82368]" /><h3 className="text-xs font-bold uppercase tracking-widest text-neutral-700">Daftar Produk</h3></div>
              <Card className="rounded-3xl border border-neutral-200/70 shadow-sm overflow-hidden bg-white">
                <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-neutral-950 text-white border-none">
                      <TableRow className="text-[9px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                        <TableHead className="pl-5 text-neutral-300">Produk</TableHead>
                        <TableHead className="text-center text-neutral-300">Qty</TableHead>
                        <TableHead className="text-right text-neutral-300">Harga Satuan</TableHead>
                        <TableHead className="text-right pr-5 text-neutral-300">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTrx?.items?.map((item: any, i: number) => (
                        <TableRow key={i} className="border-b border-neutral-100 last:border-none">
                          <TableCell className="pl-5">
                            <p className="font-bold text-xs uppercase leading-tight text-neutral-900">{item.name}</p>
                            <p className="text-[9px] text-neutral-400 uppercase">{item.color} | {item.size}</p>
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs">{item.quantity} PCS</TableCell>
                          <TableCell className="text-right text-xs font-medium whitespace-nowrap">Rp {item.price.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-right pr-5 font-bold text-xs whitespace-nowrap">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 px-1">Rincian Potongan</h3>
                <div className="space-y-2 bg-white p-5 rounded-3xl border border-neutral-200/70 shadow-sm">
                  <div className="flex justify-between text-xs"><span>Potongan Toko (%)</span><span className="font-bold text-rose-600">-Rp {(selectedTrx?.storeDiscount || 0).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-xs"><span>Potongan Member</span><span className="font-bold text-rose-600">-Rp {(selectedTrx?.memberDiscount || 0).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-xs"><span>Potongan Agen</span><span className="font-bold text-rose-600">-Rp {(selectedTrx?.agentDiscount || 0).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-xs"><span>Potongan Voucher</span><span className="font-bold text-rose-600">-Rp {(selectedTrx?.voucherDiscount || 0).toLocaleString('id-ID')}</span></div>
                  <div className="pt-2 border-t border-dashed border-neutral-200 mt-2 flex justify-between text-xs font-bold"><span>Total Seluruh Potongan</span><span className="text-rose-600">-Rp {(selectedTrx?.totalDiscount || 0).toLocaleString('id-ID')}</span></div>
                </div>
              </div>
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 px-1">Metode & Status</h3>
                <div className="space-y-2 bg-white p-5 rounded-3xl border border-neutral-200/70 shadow-sm">
                  <div className="flex justify-between text-xs"><span>Subtotal (Harga Label)</span><span className="font-bold">Rp {(selectedTrx?.subtotalLabel || 0).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-xs items-center"><span>Metode Bayar</span><Badge className="bg-neutral-100 text-neutral-800 border-none font-bold text-[9px] px-3 rounded-full">{selectedTrx?.paymentMethod || "CASH"}</Badge></div>
                  <div className="flex justify-between text-xs"><span>Sudah Dibayar</span><span className="font-bold text-emerald-700">Rp {(selectedTrx?.paidAmount || 0).toLocaleString('id-ID')}</span></div>
                  {selectedTrx?.status === 'DP' && <div className="flex justify-between text-xs"><span>Sisa Pelunasan</span><span className="font-bold text-amber-600">Rp {(selectedTrx?.remainingAmount || 0).toLocaleString('id-ID')}</span></div>}
                  <div className="pt-2 border-t border-neutral-900 mt-2 flex justify-between items-center">
                    <span className="text-xs font-bold uppercase">Grand Total</span>
                    <span className="text-xl font-serif font-bold text-[#C82368]">Rp {(selectedTrx?.total || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-5 bg-white border-t border-neutral-100 shrink-0">
            <Button className="w-full h-11 rounded-full bg-neutral-950 hover:bg-neutral-800 text-white font-bold uppercase text-xs tracking-widest" onClick={() => setSelectedTrx(null)}>Tutup Rincian</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
