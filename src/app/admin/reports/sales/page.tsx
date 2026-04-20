
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

const BRAND_DATABASE = [
  'Aden', 'AHSAN', 'Ainun', 'Ajwa', 'ALFASA', 'Alfira', 'Aqlan', 'AR', 'ARSELLE', 'ARUMY', 'AS MOESLEM', 'Aysila', 'Dafeena', 'DENIZER', 'Elzatta', 'EMILY DAILY', 'ETHICA', 'FeeFashion', 'Gabia', 'Ghiina', 'HIJABI OFFICIAL', 'Hunny Label', 'IMIDY', 'Journey', 'Kaen', 'KAMSA', 'Kazami', 'Keke', 'Latanza', 'LUBI', 'MALIHA', 'MOSLEM DAILY', 'Nadheera Luxury', 'NARARYA', 'Nata Id', 'NIARA', 'NIBRAS', 'NIRMALA', 'Non Branded', 'Poeti', 'Rabbani', 'Raisakey', 'Ratu Bilqis', 'RAYYA', 'Rivantie', 'SALVINA', 'SAV KIDS', 'Seply', 'Ss Hijab', 'SYIFA OFFICIAL', 'Urfimutiyaro', 'Yukio', 'ZAMEERA', 'Zz Homey'
];

const CATEGORY_DATABASE = [
  'Accesories', 'Atasan', 'Blouse', 'Bros', 'Celana', 'Ciput', 'Dompet', 'DRESS', 'GAMIS', 'GAMIS ANAK', 'Jilbab Instan', 'Jilbab Segi_4', 'Jilbab Segi_5', 'Jilbab Segi_6', 'Jilbab Segi_7', 'KOKO', 'KOKO ANAK', 'MIDI DRESS', 'Mukena', 'Mukena Anak', 'Oneset', 'Pashmina', 'Sandal', 'Sarung', 'Tas', 'Tunik'
];

export default function SalesReportPage() {
  const db = useFirestore();
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [storeFilter, setStoreFilter] = useState<string>("ALL");
  const [brandFilter, setBrandFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

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

  const flattenedItems = useMemo(() => {
    let items: any[] = [];
    allTransactions.forEach(trx => {
      (trx.items || []).forEach((item: any) => {
        const hargaSatuan = item.labelPrice || item.price;
        const hargaJualSatuan = item.price;
        
        const diskonJualNominal = (hargaSatuan - hargaJualSatuan) * (item.quantity || 0);
        const diskonJualPersen = hargaSatuan > 0 ? ((hargaSatuan - hargaJualSatuan) / hargaSatuan) * 100 : 0;

        const itemTotal = hargaJualSatuan * (item.quantity || 0);
        const itemBuyTotal = (item.buyPrice || 0) * (item.quantity || 0);
        const margin = itemTotal - itemBuyTotal;

        items.push({
          date: trx.date?.toDate() ? format(trx.date.toDate(), "dd/MM/yyyy HH:mm") : "-",
          trxId: trx.id,
          storeName: trx.storeName,
          customer: trx.customerName || "UMUM",
          itemName: item.name,
          brand: item.brand || '-',
          category: item.category || '-',
          size: item.size,
          color: item.color,
          qty: item.quantity,
          sellPrice: hargaSatuan,
          discount: diskonJualPersen,
          discountNominal: diskonJualNominal,
          total: itemTotal,
          buyPrice: item.buyPrice || 0,
          margin: margin,
          payment: trx.paymentMethod || "CASH",
        });
      });
    });

    if (brandFilter !== "ALL") {
      items = items.filter(i => i.brand === brandFilter);
    }
    if (categoryFilter !== "ALL") {
      items = items.filter(i => i.category === categoryFilter);
    }

    return items.filter(i => 
      i.itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      i.trxId.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allTransactions, searchTerm, brandFilter, categoryFilter]);

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
    const headers = ["Tanggal", "No Transaksi", "Cabang", "Customer", "Nama Barang", "Merk", "Kategori", "Size", "Warna", "Qty", "Harga Satuan", "Diskon Jual (%) ", "Total", "Harga Beli", "Margin", "Metode Bayar"];
    const data = flattenedItems.map(i => [
      i.date, i.trxId, i.storeName, i.customer, i.itemName, i.brand, i.category, i.size, i.color, i.qty, i.sellPrice, i.discount, i.total, i.buyPrice, i.margin, i.payment
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
      i.date, i.trxId, i.itemName, i.brand, i.category, i.size, i.qty, 
      `Rp ${i.sellPrice.toLocaleString('id-ID')}`,
      `${i.discount}%`,
      `Rp ${i.total.toLocaleString('id-ID')}`, 
      i.payment,
      `Rp ${i.buyPrice.toLocaleString('id-ID')}`,
      `Rp ${i.margin.toLocaleString('id-ID')}`
    ]);

    (doc as any).autoTable({
      head: [['Tanggal', 'No Trx', 'Nama Barang', 'Merk', 'Kategori', 'Size', 'Qty', 'H. Jual', 'Diskon','Total', 'Bayar', 'H. Beli', 'Margin']],
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

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 bg-white p-5 rounded-3xl soft-shadow border">
        <div className="grid grid-cols-2 lg:contents gap-4 lg:col-span-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Jenis Laporan</Label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-2 text-[9px] md:text-[10px] font-black rounded-lg transition-all", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>HARIAN</button>
                <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-2 text-[9px] md:text-[10px] font-black rounded-lg transition-all", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>BULANAN</button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Pilih Waktu</Label>
              {filterMode === "daily" ? (
                <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
              ) : (
                <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
              )}
            </div>
        </div>

        <div className="grid grid-cols-3 lg:contents gap-2 lg:col-span-3">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Merek</Label>
              <Select value={brandFilter} onValueChange={setBrandFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-[9px] md:text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl max-h-96">
                    <div className="p-2 sticky top-0 bg-white">
                      <Input
                        placeholder="Cari Merek..."
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="h-9"
                      />
                    </div>
                  <SelectItem value="ALL">SEMUA MEREK</SelectItem>
                  {BRAND_DATABASE.filter(brand => brand.toLowerCase().includes(brandSearch.toLowerCase())).map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Kategori</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-[9px] md:text-sm"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl max-h-96">
                    <div className="p-2 sticky top-0 bg-white">
                      <Input
                        placeholder="Cari Kategori..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="h-9"
                      />
                    </div>
                  <SelectItem value="ALL">SEMUA KATEGORI</SelectItem>
                  {CATEGORY_DATABASE.filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cabang</Label>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-[9px] md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">SEMUA</SelectItem>
                  <SelectItem value="TOKO_A">NHS KWT</SelectItem>
                  <SelectItem value="TOKO_B">IND CO</SelectItem>
                  <SelectItem value="TOKO_C">NHS GDM</SelectItem>
                </SelectContent>
              </Select>
            </div>
        </div>

        <div className="space-y-2 lg:col-span-1">
          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cari Transaksi</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="ID/Barang..." className="pl-10 h-11 rounded-xl bg-slate-50 border-none text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
        <Card className="border-none soft-shadow bg-primary text-white rounded-xl md:rounded-[2rem]">
          <CardHeader className="p-2 md:p-6">
            <p className="text-[7px] md:text-[10px] font-black uppercase opacity-70 tracking-widest mb-0.5 md:mb-1">Omzet</p>
            <CardTitle className="text-[10px] md:text-2xl font-black">Rp {totals.total.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none soft-shadow bg-emerald-600 text-white rounded-xl md:rounded-[2rem]">
          <CardHeader className="p-2 md:p-6">
            <p className="text-[7px] md:text-[10px] font-black uppercase opacity-70 tracking-widest mb-0.5 md:mb-1">Margin</p>
            <CardTitle className="text-[10px] md:text-2xl font-black">Rp {totals.margin.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none soft-shadow bg-blue-600 text-white rounded-xl md:rounded-[2rem]">
          <CardHeader className="p-2 md:p-6">
            <p className="text-[7px] md:text-[10px] font-black uppercase opacity-70 tracking-widest mb-0.5 md:mb-1">Item</p>
            <CardTitle className="text-[10px] md:text-2xl font-black">{totals.qty} PCS</CardTitle>
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
                  <TableHead>Merk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-center">Size</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Harga Satuan</TableHead>
                  <TableHead className="text-right">Diskon Jual</TableHead>
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
                    <TableCell>{item.brand}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-center font-black">{item.size}</TableCell>
                    <TableCell className="text-center font-black">{item.qty}</TableCell>
                    <TableCell className="text-right">Rp {item.sellPrice.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right text-destructive">
                      {item.discount > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="font-bold">{item.discount.toFixed(2)}%</span>
                          <span className="text-[9px]">-Rp {item.discountNominal.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">Rp {item.total.toLocaleString('id-ID')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] font-black border-none bg-slate-100">{item.payment}</Badge></TableCell>
                    <TableCell className="text-right opacity-60">Rp {item.buyPrice.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right pr-6 font-black text-emerald-600">Rp {item.margin.toLocaleString('id-ID')}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={13} className="h-48 text-center text-muted-foreground italic">Tidak ada data penjualan pada periode ini.</TableCell>
                  </TableRow>
                )}
              </TableBody>
              {flattenedItems.length > 0 && (
                <TableFooter className="bg-slate-50/80">
                  <TableRow className="font-black uppercase text-[10px]">
                    <TableCell colSpan={6} className="pl-6 py-4">Total Keseluruhan</TableCell>
                    <TableCell className="text-center text-primary text-sm">{totals.qty}</TableCell>
                    <TableCell colSpan={2} />
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
