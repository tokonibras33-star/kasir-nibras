"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Download, FileSpreadsheet, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
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
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<'daily' | 'monthly' | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  const entriesQuery = useMemoFirebase(() => user ? collection(db, 'stockEntries') : null, [db, user]);
  const { data: entriesData } = useCollection<any>(entriesQuery);

  const detailedStockList = useMemo(() => {
    const allItems: any[] = [];
    
    (entriesData || []).forEach(entry => {
        (entry.items || []).forEach((item: any) => {
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
        
        acc[key][`qty_${item.storeId}`] = (acc[key][`qty_${item.storeId}`] || 0) + item.stock;
        acc[key].totalQty += item.stock;
        return acc;
    }, {});

    let list: any[] = Object.values(grouped).filter((item: any) => item.totalQty > 0);

    if (filterMode === 'daily') {
        list = list.filter((item: any) => item.invoiceDate === selectedDate);
    } else if (filterMode === 'monthly') {
        list = list.filter((item: any) => item.invoiceDate && item.invoiceDate.startsWith(selectedMonth));
    }

    if (brandFilter !== 'ALL') list = list.filter((item: any) => item.brand === brandFilter);
    if (categoryFilter !== 'ALL') list = list.filter((item: any) => item.category === categoryFilter);

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
    return detailedStockList.reduce((acc: { totalQty: number; totalBuy: number }, item: any) => {
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
    <div className='space-y-6 pb-8'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <p className='text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400'>Procurement Report</p>
          <h1 className='text-3xl md:text-4xl font-serif text-neutral-900 tracking-tight'>Laporan Pembelian</h1>
          <p className='text-neutral-500 text-sm mt-1'>Rincian barang yang dibeli dari seluruh riwayat input stok.</p>
        </div>
        <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
          <Button variant='outline' onClick={handleExportExcel} className='h-10 rounded-full px-5 font-bold text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none'><FileSpreadsheet className='h-4 w-4 mr-2 text-emerald-600' /> EXCEL</Button>
          <Button variant='outline' onClick={handleExportPDF} className='h-10 rounded-full px-5 font-bold text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none'><FileText className='h-4 w-4 mr-2 text-[#C82368]' /> PDF</Button>
        </div>
      </div>

      <Card className='bg-white border border-neutral-200/70 shadow-sm overflow-hidden rounded-3xl flex flex-col'>
      <CardHeader className='p-4 md:p-6 space-y-4 border-b border-neutral-100 bg-white'>
        <div className="grid grid-cols-1 sm:grid-cols-3 md:flex md:items-end gap-3">
            <div className='relative md:flex-1'>
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 mb-1.5 hidden md:block">Pencarian</Label>
              <div className="relative">
                <Search className='absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400' />
                <Input placeholder='Cari produk, nota, seri...' className='pl-11 h-10 bg-[#F5F3F0] border border-neutral-200/70 text-xs rounded-full' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5 md:w-40">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 hidden md:block">Tipe Periode</Label>
                <Select onValueChange={(v) => setFilterMode(v as any)} value={filterMode}>
                    <SelectTrigger className='h-10 w-full bg-[#F5F3F0] border border-neutral-200/70 text-xs font-bold rounded-full px-4'><SelectValue placeholder="Tipe" /></SelectTrigger>
                    <SelectContent className='rounded-2xl'><SelectItem value="all">Semua</SelectItem><SelectItem value="monthly">Bulan</SelectItem><SelectItem value="daily">Hari</SelectItem></SelectContent>
                </Select>
            </div>
            <div className="space-y-1.5 md:w-44">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 hidden md:block">Pilih Waktu</Label>
                {filterMode === "daily" && <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className='h-10 bg-[#F5F3F0] border border-neutral-200/70 text-xs rounded-full px-4 font-bold' />}
                {filterMode === "monthly" && <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className='h-10 bg-[#F5F3F0] border border-neutral-200/70 text-xs rounded-full px-4 font-bold' />}
                {filterMode === "all" && <div className='h-10 bg-[#F5F3F0] border border-neutral-200/70 rounded-full flex items-center justify-center text-xs text-neutral-400 font-bold'>Semua Waktu</div>}
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 hidden md:block">Merek</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}><SelectTrigger className='h-10 w-full bg-[#F5F3F0] border border-neutral-200/70 text-xs font-bold rounded-full px-4'><SelectValue placeholder='Merk' /></SelectTrigger><SelectContent className='rounded-2xl'><SelectItem value='ALL'>Semua Merek</SelectItem>{BRAND_DATABASE.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 hidden md:block">Kategori</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className='h-10 w-full bg-[#F5F3F0] border border-neutral-200/70 text-xs font-bold rounded-full px-4'><SelectValue placeholder='Kat' /></SelectTrigger><SelectContent className='rounded-2xl'><SelectItem value='ALL'>Semua Kategori</SelectItem>{CATEGORY_DATABASE.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 hidden md:block">Cabang</Label>
                <Select value={storeFilter} onValueChange={setStoreFilter}><SelectTrigger className='h-10 w-full bg-[#F5F3F0] border border-neutral-200/70 text-xs font-bold rounded-full px-4'><SelectValue placeholder='Toko' /></SelectTrigger><SelectContent className='rounded-2xl'><SelectItem value='ALL'>Semua Cabang</SelectItem><SelectItem value='TOKO_A'>NHS KWT</SelectItem><SelectItem value='TOKO_B'>IND CO</SelectItem><SelectItem value='TOKO_C'>NHS GDM</SelectItem></SelectContent></Select>
            </div>
            <div className="flex items-end">
                <Button variant="ghost" className="h-10 w-full rounded-full text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700" onClick={() => { setSearchTerm(''); setBrandFilter('ALL'); setCategoryFilter('ALL'); setFilterMode('all'); setStoreFilter('ALL'); }}><X className="h-3.5 w-3.5 mr-1.5" /> RESET</Button>
            </div>
        </div>
    </CardHeader>
        <CardContent className='p-0 flex-1'>
          <div className='w-full overflow-x-auto'>
            <Table>
              <TableHeader className='bg-neutral-950 text-white'>
                <TableRow className='text-[10px] uppercase font-bold tracking-widest border-none hover:bg-neutral-950'>
                  <TableHead className='text-neutral-300 pl-6'>Tgl Nota</TableHead>
                  <TableHead className='text-neutral-300'>No Nota</TableHead>
                  <TableHead className='text-neutral-300'>Merk</TableHead>
                  <TableHead className='text-neutral-300'>Kategori</TableHead>
                  <TableHead className='text-neutral-300'>Seri</TableHead>
                  <TableHead className='text-neutral-300'>Size</TableHead>
                  <TableHead className='text-neutral-300'>Warna</TableHead>
                  <TableHead className='text-right text-neutral-300'>Label</TableHead>
                  <TableHead className='text-center text-neutral-300'>% Beli</TableHead>
                  <TableHead className='text-right text-neutral-300'>H. Beli</TableHead>
                  <TableHead className='text-center text-neutral-300'>Qty KWT</TableHead>
                  <TableHead className='text-center text-neutral-300'>Qty IND</TableHead>
                  <TableHead className='text-center text-neutral-300'>Qty GDM</TableHead>
                  <TableHead className='text-center text-neutral-300'>Jumlah Qty</TableHead>
                  <TableHead className='text-right text-neutral-300 pr-6'>Total Beli</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailedStockList.length > 0 ? detailedStockList.map((item: any, idx) => (
                  <TableRow key={idx} className='text-[11px] hover:bg-[#F5F3F0]/60 border-b border-neutral-100'>
                    <TableCell className='text-neutral-500 pl-6 whitespace-nowrap'>{item.invoiceDate || '-'}</TableCell>
                    <TableCell className='font-mono font-bold text-neutral-900 whitespace-nowrap'>{item.invoiceNo || '-'}</TableCell>
                    <TableCell className='font-bold text-neutral-900'>{item.brand}</TableCell>
                    <TableCell className='text-neutral-600'>{item.category}</TableCell>
                    <TableCell className='text-neutral-600'>{item.series}</TableCell>
                    <TableCell className='font-bold text-neutral-900'>{item.size}</TableCell>
                    <TableCell className='text-neutral-600'>{item.color}</TableCell>
                    <TableCell className='text-right text-neutral-600'>{formatCurrency(item.labelPrice || 0)}</TableCell>
                    <TableCell className='text-center text-emerald-600 font-bold'>{item.buyDiscount || '0'}%</TableCell>
                    <TableCell className='text-right text-[#C82368] font-bold'>{formatCurrency(item.buyPrice || 0)}</TableCell>
                    <TableCell className='text-center font-bold text-[#C82368]'>{item.qty_TOKO_A || 0}</TableCell>
                    <TableCell className='text-center font-bold text-neutral-900'>{item.qty_TOKO_B || 0}</TableCell>
                    <TableCell className='text-center font-bold text-emerald-700'>{item.qty_TOKO_C || 0}</TableCell>
                    <TableCell className='text-center font-serif text-base font-bold text-neutral-900'>{item.totalQty}</TableCell>
                    <TableCell className='text-right font-bold text-neutral-900 pr-6 whitespace-nowrap'>{formatCurrency((item.buyPrice || 0) * item.totalQty)}</TableCell>
                  </TableRow>
                )) : (
                    <TableRow><TableCell colSpan={15} className="h-48 text-center text-neutral-400 italic">Tidak ada data pembelian ditemukan.</TableCell></TableRow>
                )}
              </TableBody>
              {detailedStockList.length > 0 && (
                <TableFooter className="bg-[#F5F3F0] border-t border-neutral-200">
                  <TableRow className="font-bold text-sm">
                    <TableCell colSpan={13} className="pl-6 uppercase text-[11px] tracking-widest text-neutral-500">Total Pembelian</TableCell>
                    <TableCell className="text-center font-serif text-lg text-[#C82368]">{totals.totalQty}</TableCell>
                    <TableCell className="text-right font-serif text-lg text-neutral-900 pr-6">{formatCurrency(totals.totalBuy)}</TableCell>
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
