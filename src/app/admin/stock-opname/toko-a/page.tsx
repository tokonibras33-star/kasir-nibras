
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Save, RotateCcw, Download, FileText, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

export default function StockOpnameTokoA() {
  const db = useFirestore();
  const { user } = useAuth();
  const storeId = "TOKO_A";
  const displayStoreName = "NHS KWT";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [opnameDate, setOpnameDate] = useState("");

  useEffect(() => {
    setOpnameDate(format(new Date(), "yyyy-MM-dd"));
  }, []);

  const stockQuery = useMemoFirebase(() => user ? collection(db, "stores", storeId, "stock") : null, [db, user]);
  const { data: productsData } = useCollection<any>(stockQuery);
  const products = productsData || [];

  const flattenedVariants = useMemo(() => {
    const list = products.flatMap(p => 
      (p.variants || []).map((v: any) => ({
        ...v,
        productId: p.id,
        productName: p.name,
        brand: p.brand || "-",
        category: p.category || "-",
        series: p.series || "-",
        compositeId: `${p.id}-${v.id}`
      }))
    );

    const tokens = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 0);

    return list.filter(v => {
      if (tokens.length === 0) return true;
      const searchableText = [
        v.productName, v.brand, v.category, v.series, v.color, v.size, v.invoiceNo || ""
      ].join(" ").toLowerCase();
      return tokens.every(token => searchableText.includes(token));
    });
  }, [products, searchTerm]);

  const handlePhysicalInput = (id: string, value: string) => {
    setPhysicalCounts(prev => ({ ...prev, [id]: value }));
  };

  const handleSyncStock = () => {
    if (Object.keys(physicalCounts).length === 0) {
      toast({ title: "Informasi", description: "Tidak ada input fisik yang diisi." });
      return;
    }

    if (!confirm(`Sesuaikan stok sistem dengan hasil input fisik ${displayStoreName}?`)) {
      return;
    }

    products.forEach(p => {
      const updatedVariants = (p.variants || []).map((v: any) => {
        const physicalValue = physicalCounts[`${p.id}-${v.id}`];
        if (physicalValue !== undefined && physicalValue !== "") {
          return { ...v, stock: parseInt(physicalValue) };
        }
        return v;
      });
      
      const hasChanges = (p.variants || []).some((v: any) => {
        const pValue = physicalCounts[`${p.id}-${v.id}`];
        return pValue !== undefined && pValue !== "" && parseInt(pValue) !== v.stock;
      });

      if (hasChanges) {
        updateDocumentNonBlocking(doc(db, "stores", storeId, "stock", p.id), { variants: updatedVariants });
      }
    });

    setPhysicalCounts({});
    toast({ title: "Berhasil", description: `Stok ${displayStoreName} telah disesuaikan.` });
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF({ orientation: 'landscape' });
    docPdf.text(`Laporan Stock Opname ${displayStoreName} - Nibras House`, 148, 10, { align: "center" });
    docPdf.text(`Tanggal: ${opnameDate}`, 148, 16, { align: "center" });
    
    const tableData = flattenedVariants.map(item => {
      const physicalValue = physicalCounts[item.compositeId];
      const physicalNum = physicalValue !== undefined && physicalValue !== "" ? parseInt(physicalValue) : "-";
      const difference = (typeof physicalNum === 'number') ? physicalNum - item.stock : "-";
      return [
        item.invoiceDate || "-",
        item.invoiceNo || "-",
        item.productName,
        item.brand,
        item.category,
        item.series,
        item.size,
        item.color,
        item.stock,
        physicalNum,
        difference
      ];
    });
    (docPdf as any).autoTable({
      head: [['Tgl Nota', 'No Nota', 'Produk', 'Merk', 'Kat', 'Seri', 'Size', 'Warna', 'Sistem', 'Fisik', 'Selisih']],
      body: tableData,
      startY: 25,
      styles: { fontSize: 7 }
    });
    docPdf.save(`opname-${displayStoreName.toLowerCase().replace(' ', '-')}-${opnameDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary uppercase">Stock Opname: {displayStoreName}</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Audit inventaris harian/bulanan {displayStoreName}.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 md:h-10 text-[10px] md:text-sm font-bold"><Download className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> EXPORT</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">PDF (Landscape)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => setPhysicalCounts({})} className="h-9 md:h-10 text-[10px] md:text-sm font-bold"><RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> RESET</Button>
          <Button size="sm" onClick={handleSyncStock} className="h-9 md:h-10 text-[10px] md:text-sm font-black shadow-lg shadow-primary/20"><Save className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> SINKRON STOK</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label className="text-[10px] md:text-xs font-black uppercase text-muted-foreground ml-1">Tanggal Pelaksanaan</Label>
          <Input type="date" className="h-10 md:h-11 rounded-xl bg-white border-none shadow-sm font-bold text-sm" value={opnameDate} onChange={(e) => setOpnameDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] md:text-xs font-black uppercase text-muted-foreground ml-1">Cari Produk</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari nama, merk, warna, no nota..." className="pl-10 h-10 md:h-11 rounded-xl bg-white border-none shadow-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <Card className="soft-shadow border-none overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-none">
                <TableRow className="text-[10px] font-black uppercase">
                  <TableHead className="pl-4 md:pl-6">Tgl Nota</TableHead>
                  <TableHead>No Nota</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Merk</TableHead>
                  <TableHead>Kat</TableHead>
                  <TableHead>Seri</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Warna</TableHead>
                  <TableHead className="text-center">Sistem</TableHead>
                  <TableHead className="text-center w-[100px]">Fisik</TableHead>
                  <TableHead className="text-center">Selisih</TableHead>
                  <TableHead className="text-right pr-4 md:pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedVariants.length > 0 ? flattenedVariants.map((item, idx) => {
                  const physicalValue = physicalCounts[item.compositeId];
                  const physicalNum = physicalValue !== undefined && physicalValue !== "" ? parseInt(physicalValue) : null;
                  const difference = physicalNum !== null ? physicalNum - item.stock : null;

                  return (
                    <TableRow key={idx} className="hover:bg-muted/20 border-b border-muted/50 transition-colors text-[11px]">
                      <TableCell className="pl-4 md:pl-6 text-muted-foreground">{item.invoiceDate || "-"}</TableCell>
                      <TableCell className="font-mono font-bold text-primary">{item.invoiceNo || "-"}</TableCell>
                      <TableCell className="font-bold uppercase min-w-[150px]">{item.productName}</TableCell>
                      <TableCell className="uppercase font-medium">{item.brand}</TableCell>
                      <TableCell className="uppercase">{item.category}</TableCell>
                      <TableCell className="uppercase">{item.series}</TableCell>
                      <TableCell className="font-black">{item.size}</TableCell>
                      <TableCell>{item.color}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-slate-500">{item.stock}</TableCell>
                      <TableCell className="text-center">
                        <Input 
                          type="number" 
                          className="h-8 text-center text-[11px] font-black rounded-lg border-2 border-primary/10 focus-visible:border-primary shadow-none p-0" 
                          placeholder="0"
                          value={physicalCounts[item.compositeId] || ""}
                          onChange={(e) => handlePhysicalInput(item.compositeId, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {difference !== null ? (
                          <span className={`font-black ${difference === 0 ? "text-muted-foreground" : difference > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {difference > 0 ? `+${difference}` : difference}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4 md:pr-6">
                        {difference === null ? (
                          <Badge variant="outline" className="text-[8px] font-normal opacity-50 px-1.5">MENUNGGU</Badge>
                        ) : difference === 0 ? (
                          <Badge variant="secondary" className="text-[8px] font-bold bg-emerald-50 text-emerald-700 border-none px-1.5">SESUAI</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[8px] font-black px-1.5">SELISIH</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow><TableCell colSpan={12} className="h-48 text-center text-muted-foreground italic">Belum ada data produk tersedia.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
