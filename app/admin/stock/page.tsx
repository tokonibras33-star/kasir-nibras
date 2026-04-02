"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LayoutGrid, List, Package, PackagePlus, Search, Download, Plus, Trash2, Edit2, Shirt, Calculator, Info, Image as ImageIcon, History, Eye, FileText, FileSpreadsheet, Upload, Filter, Camera, X, Loader2, FileDown } from "lucide-react";
import { useState, useMemo } from "react";
import { useFirestore, useStorage, useCollection, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { cn } from "@/lib/utils";

// DATABASE WARNA UNTUK REKOMENDASI
const COLOR_DATABASE = [
  "ABU", "ALULA GRAPE", "AQUA BLUE", "AQUAMARINE", "ARMY", "ARTIC DAISY", "AUTUMN", "BAMBOO", "BATA", "BEIGE", "BLACK", "BLUE", "BLUE PASTEL", "BLUSH", "BRILLIANT WHITE", "BRITISH GREEN", "BROKEN WHITE", "BRONZE", "BROWN", "BURGUNDY", "BUTTER CREAM", "CARAMEL LATTE", "CARAMELO", "CHAMPAGNE", "CHARM SILVER", "CHOCO", "CHOCO LATTE", "CHOCOLATTE", "CINNAMON", "CLOUD", "CLOVER", "COFFE", "COFFEE", "COKLAT BUMI", "COKSU", "COKTU", "COOL GRAY", "COPPER", "COTTON", "CREAM", "CREAMY LATTE", "DANDELION LIME", "DARK CHOCO", "DARK DENIM", "DARK EMERALD", "DARK GREY", "DARK MAROON", "DEEP BLUE", "DEEP MAHOGANY", "DEEP MAROON", "DEEP TAUPE", "DENIM", "DENIM MIDNIGHT", "DUST", "DUSTY BLUE", "DUSTY BROWN", "DUSTY LAVENDER", "DUSTY MAUVE", "DUSTY PINK", "DUSTY ROSE", "EMERALD", "EMERALD GREEN", "FADED DENIM", "FLAMINGO", "FLINT", "FLINT GREY", "FOREST", "FRESH GREENY", "GALAXY SOUL", "GLAMOUR", "GOLD", "GRAPES", "GREEN TINT", "GREY", "GREY GROVE", "GREY LILAC", "GUAVA", "HAZELNUT", "HONEY", "HUNTER GREEN", "ICE BLUE", "ICY LILAC", "IVORY", "JASMINE TEA", "KHAKI", "KRISAN OCEAN", "KUSUMA", "LATTE", "LATTE BEIGE", "LAUREL GREEN", "LAVENDER", "LAVENDER LILAC", "LAVENDER MIST", "LIGHT OLIVE", "LILAC", "LILAC GRAY", "MAHOGANY", "MAHOGANY BROWN", "MAROON", "MAUVE", "MIDNIGHT", "MIDNIGHT BLUE", "MILKY ROSY", "MILO", "MINT", "MINT SAGE", "MOCCA", "MOSS", "NAVY", "NAVY BLUE", "NIRWANA", "NUDE", "NUDE BEIGE", "OLIVE", "PALE MAUVE", "PEACH", "PEACHY", "PEANUT", "PEARLY WHITE", "PINK", "PLUM", "POWDER GREEN", "POWDER PEACH", "PURPLE", "RICH BLUE", "RICH TAN", "RICHY BLUE", "ROSE", "ROSE GOLD", "RUBY", "RUSSIAN MIST", "SAFIR", "SAGE", "SAGE GREEN", "SAKURA", "SALMON", "SEAFOAM", "SEAGREEN", "SHADOW GRAY", "SHADOW GREY", "SILVER", "SKY", "SKY BLUE", "SMOKE GREY", "SMOKEY GREY", "SOFT PINK", "SPLASH BROWN", "STEEL", "STEEL BLUE", "STONE GREY", "TEAL GREEN", "TERACCOTA", "TERRAWOOD", "TOASTY DUST", "TORTILLA X CHOCOLATE", "TOSCA", "VANILLA", "VINTAGE HEATHER", "VIOLET", "WAFER", "WALNUT", "WARM BLACK", "WARM GREY", "WHITE", "WINE BERRY"
];

// DATABASE MERK UNTUK REKOMENDASI
const BRAND_DATABASE = [
  "Aden", "AHSAN", "Ainun", "Ajwa", "ALFASA", "Alfira", "Aqlan", "AR", "ARSELLE", "ARUMY", "AS MOESLEM", "Aysila", "Dafeena", "DENIZER", "Elzatta", "EMILY DAILY", "ETHICA", "FeeFashion", "Gabia", "Ghiina", "HIJABI OFFICIAL", "Hunny Label", "IMIDY", "Journey", "Kaen", "KAMSA", "Kazami", "Keke", "Latanza", "LUBI", "MALIHA", "MOSLEM DAILY", "Nadheera Luxury", "NARARYA", "Nata Id", "NIARA", "NIBRAS", "NIRMALA", "Non Branded", "Poeti", "Rabbani", "Raisakey", "Ratu Bilqis", "RAYYA", "Rivantie", "SALVINA", "SAV KIDS", "Seply", "Ss Hijab", "SYIFA OFFICIAL", "Urfimutiyaro", "Yukio", "ZAMEERA", "Zz Homey"
];

// DATABASE KATEGORI UNTUK REKOMENDASI
const CATEGORY_DATABASE = [
  "Accesories", "Atasan", "Blouse", "Bros", "Celana", "Ciput", "Dompet", "DRESS", "GAMIS", "GAMIS ANAK", "Jilbab Instan", "Jilbab Segi_4", "Jilbab Segi_5", "Jilbab Segi_6", "Jilbab Segi_7", "KOKO", "KOKO ANAK", "MIDI DRESS", "Mukena", "Mukena Anak", "Oneset", "Pashmina", "Sandal", "Sarung", "Tas", "Tunik"
];

// DATABASE SIZE UNTUK REKOMENDASI
const SIZE_DATABASE = [
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "37", "39", "0+", "115X115", "2XL", "3XL", "ALL", "BIG", "L", "M", "S", "XL", "XS", "XXL", "XXS", "XXXL", "XXXXL"
];

interface StockItemInput {
  id: string;
  targetStore: string;
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
}

export default function StockPage() {
  const db = useFirestore();
  const storage = useStorage();
  const [view, setView] = useState<"table" | "grid">("table");
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [storeFilter, setStoreFilter] = useState<string>("ALL");
  const [isUploading, setIsUploading] = useState<string | boolean>(false);

  // Edit State
  const [editingItem, setSelectedEditItem] = useState<any>(null);

  // Invoice Header State
  const [invoiceHeader, setInvoiceHeader] = useState({
    entryDate: format(new Date(), "yyyy-MM-dd"),
    invoiceNo: "",
    invoiceDate: format(new Date(), "yyyy-MM-dd"),
    proofImage: "",
  });

  // Items List State
  const createNewItem = (): StockItemInput => ({
    id: Math.random().toString(36).substr(2, 9),
    targetStore: "TOKO_A",
    brand: "",
    category: "",
    series: "",
    size: "",
    color: "",
    labelPrice: "",
    sellPrice: "",
    quantity: "",
    buyDiscount: "",
    buyPriceRp: "",
  });

  const [items, setItems] = useState<StockItemInput[]>([createNewItem()]);

  const resetInputForm = () => {
    setItems([createNewItem()]);
    setInvoiceHeader({
      entryDate: format(new Date(), "yyyy-MM-dd"),
      invoiceNo: "",
      invoiceDate: format(new Date(), "yyyy-MM-dd"),
      proofImage: "",
    });
  };

  // Queries
  const stockAQuery = useMemoFirebase(() => collection(db, "stores", "TOKO_A", "stock"), [db]);
  const { data: dataA } = useCollection<any>(stockAQuery);
  
  const stockBQuery = useMemoFirebase(() => collection(db, "stores", "TOKO_B", "stock"), [db]);
  const { data: dataB } = useCollection<any>(stockBQuery);

  const stockCQuery = useMemoFirebase(() => collection(db, "stores", "TOKO_C", "stock"), [db]);
  const { data: dataC } = useCollection<any>(stockCQuery);

  const stockA = dataA || [];
  const stockB = dataB || [];
  const stockC = dataC || [];

  const totalA = useMemo(() => stockA.reduce((acc, p) => acc + (p.variants?.reduce((vAcc: number, v: any) => vAcc + (v.stock || 0), 0) || 0), 0), [stockA]);
  const totalB = useMemo(() => stockB.reduce((acc, p) => acc + (p.variants?.reduce((vAcc: number, v: any) => vAcc + (v.stock || 0), 0) || 0), 0), [stockB]);
  const totalC = useMemo(() => stockC.reduce((acc, p) => acc + (p.variants?.reduce((vAcc: number, v: any) => vAcc + (v.stock || 0), 0) || 0), 0), [stockC]);

  // Detailed stock list
  const detailedStockList = useMemo(() => {
    const list: any[] = [];
    const processStore = (storeData: any[], storeId: string, storeName: string) => {
      if (storeFilter !== "ALL" && storeFilter !== storeId) return;
      storeData.forEach(product => {
        (product.variants || []).forEach((v: any) => {
          list.push({
            ...v,
            productId: product.id,
            productName: product.name,
            brand: product.brand || "-",
            category: product.category || "-",
            series: product.series || "-",
            storeId: storeId,
            storeName: storeName,
            margin: (v.price || 0) - (v.buyPrice || 0),
            productImage: product.image || ""
          });
        });
      });
    };
    processStore(stockA, "TOKO_A", "NHS KWT");
    processStore(stockB, "TOKO_B", "IND CO");
    processStore(stockC, "TOKO_C", "NHS GDM");
    return list.filter(item => 
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.brand.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [stockA, stockB, stockC, searchTerm, storeFilter]);

  const handleExportExcel = () => {
    if (detailedStockList.length === 0) return;
    const headers = [
      "No Nota", "Cabang", "Merk", "Kategori", "Seri", "Size", "Warna", 
      "Harga Label", "QTY", "% Beli", "Harga Beli", "Harga Jual", "Nama Barang"
    ];
    const data = detailedStockList.map(item => [
      item.invoiceNo || "-",
      item.storeName,
      item.brand,
      item.category,
      item.series,
      item.size,
      item.color,
      item.labelPrice,
      item.stock,
      item.buyDiscount,
      item.buyPrice,
      item.price,
      item.productName
    ]);
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok Global");
    XLSX.writeFile(wb, `ekspor-stok-nibras-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "Excel Berhasil Diunduh" });
  };

  const handleExportPDF = () => {
    if (detailedStockList.length === 0) return;
    const docPdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    docPdf.text("Laporan Inventaris Detail Global - Nibras House", 148, 10, { align: "center" });
    docPdf.setFontSize(10);
    docPdf.text(`Periode: ${storeFilter === 'ALL' ? 'Semua Cabang' : storeFilter === 'TOKO_A' ? 'NHS KWT' : storeFilter === 'TOKO_B' ? 'IND CO' : 'NHS GDM'}`, 148, 16, { align: "center" });
    docPdf.text(`Dicetak pada: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 148, 22, { align: "center" });

    const tableData = detailedStockList.map(item => [
      item.invoiceNo || "-",
      item.storeName,
      item.brand,
      item.category,
      item.size,
      item.color,
      item.stock,
      `Rp ${item.labelPrice?.toLocaleString('id-ID')}`,
      `Rp ${item.price?.toLocaleString('id-ID')}`
    ]);

    (docPdf as any).autoTable({
      head: [['No Nota', 'Cabang', 'Merk', 'Kategori', 'Size', 'Warna', 'Qty', 'H. Label', 'Harga Jual']],
      body: tableData,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [31, 122, 99], textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 7 },
      columnStyles: {
        6: { halign: 'center' },
        7: { halign: 'right' },
        8: { halign: 'right' }
      }
    });

    docPdf.save(`ekspor-stok-nibras-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF Berhasil Diunduh" });
  };

  const handleDeleteStockFiltered = () => {
    if (detailedStockList.length === 0) return;
    
    if (confirm(`Hapus PERMANEN ${detailedStockList.length} rincian stok yang tampil?`)) {
      const grouped: Record<string, Record<string, string[]>> = {}; 
      detailedStockList.forEach(item => {
        if (!grouped[item.storeId]) grouped[item.storeId] = {};
        if (!grouped[item.storeId][item.productId]) grouped[item.storeId][item.productId] = [];
        grouped[item.storeId][item.productId].push(item.id);
      });

      Object.entries(grouped).forEach(([storeId, productsMap]) => {
        const sourceData = storeId === "TOKO_A" ? stockA : storeId === "TOKO_B" ? stockB : stockC;
        Object.entries(productsMap).forEach(([productId, variantIdsToDelete]) => {
          const product = sourceData.find(p => p.id === productId);
          if (product) {
            const remainingVariants = (product.variants || []).filter((v: any) => !variantIdsToDelete.includes(v.id));
            if (remainingVariants.length === 0) {
              deleteDocumentNonBlocking(doc(db, "stores", storeId, "stock", productId));
            } else {
              updateDocumentNonBlocking(doc(db, "stores", storeId, "stock", productId), { variants: remainingVariants });
            }
          }
        });
      });
      toast({ title: "Penghapusan Berhasil", description: `${detailedStockList.length} rincian stok telah diproses.` });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, id?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 300 * 1024) {
      toast({ title: "File Terlalu Besar", description: "Maksimal 300KB.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    const uploadKey = id || (editingItem ? 'edit' : 'invoice');
    setIsUploading(uploadKey);
    try {
      const storageRef = ref(storage, `stock/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      if (editingItem) {
        setSelectedEditItem({ ...editingItem, productImage: downloadURL });
      } else {
        setInvoiceHeader(prev => ({ ...prev, proofImage: downloadURL }));
      }
      toast({ title: "Berhasil", description: "Gambar telah diunggah." });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Upload Gagal", description: "Terjadi kesalahan saat mengunggah gambar.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadFormat = () => {
    const headers = [
      "Tanggal Entry", "No Nota Beli", "Tanggal Nota", "Merk", "Kategori", 
      "Seri", "Size", "Warna", "Harga Label", "% Beli", 
      "Harga Beli", "Harga Jual", "QTY", "Cabang Tujuan"
    ];
    const dummyData = [
      [format(new Date(), "yyyy-MM-dd"), "NB-001", format(new Date(), "yyyy-MM-dd"), "NIBRAS", "GAMIS", "SERI A", "L", "NAVY", "250000", "10", "225000", "250000", "5", "NHS KWT"]
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dummyData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Format Impor Stok");
    XLSX.writeFile(wb, "format-impor-stok-nibras.xlsx");
    toast({ title: "Format Terunduh", description: "Silakan isi data sesuai kolom yang tersedia." });
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
          rows = content.split(/\r?\n/).filter(row => row.trim() !== '').map(row => row.split(/[,\t;]/).map(col => col.trim().replace(/^"|"$/g, '')));
        }
        
        if (rows.length < 2) return;
        
        // Skip header
        const startIdx = 1;
        let successCount = 0;
        const entryItems: any[] = [];

        for (let i = startIdx; i < rows.length; i++) {
          const cols = rows[i];
          if (cols.length < 14) continue;

          // Format: [Tgl Entry, No Nota, Tgl Nota, Merk, Kategori, Seri, Size, Warna, Label, %Beli, H.Beli, H.Jual, QTY, Cabang]
          const [tglEntry, noNota, tglNota, merk, kategori, seri, size, warna, label, discBeli, hBeli, hJual, qty, cabang] = cols;
          
          const targetStoreRaw = (cabang || '').toUpperCase().replace(/\s+/g, '');
          const targetStore = targetStoreRaw.includes('NHSKWT') || targetStoreRaw.includes('TOKOA') ? 'TOKO_A' : 
                              targetStoreRaw.includes('INDCO') || targetStoreRaw.includes('TOKOB') ? 'TOKO_B' : 
                              targetStoreRaw.includes('NHSGDM') || targetStoreRaw.includes('TOKOC') ? 'TOKO_C' : null;
          
          if (!targetStore) continue;

          const autoName = `${kategori || ''} ${merk || ''} ${seri || ''} ${size || ''} ${warna || ''}`.toUpperCase().trim();
          const qtyNum = parseInt(qty || '0') || 0;
          
          const variantData = {
            id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            color: warna || "Default",
            size: size || "L",
            stock: qtyNum,
            labelPrice: parseFloat(label?.replace(/[^0-9.-]+/g, "") || "0") || 0,
            price: parseFloat(hJual?.replace(/[^0-9.-]+/g, "") || "0") || 0,
            buyPrice: parseFloat(hBeli?.replace(/[^0-9.-]+/g, "") || "0") || 0,
            buyDiscount: discBeli || "0",
            invoiceNo: noNota || "-",
            invoiceDate: tglNota || "-",
            entryDate: tglEntry || format(new Date(), "yyyy-MM-dd")
          };

          entryItems.push({ ...variantData, productName: autoName, targetStore, brand: merk || "-", category: kategori || "-", series: seri || "-" });
          
          const storeProducts = targetStore === "TOKO_A" ? stockA : targetStore === "TOKO_B" ? stockB : stockC;
          let existingProduct = storeProducts.find(p => p.name.toUpperCase() === autoName);

          if (!existingProduct) {
            const productId = `P-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            setDocumentNonBlocking(doc(db, "stores", targetStore, "stock", productId), { 
              id: productId, 
              name: autoName, 
              brand: merk || "-", 
              category: kategori || "-", 
              series: seri || "-", 
              image: `https://picsum.photos/seed/${autoName.replace(/\s+/g, '-')}/400/500`, 
              variants: [variantData] 
            }, { merge: true });
          } else {
            const updatedVariants = [...(existingProduct.variants || [])];
            const vIdx = updatedVariants.findIndex(v => v.color.toLowerCase() === (warna || "Default").toLowerCase() && v.size === (size || "L"));
            if (vIdx === -1) updatedVariants.push(variantData); 
            else { 
              updatedVariants[vIdx].stock += qtyNum; 
              updatedVariants[vIdx].labelPrice = variantData.labelPrice; 
              updatedVariants[vIdx].price = variantData.price; 
              updatedVariants[vIdx].buyPrice = variantData.buyPrice; 
              updatedVariants[vIdx].buyDiscount = variantData.buyDiscount; 
            }
            updateDocumentNonBlocking(doc(db, "stores", targetStore, "stock", existingProduct.id), { variants: updatedVariants });
          }
          successCount++;
        }

        if (successCount > 0) {
          addDocumentNonBlocking(collection(db, "stockEntries"), { 
            entryDate: format(new Date(), "yyyy-MM-dd"), 
            invoiceNo: `IMPORT-${format(new Date(), "HHmmss")}`, 
            invoiceDate: format(new Date(), "yyyy-MM-dd"), 
            items: entryItems, 
            timestamp: new Date().toISOString(), 
            totalItems: successCount, 
            isImport: true, 
            proofImage: "" 
          });
          toast({ title: "Import Berhasil", description: `${successCount} item data berhasil diproses.` });
        }
      } catch (err) { 
        console.error(err);
        toast({ title: "Import Gagal", description: "Terjadi kesalahan saat memproses file.", variant: "destructive" }); 
      }
    };
    if (isXlsx) reader.readAsArrayBuffer(file); else reader.readAsText(file);
    e.target.value = '';
  };

  const updateItemField = (id: string, field: keyof StockItemInput, value: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // LOGIKA OTOMATISASI HARGA BELI DARI % BELI
        const labelPrice = parseFloat(updatedItem.labelPrice) || 0;
        
        if (field === "buyDiscount") {
          const discPercent = parseFloat(value) || 0;
          if (labelPrice > 0) {
            const buyPrice = labelPrice - (labelPrice * discPercent / 100);
            updatedItem.buyPriceRp = Math.round(buyPrice).toString();
          }
        } 
        else if (field === "labelPrice") {
          const currentDisc = parseFloat(updatedItem.buyDiscount) || 0;
          const currentLabel = parseFloat(value) || 0;
          if (currentLabel > 0) {
            const buyPrice = currentLabel - (currentLabel * currentDisc / 100);
            updatedItem.buyPriceRp = Math.round(buyPrice).toString();
          }
        }
        else if (field === "buyPriceRp") {
          const currentBuy = parseFloat(value) || 0;
          if (labelPrice > 0) {
            const discValue = (((labelPrice - currentBuy) / labelPrice) * 100).toFixed(2);
            updatedItem.buyDiscount = discValue;
          }
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleInputStock = () => {
    if (!invoiceHeader.invoiceNo) {
      toast({ title: "Gagal", description: "Nomor Nota Beli wajib diisi.", variant: "destructive" });
      return;
    }
    let successCount = 0;
    const entryItems: any[] = [];
    items.forEach(item => {
      const { targetStore, brand, category, series, size, color, quantity, labelPrice, sellPrice, buyPriceRp, buyDiscount } = item;
      if (!brand || !series || !color || !quantity || !labelPrice || !sellPrice) return;
      const autoName = `${category} ${brand} ${series} ${size} ${color}`.toUpperCase().trim();
      const variantData = {
        id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        color: color || "Default",
        size: size || "L",
        stock: parseInt(quantity) || 0,
        labelPrice: parseFloat(labelPrice) || 0,
        price: parseFloat(sellPrice) || 0,
        buyPrice: parseFloat(buyPriceRp || "0") || 0,
        buyDiscount: buyDiscount || "0",
        invoiceNo: invoiceHeader.invoiceNo || "-",
        invoiceDate: invoiceHeader.invoiceDate || "-",
        entryDate: invoiceHeader.entryDate || "-"
      };
      entryItems.push({ ...variantData, productName: autoName, targetStore, brand: brand || "-", category: category || "-", series: series || "-" });
      const storeProducts = targetStore === "TOKO_A" ? stockA : targetStore === "TOKO_B" ? stockB : stockC;
      let existingProduct = storeProducts.find(p => p.name.toUpperCase() === autoName);
      if (!existingProduct) {
        const productId = `P-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setDocumentNonBlocking(doc(db, "stores", targetStore, "stock", productId), { id: productId, name: autoName, brand: brand || "-", category: category || "-", series: series || "-", image: `https://picsum.photos/seed/${autoName.replace(/\s+/g, '-')}/400/500`, variants: [variantData] }, { merge: true });
      } else {
        const updatedVariants = [...(existingProduct.variants || [])];
        const vIdx = updatedVariants.findIndex(v => v.color.toLowerCase() === color.toLowerCase() && v.size === size);
        if (vIdx === -1) updatedVariants.push(variantData); else { updatedVariants[vIdx].stock += parseInt(quantity) || 0; updatedVariants[vIdx].labelPrice = parseFloat(labelPrice) || 0; updatedVariants[vIdx].price = parseFloat(sellPrice) || 0; updatedVariants[vIdx].buyPrice = parseFloat(buyPriceRp || "0") || 0; updatedVariants[vIdx].buyDiscount = buyDiscount || "0"; }
        updateDocumentNonBlocking(doc(db, "stores", targetStore, "stock", existingProduct.id), { variants: updatedVariants });
      }
      successCount++;
    });
    if (successCount > 0) {
      addDocumentNonBlocking(collection(db, "stockEntries"), { entryDate: invoiceHeader.entryDate, invoiceNo: invoiceHeader.invoiceNo, invoiceDate: invoiceHeader.invoiceDate, proofImage: invoiceHeader.proofImage || "", items: entryItems, timestamp: new Date().toISOString(), totalItems: successCount });
      setIsInputOpen(false); resetInputForm();
      toast({ title: "Berhasil", description: `${successCount} item stok tersimpan.` });
    }
  };

  const handleDeleteVariant = (storeId: string, productId: string, variantId: string) => {
    if (!confirm("Hapus rincian stok barang ini?")) return;
    const sourceProducts = storeId === "TOKO_A" ? stockA : storeId === "TOKO_B" ? stockB : stockC;
    const product = sourceProducts.find(p => p.id === productId);
    if (product) {
      const updatedVariants = (product.variants || []).filter((v: any) => v.id !== variantId);
      if (updatedVariants.length === 0) deleteDocumentNonBlocking(doc(db, "stores", storeId, "stock", productId)); else updateDocumentNonBlocking(doc(db, "stores", storeId, "stock", productId), { variants: updatedVariants });
      toast({ title: "Berhasil", description: "Dihapus." });
    }
  };

  const updateEditField = (field: string, value: string) => {
    setSelectedEditItem((prev: any) => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };
      
      // LOGIKA OTOMATISASI HARGA BELI DARI % BELI
      const label = parseFloat(updated.labelPrice) || 0;
      
      if (field === "buyDiscount") {
        const discPercent = parseFloat(value) || 0;
        if (label > 0) {
          updated.buyPrice = Math.round(label - (label * discPercent / 100));
        }
      } 
      else if (field === "labelPrice") {
        const currentDisc = parseFloat(updated.buyDiscount) || 0;
        const currentLabel = parseFloat(value) || 0;
        if (currentLabel > 0) {
          updated.buyPrice = Math.round(currentLabel - (currentLabel * currentDisc / 100));
        }
      }
      else if (field === "buyPrice") {
        const currentBuy = parseFloat(value) || 0;
        if (label > 0) {
          updated.buyDiscount = (((label - currentBuy) / label) * 100).toFixed(2);
        }
      }
      
      return updated;
    });
  };

  const handleUpdateEdit = () => {
    if (!editingItem) return;
    const { 
      storeId, productId, id: variantId, 
      price, stock, labelPrice, buyPrice, buyDiscount, 
      invoiceNo, invoiceDate, color, size,
      brand, category, series,
      productImage 
    } = editingItem;
    
    const sourceProducts = storeId === "TOKO_A" ? stockA : storeId === "TOKO_B" ? stockB : stockC;
    const product = sourceProducts.find(p => p.id === productId);
    
    if (product) {
      const updatedVariants = (product.variants || []).map((v: any) => 
        v.id === variantId ? { 
          ...v, 
          price: parseFloat(price) || 0, 
          stock: parseInt(stock) || 0, 
          labelPrice: parseFloat(labelPrice) || 0, 
          buyPrice: parseFloat(buyPrice) || 0, 
          buyDiscount: buyDiscount || "0",
          invoiceNo: invoiceNo || "-",
          invoiceDate: invoiceDate || "-",
          color: color || "Default",
          size: size || "L"
        } : v
      );

      // Update product-level fields and sync name
      const autoName = `${category || product.category} ${brand || product.brand} ${series || product.series} ${size || "L"} ${color || "Default"}`.toUpperCase().trim();
      
      const payload: any = { 
        variants: updatedVariants,
        brand: brand || product.brand || "-",
        category: category || product.category || "-",
        series: series || product.series || "-",
        name: autoName
      };
      
      if (productImage) payload.image = productImage;
      
      updateDocumentNonBlocking(doc(db, "stores", storeId, "stock", productId), payload);
      setSelectedEditItem(null);
      toast({ title: "Berhasil", description: "Data rincian barang diperbarui." });
    }
  };

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* DATALIST UNTUK REKOMENDASI */}
      <datalist id="color-recommendations">
        {COLOR_DATABASE.map(color => <option key={color} value={color} />)}
      </datalist>
      <datalist id="brand-recommendations">
        {BRAND_DATABASE.map(brand => <option key={brand} value={brand} />)}
      </datalist>
      <datalist id="category-recommendations">
        {CATEGORY_DATABASE.map(cat => <option key={cat} value={cat} />)}
      </datalist>
      <datalist id="size-recommendations">
        {SIZE_DATABASE.map(size => <option key={size} value={size} />)}
      </datalist>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary">Ringkasan Stok Global</h1>
          <p className="text-muted-foreground text-sm">Monitoring rincian inventaris (NHS KWT, IND CO, NHS GDM).</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button variant="destructive" className="h-10 font-bold px-4" disabled={detailedStockList.length === 0} onClick={handleDeleteStockFiltered}><Trash2 className="h-4 w-4 mr-2" /> Hapus Stok</Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 font-bold px-4"><Upload className="h-4 w-4 mr-2" /> Impor Excel</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuItem className="cursor-pointer font-bold gap-2 py-3" onClick={() => document.getElementById('excel-import-input')?.click()}>
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Unggah File Excel
                <input id="excel-import-input" type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportExcel} />
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold gap-2 py-3" onClick={handleDownloadFormat}>
                <FileDown className="h-4 w-4 text-primary" /> Unduh Format Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 font-bold px-4">
                <Download className="h-4 w-4 mr-2" /> Ekspor Stok
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl">
              <DropdownMenuItem className="cursor-pointer font-bold gap-2 py-3" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Download Excel
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer font-bold gap-2 py-3" onClick={handleExportPDF}>
                <FileText className="h-4 w-4 text-rose-600" /> Download PDF (A4)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isInputOpen} onOpenChange={(open) => { setIsInputOpen(open); if (open) resetInputForm(); }}>
            <DialogTrigger asChild>
              <Button className="h-12 px-6 font-black bg-primary shadow-xl shadow-primary/20 text-white"><PackagePlus className="h-5 w-5 mr-2" /> Input Stok Baru</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-5xl w-[95vw] h-[90vh] rounded-3xl flex flex-col p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-6 pb-2 shrink-0"><DialogTitle className="text-2xl font-black">Input Stok & Nota Beli</DialogTitle><DialogDescription>Satu nota bisa didistribusikan ke beberapa toko.</DialogDescription></DialogHeader>
              
              <div className="flex-1 overflow-y-auto px-6 scrollbar-hide bg-slate-50">
                <div className="space-y-6 py-4">
                  <Card className="border-none shadow-none bg-muted/30 rounded-2xl">
                    <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-muted-foreground">Tanggal Entry</Label><Input type="date" value={invoiceHeader.entryDate} disabled className="h-10 bg-white/50 border-none" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase">No Nota Beli</Label><Input placeholder="NB-001" value={invoiceHeader.invoiceNo} onChange={e => setInvoiceHeader({...invoiceHeader, invoiceNo: e.target.value})} className="h-10 bg-white font-bold" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase">Tanggal Nota</Label><Input type="date" value={invoiceHeader.invoiceDate} onChange={e => setInvoiceHeader({...invoiceHeader, invoiceDate: e.target.value})} className="h-10 bg-white" /></div>
                      <div className="space-y-1.5">
                        <Label className="text-[10px] font-black uppercase">Bukti Nota (Storage)</Label>
                        <div className="relative group">
                          <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="h-10 bg-white cursor-pointer file:hidden pr-10" />
                          {isUploading === 'invoice' ? <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-primary" /> : <ImageIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />}
                          {invoiceHeader.proofImage && <div className="absolute right-10 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md overflow-hidden border"><img src={invoiceHeader.proofImage} className="w-full h-full object-cover" alt="" /></div>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="flex items-center justify-between"><h3 className="text-sm font-black uppercase flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Daftar Barang ({items.length})</h3></div>
                  
                  <div className="space-y-4 pb-8">
                    {items.map((item, index) => (
                      <Card key={item.id} className="group relative border-2 border-primary/10 hover:border-primary/30 transition-all rounded-2xl overflow-hidden bg-primary/5 shadow-sm">
                        {items.length > 1 && <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full shadow-lg z-10" onClick={() => setItems(items.filter(i => i.id !== item.id))}><Trash2 className="h-4 w-4" /></Button>}
                        <CardContent className="p-4 sm:p-5 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
                            {/* Baris 1: Identitas Produk */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase">Merk</Label>
                              <Input placeholder="Merk..." value={item.brand} list="brand-recommendations" autoComplete="off" onChange={e => updateItemField(item.id, 'brand', e.target.value)} className="h-9 bg-white" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase">Kategori</Label>
                              <Input placeholder="Kategori..." value={item.category} list="category-recommendations" autoComplete="off" onChange={e => updateItemField(item.id, 'category', e.target.value)} className="h-9 bg-white" />
                            </div>
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Seri</Label><Input placeholder="Seri..." value={item.series} autoComplete="off" onChange={e => updateItemField(item.id, 'series', e.target.value)} className="h-9 bg-white" /></div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase">Size</Label>
                              <Input placeholder="Size..." value={item.size} list="size-recommendations" autoComplete="off" onChange={e => updateItemField(item.id, 'size', e.target.value)} className="h-9 bg-white" />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] font-black uppercase">Warna</Label>
                              <Input placeholder="Warna..." value={item.color} list="color-recommendations" autoComplete="off" onChange={e => updateItemField(item.id, 'color', e.target.value)} className="h-9 bg-white" />
                            </div>
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Harga Label</Label><Input type="number" value={item.labelPrice} autoComplete="off" onChange={e => updateItemField(item.id, 'labelPrice', e.target.value)} className="h-9 font-bold bg-white" /></div>

                            {/* Baris 2: %Beli, Harga Beli, Harga Jual, QTY, dan Cabang Tujuan */}
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-emerald-600">% Beli</Label><Input type="number" value={item.buyDiscount} autoComplete="off" onChange={e => updateItemField(item.id, 'buyDiscount', e.target.value)} className="h-9 bg-white font-bold border-emerald-200" /></div>
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-primary">Harga Beli</Label><Input type="number" value={item.buyPriceRp} autoComplete="off" onChange={e => updateItemField(item.id, 'buyPriceRp', e.target.value)} className="h-9 font-bold bg-white border-primary/20 text-primary" /></div>
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-accent">Harga Jual</Label><Input type="number" value={item.sellPrice} autoComplete="off" onChange={e => updateItemField(item.id, 'sellPrice', e.target.value)} className="h-9 font-bold bg-white border-accent/30" /></div>
                            <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-blue-600">QTY</Label><Input type="number" value={item.quantity} autoComplete="off" onChange={e => updateItemField(item.id, 'quantity', e.target.value)} className="h-9 bg-white border-blue-200" /></div>
                            <div className="col-span-2 space-y-1">
                              <Label className="text-[10px] font-black uppercase text-primary">Cabang Tujuan</Label>
                              <Select value={item.targetStore} onValueChange={v => updateItemField(item.id, 'targetStore', v)}>
                                <SelectTrigger className="h-9 font-bold bg-white border-primary/30"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="TOKO_A">NHS KWT</SelectItem><SelectItem value="TOKO_B">IND CO</SelectItem><SelectItem value="TOKO_C">NHS GDM</SelectItem></SelectContent>
                              </Select>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    <Button variant="outline" onClick={() => setItems([...items, createNewItem()])} className="w-full h-14 border-2 border-dashed border-primary/20 text-primary hover:bg-primary/10 font-black rounded-2xl flex items-center justify-center gap-2 transition-all"><Plus className="h-5 w-5" /> TAMBAH BARIS BARANG BARU</Button>
                  </div>
                </div>
              </div>
              
              <DialogFooter className="p-6 bg-white border-t shrink-0"><Button className="w-full font-black h-14 rounded-2xl shadow-2xl text-lg flex items-center justify-center gap-2 text-white" disabled={!!isUploading} onClick={handleInputStock}><Calculator className="h-5 w-5" /> SIMPAN {items.length} BARANG KE DATABASE</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="soft-shadow border-none bg-primary/5"><CardHeader className="p-4"><CardTitle className="text-xs uppercase font-black text-primary opacity-70">NHS KWT</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-3xl font-black text-primary">{totalA} <span className="text-xs font-bold opacity-50">Unit</span></p></CardContent></Card>
        <Card className="soft-shadow border-none bg-blue-50"><CardHeader className="p-4"><CardTitle className="text-xs uppercase font-black text-blue-600 opacity-70">IND CO</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-3xl font-black text-blue-600">{totalB} <span className="text-xs font-bold opacity-50">Unit</span></p></CardContent></Card>
        <Card className="soft-shadow border-none bg-emerald-50"><CardHeader className="p-4"><CardTitle className="text-xs uppercase font-black text-emerald-600 opacity-70">NHS GDM</CardTitle></CardHeader><CardContent className="p-4 pt-0"><p className="text-3xl font-black text-emerald-600">{totalC} <span className="text-xs font-bold opacity-50">Unit</span></p></CardContent></Card>
      </div>

      <Card className="soft-shadow border-none overflow-hidden rounded-3xl flex flex-col">
        <CardHeader className="p-4 md:p-6 space-y-4 border-b bg-muted/10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1"><CardTitle className="text-lg md:text-xl font-black">Inventaris Detail Global</CardTitle><CardDescription className="text-xs">Filter data rincian barang seluruh cabang.</CardDescription></div>
            <div className="flex items-center border rounded-xl p-1 bg-white shadow-sm"><Button variant={view === "table" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setView("table")}><List className="h-4 w-4" /></Button><Button variant={view === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-lg" onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button></div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari Barang, Merk, atau No Nota..." className="pl-10 h-10 bg-white border-none shadow-sm text-xs rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            <Select value={storeFilter} onValueChange={setStoreFilter}>
              <SelectTrigger className="h-10 w-full sm:w-[160px] bg-white border-none shadow-sm text-xs font-bold rounded-xl"><SelectValue placeholder="Semua Cabang" /></SelectTrigger>
              <SelectContent className="rounded-xl"><SelectItem value="ALL">Semua Cabang</SelectItem><SelectItem value="TOKO_A">NHS KWT</SelectItem><SelectItem value="TOKO_B">IND CO</SelectItem><SelectItem value="TOKO_C">NHS GDM</SelectItem></SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          {view === "table" ? (
            <div className="overflow-x-auto"><div className="min-w-[1200px] pb-4"><Table>
              <TableHeader className="bg-muted/50"><TableRow className="text-[10px] uppercase font-black border-none"><TableHead className="pl-6">Aksi</TableHead><TableHead>No Nota</TableHead><TableHead>Cabang</TableHead><TableHead>Merk</TableHead><TableHead>Kategori</TableHead><TableHead>Seri</TableHead><TableHead>Size</TableHead><TableHead>Warna</TableHead><TableHead className="text-right">Label</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-center">% Beli</TableHead><TableHead className="text-right">H. Beli</TableHead><TableHead className="text-right">H. Jual</TableHead><TableHead className="pr-6">Nama Barang</TableHead></TableRow></TableHeader>
              <TableBody>{detailedStockList.length > 0 ? detailedStockList.map((item, idx) => (
                <TableRow key={idx} className="hover:bg-muted/20 transition-colors text-[11px] border-b border-muted/50 transition-colors">
                  <TableCell className="pl-6"><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => setSelectedEditItem(item)}><Edit2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteVariant(item.storeId, item.productId, item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></TableCell>
                  <TableCell className="font-mono font-bold text-primary">{item.invoiceNo || "-"}</TableCell>
                  <TableCell><Badge variant="outline" className={cn("text-[9px] font-black border-none", item.storeId === 'TOKO_A' ? "bg-primary/10 text-primary" : item.storeId === 'TOKO_B' ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700")}>{item.storeName}</Badge></TableCell>
                  <TableCell className="font-bold">{item.brand}</TableCell><TableCell>{item.category}</TableCell><TableCell>{item.series}</TableCell><TableCell className="font-black">{item.size}</TableCell><TableCell>{item.color}</TableCell>
                  <TableCell className="text-right">Rp {(item.labelPrice || 0).toLocaleString('id-ID')}</TableCell><TableCell className="text-center font-black text-primary">{item.stock}</TableCell><TableCell className="text-center text-emerald-600">{item.buyDiscount || "0"}%</TableCell>
                  <TableCell className="text-right text-primary font-bold">Rp {(item.buyPrice || 0).toLocaleString('id-ID')}</TableCell><TableCell className="text-right font-black text-accent">Rp {(item.price || 0).toLocaleString('id-ID')}</TableCell><TableCell className="font-bold pr-6 max-w-[200px] truncate">{item.productName}</TableCell>
                </TableRow>)) : <TableRow><TableCell colSpan={14} className="h-48 text-center text-muted-foreground italic">Belum ada data rincian barang.</TableCell></TableRow>}
              </TableBody>
            </Table></div></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6 bg-slate-50/50">
              {detailedStockList.map((item, idx) => (
                <Card key={idx} className="border-none bg-white soft-shadow rounded-2xl group hover:scale-[1.02] transition-transform">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start"><div className="h-16 w-12 rounded-lg bg-muted overflow-hidden shadow-sm"></div><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={() => setSelectedEditItem(item)}><Edit2 className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleDeleteVariant(item.storeId, item.productId, item.id)}><Trash2 className="h-3.5 w-3.5" /></Button></div></div>
                    <div><h4 className="font-black text-xs uppercase leading-tight line-clamp-2">{item.productName}</h4><p className="text-[9px] text-muted-foreground mt-1">{item.brand} | {item.category}</p></div>
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed"><div><p className="text-[8px] uppercase font-black text-muted-foreground">Harga Jual</p><p className="text-xs font-black text-accent">Rp {(item.price || 0).toLocaleString('id-ID')}</p></div><div className="text-right"><p className="text-[8px] uppercase font-black text-muted-foreground">Stok</p><p className="text-xs font-black text-primary">{item.stock} PCS</p></div></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingItem} onOpenChange={o => !o && setSelectedEditItem(null)}>
        <DialogContent className="max-w-2xl rounded-3xl overflow-hidden p-0 border-none shadow-2xl">
          <DialogHeader className="p-6 bg-primary text-white"><DialogTitle className="text-xl font-black">Edit Rincian Barang</DialogTitle><DialogDescription className="text-white/70">Sesuaikan rincian stok untuk {editingItem?.productName}</DialogDescription></DialogHeader>
          {editingItem && (
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto bg-slate-50/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bagian Nota & Identitas */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2"><History className="h-4 w-4 text-primary" /><h3 className="text-xs font-black uppercase">Informasi Nota</h3></div>
                  <div className="grid gap-3 p-4 bg-white rounded-2xl border shadow-sm">
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase">No Nota Beli</Label><Input value={editingItem.invoiceNo || ""} onChange={e => updateEditField('invoiceNo', e.target.value)} className="h-10 font-bold" /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Tanggal Nota</Label><Input type="date" value={editingItem.invoiceDate || ""} onChange={e => updateEditField('invoiceDate', e.target.value)} className="h-10" /></div>
                  </div>

                  <div className="flex items-center gap-2 mb-2 pt-2"><Shirt className="h-4 w-4 text-primary" /><h3 className="text-xs font-black uppercase">Identitas Barang</h3></div>
                  <div className="grid gap-3 p-4 bg-white rounded-2xl border shadow-sm">
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Merk</Label><Input value={editingItem.brand || ""} list="brand-recommendations" onChange={e => updateEditField('brand', e.target.value)} className="h-10 font-bold" /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Kategori</Label><Input value={editingItem.category || ""} list="category-recommendations" onChange={e => updateEditField('category', e.target.value)} className="h-10" /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Seri</Label><Input value={editingItem.series || ""} onChange={e => updateEditField('series', e.target.value)} className="h-10" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Size</Label><Input value={editingItem.size || ""} list="size-recommendations" onChange={e => updateEditField('size', e.target.value)} className="h-10 font-black text-center" /></div>
                      <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Warna</Label><Input value={editingItem.color || ""} list="color-recommendations" onChange={e => updateEditField('color', e.target.value)} className="h-10 text-xs" /></div>
                    </div>
                  </div>
                </div>

                {/* Bagian Finansial & Stok */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-2"><Calculator className="h-4 w-4 text-primary" /><h3 className="text-xs font-black uppercase">Harga & Stok</h3></div>
                  <div className="grid gap-3 p-4 bg-white rounded-2xl border shadow-sm">
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase">Harga Label</Label><Input type="number" value={editingItem.labelPrice || 0} onChange={e => updateEditField('labelPrice', e.target.value)} className="h-10 font-bold" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-emerald-600">% Beli</Label><Input type="number" value={editingItem.buyDiscount || 0} onChange={e => updateEditField('buyDiscount', e.target.value)} className="h-10 font-bold border-emerald-200" /></div>
                      <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-primary">Harga Beli</Label><Input type="number" value={editingItem.buyPrice || 0} onChange={e => updateEditField('buyPrice', e.target.value)} className="h-10 font-black border-primary/20 text-primary" /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-accent">Harga Jual</Label><Input type="number" value={editingItem.price || 0} onChange={e => updateEditField('price', e.target.value)} className="h-10 font-black border-accent/30" /></div>
                    <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-blue-600">Sisa Stok (QTY)</Label><Input type="number" value={editingItem.stock || 0} onChange={e => updateEditField('stock', e.target.value)} className="h-10 font-black border-blue-200 text-blue-700" /></div>
                  </div>

                  <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <div className="flex justify-center mb-4">
                      <div className="relative group w-24 aspect-[4/5] bg-muted rounded-xl border-2 border-dashed border-primary/20 flex items-center justify-center overflow-hidden">
                        {isUploading === 'edit' ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : editingItem.productImage ? <img src={editingItem.productImage} className="w-full h-full object-cover" /> : <Camera className="h-6 w-6 text-muted-foreground opacity-20" />}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"><Camera className="h-6 w-6 text-white" /></div>
                        <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed" disabled={!!isUploading} onChange={(e) => handleImageUpload(e)} />
                      </div>
                    </div>
                    <p className="text-[9px] text-center text-muted-foreground uppercase font-bold">Ganti Foto Barang (Opsional)</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="p-6 bg-white border-t"><Button className="w-full font-black h-14 rounded-2xl shadow-xl text-lg" disabled={!!isUploading} onClick={handleUpdateEdit}>SIMPAN PERUBAHAN DATA</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
