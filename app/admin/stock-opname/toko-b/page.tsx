
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Save, RotateCcw, AlertCircle, Download, FileSpreadsheet, FileText, Calendar as CalendarIcon } from "lucide-react";
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

export default function StockOpnameTokoB() {
  const db = useFirestore();
  const storeId = "TOKO_B";
  const displayStoreName = "IND CO";
  
  const [searchTerm, setSearchTerm] = useState("");
  const [physicalCounts, setPhysicalCounts] = useState<Record<string, string>>({});
  const [opnameDate, setOpnameDate] = useState("");

  useEffect(() => {
    setOpnameDate(format(new Date(), "yyyy-MM-dd"));
  }, []);

  const stockQuery = useMemoFirebase(() => collection(db, "stores", storeId, "stock"), [db]);
  const { data: productsData } = useCollection<any>(stockQuery);
  const products = productsData || [];

  const flattenedVariants = useMemo(() => {
    return products.flatMap(p => 
      (p.variants || []).map((v: any) => ({
        ...v,
        productId: p.id,
        productName: p.name,
        category: p.category,
        compositeId: `${p.id}-${v.id}`
      }))
    ).filter(v => 
      v.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.color.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [products, searchTerm]);

  const handlePhysicalInput = (id: string, value: string) => {
    setPhysicalCounts(prev => ({ ...prev, [id]: value }));
  };

  const handleSyncStock = () => {
    if (Object.keys(physicalCounts).length === 0) {
      toast({ title: "Informasi", description: "Tidak ada input fisik yang diisi." });
      return;
    }

    if (!confirm(`Sesuaikan stok sistem ${displayStoreName} dengan hasil input fisik?`)) {
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
    const docPdf = new jsPDF();
    docPdf.text(`Laporan Stock Opname ${displayStoreName} - Nibras House`, 105, 10, { align: "center" });
    docPdf.text(`Tanggal: ${opnameDate}`, 105, 16, { align: "center" });

    const tableData = flattenedVariants.map(item => {
      const physicalValue = physicalCounts[item.compositeId];
      const physicalNum = physicalValue !== undefined && physicalValue !== "" ? parseInt(physicalValue) : "-";
      const difference = (typeof physicalNum === 'number') ? physicalNum - item.stock : "-";
      return [
        item.productName,
        `${item.color} | ${item.size}`,
        item.stock,
        physicalNum,
        difference
      ];
    });
    (docPdf as any).autoTable({
      head: [['Produk', 'Varian', 'Sistem', 'Fisik', 'Selisih']],
      body: tableData,
      startY: 25
    });
    docPdf.save(`opname-${displayStoreName.toLowerCase().replace(' ', '-')}-${opnameDate}.pdf`);
  };

  const exportToExcel = () => {
    const headers = ["Produk", "Varian", "Sistem", "Fisik", "Selisih"];
    const rows = flattenedVariants.map(item => {
      const physicalValue = physicalCounts[item.compositeId];
      const physicalNum = physicalValue !== undefined && physicalValue !== "" ? parseInt(physicalValue) : "";
      const difference = (typeof physicalNum === 'number') ? physicalNum - item.stock : "";
      return [item.productName, `${item.color} | ${item.size}`, item.stock, physicalNum, difference];
    });
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `opname-${displayStoreName.toLowerCase().replace(' ', '-')}-${opnameDate}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-blue-700 uppercase">Stock Opname: {displayStoreName}</h1>
          <p className="text-muted-foreground text-xs md:text-sm">Audit inventaris harian/bulanan {displayStoreName}.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 md:h-10 text-[10px] md:text-sm font-bold"><Download className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> EXPORT</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">Excel (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">PDF</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => setPhysicalCounts({})} className="h-9 md:h-10 text-[10px] md:text-sm font-bold"><RotateCcw className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> RESET</Button>
          <Button size="sm" onClick={handleSyncStock} className="h-9 md:h-10 text-[10px] md:text-sm font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"><Save className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" /> SINKRON STOK</Button>
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
            <Input placeholder="Cari nama produk..." className="pl-10 h-10 md:h-11 rounded-xl bg-white border-none shadow-sm text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </div>
      </div>

      <Card className="soft-shadow border-none overflow-hidden rounded-3xl">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-none">
                <TableRow className="text-[10px] md:text-[11px] font-black uppercase">
                  <TableHead className="pl-4 md:pl-6">Produk & Varian</TableHead>
                  <TableHead className="text-center px-2">Sistem</TableHead>
                  <TableHead className="text-center w-[80px] md:w-[120px] px-2">Fisik</TableHead>
                  <TableHead className="text-center px-2">Selisih</TableHead>
                  <TableHead className="text-right pr-4 md:pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flattenedVariants.length > 0 ? flattenedVariants.map((item, idx) => {
                  const physicalValue = physicalCounts[item.compositeId];
                  const physicalNum = physicalValue !== undefined && physicalValue !== "" ? parseInt(physicalValue) : null;
                  const difference = physicalNum !== null ? physicalNum - item.stock : null;

                  return (
                    <TableRow key={idx} className="hover:bg-muted/20 border-b border-muted/50 transition-colors">
                      <TableCell className="pl-4 md:pl-6 py-2 md:py-4">
                        <p className="font-bold text-[11px] md:text-sm uppercase leading-tight">{item.productName}</p>
                        <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase font-black mt-0.5">{item.color} | {item.size}</p>
                      </TableCell>
                      <TableCell className="text-center px-2 font-mono font-bold text-[11px] md:text-sm text-slate-500">{item.stock}</TableCell>
                      <TableCell className="text-center px-2">
                        <Input 
                          type="number" 
                          className="h-8 md:h-9 text-center text-[11px] md:text-xs font-black rounded-lg border-2 border-blue-100 focus-visible:border-blue-500 shadow-none p-0" 
                          placeholder="0"
                          value={physicalCounts[item.compositeId] || ""}
                          onChange={(e) => handlePhysicalInput(item.compositeId, e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-center px-2">
                        {difference !== null ? (
                          <span className={`font-black text-[11px] md:text-sm ${difference === 0 ? "text-muted-foreground" : difference > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                            {difference > 0 ? `+${difference}` : difference}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/30">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-4 md:pr-6">
                        {difference === null ? (
                          <Badge variant="outline" className="text-[8px] md:text-[10px] font-normal opacity-50 px-1.5 md:px-2">MENUNGGU</Badge>
                        ) : difference === 0 ? (
                          <Badge variant="secondary" className="text-[8px] md:text-[10px] font-bold bg-emerald-50 text-emerald-700 border-none px-1.5 md:px-2">SESUAI</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[8px] md:text-[10px] font-black px-1.5 md:px-2">SELISIH</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow><TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">Tidak ada data rincian untuk toko ini.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
