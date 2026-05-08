"use client";

import { useState, useMemo, useRef } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Edit2, Trash2, Download, FileText, UserCheck, Upload, FileDown, FileSpreadsheet, CreditCard, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useUser, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { format } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface Reseller {
  id: string;
  name: string;
  phone: string;
  address: string;
  discount: number;
  registrationDate: string;
  branch: string;
}

const RESELLER_BRANCHES = ["R. KWT", "R. KWT 2", "R. GDM"];
const DEFAULT_CARD_BG = "https://res.cloudinary.com/dgsxujjb1/image/upload/v1778132431/KartuMember_IndahFashion_1_lun0a1.png";

export default function ResellerManagementPage() {
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [newReseller, setNewReseller] = useState({
    name: "",
    phone: "",
    address: "",
    branch: "R. KWT",
    registrationDate: format(new Date(), "yyyy-MM-dd")
  });

  const resellersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "resellers");
  }, [db, user]);
  
  const { data: resellersData } = useCollection<Reseller>(resellersQuery);
  const resellers = resellersData || [];

  const cardSettingsRef = useMemoFirebase(() => doc(db, "settings", "memberCard"), [db]);
  const { data: cardSettings } = useDoc<any>(cardSettingsRef);
  const currentCardBg = cardSettings?.backgroundUrl || DEFAULT_CARD_BG;

  const handleAddReseller = () => {
    if (!newReseller.name || !newReseller.phone) {
      toast({ title: "Gagal", description: "Nama dan No. Telepon wajib diisi.", variant: "destructive" });
      return;
    }
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const resellerId = `R-${randomNum}`;
    const resellerData = {
      id: resellerId,
      name: newReseller.name,
      phone: newReseller.phone,
      address: newReseller.address,
      branch: newReseller.branch,
      registrationDate: newReseller.registrationDate,
      discount: 0
    };
    setDocumentNonBlocking(doc(db, "resellers", resellerId), resellerData, { merge: true });
    setIsAddOpen(false);
    setNewReseller({ name: "", phone: "", address: "", branch: "R. KWT", registrationDate: format(new Date(), "yyyy-MM-dd") });
    toast({ title: "Berhasil", description: `Reseller baru terdaftar: ${resellerId}` });
  };

  const handleUpdateReseller = () => {
    if (!selectedReseller) return;
    updateDocumentNonBlocking(doc(db, "resellers", selectedReseller.id), { 
      name: selectedReseller.name,
      phone: selectedReseller.phone,
      address: selectedReseller.address,
      branch: selectedReseller.branch,
      registrationDate: selectedReseller.registrationDate
    });
    setIsEditOpen(false);
    toast({ title: "Berhasil", description: "Data reseller telah diperbarui." });
  };

  const handleDownloadCard = async () => {
    if (!selectedReseller) return;
    setIsPrinting(true);

    try {
      const scale = 3;
      const canvas = document.createElement("canvas");
      canvas.width = 1011 * scale;
      canvas.height = 569 * scale;
      canvas.style.width = "1011px";
      canvas.style.height = "569px";

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      ctx.scale(scale, scale);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = currentCardBg;

      img.onload = () => {
        // 1. Draw Background
        ctx.drawImage(img, 0, 0, 1011, 569);

        // 2. Setup Typography
        ctx.fillStyle = "#24345d";
        ctx.textBaseline = "middle";

        // 3. Draw Name (Bold, 24px)
        ctx.font = "bold 24px Arial, sans-serif";
        ctx.fillText((selectedReseller.name || "").toUpperCase(), 95, 397);

        // 4. Draw Address (Regular/Medium, 16px)
        ctx.font = "500 16px Arial, sans-serif";
        ctx.fillText((selectedReseller.address || "-").toUpperCase(), 95, 423);

        // 5. Draw ID (Semi-bold, 18px)
        ctx.font = "600 18px Arial, sans-serif";
        ctx.fillText(`ID. ${selectedReseller.id}`, 820, 418);

        // 6. Export to PNG
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `kartu-reseller-${selectedReseller.id}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        setIsPrinting(false);
        toast({ title: "Berhasil", description: "Kartu reseller telah diunduh." });
      };

      img.onerror = () => {
        setIsPrinting(false);
        toast({ title: "Gagal", description: "Terjadi kesalahan saat memproses gambar latar.", variant: "destructive" });
      };
    } catch (error) {
      setIsPrinting(false);
      toast({ title: "Gagal", description: "Terjadi kesalahan sistem saat render gambar.", variant: "destructive" });
    }
  };

  const handleDeleteReseller = (id: string) => {
    if (confirm("Hapus reseller ini dari database?")) {
      deleteDocumentNonBlocking(doc(db, "resellers", id));
      toast({ title: "Terhapus", description: "Reseller telah dihapus." });
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        const rows = json.slice(1);
        let successCount = 0;
        rows.forEach((row: any) => {
          if (row[3] && row[4]) {
            const resellerId = row[1] || `R-${Math.floor(100000 + Math.random() * 900000)}`;
            const resellerData = {
              registrationDate: row[0] || format(new Date(), "yyyy-MM-dd"),
              id: resellerId,
              branch: row[2] || "R. KWT",
              name: row[3],
              phone: String(row[4]),
              address: row[5] || "-",
              discount: 0
            };
            setDocumentNonBlocking(doc(db, "resellers", resellerId), resellerData, { merge: true });
            successCount++;
          }
        });
        toast({ title: "Import Selesai", description: `${successCount} data reseller telah ditambahkan.` });
      } catch (err) {
        toast({ title: "Gagal", description: "Format file tidak valid.", variant: "destructive" });
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const downloadFormat = () => {
    const headers = [['Tanggal Registrasi', 'ID / Nomor', 'Cabang', 'Nama', 'No Telepon', 'Alamat']];
    const ws = XLSX.utils.aoa_to_sheet(headers);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Format Import Reseller");
    XLSX.writeFile(wb, "format-import-reseller.xlsx");
  };

  const filtered = useMemo(() => {
    return resellers.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone.includes(searchTerm) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [resellers, searchTerm]);

  const exportToPDF = () => {
    const docPdf = new jsPDF({ orientation: 'landscape' });
    docPdf.text("Database Reseller - Nibras House", 148, 10, { align: "center" });
    const tableData = filtered.map(r => [r.registrationDate, r.id, r.branch, r.name, r.phone, r.address || "-"]);
    (docPdf as any).autoTable({ head: [['Tgl Daftar', 'ID Reseller', 'Cabang', 'Nama Reseller', 'No Telepon', 'Alamat']], body: tableData, startY: 20 });
    docPdf.save("database-reseller.pdf");
  };

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary uppercase">Reseller Diskon</h1>
          <p className="text-muted-foreground text-sm">Kelola mitra reseller per cabang toko.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 w-full sm:w-auto font-bold"><Upload className="h-4 w-4 mr-2" /> Import</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl w-48">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer font-bold py-2">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Unggah Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadFormat} className="cursor-pointer font-bold py-2">
                <FileDown className="h-4 w-4 mr-2 text-primary" /> Format Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={exportToPDF} className="h-10 font-bold"><Download className="h-4 w-4 mr-2" /> PDF</Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 w-full sm:w-auto font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                <UserCheck className="h-4 w-4 mr-2" /> Tambah Reseller
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-md border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase text-primary">Daftarkan Reseller Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tgl Pendaftaran</Label>
                    <Input 
                      type="date"
                      value={newReseller.registrationDate}
                      onChange={e => setNewReseller({...newReseller, registrationDate: e.target.value})}
                      className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cabang Reseller</Label>
                    <Select value={newReseller.branch} onValueChange={v => setNewReseller({...newReseller, branch: v})}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-black text-xs uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {RESELLER_BRANCHES.map(b => <SelectItem key={b} value={b} className="font-bold text-xs">{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nama Member Reseller</Label>
                  <Input placeholder="Nama Lengkap..." value={newReseller.name} onChange={e => setNewReseller({...newReseller, name: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">No. WhatsApp</Label>
                  <Input placeholder="0812..." value={newReseller.phone} onChange={e => setNewReseller({...newReseller, phone: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Alamat Lengkap</Label>
                  <Input placeholder="Masukkan alamat..." value={newReseller.address} onChange={e => setNewReseller({...newReseller, address: e.target.value})} className="h-12 rounded-xl bg-slate-50 border-none font-bold" />
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full font-black h-14 rounded-2xl shadow-xl shadow-primary/20 text-lg" onClick={handleAddReseller}>SIMPAN DATA RESELLER</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="soft-shadow border-none rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Cari Reseller..." className="pl-10 h-11 bg-white border-none shadow-sm rounded-xl" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50 border-none">
                <TableRow className="text-[10px] font-black uppercase">
                  <TableHead className="pl-6">Registrasi</TableHead>
                  <TableHead>ID Reseller</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Nama Member</TableHead>
                  <TableHead>No Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/20 transition-colors border-b border-muted/50 text-[11px]">
                    <TableCell className="pl-6 font-bold text-slate-400 uppercase">{r.registrationDate || "-"}</TableCell>
                    <TableCell className="font-mono font-black text-primary">{r.id}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary px-2">{r.branch || "-"}</Badge></TableCell>
                    <TableCell className="font-bold uppercase text-sm">{r.name}</TableCell>
                    <TableCell className="font-medium text-sm">{r.phone}</TableCell>
                    <TableCell className="text-slate-500 max-w-[150px] truncate">{r.address || "-"}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 rounded-xl" onClick={() => { setSelectedReseller(r); setIsCardPreviewOpen(true); }}><CreditCard className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-xl" onClick={() => { setSelectedReseller(r); setIsEditOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-xl" onClick={() => handleDeleteReseller(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic">Belum ada reseller terdaftar.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCardPreviewOpen} onOpenChange={setIsCardPreviewOpen}>
        <DialogContent className="w-screen h-screen max-w-none md:max-w-4xl md:h-auto rounded-none md:rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col">
          <DialogHeader className="p-4 md:p-8 bg-primary text-white shrink-0">
            <DialogTitle className="text-xl font-black uppercase">CETAK KARTU RESELLER</DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4 md:p-12 bg-slate-100 flex items-center justify-center overflow-auto min-h-0">
            <div className="w-full flex items-center justify-center overflow-visible px-2">
              <div className="scale-[0.22] sm:scale-[0.45] md:scale-[0.65]" style={{ width: "1011px", height: "569px", transformOrigin: "center center", flexShrink: 0, marginTop: "40px", marginBottom: "40px" }}>
                <div style={{ position: "relative", width: "1011px", height: "569px", overflow: "hidden", borderRadius: "40px", backgroundColor: "#ffffff" }}>
                  <img src={currentCardBg} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", left: "95px", bottom: "152px", width: "600px", zIndex: 20, fontFamily: "Arial, sans-serif", color: "#24345d", fontSize: "24px", fontWeight: 700, textTransform: "uppercase" }}>{selectedReseller?.name}</div>
                  <div style={{ position: "absolute", left: "95px", bottom: "132px", width: "580px", zIndex: 20, fontFamily: "Arial, sans-serif", color: "#24345d", fontSize: "16px", fontWeight: 500, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedReseller?.address || "-"}</div>
                  <div style={{ position: "absolute", right: "72px", bottom: "132px", zIndex: 20, fontFamily: "Arial, sans-serif", color: "#24345d", fontSize: "18px", fontWeight: 600 }}>ID. {selectedReseller?.id}</div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 p-4 md:p-6 bg-white border-t flex flex-col sm:flex-row gap-3 shrink-0">
            <Button variant="outline" className="w-full flex-1 h-12 rounded-xl font-bold" onClick={() => setIsCardPreviewOpen(false)}>BATAL</Button>
            <Button className="w-full flex-1 h-12 rounded-xl font-black shadow-lg shadow-primary/20" onClick={handleDownloadCard} disabled={isPrinting}>
              {isPrinting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              DOWNLOAD PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2rem] max-w-md border-none shadow-2xl overflow-hidden">
          <DialogHeader className="bg-primary p-6 text-white shrink-0"><DialogTitle className="text-xl font-black uppercase">Edit Data Reseller</DialogTitle></DialogHeader>
          <div className="p-8 space-y-4 bg-slate-50/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Tgl Pendaftaran</Label>
                <Input type="date" value={selectedReseller?.registrationDate || ""} onChange={e => setSelectedReseller(p => p ? {...p, registrationDate: e.target.value} : null)} className="h-11 rounded-xl bg-white border-none font-bold text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Cabang</Label>
                <Select value={selectedReseller?.branch} onValueChange={v => setSelectedReseller(p => p ? {...p, branch: v} : null)}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-none font-black text-xs uppercase"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{RESELLER_BRANCHES.map(b => <SelectItem key={b} value={b} className="font-bold text-xs">{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1">Nama Member Reseller</Label>
              <Input value={selectedReseller?.name || ""} onChange={e => setSelectedReseller(prev => prev ? {...prev, name: e.target.value} : null)} className="h-12 rounded-xl bg-white border-none font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1">No. WhatsApp</Label>
              <Input value={selectedReseller?.phone || ""} onChange={e => setSelectedReseller(prev => prev ? {...prev, phone: e.target.value} : null)} className="h-12 rounded-xl bg-white border-none font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1">Alamat</Label>
              <Input value={selectedReseller?.address || ""} onChange={e => setSelectedReseller(prev => prev ? {...prev, address: e.target.value} : null)} className="h-12 rounded-xl bg-white border-none font-bold" />
            </div>
          </div>
          <DialogFooter className="p-6 bg-white border-t"><Button className="w-full font-black h-12 rounded-xl shadow-xl" onClick={handleUpdateReseller}>SIMPAN PERUBAHAN</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
