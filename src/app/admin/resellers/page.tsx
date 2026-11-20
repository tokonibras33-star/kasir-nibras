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
          <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-neutral-950">Reseller Diskon</h1>
          <p className="text-neutral-500 text-sm">Kelola mitra reseller per cabang toko.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 rounded-full border-neutral-200 bg-white font-bold text-xs flex-1 sm:flex-none"><Upload className="h-4 w-4 mr-2" /> Import</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl w-48">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer font-bold py-2">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Unggah Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadFormat} className="cursor-pointer font-bold py-2">
                <FileDown className="h-4 w-4 mr-2 text-[#C82368]" /> Format Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" onClick={exportToPDF} className="h-10 rounded-full border-neutral-200 bg-white font-bold text-xs flex-1 sm:flex-none"><Download className="h-4 w-4 mr-2" /> PDF</Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 px-5 rounded-full w-full sm:w-auto font-bold bg-neutral-950 hover:bg-[#C82368] text-white shadow-lg text-xs transition-colors">
                <UserCheck className="h-4 w-4 mr-2" /> Tambah Reseller
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-md w-[95vw] p-0 overflow-hidden border-none shadow-2xl">
              <DialogHeader className="p-6 bg-neutral-950 text-white">
                <DialogTitle className="text-xl font-serif font-bold">Daftarkan Reseller Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 p-6 bg-[#F5F3F0]">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Tgl Pendaftaran</Label>
                    <Input 
                      type="date"
                      value={newReseller.registrationDate}
                      onChange={e => setNewReseller({...newReseller, registrationDate: e.target.value})}
                      className="h-11 rounded-xl bg-white border-neutral-200 font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Cabang Reseller</Label>
                    <Select value={newReseller.branch} onValueChange={v => setNewReseller({...newReseller, branch: v})}>
                      <SelectTrigger className="h-11 rounded-xl bg-white border-neutral-200 font-bold text-xs uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {RESELLER_BRANCHES.map(b => <SelectItem key={b} value={b} className="font-bold text-xs">{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Nama Member Reseller</Label>
                  <Input placeholder="Nama Lengkap..." value={newReseller.name} onChange={e => setNewReseller({...newReseller, name: e.target.value})} className="h-11 rounded-xl bg-white border-neutral-200 font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">No. WhatsApp</Label>
                  <Input placeholder="0812..." value={newReseller.phone} onChange={e => setNewReseller({...newReseller, phone: e.target.value})} className="h-11 rounded-xl bg-white border-neutral-200 font-bold" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase text-neutral-500 ml-1">Alamat Lengkap</Label>
                  <Input placeholder="Masukkan alamat..." value={newReseller.address} onChange={e => setNewReseller({...newReseller, address: e.target.value})} className="h-11 rounded-xl bg-white border-neutral-200 font-bold" />
                </div>
              </div>
              <DialogFooter className="p-5 bg-white border-t">
                <Button className="w-full font-bold h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white shadow-lg transition-colors" onClick={handleAddReseller}>SIMPAN DATA RESELLER</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border border-neutral-200/70 shadow-sm bg-white rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-neutral-200/60 bg-[#F5F3F0]/50">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-400" />
            <Input placeholder="Cari Reseller..." className="pl-9 sm:pl-10 h-9 sm:h-10 bg-white border-neutral-200 shadow-sm rounded-full text-xs" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Compact Cards (Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {filtered.length > 0 ? filtered.map((r) => (
              <div key={r.id} className="p-3 space-y-1.5 hover:bg-[#F5F3F0]/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-[#C82368]">{r.id}</span>
                      <Badge variant="outline" className="text-[8px] font-bold border-neutral-300 text-neutral-950 rounded-full px-2 py-0 h-4">{r.branch || "-"}</Badge>
                    </div>
                    <p className="font-bold text-xs uppercase text-neutral-950 mt-1 break-words">{r.name}</p>
                    <p className="text-[10px] font-medium text-neutral-600">{r.phone || "-"} <span className="text-neutral-400">• {r.registrationDate || "-"}</span></p>
                    {r.address && <p className="text-[10px] text-neutral-400 mt-0.5 break-words">{r.address}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="outline" size="icon" className="h-7 w-7 text-neutral-700 hover:text-[#C82368] rounded-full border-neutral-200" onClick={() => { setSelectedReseller(r); setIsCardPreviewOpen(true); }}><CreditCard className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 text-neutral-950 rounded-full border-neutral-200" onClick={() => { setSelectedReseller(r); setIsEditOpen(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="outline" size="icon" className="h-7 w-7 text-rose-600 rounded-full border-rose-200" onClick={() => handleDeleteReseller(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-xs text-neutral-400 italic">Belum ada reseller terdaftar.</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white border-none">
                <TableRow className="text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-950">
                  <TableHead className="pl-6 text-white">Registrasi</TableHead>
                  <TableHead className="text-white">ID Reseller</TableHead>
                  <TableHead className="text-white">Cabang</TableHead>
                  <TableHead className="text-white">Nama Member</TableHead>
                  <TableHead className="text-white">No Telepon</TableHead>
                  <TableHead className="text-white">Alamat</TableHead>
                  <TableHead className="text-right pr-6 text-white">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((r) => (
                  <TableRow key={r.id} className="hover:bg-[#F5F3F0]/60 transition-colors border-b border-neutral-100 text-[11px]">
                    <TableCell className="pl-6 font-bold text-neutral-400 uppercase">{r.registrationDate || "-"}</TableCell>
                    <TableCell className="font-mono font-bold text-[#C82368]">{r.id}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] font-bold border-neutral-300 text-neutral-950 rounded-full px-2.5">{r.branch || "-"}</Badge></TableCell>
                    <TableCell className="font-bold uppercase text-sm text-neutral-950">{r.name}</TableCell>
                    <TableCell className="font-medium text-sm">{r.phone}</TableCell>
                    <TableCell className="text-neutral-500 max-w-[150px] truncate">{r.address || "-"}</TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-700 hover:text-[#C82368] rounded-full" onClick={() => { setSelectedReseller(r); setIsCardPreviewOpen(true); }}><CreditCard className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-neutral-950 rounded-full" onClick={() => { setSelectedReseller(r); setIsEditOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 rounded-full" onClick={() => handleDeleteReseller(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={7} className="h-32 text-center text-neutral-400 italic">Belum ada reseller terdaftar.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCardPreviewOpen} onOpenChange={setIsCardPreviewOpen}>
        <DialogContent className="w-screen h-screen max-w-none md:max-w-4xl md:h-auto rounded-none md:rounded-3xl p-0 overflow-hidden border-none shadow-2xl flex flex-col">
          <DialogHeader className="p-5 md:p-7 bg-neutral-950 text-white shrink-0">
            <DialogTitle className="text-xl font-serif font-bold">Cetak Kartu Reseller</DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4 md:p-12 bg-[#F5F3F0] flex items-center justify-center overflow-auto min-h-0">
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
            <Button variant="outline" className="w-full flex-1 h-12 rounded-full font-bold" onClick={() => setIsCardPreviewOpen(false)}>BATAL</Button>
            <Button className="w-full flex-1 h-12 rounded-full font-bold bg-neutral-950 hover:bg-[#C82368] text-white shadow-lg transition-colors" onClick={handleDownloadCard} disabled={isPrinting}>
              {isPrinting ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              DOWNLOAD PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-3xl max-w-md w-[95vw] border-none shadow-2xl overflow-hidden p-0">
          <DialogHeader className="bg-neutral-950 p-6 text-white shrink-0"><DialogTitle className="text-xl font-serif font-bold">Edit Data Reseller</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4 bg-[#F5F3F0]">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase ml-1">Tgl Pendaftaran</Label>
                <Input type="date" value={selectedReseller?.registrationDate || ""} onChange={e => setSelectedReseller(p => p ? {...p, registrationDate: e.target.value} : null)} className="h-11 rounded-xl bg-white border-neutral-200 font-bold text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase ml-1">Cabang</Label>
                <Select value={selectedReseller?.branch} onValueChange={v => setSelectedReseller(p => p ? {...p, branch: v} : null)}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-neutral-200 font-bold text-xs uppercase"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{RESELLER_BRANCHES.map(b => <SelectItem key={b} value={b} className="font-bold text-xs">{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase ml-1">Nama Member Reseller</Label>
              <Input value={selectedReseller?.name || ""} onChange={e => setSelectedReseller(prev => prev ? {...prev, name: e.target.value} : null)} className="h-11 rounded-xl bg-white border-neutral-200 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase ml-1">No. WhatsApp</Label>
              <Input value={selectedReseller?.phone || ""} onChange={e => setSelectedReseller(prev => prev ? {...prev, phone: e.target.value} : null)} className="h-11 rounded-xl bg-white border-neutral-200 font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase ml-1">Alamat</Label>
              <Input value={selectedReseller?.address || ""} onChange={e => setSelectedReseller(prev => prev ? {...prev, address: e.target.value} : null)} className="h-11 rounded-xl bg-white border-neutral-200 font-bold" />
            </div>
          </div>
          <DialogFooter className="p-5 bg-white border-t"><Button className="w-full font-bold h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white shadow-lg transition-colors" onClick={handleUpdateReseller}>SIMPAN PERUBAHAN</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
