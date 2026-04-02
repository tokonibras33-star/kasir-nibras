
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary">Transaksi Toko B</h1>
          <p className="text-muted-foreground text-sm">Monitoring riwayat penjualan cabang Toko B.</p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="destructive" 
            className="h-10 rounded-xl font-bold gap-2" 
            disabled={filtered.length === 0}
            onClick={handleDeleteFiltered}
          >
            <Trash2 className="h-4 w-4" /> HAPUS FILTERED
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 rounded-xl font-bold"><Download className="h-4 w-4 mr-2" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer font-medium"><FileText className="h-4 w-4 mr-2 text-rose-600" /> PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border">
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button 
            onClick={() => setFilterMode("daily")}
            className={cn("px-4 py-2 text-xs font-black rounded-lg transition-all", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800")}
          >
            HARIAN
          </button>
          <button 
            onClick={() => setFilterMode("monthly")}
            className={cn("px-4 py-2 text-xs font-black rounded-lg transition-all", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800")}
          >
            BULANAN
          </button>
        </div>

        <div className="flex-1 flex items-center gap-2 w-full">
          {filterMode === "daily" ? (
            <div className="relative flex-1 max-w-xs">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="pl-10 h-10 rounded-xl bg-slate-50 border-none font-bold" />
            </div>
          ) : (
            <div className="relative flex-1 max-w-xs">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="pl-10 h-10 rounded-xl bg-slate-50 border-none font-bold" />
            </div>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari ID atau Nama..." className="pl-10 h-10 rounded-xl bg-slate-50 border-none" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="soft-shadow border-none bg-primary text-white rounded-3xl">
          <CardHeader className="p-5">
            <p className="text-[10px] uppercase font-black opacity-70 tracking-widest">Total Omzet</p>
            <CardTitle className="text-2xl font-black">Rp {totalSales.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="soft-shadow border-none bg-blue-600 text-white rounded-3xl">
          <CardHeader className="p-5">
            <p className="text-[10px] uppercase font-black opacity-70 tracking-widest">Jumlah Transaksi</p>
            <CardTitle className="text-2xl font-black">{history.length} TRX</CardTitle>
          </CardHeader>
        </Card>
        <Card className="soft-shadow border-none bg-emerald-600 text-white rounded-3xl">
          <CardHeader className="p-5">
            <p className="text-[10px] uppercase font-black opacity-70 tracking-widest">Rata-rata Penjualan</p>
            <CardTitle className="text-2xl font-black">Rp {avgTicket.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="soft-shadow border-none overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] font-black uppercase border-none">
                <TableHead className="pl-6">ID TRX</TableHead>
                <TableHead>Waktu</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((trx) => (
                <TableRow key={trx.id} className="hover:bg-muted/20 border-b border-muted/50 transition-colors">
                  <TableCell className="pl-6 font-bold text-primary">{trx.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{trx.date?.toDate().toLocaleString('id-ID') || "-"}</TableCell>
                  <TableCell>
                    <p className="font-bold text-sm uppercase">{trx.customerName || "UMUM"}</p>
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{trx.customerType || "UMUM"}</p>
                  </TableCell>
                  <TableCell className="text-right font-black">Rp {(trx.total || 0).toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("text-[9px] font-black border-none", trx.status === 'DP' ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>
                      {trx.status === 'DP' ? 'DP / BELUM LUNAS' : 'LUNAS'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-xl hover:bg-primary/10" onClick={() => setSelectedTrx(trx)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic">Tidak ada transaksi ditemukan.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* DETAIL DIALOG */}
      <Dialog open={!!selectedTrx} onOpenChange={o => !o && setSelectedTrx(null)}>
        <DialogContent className="max-w-3xl rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-primary text-white shrink-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Rincian Transaksi</p>
                <DialogTitle className="text-3xl font-black tracking-tighter uppercase">{selectedTrx?.id}</DialogTitle>
                <p className="text-xs font-bold opacity-80 mt-1">{selectedTrx?.date?.toDate().toLocaleString('id-ID')}</p>
              </div>
              <Badge className={cn("text-[10px] font-black px-4 py-1.5 rounded-full border-none", selectedTrx?.status === 'DP' ? "bg-orange-500 text-white" : "bg-white text-primary")}>
                {selectedTrx?.status === 'DP' ? 'DP / BELUM LUNAS' : 'LUNAS / SELESAI'}
              </Badge>
            </div>
          </DialogHeader>

          <div className="p-8 space-y-8 overflow-y-auto max-h-[60vh] bg-slate-50/50">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-primary/10 p-3 rounded-2xl"><User className="h-5 w-5 text-primary" /></div>
                <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-0.5">Nama Customer</p><p className="text-sm font-black uppercase">{selectedTrx?.customerName || "UMUM"}</p></div>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-blue-50 p-3 rounded-2xl"><CreditCard className="h-5 w-5 text-blue-600" /></div>
                <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-0.5">Jenis Pelanggan</p><p className="text-sm font-black uppercase">{selectedTrx?.customerType || "UMUM"}</p></div>
              </div>
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4">
                <div className="bg-emerald-50 p-3 rounded-2xl"><FileText className="h-5 w-5 text-emerald-600" /></div>
                <div><p className="text-[9px] font-black text-muted-foreground uppercase mb-0.5">No. Telepon</p><p className="text-sm font-black uppercase">{selectedTrx?.customerPhone || "-"}</p></div>
              </div>
            </div>

            {/* Items Table */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-2"><Package className="h-4 w-4 text-primary" /><h3 className="text-xs font-black uppercase tracking-widest">Daftar Produk</h3></div>
              <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
                <Table>
                  <TableHeader className="bg-slate-50 border-none">
                    <TableRow className="text-[9px] font-black uppercase border-none">
                      <TableHead className="pl-6">Produk</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Harga Satuan</TableHead>
                      <TableHead className="text-right pr-6">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTrx?.items?.map((item: any, i: number) => (
                      <TableRow key={i} className="border-b border-slate-50 last:border-none">
                        <TableCell className="pl-6">
                          <p className="font-bold text-xs uppercase leading-tight">{item.name}</p>
                          <p className="text-[9px] text-muted-foreground uppercase">{item.color} | {item.size}</p>
                        </TableCell>
                        <TableCell className="text-center font-black text-xs">{item.quantity} PCS</TableCell>
                        <TableCell className="text-right text-xs font-medium">Rp {item.price.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right pr-6 font-black text-xs">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </div>

            {/* Financial Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Rincian Potongan</h3>
                <div className="space-y-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between text-xs"><span>Potongan Toko (%)</span><span className="font-bold text-rose-600">-Rp {(selectedTrx?.storeDiscount || 0).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-xs"><span>Potongan Member</span><span className="font-bold text-rose-600">-Rp {(selectedTrx?.memberDiscount || 0).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-xs"><span>Potongan Agen</span><span className="font-bold text-rose-600">-Rp {(selectedTrx?.agentDiscount || 0).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-xs"><span>Potongan Voucher</span><span className="font-bold text-rose-600">-Rp {(selectedTrx?.voucherDiscount || 0).toLocaleString('id-ID')}</span></div>
                  <div className="pt-2 border-t border-dashed mt-2 flex justify-between text-xs font-black"><span>Total Seluruh Potongan</span><span className="text-rose-600">-Rp {(selectedTrx?.totalDiscount || 0).toLocaleString('id-ID')}</span></div>
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2">Metode & Status</h3>
                <div className="space-y-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between text-xs"><span>Subtotal (Harga Label)</span><span className="font-bold">Rp {(selectedTrx?.subtotalLabel || 0).toLocaleString('id-ID')}</span></div>
                  <div className="flex justify-between text-xs"><span>Metode Bayar</span><Badge className="bg-blue-50 text-blue-700 border-none font-black text-[9px] px-3">{selectedTrx?.paymentMethod || "CASH"}</Badge></div>
                  <div className="flex justify-between text-xs"><span>Sudah Dibayar</span><span className="font-black text-emerald-600">Rp {(selectedTrx?.paidAmount || 0).toLocaleString('id-ID')}</span></div>
                  {selectedTrx?.status === 'DP' && <div className="flex justify-between text-xs"><span>Sisa Pelunasan</span><span className="font-black text-orange-600">Rp {(selectedTrx?.remainingAmount || 0).toLocaleString('id-ID')}</span></div>}
                  <div className="pt-2 border-t-2 border-primary mt-2 flex justify-between items-center">
                    <span className="text-xs font-black uppercase">Grand Total</span>
                    <span className="text-xl font-black text-primary">Rp {(selectedTrx?.total || 0).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-white border-t shrink-0">
            <Button variant="outline" className="w-full h-12 rounded-2xl font-black uppercase text-xs tracking-widest" onClick={() => setSelectedTrx(null)}>Tutup Rincian</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
