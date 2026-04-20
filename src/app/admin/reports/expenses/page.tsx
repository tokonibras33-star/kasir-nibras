
"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, FileSpreadsheet, FileText, Filter, ArrowDownToLine, FileSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import "jspdf-autotable";

export default function ExpensesReportPage() {
  const db = useFirestore();
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // Fetching Data
  const storesQueryA = useMemoFirebase(() => collection(db, "stores", "TOKO_A", "cashLogs"), [db]);
  const storesQueryB = useMemoFirebase(() => collection(db, "stores", "TOKO_B", "cashLogs"), [db]);
  const storesQueryC = useMemoFirebase(() => collection(db, "stores", "TOKO_C", "cashLogs"), [db]);
  const ownerQuery = useMemoFirebase(() => collection(db, "ownerExpenses"), [db]);

  const { data: logsA } = useCollection<any>(storesQueryA);
  const { data: logsB } = useCollection<any>(storesQueryB);
  const { data: logsC } = useCollection<any>(storesQueryC);
  const { data: logsOwner } = useCollection<any>(ownerQuery);

  const aggregatedExpenses = useMemo(() => {
    const list: any[] = [];
    const filterId = filterMode === "daily" ? selectedDate : selectedMonth;

    const processLogs = (logs: any[], sourceName: string, sourceId: string) => {
      logs?.forEach(log => {
        if (log.id.startsWith(filterId) && log.pengeluaran) {
          log.pengeluaran.forEach((exp: any) => {
            list.push({ ...exp, source: sourceName, sourceId: sourceId });
          });
        }
      });
    };

    if (storeFilter === "ALL" || storeFilter === "TOKO_A") processLogs(logsA || [], "NHS KWT", "TOKO_A");
    if (storeFilter === "ALL" || storeFilter === "TOKO_B") processLogs(logsB || [], "IND CO", "TOKO_B");
    if (storeFilter === "ALL" || storeFilter === "TOKO_C") processLogs(logsC || [], "NHS GDM", "TOKO_C");
    if (storeFilter === "ALL" || storeFilter === "OWNER") {
      logsOwner?.forEach(log => {
        if (log.id.startsWith(filterId) && log.expenses) {
          log.expenses.forEach((exp: any) => {
            list.push({ ...exp, source: "OWNER PUSAT", sourceId: "OWNER" });
          });
        }
      });
    }

    return list
      .filter(item => 
        item.type.toLowerCase().includes(search.toLowerCase()) || 
        item.source.toLowerCase().includes(search.toLowerCase()) ||
        (item.note || "").toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logsA, logsB, logsC, logsOwner, selectedDate, selectedMonth, filterMode, storeFilter, search]);

  const totalExpense = useMemo(() => aggregatedExpenses.reduce((s, i) => s + i.amount, 0), [aggregatedExpenses]);

  const handleExportExcel = () => {
    if (aggregatedExpenses.length === 0) return;
    const headers = ["Waktu", "Sumber", "Jenis Pengeluaran", "Qty", "Nominal", "Catatan"];
    const data = aggregatedExpenses.map(e => [
      format(new Date(e.timestamp), "dd/MM/yyyy HH:mm"),
      e.source,
      e.type,
      e.qty,
      e.amount,
      e.note || "-"
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Pengeluaran");
    XLSX.writeFile(wb, `laporan-pengeluaran-${format(new Date(), "yyyyMMdd")}.xlsx`);
  };

  const handleExportPDF = () => {
    if (aggregatedExpenses.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.text("Laporan Pengeluaran Operasional - Nibras House", 148, 15, { align: "center" });
    const tableData = aggregatedExpenses.map(e => [
      format(new Date(e.timestamp), "dd/MM/yyyy HH:mm"),
      e.source,
      e.type,
      e.qty,
      `Rp ${e.amount.toLocaleString('id-ID')}`,
      e.note || "-"
    ]);
    (doc as any).autoTable({
      head: [['Waktu', 'Sumber', 'Jenis', 'Qty', 'Nominal', 'Catatan']],
      body: tableData,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [153, 27, 27] }
    });
    doc.save(`laporan-pengeluaran-${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary uppercase">Laporan Pengeluaran</h1>
          <p className="text-muted-foreground text-sm">Rekapitulasi biaya operasional harian dan bulanan seluruh cabang.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportExcel} className="h-10 font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"><FileSpreadsheet className="h-4 w-4 mr-2" /> EXCEL</Button>
          <Button variant="outline" onClick={handleExportPDF} className="h-10 font-bold border-rose-200 text-rose-700 hover:bg-rose-50"><FileText className="h-4 w-4 mr-2" /> PDF A4</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-white p-5 rounded-3xl soft-shadow border">
        <div className="grid grid-cols-2 lg:contents gap-4 lg:col-span-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Mode</Label>
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>HARIAN</button>
                <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-2 text-[10px] font-black rounded-lg transition-all", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>BULANAN</button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Pilih Waktu</Label>
              {filterMode === "daily" ? (
                <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
              ) : (
                <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
              )}
            </div>
        </div>
        
        <div className="grid grid-cols-2 lg:contents gap-4 lg:col-span-2">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Sumber Kas</Label>
              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-black text-[9px] md:text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="ALL">SEMUA SUMBER</SelectItem>
                  <SelectItem value="OWNER">OWNER PUSAT</SelectItem>
                  <SelectItem value="TOKO_A">NHS KWT</SelectItem>
                  <SelectItem value="TOKO_B">IND CO</SelectItem>
                  <SelectItem value="TOKO_C">NHS GDM</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400">Cari</Label>
              <Input placeholder="Ketik sesuatu..." value={search} onChange={e => setSearch(e.target.value)} className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs" />
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 md:gap-4">
        <Card className="rounded-xl md:rounded-[2rem] border-none soft-shadow bg-rose-600 text-white p-3 md:p-6">
          <p className="text-[7px] md:text-[10px] font-black uppercase tracking-widest opacity-70 mb-0.5 md:mb-1">Total Biaya</p>
          <h3 className="text-xs md:text-3xl font-black">Rp {totalExpense.toLocaleString('id-ID')}</h3>
        </Card>
        <Card className="rounded-xl md:rounded-[2rem] border-none soft-shadow bg-white p-3 md:p-6 flex items-center justify-between">
          <div>
            <p className="text-[7px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5 md:mb-1">Jml Trx</p>
            <h3 className="text-xs md:text-3xl font-black text-slate-800">{aggregatedExpenses.length} <span className="text-[7px] md:text-xs opacity-40">ITEM</span></h3>
          </div>
          <div className="bg-slate-100 p-1.5 md:p-4 rounded-lg md:rounded-[2rem]"><ArrowDownToLine className="h-4 w-4 md:h-8 md:w-8 text-rose-600" /></div>
        </Card>
      </div>

      <Card className="border-none soft-shadow rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="text-[10px] font-black uppercase">
                <TableHead className="pl-8 py-5">Waktu & Sumber</TableHead>
                <TableHead>Jenis & Qty</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Catatan</TableHead>
                <TableHead className="text-right pr-8">Bukti</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {aggregatedExpenses.length > 0 ? aggregatedExpenses.map((exp, idx) => (
                <TableRow key={idx} className="hover:bg-slate-50 transition-colors border-b border-muted/50 last:border-none">
                  <TableCell className="pl-8 py-4">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-800">{format(new Date(exp.timestamp), "dd/MM/yyyy HH:mm")}</span>
                      <Badge className={cn("w-fit mt-1 text-[8px] font-black border-none px-2", exp.sourceId === 'OWNER' ? "bg-slate-800 text-white" : "bg-primary/10 text-primary")}>
                        {exp.source}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-xs font-black uppercase text-slate-700">{exp.type}</span>
                      <span className="text-[10px] font-bold text-slate-400">{exp.qty ? `${exp.qty} Unit` : "-"}</span>
                    </div>
                  </TableCell>
                  <TableCell><span className="text-sm font-black text-rose-600">Rp {exp.amount.toLocaleString('id-ID')}</span></TableCell>
                  <TableCell><span className="text-[10px] text-slate-500 italic uppercase">{exp.note || "-"}</span></TableCell>
                  <TableCell className="text-right pr-8">
                    {exp.image && <button onClick={() => window.open(exp.image, '_blank')} className="p-2 bg-slate-100 rounded-lg hover:bg-primary/10 text-slate-400 hover:text-primary"><FileSearch className="h-4 w-4" /></button>}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-400 italic">Tidak ada data pengeluaran ditemukan.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
