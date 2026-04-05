
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
import { toast } from "@/hooks/use-toast";

const STORES = [
  { id: "TOKO_A", name: "NHS KWT" },
  { id: "TOKO_B", name: "IND CO" },
  { id: "TOKO_C", name: "NHS GDM" },
];

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
    
    // We fetch all transactions for the month and filter for returns in JS
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
      if (trx.returnLog && trx.returnLog.items) {
        if (storeFilter !== "ALL" && trx.storeId !== storeFilter) return;

        trx.returnLog.items.forEach((item: any) => {
          list.push({
            date: trx.returnLog.returnedAt || trx.date?.toDate(),
            trxId: trx.id,
            storeName: STORES.find(s => s.id === trx.storeId)?.name,
            customerName: trx.customerName || "UMUM",
            customerPhone: trx.customerPhone || "-",
            itemName: item.name,
            itemBrand: item.brand || "-",
            itemCategory: item.category || "-",
            itemColor: item.color || "-",
            itemSize: item.size || "-",
            quantity: item.quantity,
            price: item.price,
            totalRefund: item.price * item.quantity
          });
        });
      }
    });

    return list
      .filter(i => 
        i.customerName.toLowerCase().includes(search.toLowerCase()) ||
        i.itemName.toLowerCase().includes(search.toLowerCase()) ||
        i.trxId.toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [hA, hB, hC, storeFilter, search]);

  const exportPDF = () => {
    if (returnedItems.length === 0) return;
    const docPdf = new jsPDF({ orientation: 'landscape' });
    docPdf.text(`Laporan Histori Retur - Nibras House`, 148, 10, { align: "center" });
    docPdf.text(`Periode: ${selectedMonth} | Cabang: ${storeFilter}`, 148, 16, { align: "center" });

    const tableData = returnedItems.map(i => [
      format(new Date(i.date), "dd/MM/yyyy HH:mm"),
      i.trxId,
      i.customerName,
      i.itemName,
      i.itemSize,
      i.quantity,
      `Rp ${i.price.toLocaleString('id-ID')}`,
      `Rp ${i.totalRefund.toLocaleString('id-ID')}`
    ]);

    (docPdf as any).autoTable({
      head: [['Waktu', 'ID TRX', 'Konsumen', 'Nama Barang', 'Size', 'Qty', 'Harga', 'Total']],
      body: tableData,
      startY: 25,
      theme: 'grid',
      headStyles: { fillColor: [153, 27, 27] }
    });

    docPdf.save(`histori-retur-${selectedMonth}.pdf`);
  };

  const exportExcel = () => {
    if (returnedItems.length === 0) return;
    const headers = ["Waktu", "ID TRX", "Cabang", "Konsumen", "No WA", "Barang", "Merk", "Kategori", "Size", "Warna", "Qty", "Total Refund"];
    const data = returnedItems.map(i => [
      format(new Date(i.date), "dd/MM/yyyy HH:mm"),
      i.trxId,
      i.storeName,
      i.customerName,
      i.customerPhone,
      i.itemName,
      i.itemBrand,
      i.itemCategory,
      i.itemSize,
      i.itemColor,
      i.quantity,
      i.totalRefund
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Retur");
    XLSX.writeFile(wb, `histori-retur-${selectedMonth}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-primary uppercase flex items-center gap-3">
            <RotateCcw className="h-8 w-8 text-rose-600" /> Histori Retur Barang
          </h1>
          <p className="text-muted-foreground text-sm">Audit barang yang dikembalikan oleh konsumen per cabang.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportExcel} className="flex-1 sm:flex-none h-11 rounded-xl font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Download className="h-4 w-4 mr-2" /> EXCEL
          </Button>
          <Button variant="outline" onClick={exportPDF} className="flex-1 sm:flex-none h-11 rounded-xl font-bold border-rose-200 text-rose-700 hover:bg-rose-50">
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
          <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cari Konsumen / Barang</Label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Ketik sesuatu..." 
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
              <TableHeader className="bg-rose-50/50">
                <TableRow className="border-none">
                  <TableHead className="pl-6 text-[10px] font-black uppercase py-4">Waktu Retur</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Konsumen</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Barang & Varian</TableHead>
                  <TableHead className="text-center text-[10px] font-black uppercase">Qty</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase pr-6">Total Refund</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnedItems.length > 0 ? returnedItems.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                    <TableCell className="pl-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs font-black">{format(new Date(item.date), "dd/MM/yyyy HH:mm")}</span>
                        <span className="text-[9px] font-bold text-rose-600 uppercase">{item.storeName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-black uppercase">{item.customerName}</span>
                        <span className="text-[10px] font-medium text-slate-400">{item.customerPhone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase leading-tight">{item.itemName}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-black">{item.itemBrand} | {item.itemCategory} | {item.itemSize} - {item.itemColor}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-rose-100 text-rose-700 border-none font-black text-[10px]">{item.quantity} PCS</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span className="text-sm font-black text-rose-600">Rp {item.totalRefund.toLocaleString('id-ID')}</span>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center text-slate-400 italic text-sm">
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
