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

    let list: any[] = Object.values(grouped).filter((item: any) => item.totalQty > 0);

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
    <div className='space-y-4 sm:space-y-5 pb-8'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'>
        <div>
          <p className='text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400'>Procurement Report</p>
          <h1 className='text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight'>Laporan Pembelian</h1>
          <p className='text-neutral-500 text-xs sm:text-sm mt-0.5'>Rincian barang yang dibeli dari seluruh riwayat input stok.</p>
        </div>
        <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
          <Button variant='outline' onClick={handleExportExcel} className='h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none'><FileSpreadsheet className='h-3.5 w-3.5 mr-1.5 text-emerald-600' /> EXCEL</Button>
          <Button variant='outline' onClick={handleExportPDF} className='h-8 sm:h-9 rounded-full px-3.5 sm:px-4 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white hover:bg-neutral-50 flex-1 sm:flex-none'><FileText className='h-3.5 w-3.5 mr-1.5 text-[#C82368]' /> PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        <Card className="border-none shadow-sm bg-neutral-950 text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider mb-0.5 truncate">Total Nilai Belanja</p>
          <p className="text-sm sm:text-xl md:text-2xl font-serif font-bold truncate">{formatCurrency(totals.totalBuy)}</p>
        </Card>
        <Card className="border-none shadow-sm bg-[#C82368] text-white rounded-2xl sm:rounded-3xl p-3.5 sm:p-5">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase text-white/75 tracking-wider mb-0.5 truncate">Total Qty Masuk</p>
          <p className="text-sm sm:text-xl md:text-2xl font-serif font-bold truncate">{totals.totalQty} PCS</p>
        </Card>
      </div>

      <Card className='bg-white border border-neutral-200/70 shadow-sm overflow-hidden rounded-2xl sm:rounded-3xl flex flex-col'>
      <CardHeader className='p-3 sm:p-5 space-y-2.5 sm:space-y-3.5 border-b border-neutral-100 bg-white'>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:items-end gap-2 sm:gap-3">
            <div className='col-span-2 sm:col-span-1 relative md:flex-1'>
              <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 mb-1 hidden md:block">Pencarian</Label>
              <div className="relative">
                <Search className='absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400' />
                <Input placeholder='Cari produk, nota, seri...' className='pl-9 h-9 bg-[#F5F3F0] border border-neutral-200/70 text-[11px] sm:text-xs rounded-full' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1 md:w-36">
                <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 hidden md:block">Tipe Periode</Label>
                <Select onValueChange={(v) => setFilterMode(v as any)} value={filterMode}>
                    <SelectTrigger className='h-9 w-full bg-[#F5F3F0] border border-neutral-200/70 text-[11px] sm:text-xs font-bold rounded-full px-3.5'><SelectValue placeholder="Tipe" /></SelectTrigger>
                    <SelectContent className='rounded-2xl'><SelectItem value="all" className="text-xs">Semua</SelectItem><SelectItem value="monthly" className="text-xs">Bulan</SelectItem><SelectItem value="daily" className="text-xs">Hari</SelectItem></SelectContent>
                </Select>
            </div>
            <div className="space-y-1 md:w-44">
                <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 hidden md:block">Pilih Waktu</Label>
                {filterMode === "daily" && <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className='h-9 bg-[#F5F3F0] border border-neutral-200/70 text-[11px] sm:text-xs rounded-full px-3.5 font-bold' />}
                {filterMode === "monthly" && <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className='h-9 bg-[#F5F3F0] border border-neutral-200/70 text-[11px] sm:text-xs rounded-full px-3.5 font-bold' />}
                {filterMode === "all" && <div className='h-9 bg-[#F5F3F0] border border-neutral-200/70 rounded-full flex items-center justify-center text-[11px] sm:text-xs text-neutral-400 font-bold'>Semua Waktu</div>}
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <div className="space-y-1">
                <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 hidden md:block">Merek</Label>
                <Select value={brandFilter} onValueChange={setBrandFilter}><SelectTrigger className='h-9 w-full bg-[#F5F3F0] border border-neutral-200/70 text-[11px] sm:text-xs font-bold rounded-full px-3.5'><SelectValue placeholder='Merk' /></SelectTrigger><SelectContent className='rounded-2xl'><SelectItem value='ALL' className="text-xs">Semua Merek</SelectItem>{BRAND_DATABASE.map(b => <SelectItem key={b} value={b} className="text-xs">{b}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1">
                <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 hidden md:block">Kategori</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className='h-9 w-full bg-[#F5F3F0] border border-neutral-200/70 text-[11px] sm:text-xs font-bold rounded-full px-3.5'><SelectValue placeholder='Kat' /></SelectTrigger><SelectContent className='rounded-2xl'><SelectItem value='ALL' className="text-xs">Semua Kategori</SelectItem>{CATEGORY_DATABASE.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1">
                <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2 hidden md:block">Cabang</Label>
                <Select value={storeFilter} onValueChange={setStoreFilter}><SelectTrigger className='h-9 w-full bg-[#F5F3F0] border border-neutral-200/70 text-[11px] sm:text-xs font-bold rounded-full px-3.5'><SelectValue placeholder='Toko' /></SelectTrigger><SelectContent className='rounded-2xl'><SelectItem value='ALL' className="text-xs">Semua Cabang</SelectItem><SelectItem value='TOKO_A' className="text-xs">NHS KWT</SelectItem><SelectItem value='TOKO_B' className="text-xs">IND CO</SelectItem><SelectItem value='TOKO_C' className="text-xs">NHS GDM</SelectItem></SelectContent></Select>
            </div>
            <div className="flex items-end">
                <Button variant="ghost" className="h-9 w-full rounded-full text-[11px] sm:text-xs font-bold bg-neutral-100 hover:bg-neutral-200 text-neutral-700" onClick={() => { setSearchTerm(''); setBrandFilter('ALL'); setCategoryFilter('ALL'); setFilterMode('all'); setStoreFilter('ALL'); }}><X className="h-3.5 w-3.5 mr-1" /> RESET</Button>
            </div>
        </div>
    </CardHeader>
        <CardContent className='p-0 flex-1'>
          {/* Mobile Compact Cards (Zero Horizontal Scroll) */}
          <div className='md:hidden divide-y divide-neutral-100'>
            {detailedStockList.length > 0 ? detailedStockList.map((item: any, idx) => (
              <div key={idx} className='p-3 space-y-2 hover:bg-[#F5F3F0]/50 transition-colors'>
                <div className='flex items-start justify-between gap-2'>
                  <div className='min-w-0 flex-1'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <span className='font-mono font-bold text-[10px] text-neutral-900'>{item.invoiceNo || '-'}</span>
                      <span className='text-[9px] text-neutral-400'>{item.invoiceDate || '-'}</span>
                    </div>
                    <p className='font-bold text-xs uppercase text-neutral-900 mt-0.5 break-words'>{item.brand} • {item.category} {item.series && item.series !== '-' ? `• ${item.series}` : ''}</p>
                    <div className='flex items-center gap-1.5 mt-1'>
                      <span className='text-[9px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800 uppercase'>{item.size}</span>
                      <span className='text-[9px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 uppercase'>{item.color}</span>
                      <span className='text-[9px] font-bold text-emerald-700'>Disc Beli {item.buyDiscount || '0'}%</span>
                    </div>
                  </div>
                  <div className='text-right shrink-0'>
                    <p className='text-[8px] font-bold uppercase text-neutral-400'>Total Beli</p>
                    <p className='text-xs font-bold text-neutral-950'>{formatCurrency((item.buyPrice || 0) * item.totalQty)}</p>
                    <p className='text-[9px] text-[#C82368] font-bold'>@{formatCurrency(item.buyPrice || 0)}</p>
                  </div>
                </div>
                <div className='grid grid-cols-4 gap-1.5 text-center'>
                  <div className='rounded-lg bg-[#C82368]/10 py-1'><p className='text-[8px] font-bold text-[#C82368]/80'>KWT</p><p className='text-[10px] font-bold text-[#C82368]'>{item.qty_TOKO_A || 0}</p></div>
                  <div className='rounded-lg bg-neutral-100 py-1'><p className='text-[8px] font-bold text-neutral-400'>IND</p><p className='text-[10px] font-bold text-neutral-900'>{item.qty_TOKO_B || 0}</p></div>
                  <div className='rounded-lg bg-emerald-50 py-1'><p className='text-[8px] font-bold text-emerald-700/80'>GDM</p><p className='text-[10px] font-bold text-emerald-700'>{item.qty_TOKO_C || 0}</p></div>
                  <div className='rounded-lg bg-neutral-950 py-1'><p className='text-[8px] font-bold text-neutral-400'>Total</p><p className='text-[10px] font-bold text-white'>{item.totalQty}</p></div>
                </div>
              </div>
            )) : (
              <div className='p-8 text-center text-xs text-neutral-400 italic'>Tidak ada data pembelian ditemukan.</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className='hidden md:block w-full overflow-x-auto'>
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
