"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
<<<<<<< HEAD
import { Search, Download, FileSpreadsheet, FileText, Calendar, Filter, Store, TrendingUp, TrendingDown, DollarSign, X, RotateCcw } from "lucide-react";
=======
import { Search, Download, FileSpreadsheet, FileText, Calendar, Filter, Store, TrendingUp, TrendingDown, DollarSign, X } from "lucide-react";
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
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
<<<<<<< HEAD
import { getTrxReturnSummary, TrxReturnSummary, getItemUnitNetPrice } from "@/components/cashier/types";
=======
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68

const BRAND_DATABASE = [
  'Aden', 'AHSAN', 'Ainun', 'Ajwa', 'ALFASA', 'Alfira', 'Aqlan', 'AR', 'ARSELLE', 'ARUMY', 'AS MOESLEM', 'Aysila', 'Dafeena', 'DENIZER', 'Elzatta', 'EMILY DAILY', 'ETHICA', 'FeeFashion', 'Gabia', 'Ghiina', 'HIJABI OFFICIAL', 'Hunny Label', 'IMIDY', 'Journey', 'Kaen', 'KAMSA', 'Kazami', 'Keke', 'Latanza', 'LUBI', 'MALIHA', 'MOSLEM DAILY', 'Nadheera Luxury', 'NARARYA', 'Nata Id', 'NIARA', 'NIBRAS', 'NIRMALA', 'Non Branded', 'Poeti', 'Rabbani', 'Raisakey', 'Ratu Bilqis', 'RAYYA', 'Rivantie', 'SALVINA', 'SAV KIDS', 'Seply', 'Ss Hijab', 'SYIFA OFFICIAL', 'Urfimutiyaro', 'Yukio', 'ZAMEERA', 'Zz Homey'
];

const CATEGORY_DATABASE = [
  'Accesories', 'Atasan', 'Blouse', 'Bros', 'Celana', 'Ciput', 'Dompet', 'DRESS', 'GAMIS', 'GAMIS ANAK', 'Jilbab Instan', 'Jilbab Segi_4', 'Jilbab Segi_5', 'Jilbab Segi_6', 'Jilbab Segi_7', 'KOKO', 'KOKO ANAK', 'MIDI DRESS', 'Mukena', 'Mukena Anak', 'Oneset', 'Pashmina', 'Sandal', 'Sarung', 'Tas', 'Tunik'
];

<<<<<<< HEAD
const CUSTOMER_TYPES = ["UMUM", "MEMBER", "AGEN", "ONLINE", "RESELLER"];

const safeFormatDate = (rawDate: any): string => {
  if (!rawDate) return "-";
  try {
    if (typeof rawDate?.toDate === "function") return format(rawDate.toDate(), "dd/MM/yyyy HH:mm");
    if (rawDate instanceof Date) return format(rawDate, "dd/MM/yyyy HH:mm");
    if (typeof rawDate === "string" || typeof rawDate === "number") {
      const d = new Date(rawDate);
      if (!isNaN(d.getTime())) return format(d, "dd/MM/yyyy HH:mm");
    }
    if (rawDate.seconds) return format(new Date(rawDate.seconds * 1000), "dd/MM/yyyy HH:mm");
  } catch (e) {
    return "-";
  }
  return "-";
};
=======
const CUSTOMER_TYPES = ["UMUM", "MEMBER", "AGEN", "ONLINE"];
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68

export default function SalesReportPage() {
  const db = useFirestore();
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
<<<<<<< HEAD
    if (storeFilter === "ALL" || storeFilter === "TOKO_A") (trxKWT || []).forEach(t => list.push({ ...t, storeId: "TOKO_A", storeName: "NHS KWT" }));
    if (storeFilter === "ALL" || storeFilter === "TOKO_B") (trxIND || []).forEach(t => list.push({ ...t, storeId: "TOKO_B", storeName: "IND CO" }));
    if (storeFilter === "ALL" || storeFilter === "TOKO_C") (trxGDM || []).forEach(t => list.push({ ...t, storeId: "TOKO_C", storeName: "NHS GDM" }));
    
    return list.sort((a, b) => {
      const dateA = a.date?.toDate?.()?.getTime() || 0;
      const dateB = b.date?.toDate?.()?.getTime() || 0;
      return dateB - dateA;
    });
=======
    if (storeFilter === "ALL" || storeFilter === "TOKO_A") (trxKWT || []).forEach(t => list.push({ ...t, storeName: "NHS KWT" }));
    if (storeFilter === "ALL" || storeFilter === "TOKO_B") (trxIND || []).forEach(t => list.push({ ...t, storeName: "IND CO" }));
    if (storeFilter === "ALL" || storeFilter === "TOKO_C") (trxGDM || []).forEach(t => list.push({ ...t, storeName: "NHS GDM" }));
    
    return list.sort((a, b) => (b.date?.toDate()?.getTime() || 0) - (a.date?.toDate()?.getTime() || 0));
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
  }, [trxKWT, trxIND, trxGDM, storeFilter]);

  const flattenedItems = useMemo(() => {
    let items: any[] = [];
    allTransactions.forEach(trx => {
<<<<<<< HEAD
      const summary = getTrxReturnSummary(trx);
      const isDP = trx.status === "DP" || summary.effectiveStatus === "DP";
      const isSettledDP = trx.settledAt != null;

      (trx.items || []).forEach((item: any) => {
        const key = `${item.productId}-${item.variantId}`;
        const returnedQty = summary.returnedQtyMap[key] || 0;
        const origQty = Number(item.quantity || 0);
        const netQty = Math.max(0, origQty - returnedQty);
        const isFullyReturned = origQty > 0 && netQty === 0;

        const unitNetPrice = getItemUnitNetPrice(item);
        const hargaSatuan = Number(item.labelPrice || item.price || 0);
        const hargaJualSatuan = unitNetPrice;
        
        const diskonJualNominal = Math.max(0, (hargaSatuan - hargaJualSatuan) * netQty);
        const diskonJualPersen = hargaSatuan > 0 ? ((hargaSatuan - hargaJualSatuan) / hargaSatuan) * 100 : 0;

        const itemTotal = hargaJualSatuan * netQty;
        const itemBuyTotal = (Number(item.buyPrice) || 0) * netQty;
        const margin = itemTotal - itemBuyTotal;

        let statusStr = "COMPLETED";
        if (isFullyReturned || summary.allReturned) {
          statusStr = "DIRETUR";
        } else if (returnedQty > 0) {
          statusStr = `RETUR (${returnedQty} PCS)`;
        } else if (isDP) {
          statusStr = "DP (BELUM LUNAS)";
        } else if (isSettledDP) {
          statusStr = "DP (LUNAS)";
        }

        items.push({
          date: safeFormatDate(trx.date),
=======
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
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
          trxId: trx.id,
          storeName: trx.storeName,
          customer: trx.customerName || "UMUM",
          customerType: trx.customerType || "UMUM",
          itemName: item.name,
          brand: item.brand || '-',
          category: item.category || '-',
<<<<<<< HEAD
          size: item.size || '-',
          color: item.color || '-',
          origQty: origQty,
          qty: netQty,
          returnedQty: returnedQty,
          isFullyReturned: isFullyReturned,
          sellPrice: hargaSatuan,
          unitNetPrice: unitNetPrice,
          discount: diskonJualPersen,
          discountNominal: diskonJualNominal,
          total: itemTotal,
          buyPrice: Number(item.buyPrice) || 0,
          margin: margin,
          payment: isDP ? `${trx.paymentMethod || "CASH"} (DP)` : (trx.paymentMethod || "CASH"),
          statusStr: statusStr,
=======
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
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
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
<<<<<<< HEAD
    const headers = ["Tanggal", "No Transaksi", "Cabang", "Customer", "Tipe", "Nama Barang", "Merk", "Kategori", "Size", "Warna", "Qty Net", "Qty Retur", "Harga Satuan", "Harga Net", "Diskon Jual (%)", "Total Net", "Harga Beli", "Margin Net", "Metode Bayar", "Status"];
    const data = flattenedItems.map(i => [
      i.date, i.trxId, i.storeName, i.customer, i.customerType, i.itemName, i.brand, i.category, i.size, i.color, i.qty, i.returnedQty, i.sellPrice, i.unitNetPrice, i.discount, i.total, i.buyPrice, i.margin, i.payment, i.statusStr
=======
    const headers = ["Tanggal", "No Transaksi", "Cabang", "Customer", "Tipe", "Nama Barang", "Merk", "Kategori", "Size", "Warna", "Qty", "Harga Satuan", "Diskon Jual (%) ", "Total", "Harga Beli", "Margin", "Metode Bayar"];
    const data = flattenedItems.map(i => [
      i.date, i.trxId, i.storeName, i.customer, i.customerType, i.itemName, i.brand, i.category, i.size, i.color, i.qty, i.sellPrice, i.discount, i.total, i.buyPrice, i.margin, i.payment
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
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
<<<<<<< HEAD
      `Rp ${i.unitNetPrice.toLocaleString('id-ID')}`,
=======
      `Rp ${i.sellPrice.toLocaleString('id-ID')}`,
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
      `${i.discount.toFixed(1)}%`,
      `Rp ${i.total.toLocaleString('id-ID')}`, 
      i.payment,
      `Rp ${i.buyPrice.toLocaleString('id-ID')}`,
      `Rp ${i.margin.toLocaleString('id-ID')}`,
<<<<<<< HEAD
      i.statusStr
    ]);

    (doc as any).autoTable({
      head: [['Tanggal', 'No Trx', 'Nama Barang', 'Merk', 'Kategori', 'Size', 'Qty', 'H. Net', 'Diskon','Total', 'Bayar', 'H. Beli', 'Margin', 'Status']],
=======
      `${i.customer} (${i.customerType})`
    ]);

    (doc as any).autoTable({
      head: [['Tanggal', 'No Trx', 'Nama Barang', 'Merk', 'Kategori', 'Size', 'Qty', 'H. Jual', 'Diskon','Total', 'Bayar', 'H. Beli', 'Margin', 'Customer']],
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
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
<<<<<<< HEAD
    <div className="space-y-4 sm:space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Sales Analytics</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">Laporan Penjualan Detail</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Monitoring profitabilitas, margin bersih, dan rincian transaksi (termasuk retur &amp; DP).</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportExcel} className="h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> EXCEL
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none">
            <FileText className="h-3.5 w-3.5 mr-1.5 text-[#C82368]" /> PDF A4
=======
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
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
          </Button>
        </div>
      </div>

<<<<<<< HEAD
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3.5 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/70">
        {/* Periode */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-2 sm:gap-3">
          <div className="space-y-1">
            <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Jenis</Label>
            <div className="flex bg-[#F5F3F0] p-1 rounded-full border border-neutral-200/70">
              <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all", filterMode === "daily" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>HARIAN</button>
              <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all", filterMode === "monthly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>BULANAN</button>
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Waktu</Label>
            {filterMode === "daily" ? (
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3" />
            ) : (
              <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3" />
=======
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-white p-5 rounded-3xl soft-shadow border">
        {/* Periode */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Jenis Laporan</Label>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-2 text-[9px] md:text-[10px] font-black rounded-lg transition-all", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>HARIAN</button>
              <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-2 text-[9px] md:text-[10px] font-black rounded-lg transition-all", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>BULANAN</button>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Waktu</Label>
            {filterMode === "daily" ? (
              <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
            ) : (
              <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
            )}
          </div>
        </div>

        {/* Brand & Kategori & Tipe Pelanggan */}
<<<<<<< HEAD
        <div className="lg:col-span-6 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="space-y-1">
            <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Merek</Label>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-96">
                <div className="p-2 sticky top-0 bg-white">
                  <Input placeholder="Cari Merek..." value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} onMouseDown={(e) => e.stopPropagation()} className="h-8 rounded-full text-xs" />
                </div>
                <SelectItem value="ALL" className="text-xs">SEMUA MEREK</SelectItem>
                {BRAND_DATABASE.filter(brand => brand.toLowerCase().includes(brandSearch.toLowerCase())).map(brand => <SelectItem key={brand} value={brand} className="text-xs">{brand}</SelectItem>)}
=======
        <div className="lg:col-span-6 grid grid-cols-3 gap-2">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Merek</Label>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-[9px] md:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-96">
                <div className="p-2 sticky top-0 bg-white">
                  <Input placeholder="Cari Merek..." value={brandSearch} onChange={(e) => setBrandSearch(e.target.value)} onMouseDown={(e) => e.stopPropagation()} className="h-9" />
                </div>
                <SelectItem value="ALL">SEMUA MEREK</SelectItem>
                {BRAND_DATABASE.filter(brand => brand.toLowerCase().includes(brandSearch.toLowerCase())).map(brand => <SelectItem key={brand} value={brand}>{brand}</SelectItem>)}
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
              </SelectContent>
            </Select>
          </div>

<<<<<<< HEAD
          <div className="space-y-1">
            <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Kategori</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl max-h-96">
                <div className="p-2 sticky top-0 bg-white">
                  <Input placeholder="Cari Kategori..." value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} onMouseDown={(e) => e.stopPropagation()} className="h-8 rounded-full text-xs" />
                </div>
                <SelectItem value="ALL" className="text-xs">SEMUA KATEGORI</SelectItem>
                {CATEGORY_DATABASE.filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>)}
=======
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Kategori</Label>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-[9px] md:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl max-h-96">
                <div className="p-2 sticky top-0 bg-white">
                  <Input placeholder="Cari Kategori..." value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} onMouseDown={(e) => e.stopPropagation()} className="h-9" />
                </div>
                <SelectItem value="ALL">SEMUA KATEGORI</SelectItem>
                {CATEGORY_DATABASE.filter(cat => cat.toLowerCase().includes(categorySearch.toLowerCase())).map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
              </SelectContent>
            </Select>
          </div>

<<<<<<< HEAD
          <div className="space-y-1">
            <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Tipe</Label>
            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="ALL" className="text-xs">SEMUA TIPE</SelectItem>
                {CUSTOMER_TYPES.map(type => <SelectItem key={type} value={type} className="text-xs">{type}</SelectItem>)}
=======
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tipe Pelanggan</Label>
            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-[9px] md:text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">SEMUA TIPE</SelectItem>
                {CUSTOMER_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cabang & Search */}
<<<<<<< HEAD
        <div className="lg:col-span-3 grid grid-cols-2 gap-2 sm:gap-3">
          <div className="space-y-1">
            <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Cabang</Label>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="ALL" className="text-xs">SEMUA</SelectItem>
                <SelectItem value="TOKO_A" className="text-xs">NHS KWT</SelectItem>
                <SelectItem value="TOKO_B" className="text-xs">IND CO</SelectItem>
                <SelectItem value="TOKO_C" className="text-xs">NHS GDM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Cari</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
              <Input placeholder="ID/Barang..." className="pl-8 h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 text-[11px] sm:text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
=======
        <div className="lg:col-span-3 grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cabang</Label>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-bold text-[9px] md:text-xs"><SelectValue /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">SEMUA</SelectItem>
                <SelectItem value="TOKO_A">NHS KWT</SelectItem>
                <SelectItem value="TOKO_B">IND CO</SelectItem>
                <SelectItem value="TOKO_C">NHS GDM</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cari Global</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="ID/Barang/Nama..." className="pl-10 h-11 rounded-xl bg-slate-50 border-none text-xs" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
            </div>
          </div>
        </div>
      </div>

<<<<<<< HEAD
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="border-none shadow-sm bg-neutral-950 text-white rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-2.5 sm:p-5">
            <p className="text-[8px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider mb-0.5 truncate">Omzet (Net)</p>
            <CardTitle className="text-xs sm:text-xl md:text-2xl font-serif truncate">Rp {totals.total.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm bg-[#C82368] text-white rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-2.5 sm:p-5">
            <p className="text-[8px] sm:text-[10px] font-bold uppercase text-white/75 tracking-wider mb-0.5 truncate">Laba Kotor</p>
            <CardTitle className="text-xs sm:text-xl md:text-2xl font-serif truncate">Rp {totals.margin.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-neutral-200/70 shadow-sm bg-white text-neutral-900 rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-2.5 sm:p-5">
            <p className="text-[8px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider mb-0.5 truncate">Terjual</p>
            <CardTitle className="text-xs sm:text-xl md:text-2xl font-serif truncate">{totals.qty} PCS</CardTitle>
=======
      <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4">
        <Card className="border-none soft-shadow bg-primary text-white rounded-xl md:rounded-[2rem]">
          <CardHeader className="p-2 md:p-6">
            <p className="text-[7px] md:text-[10px] font-black uppercase opacity-70 tracking-widest mb-0.5 md:mb-1">Omzet Penjualan</p>
            <CardTitle className="text-[10px] md:text-2xl font-black">Rp {totals.total.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none soft-shadow bg-emerald-600 text-white rounded-xl md:rounded-[2rem]">
          <CardHeader className="p-2 md:p-6">
            <p className="text-[7px] md:text-[10px] font-black uppercase opacity-70 tracking-widest mb-0.5 md:mb-1">Laba Kotor (Margin)</p>
            <CardTitle className="text-[10px] md:text-2xl font-black">Rp {totals.margin.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none soft-shadow bg-blue-600 text-white rounded-xl md:rounded-[2rem]">
          <CardHeader className="p-2 md:p-6">
            <p className="text-[7px] md:text-[10px] font-black uppercase opacity-70 tracking-widest mb-0.5 md:mb-1">Item Terjual</p>
            <CardTitle className="text-[10px] md:text-2xl font-black">{totals.qty} PCS</CardTitle>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
          </CardHeader>
        </Card>
      </div>

<<<<<<< HEAD
      <Card className="border border-neutral-200/70 shadow-sm bg-white rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {/* Mobile Compact Cards (Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {flattenedItems.length > 0 ? flattenedItems.map((item, idx) => (
              <div key={idx} className={cn("p-3 space-y-2 hover:bg-[#F5F3F0]/50 transition-colors", item.isFullyReturned && "bg-rose-50/40 opacity-75")}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono font-bold text-[#C82368] text-[10px]">{item.trxId}</span>
                      <Badge variant="outline" className="text-[8px] font-bold border-none bg-[#F5F3F0] text-neutral-700 rounded-full px-2 py-0 h-4">{item.storeName}</Badge>
                      <span className="text-[9px] text-neutral-400">{item.date}</span>
                    </div>
                    <p className={cn("font-bold text-xs uppercase leading-snug text-neutral-900 mt-1 break-words", item.isFullyReturned && "line-through text-neutral-400")}>
                      {item.itemName}
                    </p>
                    <p className="text-[9px] text-neutral-500 uppercase font-bold mt-0.5">
                      {item.brand} • {item.category} • Size {item.size}
                    </p>
                    {item.returnedQty > 0 && (
                      <p className="text-[9px] text-rose-600 font-bold mt-0.5">Retur: {item.returnedQty} / Beli: {item.origQty} PCS</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className={cn("text-[8px] font-bold border-none rounded-full px-2", item.isFullyReturned ? "bg-rose-100 text-rose-700" : "bg-neutral-100 text-neutral-700")}>
                      {item.statusStr}
                    </Badge>
                    <Badge variant="outline" className="text-[8px] font-bold border-none bg-[#F5F3F0] rounded-full px-2">{item.payment}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5 bg-[#F5F3F0]/80 rounded-xl p-2">
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold uppercase text-neutral-400">Qty &amp; Disc</p>
                    <p className="text-[10px] font-bold text-neutral-900">{item.qty} PCS {item.discount > 0 ? <span className="text-rose-600">(-{item.discount.toFixed(0)}%)</span> : ""}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] font-bold uppercase text-neutral-400">Total Net</p>
                    <p className="text-[10px] font-bold text-neutral-900 truncate">Rp {item.total.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-[8px] font-bold uppercase text-neutral-400">Margin</p>
                    <p className="text-[10px] font-bold text-emerald-700 truncate">Rp {item.margin.toLocaleString('id-ID')}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-neutral-500">
                  <span className="font-bold uppercase text-neutral-700 truncate">{item.customer} ({item.customerType})</span>
                  <span className="shrink-0">Beli: Rp {item.buyPrice.toLocaleString('id-ID')}</span>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-xs text-neutral-400 italic">Tidak ada data penjualan pada periode ini.</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white">
                <TableRow className="text-[10px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                  <TableHead className="pl-6 text-neutral-300">Tanggal</TableHead>
                  <TableHead className="text-neutral-300">No Trx</TableHead>
                  <TableHead className="min-w-[260px] text-neutral-300">Nama Barang</TableHead>
                  <TableHead className="text-neutral-300">Merk</TableHead>
                  <TableHead className="text-neutral-300">Kategori</TableHead>
                  <TableHead className="text-center text-neutral-300">Size</TableHead>
                  <TableHead className="text-center text-neutral-300">Qty Net</TableHead>
                  <TableHead className="text-right text-neutral-300">Harga Satuan</TableHead>
                  <TableHead className="text-right text-neutral-300">Diskon Jual</TableHead>
                  <TableHead className="text-right text-neutral-300">Total Net</TableHead>
                  <TableHead className="text-neutral-300">Metode</TableHead>
                  <TableHead className="text-right text-neutral-300">Harga Beli</TableHead>
                  <TableHead className="text-right text-neutral-300">Margin</TableHead>
                  <TableHead className="pr-6 text-neutral-300">Customer &amp; Status</TableHead>
=======
      <Card className="border-none soft-shadow rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="text-[10px] font-black uppercase">
                  <TableHead className="pl-6">Tanggal</TableHead>
                  <TableHead>No Trx</TableHead>
                  <TableHead className="min-w-[300px]">Nama Barang</TableHead>
                  <TableHead>Merk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead className="text-center">Size</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Harga Satuan</TableHead>
                  <TableHead className="text-right">Diskon Jual</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Harga Beli</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="pr-6">Customer &amp; Tipe</TableHead>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedItems.length > 0 ? flattenedItems.map((item, idx) => (
<<<<<<< HEAD
                  <TableRow key={idx} className={cn("hover:bg-[#F5F3F0]/60 border-b border-neutral-100 text-[11px]", item.isFullyReturned && "bg-rose-50/40 opacity-75")}>
                    <TableCell className="pl-6 whitespace-nowrap text-neutral-500">{item.date}</TableCell>
                    <TableCell className="font-mono font-bold text-[#C82368] whitespace-nowrap">
                      {item.trxId}
                      <span className="block text-[9px] text-neutral-400 font-normal">{item.storeName}</span>
                    </TableCell>
                    <TableCell className="min-w-[260px]">
                      <p className={cn("font-bold uppercase leading-tight text-neutral-900", item.isFullyReturned && "line-through text-neutral-400")}>{item.itemName}</p>
                      {item.returnedQty > 0 && (
                        <p className="text-[9px] text-rose-600 font-bold mt-0.5">
                          (Retur: {item.returnedQty} PCS / Beli: {item.origQty} PCS)
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-neutral-700">{item.brand}</TableCell>
                    <TableCell className="text-neutral-600">{item.category}</TableCell>
                    <TableCell className="text-center font-bold">{item.size}</TableCell>
                    <TableCell className="text-center font-bold">
                      {item.isFullyReturned ? (
                        <Badge variant="outline" className="text-[9px] font-bold border-none bg-rose-100 text-rose-700">0 (RETUR)</Badge>
                      ) : (
                        <span>{item.qty}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      Rp {item.sellPrice.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right text-rose-600">
=======
                  <TableRow key={idx} className="hover:bg-muted/30 border-b border-muted/50 text-[11px]">
                    <TableCell className="pl-6 whitespace-nowrap">{item.date}</TableCell>
                    <TableCell className="font-mono font-bold text-primary">{item.trxId}</TableCell>
                    <TableCell className="min-w-[300px]">
                      <p className="font-bold uppercase leading-tight">{item.itemName}</p>
                    </TableCell>
                    <TableCell>{item.brand}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-center font-black">{item.size}</TableCell>
                    <TableCell className="text-center font-black">{item.qty}</TableCell>
                    <TableCell className="text-right">Rp {item.sellPrice.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right text-destructive">
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                      {item.discount > 0 && (
                        <div className="flex flex-col items-end">
                          <span className="font-bold">{item.discount.toFixed(1)}%</span>
                          <span className="text-[9px]">-Rp {item.discountNominal.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </TableCell>
<<<<<<< HEAD
                    <TableCell className="text-right font-bold text-neutral-900 whitespace-nowrap">
                      Rp {item.total.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[9px] font-bold border-none bg-[#F5F3F0] rounded-full px-3">{item.payment}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-neutral-400 whitespace-nowrap">Rp {item.buyPrice.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-700 whitespace-nowrap">Rp {item.margin.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex flex-col">
                        <p className="font-bold uppercase leading-tight text-neutral-900">{item.customer}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] text-neutral-400 uppercase font-bold">{item.customerType}</span>
                          <Badge variant="outline" className={cn("text-[8px] font-bold border-none rounded-full px-2", item.isFullyReturned ? "bg-rose-100 text-rose-700" : "bg-neutral-100 text-neutral-600")}>
                            {item.statusStr}
                          </Badge>
                        </div>
=======
                    <TableCell className="text-right font-bold">Rp {item.total.toLocaleString('id-ID')}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] font-black border-none bg-slate-100">{item.payment}</Badge></TableCell>
                    <TableCell className="text-right opacity-60">Rp {item.buyPrice.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-black text-emerald-600">Rp {item.margin.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="pr-6">
                      <div className="flex flex-col">
                        <p className="font-bold uppercase leading-tight text-slate-800">{item.customer}</p>
                        <p className="text-[9px] text-muted-foreground uppercase font-black">{item.customerType}</p>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
<<<<<<< HEAD
                    <TableCell colSpan={14} className="h-48 text-center text-neutral-400 italic">Tidak ada data penjualan pada periode ini.</TableCell>
=======
                    <TableCell colSpan={14} className="h-48 text-center text-muted-foreground italic">Tidak ada data penjualan pada periode ini.</TableCell>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                  </TableRow>
                )}
              </TableBody>
              {flattenedItems.length > 0 && (
<<<<<<< HEAD
                <TableFooter className="bg-[#F5F3F0] border-t border-neutral-200">
                  <TableRow className="font-bold uppercase text-[10px]">
                    <TableCell colSpan={6} className="pl-6 py-4 text-neutral-500 tracking-widest">Total Penjualan Bersih (Net)</TableCell>
                    <TableCell className="text-center text-[#C82368] text-base font-serif">{totals.qty} PCS</TableCell>
                    <TableCell colSpan={2} />
                    <TableCell className="text-right text-neutral-900 text-base font-serif whitespace-nowrap">Rp {totals.total.toLocaleString('id-ID')}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right text-emerald-700 text-base font-serif whitespace-nowrap">Rp {totals.margin.toLocaleString('id-ID')}</TableCell>
=======
                <TableFooter className="bg-slate-50/80">
                  <TableRow className="font-black uppercase text-[10px]">
                    <TableCell colSpan={6} className="pl-6 py-4">Total Keseluruhan</TableCell>
                    <TableCell className="text-center text-primary text-sm">{totals.qty}</TableCell>
                    <TableCell colSpan={2} />
                    <TableCell className="text-right text-primary text-sm">Rp {totals.total.toLocaleString('id-ID')}</TableCell>
                    <TableCell />
                    <TableCell />
                    <TableCell className="text-right text-emerald-700 text-sm">Rp {totals.margin.toLocaleString('id-ID')}</TableCell>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
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
