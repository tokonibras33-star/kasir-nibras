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
    processLogs(logsA || [], "TOKO_A"); processLogs(logsB || [], "TOKO_B"); processLogs(logsC || [], "TOKO_C");
    
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((row) => (
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
                        Rp {row.margin.toLocaleString('id-ID')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter className="bg-primary/5">
                <TableRow className="border-none">
                  <TableCell className="pl-10 py-6 font-black uppercase text-xs">Total Konsolidasi</TableCell>
                  <TableCell className="text-right font-black text-emerald-600">Rp {totals.income.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right font-black text-amber-600">Rp {totals.cogs.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right font-black text-rose-600">Rp {totals.ops.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="text-right pr-10 font-black text-xl text-primary">Rp {totals.margin.toLocaleString('id-ID')}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
      
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
