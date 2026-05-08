"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, FileSpreadsheet, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import "jspdf-autotable";

const BRAND_DATABASE = [
  'Aden', 'AHSAN', 'Ainun', 'Ajwa', 'ALFASA', 'Alfira', 'Aqlan', 'AR', 'ARSELLE', 'ARUMY', 'AS MOESLEM', 'Aysila', 'Dafeena', 'DENIZER', 'Elzatta', 'EMILY DAILY', 'ETHICA', 'FeeFashion', 'Gabia', 'Ghiina', 'HIJABI OFFICIAL', 'Hunny Label', 'IMIDY', 'Journey', 'Kaen', 'KAMSA', 'Kazami', 'Keke', 'Latanza', 'LUBI', 'MALIHA', 'MOSLEM DAILY', 'Nadheera Luxury', 'NARARYA', 'Nata Id', 'NIARA', 'NIBRAS', 'NIRMALA', 'Non Branded', 'Poeti', 'Rabbani', 'Raisakey', 'Ratu Bilqis', 'RAYYA', 'Rivantie', 'SALVINA', 'SAV KIDS', 'Seply', 'Ss Hijab', 'SYIFA OFFICIAL', 'Urfimutiyaro', 'Yukio', 'ZAMEERA', 'Zz Homey'
];
const CATEGORY_DATABASE = [
  'Accesories', 'Atasan', 'Blouse', 'Bros', 'Celana', 'Ciput', 'Dompet', 'DRESS', 'GAMIS', 'GAMIS ANAK', 'Jilbab Instan', 'Jilbab Segi_4', 'Jilbab Segi_5', 'Jilbab Segi_6', 'Jilbab Segi_7', 'KOKO', 'KOKO ANAK', 'MIDI DRESS', 'Mukena', 'Mukena Anak', 'Oneset', 'Pashmina', 'Sandal', 'Sarung', 'Tas', 'Tunik'
];
const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);

export default function PurchaseReportPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'daily' | 'monthly' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  // Ambil data dari Riwayat Input (Stock Entries) agar data tetap sesuai input awal (belanjaan)
  const entriesQuery = useMemoFirebase(() => collection(db, 'stockEntries'), [db]);
  const { data: entriesData } = useCollection<any>(entriesQuery);

  const detailedStockList = useMemo(() => {
    const allItems: any[] = [];
    
    (entriesData || []).forEach(entry => {
        (entry.items || []).forEach((item: any) => {
            // Ambil data item dari riwayat input
            // 'stock' di dalam item riwayat input adalah jumlah yang di-input saat itu
            if (storeFilter === 'ALL' || item.targetStore === storeFilter) {
                allItems.push({
                    ...item,
                    invoiceNo: entry.invoiceNo,
                    invoiceDate: entry.invoiceDate,
                    storeId: item.targetStore
                });
            }
        });
    });

    const grouped = allItems.reduce((acc, item) => {
        // Grouping berdasarkan kriteria unik batch pembelian
        const key = `${item.productName}-${item.invoiceDate || 'noinvdate'}-${item.invoiceNo || 'noinv'}-${item.color}-${item.size}-${item.labelPrice}-${item.buyDiscount}`;
        
        if (!acc[key]) {
            acc[key] = {
                ...item,
                qty_TOKO_A: 0,
                qty_TOKO_B: 0,
                qty_TOKO_C: 0,
                totalQty: 0,
            };
        }
        
        // Tambahkan qty ke kolom toko masing-masing
        acc[key][`qty_${item.storeId}`] = (acc[key][`qty_${item.storeId}`] || 0) + item.stock;
        acc[key].totalQty += item.stock;
        return acc;
    }, {});

    let list = Object.values(grouped).filter((item: any) => item.totalQty > 0);

    // Filter Periode
    if (filterMode === 'daily') {
        list = list.filter((item: any) => item.invoiceDate === selectedDate);
    } else if (filterMode === 'monthly') {
        list = list.filter((item: any) => item.invoiceDate && item.invoiceDate.startsWith(selectedMonth));
    }

    // Filter Brand & Kategori
    if (brandFilter !== 'ALL') list = list.filter((item: any) => item.brand === brandFilter);
    if (categoryFilter !== 'ALL') list = list.filter((item: any) => item.category === categoryFilter);

    // Search logic
    const tokens = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    if (tokens.length > 0) {
        list = list.filter((item: any) => {
            const searchableText = [item.productName, item.brand, item.category, item.series, item.color, item.size, item.invoiceNo || ''].join(' ').toLowerCase();
            return tokens.every(token => searchableText.includes(token));
        });
    }

    return list.sort((a: any, b: any) => {
        if (a.invoiceDate && b.invoiceDate) {
            if (a.invoiceDate < b.invoiceDate) return 1;
            if (a.invoiceDate > b.invoiceDate) return -1;
        }
        return a.productName.localeCompare(b.productName);
    });
  }, [entriesData, searchTerm, storeFilter, brandFilter, categoryFilter, filterMode, selectedDate, selectedMonth]);

  const totals = useMemo(() => {
    return detailedStockList.reduce((acc, item: any) => {
      acc.totalQty += item.totalQty;
      acc.totalBuy += (item.buyPrice || 0) * item.totalQty;
      return acc;
    }, { totalQty: 0, totalBuy: 0 });
  }, [detailedStockList]);

  const handleExportExcel = () => {
    if (detailedStockList.length === 0) return;
    const headers = ['Tgl Nota', 'No Nota', 'Merk', 'Kategori', 'Seri', 'Size', 'Warna', 'Label', '% Beli', 'H. Beli', 'Qty NHS KWT', 'Qty IND CO', 'Qty NHS GDM', 'Jumlah Qty', 'Total Beli'];
    const data = detailedStockList.map((item: any) => [
        item.invoiceDate || '-', 
        item.invoiceNo || '-', 
        item.brand, 
        item.category, 
        item.series, 
        item.size, 
        item.color, 
        item.labelPrice, 
        item.buyDiscount || 0,
        item.buyPrice || 0,
        item.qty_TOKO_A || 0,
        item.qty_TOKO_B || 0,
        item.qty_TOKO_C || 0,
        item.totalQty,
        (item.buyPrice || 0) * item.totalQty
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Pembelian');
    XLSX.writeFile(wb, `laporan-pembelian-${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast({ title: 'Excel Berhasil Diunduh' });
  };

  const handleExportPDF = () => {
    if (detailedStockList.length === 0) return;
    const docPdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    docPdf.text('Laporan Pembelian - Nibras House', 148, 10, { align: 'center' });
    const tableData = detailedStockList.map((item: any) => [
        item.invoiceDate || '-', 
        item.invoiceNo || '-', 
        item.brand, 
        item.category, 
        item.series,
        item.size, 
        item.color, 
        formatCurrency(item.labelPrice || 0),
        `${item.buyDiscount || 0}%`,
        formatCurrency(item.buyPrice || 0),
        item.qty_TOKO_A || 0,
        item.qty_TOKO_B || 0,
        item.qty_TOKO_C || 0,
        item.totalQty,
        formatCurrency((item.buyPrice || 0) * item.totalQty)
    ]);
    (docPdf as any).autoTable({ 
        head: [['Tgl Nota', 'No Nota', 'Merk', 'Kategori', 'Seri', 'Size', 'Warna', 'Label', '% Beli', 'H. Beli', 'Qty KWT', 'Qty IND', 'Qty GDM', 'Total Qty', 'Total Beli']], 
        body: tableData, 
        startY: 20, 
        theme: 'grid', 
        headStyles: { fillColor: [31, 122, 99], textColor: 255, fontSize: 8, fontStyle: 'bold' }, 
        styles: { fontSize: 7, cellPadding: 1.5 }
    });
    docPdf.save(`laporan-pembelian-${format(new Date(), 'yyyyMMdd')}.pdf`);
    toast({ title: 'PDF Berhasil Diunduh' });
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl md:text-3xl font-black text-primary uppercase'>Laporan Pembelian</h1>
          <p className='text-muted-foreground text-sm'>Rincian barang yang dibeli dari seluruh riwayat input stok.</p>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='outline' onClick={handleExportExcel} className='h-10 font-bold'><FileSpreadsheet className='h-4 w-4 mr-2' /> EXCEL</Button>
          <Button variant='outline' onClick={handleExportPDF} className='h-10 font-bold'><FileText className='h-4 w-4 mr-2' /> PDF</Button>
        </div>
      </div>

      <Card className='soft-shadow border-none overflow-hidden rounded-3xl flex flex-col'>
      <CardHeader className='p-4 md:p-6 space-y-4 border-b bg-muted/10'>
        <div className="grid grid-cols-3 md:contents gap-2">
            <div className="space-y-2 md:contents">
                <div className='relative md:flex-1 col-span-1 md:block'>
                  <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
                  <Input placeholder='Cari...' className='pl-8 h-10 bg-white border-none shadow-sm text-[9px] md:text-xs rounded-xl' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
            </div>
            <div className="space-y-2 col-span-1">
                <Label className="text-[8px] md:text-[10px] font-black uppercase text-muted-foreground ml-1 hidden md:block">Tipe Periode</Label>
                <Select onValueChange={(v) => setFilterMode(v as any)} value={filterMode}>
                    <SelectTrigger className='h-10 w-full bg-white border-none shadow-sm text-[9px] md:text-xs font-bold rounded-xl'><SelectValue placeholder="Tipe" /></SelectTrigger>
                    <SelectContent className='rounded-xl'><SelectItem value="all">Semua</SelectItem><SelectItem value="monthly">Bulan</SelectItem><SelectItem value="daily">Hari</SelectItem></SelectContent>
                </Select>
            </div>
            <div className="space-y-2 col-span-1">
                <Label className="text-[8px] md:text-[10px] font-black uppercase text-muted-foreground ml-1 hidden md:block">Pilih</Label>
                {filterMode === "daily" && <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className='h-10 bg-white border-none shadow-sm text-[9px] md:text-xs rounded-xl font-bold' />}
                {filterMode === "monthly" && <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className='h-10 bg-white border-none shadow-sm text-[9px] md:text-xs rounded-xl font-bold' />}
                {filterMode === "all" && <div className='h-10 bg-slate-100 rounded-xl flex items-center justify-center text-[9px] md:text-xs text-muted-foreground font-bold'>-</div>}
            </div>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            <div className="space-y-1 md:space-y-2">
                <Label className="text-[8px] md:text-[10px] font-black uppercase text-muted-foreground ml-1 hidden md:block">Merek</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}><SelectTrigger className='h-10 w-full bg-white border-none shadow-sm text-[9px] md:text-xs font-bold rounded-xl'><SelectValue placeholder='Merk' /></SelectTrigger><SelectContent className='rounded-xl'><SelectItem value='ALL'>Semua</SelectItem>{BRAND_DATABASE.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1 md:space-y-2">
                <Label className="text-[8px] md:text-[10px] font-black uppercase text-muted-foreground ml-1 hidden md:block">Kat</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className='h-10 w-full bg-white border-none shadow-sm text-[9px] md:text-xs font-bold rounded-xl'><SelectValue placeholder='Kat' /></SelectTrigger><SelectContent className='rounded-xl'><SelectItem value='ALL'>Semua</SelectItem>{CATEGORY_DATABASE.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1 md:space-y-2">
                <Label className="text-[8px] md:text-[10px] font-black uppercase text-muted-foreground ml-1 hidden md:block">Toko</Label>
                <Select value={storeFilter} onValueChange={setStoreFilter}><SelectTrigger className='h-10 w-full bg-white border-none shadow-sm text-[9px] md:text-xs font-bold rounded-xl'><SelectValue placeholder='Toko' /></SelectTrigger><SelectContent className='rounded-xl'><SelectItem value='ALL'>Semua</SelectItem><SelectItem value='TOKO_A'>KWT</SelectItem><SelectItem value='TOKO_B'>IND</SelectItem><SelectItem value='TOKO_C'>GDM</SelectItem></SelectContent></Select>
            </div>
            <div className="flex items-end">
                <Button variant="ghost" className="h-10 w-full rounded-xl text-[9px] md:text-xs font-black" onClick={() => { setSearchTerm(''); setBrandFilter('ALL'); setCategoryFilter('ALL'); setFilterMode('all'); setStoreFilter('ALL'); }}><X className="h-3.5 w-3.5 mr-1" /> RESET</Button>
            </div>
        </div>
    </CardHeader>
        <CardContent className='p-0 flex-1'>
          <div className='overflow-x-auto'>
            <Table>
              <TableHeader className='bg-muted/50'>
                <TableRow className='text-[10px] uppercase font-black'>
                  <TableHead>Tgl Nota</TableHead>
                  <TableHead>No Nota</TableHead>
                  <TableHead>Merk</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Seri</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Warna</TableHead>
                  <TableHead className='text-right'>Label</TableHead>
                  <TableHead className='text-center'>% Beli</TableHead>
                  <TableHead className='text-right'>H. Beli</TableHead>
                  <TableHead className='text-center'>Qty KWT</TableHead>
                  <TableHead className='text-center'>Qty IND</TableHead>
                  <TableHead className='text-center'>Qty GDM</TableHead>
                  <TableHead className='text-center'>Jumlah Qty</TableHead>
                  <TableHead className='text-right'>Total Beli</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedStockList.length > 0 ? detailedStockList.map((item: any, idx) => (
                  <TableRow key={idx} className='text-[11px]'>
                    <TableCell className='text-muted-foreground'>{item.invoiceDate || '-'}</TableCell>
                    <TableCell className='font-mono font-bold'>{item.invoiceNo || '-'}</TableCell>
                    <TableCell className='font-bold'>{item.brand}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.series}</TableCell>
                    <TableCell className='font-black'>{item.size}</TableCell>
                    <TableCell>{item.color}</TableCell>
                    <TableCell className='text-right'>{formatCurrency(item.labelPrice || 0)}</TableCell>
                    <TableCell className='text-center text-emerald-600'>{item.buyDiscount || '0'}%</TableCell>
                    <TableCell className='text-right text-primary font-bold'>{formatCurrency(item.buyPrice || 0)}</TableCell>
                    <TableCell className='text-center font-bold text-primary'>{item.qty_TOKO_A || 0}</TableCell>
                    <TableCell className='text-center font-bold text-blue-600'>{item.qty_TOKO_B || 0}</TableCell>
                    <TableCell className='text-center font-bold text-emerald-600'>{item.qty_TOKO_C || 0}</TableCell>
                    <TableCell className='text-center font-black text-lg'>{item.totalQty}</TableCell>
                    <TableCell className='text-right font-black'>{formatCurrency((item.buyPrice || 0) * item.totalQty)}</TableCell>
                  </TableRow>
                )) : (
                    <TableRow><TableCell colSpan={15} className="h-48 text-center">Tidak ada data.</TableCell></TableRow>
                )}
              </TableBody>
              {detailedStockList.length > 0 && (
                <TableFooter className="bg-slate-50/80">
                  <TableRow className="font-black text-sm">
                    <TableCell colSpan={13}>Total</TableCell>
                    <TableCell className="text-center text-primary">{totals.totalQty}</TableCell>
                    <TableCell className="text-right text-primary">{formatCurrency(totals.totalBuy)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
