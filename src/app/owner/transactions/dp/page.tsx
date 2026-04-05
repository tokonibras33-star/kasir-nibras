
"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const STORES = [
  { id: "TOKO_A", name: "NHS KWT" },
  { id: "TOKO_B", name: "IND CO" },
  { id: "TOKO_C", name: "NHS GDM" },
];

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
      .filter(trx => {
        // A DP transaction is either currently status "DP" or was a DP that's now settled
        const isCurrentlyDP = trx.status === "DP";
        const wasDPButSettled = trx.settledAt != null;
        const matchesStore = storeFilter === "ALL" || trx.storeId === storeFilter;
        const matchesSearch = (trx.customerName || "").toLowerCase().includes(search.toLowerCase()) || 
                             (trx.id || "").toLowerCase().includes(search.toLowerCase());
        
        return (isCurrentlyDP || wasDPButSettled) && matchesStore && matchesSearch;
      })
      .sort((a, b) => {
        const dateA = a.date?.toDate?.()?.getTime() || 0;
        const dateB = b.date?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
  }, [hA, hB, hC, storeFilter, search]);

  const exportPDF = () => {
    if (dpTransactions.length === 0) return;
    const docPdf = new jsPDF({ orientation: 'landscape' });
    docPdf.text(`Histori Transaksi DP - Nibras House`, 148, 10, { align: "center" });
    docPdf.text(`Periode: ${selectedMonth} | Cabang: ${storeFilter}`, 148, 16, { align: "center" });

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
      body: tableData,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [234, 88, 12] }
    });

    docPdf.save(`histori-dp-${selectedMonth}.pdf`);
  };

  const exportExcel = () => {
    if (dpTransactions.length === 0) return;
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
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DP");
    XLSX.writeFile(wb, `histori-dp-${selectedMonth}.xlsx`);
  };

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
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-3xl soft-shadow border">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Pilih Bulan</Label>
          <Input 
            type="month" 
            value={selectedMonth} 
            onChange={e => setSelectedMonth(e.target.value)} 
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
            <Input 
              placeholder="Nama atau ID..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-12 pl-11 rounded-2xl bg-slate-50 border-none font-bold text-sm" 
            />
          </div>
        </div>
      </div>

      <Card className="border-none soft-shadow rounded-[2rem] overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
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
