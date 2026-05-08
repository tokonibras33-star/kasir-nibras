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

export default function StockTokoAPage() {
  const db = useFirestore();
  const sourceStoreId = "TOKO_A";
  const sourceDisplayName = "NHS KWT";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isMigrateOpen, setIsMigrateOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [migrateQty, setMigrateQty] = useState("1");
  const [targetStoreId, setTargetStoreId] = useState("TOKO_B");

  // Load All Stores for migration logic
  const stockAQuery = useMemoFirebase(() => collection(db, "stores", "TOKO_A", "stock"), [db]);
  const { data: stockA } = useCollection<any>(stockAQuery);

  const stockBQuery = useMemoFirebase(() => collection(db, "stores", "TOKO_B", "stock"), [db]);
  const { data: stockB } = useCollection<any>(stockBQuery);

  const stockCQuery = useMemoFirebase(() => collection(db, "stores", "TOKO_C", "stock"), [db]);
  const { data: stockC } = useCollection<any>(stockCQuery);

  const currentProducts = stockA || [];

  const flattenedVariants = useMemo(() => {
    const list = currentProducts.flatMap(p => 
      (p.variants || []).map((v: any) => ({
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
      toast({ title: "Update", description: "Varian produk diset ke 0." });
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
    const targetStock = targetStoreId === "TOKO_B" ? (stockB || []) : (stockC || []);
    const existingInTarget = targetStock.find((p: any) => p.name.toUpperCase() === sourceProduct.name.toUpperCase());

    const variantToMove = { 
      ...selectedVariant, 
      stock: qty,
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` 
    };
    // Remove metadata fields that shouldn't be in the variant object itself
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
    const targetDisplayName = targetStoreId === "TOKO_B" ? "IND CO" : "NHS GDM";
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-foreground">Stok {sourceDisplayName}</h1>
          <p className="text-muted-foreground text-sm">Monitoring inventaris di Cabang {sourceDisplayName}.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportExcel} className="h-9"><FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel</Button>
          <Button variant="outline" onClick={exportToPDF} className="h-9"><FileText className="h-4 w-4 mr-2 text-rose-600" /> PDF</Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari Nama, Merk, Kategori, Warna, Size..." className="pl-10 h-10 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <Card className="soft-shadow border-none overflow-hidden">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Merk</TableHead>
                  <TableHead className="text-center">Sisa Stok</TableHead>
                  <TableHead className="text-right">Harga Jual</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedVariants.length > 0 ? flattenedVariants.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/20 transition-colors">
                    <TableCell className="font-medium text-sm">
                      <p className="font-bold">{item.productName}</p>
                      <p className="text-[10px] text-muted-foreground uppercase font-black">{item.category} | {item.series}</p>
                    </TableCell>
                    <TableCell className="text-xs font-bold uppercase">{item.brand}</TableCell>
                    <TableCell className="text-center font-black text-sm">
                      <span className={item.stock <= 5 ? "text-destructive" : "text-primary"}>{item.stock}</span>
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm">
                      Rp {item.price.toLocaleString('id-ID')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-primary hover:bg-primary/10"
                          onClick={() => { 
                            setSelectedVariant(item); 
                            setMigrateQty("1");
                            setIsMigrateOpen(true); 
                          }}
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => handleSetZero(item.productId, item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">Belum ada data barang terdaftar.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isMigrateOpen} onOpenChange={setIsMigrateOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5" /> Migrasi Stok Cabang</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted/30 p-4 rounded-xl space-y-1">
              <p className="text-xs font-bold text-muted-foreground uppercase">Barang Asal ({sourceDisplayName})</p>
              <p className="font-black text-sm">{selectedVariant?.productName}</p>
              <p className="text-xs font-medium">Sisa Stok Sekarang: {selectedVariant?.stock} unit</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Pilih Toko Tujuan</Label>
              <Select value={targetStoreId} onValueChange={setTargetStoreId}>
                <SelectTrigger className="h-11 font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TOKO_B">IND CO</SelectItem>
                  <SelectItem value="TOKO_C">NHS GDM</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase">Jumlah Pindah</Label>
              <Input 
                type="number" 
                value={migrateQty} 
                onChange={e => setMigrateQty(e.target.value)} 
                max={selectedVariant?.stock} 
                min="1" 
                className="h-11 font-bold text-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-black h-12 rounded-xl" onClick={handleMigrate}>KONFIRMASI PINDAH STOK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
