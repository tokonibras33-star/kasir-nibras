
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Save, RotateCcw, Download } from "lucide-react";
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

export default function StockOpnameTokoC() {
  const db = useFirestore();
  const storeId = "TOKO_C";
  const displayStoreName = "NHS GDM";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [opnameDate, setOpnameDate] = useState("");

  useEffect(() => { setOpnameDate(format(new Date(), "yyyy-MM-dd")); }, []);

  const stockQuery = useMemoFirebase(() => collection(db, "stores", storeId, "stock"), [db]);
  const { data: productsData } = useCollection<any>(stockQuery);
  const products = productsData || [];

  const flattenedVariants = useMemo(() => {
    return products.flatMap(p => (p.variants || []).map((v: any) => ({
        ...v, productId: p.id, productName: p.name, category: p.category, compositeId: `${p.id}-${v.id}`
      }))
    ).filter(v => v.productName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [products, searchTerm]);

  const handlePhysicalInput = (id: string, value: string) => {
    setPhysicalCounts(prev => ({ ...prev, [id]: value }));
  };

  const handleSyncStock = () => {
    if (Object.keys(physicalCounts).length === 0) return;
    if (!confirm(`Sesuaikan stok sistem ${displayStoreName} dengan hasil fisik?`)) return;

    products.forEach(p => {
      const updatedVariants = (p.variants || []).map((v: any) => {
        const physicalValue = physicalCounts[`${p.id}-${v.id}`];
        return (physicalValue !== undefined && physicalValue !== "") ? { ...v, stock: parseInt(physicalValue) } : v;
      });
      updateDocumentNonBlocking(doc(db, "stores", storeId, "stock", p.id), { variants: updatedVariants });
    });
    setPhysicalCounts({});
    toast({ title: "Berhasil", description: `Stok ${displayStoreName} telah disesuaikan.` });
  };

  const exportToPDF = () => {
    const docPdf = new jsPDF();
    docPdf.text(`Opname ${displayStoreName} - Nibras House`, 105, 10, { align: "center" });
    const tableData = flattenedVariants.map(item => {
      const physical = physicalCounts[item.compositeId] || "-";
      return [item.productName, `${item.color} | ${item.size}`, item.stock, physical];
    });
    (docPdf as any).autoTable({ head: [['Produk', 'Varian', 'Sistem', 'Fisik']], body: tableData, startY: 20 });
    docPdf.save(`opname-${displayStoreName.toLowerCase().replace(' ', '-')}-${opnameDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div><h1 className="text-2xl font-black text-emerald-700 uppercase">Stock Opname: {displayStoreName}</h1></div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" onClick={exportToPDF} className="h-9 md:h-10 text-[10px] md:text-sm font-bold"><Download className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> PDF</Button>
          <Button size="sm" onClick={handleSyncStock} className="h-9 md:h-10 text-[10px] md:text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> SINKRON</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tanggal</Label><Input type="date" value={opnameDate} onChange={e => setOpnameDate(e.target.value)} className="h-10 rounded-xl bg-white border-none shadow-sm font-bold text-sm" /></div>
        <div className="space-y-1"><Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cari</Label><Input placeholder="Cari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-10 rounded-xl bg-white border-none shadow-sm text-sm" /></div>
      </div>
      <Card className="soft-shadow border-none overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-none">
                <TableRow className="text-[10px] font-black uppercase">
                  <TableHead className="pl-4 md:pl-6">Produk & Varian</TableHead>
                  <TableHead className="text-center px-2">Sistem</TableHead>
                  <TableHead className="text-center w-[80px] md:w-[120px] px-2">Fisik</TableHead>
                  <TableHead className="text-right pr-4 md:pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedVariants.length > 0 ? flattenedVariants.map((item, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/20 border-b border-muted/50 transition-colors">
                    <TableCell className="pl-4 md:pl-6 py-2 md:py-4">
                      <p className="font-bold text-[11px] md:text-sm uppercase leading-tight">{item.productName}</p>
                      <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-black mt-0.5">{item.color} | {item.size}</p>
                    </TableCell>
                    <TableCell className="text-center px-2 font-mono font-bold text-[11px] md:text-sm text-slate-500">{item.stock}</TableCell>
                    <TableCell className="text-center px-2">
                      <Input 
                        type="number" 
                        className="h-8 md:h-9 text-center text-[11px] md:text-xs font-black rounded-lg border-2 border-emerald-100 shadow-none p-0" 
                        value={physicalCounts[item.compositeId] || ""} 
                        onChange={e => handlePhysicalInput(item.compositeId, e.target.value)} 
                      />
                    </TableCell>
                    <TableCell className="text-right pr-4 md:pr-6">
                      <Badge variant="outline" className="text-[8px] md:text-[10px] font-black border-none bg-slate-100 px-1.5 md:px-2">
                        {physicalCounts[item.compositeId] ? "INPUT" : "MENUNGGU"}
                      </Badge>
                    </TableCell>
                  </TableRow>)) : (<TableRow><TableCell colSpan={4} className="h-48 text-center text-muted-foreground italic">Data inventaris kosong.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
