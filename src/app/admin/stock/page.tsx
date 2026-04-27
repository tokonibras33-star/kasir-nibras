'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutGrid, List, Package, PackagePlus, Search, Download, Plus, Trash2, Edit2, Shirt, Calculator, Info, Image as ImageIcon, History, Eye, FileText, FileSpreadsheet, Upload, Filter, Camera, X, Loader2, FileDown, GitMerge } from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import { useFirestore, useStorage, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import 'jspdf-autotable';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// HELPERS FOR CURRENCY FORMATTING
const formatCurrency = (val: string | number) => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? val.replace(/[^0-9]/g, '') : Math.round(val).toString();
  if (!num) return '';
  return 'Rp ' + parseInt(num).toLocaleString('id-ID');
};

const parseCurrencyInput = (val: string) => {
  return val.replace(/[^0-9]/g, '');
};

// DATABASE RECOMMENDATIONS (CLEANED)
const COLOR_DATABASE = Array.from(new Set([
  'ABU', 'ALULA GRAPE', 'AQUA BLUE', 'AQUAMARINE', 'ARMY', 'ARTIC DAISY', 'AUTUMN', 'BAMBOO', 'BATA', 'BEIGE', 'BLACK', 'BLUE', 'BLUE PASTEL', 'BLUSH', 'BRILLIANT WHITE', 'BRITISH GREEN', 'BROKEN WHITE', 'BRONZE', 'BROWN', 'BURGUNDY', 'BUTTER CREAM', 'CARAMEL LATTE', 'CARAMELO', 'CHAMPAGNE', 'CHARM SILVER', 'CHOCO', 'CHOCO LATTE', 'CHOCOLATTE', 'CINNAMON', 'CLOUD', 'CLOVER', 'COFFE', 'COFFEE', 'COKLAT BUMI', 'COKSU', 'COKTU', 'COOL GRAY', 'COPPER', 'COTTON', 'CREAM', 'CREAMY LATTE', 'DANDELION LIME', 'DARK CHOCO', 'DARK DENIM', 'DARK EMERALD', 'DARK GREY', 'DARK MAROON', 'DEEP BLUE', 'DEEP MAHOGANY', 'DEEP MAROON', 'DEEP TAUPE', 'DENIM', 'DENIM MIDNIGHT', 'DUST', 'DUSTY BLUE', 'DUSTY BROWN', 'DUSTY LAVENDER', 'DUSTY MAUVE', 'DUSTY PINK', 'DUSTY ROSE', 'EMERALD', 'EMERALD GREEN', 'FADED DENIM', 'FLAMINGO', 'FLINT', 'FLINT GREY', 'FOREST', 'FRESH GREENY', 'GALAXY SOUL', 'GLAMOUR', 'GOLD', 'GRAPES', 'GREEN TINT', 'GREY', 'GREY GROVE', 'GREY LILAC', 'GUAVA', 'HAZELNUT', 'HONEY', 'HUNTER GREEN', 'ICE BLUE', 'ICY LILAC', 'IVORY', 'JASMINE TEA', 'KHAKI', 'KRISAN OCEAN', 'KUSUMA', 'LATTE', 'LATTE BEIGE', 'LAUREL GREEN', 'LAVENDER', 'LAVENDER LILAC', 'LAVENDER MIST', 'LIGHT OLIVE', 'LILAC', 'LILAC GRAY', 'MAHOGANY', 'MAHOGANY BROWN', 'MAROON', 'MAUVE', 'MIDNIGHT', 'MIDNIGHT BLUE', 'MILKY ROSY', 'MILO', 'MINT', 'MINT SAGE', 'MOCCA', 'MOSS', 'NAVY', 'NAVY BLUE', 'NIRWANA', 'NUде', 'NUDE BEIGE', 'OLIVE', 'PALE MAUVE', 'PEACH', 'PEACHY', 'PEANUT', 'PEARLY WHITE', 'PINK', 'PLUM', 'POWDER GREEN', 'POWDER PEACH', 'PURPLE', 'RICH BLUE', 'RICH TAN', 'RICHY BLUE', 'ROSE', 'ROSE GOLD', 'RUBY', 'RUSSIAN MIST', 'SAFIR', 'SAGE', 'SAGE GREEN', 'SAKURA', 'SALMON', 'SEAFOAM', 'SEAGREEN', 'SHADOW GRAY', 'SHADOW GREY', 'SILVER', 'SKY', 'SKY BLUE', 'SMOKE GREY', 'SMOKEY GREY', 'SOFT PINK', 'SPLASH BROWN', 'STEEL', 'STEEL BLUE', 'STONE GREY', 'TEAL GREEN', 'TERACCOTA', 'TERRAWOOD', 'TOASTY DUST', 'TORTILLA X CHOCOLATE', 'TOSCA', 'VANILLA', 'VINTAGE HEATHER', 'VIOLET', 'WAFER', 'WALNUT', 'WARM BLACK', 'WARM GREY', 'WHITE', 'WINE BERRY'
].map(s => s.trim().toUpperCase())));

const BRAND_DATABASE = Array.from(new Set([
  'Aden', 'AHSAN', 'Ainun', 'Ajwa', 'ALFASA', 'Alfira', 'Aqlan', 'AR', 'ARSELLE', 'ARUMY', 'AS MOESLEM', 'Aysila', 'Dafeena', 'DENIZER', 'Elzatta', 'EMILY DAILY', 'ETHICA', 'FeeFashion', 'Gabia', 'Ghiina', 'HIJABI OFFICIAL', 'Hunny Label', 'IMIDY', 'Journey', 'Kaen', 'KAMSA', 'Kazami', 'Keke', 'Latanza', 'LUBI', 'MALIHA', 'MOSLEM DAILY', 'Nadheera Luxury', 'NARARYA', 'Nata Id', 'NIARA', 'NIBRAS', 'NIRMALA', 'Non Branded', 'Poeti', 'Rabbani', 'Raisakey', 'Ratu Bilqis', 'RAYYA', 'Rivantie', 'SALVINA', 'SAV KIDS', 'Seply', 'Ss Hijab', 'SYIFA OFFICIAL', 'Urfimutiyaro', 'Yukio', 'ZAMEERA', 'Zz Homey'
].map(s => s.trim().toUpperCase())));

const CATEGORY_DATABASE = Array.from(new Set([
  'Accesories', 'Atasan', 'Blouse', 'Bros', 'Celana', 'Ciput', 'Dompet', 'DRESS', 'GAMIS', 'GAMIS ANAK', 'Jilbab Instan', 'Jilbab Segi_4', 'Jilbab Segi_5', 'Jilbab Segi_6', 'Jilbab Segi_7', 'KOKO', 'KOKO ANAK', 'MIDI DRESS', 'Mukena', 'Mukena Anak', 'Oneset', 'Pashmina', 'Sandal', 'Sarung', 'Tas', 'Tunik'
].map(s => s.trim().toUpperCase())));

const SIZE_DATABASE = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '37', '39', '0+', '115X115', '2XL', '3XL', 'ALL', 'BIG', 'L', 'M', 'S', 'XL', 'XS', 'XXL', 'XXS', 'XXXL', 'XXXXL'
];

const generateSearchTokens = (name: string, brand: string, category: string, series: string, variants: any[]) => {
  const tokens = new Set<string>();
  const add = (val: string) => {
    if (!val) return;
    val.toLowerCase().split(/[\s-/]+/).forEach(t => {
      if (t && t.length > 0) tokens.add(t);
    });
  };
  add(name); add(brand); add(category); add(series);
  variants.forEach(v => { add(v.color); add(v.size); });
  return Array.from(tokens);
};

interface StockItemInput {
  id: string;
  brand: string;
  category: string;
  series: string;
  size: string;
  color: string;
  labelPrice: string;
  sellPrice: string;
  quantity: string;
  buyDiscount: string;
  buyPriceRp: string;
  distribution: {
    TOKO_A: string;
    TOKO_B: string;
    TOKO_C: string;
  };
  showDistribution: boolean;
}

export default function StockPage() {
  const db = useFirestore();
  const storage = useStorage();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'daily' | 'monthly'>('all');

  const [editingItem, setSelectedEditItem] = useState<any>(null);
  const [actionItem, setActionItem] = useState<any>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState('');

  const [invoiceHeader, setInvoiceHeader] = useState({
    entryDate: format(new Date(), 'yyyy-MM-dd'),
    invoiceNo: '',
    invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    proofImage: '',
  });

  const createNewItem = (): StockItemInput => ({
    id: Math.random().toString(36).substr(2, 9),
    brand: '',
    category: '',
    series: '',
    size: '',
    color: '',
    labelPrice: '',
    sellPrice: '',
    quantity: '',
    buyDiscount: '',
    buyPriceRp: '',
    distribution: { TOKO_A: '', TOKO_B: '', TOKO_C: '' },
    showDistribution: true,
  });

  const [items, setItems] = useState<StockItemInput[]>([createNewItem()]);

  const resetInputForm = () => {
    setItems([createNewItem()]);
    setInvoiceHeader({
      entryDate: format(new Date(), 'yyyy-MM-dd'),
      invoiceNo: '',
      invoiceDate: format(new Date(), 'yyyy-MM-dd'),
      proofImage: '',
    });
  };

  const stockAQuery = useMemoFirebase(() => user ? collection(db, 'stores', 'TOKO_A', 'stock') : null, [db, user]);
  const { data: dataA } = useCollection<any>(stockAQuery);
  
  const stockBQuery = useMemoFirebase(() => user ? collection(db, 'stores', 'TOKO_B', 'stock') : null, [db, user]);
  const { data: dataB } = useCollection<any>(stockBQuery);

  const stockCQuery = useMemoFirebase(() => user ? collection(db, 'stores', 'TOKO_C', 'stock') : null, [db, user]);
  const { data: dataC } = useCollection<any>(stockCQuery);

  const stockEntriesQuery = useMemoFirebase(() => {
    if (!user) return null;
    let q = query(collection(db, "stockEntries"), orderBy("timestamp", "desc"));
    if (historyDateFilter) q = query(q, where("entryDate", "==", historyDateFilter));
    return q;
  }, [db, user, historyDateFilter]);
  const { data: stockEntries } = useCollection<any>(stockEntriesQuery);

  const stockA = dataA || [];
  const stockB = dataB || [];
  const stockC = dataC || [];

  const totalA = useMemo(() => stockA.reduce((acc, p) => acc + (p.variants?.reduce((vAcc: number, v: any) => vAcc + (v.stock || 0), 0) || 0), 0), [stockA]);
  const totalB = useMemo(() => stockB.reduce((acc, p) => acc + (p.variants?.reduce((vAcc: number, v: any) => vAcc + (v.stock || 0), 0) || 0), 0), [stockB]);
  const totalC = useMemo(() => stockC.reduce((acc, p) => acc + (p.variants?.reduce((vAcc: number, v: any) => vAcc + (v.stock || 0), 0) || 0), 0), [stockC]);

  const detailedStockList = useMemo(() => {
    const allItems: any[] = [];
    const processStore = (storeData: any[], storeId: string, storeName: string) => {
        storeData.forEach(product => {
            (product.variants || []).forEach((v: any) => {
                const item = { ...v, productId: product.id, productName: product.name, brand: product.brand || '-', category: product.category || '-', series: product.series || '-', storeId, storeName, productImage: product.image || '' };
                if (storeFilter === 'ALL' || storeFilter === storeId) allItems.push(item);
            });
        });
    };

    processStore(stockA, 'TOKO_A', 'NHS KWT');
    processStore(stockB, 'TOKO_B', 'IND CO');
    processStore(stockC, 'TOKO_C', 'NHS GDM');

    const grouped = allItems.reduce((acc, item) => {
        const key = `${item.productName}-${item.invoiceDate || 'noinvdate'}-${item.invoiceNo || 'noinv'}-${item.color}-${item.size}-${item.labelPrice}-${item.buyDiscount}`;
        if (!acc[key]) {
            acc[key] = { ...item, variants: [], qty_TOKO_A: 0, qty_TOKO_B: 0, qty_TOKO_C: 0, totalQty: 0 };
        }
        acc[key][`qty_${item.storeId}`] = (acc[key][`qty_${item.storeId}`] || 0) + item.stock;
        acc[key].totalQty += item.stock;
        acc[key].variants.push(item);
        return acc;
    }, {});

    let list = Object.values(grouped).filter((item: any) => item.totalQty > 0);

    if (brandFilter !== 'ALL') list = list.filter((item: any) => item.brand === brandFilter);
    if (categoryFilter !== 'ALL') list = list.filter((item: any) => item.category === categoryFilter);
    if (invoiceDateFilter) {
        if (filterMode === 'daily') list = list.filter((item: any) => item.invoiceDate === invoiceDateFilter);
        else if (filterMode === 'monthly') list = list.filter((item: any) => item.invoiceDate?.startsWith(invoiceDateFilter.substring(0, 7)));
    }

    const tokens = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    return list.filter((item: any) => {
      if (tokens.length === 0) return true;
      const searchableText = [item.productName, item.brand, item.category, item.series, item.color, item.size, item.invoiceNo || ''].join(' ').toLowerCase();
      return tokens.every(token => searchableText.includes(token));
    }).sort((a: any, b: any) => {
        if (a.invoiceDate && b.invoiceDate) {
            if (a.invoiceDate < b.invoiceDate) return 1;
            if (a.invoiceDate > b.invoiceDate) return -1;
        }
        return a.productName?.localeCompare(b.productName || '');
    });
  }, [stockA, stockB, stockC, searchTerm, storeFilter, brandFilter, categoryFilter, invoiceDateFilter, filterMode]);

  const handleExportExcel = () => {
    if (detailedStockList.length === 0) return;
    const headers = ['Tgl Nota', 'No Nota', 'Merk', 'Kategori', 'Seri', 'Size', 'Warna', 'Label', '% Beli', 'H. Beli', 'H. Jual', 'Qty NHS KWT', 'Qty IND CO', 'Qty NHS GDM', 'Jumlah Qty'];
    const data = detailedStockList.map((item: any) => [item.invoiceDate || '-', item.invoiceNo || '-', item.brand, item.category, item.series, item.size, item.color, item.labelPrice, item.buyDiscount, item.buyPrice, item.price, item.qty_TOKO_A, item.qty_TOKO_B, item.qty_TOKO_C, item.totalQty]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Global');
    XLSX.writeFile(wb, `ekspor-stok-nibras-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Excel Berhasil Diunduh' });
  };

  const handleExportPDF = () => {
    if (detailedStockList.length === 0) return;
    const docPdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    docPdf.text('Laporan Inventaris Detail Global - Nibras House', 148, 10, { align: "center" });
    const tableData = detailedStockList.map((item: any) => [item.invoiceDate || '-', item.invoiceNo || '-', item.brand, item.category, item.size, item.color, item.qty_TOKO_A, item.qty_TOKO_B, item.qty_TOKO_C, item.totalQty, `Rp ${item.labelPrice?.toLocaleString('id-ID')}`, `Rp ${item.price?.toLocaleString('id-ID')}`]);
    (docPdf as any).autoTable({ head: [['Tgl Nota', 'No Nota', 'Merk', 'Kategori', 'Size', 'Warna', 'NHS KWT', 'IND CO', 'NHS GDM', 'Total', 'H. Label', 'H. Jual']], body: tableData, startY: 20, theme: 'grid', headStyles: { fillColor: [31, 122, 99], textColor: 255, fontSize: 7, fontStyle: 'bold' }, styles: { fontSize: 6 }});
    docPdf.save(`ekspor-stok-nibras-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'PDF Berhasil Diunduh' });
  };

  const handleDownloadFormat = () => {
    const headers = ['Tgl Nota', 'No Nota', 'Merk', 'Kategori', 'Seri', 'Size', 'Warna', 'Label', '% Beli', 'H. Beli', 'H. Jual', 'Qty NHS KWT', 'Qty IND CO', 'Qty NHS GDM', 'Jumlah Qty'];
    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Format Impor');
    XLSX.writeFile(wb, 'format-impor-stok-nibras.xlsx');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!dataA || !dataB || !dataC) {
      toast({ title: "Gagal", description: "Database toko belum siap. Mohon tunggu sebentar.", variant: "destructive" });
      return;
    }
    
    toast({ title: 'Memproses Impor...', description: 'Membaca file Excel dan mengunggah data ke server.' });
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        const rows = json.map((row: any) => (Array.isArray(row) ? row : []).map((cell: any) => String(cell ?? '').trim()));
        
        if (rows.length < 2) {
          toast({ title: 'File Kosong', description: 'Pastikan file memiliki setidaknya satu baris data.', variant: 'destructive' });
          return;
        }

        const storeSnapshots: Record<string, any[]> = {
          'TOKO_A': [...stockA],
          'TOKO_B': [...stockB],
          'TOKO_C': [...stockC]
        };

        let successCount = 0;
        const entryItems: any[] = [];

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          const qtyA = parseInt(cols[11] || '0') || 0;
          const qtyB = parseInt(cols[12] || '0') || 0;
          const qtyC = parseInt(cols[13] || '0') || 0;

          if (qtyA <= 0 && qtyB <= 0 && qtyC <= 0) continue;

          const tglNota = cols[0] || format(new Date(), 'yyyy-MM-dd');
          const noNota = cols[1] || `IMP-${format(new Date(), 'HHmm')}`;
          const merk = (cols[2] || '-').toUpperCase();
          const kategori = (cols[3] || '-').toUpperCase();
          const seri = (cols[4] || '-').toUpperCase();
          const size = (cols[5] || 'L').toUpperCase();
          const warna = (cols[6] || 'Default').toUpperCase();
          
          const label_raw = cols[7]?.replace(/[^0-9.-]+/g, '') || '0';
          const discBeli_raw = cols[8]?.replace(/[^0-9.-]+/g, '') || '0';
          const hBeli_raw = cols[9]?.replace(/[^0-9.-]+/g, '') || '0';
          const hJual_raw = cols[10]?.replace(/[^0-9.-]+/g, '') || label_raw;

          const finalLabelPrice = parseFloat(label_raw) || 0;
          const finalBuyPrice = parseFloat(hBeli_raw) || 0;
          const finalSellPrice = parseFloat(hJual_raw) || finalLabelPrice;
          
          // Logic requested: Calculate discBeli if empty/0
          let finalDiscBeli = discBeli_raw;
          if ((!finalDiscBeli || finalDiscBeli === '0') && finalLabelPrice > 0 && finalBuyPrice > 0) {
             const calcDisc = ((finalLabelPrice - finalBuyPrice) / finalLabelPrice) * 100;
             finalDiscBeli = calcDisc.toFixed(2).replace(/\.00$/, '');
          }

          const autoName = `${kategori} ${merk} ${seri} ${size} ${warna}`.trim();

          const storeConfigs = [
            { id: 'TOKO_A', qty: qtyA },
            { id: 'TOKO_B', qty: qtyB },
            { id: 'TOKO_C', qty: qtyC }
          ];
          
          storeConfigs.forEach(store => {
            if (store.qty <= 0) return;

            const variantData = {
              id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
              color: warna, 
              size: size, 
              stock: store.qty,
              labelPrice: finalLabelPrice,
              price: finalSellPrice,
              buyPrice: finalBuyPrice,
              buyDiscount: finalDiscBeli,
              invoiceNo: noNota.toUpperCase(), 
              invoiceDate: tglNota, 
              entryDate: format(new Date(), 'yyyy-MM-dd')
            };

            entryItems.push({ ...variantData, productName: autoName, targetStore: store.id, brand: merk, category: kategori, series: seri });
            
            const pool = storeSnapshots[store.id];
            let existingIdx = pool.findIndex(p => p.name?.toUpperCase() === autoName);
            
            if (existingIdx === -1) {
              const productId = `P-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
              const newProd = { 
                id: productId, name: autoName, brand: merk, category: kategori, series: seri, 
                image: `https://picsum.photos/seed/${autoName.replace(/\s+/g, '-')}/400/500`, 
                variants: [variantData], 
                searchTokens: generateSearchTokens(autoName, merk, kategori, seri, [variantData]) 
              };
              pool.push(newProd);
              setDocumentNonBlocking(doc(db, 'stores', store.id, 'stock', productId), newProd, { merge: true });
            } else {
              const existingProd = pool[existingIdx];
              const updatedVariants = [...(existingProd.variants || [])];
              const vIdx = updatedVariants.findIndex(v => 
                v.color?.toUpperCase() === warna && 
                v.size?.toUpperCase() === size &&
                v.labelPrice === finalLabelPrice &&
                v.invoiceNo?.toUpperCase() === noNota.toUpperCase()
              );
              
              if (vIdx === -1) {
                updatedVariants.push(variantData); 
              } else {
                updatedVariants[vIdx].stock += store.qty; 
              }
              
              const updatedProduct = { 
                ...existingProd, 
                variants: updatedVariants, 
                searchTokens: generateSearchTokens(existingProd.name, existingProd.brand || '-', existingProd.category || '-', existingProd.series || '-', updatedVariants) 
              };
              pool[existingIdx] = updatedProduct;
              updateDocumentNonBlocking(doc(db, 'stores', store.id, 'stock', existingProd.id), updatedProduct);
            }
            successCount++;
          });
        }

        if (successCount > 0) {
          addDocumentNonBlocking(collection(db, 'stockEntries'), { 
            entryDate: format(new Date(), 'yyyy-MM-dd'), 
            invoiceNo: `IMP-${format(new Date(), 'HHmmss')}`, 
            invoiceDate: format(new Date(), 'yyyy-MM-dd'), 
            items: entryItems, 
            timestamp: new Date().toISOString(), 
            totalItems: successCount, 
            isImport: true 
          });
          toast({ title: 'Impor Selesai', description: `${successCount} rincian barang telah dimasukkan ke database.` });
        } else {
          toast({ title: 'Tidak Ada Data Terdeteksi', description: 'Pastikan baris data memiliki angka pada kolom Qty Cabang.', variant: 'destructive' });
        }
      } catch (err) { 
        console.error(err);
        toast({ title: 'Error Sistem', description: 'Terjadi kegagalan saat memproses baris Excel.', variant: 'destructive' }); 
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const updateItemField = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item };
        if (['labelPrice', 'sellPrice', 'buyPriceRp'].includes(field)) {
          updatedItem[field as keyof StockItemInput] = parseCurrencyInput(value);
        } else if (field.startsWith('dist-')) {
          const storeId = field.split('-')[1] as keyof StockItemInput['distribution'];
          const totalQty = parseInt(item.quantity) || 0;
          const otherStoresTotal = Object.entries(item.distribution).filter(([key]) => key !== storeId).reduce((acc, [, val]) => acc + (parseInt(val as string) || 0), 0);
          let newValue = Math.min(parseInt(value) || 0, totalQty - otherStoresTotal);
          updatedItem.distribution = { ...item.distribution, [storeId]: Math.max(0, newValue).toString() };
        } else {
          updatedItem = { ...item, [field]: value };
        }

        const labelPriceNum = parseFloat(updatedItem.labelPrice) || 0;
        if (field === 'buyDiscount' && labelPriceNum > 0) {
          updatedItem.buyPriceRp = Math.round(labelPriceNum - (labelPriceNum * (parseFloat(value) || 0) / 100)).toString();
        } else if (field === 'buyPriceRp' && labelPriceNum > 0) {
          updatedItem.buyDiscount = (((labelPriceNum - (parseFloat(updatedItem.buyPriceRp) || 0)) / labelPriceNum) * 100).toFixed(2).replace(/\.00$/, '');
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const isRowDistributed = (item: StockItemInput) => {
    const total = parseInt(item.quantity) || 0;
    const distributed = Object.values(item.distribution).reduce((sum, v) => sum + (parseInt(v) || 0), 0);
    return total > 0 && distributed === total;
  };

  const handleInputStock = () => {
    if (!invoiceHeader.invoiceNo) return toast({ title: 'No Nota Beli wajib diisi.', variant: 'destructive' });
    if (!items.every(isRowDistributed)) return toast({ title: 'Distribusi cabang belum sesuai QTY total.', variant: 'destructive' });
    
    let successCount = 0;
    const entryItems: any[] = [];
    items.forEach(item => {
      if (!item.brand || !item.series || !item.color || !item.labelPrice) return;
      const autoName = `${item.category} ${item.brand} ${item.series} ${item.size} ${item.color}`.toUpperCase().trim();
      
      Object.entries(item.distribution).forEach(([targetStore, qtyStr]) => {
        const qty = parseInt(qtyStr) || 0;
        if (qty <= 0) return;
        const variantData = {
          id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          color: item.color.toUpperCase(), size: item.size.toUpperCase(), stock: qty, labelPrice: parseFloat(item.labelPrice), price: parseFloat(item.sellPrice || item.labelPrice), buyPrice: parseFloat(item.buyPriceRp || '0'), buyDiscount: item.buyDiscount || '0', invoiceNo: invoiceHeader.invoiceNo.toUpperCase(), invoiceDate: invoiceHeader.invoiceDate, entryDate: invoiceHeader.entryDate
        };
        entryItems.push({ ...variantData, productName: autoName, targetStore, brand: item.brand.toUpperCase(), category: item.category.toUpperCase(), series: item.series.toUpperCase() });
        
        const storeProducts = targetStore === 'TOKO_A' ? stockA : targetStore === 'TOKO_B' ? stockB : stockC;
        let existing = storeProducts.find(p => p.name?.toUpperCase() === autoName);
        if (!existing) {
          const productId = `P-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setDocumentNonBlocking(doc(db, 'stores', targetStore, 'stock', productId), { id: productId, name: autoName, brand: item.brand.toUpperCase(), category: item.category.toUpperCase(), series: item.series.toUpperCase(), image: `https://picsum.photos/seed/${autoName.replace(/\s+/g, '-')}/400/500`, variants: [variantData], searchTokens: generateSearchTokens(autoName, item.brand, item.category, item.series, [variantData]) }, { merge: true });
        } else {
          const updated = [...(existing.variants || [])];
          const vIdx = updated.findIndex(v => v.color?.toUpperCase() === item.color.toUpperCase() && v.size?.toUpperCase() === item.size.toUpperCase() && v.labelPrice === parseFloat(item.labelPrice) && v.invoiceNo?.toUpperCase() === invoiceHeader.invoiceNo.toUpperCase());
          if (vIdx === -1) updated.push(variantData); else updated[vIdx].stock += qty;
          updateDocumentNonBlocking(doc(db, 'stores', targetStore, 'stock', existing.id), { variants: updated, searchTokens: generateSearchTokens(existing.name, existing.brand || '-', existing.category || '-', existing.series || '-', updated) });
        }
        successCount++;
      });
    });
    if (successCount > 0) {
      addDocumentNonBlocking(collection(db, 'stockEntries'), { entryDate: invoiceHeader.entryDate, invoiceNo: invoiceHeader.invoiceNo, invoiceDate: invoiceHeader.invoiceDate, items: entryItems, timestamp: new Date().toISOString(), totalItems: successCount });
      setIsInputOpen(false); resetInputForm(); toast({ title: 'Stok berhasil disimpan.' });
    }
  };

  const handleUpdateEdit = () => {
    if (!editingItem) return;
    const { storeId, productId, id: vId, price, stock, labelPrice, buyPrice, buyDiscount, invoiceNo, invoiceDate, color, size, brand, category, series } = editingItem;
    const sourceProducts = storeId === 'TOKO_A' ? stockA : storeId === 'TOKO_B' ? stockB : stockC;
    const product = sourceProducts.find(p => p.id === productId);
    if (product) {
      const updatedVariants = (product.variants || []).map((v: any) => v.id === vId ? { ...v, price: parseFloat(price), stock: parseInt(stock), labelPrice: parseFloat(labelPrice), buyPrice: parseFloat(buyPrice), buyDiscount: buyDiscount || '0', invoiceNo: invoiceNo.toUpperCase(), invoiceDate, color: color.toUpperCase(), size: size.toUpperCase() } : v);
      const autoName = `${category} ${brand} ${series} ${size} ${color}`.toUpperCase().trim();
      updateDocumentNonBlocking(doc(db, 'stores', storeId, 'stock', productId), { variants: updatedVariants, name: autoName, brand: brand.toUpperCase(), category: category.toUpperCase(), series: series.toUpperCase(), searchTokens: generateSearchTokens(autoName, brand, category, series, updatedVariants) });
      setSelectedEditItem(null); toast({ title: 'Data diperbarui.' });
    }
  };

  return (
    <div className='space-y-6 max-w-full overflow-hidden'>
      {/* Hidden file input for stability */}
      <input 
        ref={fileInputRef}
        type='file' 
        accept='.xlsx,.xls,.csv' 
        className='hidden' 
        onChange={handleImportExcel} 
      />

      <datalist id='color-recommendations'>{COLOR_DATABASE.map((color, idx) => <option key={`col-${color}-${idx}`} value={color} />)}</datalist>
      <datalist id='brand-recommendations'>{BRAND_DATABASE.map((brand, idx) => <option key={`brd-${brand}-${idx}`} value={brand} />)}</datalist>
      <datalist id='category-recommendations'>{CATEGORY_DATABASE.map((cat, idx) => <option key={`cat-${cat}-${idx}`} value={cat} />)}</datalist>
      <datalist id='size-recommendations'>{SIZE_DATABASE.map((size, idx) => <option key={`sz-${size}-${idx}`} value={size} />)}</datalist>

      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div><h1 className='text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary uppercase'>Ringkasan Stok Global</h1><p className='text-muted-foreground text-sm'>Monitoring rincian inventaris seluruh cabang.</p></div>
        <div className='flex flex-col gap-2 w-full sm:w-auto'>
          <div className='grid grid-cols-2 gap-2 sm:flex sm:items-center'>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant='outline' className='h-10 font-bold'><Upload className='h-4 w-4 mr-2' /> Impor Stok</Button></DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56 rounded-xl'>
                <DropdownMenuItem className='cursor-pointer font-bold gap-2 py-3' onClick={() => fileInputRef.current?.click()}>
                  <FileSpreadsheet className='h-4 w-4 text-emerald-600' /> Unggah File Excel
                </DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer font-bold gap-2 py-3' onClick={handleDownloadFormat}><FileDown className='h-4 w-4 text-primary' /> Format Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant='outline' className='h-10 font-bold'><Download className='h-4 w-4 mr-2' /> Ekspor Stok</Button></DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-48 rounded-xl'>
                <DropdownMenuItem className='cursor-pointer font-bold gap-2 py-3' onClick={handleExportExcel}><FileSpreadsheet className='h-4 w-4 text-emerald-600' /> Excel</DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer font-bold gap-2 py-3' onClick={handleExportPDF}><FileText className='h-4 w-4 text-rose-600' /> PDF (A4)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className='grid grid-cols-2 gap-2 sm:flex sm:items-center'>
            <Button variant="outline" className="h-12 px-6 font-bold" onClick={() => setIsHistoryOpen(true)}><History className="h-5 w-5 mr-2" /> Riwayat Input</Button>
            <Dialog open={isInputOpen} onOpenChange={(o) => { setIsInputOpen(o); if (o) resetInputForm(); }}>
              <DialogTrigger asChild><Button className='h-12 px-6 font-black bg-primary shadow-xl shadow-primary/20 text-white'><PackagePlus className='h-5 w-5 mr-2' /> Input Stok Baru</Button></DialogTrigger>
              <DialogContent className='sm:max-w-5xl w-[95vw] h-[90vh] rounded-3xl flex flex-col p-0 overflow-hidden border-none shadow-2xl'>
                <DialogHeader className='p-6 shrink-0'><DialogTitle className='text-2xl font-black'>Input Stok & Nota Beli</DialogTitle></DialogHeader>
                <div className='flex-1 overflow-y-auto px-6 bg-slate-50'>
                  <div className='space-y-6 py-4'>
                    <Card className='border-none shadow-none bg-muted/30 rounded-2xl'><CardContent className='p-4 grid grid-cols-1 sm:grid-cols-4 gap-4'><div className='space-y-1.5'><Label className='text-[10px] font-black uppercase text-muted-foreground'>Tanggal Entry</Label><Input type='date' value={invoiceHeader.entryDate} disabled className='h-10 bg-white/50' /></div><div className='space-y-1.5'><Label className='text-[10px] font-black uppercase'>No Nota Beli</Label><Input placeholder='NB-001' value={invoiceHeader.invoiceNo} onChange={e => setInvoiceHeader({...invoiceHeader, invoiceNo: e.target.value})} className='h-10 bg-white font-bold' /></div><div className='space-y-1.5'><Label className='text-[10px] font-black uppercase'>Tanggal Nota</Label><Input type='date' value={invoiceHeader.invoiceDate} onChange={e => setInvoiceHeader({...invoiceHeader, invoiceDate: e.target.value})} className='h-10 bg-white' /></div></CardContent></Card>
                    <div className='space-y-4 pb-8'>{items.map((item) => {
                        const isDistOk = isRowDistributed(item);
                        return (
                          <Card key={item.id} className={cn('relative border-2 rounded-2xl shadow-sm', isDistOk ? 'border-emerald-200 bg-emerald-50/20' : 'border-primary/10 bg-primary/5')}>{items.length > 1 && <Button variant='destructive' size='icon' className='absolute top-2 right-2 h-8 w-8 rounded-full' onClick={() => setItems(items.filter(i => i.id !== item.id))}><Trash2 className='h-4 w-4' /></Button>}<CardContent className='p-5 space-y-4'><div className='grid grid-cols-2 md:grid-cols-6 gap-4'><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Merk</Label><Input value={item.brand} list='brand-recommendations' onChange={e => updateItemField(item.id, 'brand', e.target.value)} className='h-9 bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Kategori</Label><Input value={item.category} list='category-recommendations' onChange={e => updateItemField(item.id, 'category', e.target.value)} className='h-9 bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Seri</Label><Input value={item.series} onChange={e => updateItemField(item.id, 'series', e.target.value)} className='h-9 bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Size</Label><Input value={item.size} list='size-recommendations' onChange={e => updateItemField(item.id, 'size', e.target.value)} className='h-9 bg-white text-center' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Warna</Label><Input value={item.color} list='color-recommendations' onChange={e => updateItemField(item.id, 'color', e.target.value)} className='h-9 bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Label</Label><Input value={formatCurrency(item.labelPrice)} onChange={e => updateItemField(item.id, 'labelPrice', e.target.value)} className='h-9 font-bold bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-emerald-600'>% Beli</Label><Input value={item.buyDiscount} onChange={e => updateItemField(item.id, 'buyDiscount', e.target.value)} className='h-9 bg-white font-bold border-emerald-200' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-primary'>H. Beli</Label><Input value={formatCurrency(item.buyPriceRp)} onChange={e => updateItemField(item.id, 'buyPriceRp', e.target.value)} className='h-9 font-bold bg-white border-primary/20' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-accent'>H. Jual</Label><Input value={formatCurrency(item.sellPrice)} onChange={e => updateItemField(item.id, 'sellPrice', e.target.value)} className='h-9 font-bold bg-white border-accent/30' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-blue-600'>QTY (Total)</Label><Input type='number' value={item.quantity} onChange={e => updateItemField(item.id, 'quantity', e.target.value)} className='h-9 bg-white border-blue-200' /></div><div className='col-span-2 flex flex-col justify-end'><Button variant={isDistOk ? 'secondary' : 'outline'} className={cn('w-full h-9 font-black', isDistOk ? 'bg-emerald-500 text-white' : 'border-primary text-primary')}><GitMerge className='h-4 w-4 mr-2' /> BAGI CABANG</Button></div></div><div className='pt-4 border-t border-primary/10 grid grid-cols-3 gap-4'><div className='space-y-1'><Label className='text-[9px] font-black text-primary'>NHS KWT</Label><Input type='number' value={item.distribution.TOKO_A} onChange={e => updateItemField(item.id, 'dist-TOKO_A', e.target.value)} className='h-10 bg-white font-black text-center' /></div><div className='space-y-1'><Label className='text-[9px] font-black text-blue-600'>IND CO</Label><Input type='number' value={item.distribution.TOKO_B} onChange={e => updateItemField(item.id, 'dist-TOKO_B', e.target.value)} className='h-10 bg-white font-black text-center' /></div><div className='space-y-1'><Label className='text-[9px] font-black text-emerald-600'>NHS GDM</Label><Input type='number' value={item.distribution.TOKO_C} onChange={e => updateItemField(item.id, 'dist-TOKO_C', e.target.value)} className='h-10 bg-white font-black text-center' /></div></div></CardContent></Card>
                        );
                    })}
                      <Button variant='outline' onClick={() => setItems([...items, createNewItem()])} className='w-full h-14 border-2 border-dashed border-primary/20 text-primary font-black rounded-2xl'><Plus className='h-5 w-5 mr-2' /> TAMBAH BARIS BARU</Button>
                    </div>
                  </div>
                </div>
                <DialogFooter className='p-6 bg-white border-t shrink-0'><Button className='w-full font-black h-14 rounded-2xl shadow-2xl text-lg' onClick={handleInputStock}>SIMPAN KE DATABASE</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-3 gap-4'>
        <Card className='border-none bg-primary/5'><CardHeader className='p-4'><CardTitle className='text-xs uppercase font-black text-primary opacity-70'>NHS KWT</CardTitle></CardHeader><CardContent className='p-4 pt-0'><p className='text-3xl font-black text-primary'>{totalA} Unit</p></CardContent></Card>
        <Card className='border-none bg-blue-50'><CardHeader className='p-4'><CardTitle className='text-xs uppercase font-black text-blue-600 opacity-70'>IND CO</CardTitle></CardHeader><CardContent className='p-4 pt-0'><p className='text-3xl font-black text-blue-600'>{totalB} Unit</p></CardContent></Card>
        <Card className='border-none bg-emerald-50'><CardHeader className='p-4'><CardTitle className='text-xs uppercase font-black text-emerald-600 opacity-70'>NHS GDM</CardTitle></CardHeader><CardContent className='p-4 pt-0'><p className='text-3xl font-black text-emerald-600'>{totalC} Unit</p></CardContent></Card>
      </div>

      <Card className='soft-shadow border-none overflow-hidden rounded-3xl flex flex-col'>
        <CardHeader className='p-6 border-b bg-muted/10'>
            <div className='flex items-center justify-between'><div className='space-y-1'><CardTitle className='text-xl font-black uppercase tracking-tight'>Inventaris Detail Global</CardTitle><CardDescription className='text-xs'>Daftar rincian barang seluruh cabang.</CardDescription></div><div className='flex items-center border rounded-xl p-1 bg-white'><Button variant={view === 'table' ? 'secondary' : 'ghost'} size='icon' onClick={() => setView('table')}><List className='h-4 w-4' /></Button><Button variant={view === 'grid' ? 'secondary' : 'ghost'} size='icon' onClick={() => setView('grid')}><LayoutGrid className='h-4 w-4' /></Button></div></div>
            <div className="flex flex-col space-y-3 mt-4">
                <div className='relative flex-1'><Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' /><Input placeholder='Cari Merk, Kategori, Warna, Nama...' className='pl-10 h-10 bg-white border-none shadow-sm' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <div className="flex items-center gap-3">
                    <Select value={brandFilter} onValueChange={setBrandFilter}><SelectTrigger className='h-10 w-44 bg-white border-none shadow-sm font-bold'><SelectValue placeholder='Merk' /></SelectTrigger><SelectContent>{['ALL', ...BRAND_DATABASE].map((b, i) => <SelectItem key={`${b}-${i}`} value={b}>{b}</SelectItem>)}</SelectContent></Select>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className='h-10 w-44 bg-white border-none shadow-sm font-bold'><SelectValue placeholder='Kategori' /></SelectTrigger><SelectContent>{['ALL', ...CATEGORY_DATABASE].map((c, i) => <SelectItem key={`${c}-${i}`} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                    <Select value={storeFilter} onValueChange={setStoreFilter}><SelectTrigger className='h-10 w-44 bg-white border-none shadow-sm font-bold'><SelectValue placeholder='Toko' /></SelectTrigger><SelectContent><SelectItem value='ALL'>Semua Toko</SelectItem><SelectItem value='TOKO_A'>NHS KWT</SelectItem><SelectItem value='TOKO_B'>IND CO</SelectItem><SelectItem value='TOKO_C'>NHS GDM</SelectItem></SelectContent></Select>
                </div>
            </div>
        </CardHeader>
        <CardContent className='p-0 flex-1'>{view === 'table' ? (
          <div className='overflow-x-auto'><div className='min-w-[1800px]'><Table><TableHeader className='bg-muted/50'><TableRow className='text-[10px] uppercase font-black'><TableHead className='pl-6'>Aksi</TableHead><TableHead>Tgl Nota</TableHead><TableHead>No Nota</TableHead><TableHead>Merk</TableHead><TableHead>Kategori</TableHead><TableHead>Seri</TableHead><TableHead>Size</TableHead><TableHead>Warna</TableHead><TableHead className='text-right'>Label</TableHead><TableHead className='text-center'>% Beli</TableHead><TableHead className='text-right'>H. Beli</TableHead><TableHead className='text-right'>H. Jual</TableHead><TableHead className='text-center'>Qty KWT</TableHead><TableHead className='text-center'>Qty IND</TableHead><TableHead className='text-center'>Qty GDM</TableHead><TableHead className='text-center'>Jumlah Qty</TableHead><TableHead className='pr-6'>Nama Barang</TableHead></TableRow></TableHeader><TableBody>{detailedStockList.map((item, idx) => (<TableRow key={idx} className='hover:bg-muted/20 text-[11px] border-b'><TableCell className='pl-6'><Button variant='outline' size='icon' className='h-7 w-7' onClick={() => setActionItem(item)}><List className='h-3.5 w-3.5' /></Button></TableCell><TableCell>{item.invoiceDate || '-'}</TableCell><TableCell className='font-mono font-bold'>{item.invoiceNo || '-'}</TableCell><TableCell className='font-bold uppercase'>{item.brand}</TableCell><TableCell className='uppercase'>{item.category}</TableCell><TableCell className='uppercase'>{item.series}</TableCell><TableCell className='font-black'>{item.size}</TableCell><TableCell className='uppercase'>{item.color}</TableCell><TableCell className='text-right'>{formatCurrency(item.labelPrice)}</TableCell><TableCell className='text-center text-emerald-600'>{item.buyDiscount}%</TableCell><TableCell className='text-right text-primary font-bold'>{formatCurrency(item.buyPrice)}</TableCell><TableCell className='text-right font-black text-accent'>{formatCurrency(item.price)}</TableCell><TableCell className='text-center font-black text-primary'>{item.qty_TOKO_A}</TableCell><TableCell className='text-center font-black text-blue-600'>{item.qty_TOKO_B}</TableCell><TableCell className='text-center font-black text-emerald-600'>{item.qty_TOKO_C}</TableCell><TableCell className='text-center font-black text-lg'>{item.totalQty}</TableCell><TableCell className='font-bold pr-6 uppercase'>{item.productName}</TableCell></TableRow>))}</TableBody></Table></div></div>
        ) : (
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 bg-slate-50/50'>{detailedStockList.map((item, idx) => (<Card key={idx} className='border-none bg-white soft-shadow rounded-2xl group transition-transform hover:scale-[1.02]'><CardContent className='p-4 space-y-3'><div className='flex justify-between items-start'><div style={{ backgroundImage: `url(${item.productImage || 'https://placehold.co/400x500/E2E8F0/A0AEC0?text=No+Image'})`}} className='h-20 w-16 rounded-lg bg-cover bg-center bg-muted shadow-sm'></div><Button variant='outline' size='icon' className='h-8 w-8' onClick={() => setActionItem(item)}><List className='h-4 w-4' /></Button></div><div><h4 className='font-black text-xs uppercase leading-tight line-clamp-2'>{item.productName}</h4><p className='text-[10px] text-muted-foreground mt-1 uppercase'>{item.brand} | {item.category}</p></div><div className='grid grid-cols-2 gap-2 pt-2 border-t border-dashed'><div><p className='text-[8px] uppercase font-black opacity-50'>Harga Jual</p><p className='text-xs font-black text-accent'>{formatCurrency(item.price)}</p></div><div className='text-right'><p className='text-[8px] uppercase font-black opacity-50'>Total Stok</p><p className='text-xs font-black text-primary'>{item.totalQty} PCS</p></div></div><div className='flex justify-between pt-2 border-t text-[10px]'><Badge variant='outline' className='bg-primary/5 text-primary border-none uppercase'>KWT: {item.qty_TOKO_A}</Badge><Badge variant='outline' className='bg-blue-50 text-blue-700 border-none uppercase'>IND: {item.qty_TOKO_B}</Badge><Badge variant='outline' className='bg-emerald-50 text-emerald-700 border-none uppercase'>GDM: {item.qty_TOKO_C}</Badge></div></CardContent></Card>))}</div>
        )}</CardContent>
      </Card>

      <Dialog open={!!actionItem} onOpenChange={o => !o && setActionItem(null)}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader><DialogTitle className="uppercase font-black">Aksi Barang</DialogTitle><DialogDescription className="uppercase font-bold">{actionItem?.productName}</DialogDescription></DialogHeader>
          <Table><TableHeader><TableRow className="text-[10px] uppercase font-black"><TableHead>Cabang</TableHead><TableHead>Stok</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{actionItem?.variants.map((v: any) => (<TableRow key={v.id}><TableCell><Badge variant='outline' className={cn('text-[9px] font-black', v.storeId === 'TOKO_A' ? 'bg-primary/10 text-primary' : v.storeId === 'TOKO_B' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700')}>{v.storeName}</Badge></TableCell><TableCell className="font-bold">{v.stock}</TableCell><TableCell className="text-right"><Button variant='ghost' size='icon' className='h-8 w-8 text-primary' onClick={() => { setSelectedEditItem(v); setActionItem(null); }}><Edit2 className='h-4 w-4' /></Button><Button variant='ghost' size='icon' className='h-8 w-8 text-destructive' onClick={() => { if(confirm('Hapus rincian ini?')) { deleteDocumentNonBlocking(doc(db, 'stores', v.storeId, 'stock', v.productId)); setActionItem(null); } }}><Trash2 className='h-4 w-4' /></Button></TableCell></TableRow>))}</TableBody></Table>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={o => !o && setSelectedEditItem(null)}>
        <DialogContent className='max-w-2xl rounded-3xl overflow-hidden p-0 border-none shadow-2xl'>
          <DialogHeader className='p-6 bg-primary text-white'><DialogTitle className='text-xl font-black uppercase'>Edit Rincian Barang</DialogTitle></DialogHeader>
          {editingItem && (<div className='p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-slate-50/50'><div className='grid grid-cols-1 md:grid-cols-2 gap-6'><div className='space-y-4'><div className='grid gap-3 p-4 bg-white rounded-2xl border shadow-sm'><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>No Nota</Label><Input value={editingItem.invoiceNo || ''} onChange={e => setSelectedEditItem({...editingItem, invoiceNo: e.target.value})} className='h-10 font-bold uppercase' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Merk</Label><Input value={editingItem.brand || ''} list='brand-recommendations' onChange={e => setSelectedEditItem({...editingItem, brand: e.target.value.toUpperCase()})} className='h-10 uppercase' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Kategori</Label><Input value={editingItem.category || ''} list='category-recommendations' onChange={e => setSelectedEditItem({...editingItem, category: e.target.value.toUpperCase()})} className='h-10 uppercase' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Warna & Ukuran</Label><div className='flex gap-2'><Input value={editingItem.color || ''} list='color-recommendations' onChange={e => setSelectedEditItem({...editingItem, color: e.target.value.toUpperCase()})} className='uppercase' /><Input value={editingItem.size || ''} list='size-recommendations' onChange={e => setSelectedEditItem({...editingItem, size: e.target.value.toUpperCase()})} className='uppercase w-20 text-center' /></div></div></div></div><div className='space-y-4'><div className='grid gap-3 p-4 bg-white rounded-2xl border shadow-sm'><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Harga Label</Label><Input value={formatCurrency(editingItem.labelPrice)} onChange={e => setSelectedEditItem({...editingItem, labelPrice: parseCurrencyInput(e.target.value)})} className='h-10 font-bold' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-accent'>Harga Jual</Label><Input value={formatCurrency(editingItem.price)} onChange={e => setSelectedEditItem({...editingItem, price: parseCurrencyInput(e.target.value)})} className='h-10 font-bold' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-blue-600'>Stok</Label><Input type='number' value={editingItem.stock || 0} onChange={e => setSelectedEditItem({...editingItem, stock: e.target.value})} className='h-10 font-bold' /></div></div></div></div></div>)}
          <DialogFooter className='p-6 bg-white border-t'><Button className='w-full font-black h-14 rounded-2xl shadow-xl' onClick={handleUpdateEdit}>SIMPAN PERUBAHAN</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-4xl w-[95vw] h-[90vh] rounded-3xl flex flex-col">
            <DialogHeader><DialogTitle className="uppercase font-black">Riwayat Input Stok</DialogTitle></DialogHeader>
            <div className="flex items-center gap-2 mb-4"><Label className="text-[10px] font-black uppercase">Filter Tanggal:</Label><Input type="date" value={historyDateFilter} onChange={e => setHistoryDateFilter(e.target.value)} className="w-44" /></div>
            <ScrollArea className="flex-1"><Table><TableHeader><TableRow className="text-[10px] uppercase font-black"><TableHead>Waktu</TableHead><TableHead>No Nota</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{(stockEntries || []).map(entry => (<TableRow key={entry.id} className="text-xs"><TableCell className="text-muted-foreground">{format(new Date(entry.timestamp), 'dd/MM/yyyy HH:mm')}</TableCell><TableCell className="font-bold uppercase">{entry.invoiceNo}</TableCell><TableCell className="font-medium">{entry.totalItems} items</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => setViewingHistoryItem(entry)}><Eye className="h-4 w-4" /></Button></TableCell></TableRow>))}</TableBody></Table></ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
