"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, FileText, Calendar, Filter, Store, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, where, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { getItemUnitNetPrice, getTrxReturnSummary } from "@/components/cashier/types";

const STORES = [
  { id: "TOKO_A", name: "NHS KWT" },
  { id: "TOKO_B", name: "IND CO" },
  { id: "TOKO_C", name: "NHS GDM" },
];

const parseSafeDate = (d: any): Date => {
  if (!d) return new Date();
  if (typeof d?.toDate === "function") return d.toDate();
  if (d instanceof Date) return d;
  if (d.seconds) return new Date(d.seconds * 1000);
  if (typeof d === "string" || typeof d === "number") {
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
};

export default function ReturnsHistoryPage() {
  const db = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const buildQuery = (storeId: string) => {
    let q = collection(db, "stores", storeId, "transactions");
    const [year, month] = selectedMonth.split("-");
    const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
    const lastDay = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    
    return query(
      q, 
      where("date", ">=", Timestamp.fromDate(firstDay)), 
      where("date", "<=", Timestamp.fromDate(lastDay)), 
      orderBy("date", "desc")
    );
  };

  const qA = useMemoFirebase(() => buildQuery("TOKO_A"), [db, selectedMonth]);
  const qB = useMemoFirebase(() => buildQuery("TOKO_B"), [db, selectedMonth]);
  const qC = useMemoFirebase(() => buildQuery("TOKO_C"), [db, selectedMonth]);

  const { data: hA } = useCollection<any>(qA);
  const { data: hB } = useCollection<any>(qB);
  const { data: hC } = useCollection<any>(qC);

  const returnedItems = useMemo(() => {
    const list: any[] = [];
    const allTrx = [
      ...(hA || []).map(t => ({ ...t, storeId: 'TOKO_A' })),
      ...(hB || []).map(t => ({ ...t, storeId: 'TOKO_B' })),
      ...(hC || []).map(t => ({ ...t, storeId: 'TOKO_C' })),
    ];

    allTrx.forEach(trx => {
      if (trx.returnLog && Array.isArray(trx.returnLog.items) && trx.returnLog.items.length > 0) {
        if (storeFilter !== "ALL" && trx.storeId !== storeFilter) return;

        const summary = getTrxReturnSummary(trx);
        const returnDate = parseSafeDate(trx.returnLog.returnedAt || trx.date);

        trx.returnLog.items.forEach((item: any) => {
          const unitPrice = getItemUnitNetPrice(item);
          const qty = Number(item.quantity || 1);
          const itemRefund = unitPrice * qty;

          list.push({
            date: returnDate,
            trxId: trx.id,
            storeId: trx.storeId,
            storeName: STORES.find(s => s.id === trx.storeId)?.name || trx.storeId,
            customerName: trx.customerName || "UMUM",
            customerPhone: trx.customerPhone || "-",
            customerType: trx.customerType || "UMUM",
            itemName: item.name,
            itemBrand: item.brand || "-",
            itemCategory: item.category || "-",
            itemColor: item.color || "-",
            itemSize: item.size || "-",
            quantity: qty,
            price: unitPrice,
            totalRefund: itemRefund,
            reason: item.reason || trx.returnLog.reason || "Retur Konsumen",
            isDP: trx.status === "DP" || trx.settledAt != null || trx.originalStatus === "DP",
            isDeductedFromTotal: Boolean(trx.returnLog.isDeductedFromTotal),
          });
        });
      }
    });

    return list
      .filter(i => 
        i.customerName.toLowerCase().includes(search.toLowerCase()) ||
        i.itemName.toLowerCase().includes(search.toLowerCase()) ||
        i.trxId.toLowerCase().includes(search.toLowerCase()) ||
        i.customerPhone.includes(search)
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [hA, hB, hC, storeFilter, search]);

  const stats = useMemo(() => {
    let totalQty = 0;
    let totalRefund = 0;
    const uniqueTrx = new Set<string>();

    returnedItems.forEach(i => {
      totalQty += i.quantity;
      totalRefund += i.totalRefund;
      uniqueTrx.add(i.trxId);
    });

    return { totalQty, totalRefund, countTrx: uniqueTrx.size };
  }, [returnedItems]);

  const exportPDF = () => {
    if (returnedItems.length === 0) return;
    const docPdf = new jsPDF({ orientation: 'landscape' });
    docPdf.text(`Laporan Histori Retur - Nibras House`, 148, 10, { align: "center" });
    docPdf.text(`Periode: ${selectedMonth} | Cabang: ${storeFilter}`, 148, 16, { align: "center" });

    const tableData = returnedItems.map(i => [
      format(i.date, "dd/MM/yyyy HH:mm"),
      i.trxId,
      i.storeName,
      i.customerName,
      i.itemName,
      i.itemSize,
      i.quantity,
      `Rp ${i.price.toLocaleString('id-ID')}`,
      `Rp ${i.totalRefund.toLocaleString('id-ID')}`,
      i.isDP ? "Potong DP/Sisa" : "Refund"
    ]);

    (docPdf as any).autoTable({
      head: [['Waktu', 'ID TRX', 'Cabang', 'Konsumen', 'Nama Barang', 'Size', 'Qty', 'Harga Net', 'Total Refund', 'Tipe']],
      body: tableData,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [153, 27, 27] }
    });

    docPdf.save(`histori-retur-${selectedMonth}.pdf`);
  };

  const exportExcel = () => {
    if (returnedItems.length === 0) return;
    const headers = ["Waktu", "ID TRX", "Cabang", "Konsumen", "No WA", "Tipe Pelanggan", "Barang", "Merk", "Kategori", "Size", "Warna", "Qty", "Harga Satuan Net", "Total Refund", "Keterangan DP"];
    const data = returnedItems.map(i => [
      format(i.date, "dd/MM/yyyy HH:mm"),
      i.trxId,
      i.storeName,
      i.customerName,
      i.customerPhone,
      i.customerType,
      i.itemName,
      i.itemBrand,
      i.itemCategory,
      i.itemSize,
      i.itemColor,
      i.quantity,
      i.price,
      i.totalRefund,
      i.isDP ? "Transaksi DP" : "Transaksi Tunai/Lunas"
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Retur");
    XLSX.writeFile(wb, `histori-retur-${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Return Audit</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">Histori Retur Barang</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Audit barang yang dikembalikan konsumen beserta nominal pengembalian kas / potong tagihan DP.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportExcel} className="flex-1 sm:flex-none h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50">
            <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> EXCEL
          </Button>
          <Button variant="outline" onClick={exportPDF} className="flex-1 sm:flex-none h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50">
            <FileText className="h-3.5 w-3.5 mr-1.5 text-[#C82368]" /> PDF A4
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/70">
        <div className="space-y-1">
          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Pilih Bulan</Label>
          <Input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
            className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5" 
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Cabang Toko</Label>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="ALL" className="font-bold text-xs">SEMUA TOKO</SelectItem>
              {STORES.map(s => <SelectItem key={s.id} value={s.id} className="font-bold text-xs">{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 md:col-span-1 space-y-1">
          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Cari Konsumen / Barang / ID</Label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input 
              placeholder="Ketik sesuatu..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-9 pl-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-medium text-[11px] sm:text-xs" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-rose-950 text-white rounded-2xl sm:rounded-3xl border-none shadow-sm">
          <CardHeader className="p-2.5 sm:p-5">
            <p className="text-[8px] sm:text-[10px] uppercase font-bold text-rose-300 tracking-wider truncate">Total Refund</p>
            <CardTitle className="text-xs sm:text-xl md:text-2xl font-serif truncate">Rp {stats.totalRefund.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white text-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/70 shadow-sm">
          <CardHeader className="p-2.5 sm:p-5">
            <p className="text-[8px] sm:text-[10px] uppercase font-bold text-neutral-400 tracking-wider truncate">Barang Retur</p>
            <CardTitle className="text-xs sm:text-xl md:text-2xl font-serif text-rose-600 truncate">{stats.totalQty} PCS</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white text-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/70 shadow-sm">
          <CardHeader className="p-2.5 sm:p-5">
            <p className="text-[8px] sm:text-[10px] uppercase font-bold text-neutral-400 tracking-wider truncate">Trx Retur</p>
            <CardTitle className="text-xs sm:text-xl md:text-2xl font-serif truncate">{stats.countTrx} TRX</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-neutral-200/70 shadow-sm bg-white rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {/* Mobile Compact Cards (Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {returnedItems.length > 0 ? returnedItems.map((item, idx) => (
              <div key={idx} className="p-3 space-y-2 hover:bg-[#F5F3F0]/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-neutral-900">{format(item.date, "dd/MM/yyyy HH:mm")}</span>
                      <Badge variant="outline" className="text-[8px] font-bold border-none bg-[#F5F3F0] text-[#C82368] rounded-full px-2 py-0 h-4">{item.storeName}</Badge>
                      {item.isDP && <Badge variant="outline" className="text-[8px] font-bold bg-amber-50 text-amber-700 border-none rounded-full px-2 py-0 h-4">DP</Badge>}
                    </div>
                    <p className="text-[9px] font-mono text-neutral-400 mt-0.5">{item.trxId}</p>
                  </div>
                  <Badge className="bg-rose-100 text-rose-700 border-none font-bold rounded-full px-2.5 text-[9px] shrink-0">{item.quantity} PCS</Badge>
                </div>

                <div>
                  <p className="text-xs font-bold uppercase leading-snug text-neutral-900 break-words">{item.itemName}</p>
                  <p className="text-[9px] text-neutral-500 uppercase font-bold mt-0.5">{item.itemBrand} • {item.itemCategory} • {item.itemSize} / {item.itemColor}</p>
                  <p className="text-[9px] text-neutral-500 italic mt-0.5">Ket: {item.reason}</p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase text-neutral-800 truncate">{item.customerName}</p>
                    <p className="text-[9px] text-neutral-400">{item.customerPhone} • {item.customerType}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-rose-600">Rp {item.totalRefund.toLocaleString('id-ID')}</p>
                    <p className="text-[9px] text-neutral-400">@Rp {item.price.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-xs text-neutral-400 italic">Tidak ada histori retur pada periode ini.</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white">
                <TableRow className="border-none hover:bg-neutral-950">
                  <TableHead className="pl-6 text-[10px] font-bold uppercase tracking-widest py-4 text-neutral-300">Waktu Retur</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Konsumen</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Barang &amp; Varian</TableHead>
                  <TableHead className="text-center text-[10px] font-bold uppercase tracking-widest text-neutral-300">Qty</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest pr-6 text-neutral-300">Total Refund</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnedItems.length > 0 ? returnedItems.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-[#F5F3F0]/60 transition-colors border-b border-neutral-100">
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-neutral-900 whitespace-nowrap">{format(item.date, "dd/MM/yyyy HH:mm")}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] font-bold text-[#C82368] uppercase">{item.storeName}</span>
                          <span className="text-[9px] font-mono text-neutral-400">({item.trxId})</span>
                        </div>
                        {item.isDP && (
                          <Badge variant="outline" className="mt-1 w-fit text-[8px] font-bold bg-amber-50 text-amber-700 border-none">
                            TRANSAKSI DP
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase text-neutral-900">{item.customerName}</span>
                        <span className="text-[10px] font-medium text-neutral-400">{item.customerPhone}</span>
                        <span className="text-[9px] font-bold text-neutral-400 uppercase">{item.customerType}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase leading-tight text-neutral-900">{item.itemName}</span>
                        <span className="text-[9px] text-neutral-400 uppercase font-bold">{item.itemBrand} | {item.itemCategory} | {item.itemSize} - {item.itemColor}</span>
                        <span className="text-[9px] text-neutral-500 italic mt-0.5">Ket: {item.reason}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-rose-100 text-rose-700 border-none font-bold rounded-full px-3 text-[10px]">{item.quantity} PCS</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-rose-600 whitespace-nowrap">Rp {item.totalRefund.toLocaleString('id-ID')}</span>
                        <span className="text-[9px] text-neutral-400 whitespace-nowrap">@Rp {item.price.toLocaleString('id-ID')}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-neutral-400 italic text-sm">
                      Tidak ada histori retur pada periode ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
