
"use client";

import { useState, useMemo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Plus, Search, Info, Trash2, Shirt, Download, FileSpreadsheet, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

/**
 * Helper to generate search tokens for POS Panel 1 search optimization
 */
const generateSearchTokens = (name: string, brand: string, category: string, series: string, variants: any[]) => {
  const tokens = new Set<string>();
  const add = (val: string) => {
    if (!val) return;
    val.toLowerCase().split(/[\s\-/]+/).forEach(t => {
      if (t && t.length > 0) tokens.add(t);
    });
  };
  add(name); add(brand); add(category); add(series);
  variants.forEach(v => { add(v.color); add(v.size); if (v.id) add(v.id); });
  return Array.from(tokens);
};

export function ProductsPage() {
  const db = useFirestore();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedProductDetails, setSelectedProductDetails] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    category: "Gamis",
    sellPrice: ""
  });

  const stockAQuery = useMemoFirebase(() => user ? collection(db, "stores", "TOKO_A", "stock") : null, [db, user]);
  const { data: stockAData } = useCollection<any>(stockAQuery);
  const stockA = stockAData || [];

  const stockBQuery = useMemoFirebase(() => user ? collection(db, "stores", "TOKO_B", "stock") : null, [db, user]);
  const { data: stockBData } = useCollection<any>(stockBQuery);
  const stockB = stockBData || [];

  const stockCQuery = useMemoFirebase(() => user ? collection(db, "stores", "TOKO_C", "stock") : null, [db, user]);
  const { data: stockCData } = useCollection<any>(stockCQuery);
  const stockC = stockCData || [];

  const allProducts = useMemo(() => {
    const combined = new Map();
    [...stockA, ...stockB, ...stockC].forEach(p => {
      const variants = p.variants || [];
      if (!combined.has(p.name)) {
        combined.set(p.name, {
          ...p,
          totalStock: variants.reduce((acc: number, v: any) => acc + (v.stock || 0), 0),
          minPrice: variants.length > 0 ? Math.min(...variants.map((v: any) => v.price || 0)) : 0,
        });
      } else {
        const existing = combined.get(p.name);
        existing.totalStock += variants.reduce((acc: number, v: any) => acc + (v.stock || 0), 0);
      }
    });
    return Array.from(combined.values());
  }, [stockA, stockB, stockC]);

  const handleAddProduct = () => {
    if (!formData.name || !formData.sellPrice) {
      toast({ title: "Gagal", description: "Mohon isi semua bidang.", variant: "destructive" });
      return;
    }

    const sellPrice = parseInt(formData.sellPrice);
    const productId = `P-${Date.now()}`;
    const initialVariants = [
      {
        id: `v-${Date.now()}`,
        color: "Default",
        size: "L",
        stock: 0,
        price: sellPrice
      }
    ];
    
    const newProductBase = {
      id: productId,
      name: formData.name,
      category: formData.category,
      image: `https://picsum.photos/seed/${formData.name.replace(/\s+/g, '-')}/400/500`,
      variants: initialVariants,
      searchTokens: generateSearchTokens(formData.name, "-", formData.category, "-", initialVariants)
    };

    // Daftarkan ke semua toko
    ["TOKO_A", "TOKO_B", "TOKO_C"].forEach(storeId => {
      setDocumentNonBlocking(doc(db, "stores", storeId, "stock", productId), newProductBase, { merge: true });
    });

    toast({ title: "Berhasil", description: "Produk ditambahkan ke katalog global (A, B, C)." });
    setIsAddOpen(false);
    setFormData({ name: "", category: "Gamis", sellPrice: "" });
  };

  const filteredProducts = useMemo(() => {
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allProducts]);

  const handleDeleteProduct = (productId: string) => {
    if (confirm("Hapus produk ini dari seluruh katalog toko?")) {
      ["TOKO_A", "TOKO_B", "TOKO_C"].forEach(storeId => {
        deleteDocumentNonBlocking(doc(db, "stores", storeId, "stock", productId));
      });
      toast({ title: "Berhasil", description: "Produk dihapus dari seluruh toko." });
    }
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text("Katalog Produk Global - Nibras House", 105, 10, { align: "center" });
    const tableData = filteredProducts.map(p => [p.id, p.name, p.category, `Rp ${p.minPrice.toLocaleString('id-ID')}`, p.totalStock]);
    (docPdf as any).autoTable({ head: [['ID', 'Nama Produk', 'Kategori', 'Harga Jual', 'Total Stok']], body: tableData, startY: 20 });
    docPdf.save("katalog-produk.pdf");
  };

  const exportToExcel = () => {
    const headers = ["ID", "Nama Produk", "Kategori", "Harga Jual", "Total Stok"];
    const rows = filteredProducts.map(p => [p.id, p.name, p.category, p.minPrice, p.totalStock]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Katalog");
    XLSX.writeFile(wb, "katalog-produk.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-foreground">Katalog Produk Global</h1><p className="text-muted-foreground text-sm">Manajemen master data produk (Toko A, B, dan C).</p></div>
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="outline" className="h-9"><Download className="h-4 w-4 mr-2" /> Export</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">Excel</DropdownMenuItem><DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">PDF</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild><Button className="font-bold shadow-lg shadow-primary/20 h-9"><Plus className="h-4 w-4 mr-2" /> Tambah Produk</Button></DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader><DialogTitle>Registrasi Produk Baru</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4"><div className="grid gap-2"><Label>Nama Produk</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div><div className="grid gap-2"><Label>Kategori</Label><Select value={formData.category} onValueChange={v => setFormData({...formData, category: v})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Gamis", "Koko", "Kerudung", "Bawahan", "Atasan", "Anak"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-2"><Label>Harga Jual Dasar</Label><Input type="number" value={formData.sellPrice} onChange={e => setFormData({...formData, sellPrice: e.target.value})} /></div></div>
              <DialogFooter><Button className="w-full font-black" onClick={handleAddProduct}>DAFTARKAN PRODUK</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="soft-shadow border-none overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Cari..." className="pl-10 bg-white" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto"><Table><TableHeader className="bg-muted/50"><TableRow><TableHead>Nama Produk</TableHead><TableHead>Kategori</TableHead><TableHead className="text-right">Harga (Min)</TableHead><TableHead className="text-center">Stok (A+B+C)</TableHead><TableHead className="text-right">Aksi</TableHead></TableRow></TableHeader><TableBody>{filteredProducts.map((product) => (<TableRow key={product.id} className="hover:bg-muted/30"><TableCell className="font-medium"><div className="flex items-center gap-3 cursor-pointer group" onClick={() => setSelectedProductDetails(product)}><div className="h-10 w-10 rounded-lg overflow-hidden bg-muted shrink-0"><img src={product.image} className="object-cover h-full w-full" /></div><div><p className="font-bold">{product.name}</p><p className="text-[10px] text-muted-foreground font-mono">ID: {product.id}</p></div></div></TableCell><TableCell><Badge variant="secondary" className="rounded-md font-normal text-[10px] uppercase">{product.category}</Badge></TableCell><TableCell className="text-right text-sm font-bold text-primary">Rp {product.minPrice?.toLocaleString('id-ID')}</TableCell><TableCell className="text-center font-bold">{product.totalStock}</TableCell><TableCell className="text-right"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => setSelectedProductDetails(product)}><Info className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteProduct(product.id)}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>))}</TableBody></Table></div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedProductDetails} onOpenChange={(o) => !o && setSelectedProductDetails(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 pb-0 flex flex-row items-center gap-6"><div className="h-24 w-24 rounded-2xl overflow-hidden bg-muted shrink-0"><img src={selectedProductDetails?.image} className="w-full h-full object-cover" /></div><div className="flex-1"><div className="text-primary font-black text-xs uppercase mb-1">{selectedProductDetails?.category}</div><DialogTitle className="text-2xl font-black leading-tight">{selectedProductDetails?.name}</DialogTitle></div></DialogHeader>
          <div className="p-8"><ScrollArea className="max-h-[300px] rounded-xl border"><Table><TableHeader className="bg-muted/50 sticky top-0"><TableRow><TableHead>Warna</TableHead><TableHead className="text-center">Ukuran</TableHead><TableHead className="text-right">Harga</TableHead></TableRow></TableHeader><TableBody>{selectedProductDetails?.variants?.map((v: any, i: number) => (<TableRow key={i}><TableCell className="font-bold">{v.color}</TableCell><TableCell className="text-center font-black">{v.size}</TableCell><TableCell className="text-right font-bold text-primary">Rp {v.price.toLocaleString('id-ID')}</TableCell></TableRow>))}</TableBody></Table></ScrollArea></div>
          <DialogFooter className="p-6 bg-muted/20"><Button variant="outline" className="w-full font-bold h-12 rounded-xl" onClick={() => setSelectedProductDetails(null)}>TUTUP</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductsPage;
