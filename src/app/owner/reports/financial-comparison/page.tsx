"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Search, 
  Download, 
  FileSpreadsheet, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Wallet, 
  Building2, 
  Store, 
  PieChart, 
  Info,
  ShoppingCart,
  ArrowDownToLine
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, Timestamp } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
<<<<<<< HEAD
import { getTrxReturnSummary, TrxReturnSummary } from "@/components/cashier/types";
=======
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68

export default function FinancialComparisonReportPage() {
  const db = useFirestore();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [storeFilter, setStoreFilter] = useState("ALL");

  // 1. Fetch Penjualan dari semua cabang
  const trxQueryA = useMemoFirebase(() => {
    const [year, month] = selectedMonth.split("-");
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    return query(collection(db, "stores", "TOKO_A", "transactions"), where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)));
  }, [db, selectedMonth]);

  const trxQueryB = useMemoFirebase(() => {
    const [year, month] = selectedMonth.split("-");
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    return query(collection(db, "stores", "TOKO_B", "transactions"), where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)));
  }, [db, selectedMonth]);

  const trxQueryC = useMemoFirebase(() => {
    const [year, month] = selectedMonth.split("-");
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    return query(collection(db, "stores", "TOKO_C", "transactions"), where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)));
  }, [db, selectedMonth]);

  const { data: trxKWT } = useCollection<any>(trxQueryA);
  const { data: trxIND } = useCollection<any>(trxQueryB);
  const { data: trxGDM } = useCollection<any>(trxQueryC);

  // 2. Fetch Belanja (Stock Entries)
  const entriesQuery = useMemoFirebase(() => collection(db, "stockEntries"), [db]);
  const { data: entriesData } = useCollection<any>(entriesQuery);

  // 3. Fetch Pengeluaran Operasional
  const expQueryA = useMemoFirebase(() => collection(db, "stores", "TOKO_A", "cashLogs"), [db]);
  const expQueryB = useMemoFirebase(() => collection(db, "stores", "TOKO_B", "cashLogs"), [db]);
  const expQueryC = useMemoFirebase(() => collection(db, "stores", "TOKO_C", "cashLogs"), [db]);
  const expQueryOwner = useMemoFirebase(() => collection(db, "ownerExpenses"), [db]);

  const { data: logsA } = useCollection<any>(expQueryA);
  const { data: logsB } = useCollection<any>(expQueryB);
  const { data: logsC } = useCollection<any>(expQueryC);
  const { data: logsOwner } = useCollection<any>(expQueryOwner);

  const reportData = useMemo(() => {
    const summary: Record<string, any> = {
      TOKO_A: { name: "NHS KWT", income: 0, cogs: 0, ops: 0 },
      TOKO_B: { name: "IND CO", income: 0, cogs: 0, ops: 0 },
      TOKO_C: { name: "NHS GDM", income: 0, cogs: 0, ops: 0 },
      OWNER: { name: "OWNER PUSAT", income: 0, cogs: 0, ops: 0 }
    };

<<<<<<< HEAD
    // Fungsi pemroses transaksi dengan penyesuaian retur terstandar
    const processTransactions = (list: any[], storeId: string) => {
      (list || []).forEach(t => {
        const retSummary = getTrxReturnSummary(t);
        summary[storeId].income += retSummary.netTotal;
=======
    // Fungsi pembantu untuk memproses transaksi (dengan pengurangan retur jika ada)
    const processTransactions = (list: any[], storeId: string) => {
      (list || []).forEach(t => {
        let netTotal = Number(t.total || 0);
        
        // JIKA ADA RETUR: Kurangi pemasukan dengan nilai barang yang dikembalikan
        if (t.returnLog && t.returnLog.items) {
          const returnAmount = t.returnLog.items.reduce((sum: number, item: any) => {
            return sum + (Number(item.price || 0) * Number(item.quantity || 0));
          }, 0);
          netTotal -= returnAmount;
        }
        
        summary[storeId].income += netTotal;
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
      });
    };

    // Proses Pemasukan per Cabang
    processTransactions(trxKWT || [], "TOKO_A");
    processTransactions(trxIND || [], "TOKO_B");
    processTransactions(trxGDM || [], "TOKO_C");

    // Proses Belanja (HPP) - Berdasarkan invoiceDate di stockEntries
    (entriesData || []).forEach(entry => {
      if (entry.invoiceDate && entry.invoiceDate.startsWith(selectedMonth)) {
        (entry.items || []).forEach((item: any) => {
          const cost = Number(item.buyPrice || 0) * Number(item.stock || 0);
          if (summary[item.targetStore]) {
            summary[item.targetStore].cogs += cost;
          }
        });
      }
    });

    // Proses Pengeluaran Operasional
    const processLogs = (logs: any[], storeId: string) => {
      logs?.forEach(log => {
        if (log.id.startsWith(selectedMonth) && log.pengeluaran) {
          log.pengeluaran.forEach((e: any) => { summary[storeId].ops += Number(e.amount || 0); });
        }
      });
    };
<<<<<<< HEAD
    processLogs(logsA || [], "TOKO_A"); 
    processLogs(logsB || [], "TOKO_B"); 
    processLogs(logsC || [], "TOKO_C");
=======
    processLogs(logsA || [], "TOKO_A"); processLogs(logsB || [], "TOKO_B"); processLogs(logsC || [], "TOKO_C");
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
    
    logsOwner?.forEach(log => {
      if (log.id.startsWith(selectedMonth) && log.expenses) {
        log.expenses.forEach((e: any) => { summary.OWNER.ops += Number(e.amount || 0); });
      }
    });

    let result = Object.entries(summary).map(([id, data]) => ({
      id,
      ...data,
      margin: data.income - data.cogs - data.ops
    }));

    if (storeFilter !== "ALL") {
      result = result.filter(r => r.id === storeFilter);
    }

    return result;
  }, [trxKWT, trxIND, trxGDM, entriesData, logsA, logsB, logsC, logsOwner, selectedMonth, storeFilter]);

<<<<<<< HEAD
  const grandTotals = useMemo(() => {
    return reportData.reduce((acc, curr) => ({
      income: acc.income + curr.income,
      cogs: acc.cogs + curr.cogs,
      ops: acc.ops + curr.ops,
      margin: acc.margin + curr.margin,
    }), { income: 0, cogs: 0, ops: 0, margin: 0 });
  }, [reportData]);

  const handleExportExcel = () => {
    const headers = ["Entitas / Toko", "Total Penjualan Net (Omzet)", "Total Belanja (HPP Masuk)", "Pengeluaran Operasional", "Laba / Rugi Bersih"];
    const rows = reportData.map(r => [r.name, r.income, r.cogs, r.ops, r.margin]);
    rows.push(["TOTAL KONSOLIDASI", grandTotals.income, grandTotals.cogs, grandTotals.ops, grandTotals.margin]);
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Perbandingan Keuangan");
    XLSX.writeFile(wb, `laporan-perbandingan-keuangan-${selectedMonth}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text("Laporan Perbandingan Keuangan Konsolidasi - Nibras House", 148, 12, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Periode: ${selectedMonth} | Cabang: ${storeFilter}`, 148, 18, { align: "center" });

    const rows = reportData.map(r => [
      r.name,
      `Rp ${r.income.toLocaleString('id-ID')}`,
      `Rp ${r.cogs.toLocaleString('id-ID')}`,
      `Rp ${r.ops.toLocaleString('id-ID')}`,
      `Rp ${r.margin.toLocaleString('id-ID')}`,
    ]);

    rows.push([
      "TOTAL KONSOLIDASI",
      `Rp ${grandTotals.income.toLocaleString('id-ID')}`,
      `Rp ${grandTotals.cogs.toLocaleString('id-ID')}`,
      `Rp ${grandTotals.ops.toLocaleString('id-ID')}`,
      `Rp ${grandTotals.margin.toLocaleString('id-ID')}`,
    ]);

    (doc as any).autoTable({
      head: [['Entitas / Toko', 'Penjualan Net (Omzet)', 'Belanja Stok (HPP)', 'Biaya Operasional', 'Laba / Rugi Bersih']],
      body: rows,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [31, 122, 99] }
    });

    doc.save(`laporan-perbandingan-keuangan-${selectedMonth}.pdf`);
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Financial Performance</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">Perbandingan Keuangan</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Komparasi menyeluruh Omzet Net, Belanja (HPP), dan Beban Operasional per Cabang.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportExcel} className="h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> EXCEL
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none">
            <FileText className="h-3.5 w-3.5 mr-1.5 text-[#C82368]" /> PDF A4
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-2 sm:flex sm:items-end gap-2.5 sm:gap-3.5 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/70">
        <div className="w-full sm:w-auto space-y-1">
          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Pilih Periode</Label>
          <Input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
            className="w-full sm:w-44 h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5" 
          />
        </div>
        <div className="w-full sm:w-auto space-y-1">
          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Filter Cabang</Label>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="w-full sm:w-44 h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="ALL" className="font-bold text-xs">SEMUA CABANG</SelectItem>
              <SelectItem value="TOKO_A" className="font-bold text-xs">NHS KWT</SelectItem>
              <SelectItem value="TOKO_B" className="font-bold text-xs">IND CO</SelectItem>
              <SelectItem value="TOKO_C" className="font-bold text-xs">NHS GDM</SelectItem>
              <SelectItem value="OWNER" className="font-bold text-xs">OWNER PUSAT</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="border-none shadow-sm bg-neutral-950 text-white rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-3.5 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider mb-0.5 flex items-center gap-1 truncate">
              <DollarSign className="h-3 w-3 text-emerald-500 shrink-0" /> Penjualan (Net)
            </p>
            <CardTitle className="text-sm sm:text-xl md:text-2xl font-serif truncate">Rp {grandTotals.income.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card className="border-none shadow-sm bg-[#C82368] text-white rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-3.5 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase text-white/75 tracking-wider mb-0.5 flex items-center gap-1 truncate">
              <ShoppingCart className="h-3 w-3 text-white shrink-0" /> Belanja (HPP)
            </p>
            <CardTitle className="text-sm sm:text-xl md:text-2xl font-serif truncate">Rp {grandTotals.cogs.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border border-neutral-200/70 shadow-sm bg-white text-neutral-900 rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-3.5 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider mb-0.5 flex items-center gap-1 truncate">
              <ArrowDownToLine className="h-3 w-3 text-rose-500 shrink-0" /> Biaya Ops
            </p>
            <CardTitle className="text-sm sm:text-xl md:text-2xl font-serif text-rose-600 truncate">Rp {grandTotals.ops.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>

        <Card className="border border-neutral-200/70 shadow-sm bg-white text-neutral-900 rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-3.5 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider mb-0.5 flex items-center gap-1 truncate">
              <TrendingUp className="h-3 w-3 text-emerald-600 shrink-0" /> Laba / Rugi
            </p>
            <CardTitle className={cn("text-sm sm:text-xl md:text-2xl font-serif truncate", grandTotals.margin >= 0 ? "text-emerald-700" : "text-rose-600")}>
              Rp {grandTotals.margin.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Table Data */}
      <Card className="border border-neutral-200/70 shadow-sm bg-white rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {/* Mobile Compact Cards (Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {reportData.map((row) => (
              <div key={row.id} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-[#F5F3F0]"><Store className="h-3.5 w-3.5 text-neutral-700" /></div>
                    <span className="font-bold text-xs text-neutral-900">{row.name}</span>
                  </div>
                  <span className={cn("font-bold text-xs", row.margin >= 0 ? "text-emerald-700" : "text-rose-600")}>
                    Laba: Rp {row.margin.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-[#F5F3F0]/80 rounded-xl p-2">
                  <div className="min-w-0"><p className="text-[8px] font-bold uppercase text-neutral-400">Omzet</p><p className="text-[10px] font-bold text-neutral-900 truncate">Rp {row.income.toLocaleString('id-ID')}</p></div>
                  <div className="min-w-0"><p className="text-[8px] font-bold uppercase text-neutral-400">Belanja HPP</p><p className="text-[10px] font-bold text-neutral-700 truncate">Rp {row.cogs.toLocaleString('id-ID')}</p></div>
                  <div className="min-w-0 text-right"><p className="text-[8px] font-bold uppercase text-neutral-400">Beban Ops</p><p className="text-[10px] font-bold text-rose-600 truncate">Rp {row.ops.toLocaleString('id-ID')}</p></div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white">
                <TableRow className="text-[10px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                  <TableHead className="pl-6 text-neutral-300">Entitas / Toko</TableHead>
                  <TableHead className="text-right text-neutral-300">Penjualan Net (Omzet)</TableHead>
                  <TableHead className="text-right text-neutral-300">Belanja Stok (HPP)</TableHead>
                  <TableHead className="text-right text-neutral-300">Beban Operasional</TableHead>
                  <TableHead className="text-right pr-6 text-neutral-300">Laba / Rugi Bersih</TableHead>
=======
  const totals = useMemo(() => {
    return reportData.reduce((acc, i) => {
      acc.income += i.income;
      acc.cogs += i.cogs;
      acc.ops += i.ops;
      acc.margin += i.margin;
      return acc;
    }, { income: 0, cogs: 0, ops: 0, margin: 0 });
  }, [reportData]);

  const exportExcel = () => {
    const headers = ["Nama Toko", "Pemasukan", "Total Belanja", "Operasional", "Margin Bersih"];
    const data = reportData.map(r => [r.name, r.income, r.cogs, r.ops, r.margin]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financial");
    XLSX.writeFile(wb, `lap-keuangan-${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary uppercase">Laporan Perbandingan Keuangan</h1>
          <p className="text-muted-foreground text-sm">Analisis profitabilitas bulanan berdasarkan Pemasukan, Belanja, dan Biaya.</p>
        </div>
        <Button variant="outline" onClick={exportExcel} className="h-11 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50">
          <Download className="h-4 w-4 mr-2" /> EXCEL
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl soft-shadow border">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pilih Bulan</Label>
          <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-12 rounded-2xl bg-slate-50 border-none font-black text-sm" />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Filter Toko</Label>
          <Select value={storeFilter} onValueChange={setStoreFilter}>
            <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-none font-black text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="ALL" className="font-bold">SEMUA TOKO</SelectItem>
              <SelectItem value="TOKO_A" className="font-bold">NHS KWT</SelectItem>
              <SelectItem value="TOKO_B" className="font-bold">IND CO</SelectItem>
              <SelectItem value="TOKO_C" className="font-bold">NHS GDM</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end pb-1">
          <Badge className="bg-primary/10 text-primary border-none px-4 py-2 rounded-xl font-black text-[10px] tracking-widest">REAL-TIME SYNC</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard title="Pemasukan" value={totals.income} icon={DollarSign} color="emerald" />
        <SummaryCard title="Total Belanja" value={totals.cogs} icon={ShoppingCart} color="amber" />
        <SummaryCard title="Operasional" value={totals.ops} icon={ArrowDownToLine} color="rose" />
        <SummaryCard title="Margin Bersih" value={totals.margin} icon={TrendingUp} color="primary" />
      </div>

      <Card className="rounded-[2.5rem] border-none soft-shadow bg-white overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm">
                <TableRow className="border-none">
                  <TableHead className="pl-10 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Nama Toko / Unit</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Pemasukan (Sales)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total Belanja (HPP)</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Pengeluaran Ops</TableHead>
                  <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Margin Bersih</TableHead>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row) => (
<<<<<<< HEAD
                  <TableRow key={row.id} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 text-xs">
                    <TableCell className="pl-6 py-4 font-bold text-neutral-900 flex items-center gap-2">
                      <div className="p-2 rounded-full bg-[#F5F3F0]"><Store className="h-4 w-4 text-neutral-700" /></div>
                      <div>
                        <p className="font-bold">{row.name}</p>
                        <p className="text-[10px] text-neutral-400 uppercase font-medium">{row.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-neutral-900 whitespace-nowrap">
                      Rp {row.income.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-neutral-700 whitespace-nowrap">
                      Rp {row.cogs.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-rose-600 whitespace-nowrap">
                      Rp {row.ops.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right pr-6 whitespace-nowrap">
                      <span className={cn("font-bold text-sm", row.margin >= 0 ? "text-emerald-700" : "text-rose-600")}>
=======
                  <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-none">
                    <TableCell className="pl-10 py-6">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-2.5 rounded-xl", row.id === 'OWNER' ? "bg-slate-800 text-white" : "bg-primary/10 text-primary")}>
                          {row.id === 'OWNER' ? <Building2 className="h-4 w-4" /> : <Store className="h-4 w-4" />}
                        </div>
                        <span className="font-black text-sm uppercase tracking-tight">{row.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-600">Rp {row.income.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-bold text-amber-600">Rp {row.cogs.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-bold text-rose-600">Rp {row.ops.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right pr-10">
                      <span className={cn("text-base font-black tracking-tight", row.margin >= 0 ? "text-primary" : "text-rose-600")}>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                        Rp {row.margin.toLocaleString('id-ID')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
<<<<<<< HEAD
              <TableFooter className="bg-[#F5F3F0] border-t border-neutral-200 font-bold uppercase text-[10px]">
                <TableRow>
                  <TableCell className="pl-6 py-4 text-neutral-500 tracking-widest">Total Konsolidasi</TableCell>
                  <TableCell className="text-right text-base font-serif text-neutral-900 whitespace-nowrap">
                    Rp {grandTotals.income.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right text-base font-serif text-neutral-700 whitespace-nowrap">
                    Rp {grandTotals.cogs.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right text-base font-serif text-rose-600 whitespace-nowrap">
                    Rp {grandTotals.ops.toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell className="text-right pr-6 text-base font-serif whitespace-nowrap">
                    <span className={cn(grandTotals.margin >= 0 ? "text-emerald-700" : "text-rose-600")}>
                      Rp {grandTotals.margin.toLocaleString('id-ID')}
                    </span>
                  </TableCell>
=======
              <TableFooter className="bg-primary/5">
                <TableRow className="border-none">
                  <TableCell className="pl-10 py-6 font-black uppercase text-xs">Total Konsolidasi</TableCell>
                  <TableCell className="text-right font-black text-emerald-600">Rp {totals.income.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right font-black text-amber-600">Rp {totals.cogs.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right font-black text-rose-600">Rp {totals.ops.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right pr-10 font-black text-xl text-primary">Rp {totals.margin.toLocaleString('id-ID')}</TableCell>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
<<<<<<< HEAD
    </div>
  );
}
=======
      
      <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
        <Info className="h-5 w-5 text-slate-400 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Catatan Penting:</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Laporan ini berbeda dengan Arus Kas. Laporan ini fokus membandingkan **Omzet Penjualan (Net)** dengan **Total Belanja (HPP)** yang dilakukan pada bulan terpilih berdasarkan Riwayat Input Stok, serta dikurangi pengeluaran operasional. Gunakan laporan ini untuk memantau performa bisnis murni dalam periode satu bulan.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    primary: "bg-primary text-white shadow-primary/20",
    emerald: "bg-emerald-600 text-white shadow-emerald-600/20",
    rose: "bg-rose-600 text-white shadow-rose-600/20",
    amber: "bg-amber-600 text-white shadow-amber-600/20",
  };
  return (
    <Card className={cn("rounded-[2rem] border-none shadow-xl group hover:scale-[1.02] transition-transform", colorMap[color])}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm group-hover:rotate-6 transition-all">
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
        <h3 className="text-lg md:text-xl font-black truncate">Rp {value.toLocaleString('id-ID')}</h3>
      </CardContent>
    </Card>
  );
}
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
