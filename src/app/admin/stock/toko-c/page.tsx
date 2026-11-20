"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Search, Trash2, ArrowRightLeft, FileSpreadsheet, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  updateDocumentNonBlocking,
  setDocumentNonBlocking
} from "@/firebase";
import { collection, doc } from "firebase/firestore";

export default function StockTokoCPage() {
  const db = useFirestore();
  const sourceStoreId = "TOKO_C";
  const sourceDisplayName = "NHS GDM";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isMigrateOpen, setIsMigrateOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [migrateQty, setMigrateQty] = useState("1");
  const [targetStoreId, setTargetStoreId] = useState("TOKO_A");

  // Load All Stores for migration logic
  const stockAQuery = useMemoFirebase(() => collection(db, "stores", "TOKO_A", "stock"), [db]);
  const { data: stockA } = useCollection<any>(stockAQuery);

  const stockBQuery = useMemoFirebase(() => collection(db, "stores", "TOKO_B", "stock"), [db]);
  const { data: stockB } = useCollection<any>(stockBQuery);

  const stockCQuery = useMemoFirebase(() => collection(db, "stores", "TOKO_C", "stock"), [db]);
  const { data: stockC } = useCollection<any>(stockCQuery);

  const currentProducts = stockC || [];

  const flattenedVariants = useMemo(() => {
    const list = currentProducts.flatMap(p => (p.variants || []).map((v: any) => ({
        ...v,
        productId: p.id,
        productName: p.name,
        category: p.category,
        brand: p.brand || "-",
        series: p.series || "-",
        fullProduct: p
      }))
    );

    const searchTokens = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    return list.filter(v => {
      if (searchTokens.length === 0) return true;
      const searchableText = [
        v.productName,
        v.brand,
        v.category,
        v.series,
        v.color,
        v.size,
        v.invoiceNo || ""
      ].join(" ").toLowerCase();
      return searchTokens.every(token => searchableText.includes(token));
    });
  }, [currentProducts, searchTerm]);

  const handleSetZero = (productId: string, variantId: string) => {
    const product = currentProducts.find(p => p.id === productId);
    if (product) {
      const updatedVariants = (product.variants || []).map((v: any) => 
        v.id === variantId ? { ...v, stock: 0 } : v
      );
      updateDocumentNonBlocking(doc(db, "stores", sourceStoreId, "stock", productId), { variants: updatedVariants });
      toast({ title: "Update", description: `Stok ${sourceDisplayName} diset ke 0.` });
    }
  };

  const handleMigrate = () => {
    const qty = parseInt(migrateQty);
    if (isNaN(qty) || qty <= 0 || qty > selectedVariant.stock) {
      toast({ title: "Gagal", description: "Jumlah tidak valid.", variant: "destructive" });
      return;
    }

    if (targetStoreId === sourceStoreId) {
      toast({ title: "Gagal", description: "Toko tujuan tidak boleh sama.", variant: "destructive" });
      return;
    }

    const sourceProduct = currentProducts.find(p => p.id === selectedVariant.productId);
    if (!sourceProduct) return;

    // 1. UPDATE SOURCE
    const updatedSourceVariants = sourceProduct.variants.map((v: any) => 
      v.id === selectedVariant.id ? { ...v, stock: v.stock - qty } : v
    );
    updateDocumentNonBlocking(doc(db, "stores", sourceStoreId, "stock", sourceProduct.id), { variants: updatedSourceVariants });

    // 2. UPDATE TARGET
    const targetStock = targetStoreId === "TOKO_A" ? (stockA || []) : (stockB || []);
    const existingInTarget = targetStock.find((p: any) => p.name.toUpperCase() === sourceProduct.name.toUpperCase());

    const variantToMove = { 
      ...selectedVariant, 
      stock: qty,
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` 
    };
    delete variantToMove.productId;
    delete variantToMove.productName;
    delete variantToMove.category;
    delete variantToMove.brand;
    delete variantToMove.series;
    delete variantToMove.fullProduct;

    if (existingInTarget) {
      const targetVariants = [...(existingInTarget.variants || [])];
      const vIdx = targetVariants.findIndex(v => v.color.toLowerCase() === selectedVariant.color.toLowerCase() && v.size === selectedVariant.size);
      
      if (vIdx > -1) {
        targetVariants[vIdx].stock += qty;
      } else {
        targetVariants.push(variantToMove);
      }
      updateDocumentNonBlocking(doc(db, "stores", targetStoreId, "stock", existingInTarget.id), { variants: targetVariants });
    } else {
      const newProductId = `P-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const newProductInTarget = {
        ...sourceProduct,
        id: newProductId,
        variants: [variantToMove]
      };
      setDocumentNonBlocking(doc(db, "stores", targetStoreId, "stock", newProductId), newProductInTarget, { merge: true });
    }
    
    setIsMigrateOpen(false);
    const targetDisplayName = targetStoreId === "TOKO_A" ? "NHS KWT" : "IND CO";
    toast({ title: "Berhasil", description: `${qty} unit dipindahkan ke ${targetDisplayName}.` });
  };

  const handleExportExcel = () => {
    const headers = ["Nama Barang", "Merk", "Warna", "Ukuran", "Stok", "Harga Jual"];
    const data = flattenedVariants.map(v => [
      v.productName,
      v.brand,
      v.color,
      v.size,
      v.stock,
      v.price
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok " + sourceDisplayName);
    XLSX.writeFile(wb, `stok-${sourceDisplayName.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
    toast({ title: "Excel Berhasil Diunduh" });
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text(`Laporan Stok ${sourceDisplayName} - Nibras House`, 105, 10, { align: "center" });
    const tableData = flattenedVariants.map(v => [
      v.productName,
      v.brand,
      v.color,
      v.size,
      v.stock,
      `Rp ${v.price.toLocaleString('id-ID')}`
    ]);
    (docPdf as any).autoTable({
      head: [['Nama Barang', 'Merk', 'Warna', 'Ukuran', 'Stok', 'Harga Jual']],
      body: tableData,
      startY: 20
    });
    docPdf.save(`stok-${sourceDisplayName.toLowerCase().replace(' ', '-')}.pdf`);
    toast({ title: "PDF Berhasil Diunduh" });
  };

  return (
<<<<<<< HEAD
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-tight text-neutral-950">Stok {sourceDisplayName}</h1>
          <p className="text-neutral-500 text-xs sm:text-sm">Monitoring inventaris real-time di Cabang {sourceDisplayName}.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportExcel} className="h-9 sm:h-10 rounded-full border-neutral-200 bg-white font-bold text-[11px] sm:text-xs flex-1 sm:flex-none"><FileSpreadsheet className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-emerald-600" /> Excel</Button>
          <Button variant="outline" onClick={exportToPDF} className="h-9 sm:h-10 rounded-full border-neutral-200 bg-white font-bold text-[11px] sm:text-xs flex-1 sm:flex-none"><FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-[#C82368]" /> PDF</Button>
=======
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-foreground">Stok {sourceDisplayName}</h1>
          <p className="text-muted-foreground text-sm">Monitoring inventaris real-time di Cabang {sourceDisplayName}.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportExcel} className="h-9"><FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel</Button>
          <Button variant="outline" onClick={exportToPDF} className="h-9"><FileText className="h-4 w-4 mr-2 text-rose-600" /> PDF</Button>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
        </div>
      </div>

      <div className="relative max-w-md">
<<<<<<< HEAD
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-400" />
        <Input placeholder="Cari Nama, Merk, Kategori, Warna, Size..." className="pl-9 sm:pl-10 h-9 sm:h-10 bg-white border-neutral-200 rounded-full shadow-sm text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <Card className="border border-neutral-200/70 shadow-sm bg-white overflow-hidden rounded-2xl sm:rounded-3xl">
        <CardContent className="p-0">
          {/* Mobile Compact List View (Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {flattenedVariants.length > 0 ? flattenedVariants.map((item, idx) => (
              <div key={idx} className="p-3 space-y-2 hover:bg-[#F5F3F0]/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs uppercase leading-snug text-neutral-950 break-words">{item.productName}</p>
                    <div className="flex flex-wrap items-center gap-1 mt-1">
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-800">{item.brand}</span>
                      <span className="text-[9px] text-neutral-500 uppercase font-bold">{item.category} • {item.series}</span>
                    </div>
                    <p className="text-[10px] text-neutral-500 uppercase mt-0.5">{item.color} / <span className="font-bold text-neutral-800">{item.size}</span></p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button 
                      variant="outline" size="icon" className="h-7 w-7 rounded-full border-neutral-200 text-neutral-700 hover:bg-[#C82368]/10 hover:text-[#C82368]"
                      onClick={() => { setSelectedVariant(item); setMigrateQty("1"); setIsMigrateOpen(true); }}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-rose-200 text-rose-600 hover:bg-rose-50" onClick={() => handleSetZero(item.productId, item.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                  <div>
                    <p className="text-[8px] font-bold uppercase text-neutral-400">Harga Jual</p>
                    <p className="text-xs font-bold text-[#C82368]">Rp {item.price.toLocaleString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-bold uppercase text-neutral-400 mb-0.5">Sisa Stok</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${item.stock <= 5 ? "bg-rose-100 text-rose-700" : "bg-neutral-950 text-white"}`}>
                      {item.stock} PCS
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-xs text-neutral-400 italic">Data kosong.</div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white">
                <TableRow className="hover:bg-neutral-950">
                  <TableHead className="text-white text-[10px] uppercase font-bold">Nama Barang</TableHead>
                  <TableHead className="text-white text-[10px] uppercase font-bold">Merk</TableHead>
                  <TableHead className="text-center text-white text-[10px] uppercase font-bold">Sisa Stok</TableHead>
                  <TableHead className="text-right text-white text-[10px] uppercase font-bold">Harga Jual</TableHead>
                  <TableHead className="text-right text-white text-[10px] uppercase font-bold">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{flattenedVariants.length > 0 ? flattenedVariants.map((item, idx) => (
                    <TableRow key={idx} className="hover:bg-[#F5F3F0]/60 transition-colors border-b border-neutral-100">
                      <TableCell className="font-medium text-sm">
                        <p className="font-bold text-neutral-950">{item.productName}</p>
                        <p className="text-[10px] text-neutral-500 uppercase font-bold">{item.category} | {item.series} • {item.color}/{item.size}</p>
                      </TableCell>
                      <TableCell className="text-xs font-bold uppercase text-neutral-700">{item.brand}</TableCell>
                      <TableCell className="text-center font-serif font-bold text-base">
                        <span className={item.stock <= 5 ? "text-rose-600" : "text-neutral-950"}>{item.stock}</span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-sm text-[#C82368]">Rp {item.price.toLocaleString('id-ID')}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button 
                            variant="ghost" size="icon" className="h-8 w-8 rounded-full text-neutral-700 hover:bg-[#C82368]/10 hover:text-[#C82368]"
                            onClick={() => { setSelectedVariant(item); setMigrateQty("1"); setIsMigrateOpen(true); }}
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-rose-600 hover:bg-rose-50" onClick={() => handleSetZero(item.productId, item.id)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>)) : (<TableRow><TableCell colSpan={5} className="h-32 text-center text-neutral-400 italic">Data kosong.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
=======
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari Nama, Merk, Kategori, Warna, Size..." className="pl-10 h-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <Card className="soft-shadow border-none overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50"><TableRow><TableHead>Nama Barang</TableHead><TableHead>Merk</TableHead><TableHead className="text-center">Stok</TableHead><TableHead className="text-right">Harga Jual</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader>
            <TableBody>{flattenedVariants.length > 0 ? flattenedVariants.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/20">
                    <TableCell className="font-medium text-sm"><b>{item.productName}</b></TableCell>
                    <TableCell className="text-xs uppercase">{item.brand}</TableCell>
                    <TableCell className="text-center font-black">{item.stock}</TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">Rp {item.price.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" size="icon" className="h-8 w-8 text-primary"
                          onClick={() => { setSelectedVariant(item); setMigrateQty("1"); setIsMigrateOpen(true); }}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleSetZero(item.productId, item.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>)) : (<TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">Data kosong.</TableCell></TableRow>)}
            </TableBody>
          </Table>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
        </CardContent>
      </Card>

      <Dialog open={isMigrateOpen} onOpenChange={setIsMigrateOpen}>
<<<<<<< HEAD
        <DialogContent className="max-w-md w-[95vw] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-neutral-950 text-white"><DialogTitle className="font-serif text-xl font-bold flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-[#C82368]" /> Migrasi Stok Cabang</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4 bg-[#F5F3F0]">
            <div className="bg-white border border-neutral-200/70 p-4 rounded-2xl space-y-1">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Barang Asal ({sourceDisplayName})</p>
              <p className="font-bold text-sm text-neutral-950">{selectedVariant?.productName}</p>
              <p className="text-xs font-medium text-[#C82368]">Sisa Stok: {selectedVariant?.stock} unit</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-neutral-600">Pilih Toko Tujuan</Label>
              <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                <SelectTrigger className="h-11 font-bold bg-white rounded-xl"><SelectValue /></SelectTrigger>
=======
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Migrasi Stok Cabang</DialogTitle></DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted/30 p-4 rounded-xl space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase">Barang Asal ({sourceDisplayName})</p>
              <p className="font-black text-sm">{selectedVariant?.productName}</p>
              <p className="text-xs font-medium">Sisa Stok: {selectedVariant?.stock} unit</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Pilih Toko Tujuan</Label>
              <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                <SelectTrigger className="h-11 font-bold"><SelectValue /></SelectTrigger>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
                <SelectContent>
                  <SelectItem value="TOKO_A">NHS KWT</SelectItem>
                  <SelectItem value="TOKO_B">IND CO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
<<<<<<< HEAD
              <Label className="text-xs font-bold uppercase text-neutral-600">Jumlah Pindah</Label>
              <Input type="number" value={migrateQty} onChange={e => setMigrateQty(e.target.value)} max={selectedVariant?.stock} min="1" className="h-11 font-bold text-lg bg-white rounded-xl" />
            </div>
          </div>
          <DialogFooter className="p-5 bg-white border-t"><Button className="w-full font-bold h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white transition-colors" onClick={handleMigrate}>KONFIRMASI PINDAH STOK</Button></DialogFooter>
=======
              <Label className="text-xs font-bold uppercase">Jumlah Pindah</Label>
              <Input type="number" value={migrateQty} onChange={e => setMigrateQty(e.target.value)} max={selectedVariant?.stock} min="1" className="h-11 font-bold" />
            </div>
          </div>
          <DialogFooter><Button className="w-full font-black h-12 rounded-xl" onClick={handleMigrate}>KONFIRMASI PINDAH STOK</Button></DialogFooter>
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
        </DialogContent>
      </Dialog>
    </div>
  );
}
