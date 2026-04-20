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
        summary[storeId].income += (t.total || 0);
        const buyCost = (t.items || []).reduce((s: number, i: any) => s + (i.buyPrice * i.quantity), 0);
        summary[storeId].margin += (t.total - buyCost);
      });
    };
    processTrx(trxA || [], "TOKO_A"); processTrx(trxB || [], "TOKO_B"); processTrx(trxC || [], "TOKO_C");

    const filterId = filterMode === "daily" ? selectedDate : selectedMonth;
    const processLogs = (logs: any[], storeId: string) => {
      logs?.forEach(log => {
        if (log.id.startsWith(filterId) && log.pengeluaran) {
          log.pengeluaran.forEach((e: any) => { summary[storeId].expenses += e.amount; });
        }
      });
    };
    processLogs(logsA || [], "TOKO_A"); processLogs(logsB || [], "TOKO_B"); processLogs(logsC || [], "TOKO_C");
    logsOwner?.forEach(log => {
      if (log.id.startsWith(filterId) && log.expenses) {
        log.expenses.forEach((e: any) => { summary.OWNER.expenses += e.amount; });
      }
    });
    return summary;
  }, [trxA, trxB, trxC, logsA, logsB, logsC, logsOwner, selectedDate, selectedMonth, filterMode]);

  const totals = useMemo(() => {
    let income = 0, margin = 0, expenses = 0;
    Object.values(flowData).forEach(store => { income += store.income; margin += store.margin; expenses += store.expenses; });
    return { income, margin, expenses, net: margin - expenses };
  }, [flowData]);

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
    </div>
  );
}