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
import { getTrxReturnSummary, TrxReturnSummary } from "@/components/cashier/types";

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

    // Fungsi pemroses transaksi dengan penyesuaian retur terstandar
    const processTransactions = (list: any[], storeId: string) => {
      (list || []).forEach(t => {
        const retSummary = getTrxReturnSummary(t);
        summary[storeId].income += retSummary.netTotal;
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
    processLogs(logsA || [], "TOKO_A"); 
    processLogs(logsB || [], "TOKO_B"); 
    processLogs(logsC || [], "TOKO_C");
    
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row) => (
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
                        Rp {row.margin.toLocaleString('id-ID')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
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
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
