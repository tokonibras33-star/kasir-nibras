
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Save, RotateCcw, Download, FileText } from "lucide-react";
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

export default function StockOpnameTokoC() {
  const db = useFirestore();
  const { user } = useAuth();
  const storeId = "TOKO_C";
  const displayStoreName = "NHS GDM";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [opnameDate, setOpnameDate] = useState("");

  useEffect(() => { setOpnameDate(format(new Date(), "yyyy-MM-dd")); }, []);

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
<<<<<<< HEAD
    if (Object.keys(physicalCounts).length === 0) {
      toast({ title: "Informasi", description: "Tidak ada input fisik yang diisi." });
      return;
    }
=======
    if (Object.keys(physicalCounts).length === 0) return;
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
    if (!confirm(`Sesuaikan stok sistem ${displayStoreName} dengan hasil fisik?`)) return;

    products.forEach(p => {
      const updatedVariants = (p.variants || []).map((v: any) => {
        const physicalValue = physicalCounts[`${p.id}-${v.id}`];
        return (physicalValue !== undefined && physicalValue !== "") ? { ...v, stock: parseInt(physicalValue) } : v;
      });
<<<<<<< HEAD
      const hasChanges = (p.variants || []).some((v: any) => {
        const pValue = physicalCounts[`${p.id}-${v.id}`];
        return pValue !== undefined && pValue !== "" && parseInt(pValue) !== v.stock;
      });
      if (hasChanges) {
        updateDocumentNonBlocking(doc(db, "stores", storeId, "stock", p.id), { variants: updatedVariants });
      }
=======
      updateDocumentNonBlocking(doc(db, "stores", storeId, "stock", p.id), { variants: updatedVariants });
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
    });
    setPhysicalCounts({});
    toast({ title: "Berhasil", description: `Stok ${displayStoreName} telah disesuaikan.` });
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF({ orientation: 'landscape' });
    docPdf.text(`Opname ${displayStoreName} - Nibras House`, 148, 10, { align: "center" });
    docPdf.text(`Tanggal: ${opnameDate}`, 148, 16, { align: "center" });
    
    const tableData = flattenedVariants.map(item => {
      const physical = physicalCounts[item.compositeId] || "-";
      const physicalNum = physical !== "-" ? parseInt(physical) : null;
      const diff = physicalNum !== null ? physicalNum - item.stock : "-";
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
        physical,
        diff
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
<<<<<<< HEAD
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold tracking-tight text-neutral-950">Stock Opname: {displayStoreName}</h1>
          <p className="text-neutral-500 text-xs sm:text-sm">Audit inventaris harian/bulanan {displayStoreName}.</p>
        </div>
        <div className="grid grid-cols-3 sm:flex gap-1.5 sm:gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-full border-neutral-200 bg-white text-[10px] sm:text-xs font-bold"><Download className="h-3.5 w-3.5 mr-1 sm:mr-2" /> EXPORT</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer font-bold text-xs">PDF (Landscape)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => setPhysicalCounts({})} className="h-9 sm:h-10 px-2.5 sm:px-4 rounded-full border-neutral-200 bg-white text-[10px] sm:text-xs font-bold"><RotateCcw className="h-3.5 w-3.5 mr-1 sm:mr-2" /> RESET</Button>
          <Button size="sm" onClick={handleSyncStock} className="h-9 sm:h-10 px-2.5 sm:px-5 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white text-[10px] sm:text-xs font-bold shadow-lg transition-colors"><Save className="h-3.5 w-3.5 mr-1 sm:mr-2" /> <span className="hidden sm:inline">SINKRON STOK</span><span className="sm:hidden">SINKRON</span></Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4">
        <div className="space-y-1"><Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-1">Tanggal Pelaksanaan</Label><Input type="date" value={opnameDate} onChange={e => setOpnameDate(e.target.value)} className="h-9 sm:h-10 rounded-full bg-white border-neutral-200 shadow-sm font-bold text-xs sm:text-sm px-3.5 sm:px-4" /></div>
        <div className="space-y-1"><Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-1">Cari Produk</Label><div className="relative"><Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-400" /><Input placeholder="Cari nama, merk, seri..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 sm:pl-10 h-9 sm:h-10 rounded-full bg-white border-neutral-200 shadow-sm text-xs sm:text-sm" /></div></div>
      </div>
      <Card className="border border-neutral-200/70 shadow-sm bg-white overflow-hidden rounded-2xl sm:rounded-3xl">
        <CardContent className="p-0">
          {/* Mobile Compact Opname Cards (Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {flattenedVariants.length > 0 ? flattenedVariants.map((item, idx) => {
              const physicalValue = physicalCounts[item.compositeId];
              const physicalNum = physicalValue !== undefined && physicalValue !== "" ? parseInt(physicalValue) : null;
              const difference = physicalNum !== null ? physicalNum - item.stock : null;

              return (
                <div key={idx} className="p-3 space-y-2.5 hover:bg-[#F5F3F0]/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs uppercase leading-snug text-neutral-950 break-words">{item.productName}</p>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="text-[9px] font-bold uppercase text-neutral-600">{item.brand} • {item.category}</span>
                        {item.series && item.series !== "-" && <span className="text-[9px] text-neutral-400 uppercase">• {item.series}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="text-[9px] font-bold px-2 py-0 h-4 rounded-full bg-neutral-100 border-none text-neutral-800 uppercase">{item.size}</Badge>
                        <Badge variant="outline" className="text-[9px] font-bold px-2 py-0 h-4 rounded-full bg-neutral-100 border-none text-neutral-600 uppercase">{item.color}</Badge>
                        <span className="text-[9px] font-mono text-[#C82368] font-bold">{item.invoiceNo || "-"}</span>
                        {item.invoiceDate && <span className="text-[9px] text-neutral-400">({item.invoiceDate})</span>}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {difference === null ? (
                        <Badge variant="outline" className="text-[8px] rounded-full font-bold text-neutral-400 px-2">MENUNGGU</Badge>
                      ) : difference === 0 ? (
                        <Badge variant="secondary" className="text-[8px] rounded-full font-bold bg-emerald-50 text-emerald-700 border-none px-2">SESUAI</Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[8px] rounded-full font-bold px-2">SELISIH</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center bg-[#F5F3F0]/80 rounded-xl p-2">
                    <div className="text-center">
                      <p className="text-[8px] font-bold uppercase text-neutral-400">Sistem</p>
                      <p className="text-sm font-mono font-bold text-neutral-800">{item.stock}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-bold uppercase text-[#C82368] mb-0.5">Fisik</p>
                      <Input 
                        type="number" 
                        className="h-8 text-center text-xs font-bold rounded-full border border-neutral-300 focus-visible:border-[#C82368] shadow-none p-0 bg-white" 
                        placeholder="0"
                        value={physicalCounts[item.compositeId] || ""}
                        onChange={(e) => handlePhysicalInput(item.compositeId, e.target.value)}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] font-bold uppercase text-neutral-400">Selisih</p>
                      <p className={`text-sm font-bold ${difference === null ? "text-neutral-300" : difference === 0 ? "text-neutral-500" : difference > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {difference === null ? "-" : difference > 0 ? `+${difference}` : difference}
                      </p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-xs text-neutral-400 italic">Data inventaris kosong.</div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white border-none">
                <TableRow className="text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-950">
                  <TableHead className="pl-4 md:pl-6 text-white">Tgl Nota</TableHead>
                  <TableHead className="text-white">No Nota</TableHead>
                  <TableHead className="text-white">Nama Barang</TableHead>
                  <TableHead className="text-white">Merk</TableHead>
                  <TableHead className="text-white">Kat</TableHead>
                  <TableHead className="text-white">Seri</TableHead>
                  <TableHead className="text-white">Size</TableHead>
                  <TableHead className="text-white">Warna</TableHead>
                  <TableHead className="text-center text-white">Sistem</TableHead>
                  <TableHead className="text-center w-[100px] text-white">Fisik</TableHead>
                  <TableHead className="text-center text-white">Selisih</TableHead>
                  <TableHead className="text-right pr-4 md:pr-6 text-white">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedVariants.length > 0 ? flattenedVariants.map((item, idx) => {
                  const physicalValue = physicalCounts[item.compositeId];
                  const physicalNum = physicalValue !== undefined && physicalValue !== "" ? parseInt(physicalValue) : null;
                  const difference = physicalNum !== null ? physicalNum - item.stock : null;

                  return (
                    <TableRow key={idx} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 transition-colors text-[11px]">
                      <TableCell className="pl-4 md:pl-6 text-neutral-500">{item.invoiceDate || "-"}</TableCell>
                      <TableCell className="font-mono font-bold text-[#C82368]">{item.invoiceNo || "-"}</TableCell>
                      <TableCell className="font-bold uppercase min-w-[150px] text-neutral-950">{item.productName}</TableCell>
                      <TableCell className="uppercase font-medium">{item.brand}</TableCell>
                      <TableCell className="uppercase">{item.category}</TableCell>
                      <TableCell className="uppercase">{item.series}</TableCell>
                      <TableCell className="font-bold">{item.size}</TableCell>
                      <TableCell>{item.color}</TableCell>
                      <TableCell className="text-center font-mono font-bold text-neutral-600">{item.stock}</TableCell>
                      <TableCell className="text-center">
                        <Input 
                          type="number" 
                          className="h-8 text-center text-[11px] font-bold rounded-full border border-neutral-300 focus-visible:border-[#C82368] shadow-none p-0 bg-white" 
                          placeholder="0"
                          value={physicalCounts[item.compositeId] || ""} 
                          onChange={e => handlePhysicalInput(item.compositeId, e.target.value)} 
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {difference !== null ? (
                          <span className={`font-bold ${difference === 0 ? "text-neutral-500" : difference > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {difference > 0 ? `+${difference}` : difference}
                          </span>
                        ) : (
                          <span className="text-neutral-300">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4 md:pr-6">
                        {difference === null ? (
                          <Badge variant="outline" className="text-[9px] rounded-full font-bold text-neutral-400 px-2">MENUNGGU</Badge>
                        ) : difference === 0 ? (
                          <Badge variant="secondary" className="text-[9px] rounded-full font-bold bg-emerald-50 text-emerald-700 border-none px-2">SESUAI</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[9px] rounded-full font-bold px-2">SELISIH</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }) : (<TableRow><TableCell colSpan={12} className="h-48 text-center text-neutral-400 italic">Data inventaris kosong.</TableCell></TableRow>)}
=======
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-emerald-700 uppercase">Stock Opname: {displayStoreName}</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Audit inventaris harian/bulanan {displayStoreName}.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={exportToPDF} className="h-9 md:h-10 text-[10px] md:text-sm font-bold"><Download className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> PDF</Button>
          <Button size="sm" onClick={handleSyncStock} className="h-9 md:h-10 text-[10px] md:text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> SINKRON</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tanggal</Label><Input type="date" value={opnameDate} onChange={e => setOpnameDate(e.target.value)} className="h-10 rounded-xl bg-white border-none shadow-sm font-bold text-sm" /></div>
        <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cari</Label><Input placeholder="Cari nama, merk, seri..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-10 rounded-xl bg-white border-none shadow-sm text-sm" /></div>
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
                  <TableHead className="text-right pr-4 md:pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedVariants.length > 0 ? flattenedVariants.map((item, idx) => (
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
                        className="h-8 text-center text-[11px] font-black rounded-lg border-2 border-emerald-100 shadow-none p-0" 
                        value={physicalCounts[item.compositeId] || ""} 
                        onChange={e => handlePhysicalInput(item.compositeId, e.target.value)} 
                      />
                    </TableCell>
                    <TableCell className="text-right pr-4 md:pr-6">
                      <Badge variant="outline" className="text-[8px] font-black border-none bg-slate-100 px-1.5">
                        {physicalCounts[item.compositeId] ? "INPUT" : "MENUNGGU"}
                      </Badge>
                    </TableCell>
                  </TableRow>)) : (<TableRow><TableCell colSpan={11} className="h-48 text-center text-muted-foreground italic">Data inventaris kosong.</TableCell></TableRow>)}
>>>>>>> 483ed98603e36449be3c1a3929af0c70d5587b68
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
