
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

export default function CashFlowReportPage() {
  const db = useFirestore();
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("monthly");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [storeFilter, setStoreFilter] = useState("ALL");

  // Fetching Data - Transactions
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

  // Fetching Data - Expenses
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

    // Process Transactions
    const processTrx = (list: any[], storeId: string) => {
      list?.forEach(t => {
        summary[storeId].income += (t.total || 0);
        let trxMargin = 0;
        (t.items || []).forEach((i: any) => {
          trxMargin += ((i.price || 0) - (i.buyPrice || 0)) * (i.quantity || 0);
        });
        // Apply discounts to margin proportionally or as total? 
        // Best approach: margin = total paid - total buy cost
        const buyCost = (t.items || []).reduce((s: number, i: any) => s + (i.buyPrice * i.quantity), 0);
        summary[storeId].margin += (t.total - buyCost);
      });
    };

    processTrx(trxA || [], "TOKO_A");
    processTrx(trxB || [], "TOKO_B");
    processTrx(trxC || [], "TOKO_C");

    // Process Expenses
    const filterId = filterMode === "daily" ? selectedDate : selectedMonth;
    const processLogs = (logs: any[], storeId: string) => {
      logs?.forEach(log => {
        if (log.id.startsWith(filterId) && log.pengeluaran) {
          log.pengeluaran.forEach((e: any) => { summary[storeId].expenses += e.amount; });
        }
      });
    };

    processLogs(logsA || [], "TOKO_A");
    processLogs(logsB || [], "TOKO_B");
    processLogs(logsC || [], "TOKO_C");
    logsOwner?.forEach(log => {
      if (log.id.startsWith(filterId) && log.expenses) {
        log.expenses.forEach((e: any) => { summary.OWNER.expenses += e.amount; });
      }
    });

    return summary;
  }, [trxA, trxB, trxC, logsA, logsB, logsC, logsOwner, selectedDate, selectedMonth, filterMode]);

  const totals = useMemo(() => {
    let income = 0, margin = 0, expenses = 0;
    Object.values(flowData).forEach(store => {
      income += store.income;
      margin += store.margin;
      expenses += store.expenses;
    });
    return { income, margin, expenses, net: margin - expenses };
  }, [flowData]);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Laporan Arus Kas (Cash Flow) - Nibras House", 105, 15, { align: "center" });
    doc.text(`Periode: ${filterMode === 'daily' ? selectedDate : selectedMonth}`, 105, 22, { align: "center" });

    const tableData = Object.entries(flowData).map(([id, data]) => [
      data.name,
      `Rp ${data.income.toLocaleString('id-ID')}`,
      `Rp ${data.margin.toLocaleString('id-ID')}`,
      `Rp ${data.expenses.toLocaleString('id-ID')}`,
      `Rp ${(data.margin - data.expenses).toLocaleString('id-ID')}`
    ]);

    (doc as any).autoTable({
      head: [['Unit / Cabang', 'Omzet (Sales)', 'Laba Kotor (Margin)', 'B. Operasional', 'Profit Bersih']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [31, 122, 99] }
    });

    doc.save(`cash-flow-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary uppercase flex items-center gap-3">
            <PieChart className="h-8 w-8 text-blue-600" /> LAPORAN ARUS KAS (CASH FLOW)
          </h1>
          <p className="text-muted-foreground text-sm">Analisis performa keuangan gabungan dan profitabilitas per cabang.</p>
        </div>
        <Button onClick={exportPDF} className="h-11 rounded-xl font-black bg-primary shadow-lg shadow-primary/20">
          <Download className="h-4 w-4 mr-2" /> EXPORT PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl soft-shadow border">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400">Mode</Label>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>HARIAN</button>
            <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>BULANAN</button>
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label className="text-[10px] font-black uppercase text-slate-400">Pilih Waktu</Label>
          {filterMode === "daily" ? (
            <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
          ) : (
            <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard title="Total Omzet" value={totals.income} icon={DollarSign} color="blue" />
        <SummaryCard title="Total Margin" value={totals.margin} icon={TrendingUp} color="emerald" />
        <SummaryCard title="Total Pengeluaran" value={totals.expenses} icon={ArrowDownCircle} color="rose" />
        <SummaryCard title="Profit Bersih" value={totals.net} icon={Wallet} color="primary" />
      </div>

      <Card className="rounded-[2.5rem] border-none soft-shadow bg-white overflow-hidden">
        <CardHeader className="bg-slate-50 p-6 border-b"><CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Breakdown Arus Kas Per Unit</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-none">
                <TableHead className="pl-8 py-5 text-[10px] font-black uppercase">Unit / Cabang Toko</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase">Omzet (Sales)</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase">Margin (Gross)</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase">Operasional (Out)</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase">Net Profit (Actual)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(flowData).map(([id, data]) => {
                const net = data.margin - data.expenses;
                return (
                  <TableRow key={id} className="hover:bg-slate-50 transition-colors border-b last:border-none">
                    <TableCell className="pl-8 py-5">
                      <span className="font-black text-sm text-slate-800 uppercase">{data.name}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-600">Rp {data.income.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-black text-emerald-600">Rp {data.margin.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-black text-rose-600">- Rp {data.expenses.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right pr-8">
                      <Badge className={cn("rounded-lg font-black text-xs px-3", net >= 0 ? "bg-primary text-white" : "bg-rose-600 text-white")}>
                        Rp {net.toLocaleString('id-ID')}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter className="bg-slate-100/50 border-t-2">
              <TableRow className="font-black uppercase text-xs">
                <TableCell className="pl-8 py-6">Konsolidasi Pusat</TableCell>
                <TableCell className="text-right">Rp {totals.income.toLocaleString('id-ID')}</TableCell>
                <TableCell className="text-right text-emerald-700">Rp {totals.margin.toLocaleString('id-ID')}</TableCell>
                <TableCell className="text-right text-rose-700">- Rp {totals.expenses.toLocaleString('id-ID')}</TableCell>
                <TableCell className="text-right pr-8 text-primary text-lg">Rp {totals.net.toLocaleString('id-ID')}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    primary: "bg-[#1F7A63] text-white shadow-primary/20 shadow-xl",
    blue: "bg-blue-600 text-white shadow-blue-500/20 shadow-xl",
    rose: "bg-rose-600 text-white shadow-rose-500/20 shadow-xl",
    emerald: "bg-emerald-600 text-white shadow-emerald-500/20 shadow-xl",
  };
  return (
    <Card className={cn("rounded-[2rem] border-none group hover:scale-[1.02] transition-all", colorMap[color])}>
      <CardContent className="p-6">
        <div className="bg-white/10 p-2.5 rounded-xl w-fit mb-4"><Icon className="h-5 w-5" /></div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
        <h3 className="text-xl md:text-2xl font-black">Rp {value.toLocaleString('id-ID')}</h3>
      </CardContent>
    </Card>
  );
}
