'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LayoutGrid, List, Package, PackagePlus, Search, Download, Plus, Trash2, Edit2, Shirt, Calculator, Info, Image as ImageIcon, History, Eye, FileText, FileSpreadsheet, Upload, Filter, Camera, X, Loader2, FileDown, GitMerge } from 'lucide-react';
import { useState, useMemo } from 'react';
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
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// HELPERS FOR CURRENCY FORMATTING (Rp and Thousand Separator)
const formatCurrency = (val: string | number) => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? val.replace(/[^0-9]/g, '') : Math.round(val).toString();
  if (!num) return '';
  return 'Rp ' + parseInt(num).toLocaleString('id-ID');
};

const parseCurrency = (val: string) => {
  return val.replace(/[^0-9]/g, '');
};

// DATABASE WARNA UNTUK REKOMENDASI
const COLOR_DATABASE = [
  'ABU', 'ALULA GRAPE', 'AQUA BLUE', 'AQUAMARINE', 'ARMY', 'ARTIC DAISY', 'AUTUMN', 'BAMBOO', 'BATA', 'BEIGE', 'BLACK', 'BLUE', 'BLUE PASTEL', 'BLUSH', 'BRILLIANT WHITE', 'BRITISH GREEN', 'BROKEN WHITE', 'BRONZE', 'BROWN', 'BURGUNDY', 'BUTTER CREAM', 'CARAMEL LATTE', 'CARAMELO', 'CHAMPAGNE', 'CHARM SILVER', 'CHOCO', 'CHOCO LATTE', 'CHOCOLATTE', 'CINNAMON', 'CLOUD', 'CLOVER', 'COFFE', 'COFFEE', 'COKLAT BUMI', 'COKSU', 'COKTU', 'COOL GRAY', 'COPPER', 'COTTON', 'CREAM', 'CREAMY LATTE', 'DANDELION LIME', 'DARK CHOCO', 'DARK DENIM', 'DARK EMERALD', 'DARK GREY', 'DARK MAROON', 'DEEP BLUE', 'DEEP MAHOGANY', 'DEEP MAROON', 'DEEP TAUPE', 'DENIM', 'DENIM MIDNIGHT', 'DUST', 'DUSTY BLUE', 'DUSTY BROWN', 'DUSTY LAVENDER', 'DUSTY MAUVE', 'DUSTY PINK', 'DUSTY ROSE', 'EMERALD', 'EMERALD GREEN', 'FADED DENIM', 'FLAMINGO', 'FLINT', 'FLINT GREY', 'FOREST', 'FRESH GREENY', 'GALAXY SOUL', 'GLAMOUR', 'GOLD', 'GRAPES', 'GREEN TINT', 'GREY', 'GREY GROVE', 'GREY LILAC', 'GUAVA', 'HAZELNUT', 'HONEY', 'HUNTER GREEN', 'ICE BLUE', 'ICY LILAC', 'IVORY', 'JASMINE TEA', 'KHAKI', 'KRISAN OCEAN', 'KUSUMA', 'LATTE', 'LATTE BEIGE', 'LAUREL GREEN', 'LAVENDER', 'LAVENDER LILAC', 'LAVENDER MIST', 'LIGHT OLIVE', 'LILAC', 'LILAC GRAY', 'MAHOGANY', 'MAHOGANY BROWN', 'MAROON', 'MAUVE', 'MIDNIGHT', 'MIDNIGHT BLUE', 'MILKY ROSY', 'MILO', 'MINT', 'MINT SAGE', 'MOCCA', 'MOSS', 'NAVY', 'NAVY BLUE', 'NIRWANA', 'NUде', 'NUDE BEIGE', 'OLIVE', 'PALE MAUVE', 'PEACH', 'PEACHY', 'PEANUT', 'PEARLY WHITE', 'PINK', 'PLUM', 'POWDER GREEN', 'POWDER PEACH', 'PURPLE', 'RICH BLUE', 'RICH TAN', 'RICHY BLUE', 'ROSE', 'ROSE GOLD', 'RUBY', 'RUSSIAN MIST', 'SAFIR', 'SAGE', 'SAGE GREEN', 'SAKURA', 'SALMON', 'SEAFOAM', 'SEAGREEN', 'SHADOW GRAY', 'SHADOW GREY', 'SILVER', 'SKY', 'SKY BLUE', 'SMOKE GREY', 'SMOKEY GREY', 'SOFT PINK', 'SPLASH BROWN', 'STEEL', 'STEEL BLUE', 'STONE GREY', 'TEAL GREEN', 'TERACCOTA', 'TERRAWOOD', 'TOASTY DUST', 'TORTILLA X CHOCOLATE', 'TOSCA', 'VANILLA', 'VINTAGE HEATHER', 'VIOLET', 'WAFER', 'WALNUT', 'WARM BLACK', 'WARM GREY', 'WHITE', 'WINE BERRY'
];

// DATABASE MERK UNTUK REKOMENDASI
const BRAND_DATABASE = [
  'Aden', 'AHSAN', 'Ainun', 'Ajwa', 'ALFASA', 'Alfira', 'Aqlan', 'AR', 'ARSELLE', 'ARUMY', 'AS MOESLEM', 'Aysila', 'Dafeena', 'DENIZER', 'Elzatta', 'EMILY DAILY', 'ETHICA', 'FeeFashion', 'Gabia', 'Ghiina', 'HIJABI OFFICIAL', 'Hunny Label', 'IMIDY', 'Journey', 'Kaen', 'KAMSA', 'Kazami', 'Keke', 'Latanza', 'LUBI', 'MALIHA', 'MOSLEM DAILY', 'Nadheera Luxury', 'NARARYA', 'Nata Id', 'NIARA', 'NIBRAS', 'NIRMALA', 'Non Branded', 'Poeti', 'Rabbani', 'Raisakey', 'Ratu Bilqis', 'RAYYA', 'Rivantie', 'SALVINA', 'SAV KIDS', 'Seply', 'Ss Hijab', 'SYIFA OFFICIAL', 'Urfimutiyaro', 'Yukio', 'ZAMEERA', 'Zz Homey'
];

// DATABASE KATEGORI UNTUK REKOMENDASI
const CATEGORY_DATABASE = [
  'Accesories', 'Atasan', 'Blouse', 'Bros', 'Celana', 'Ciput', 'Dompet', 'DRESS', 'GAMIS', 'GAMIS ANAK', 'Jilbab Instan', 'Jilbab Segi_4', 'Jilbab Segi_5', 'Jilbab Segi_6', 'Jilbab Segi_7', 'KOKO', 'KOKO ANAK', 'MIDI DRESS', 'Mukena', 'Mukena Anak', 'Oneset', 'Pashmina', 'Sandal', 'Sarung', 'Tas', 'Tunik'
];

// DATABASE SIZE UNTUK REKOMENDASI
const SIZE_DATABASE = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '37', '39', '0+', '115X115', '2XL', '3XL', 'ALL', 'BIG', 'L', 'M', 'S', 'XL', 'XS', 'XXL', 'XXS', 'XXXL', 'XXXXL'
];

// FUNGSI GENERATE TOKEN TERFOKUS
const generateSearchTokens = (name: string, brand: string, category: string, series: string, variants: any[]) => {
  const tokens = new Set<string>();
  const add = (val: string) => {
    if (!val) return;
    val.toLowerCase().split(/[\s-/]+/).forEach(t => {
      if (t && t.length > 0) tokens.add(t);
    });
  };
  
  add(name);
  add(brand);
  add(category);
  add(series);
  
  variants.forEach(v => {
    add(v.color);
    add(v.size);
  });
  
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
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState<string>('ALL');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [invoiceDateFilter, setInvoiceDateFilter] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'daily' | 'monthly'>('all');
  const [isUploading, setIsUploading] = useState<string | boolean>(false);

  const [editingItem, setSelectedEditItem] = useState<any>(null);
  const [actionItem, setActionItem] = useState<any>(null);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [viewingHistoryItem, setViewingHistoryItem] = useState<any>(null);

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
    distribution: {
      TOKO_A: '',
      TOKO_B: '',
      TOKO_C: '',
    },
    showDistribution: false,
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
    if (historyDateFilter) {
        q = query(q, where("entryDate", "==", historyDateFilter));
    }
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
                if (storeFilter === 'ALL' || storeFilter === storeId) {
                    allItems.push(item);
                }
            });
        });
    };

    processStore(stockA, 'TOKO_A', 'NHS KWT');
    processStore(stockB, 'TOKO_B', 'IND CO');
    processStore(stockC, 'TOKO_C', 'NHS GDM');

    const grouped = allItems.reduce((acc, item) => {
        // Group by identity AND financial data to ensure separate rows for different purchase prices
        const key = `${item.productName}-${item.invoiceDate || 'noinvdate'}-${item.invoiceNo || 'noinv'}-${item.color}-${item.size}-${item.labelPrice}-${item.buyDiscount}`;
        
        if (!acc[key]) {
            acc[key] = {
                ...item,
                variants: [],
                qty_TOKO_A: 0,
                qty_TOKO_B: 0,
                qty_TOKO_C: 0,
                totalQty: 0,
            };
        }

        acc[key][`qty_${item.storeId}`] = (acc[key][`qty_${item.storeId}`] || 0) + item.stock;
        acc[key].totalQty += item.stock;
        acc[key].variants.push(item);
        return acc;
    }, {});

    let list = Object.values(grouped).filter((item: any) => item.totalQty > 0);

    if (brandFilter !== 'ALL') {
        list = list.filter((item: any) => item.brand === brandFilter);
    }
    if (categoryFilter !== 'ALL') {
        list = list.filter((item: any) => item.category === categoryFilter);
    }
    if (invoiceDateFilter) {
        if (filterMode === 'daily') {
          list = list.filter((item: any) => item.invoiceDate === invoiceDateFilter);
        } else if (filterMode === 'monthly') {
          list = list.filter((item: any) => item.invoiceDate?.startsWith(invoiceDateFilter.substring(0, 7)));
        }
    }

    const tokens = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    return list.filter((item: any) => {
      if (tokens.length === 0) return true;
      const searchableText = [
        item.productName, item.brand, item.category, item.series, item.color, item.size, item.invoiceNo || ''
      ].join(' ').toLowerCase();
      return tokens.every(token => searchableText.includes(token));
    }).sort((a: any, b: any) => {
        if (a.invoiceDate && b.invoiceDate) {
            if (a.invoiceDate < b.invoiceDate) return 1;
            if (a.invoiceDate > b.invoiceDate) return -1;
        }
        if (a.productName < b.productName) return -1;
        if (a.productName > b.productName) return 1;
        return 0;
    });
}, [stockA, stockB, stockC, searchTerm, storeFilter, brandFilter, categoryFilter, invoiceDateFilter, filterMode]);

const handleExportExcel = () => {
    if (detailedStockList.length === 0) return;
    const headers = ['Tgl Nota', 'No Nota', 'Merk', 'Kategori', 'Seri', 'Size', 'Warna', 'Harga Label', '% Beli', 'H. Beli', 'H. Jual', 'Qty Toko NHS KWT', 'Qty Toko IND CO', 'Qty NHS GDM', 'Jumlah Qty', 'Nama Barang'];
    const data = detailedStockList.map((item: any) => [item.invoiceDate || '-', item.invoiceNo || '-', item.brand, item.category, item.series, item.size, item.color, item.labelPrice, item.buyDiscount, item.buyPrice, item.price, item.qty_TOKO_A, item.qty_TOKO_B, item.qty_TOKO_C, item.totalQty, item.productName]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Global');
    XLSX.writeFile(wb, `ekspor-stok-nibras-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    toast({ title: 'Excel Berhasil Diunduh' });
};

  const handleExportPDF = () => {
    if (detailedStockList.length === 0) return;
    const docPdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    docPdf.text('Laporan Inventaris Detail Global - Nibras House', 148, 10, { align: 'center' });
    const tableData = detailedStockList.map((item: any) => [item.invoiceDate || '-', item.invoiceNo || '-', item.brand, item.category, item.size, item.color, item.qty_TOKO_A, item.qty_TOKO_B, item.qty_TOKO_C, item.totalQty, `Rp ${item.labelPrice?.toLocaleString('id-ID')}`, `Rp ${item.price?.toLocaleString('id-ID')}`]);
    (docPdf as any).autoTable({ head: [['Tgl Nota', 'No Nota', 'Merk', 'Kategori', 'Size', 'Warna', 'NHS KWT', 'IND CO', 'NHS GDM', 'Total', 'H. Label', 'H. Jual']], body: tableData, startY: 20, theme: 'grid', headStyles: { fillColor: [31, 122, 99], textColor: 255, fontSize: 7, fontStyle: 'bold' }, styles: { fontSize: 6 }});
    docPdf.save(`ekspor-stok-nibras-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({ title: 'PDF Berhasil Diunduh' });
  };

  const handleDeleteStockFiltered = () => {
    if (detailedStockList.length === 0) {
        toast({ title: 'Tidak ada data untuk dihapus', variant: 'destructive' });
        return;
    }
    if (confirm(`Hapus PERMANEN ${detailedStockList.length} kelompok barang yang tampil? Ini akan menghapus semua varian terkait di semua toko.`)) {
        detailedStockList.forEach((item: any) => {
            item.variants.forEach((variant: any) => {
                handleDeleteVariant(variant.storeId, variant.productId, variant.id, true);
            });
        });
        toast({ title: 'Penghapusan Massal Berhasil', description: `${detailedStockList.length} kelompok barang telah dihapus.` });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, id?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast({ title: 'File Terlalu Besar', description: 'Maksimal 300KB.', variant: 'destructive' });
      e.target.value = ''; return;
    }
    const uploadKey = id || (editingItem ? 'edit' : 'invoice');
    setIsUploading(uploadKey);
    try {
      const storageRef = ref(storage, `stock/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      if (editingItem) setSelectedEditItem({ ...editingItem, productImage: downloadURL });
      else setInvoiceHeader(prev => ({ ...prev, proofImage: downloadURL }));
      toast({ title: 'Berhasil', description: 'Gambar telah diunggah.' });
    } catch (error) {
      toast({ title: 'Upload Gagal', description: 'Terjadi kesalahan saat mengunggah gambar.', variant: 'destructive' });
    } finally { setIsUploading(false); }
  };

  const handleDownloadFormat = () => {
    const headers = ['Tanggal Entry', 'No Nota Beli', 'Tanggal Nota', 'Merk', 'Kategori', 'Seri', 'Size', 'Warna', 'Harga Label', '% Beli', 'Harga Beli', 'Harga Jual', 'QTY', 'Cabang Tujuan'];
    const dummyData = [[format(new Date(), 'yyyy-MM-dd'), 'NB-001', format(new Date(), 'yyyy-MM-dd'), 'NIBRAS', 'GAMIS', 'SERI A', 'L', 'NAVY', '250000', '10', '225000', '250000', '5', 'NHS KWT']];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dummyData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Format Impor Stok');
    XLSX.writeFile(wb, 'format-impor-stok-nibras.xlsx');
    toast({ title: 'Format Terunduh' });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isXlsx = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const reader = new FileReader();
    reader.onload = (event) => {
      let rows: string[][] = [];
      try {
        if (isXlsx) {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
          rows = json.map((row: any) => (Array.isArray(row) ? row : []).map((cell: any) => String(cell ?? '').trim()));
        } else {
          const content = event.target?.result as string;
          rows = content.split(/\r?\n/).filter(row => row.trim() !== '').map(row => row.split(/[,\t;]/).map(col => col.trim().replace(/^'|'$/g, '')));
        }
        if (rows.length < 2) return;
        let successCount = 0;
        const entryItems: any[] = [];
        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i];
          if (cols.length < 14) continue;
          const [tglEntry, noNota, tglNota, merk, kategori, seri, size, warna, label, discBeli, hBeli, hJual, qty, cabang] = cols;
          const targetStoreRaw = (cabang || '').toUpperCase().replace(/\s+/g, '');
          const targetStore = targetStoreRaw.includes('NHSKWT') || targetStoreRaw.includes('TOKOA') ? 'TOKO_A' : targetStoreRaw.includes('INDCO') || targetStoreRaw.includes('TOKOB') ? 'TOKO_B' : targetStoreRaw.includes('NHSGDM') || targetStoreRaw.includes('TOKOC') ? 'TOKO_C' : null;
          if (!targetStore) continue;
          const autoName = `${kategori || ''} ${merk || ''} ${seri || ''} ${size || ''} ${warna || ''}`.toUpperCase().trim();
          const variantData = {
            id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            color: warna || 'Default', size: size || 'L', stock: parseInt(qty || '0') || 0,
            labelPrice: parseFloat(label?.replace(/[^0-9.-]+/g, '') || '0') || 0,
            price: parseFloat(hJual?.replace(/[^0-9.-]+/g, '') || '0') || 0,
            buyPrice: parseFloat(hBeli?.replace(/[^0-9.-]+/g, '') || '0') || 0,
            buyDiscount: discBeli || '0', invoiceNo: noNota || '-', invoiceDate: tglNota || '-', entryDate: tglEntry || format(new Date(), 'yyyy-MM-dd')
          };
          entryItems.push({ ...variantData, productName: autoName, targetStore, brand: merk || '-', category: kategori || '-', series: seri || '-' });
          const storeProducts = targetStore === 'TOKO_A' ? stockA : targetStore === 'TOKO_B' ? stockB : targetStore === 'TOKO_C' ? stockC : [];
          let existingProduct = storeProducts.find(p => p.name.toUpperCase() === autoName);
          if (!existingProduct) {
            const productId = `P-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            setDocumentNonBlocking(doc(db, 'stores', targetStore, 'stock', productId), { id: productId, name: autoName, brand: merk || '-', category: kategori || '-', series: seri || '-', image: `https://picsum.photos/seed/${autoName.replace(/\s+/g, '-')}/400/500`, variants: [variantData], searchTokens: generateSearchTokens(autoName, merk || '-', kategori || '-', seri || '-', [variantData]) }, { merge: true });
          } else {
            const updatedVariants = [...(existingProduct.variants || [])];
            // Unique check including financial data and invoice number to prevent merging items with different purchase prices
            const vIdx = updatedVariants.findIndex(v => 
              v.color.toLowerCase() === (warna || 'Default').toLowerCase() && 
              v.size === (size || 'L') &&
              v.labelPrice === variantData.labelPrice &&
              v.buyDiscount === variantData.buyDiscount &&
              v.invoiceNo === variantData.invoiceNo
            );
            
            if (vIdx === -1) {
              updatedVariants.push(variantData); 
            } else { 
              updatedVariants[vIdx].stock += variantData.stock; 
            }
            
            updateDocumentNonBlocking(doc(db, 'stores', targetStore, 'stock', existingProduct.id), { variants: updatedVariants, searchTokens: generateSearchTokens(existingProduct.name, existingProduct.brand || '-', existingProduct.category || '-', existingProduct.series || '-', updatedVariants) });
          }
          successCount++;
        }
        if (successCount > 0) {
          addDocumentNonBlocking(collection(db, 'stockEntries'), { entryDate: format(new Date(), 'yyyy-MM-dd'), invoiceNo: `IMPORT-${format(new Date(), 'HHmmss')}`, invoiceDate: format(new Date(), 'yyyy-MM-dd'), items: entryItems, timestamp: new Date().toISOString(), totalItems: successCount, isImport: true, proofImage: '' });
          toast({ title: 'Import Berhasil', description: `${successCount} data diproses.` });
        }
      } catch (err) { toast({ title: 'Import Gagal', variant: 'destructive' }); }
    };
    if (isXlsx) reader.readAsArrayBuffer(file); else reader.readAsText(file);
    e.target.value = '';
  };

  const updateItemField = (id: string, field: string, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        let updatedItem = { ...item };
        
        if (['labelPrice', 'sellPrice', 'buyPriceRp'].includes(field)) {
          updatedItem[field as keyof StockItemInput] = parseCurrency(value);
        } else if (field.startsWith('dist-')) {
          const storeId = field.split('-')[1] as keyof StockItemInput['distribution'];
          const totalQty = parseInt(item.quantity) || 0;
          const originalValue = parseInt(value) || 0;
          let newValue = originalValue;

          if (totalQty <= 0 && originalValue > 0) {
            toast({ title: 'Isi QTY (Total) dahulu', variant: 'destructive' });
            newValue = 0;
          } else {
            const otherStoresTotal = Object.entries(item.distribution)
              .filter(([key]) => key !== storeId)
              .reduce((acc, [, val]) => acc + (parseInt(val as string) || 0), 0);
            
            if (newValue + otherStoresTotal > totalQty) {
              newValue = totalQty - otherStoresTotal;
              if (originalValue > newValue) { 
                  toast({
                    title: 'Distribusi Disesuaikan',
                    description: `Total cabang tidak dapat melebihi QTY (Total).`,
                  });
              }
            }
          }
          updatedItem.distribution = { ...item.distribution, [storeId]: Math.max(0, newValue).toString() };
        } else {
          updatedItem = { ...item, [field]: value };
        }

        if (field === 'quantity') {
            const newTotalQty = parseInt(value) || 0;
            const currentDistTotal = Object.values(item.distribution).reduce((sum, v) => sum + (parseInt(v as string) || 0), 0);
            if (newTotalQty < currentDistTotal) {
                updatedItem.distribution = { TOKO_A: '', TOKO_B: '', TOKO_C: '' };
                toast({
                    title: 'Perhatian',
                    description: 'QTY (Total) baru lebih kecil dari total distribusi, isian cabang direset.',
                });
            }
        }

        const labelPriceNum = parseFloat(updatedItem.labelPrice) || 0;
        
        if (field === 'buyDiscount' && labelPriceNum > 0) {
          const disc = parseFloat(value) || 0;
          updatedItem.buyPriceRp = Math.round(labelPriceNum - (labelPriceNum * disc / 100)).toString();
        } else if (field === 'labelPrice' && (parseFloat(updatedItem.buyDiscount) || 0) > 0) {
          const disc = parseFloat(updatedItem.buyDiscount) || 0;
          updatedItem.buyPriceRp = Math.round(labelPriceNum - (labelPriceNum * disc / 100)).toString();
        } else if (field === 'buyPriceRp' && labelPriceNum > 0) {
          const buyPriceNum = parseFloat(updatedItem.buyPriceRp) || 0;
          const calculatedDisc = ((labelPriceNum - buyPriceNum) / labelPriceNum) * 100;
          updatedItem.buyDiscount = calculatedDisc.toFixed(2).replace(/\.00$/, '');
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleInputStock = () => {
    if (!invoiceHeader.invoiceNo) return toast({ title: 'No Nota Beli wajib diisi.', variant: 'destructive' });
    let successCount = 0;
    const entryItems: any[] = [];
    items.forEach(item => {
      const { brand, category, series, size, color, labelPrice, sellPrice, buyPriceRp, buyDiscount, distribution } = item;
      if (!brand || !series || !color || !labelPrice) return;
      
      const finalLabelPrice = parseFloat(labelPrice) || 0;
      // Force sellPrice to labelPrice if not entered
      const finalSellPrice = sellPrice ? parseFloat(sellPrice) : finalLabelPrice;
      const finalBuyPrice = parseFloat(buyPriceRp || '0') || 0;

      const autoName = `${category} ${brand} ${series} ${size} ${color}`.toUpperCase().trim();
      Object.entries(distribution).forEach(([targetStore, qtyStr]) => {
        const qty = parseInt(qtyStr) || 0;
        if (qty <= 0) return;
        const variantData = {
          id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          color: color || 'Default', size: size || 'L', stock: qty, labelPrice: finalLabelPrice, price: finalSellPrice, buyPrice: finalBuyPrice, buyDiscount: buyDiscount || '0', invoiceNo: invoiceHeader.invoiceNo || '-', invoiceDate: invoiceHeader.invoiceDate || '-', entryDate: invoiceHeader.entryDate || '-'
        };
        entryItems.push({ ...variantData, productName: autoName, targetStore, brand: brand || '-', category: category || '-', series: series || '-' });
        const storeProducts = targetStore === 'TOKO_A' ? stockA : targetStore === 'TOKO_B' ? stockB : targetStore === 'TOKO_C' ? stockC : [];
        let existingProduct = storeProducts.find(p => p.name.toUpperCase() === autoName);
        if (!existingProduct) {
          const productId = `P-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setDocumentNonBlocking(doc(db, 'stores', targetStore, 'stock', productId), { id: productId, name: autoName, brand: brand || '-', category: category || '-', series: series || '-', image: `https://picsum.photos/seed/${autoName.replace(/\s+/g, '-')}/400/500`, variants: [variantData], searchTokens: generateSearchTokens(autoName, brand || '-', category || '-', series || '-', [variantData]) }, { merge: true });
        } else {
          const updatedVariants = [...(existingProduct.variants || [])];
          // Differentiate items with same name/variant but different prices or invoice
          const vIdx = updatedVariants.findIndex(v => 
            v.color.toLowerCase() === color.toLowerCase() && 
            v.size === size &&
            v.labelPrice === finalLabelPrice &&
            v.buyDiscount === (buyDiscount || '0') &&
            v.invoiceNo === (invoiceHeader.invoiceNo || '-')
          );

          if (vIdx === -1) {
            updatedVariants.push(variantData); 
          } else { 
            updatedVariants[vIdx].stock += qty;
          }

          updateDocumentNonBlocking(doc(db, 'stores', targetStore, 'stock', existingProduct.id), { variants: updatedVariants, searchTokens: generateSearchTokens(existingProduct.name, existingProduct.brand || '-', existingProduct.category || '-', existingProduct.series || '-', updatedVariants) });
        }
        successCount++;
      });
    });
    if (successCount > 0) {
      addDocumentNonBlocking(collection(db, 'stockEntries'), { entryDate: invoiceHeader.entryDate, invoiceNo: invoiceHeader.invoiceNo, invoiceDate: invoiceHeader.invoiceDate, proofImage: invoiceHeader.proofImage || '', items: entryItems, timestamp: new Date().toISOString(), totalItems: successCount });
      setIsInputOpen(false); resetInputForm(); toast({ title: 'Stok disimpan.' });
    }
  };

  const handleDeleteVariant = (storeId: string, productId: string, variantId: string, silent = false) => {
    const confirmed = silent ? true : confirm('Hapus rincian stok barang ini?');
    if (!confirmed) return;

    const sourceProducts = storeId === 'TOKO_A' ? stockA : storeId === 'TOKO_B' ? stockB : stockC;
    const product = sourceProducts.find(p => p.id === productId);
    
    if (product) {
        const updatedVariants = (product.variants || []).filter((v: any) => v.id !== variantId);
        if (updatedVariants.length === 0) {
            deleteDocumentNonBlocking(doc(db, 'stores', storeId, 'stock', productId));
        } else {
            updateDocumentNonBlocking(doc(db, 'stores', storeId, 'stock', productId), {
                variants: updatedVariants,
                searchTokens: generateSearchTokens(product.name, product.brand || '-', product.category || '-', product.series || '-', updatedVariants)
            });
        }
        if (!silent) {
            toast({ title: 'Berhasil Dihapus.' });
            setActionItem(null);
        }
    }
  };

  const handleDeleteStockEntry = async (entry: any) => {
    if (!confirm(`Hapus permanen riwayat input nota ${entry.invoiceNo}? Stok akan dikembalikan seperti semula.`)) return;

    try {
        const productUpdates = new Map<string, any[]>();
        
        for (const item of entry.items) {
            const { targetStore, productName, color, size, stock: inputQty, invoiceNo, labelPrice, buyDiscount } = item;
            
            const storeStock = targetStore === 'TOKO_A' ? stockA : targetStore === 'TOKO_B' ? stockB : stockC;
            const productDoc = storeStock.find(p => p.name.toUpperCase() === productName.toUpperCase());

            if (!productDoc) {
                console.warn(`Product not found for item:`, item);
                continue; 
            }
            
            const docPath = `stores/${targetStore}/stock/${productDoc.id}`;
            let currentVariants = productUpdates.get(docPath) || JSON.parse(JSON.stringify(productDoc.variants));

            // Use comprehensive check to match the specific price batch
            const variantIndex = currentVariants.findIndex((v: any) => 
              v.color === color && 
              v.size === size && 
              v.invoiceNo === invoiceNo &&
              v.labelPrice === labelPrice &&
              v.buyDiscount === buyDiscount
            );

            if (variantIndex > -1) {
                currentVariants[variantIndex].stock -= inputQty;
                const updatedVariants = currentVariants.filter((v: any) => v.stock > 0);
                productUpdates.set(docPath, updatedVariants);
            }
        }
        
        for (const [path, variants] of productUpdates.entries()) {
            const productRef = doc(db, path);
            if (variants.length === 0) {
                await deleteDocumentNonBlocking(productRef);
            } else {
                const parts = path.split('/');
                const storeId = parts[1];
                const productId = parts[3];
                const sourceData = storeId === 'TOKO_A' ? stockA : storeId === 'TOKO_B' ? stockB : stockC;
                const product = sourceData.find(p => p.id === productId);
                if (product) {
                    await updateDocumentNonBlocking(productRef, { 
                        variants: variants,
                        searchTokens: generateSearchTokens(product.name, product.brand || '-', product.category || '-', product.series || '-', variants)
                    });
                }
            }
        }

        await deleteDocumentNonBlocking(doc(db, "stockEntries", entry.id));

        toast({ title: "Riwayat Input Dihapus", description: "Stok telah berhasil dikembalikan." });

    } catch (error) {
        console.error("Error deleting stock entry: ", error);
        toast({ title: "Gagal Menghapus", description: "Terjadi kesalahan saat mengembalikan stok.", variant: "destructive" });
    }
  };

  const updateEditField = (field: string, value: string) => {
    setSelectedEditItem((prev: any) => {
      if (!prev) return null;
      let updated = { ...prev };
      
      if (['labelPrice', 'price', 'buyPrice'].includes(field)) {
        updated[field] = parseCurrency(value);
      } else {
        updated[field] = value;
      }

      const label = parseFloat(updated.labelPrice) || 0;
      if (field === 'buyDiscount' && label > 0) {
        const d = parseFloat(value) || 0;
        updated.buyPrice = Math.round(label - (label * d / 100)).toString();
      } else if (field === 'labelPrice' && (parseFloat(updated.buyDiscount) || 0) > 0) {
        const d = parseFloat(updated.buyDiscount) || 0;
        updated.buyPrice = Math.round(label - (label * d / 100)).toString();
      } else if (field === 'buyPrice' && label > 0) {
        const b = parseFloat(updated.buyPrice) || 0;
        updated.buyDiscount = (((label - b) / label) * 100).toFixed(2).replace(/\.00$/, '');
      }
      return updated;
    });
  };

  const handleUpdateEdit = () => {
    if (!editingItem) return;
    const { storeId, productId, id: variantId, price, stock, labelPrice, buyPrice, buyDiscount, invoiceNo, invoiceDate, color, size, brand, category, series, productImage } = editingItem;
    const sourceProducts = storeId === 'TOKO_A' ? stockA : storeId === 'TOKO_B' ? stockB : storeId === 'TOKO_C' ? stockC : [];
    const product = sourceProducts.find(p => p.id === productId);
    if (product) {
      const finalPrice = price ? parseFloat(price) : parseFloat(labelPrice);
      const updatedVariants = (product.variants || []).map((v: any) => v.id === variantId ? { ...v, price: finalPrice, stock: parseInt(stock) || 0, labelPrice: parseFloat(labelPrice) || 0, buyPrice: parseFloat(buyPrice) || 0, buyDiscount: buyDiscount || '0', invoiceNo: invoiceNo || '-', invoiceDate: invoiceDate || '-', color: color || 'Default', size: size || 'L' } : v);
      const autoName = `${category || product.category} ${brand || product.brand} ${series || product.series} ${size || 'L'} ${color || 'Default'}`.toUpperCase().trim();
      const payload: any = { variants: updatedVariants, brand: brand || product.brand || '-', category: category || product.category || '-', series: series || product.series || '-', name: autoName, searchTokens: generateSearchTokens(autoName, brand || product.brand || '-', category || product.category || '-', series || product.series || '-', updatedVariants) };
      if (productImage) payload.image = productImage;
      updateDocumentNonBlocking(doc(db, 'stores', storeId, 'stock', productId), payload);
      setSelectedEditItem(null); toast({ title: 'Data diperbarui.' });
    }
  };

  return (
    <div className='space-y-6 max-w-full overflow-hidden'>
      <datalist id='color-recommendations'>{COLOR_DATABASE.map(color => <option key={color} value={color} />)}</datalist>
      <datalist id='brand-recommendations'>{BRAND_DATABASE.map(brand => <option key={brand} value={brand} />)}</datalist>
      <datalist id='category-recommendations'>{CATEGORY_DATABASE.map(cat => <option key={cat} value={cat} />)}</datalist>
      <datalist id='size-recommendations'>{SIZE_DATABASE.map(size => <option key={size} value={size} />)}</datalist>

      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div><h1 className='text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary'>Ringkasan Stok Global</h1><p className='text-muted-foreground text-sm'>Monitoring rincian inventaris seluruh cabang.</p></div>
        <div className='flex flex-col gap-2 w-full sm:w-auto'>
          <div className='grid grid-cols-3 gap-2 w-full sm:flex sm:items-center'>
            <Button variant='destructive' className='h-9 md:h-10 font-bold px-2 md:px-4 text-[10px] md:text-sm' disabled={detailedStockList.length === 0} onClick={handleDeleteStockFiltered}><Trash2 className='h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2' /> <span className="hidden md:inline">Hapus Stok</span><span className="md:hidden">Hapus</span></Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant='outline' className='h-9 md:h-10 font-bold px-2 md:px-4 text-[10px] md:text-sm'><Upload className='h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2' /> <span className="hidden md:inline">Impor Excel</span><span className="md:hidden">Impor</span></Button></DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-56 rounded-xl'>
                <DropdownMenuItem className='cursor-pointer font-bold gap-2 py-3' onClick={() => document.getElementById('excel-import-input')?.click()}><FileSpreadsheet className='h-4 w-4 text-emerald-600' /> Unggah File Excel<input id='excel-import-input' type='file' accept='.xlsx,.xls,.csv' className='hidden' onChange={handleImportExcel} /></DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer font-bold gap-2 py-3' onClick={handleDownloadFormat}><FileDown className='h-4 w-4 text-primary' /> Format Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant='outline' className='h-9 md:h-10 font-bold px-2 md:px-4 text-[10px] md:text-sm'><Download className='h-3.5 w-3.5 md:h-4 md:w-4 md:mr-2' /> <span className="hidden md:inline">Ekspor Stok</span><span className="md:hidden">Ekspor</span></Button></DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-48 rounded-xl'>
                <DropdownMenuItem className='cursor-pointer font-bold gap-2 py-3' onClick={handleExportExcel}><FileSpreadsheet className='h-4 w-4 text-emerald-600' /> Excel</DropdownMenuItem>
                <DropdownMenuItem className='cursor-pointer font-bold gap-2 py-3' onClick={handleExportPDF}><FileText className='h-4 w-4 text-rose-600' /> PDF (A4)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className='grid grid-cols-2 gap-2 w-full sm:flex sm:items-center'>
            <Button variant="outline" className="h-9 md:h-12 px-4 md:px-6 font-bold text-[10px] md:text-sm" onClick={() => setIsHistoryOpen(true)}><History className="h-4 w-4 md:h-5 md:w-5 md:mr-2" /> Riwayat <span className="hidden md:inline">Input</span></Button>
            <Dialog open={isInputOpen} onOpenChange={(open) => { setIsInputOpen(open); if (open) resetInputForm(); }}>
              <DialogTrigger asChild>
                <Button className='h-9 md:h-12 px-4 md:px-6 font-black bg-primary shadow-xl shadow-primary/20 text-white text-[10px] md:text-sm'><PackagePlus className='h-4 w-4 md:h-5 md:w-5 md:mr-2' /> Input Stok <span className="hidden md:inline">Baru</span></Button>
              </DialogTrigger>
              <DialogContent className='sm:max-w-5xl w-[95vw] h-[90vh] rounded-3xl flex flex-col p-0 overflow-hidden border-none shadow-2xl'>
                <DialogHeader className='p-6 pb-2 shrink-0'><DialogTitle className='text-2xl font-black'>Input Stok & Nota Beli</DialogTitle><DialogDescription>Satu nota bisa didistribusikan ke beberapa toko sekaligus.</DialogDescription></DialogHeader>
                <div className='flex-1 overflow-y-auto px-6 scrollbar-hide bg-slate-50'>
                  <div className='space-y-6 py-4'>
                    <Card className='border-none shadow-none bg-muted/30 rounded-2xl'><CardContent className='p-4 grid grid-cols-1 sm:grid-cols-4 gap-4'><div className='space-y-1.5'><Label className='text-[10px] font-black uppercase text-muted-foreground'>Tanggal Entry</Label><Input type='date' value={invoiceHeader.entryDate} disabled className='h-10 bg-white/50 border-none' /></div><div className='space-y-1.5'><Label className='text-[10px] font-black uppercase'>No Nota Beli</Label><Input placeholder='NB-001' value={invoiceHeader.invoiceNo} onChange={e => setInvoiceHeader({...invoiceHeader, invoiceNo: e.target.value})} className='h-10 bg-white font-bold' /></div><div className='space-y-1.5'><Label className='text-[10px] font-black uppercase'>Tanggal Nota</Label><Input type='date' value={invoiceHeader.invoiceDate} onChange={e => setInvoiceHeader({...invoiceHeader, invoiceDate: e.target.value})} className='h-10 bg-white' /></div><div className='space-y-1.5'><Label className='text-[10px] font-black uppercase'>Bukti Nota</Label><div className='relative group'><Input type='file' accept='image/*' onChange={(e) => handleImageUpload(e)} className='h-10 bg-white cursor-pointer file:hidden pr-10' />{isUploading === 'invoice' ? <Loader2 className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary' /> : <ImageIcon className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />}{invoiceHeader.proofImage && <div className='absolute right-10 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md overflow-hidden border'><img src={invoiceHeader.proofImage} className='w-full h-full object-cover' /></div>}</div></div></CardContent></Card>
                    <div className='flex items-center justify-between'><h3 className='text-sm font-black uppercase flex items-center gap-2'><Package className='h-4 w-4 text-primary' /> Daftar Barang ({items.length})</h3></div>
                    <div className='space-y-4 pb-8'>{items.map((item, index) => (
                        <Card key={item.id} className='group relative border-2 border-primary/10 hover:border-primary/30 transition-all rounded-2xl overflow-hidden bg-primary/5 shadow-sm'>{items.length > 1 && <Button variant='destructive' size='icon' className='absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg z-10' onClick={() => setItems(items.filter(i => i.id !== item.id))}><Trash2 className='h-4 w-4' /></Button>}<CardContent className='p-4 sm:p-5 space-y-4'><div className='grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4'><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Merk</Label><Input placeholder='Merk...' value={item.brand} list='brand-recommendations' autoComplete='off' onChange={e => updateItemField(item.id, 'brand', e.target.value)} className='h-9 bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Kategori</Label><Input placeholder='Kategori...' value={item.category} list='category-recommendations' autoComplete='off' onChange={e => updateItemField(item.id, 'category', e.target.value)} className='h-9 bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Seri</Label><Input placeholder='Seri...' value={item.series} autoComplete='off' onChange={e => updateItemField(item.id, 'series', e.target.value)} className='h-9 bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Size</Label><Input placeholder='Size...' value={item.size} list='size-recommendations' autoComplete='off' onChange={e => updateItemField(item.id, 'size', e.target.value)} className='h-9 bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Warna</Label><Input placeholder='Warna...' value={item.color} list='color-recommendations' autoComplete='off' onChange={e => updateItemField(item.id, 'color', e.target.value)} className='h-9 bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Harga Label</Label><Input type='text' value={formatCurrency(item.labelPrice)} autoComplete='off' onChange={e => updateItemField(item.id, 'labelPrice', e.target.value)} className='h-9 font-bold bg-white' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-emerald-600'>% Beli</Label><Input type='number' step='0.01' value={item.buyDiscount} autoComplete='off' onChange={e => updateItemField(item.id, 'buyDiscount', e.target.value)} className='h-9 bg-white font-bold border-emerald-200' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-primary'>Harga Beli</Label><Input type='text' value={formatCurrency(item.buyPriceRp)} autoComplete='off' onChange={e => updateItemField(item.id, 'buyPriceRp', e.target.value)} className='h-9 font-bold bg-white border-primary/20 text-primary' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-accent'>Harga Jual (Opsional)</Label><Input type='text' value={formatCurrency(item.sellPrice)} autoComplete='off' onChange={e => updateItemField(item.id, 'sellPrice', e.target.value)} className='h-9 font-bold bg-white border-accent/30' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-blue-600'>QTY (Total)</Label><Input type='number' value={item.quantity} autoComplete='off' onChange={e => updateItemField(item.id, 'quantity', e.target.value)} className='h-9 bg-white border-blue-200' /></div><div className='col-span-2 flex items-end'><Button variant={item.showDistribution ? 'secondary' : 'outline'} onClick={() => updateItemField(item.id, 'showDistribution', !item.showDistribution)} className={cn('w-full h-9 font-black gap-2', item.showDistribution ? 'bg-primary text-white' : 'border-primary text-primary hover:bg-primary/5')}><GitMerge className='h-4 w-4' /> {item.showDistribution ? 'TUTUP' : 'BAGI CABANG'}</Button></div></div>{item.showDistribution && (<div className='pt-4 border-t border-primary/10 grid grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-200'><div className='space-y-1.5'><Label className='text-[9px] font-black uppercase text-primary'>NHS KWT</Label><Input type='number' value={item.distribution.TOKO_A} onChange={e => updateItemField(item.id, 'dist-TOKO_A', e.target.value)} className='h-10 bg-white border-primary/20 font-black text-center' /></div><div className='space-y-1.5'><Label className='text-[9px] font-black uppercase text-blue-600'>IND CO</Label><Input type='number' value={item.distribution.TOKO_B} onChange={e => updateItemField(item.id, 'dist-TOKO_B', e.target.value)} className='h-10 bg-white border-blue-200 font-black text-center' /></div><div className='space-y-1.5'><Label className='text-[9px] font-black uppercase text-emerald-600'>NHS GDM</Label><Input type='number' value={item.distribution.TOKO_C} onChange={e => updateItemField(item.id, 'dist-TOKO_C', e.target.value)} className='h-10 bg-white border-emerald-200 font-black text-center' /></div></div>)}</CardContent></Card>))}
                      <Button variant='outline' onClick={() => setItems([...items, createNewItem()])} className='w-full h-14 border-2 border-dashed border-primary/20 text-primary hover:bg-primary/10 font-black rounded-2xl flex items-center justify-center gap-2'><Plus className='h-5 w-5' /> TAMBAH BARIS BARU</Button>
                    </div>
                  </div>
                </div>
                <DialogFooter className='p-6 bg-white border-t shrink-0'><Button className='w-full font-black h-14 rounded-2xl shadow-2xl text-lg flex items-center justify-center gap-2 text-white' disabled={!!isUploading} onClick={handleInputStock}><Calculator className='h-5 w-5' /> SIMPAN KE DATABASE</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-4'>
        <Card className='soft-shadow border-none bg-primary/5'><CardHeader className='p-2 md:p-4'><CardTitle className='text-[8px] md:text-xs uppercase font-black text-primary opacity-70'>NHS KWT</CardTitle></CardHeader><CardContent className='p-2 md:p-4 pt-0'><p className='text-base md:text-3xl font-black text-primary'>{totalA} <span className='text-[8px] md:text-xs font-bold opacity-50'>Unit</span></p></CardContent></Card>
        <Card className='soft-shadow border-none bg-blue-50'><CardHeader className='p-2 md:p-4'><CardTitle className='text-[8px] md:text-xs uppercase font-black text-blue-600 opacity-70'>IND CO</CardTitle></CardHeader><CardContent className='p-2 md:p-4 pt-0'><p className='text-base md:text-3xl font-black text-blue-600'>{totalB} <span className='text-[8px] md:text-xs font-bold opacity-50'>Unit</span></p></CardContent></Card>
        <Card className='soft-shadow border-none bg-emerald-50'><CardHeader className='p-2 md:p-4'><CardTitle className='text-[8px] md:text-xs uppercase font-black text-emerald-600 opacity-70'>NHS GDM</CardTitle></CardHeader><CardContent className='p-2 md:p-4 pt-0'><p className='text-base md:text-3xl font-black text-emerald-600'>{totalC} <span className='text-[8px] md:text-xs font-bold opacity-50'>Unit</span></p></CardContent></Card>
      </div>

      <Card className='soft-shadow border-none overflow-hidden rounded-3xl flex flex-col'>
        <CardHeader className='p-4 md:p-6 space-y-4 border-b bg-muted/10'>
            <div className='flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4'><div className='space-y-1'><CardTitle className='text-lg md:text-xl font-black'>Inventaris Detail Global</CardTitle><CardDescription className='text-xs'>Filter data rincian barang seluruh cabang.</CardDescription></div><div className='flex items-center border rounded-xl p-1 bg-white shadow-sm'><Button variant={view === 'table' ? 'secondary' : 'ghost'} size='icon' className='h-8 w-8 rounded-lg' onClick={() => setView('table')}><List className='h-4 w-4' /></Button><Button variant={view === 'grid' ? 'secondary' : 'ghost'} size='icon' className='h-8 w-8 rounded-lg' onClick={() => setView('grid')}><LayoutGrid className='h-4 w-4' /></Button></div></div>
            <div className="flex flex-col space-y-3">
                <div className='relative flex-1'><Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' /><Input placeholder='Cari Merk, Kategori, Warna, Nama...' className='pl-10 h-10 bg-white border-none shadow-sm text-xs rounded-xl' value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                
                <div className="grid grid-cols-1 md:flex md:flex-row items-stretch md:items-center gap-3">
                    <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
                      <Select value={brandFilter} onValueChange={setBrandFilter}><SelectTrigger className='h-10 w-full md:w-[160px] bg-white border-none shadow-sm text-[10px] md:text-xs font-bold rounded-xl'><SelectValue placeholder='Merk' /></SelectTrigger><SelectContent className='rounded-xl'><SelectItem value='ALL'>Semua Merk</SelectItem>{BRAND_DATABASE.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className='h-10 w-full md:w-[160px] bg-white border-none shadow-sm text-[10px] md:text-xs font-bold rounded-xl'><SelectValue placeholder='Kategori' /></SelectTrigger><SelectContent className='rounded-xl'><SelectItem value='ALL'>Semua Kategori</SelectItem>{CATEGORY_DATABASE.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
                    </div>

                    <div className="grid grid-cols-1 md:flex items-center gap-2">
                      <div className="flex bg-slate-100 p-1 rounded-xl md:w-auto">
                        <button onClick={() => setFilterMode("all")} className={cn("flex-1 px-3 py-1.5 text-[9px] font-black rounded-lg transition-all", filterMode === "all" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>SEMUA</button>
                        <button onClick={() => setFilterMode("daily")} className={cn("flex-1 px-3 py-1.5 text-[9px] font-black rounded-lg transition-all", filterMode === "daily" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>HARI</button>
                        <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 px-3 py-1.5 text-[9px] font-black rounded-lg transition-all", filterMode === "monthly" ? "bg-white text-primary shadow-sm" : "text-slate-500")}>BULAN</button>
                      </div>
                      {filterMode !== 'all' && (
                        filterMode === 'daily' ? (
                          <Input type="date" value={invoiceDateFilter} onChange={e => setInvoiceDateFilter(e.target.value)} className='h-10 w-full md:w-36 bg-white border-none shadow-sm text-xs rounded-xl font-bold' />
                        ) : (
                          <Input type="month" value={invoiceDateFilter.substring(0, 7)} onChange={e => setInvoiceDateFilter(e.target.value)} className='h-10 w-full md:w-36 bg-white border-none shadow-sm text-xs rounded-xl font-bold' />
                        )
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:flex md:gap-3">
                      <Select value={storeFilter} onValueChange={setStoreFilter}><SelectTrigger className='h-10 w-full md:w-[160px] bg-white border-none shadow-sm text-[10px] md:text-xs font-bold rounded-xl'><SelectValue placeholder='Toko' /></SelectTrigger><SelectContent className='rounded-xl'><SelectItem value='ALL'>Semua Toko</SelectItem><SelectItem value='TOKO_A'>NHS KWT</SelectItem><SelectItem value='TOKO_B'>IND CO</SelectItem><SelectItem value='TOKO_C'>NHS GDM</SelectItem></SelectContent></Select>
                      <Button variant="ghost" size="sm" onClick={() => { setBrandFilter('ALL'); setCategoryFilter('ALL'); setInvoiceDateFilter(''); setFilterMode('all'); setStoreFilter('ALL'); }} className="h-10 text-[10px] md:text-xs font-black"><X className="h-3.5 w-3.5 mr-1" /> RESET</Button>
                    </div>
                </div>
            </div>
        </CardHeader>
        <CardContent className='p-0 flex-1'>{view === 'table' ? (<div className='overflow-x-auto'><div className='min-w-[1800px] pb-4'><Table><TableHeader className='bg-muted/50'><TableRow className='text-[10px] uppercase font-black border-none'><TableHead className='pl-6'>Aksi</TableHead><TableHead>Tgl Nota</TableHead><TableHead>No Nota</TableHead><TableHead>Merk</TableHead><TableHead>Kategori</TableHead><TableHead>Seri</TableHead><TableHead>Size</TableHead><TableHead>Warna</TableHead><TableHead className='text-right'>Label</TableHead><TableHead className='text-center'>% Beli</TableHead><TableHead className='text-right'>H. Beli</TableHead><TableHead className='text-right'>H. Jual</TableHead><TableHead className='text-center'>Qty NHS KWT</TableHead><TableHead className='text-center'>Qty IND CO</TableHead><TableHead className='text-center'>Qty NHS GDM</TableHead><TableHead className='text-center'>Jumlah Qty</TableHead><TableHead className='pr-6'>Nama Barang</TableHead></TableRow></TableHeader><TableBody>{detailedStockList.map((item: any, idx) => (<TableRow key={idx} className='hover:bg-muted/20 text-[11px] border-b border-muted/50 transition-colors'><TableCell className='pl-6'><Button variant='outline' size='icon' className='h-7 w-7' onClick={() => setActionItem(item)}><List className='h-3.5 w-3.5' /></Button></TableCell><TableCell className='text-muted-foreground'>{item.invoiceDate || '-'}</TableCell><TableCell className='font-mono font-bold text-primary'>{item.invoiceNo || '-'}</TableCell><TableCell className='font-bold'>{item.brand}</TableCell><TableCell>{item.category}</TableCell><TableCell>{item.series}</TableCell><TableCell className='font-black'>{item.size}</TableCell><TableCell>{item.color}</TableCell><TableCell className='text-right'>{formatCurrency(item.labelPrice)}</TableCell><TableCell className='text-center text-emerald-600'>{item.buyDiscount || '0'}%</TableCell><TableCell className='text-right text-primary font-bold'>{formatCurrency(item.buyPrice)}</TableCell><TableCell className='text-right font-black text-accent'>{formatCurrency(item.price)}</TableCell><TableCell className='text-center font-black text-primary'>{item.qty_TOKO_A || 0}</TableCell><TableCell className='text-center font-black text-blue-600'>{item.qty_TOKO_B || 0}</TableCell><TableCell className='text-center font-black text-emerald-600'>{item.qty_TOKO_C || 0}</TableCell><TableCell className='text-center font-black text-lg'>{item.totalQty}</TableCell><TableCell className='font-bold pr-6 truncate max-w-[200px]'>{item.productName}</TableCell></TableRow>))}</TableBody></Table></div></div>) : (<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6 bg-slate-50/50'>{detailedStockList.map((item: any, idx) => (<Card key={idx} className='border-none bg-white soft-shadow rounded-2xl group hover:scale-[1.02] transition-transform'><CardContent className='p-4 space-y-3'><div className='flex justify-between items-start'><div style={{ backgroundImage: `url(${item.productImage || 'https://placehold.co/400x500/E2E8F0/A0AEC0?text=No+Image'})`}} className='h-16 w-12 rounded-lg bg-cover bg-center bg-muted overflow-hidden shadow-sm'></div><Button variant='outline' size='icon' className='h-7 w-7' onClick={() => setActionItem(item)}><List className='h-3.5 w-3.5' /></Button></div><div><h4 className='font-black text-xs uppercase leading-tight line-clamp-2'>{item.productName}</h4><p className='text-[9px] text-muted-foreground mt-1'>{item.brand} | {item.category}</p></div><div className='grid grid-cols-2 gap-2 pt-2 border-t border-dashed'><div><p className='text-[8px] uppercase font-black text-muted-foreground'>Harga Jual</p><p className='text-xs font-black text-accent'>{formatCurrency(item.price)}</p></div><div className='text-right'><p className='text-[8px] uppercase font-black text-muted-foreground'>Total Stok</p><p className='text-xs font-black text-primary'>{item.totalQty} PCS</p></div></div><div className='flex justify-between items-center text-[9px] pt-2 border-t'><Badge variant='outline' className='bg-primary/10 text-primary border-none'>KWT: {item.qty_TOKO_A || 0}</Badge><Badge variant='outline' className='bg-blue-100 text-blue-700 border-none'>IND: {item.qty_TOKO_B || 0}</Badge><Badge variant='outline' className='bg-emerald-100 text-emerald-700 border-none'>GDM: {item.qty_TOKO_C || 0}</Badge></div></CardContent></Card>))}</div>)}</CardContent>
      </Card>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-4xl w-[95vw] h-[90vh] rounded-3xl flex flex-col">
            <DialogHeader>
                <DialogTitle>Riwayat Input Stok</DialogTitle>
                <DialogDescription>Daftar semua input stok yang telah dilakukan. Anda bisa menghapus riwayat, yang akan mengembalikan jumlah stok.</DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
                <Label htmlFor="history-date" className="-mb-1">Filter Tanggal:</Label>
                <Input
                    id="history-date"
                    type="date"
                    value={historyDateFilter}
                    onChange={e => setHistoryDateFilter(e.target.value)}
                    className="w-[180px] h-9"
                />
                {historyDateFilter && <Button variant='ghost' size='icon' className='h-8 w-8' onClick={() => setHistoryDateFilter('')}><X className='h-4 w-4' /></Button>}
            </div>
            <ScrollArea className="flex-1 -mx-6 px-6">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[150px]">Tgl Input</TableHead>
                            <TableHead>No Nota</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(stockEntries || []).map(entry => (
                            <TableRow key={entry.id}>
                                <TableCell className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), 'dd MMM yyyy, HH:mm')}</TableCell>
                                <TableCell className="font-bold">{entry.invoiceNo}</TableCell>
                                <TableCell className="text-xs">{entry.totalItems} items</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => setViewingHistoryItem(entry)}><Eye className="h-4 w-4 text-blue-600" /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteStockEntry(entry)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingHistoryItem} onOpenChange={() => setViewingHistoryItem(null)}>
        <DialogContent className="sm:max-w-2xl w-[95vw] rounded-3xl">
            <DialogHeader>
                <DialogTitle>Rincian Input: {viewingHistoryItem?.invoiceNo}</DialogTitle>
                <DialogDescription>
                    Tanggal: {viewingHistoryItem ? format(new Date(viewingHistoryItem.timestamp), 'dd MMMM yyyy, HH:mm') : ''}
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] -mx-6 px-6">
                <div className="space-y-2 py-4">
                {viewingHistoryItem?.items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/30 rounded-lg text-xs border">
                        <p className="font-bold text-primary">{item.productName}</p>
                        <div className="grid grid-cols-3 gap-x-4 mt-1 pt-1 border-t">
                            <p><span className="font-semibold">Toko:</span> {item.targetStore}</p>
                            <p><span className="font-semibold">Qty:</span> {item.stock}</p>
                            <p><span className="font-semibold">H. Beli:</span> {formatCurrency(item.buyPrice)}</p>
                        </div>
                    </div>
                ))}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={!!actionItem} onOpenChange={o => !o && setActionItem(null)}>
        <DialogContent className="max-w-xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>Pilih Aksi untuk Barang</DialogTitle>
            <DialogDescription className="truncate">{actionItem?.productName}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto -mx-6 px-6">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Cabang</TableHead>
                        <TableHead>Stok</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {actionItem?.variants.map((v: any) => (
                        <TableRow key={v.id}>
                            <TableCell><Badge variant='outline' className={cn('text-[9px] font-black border-none', v.storeId === 'TOKO_A' ? 'bg-primary/10 text-primary' : v.storeId === 'TOKO_B' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700')}>{v.storeName}</Badge></TableCell>
                            <TableCell className="font-bold">{v.stock}</TableCell>
                            <TableCell className="text-right">
                                <Button variant='ghost' size='icon' className='h-7 w-7 text-primary' onClick={() => { setSelectedEditItem(v); setActionItem(null); }}><Edit2 className='h-3.5 w-3.5' /></Button>
                                <Button variant='ghost' size='icon' className='h-7 w-7 text-destructive' onClick={() => { handleDeleteVariant(v.storeId, v.productId, v.id); }}><Trash2 className='h-3.5 w-3.5' /></Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingItem} onOpenChange={o => !o && setSelectedEditItem(null)}>
        <DialogContent className='max-w-2xl rounded-3xl overflow-hidden p-0 border-none shadow-2xl'>
          <DialogHeader className='p-6 bg-primary text-white'><DialogTitle className='text-xl font-black'>Edit Rincian Barang</DialogTitle><DialogDescription className='text-white/70'>Sesuaikan rincian stok barang.</DialogDescription></DialogHeader>
          {editingItem && (<div className='p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-slate-50/50'><div className='grid grid-cols-1 md:grid-cols-2 gap-6'><div className='space-y-4'><div className='flex items-center gap-2 mb-2'><History className='h-4 w-4 text-primary' /><h3 className='text-xs font-black uppercase'>Nota</h3></div><div className='grid gap-3 p-4 bg-white rounded-2xl border shadow-sm'><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>No Nota Beli</Label><Input value={editingItem.invoiceNo || ''} onChange={e => updateEditField('invoiceNo', e.target.value)} className='h-10 font-bold' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Tgl Nota</Label><Input type='date' value={editingItem.invoiceDate || ''} onChange={e => updateEditField('invoiceDate', e.target.value)} className='h-10' /></div></div><div className='flex items-center gap-2 mb-2 pt-2'><Shirt className='h-4 w-4 text-primary' /><h3 className='text-xs font-black uppercase'>Barang</h3></div><div className='grid gap-3 p-4 bg-white rounded-2xl border shadow-sm'><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Merk</Label><Input value={editingItem.brand || ''} list='brand-recommendations' onChange={e => updateEditField('brand', e.target.value)} className='h-10 font-bold' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Kategori</Label><Input value={editingItem.category || ''} list='category-recommendations' onChange={e => updateEditField('category', e.target.value)} className='h-10' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Seri</Label><Input value={editingItem.series || ''} onChange={e => updateEditField('series', e.target.value)} className='h-10' /></div><div className='grid grid-cols-2 gap-3'><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Size</Label><Input value={editingItem.size || ''} list='size-recommendations' onChange={e => updateEditField('size', e.target.value)} className='h-10 font-black text-center' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Warna</Label><Input value={editingItem.color || ''} list='color-recommendations' onChange={e => updateEditField('color', e.target.value)} className='h-10 text-xs' /></div></div></div></div><div className='space-y-4'><div className='flex items-center gap-2 mb-2'><Calculator className='h-4 w-4 text-primary' /><h3 className='text-xs font-black uppercase'>Finansial</h3></div><div className='grid gap-3 p-4 bg-white rounded-2xl border shadow-sm'><div className='space-y-1'><Label className='text-[10px] font-black uppercase'>Label</Label><Input type='text' value={formatCurrency(editingItem.labelPrice)} onChange={e => updateEditField('labelPrice', e.target.value)} className='h-10 font-bold' /></div><div className='grid grid-cols-2 gap-3'><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-emerald-600'>% Beli</Label><Input type='number' step='0.01' value={editingItem.buyDiscount || 0} onChange={e => updateEditField('buyDiscount', e.target.value)} className='h-10 font-bold border-emerald-200' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-primary'>H. Beli</Label><Input type='text' value={formatCurrency(editingItem.buyPrice)} onChange={e => updateEditField('buyPrice', e.target.value)} className='h-10 font-black border-primary/20 text-primary' /></div></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-accent'>H. Jual</Label><Input type='text' value={formatCurrency(editingItem.price)} onChange={e => updateEditField('price', e.target.value)} className='h-10 font-black border-accent/30' /></div><div className='space-y-1'><Label className='text-[10px] font-black uppercase text-blue-600'>Stok</Label><Input type='number' value={editingItem.stock || 0} onChange={e => updateEditField('stock', e.target.value)} className='h-10 font-black border-blue-200 text-blue-700' /></div></div><div className='p-4 bg-primary/5 rounded-2xl border border-primary/10'><div className='flex justify-center mb-4'><div className='relative group w-24 aspect-[4/5] bg-muted rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center overflow-hidden'>{isUploading === 'edit' ? <Loader2 className='h-6 w-6 animate-spin text-primary' /> : editingItem.productImage ? <img src={editingItem.productImage} className='w-full h-full object-cover' /> : <Camera className='h-6 w-6 text-muted-foreground opacity-20' />}<div className='absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer'><Camera className='h-6 w-6 text-white' /></div><input type='file' accept='image/*' className='absolute inset-0 opacity-0 cursor-pointer' disabled={!!isUploading} onChange={(e) => handleImageUpload(e)} /></div></div></div></div></div></div>)}
          <DialogFooter className='p-6 bg-white border-t'><Button className='w-full font-black h-14 rounded-2xl shadow-xl text-lg' disabled={!!isUploading} onClick={handleUpdateEdit}>SIMPAN DATA</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
