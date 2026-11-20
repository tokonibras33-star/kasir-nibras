"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, FileSpreadsheet, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
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

const CUSTOMER_TYPES = ["UMUM", "MEMBER", "AGEN", "ONLINE"];

export default function SalesReportPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [storeFilter, setStoreFilter] = useState<string>("ALL");
  const [brandFilter, setBrandFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");

  const getQuery = (storeId: string) => {
    if (!user) return null;
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

  const qA = useMemoFirebase(() => getQuery("TOKO_A"), [db, user, filterMode, selectedDate, selectedMonth]);
  const qB = useMemoFirebase(() => getQuery("TOKO_B"), [db, user, filterMode, selectedDate, selectedMonth]);
  const qC = useMemoFirebase(() => getQuery("TOKO_C"), [db, user, filterMode, selectedDate, selectedMonth]);

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
          customerType: trx.customerType || "UMUM",
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
    if (customerTypeFilter !== "ALL") {
      items = items.filter(i => (i.customerType || "").toUpperCase() === customerTypeFilter);
    }

    const tokens = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (tokens.length > 0) {
      items = items.filter(i => 
        tokens.every(t => 
          i.itemName.toLowerCase().includes(t) || 
          i.trxId.toLowerCase().includes(t) ||
          i.customer.toLowerCase().includes(t)
        )
      );
    }

    return items;
  }, [allTransactions, searchTerm, brandFilter, categoryFilter, customerTypeFilter]);

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
    const headers = ["Tanggal", "No Transaksi", "Cabang", "Customer", "Tipe", "Nama Barang", "Merk", "Kategori", "Size", "Warna", "Qty", "Harga Satuan", "Diskon Jual (%) ", "Total", "Harga Beli", "Margin", "Metode Bayar"];
    const data = flattenedItems.map(i => [
      i.date, i.trxId, i.storeName, i.customer, i.customerType, i.itemName, i.brand, i.category, i.size, i.color, i.qty, i.sellPrice, i.discount, i.total, i.buyPrice, i.margin, i.payment
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
      `${i.discount.toFixed(1)}%`,
      `Rp ${i.total.toLocaleString('id-ID')}`, 
      i.payment,
      `Rp ${i.buyPrice.toLocaleString('id-ID')}`,
      `Rp ${i.margin.toLocaleString('id-ID')}`,
      `${i.customer} (${i.customerType})`
    ]);

    (doc as any).autoTable({
      head: [['Tanggal', 'No Trx', 'Nama Barang', 'Merk', 'Kategori', 'Size', 'Qty', 'H. Jual', 'Diskon','Total', 'Bayar', 'H. Beli', 'Margin', 'Customer']],
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
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Sales Analytics</p>
          <h1 className="text-3xl md:text-4xl font-serif text-neutral-900 tracking-tight">Laporan Penjualan Detail</h1>
          <p className="text-neutral-500 text-sm mt-1">Monitoring profitibilitas dan rincian transaksi harian/bulanan.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportExcel} className="h-10 rounded-full px-5 font-bold text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none">
            <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> EXCEL
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="h-10 rounded-full px-5 font-bold text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none">
            <FileText className="h-4 w-4 mr-2 text-[#C82368]" /> PDF A4
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-5 rounded-3xl shadow-sm border border-neutral-200/70">
        {/* Periode */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Jenis Laporan</Label>
            <div className="flex bg-[#F5F3F0] p-1 rounded-full border border-neutral-200/70">
              <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-2 text-[10px] font-bold rounded-full transition-all", filterMode === "daily" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>HARIAN</button>
              <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-2 text-[10px] font-bold rounded-full transition-all", filterMode === "monthly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>BULANAN</button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Waktu</Label>
            {filterMode === "daily" ? (
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-xs px-4" />
            ) : (
              <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-xs px-4" />
            )}
          </div>
        </div>

        {/* Brand & Kategori & Tipe Pelanggan */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Merek</Label>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-xs px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-96">
                <div className="p-2 sticky top-0 bg-white">
                  <Input placeholder="Cari Merek..." value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} onMouseDown={(e) => e.stopPropagation()} className="h-9 rounded-full" />
                </div>
                <SelectItem value="ALL">SEMUA MEREK</SelectItem>
                {BRAND_DATABASE.filter(brand => brand.toLowerCase().includes(brandSearch.toLowerCase())).map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Kategori</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-xs px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-96">
                <div className="p-2 sticky top-0 bg-white">
                  <Input placeholder="Cari Kategori..." value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} onMouseDown={(e) => e.stopPropagation()} className="h-9 rounded-full" />
                </div>
                <SelectItem value="ALL">SEMUA KATEGORI</SelectItem>
                {CATEGORY_DATABASE.filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Tipe Pelanggan</Label>
            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-xs px-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="ALL">SEMUA TIPE</SelectItem>
                {CUSTOMER_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cabang & Search */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Cabang</Label>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-xs px-4"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="ALL">SEMUA</SelectItem>
                <SelectItem value="TOKO_A">NHS KWT</SelectItem>
                <SelectItem value="TOKO_B">IND CO</SelectItem>
                <SelectItem value="TOKO_C">NHS GDM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Cari Global</Label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input placeholder="ID/Barang/Nama..." className="pl-11 h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm bg-neutral-950 text-white rounded-3xl">
          <CardHeader className="p-5 md:p-6">
            <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest mb-1">Omzet Penjualan</p>
            <CardTitle className="text-2xl md:text-3xl font-serif">Rp {totals.total.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm bg-[#C82368] text-white rounded-3xl">
          <CardHeader className="p-5 md:p-6">
            <p className="text-[10px] font-bold uppercase text-white/75 tracking-widest mb-1">Laba Kotor (Margin)</p>
            <CardTitle className="text-2xl md:text-3xl font-serif">Rp {totals.margin.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-neutral-200/70 shadow-sm bg-white text-neutral-900 rounded-3xl">
          <CardHeader className="p-5 md:p-6">
            <p className="text-[10px] font-bold uppercase text-neutral-400 tracking-widest mb-1">Item Terjual</p>
            <CardTitle className="text-2xl md:text-3xl font-serif">{totals.qty} PCS</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-neutral-200/70 shadow-sm bg-white rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white">
                <TableRow className="text-[10px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                  <TableHead className="pl-6 text-neutral-300">Tanggal</TableHead>
                  <TableHead className="text-neutral-300">No Trx</TableHead>
                  <TableHead className="min-w-[260px] text-neutral-300">Nama Barang</TableHead>
                  <TableHead className="text-neutral-300">Merk</TableHead>
                  <TableHead className="text-neutral-300">Kategori</TableHead>
                  <TableHead className="text-center text-neutral-300">Size</TableHead>
                  <TableHead className="text-center text-neutral-300">Qty</TableHead>
                  <TableHead className="text-right text-neutral-300">Harga Satuan</TableHead>
                  <TableHead className="text-right text-neutral-300">Diskon Jual</TableHead>
                  <TableHead className="text-right text-neutral-300">Total</TableHead>
                  <TableHead className="text-neutral-300">Metode</TableHead>
                  <TableHead className="text-right text-neutral-300">Harga Beli</TableHead>
                  <TableHead className="text-right text-neutral-300">Margin</TableHead>
                  <TableHead className="pr-6 text-neutral-300">Customer &amp; Tipe</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedItems.length > 0 ? flattenedItems.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 text-[11px]">
                    <TableCell className="pl-6 whitespace-nowrap text-neutral-500">{item.date}</TableCell>
                    <TableCell className="font-mono font-bold text-[#C82368] whitespace-nowrap">{item.trxId}</TableCell>
                    <TableCell className="min-w-[260px]">
                      <p className="font-bold uppercase leading-tight text-neutral-900">{item.itemName}</p>
                    </TableCell>
                    <TableCell className="text-neutral-700">{item.brand}</TableCell>
                    <TableCell className="text-neutral-600">{item.category}</TableCell>
                    <TableCell className="text-center font-bold">{item.size}</TableCell>
                    <TableCell className="text-center font-bold">{item.qty}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">Rp {item.sellPrice.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right text-rose-600">
                      {item.discount > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="font-bold">{item.discount.toFixed(1)}%</span>
                          <span className="text-[9px]">-Rp {item.discountNominal.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold text-neutral-900 whitespace-nowrap">Rp {item.total.toLocaleString('id-ID')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] font-bold border-none bg-[#F5F3F0] rounded-full px-3">{item.payment}</Badge></TableCell>
                    <TableCell className="text-right text-neutral-400 whitespace-nowrap">Rp {item.buyPrice.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-700 whitespace-nowrap">Rp {item.margin.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex flex-col">
                        <p className="font-bold uppercase leading-tight text-neutral-900">{item.customer}</p>
                        <p className="text-[9px] text-neutral-400 uppercase font-bold">{item.customerType}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={14} className="h-48 text-center text-neutral-400 italic">Tidak ada data penjualan pada periode ini.</TableCell>
                  </TableRow>
                )}
              </TableBody>
              {flattenedItems.length > 0 && (
                <TableFooter className="bg-[#F5F3F0] border-t border-neutral-200">
                  <TableRow className="font-bold uppercase text-[10px]">
                    <TableCell colSpan={6} className="pl-6 py-4 text-neutral-500 tracking-widest">Total Keseluruhan</TableCell>
                    <TableCell className="text-center text-[#C82368] text-base font-serif">{totals.qty}</TableCell>
                    <TableCell colSpan={2} />
                    <TableCell className="text-right text-neutral-900 text-base font-serif whitespace-nowrap">Rp {totals.total.toLocaleString('id-ID')}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right text-emerald-700 text-base font-serif whitespace-nowrap">Rp {totals.margin.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="pr-6" />
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
