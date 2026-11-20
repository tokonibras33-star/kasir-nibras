<<<<<<< HEAD
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
=======

"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, FileText, Calendar, Filter, Store, Clock, CreditCard } from "lucide-react";
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
<<<<<<< HEAD
import { getTrxReturnSummary, TrxReturnSummary } from "@/components/cashier/types";
=======
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68

const STORES = [
  { id: "TOKO_A", name: "NHS KWT" },
  { id: "TOKO_B", name: "IND CO" },
  { id: "TOKO_C", name: "NHS GDM" },
];

<<<<<<< HEAD
const safeFormatDate = (rawDate: any): string => {
  if (!rawDate) return "-";
  try {
    if (typeof rawDate?.toDate === "function") {
      return rawDate.toDate().toLocaleString("id-ID");
    }
    if (rawDate instanceof Date) {
      return rawDate.toLocaleString("id-ID");
    }
    if (typeof rawDate === "string" || typeof rawDate === "number") {
      return new Date(rawDate).toLocaleString("id-ID");
    }
    if (rawDate.seconds) {
      return new Date(rawDate.seconds * 1000).toLocaleString("id-ID");
    }
  } catch (e) {
    return "-";
  }
  return "-";
};

=======
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
export default function DPHistoryPage() {
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

  const dpTransactions = useMemo(() => {
    const combined = [
      ...(hA || []).map(t => ({ ...t, storeId: 'TOKO_A' })),
      ...(hB || []).map(t => ({ ...t, storeId: 'TOKO_B' })),
      ...(hC || []).map(t => ({ ...t, storeId: 'TOKO_C' })),
    ];

    return combined
<<<<<<< HEAD
      .map(trx => {
        const summary = getTrxReturnSummary(trx);
        return {
          ...trx,
          returnSummary: summary,
        };
      })
      .filter(trx => {
        // A DP transaction is currently DP, or was settled, or has originalStatus DP, or has remaining balance
        const isDP = 
          trx.status === "DP" || 
          trx.settledAt != null || 
          trx.originalStatus === "DP" || 
          Number(trx.remainingAmount || 0) > 0 || 
          (Array.isArray(trx.paymentHistory) && trx.paymentHistory.length > 1);

        const matchesStore = storeFilter === "ALL" || trx.storeId === storeFilter;
        const matchesSearch = 
          (trx.customerName || "").toLowerCase().includes(search.toLowerCase()) || 
          (trx.id || "").toLowerCase().includes(search.toLowerCase()) ||
          (trx.customerPhone || "").includes(search);
        
        return isDP && matchesStore && matchesSearch;
=======
      .filter(trx => {
        // A DP transaction is either currently status "DP" or was a DP that's now settled
        const isCurrentlyDP = trx.status === "DP";
        const wasDPButSettled = trx.settledAt != null;
        const matchesStore = storeFilter === "ALL" || trx.storeId === storeFilter;
        const matchesSearch = (trx.customerName || "").toLowerCase().includes(search.toLowerCase()) || 
                             (trx.id || "").toLowerCase().includes(search.toLowerCase());
        
        return (isCurrentlyDP || wasDPButSettled) && matchesStore && matchesSearch;
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
      })
      .sort((a, b) => {
        const dateA = a.date?.toDate?.()?.getTime() || 0;
        const dateB = b.date?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
  }, [hA, hB, hC, storeFilter, search]);

<<<<<<< HEAD
  const getStatusLabel = (trx: any): { label: string; variant: "returned" | "partial" | "dp" | "settled" } => {
    const summary: TrxReturnSummary = trx.returnSummary || getTrxReturnSummary(trx);
    if (summary.allReturned) {
      return { label: "DIRETUR PENUH", variant: "returned" };
    }
    if (summary.hasReturn) {
      if (summary.netRemaining > 0) {
        return { label: "RETUR SEBAGIAN (BELUM LUNAS)", variant: "partial" };
      }
      return { label: "RETUR SEBAGIAN (LUNAS)", variant: "settled" };
    }
    if (summary.effectiveStatus === "DP" || summary.netRemaining > 0 || trx.status === "DP") {
      return { label: "BELUM LUNAS", variant: "dp" };
    }
    return { label: "LUNAS", variant: "settled" };
  };

=======
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
  const exportPDF = () => {
    if (dpTransactions.length === 0) return;
    const docPdf = new jsPDF({ orientation: 'landscape' });
    docPdf.text(`Histori Transaksi DP - Nibras House`, 148, 10, { align: "center" });
    docPdf.text(`Periode: ${selectedMonth} | Cabang: ${storeFilter}`, 148, 16, { align: "center" });

<<<<<<< HEAD
    const tableData = dpTransactions.map(t => {
      const summary: TrxReturnSummary = t.returnSummary || getTrxReturnSummary(t);
      const statusInfo = getStatusLabel(t);
      return [
        safeFormatDate(t.date),
        t.id,
        STORES.find(s => s.id === t.storeId)?.name || t.storeId,
        t.customerName || "UMUM",
        statusInfo.label,
        `Rp ${summary.netTotal.toLocaleString('id-ID')}`,
        `Rp ${summary.netPaid.toLocaleString('id-ID')}`,
        `Rp ${summary.netRemaining.toLocaleString('id-ID')}`
      ];
    });

    (docPdf as any).autoTable({
      head: [['Waktu', 'ID TRX', 'Cabang', 'Konsumen', 'Status', 'Total Tagihan', 'Dibayar', 'Sisa Pelunasan']],
=======
    const tableData = dpTransactions.map(t => [
      t.date?.toDate().toLocaleString('id-ID'),
      t.id,
      t.customerName,
      t.status,
      `Rp ${t.total.toLocaleString('id-ID')}`,
      `Rp ${t.paidAmount.toLocaleString('id-ID')}`,
      `Rp ${t.remainingAmount.toLocaleString('id-ID')}`
    ]);

    (docPdf as any).autoTable({
      head: [['Waktu', 'ID TRX', 'Konsumen', 'Status', 'Total Tagihan', 'Dibayar', 'Sisa']],
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
      body: tableData,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12] }
    });

    docPdf.save(`histori-dp-${selectedMonth}.pdf`);
  };

  const exportExcel = () => {
    if (dpTransactions.length === 0) return;
<<<<<<< HEAD
    const headers = [
      "Waktu", 
      "ID TRX", 
      "Cabang", 
      "Konsumen", 
      "No WA", 
      "Status", 
      "Total Tagihan Net", 
      "Total Tagihan Awal", 
      "Total Refund Retur", 
      "Sudah Dibayar Net", 
      "Sisa Pelunasan"
    ];
    const data = dpTransactions.map(t => {
      const summary: TrxReturnSummary = t.returnSummary || getTrxReturnSummary(t);
      const statusInfo = getStatusLabel(t);
      return [
        safeFormatDate(t.date),
        t.id,
        STORES.find(s => s.id === t.storeId)?.name || t.storeId,
        t.customerName || "UMUM",
        t.customerPhone || "-",
        statusInfo.label,
        summary.netTotal,
        summary.originalTotal,
        summary.totalRefund,
        summary.netPaid,
        summary.netRemaining
      ];
    });
=======
    const headers = ["Waktu", "ID TRX", "Cabang", "Konsumen", "No WA", "Status", "Total Tagihan", "Sudah Dibayar", "Sisa Tagihan"];
    const data = dpTransactions.map(t => [
      t.date?.toDate().toLocaleString('id-ID'),
      t.id,
      STORES.find(s => s.id === t.storeId)?.name,
      t.customerName,
      t.customerPhone,
      t.status,
      t.total,
      t.paidAmount,
      t.remainingAmount
    ]);
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DP");
    XLSX.writeFile(wb, `histori-dp-${selectedMonth}.xlsx`);
  };

<<<<<<< HEAD
  const dpStats = useMemo(() => {
    return dpTransactions.reduce(
      (acc, trx) => {
        const summary: TrxReturnSummary = trx.returnSummary || getTrxReturnSummary(trx);
        acc.totalTagihan += summary.netTotal;
        acc.totalBayar += summary.netPaid;
        acc.totalSisa += summary.netRemaining;
        return acc;
      },
      { totalTagihan: 0, totalBayar: 0, totalSisa: 0 }
    );
  }, [dpTransactions]);

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Down Payment Tracker</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">Histori Transaksi DP</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Monitoring piutang, pelunasan, dan penyesuaian retur DP konsumen.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportExcel} className="flex-1 sm:flex-none h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50">
            <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> EXCEL
          </Button>
          <Button variant="outline" onClick={exportPDF} className="flex-1 sm:flex-none h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50">
            <FileText className="h-3.5 w-3.5 mr-1.5 text-[#C82368]" /> PDF A4
=======
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary uppercase flex items-center gap-3">
            <Clock className="h-8 w-8 text-orange-600" /> Histori Transaksi DP
          </h1>
          <p className="text-muted-foreground text-sm">Monitoring piutang dan pelunasan uang muka konsumen.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportExcel} className="flex-1 sm:flex-none h-11 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Download className="h-4 w-4 mr-2" /> EXCEL
          </Button>
          <Button variant="outline" onClick={exportPDF} className="flex-1 sm:flex-none h-11 rounded-xl font-bold border-orange-200 text-orange-700 hover:bg-orange-50">
            <FileText className="h-4 w-4 mr-2" /> PDF A4
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
          </Button>
        </div>
      </div>

<<<<<<< HEAD
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/70">
        <div className="space-y-1">
          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Pilih Bulan</Label>
=======
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl soft-shadow border">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pilih Bulan</Label>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
          <Input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
<<<<<<< HEAD
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
          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Cari Konsumen / ID TRX</Label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
=======
            className="h-12 rounded-2xl bg-slate-50 border-none font-black text-sm" 
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cabang Toko</Label>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none font-black text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="ALL" className="font-bold">SEMUA TOKO</SelectItem>
              {STORES.map(s => <SelectItem key={s.id} value={s.id} className="font-bold">{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cari Konsumen / ID TRX</Label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
            <Input 
              placeholder="Nama atau ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
<<<<<<< HEAD
              className="h-9 pl-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-medium text-[11px] sm:text-xs" 
=======
              className="h-12 pl-11 rounded-2xl bg-slate-50 border-none font-bold text-sm" 
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
            />
          </div>
        </div>
      </div>

<<<<<<< HEAD
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="bg-neutral-950 text-white rounded-2xl sm:rounded-3xl border-none shadow-sm p-2.5 sm:p-5">
          <p className="text-[8px] sm:text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-0.5 truncate">Tagihan DP</p>
          <p className="text-xs sm:text-xl md:text-2xl font-serif font-bold truncate">Rp {dpStats.totalTagihan.toLocaleString('id-ID')}</p>
        </Card>
        <Card className="bg-white text-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/70 shadow-sm p-2.5 sm:p-5">
          <p className="text-[8px] sm:text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-0.5 truncate">Sudah Bayar</p>
          <p className="text-xs sm:text-xl md:text-2xl font-serif font-bold text-emerald-700 truncate">Rp {dpStats.totalBayar.toLocaleString('id-ID')}</p>
        </Card>
        <Card className="bg-amber-600 text-white rounded-2xl sm:rounded-3xl border-none shadow-sm p-2.5 sm:p-5">
          <p className="text-[8px] sm:text-[10px] uppercase font-bold text-amber-100 tracking-wider mb-0.5 truncate">Sisa Piutang</p>
          <p className="text-xs sm:text-xl md:text-2xl font-serif font-bold truncate">Rp {dpStats.totalSisa.toLocaleString('id-ID')}</p>
        </Card>
      </div>

      <Card className="border border-neutral-200/70 shadow-sm bg-white rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {/* Mobile Compact Cards (Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {dpTransactions.length > 0 ? dpTransactions.map((trx, idx) => {
              const summary: TrxReturnSummary = trx.returnSummary || getTrxReturnSummary(trx);
              const statusInfo = getStatusLabel(trx);
              return (
                <div key={trx.id || idx} className="p-3 space-y-2 hover:bg-[#F5F3F0]/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-mono font-bold text-[#C82368]">{trx.id}</span>
                        <Badge variant="outline" className="text-[8px] font-bold border-none bg-[#F5F3F0] text-neutral-700 rounded-full px-2 py-0 h-4">
                          {STORES.find(s => s.id === trx.storeId)?.name}
                        </Badge>
                      </div>
                      <p className="text-[9px] text-neutral-400 mt-0.5">{safeFormatDate(trx.date)}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1 shrink-0">
                      {statusInfo.variant === "returned" && (
                        <Badge variant="outline" className="text-[8px] font-bold rounded-full px-2 border-none bg-rose-100 text-rose-700">DIRETUR</Badge>
                      )}
                      {statusInfo.variant === "partial" && (
                        <>
                          <Badge variant="outline" className="text-[8px] font-bold rounded-full px-2 border-none bg-rose-100 text-rose-700">RETUR</Badge>
                          <Badge variant="outline" className="text-[8px] font-bold rounded-full px-2 border-none bg-amber-100 text-amber-800">BELUM LUNAS</Badge>
                        </>
                      )}
                      {statusInfo.variant === "dp" && (
                        <Badge variant="outline" className="text-[8px] font-bold rounded-full px-2 border-none bg-amber-100 text-amber-800">BELUM LUNAS</Badge>
                      )}
                      {statusInfo.variant === "settled" && (
                        <>
                          {summary.hasReturn && <Badge variant="outline" className="text-[8px] font-bold rounded-full px-2 border-none bg-rose-100 text-rose-700">RETUR</Badge>}
                          <Badge variant="outline" className="text-[8px] font-bold rounded-full px-2 border-none bg-emerald-100 text-emerald-700">LUNAS</Badge>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-neutral-900">{trx.customerName || "UMUM"} <span className="text-[10px] font-normal text-neutral-400">({trx.customerPhone || "-"})</span></p>
                    <div className="mt-1 space-y-0.5">
                      {(trx.items || []).map((item: any, i: number) => {
                        const key = `${item.productId}-${item.variantId}`;
                        const returnedCount = summary.returnedQtyMap[key] || 0;
                        return (
                          <p key={i} className="text-[10px] leading-tight text-neutral-600">
                            <span className={cn("font-semibold uppercase", returnedCount >= (item.quantity || 1) ? "line-through text-neutral-400" : "text-neutral-800")}>{item.name}</span>
                            <span className="text-neutral-400"> ({item.quantity}x {item.size})</span>
                            {returnedCount > 0 && <span className="text-rose-600 font-bold ml-1">(Retur: {returnedCount})</span>}
                          </p>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 bg-[#F5F3F0]/80 rounded-xl p-2">
                    <div className="min-w-0">
                      <p className="text-[8px] font-bold uppercase text-neutral-400">Tagihan</p>
                      <p className="text-[10px] font-bold text-neutral-900 truncate">Rp {summary.netTotal.toLocaleString('id-ID')}</p>
                      {summary.hasReturn && <p className="text-[8px] text-neutral-400 line-through truncate">Rp {summary.originalTotal.toLocaleString('id-ID')}</p>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-bold uppercase text-neutral-400">Dibayar</p>
                      <p className="text-[10px] font-bold text-emerald-700 truncate">Rp {summary.netPaid.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-[8px] font-bold uppercase text-neutral-400">Sisa</p>
                      <p className={cn("text-[10px] font-bold truncate", summary.netRemaining > 0 ? "text-amber-600" : "text-neutral-400")}>Rp {summary.netRemaining.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-xs text-neutral-400 italic">Tidak ada histori transaksi DP pada periode ini.</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white">
                <TableRow className="border-none hover:bg-neutral-950">
                  <TableHead className="pl-6 text-[10px] font-bold uppercase tracking-widest py-4 text-neutral-300">ID Transaksi</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Konsumen &amp; WA</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">Rincian Barang</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-neutral-300">Total Tagihan</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest text-neutral-300">Sudah Bayar</TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-widest pr-6 text-neutral-300">Sisa Pelunasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dpTransactions.length > 0 ? dpTransactions.map((trx, idx) => {
                  const summary: TrxReturnSummary = trx.returnSummary || getTrxReturnSummary(trx);
                  const statusInfo = getStatusLabel(trx);
                  return (
                    <TableRow key={trx.id || idx} className="hover:bg-[#F5F3F0]/60 transition-colors border-b border-neutral-100">
                      <TableCell className="pl-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono font-bold text-[#C82368] whitespace-nowrap">{trx.id}</span>
                          <span className="text-[10px] font-medium text-neutral-400 whitespace-nowrap">{safeFormatDate(trx.date)}</span>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {statusInfo.variant === "returned" && (
                              <Badge variant="outline" className="text-[9px] font-bold rounded-full px-3 border-none bg-rose-100 text-rose-700">
                                DIRETUR
                              </Badge>
                            )}
                            {statusInfo.variant === "partial" && (
                              <>
                                <Badge variant="outline" className="text-[9px] font-bold rounded-full px-2.5 border-none bg-rose-100 text-rose-700">
                                  RETUR SEBAGIAN
                                </Badge>
                                <Badge variant="outline" className="text-[9px] font-bold rounded-full px-2.5 border-none bg-amber-100 text-amber-800">
                                  BELUM LUNAS
                                </Badge>
                              </>
                            )}
                            {statusInfo.variant === "dp" && (
                              <Badge variant="outline" className="text-[9px] font-bold rounded-full px-3 border-none bg-amber-100 text-amber-800">
                                BELUM LUNAS
                              </Badge>
                            )}
                            {statusInfo.variant === "settled" && (
                              <>
                                {summary.hasReturn && (
                                  <Badge variant="outline" className="text-[9px] font-bold rounded-full px-2.5 border-none bg-rose-100 text-rose-700">
                                    RETUR
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-[9px] font-bold rounded-full px-3 border-none bg-emerald-100 text-emerald-700">
                                  LUNAS
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold uppercase text-neutral-900">{trx.customerName || "UMUM"}</span>
                          <span className="text-[10px] font-medium text-neutral-400">{trx.customerPhone || "-"}</span>
                          <span className="text-[9px] font-bold text-neutral-500 uppercase mt-0.5">{STORES.find(s => s.id === trx.storeId)?.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 max-w-[250px]">
                          {(trx.items || []).map((item: any, i: number) => {
                            const key = `${item.productId}-${item.variantId}`;
                            const returnedCount = summary.returnedQtyMap[key] || 0;
                            return (
                              <div key={i} className="text-[10px] leading-tight">
                                <span className={cn("font-bold uppercase", returnedCount >= (item.quantity || 1) ? "line-through text-neutral-400" : "text-neutral-800")}>
                                  {item.name}
                                </span>
                                <span className="text-neutral-400"> ({item.quantity}x {item.size})</span>
                                {returnedCount > 0 && (
                                  <span className="text-rose-600 font-bold ml-1 text-[9px]">(Retur: {returnedCount})</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold text-xs whitespace-nowrap text-neutral-700">
                        {summary.hasReturn ? (
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-bold text-neutral-900">Rp {summary.netTotal.toLocaleString('id-ID')}</span>
                            <span className="text-[10px] text-neutral-400 line-through">Rp {summary.originalTotal.toLocaleString('id-ID')}</span>
                            <span className="text-[9px] text-rose-600 font-semibold">-Rp {summary.totalRefund.toLocaleString('id-ID')}</span>
                          </div>
                        ) : (
                          <span>Rp {summary.netTotal.toLocaleString('id-ID')}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-bold text-emerald-700 text-xs whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span>Rp {summary.netPaid.toLocaleString('id-ID')}</span>
                          {summary.refundFromPaid > 0 && (
                            <span className="text-[9px] text-rose-600 font-semibold">Refund: Rp {summary.refundFromPaid.toLocaleString('id-ID')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6 whitespace-nowrap">
                        <span className={cn("text-sm font-bold", summary.netRemaining > 0 ? "text-amber-600" : "text-neutral-300")}>
                          Rp {summary.netRemaining.toLocaleString('id-ID')}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-neutral-400 italic text-sm">
=======
      <Card className="border-none soft-shadow rounded-[2rem] overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-orange-50/50">
                <TableRow className="border-none">
                  <TableHead className="pl-6 text-[10px] font-black uppercase py-4">ID Transaksi</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Konsumen & WA</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Rincian Barang</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Total Tagihan</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase">Sudah Bayar</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase pr-6">Sisa Pelunasan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dpTransactions.length > 0 ? dpTransactions.map((trx, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-primary">{trx.id}</span>
                        <span className="text-[9px] font-bold text-slate-400">{trx.date?.toDate().toLocaleString('id-ID')}</span>
                        <Badge variant="outline" className={cn("mt-1 text-[8px] font-black border-none w-fit", trx.status === 'DP' ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>
                          {trx.status === 'DP' ? 'BELUM LUNAS' : 'LUNAS'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase">{trx.customerName || "UMUM"}</span>
                        <span className="text-[10px] font-medium text-slate-400">{trx.customerPhone || "-"}</span>
                        <span className="text-[8px] font-black text-slate-300 uppercase">{STORES.find(s => s.id === trx.storeId)?.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 max-w-[250px]">
                        {trx.items?.map((item: any, i: number) => (
                          <div key={i} className="text-[10px] leading-tight">
                            <span className="font-bold uppercase">{item.name}</span>
                            <span className="text-slate-400"> ({item.quantity}x {item.size})</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-xs">
                      Rp {trx.total.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right font-black text-emerald-600 text-xs">
                      Rp {trx.paidAmount.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span className={cn("text-sm font-black", trx.remainingAmount > 0 ? "text-orange-600" : "text-slate-300")}>
                        Rp {trx.remainingAmount.toLocaleString('id-ID')}
                      </span>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center text-slate-400 italic text-sm">
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                      Tidak ada histori transaksi DP pada periode ini.
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
