"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, FileSpreadsheet, FileText, TrendingUp, TrendingDown, DollarSign, Wallet, ArrowUpCircle, ArrowDownCircle, PieChart } from "lucide-react";
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
import { getTrxReturnSummary, TrxReturnSummary } from "@/components/cashier/types";
=======
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68

export default function CashFlowReportPage() {
  const db = useFirestore();
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("monthly");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const getTrxQuery = (storeId: string) => {
    let q = collection(db, "stores", storeId, "transactions");
    if (filterMode === "daily") {
      const start = new Date(selectedDate); start.setHours(0, 0, 0, 0);
      const end = new Date(selectedDate); end.setHours(23, 59, 59, 999);
      return query(q, where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)));
    } else {
      const [year, month] = selectedMonth.split("-");
      const firstDay = new Date(parseInt(year), parseInt(month) - 1, 1);
      const lastDay = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      return query(q, where("date", ">=", Timestamp.fromDate(firstDay)), where("date", "<=", Timestamp.fromDate(lastDay)));
    }
  };

  const qA = useMemoFirebase(() => getTrxQuery("TOKO_A"), [db, filterMode, selectedDate, selectedMonth]);
  const qB = useMemoFirebase(() => getTrxQuery("TOKO_B"), [db, filterMode, selectedDate, selectedMonth]);
  const qC = useMemoFirebase(() => getTrxQuery("TOKO_C"), [db, filterMode, selectedDate, selectedMonth]);

  const { data: trxA } = useCollection<any>(qA);
  const { data: trxB } = useCollection<any>(qB);
  const { data: trxC } = useCollection<any>(qC);

  const expQueryA = useMemoFirebase(() => collection(db, "stores", "TOKO_A", "cashLogs"), [db]);
  const expQueryB = useMemoFirebase(() => collection(db, "stores", "TOKO_B", "cashLogs"), [db]);
  const expQueryC = useMemoFirebase(() => collection(db, "stores", "TOKO_C", "cashLogs"), [db]);
  const expQueryOwner = useMemoFirebase(() => collection(db, "ownerExpenses"), [db]);

  const { data: logsA } = useCollection<any>(expQueryA);
  const { data: logsB } = useCollection<any>(expQueryB);
  const { data: logsC } = useCollection<any>(expQueryC);
  const { data: logsOwner } = useCollection<any>(expQueryOwner);

  const flowData = useMemo(() => {
    const summary: Record<string, any> = {
      TOKO_A: { name: "NHS KWT", income: 0, margin: 0, expenses: 0 },
      TOKO_B: { name: "IND CO", income: 0, margin: 0, expenses: 0 },
      TOKO_C: { name: "NHS GDM", income: 0, margin: 0, expenses: 0 },
      OWNER: { name: "OWNER PUSAT", income: 0, margin: 0, expenses: 0 }
    };

    const processTrx = (list: any[], storeId: string) => {
      list?.forEach(t => {
<<<<<<< HEAD
        const retSummary = getTrxReturnSummary(t);
        summary[storeId].income += retSummary.netTotal;

        // Buy cost (HPP) dihitung hanya untuk barang yang tidak diretur
        const buyCost = (retSummary.returnableItems || []).reduce((s: number, i: any) => {
          return s + (Number(i.buyPrice || 0) * Number(i.quantity || 0));
        }, 0);

        summary[storeId].margin += (retSummary.netTotal - buyCost);
      });
    };
    processTrx(trxA || [], "TOKO_A"); 
    processTrx(trxB || [], "TOKO_B"); 
    processTrx(trxC || [], "TOKO_C");
=======
        summary[storeId].income += (t.total || 0);
        const buyCost = (t.items || []).reduce((s: number, i: any) => s + (i.buyPrice * i.quantity), 0);
        summary[storeId].margin += (t.total - buyCost);
      });
    };
    processTrx(trxA || [], "TOKO_A"); processTrx(trxB || [], "TOKO_B"); processTrx(trxC || [], "TOKO_C");
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68

    const filterId = filterMode === "daily" ? selectedDate : selectedMonth;
    const processLogs = (logs: any[], storeId: string) => {
      logs?.forEach(log => {
        if (log.id.startsWith(filterId) && log.pengeluaran) {
<<<<<<< HEAD
          log.pengeluaran.forEach((e: any) => { summary[storeId].expenses += Number(e.amount || 0); });
        }
      });
    };
    processLogs(logsA || [], "TOKO_A"); 
    processLogs(logsB || [], "TOKO_B"); 
    processLogs(logsC || [], "TOKO_C");

    logsOwner?.forEach(log => {
      if (log.id.startsWith(filterId) && log.expenses) {
        log.expenses.forEach((e: any) => { summary.OWNER.expenses += Number(e.amount || 0); });
=======
          log.pengeluaran.forEach((e: any) => { summary[storeId].expenses += e.amount; });
        }
      });
    };
    processLogs(logsA || [], "TOKO_A"); processLogs(logsB || [], "TOKO_B"); processLogs(logsC || [], "TOKO_C");
    logsOwner?.forEach(log => {
      if (log.id.startsWith(filterId) && log.expenses) {
        log.expenses.forEach((e: any) => { summary.OWNER.expenses += e.amount; });
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
      }
    });
    return summary;
  }, [trxA, trxB, trxC, logsA, logsB, logsC, logsOwner, selectedDate, selectedMonth, filterMode]);

  const totals = useMemo(() => {
    let income = 0, margin = 0, expenses = 0;
    Object.values(flowData).forEach(store => { income += store.income; margin += store.margin; expenses += store.expenses; });
    return { income, margin, expenses, net: margin - expenses };
  }, [flowData]);

<<<<<<< HEAD
  const handleExportExcel = () => {
    const headers = ["Unit / Cabang", "Omzet Penjualan (Net)", "Laba Kotor (Net)", "Biaya Operasional", "Profit Bersih"];
    const rows = Object.values(flowData).map((d: any) => [d.name, d.income, d.margin, d.expenses, d.margin - d.expenses]);
    rows.push(["KONSOLIDASI PUSAT", totals.income, totals.margin, totals.expenses, totals.net]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Arus Kas");
    XLSX.writeFile(wb, `laporan-arus-kas-${filterMode === 'daily' ? selectedDate : selectedMonth}.xlsx`);
    toast({ title: "Excel Berhasil Diunduh" });
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text("Laporan Arus Kas (Cash Flow) - Nibras House", 148, 12, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Periode: ${filterMode === 'daily' ? selectedDate : selectedMonth}`, 148, 18, { align: "center" });
    const rows = Object.values(flowData).map((d: any) => [
      d.name,
      `Rp ${d.income.toLocaleString('id-ID')}`,
      `Rp ${d.margin.toLocaleString('id-ID')}`,
      `Rp ${d.expenses.toLocaleString('id-ID')}`,
      `Rp ${(d.margin - d.expenses).toLocaleString('id-ID')}`,
    ]);
    rows.push([
      "KONSOLIDASI PUSAT",
      `Rp ${totals.income.toLocaleString('id-ID')}`,
      `Rp ${totals.margin.toLocaleString('id-ID')}`,
      `Rp ${totals.expenses.toLocaleString('id-ID')}`,
      `Rp ${totals.net.toLocaleString('id-ID')}`,
    ]);
    (doc as any).autoTable({
      head: [['Unit / Cabang', 'Omzet Net', 'Laba Kotor Net', 'Biaya Ops', 'Profit Bersih']],
      body: rows,
      startY: 24,
      theme: 'grid',
      headStyles: { fillColor: [23, 23, 23] }
    });
    doc.save(`laporan-arus-kas-${filterMode === 'daily' ? selectedDate : selectedMonth}.pdf`);
    toast({ title: "PDF Berhasil Diunduh" });
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">Cash Flow Statement</p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">Laporan Arus Kas (Cash Flow)</h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Analisis profitabilitas gabungan seluruh cabang yang telah memperhitungkan retur penjualan.</p>
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

      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-3 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/70">
        <div className="flex bg-[#F5F3F0] p-1 rounded-full border border-neutral-200/70 w-full sm:w-auto">
          <button onClick={() => setFilterMode("daily")} className={cn("flex-1 sm:flex-none px-3 sm:px-5 py-1.5 text-[10px] sm:text-xs font-bold rounded-full transition-all", filterMode === "daily" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>HARIAN</button>
          <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 sm:flex-none px-3 sm:px-5 py-1.5 text-[10px] sm:text-xs font-bold rounded-full transition-all", filterMode === "monthly" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-900")}>BULANAN</button>
        </div>
        <div className="w-full sm:w-auto">
          {filterMode === "daily" ? (
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full sm:w-44 h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5" />
          ) : (
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-full sm:w-44 h-9 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <Card className="border-none shadow-sm bg-neutral-950 text-white rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-3.5 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider mb-0.5 truncate">Total Omzet (Net)</p>
            <CardTitle className="text-sm sm:text-xl md:text-2xl font-serif truncate">Rp {totals.income.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-none shadow-sm bg-[#C82368] text-white rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-3.5 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase text-white/75 tracking-wider mb-0.5 truncate">Laba Kotor (Net)</p>
            <CardTitle className="text-sm sm:text-xl md:text-2xl font-serif truncate">Rp {totals.margin.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-neutral-200/70 shadow-sm bg-white text-neutral-900 rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-3.5 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider mb-0.5 truncate">Biaya Operasional</p>
            <CardTitle className="text-sm sm:text-xl md:text-2xl font-serif text-rose-600 truncate">Rp {totals.expenses.toLocaleString('id-ID')}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border border-neutral-200/70 shadow-sm bg-white text-neutral-900 rounded-2xl sm:rounded-3xl">
          <CardHeader className="p-3.5 sm:p-5">
            <p className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider mb-0.5 truncate">Profit Bersih (Net)</p>
            <CardTitle className={cn("text-sm sm:text-xl md:text-2xl font-serif truncate", totals.net >= 0 ? "text-emerald-700" : "text-rose-600")}>
              Rp {totals.net.toLocaleString('id-ID')}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border border-neutral-200/70 shadow-sm bg-white rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          {/* Mobile Compact Cards (Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {Object.entries(flowData).map(([key, data]) => (
              <div key={key} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-neutral-900">{data.name}</span>
                  <span className={cn("font-bold text-xs", (data.margin - data.expenses) >= 0 ? "text-emerald-700" : "text-rose-600")}>
                    Net: Rp {(data.margin - data.expenses).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 bg-[#F5F3F0]/80 rounded-xl p-2">
                  <div className="min-w-0"><p className="text-[8px] font-bold uppercase text-neutral-400">Omzet</p><p className="text-[10px] font-bold text-neutral-900 truncate">Rp {data.income.toLocaleString('id-ID')}</p></div>
                  <div className="min-w-0"><p className="text-[8px] font-bold uppercase text-neutral-400">Laba Kotor</p><p className="text-[10px] font-bold text-emerald-700 truncate">Rp {data.margin.toLocaleString('id-ID')}</p></div>
                  <div className="min-w-0 text-right"><p className="text-[8px] font-bold uppercase text-neutral-400">Biaya Ops</p><p className="text-[10px] font-bold text-rose-600 truncate">Rp {data.expenses.toLocaleString('id-ID')}</p></div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white">
                <TableRow className="text-[10px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                  <TableHead className="pl-6 text-neutral-300">Unit / Cabang</TableHead>
                  <TableHead className="text-right text-neutral-300">Omzet Net</TableHead>
                  <TableHead className="text-right text-neutral-300">Laba Kotor Net</TableHead>
                  <TableHead className="text-right text-neutral-300">Biaya Ops</TableHead>
                  <TableHead className="text-right pr-6 text-neutral-300">Profit Bersih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(flowData).map(([key, data]) => (
                  <TableRow key={key} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 text-xs">
                    <TableCell className="pl-6 py-4 font-bold text-neutral-900">{data.name}</TableCell>
                    <TableCell className="text-right font-bold text-neutral-900 whitespace-nowrap">Rp {data.income.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-700 whitespace-nowrap">Rp {data.margin.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-bold text-rose-600 whitespace-nowrap">Rp {data.expenses.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right pr-6 whitespace-nowrap">
                      <span className={cn("font-bold text-sm", (data.margin - data.expenses) >= 0 ? "text-emerald-700" : "text-rose-600")}>
                        Rp {(data.margin - data.expenses).toLocaleString('id-ID')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-[#F5F3F0] border-t border-neutral-200 font-bold uppercase text-[10px]">
                <TableRow>
                  <TableCell className="pl-6 py-4 text-neutral-500 tracking-widest">Konsolidasi Total</TableCell>
                  <TableCell className="text-right text-base font-serif text-neutral-900 whitespace-nowrap">Rp {totals.income.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right text-base font-serif text-emerald-700 whitespace-nowrap">Rp {totals.margin.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right text-base font-serif text-rose-600 whitespace-nowrap">Rp {totals.expenses.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right pr-6 text-base font-serif whitespace-nowrap">
                    <span className={cn(totals.net >= 0 ? "text-emerald-700" : "text-rose-600")}>
                      Rp {totals.net.toLocaleString('id-ID')}
                    </span>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
=======
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl md:text-3xl font-black text-primary uppercase">Laporan Arus Kas (Cash Flow)</h1><p className="text-muted-foreground text-sm">Analisis profitabilitas gabungan seluruh cabang.</p></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl soft-shadow border">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>HARIAN</button>
          <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>BULANAN</button>
        </div>
        <div className="md:col-span-2">
          {filterMode === "daily" ? (<Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-11 rounded-xl" />) : (<Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-11 rounded-xl" />)}
        </div>
      </div>
      <Card className="rounded-3xl border-none soft-shadow overflow-hidden"><CardContent className="p-0"><Table><TableHeader className="bg-slate-50"><TableRow><TableHead className="pl-8 py-5">Unit / Cabang</TableHead><TableHead className="text-right">Omzet</TableHead><TableHead className="text-right">Laba Kotor</TableHead><TableHead className="text-right">Biaya Ops</TableHead><TableHead className="text-right pr-8">Profit Bersih</TableHead></TableRow></TableHeader><TableBody>{Object.entries(flowData).map(([id, data]) => (<TableRow key={id} className="hover:bg-slate-50 transition-colors"><TableCell className="pl-8 font-black uppercase">{data.name}</TableCell><TableCell className="text-right">Rp {data.income.toLocaleString('id-ID')}</TableCell><TableCell className="text-right font-bold text-emerald-600">Rp {data.margin.toLocaleString('id-ID')}</TableCell><TableCell className="text-right font-bold text-rose-600">Rp {data.expenses.toLocaleString('id-ID')}</TableCell><TableCell className="text-right pr-8 font-black text-primary">Rp {(data.margin - data.expenses).toLocaleString('id-ID')}</TableCell></TableRow>))}</TableBody><TableFooter className="bg-slate-100/50"><TableRow className="font-black"><TableCell className="pl-8">KONSOLIDASI PUSAT</TableCell><TableCell className="text-right">Rp {totals.income.toLocaleString('id-ID')}</TableCell><TableCell className="text-right">Rp {totals.margin.toLocaleString('id-ID')}</TableCell><TableCell className="text-right text-rose-600">Rp {totals.expenses.toLocaleString('id-ID')}</TableCell><TableCell className="text-right pr-8 text-lg text-primary">Rp {totals.net.toLocaleString('id-ID')}</TableCell></TableRow></TableFooter></Table></CardContent></Card>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
    </div>
  );
}
