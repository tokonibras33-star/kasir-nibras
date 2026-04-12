
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, FileSpreadsheet, FileText, Calendar, Filter, Store, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, Timestamp, orderBy } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function SalesReportPage() {
  const db = useFirestore();
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [storeFilter, setStoreFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Build Queries for each store
  const getQuery = (storeId: string) => {
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

  const qA = useMemoFirebase(() => getQuery("TOKO_A"), [db, filterMode, selectedDate, selectedMonth]);
  const qB = useMemoFirebase(() => getQuery("TOKO_B"), [db, filterMode, selectedDate, selectedMonth]);
  const qC = useMemoFirebase(() => getQuery("TOKO_C"), [db, filterMode, selectedDate, selectedMonth]);

  const { data: trxKWT } = useCollection<any>(qA);
  const { data: trxIND } = useCollection<any>(qB);
  const { data: trxGDM } = useCollection<any>(qC);

  const allTransactions = useMemo(() => {
    const list: any[] = [];
    if (storeFilter === "ALL" || storeFilter === "TOKO_A") (trxKWT || []).forEach(t => list.push({ ...t, storeName: "NHS KWT" }));
    if (storeFilter === "ALL" || storeFilter === "TOKO_B") (trxIND || []).forEach(t => list.push({ ...t, storeName: "IND CO" }));
    if (storeFilter === "ALL" || storeFilter === "TOKO_C") (trxGDM || []).forEach(t => list.push({ ...t, storeName: "NHS GDM" }));
    
    return list.sort((a, b) => (b.date?.toDate()?.getTime() || 0) - (a.date?.toDate()?.getTime() || 0));
  }, [trxKWT, trxIND, trxGDM, storeFilter]);

  // Flatten Transactions into Items for reporting
  const flattenedItems = useMemo(() => {
    const items: any[] = [];
    allTransactions.forEach(trx => {
      (trx.items || []).forEach((item: any) => {
        const itemTotal = (item.price || 0) * (item.quantity || 0);
        const itemBuyTotal = (item.buyPrice || 0) * (item.quantity || 0);
        const margin = itemTotal - itemBuyTotal;
        
        items.push({
          date: trx.date?.toDate() ? format(trx.date.toDate(), "dd/MM/yyyy HH:mm") : "-",
          trxId: trx.id,
          storeName: trx.storeName,
          customer: trx.customerName || "UMUM",
          itemName: item.name,
          size: item.size,
          color: item.color,
          qty: item.quantity,
          sellPrice: item.price,
          total: itemTotal,
          buyPrice: item.buyPrice || 0,
          margin: margin,
          payment: trx.paymentMethod || "CASH"
        });
      });
    });

    return items.filter(i => 
      i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.trxId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allTransactions, searchTerm]);

  // Summaries
  const totals = useMemo(() => {
    return flattenedItems.reduce((acc, i) => {
      acc.qty += i.qty;
      acc.total += i.total;
      acc.margin += i.margin;
      return acc;
    }, { qty: 0, total: 0, margin: 0 });
  }, [flattenedItems]);

  const handleExportExcel = () => {
    if (flattenedItems.length === 0) return;
    const headers = ["Tanggal", "No Transaksi", "Cabang", "Customer", "Nama Barang", "Size", "Warna", "Qty", "Harga Satuan", "Total", "Harga Beli", "Margin", "Metode Bayar"];
    const data = flattenedItems.map(i => [
      i.date, i.trxId, i.storeName, i.customer, i.itemName, i.size, i.color, i.qty, i.sellPrice, i.total, i.buyPrice, i.margin, i.payment
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Penjualan");
    XLSX.writeFile(wb, `laporan-penjualan-${format(new Date(), "yyyyMMdd")}.xlsx`);
    toast({ title: "Excel Berhasil Diunduh" });
  };

  const handleExportPDF = () => {
    if (flattenedItems.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    doc.text("Laporan Penjualan Detail - Nibras House", 148, 10, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Periode: ${filterMode === 'daily' ? selectedDate : selectedMonth} | Cabang: ${storeFilter}`, 148, 16, { align: "center" });

    const tableData = flattenedItems.map(i => [
      i.date, i.trxId, i.itemName, i.size, i.qty, 
      `Rp ${i.sellPrice.toLocaleString('id-ID')}`, 
      `Rp ${i.total.toLocaleString('id-ID')}`, 
      i.payment,
      `Rp ${i.buyPrice.toLocaleString('id-ID')}`,
      `Rp ${i.margin.toLocaleString('id-ID')}`
    ]);

    (doc as any).autoTable({
      head: [['Tanggal', 'No Trx', 'Nama Barang', 'Size', 'Qty', 'H. Jual', 'Total', 'Bayar', 'H. Beli', 'Margin']],
      body: tableData,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [31, 122, 99], fontSize: 8 },
      styles: { fontSize: 7 }
    });

    doc.save(`laporan-penjualan-${format(new Date(), "yyyyMMdd")}.pdf`);
    toast({ title: "PDF Berhasil Diunduh" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary uppercase">Laporan Penjualan Detail</h1>
          <p className="text-muted-foreground text-sm">Monitoring profitibilitas dan rincian transaksi harian/bulanan.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportExcel} className="h-10 font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <FileSpreadsheet className="h-4 w-4 mr-2" /> EXCEL
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="h-10 font-bold border-rose-200 text-rose-700 hover:bg-rose-50">
            <FileText className="h-4 w-4 mr-2" /> PDF A4
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white p-5 rounded-3xl soft-shadow border">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Jenis Laporan</Label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>HARIAN</button>
            <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>BULANAN</button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Pilih Waktu</Label>
          {filterMode === "daily" ? (
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
          ) : (
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold" />
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cabang Toko</Label>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL">SEMUA CABANG</SelectItem>
              <SelectItem value="TOKO_A">NHS KWT</SelectItem>
              <SelectItem value="TOKO_B">IND CO</SelectItem>
              <SelectItem value="TOKO_C">NHS GDM</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cari Transaksi/Barang</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Ketik sesuatu..." className="pl-10 h-11 rounded-xl bg-slate-50 border-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none soft-shadow bg-primary text-white rounded-[2rem]">
          <CardHeader className="p-6">
            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Total Omzet</p>
            <CardTitle className="text-2xl font-black">Rp {totals.total.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none soft-shadow bg-emerald-600 text-white rounded-[2rem]">
          <CardHeader className="p-6">
            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Total Margin (Laba Kotor)</p>
            <CardTitle className="text-2xl font-black">Rp {totals.margin.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none soft-shadow bg-blue-600 text-white rounded-[2rem]">
          <CardHeader className="p-6">
            <p className="text-[10px] font-black uppercase opacity-70 tracking-widest mb-1">Total Item Terjual</p>
            <CardTitle className="text-2xl font-black">{totals.qty} PCS</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-none soft-shadow rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="text-[10px] font-black uppercase">
                  <TableHead className="pl-6">Tanggal</TableHead>
                  <TableHead>No Trx</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead className="text-center">Size</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Harga Satuan</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Harga Beli</TableHead>
                  <TableHead className="text-right pr-6">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedItems.length > 0 ? flattenedItems.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/30 border-b border-muted/50 text-[11px]">
                    <TableCell className="pl-6 whitespace-nowrap">{item.date}</TableCell>
                    <TableCell className="font-mono font-bold text-primary">{item.trxId}</TableCell>
                    <TableCell>
                      <p className="font-bold uppercase leading-tight">{item.itemName}</p>
                      <p className="text-[9px] text-muted-foreground">{item.storeName} | {item.color}</p>
                    </TableCell>
                    <TableCell className="text-center font-black">{item.size}</TableCell>
                    <TableCell className="text-center font-black">{item.qty}</TableCell>
                    <TableCell className="text-right">Rp {item.sellPrice.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-bold">Rp {item.total.toLocaleString('id-ID')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] font-black border-none bg-slate-100">{item.payment}</Badge></TableCell>
                    <TableCell className="text-right opacity-60">Rp {item.buyPrice.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right pr-6 font-black text-emerald-600">Rp {item.margin.toLocaleString('id-ID')}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={10} className="h-48 text-center text-muted-foreground italic">Tidak ada data penjualan pada periode ini.</TableCell>
                  </TableRow>
                )}
              </TableBody>
              {flattenedItems.length > 0 && (
                <TableFooter className="bg-slate-50/80">
                  <TableRow className="font-black uppercase text-[10px]">
                    <TableCell colSpan={4} className="pl-6 py-4">Total Keseluruhan</TableCell>
                    <TableCell className="text-center text-primary text-sm">{totals.qty}</TableCell>
                    <TableCell />
                    <TableCell className="text-right text-primary text-sm">Rp {totals.total.toLocaleString('id-ID')}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right pr-6 text-emerald-700 text-sm">Rp {totals.margin.toLocaleString('id-ID')}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
