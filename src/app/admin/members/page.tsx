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
import { Search, Edit2, Trash2, Percent, Download, FileText, UserPlus, Settings2, FileSpreadsheet, Upload, FileDown, CreditCard, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from 'xlsx';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useUser, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { format } from "date-fns";

interface Member {
  id: string;
  name: string;
  phone: string;
  address: string;
  discount: number;
  registrationDate: string;
  branch: string;
}

const MEMBER_BRANCHES = ["M. KWT", "M. KWT 2", "M. GDM"];
const DEFAULT_CARD_BG = "https://res.cloudinary.com/dgsxujjb1/image/upload/v1778132431/KartuMember_IndahFashion_1_lun0a1.png";

export default function MembersDatabasePage() {
  const db = useFirestore();
  const { user } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isCardPreviewOpen, setIsCardPreviewOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isGlobalDiscountOpen, setIsGlobalDiscountOpen] = useState(false);
  const [globalDiscountValue, setGlobalDiscountValue] = useState("");

  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    address: "",
    branch: "M. KWT",
    registrationDate: format(new Date(), "yyyy-MM-dd")
  });

  const membersQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "members");
  }, [db, user]);
  
  const { data: membersData } = useCollection<Member>(membersQuery);
  const members = membersData || [];

  const cardSettingsRef = useMemoFirebase(() => doc(db, "settings", "memberCard"), [db]);
  const { data: cardSettings } = useDoc<any>(cardSettingsRef);
  const currentCardBg = cardSettings?.backgroundUrl || DEFAULT_CARD_BG;

  const handleAddMember = () => {
    if (!newMember.name || !newMember.phone) {
      toast({ title: "Gagal", description: "Nama dan No. Telepon wajib diisi.", variant: "destructive" });
      return;
    }
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const memberId = `M-${randomNum}`;
    const memberData = {
      id: memberId,
      name: newMember.name,
      phone: newMember.phone,
      address: newMember.address,
      branch: newMember.branch,
      registrationDate: newMember.registrationDate,
      discount: 0
    };
    setDocumentNonBlocking(doc(db, "members", memberId), memberData, { merge: true });
    setIsAddOpen(false);
    setNewMember({ name: "", phone: "", address: "", branch: "M. KWT", registrationDate: format(new Date(), "yyyy-MM-dd") });
    toast({ title: "Berhasil", description: `Member baru telah didaftarkan: ${memberId}` });
  };

  const handleUpdateMember = () => {
    if (!selectedMember) return;
    updateDocumentNonBlocking(doc(db, "members", selectedMember.id), { 
      name: selectedMember.name,
      phone: selectedMember.phone,
      address: selectedMember.address,
      branch: selectedMember.branch,
      registrationDate: selectedMember.registrationDate
    });
    setIsEditOpen(false);
    toast({ title: "Berhasil", description: "Data member telah diperbarui." });
  };

  const handleSetGlobalDiscount = () => {
    const disc = parseFloat(globalDiscountValue);
    if (isNaN(disc)) {
      toast({ title: "Gagal", description: "Masukkan nilai diskon yang valid.", variant: "destructive" });
      return;
    }
    if (!confirm(`Terapkan diskon ${disc}% ke SELURUH member? Tindakan ini akan mengubah semua data member yang ada.`)) return;
    members.forEach(m => {
      updateDocumentNonBlocking(doc(db, "members", m.id), { discount: disc });
    });
    setIsGlobalDiscountOpen(false);
    setGlobalDiscountValue("");
    toast({ title: "Berhasil", description: `Diskon ${disc}% telah diterapkan ke ${members.length} member.` });
  };

  const handleDownloadCard = async () => {
    if (!selectedMember) return;
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
        ctx.fillText((selectedMember.name || "").toUpperCase(), 95, 397);

        // 4. Draw Address (Regular/Medium, 16px)
        ctx.font = "500 16px Arial, sans-serif";
        ctx.fillText((selectedMember.address || "-").toUpperCase(), 95, 423);

        // 5. Draw ID (Semi-bold, 18px)
        ctx.font = "600 18px Arial, sans-serif";
        ctx.fillText(`ID. ${selectedMember.id}`, 820, 418);

        // 6. Export to PNG
        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `kartu-member-${selectedMember.id}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        setIsPrinting(false);
        toast({ title: "Berhasil", description: "Kartu member telah diunduh." });
      };

      img.onerror = () => {
        setIsPrinting(false);
        toast({ title: "Gagal", description: "Gagal memuat gambar latar kartu.", variant: "destructive" });
      };

    } catch (error) {
      setIsPrinting(false);
      toast({ title: "Gagal", description: "Kesalahan sistem saat memproses gambar.", variant: "destructive" });
    }
  };

  const handleDeleteMember = (id: string) => {
    if (confirm("Hapus member ini dari database?")) {
      deleteDocumentNonBlocking(doc(db, "members", id));
      toast({ title: "Terhapus", description: "Member telah dihapus." });
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
            const memberId = row[1] || `M-${Math.floor(100000 + Math.random() * 900000)}`;
            const memberData = {
              registrationDate: row[0] || format(new Date(), "yyyy-MM-dd"),
              id: memberId,
              branch: row[2] || "M. KWT",
              name: row[3],
              phone: String(row[4]),
              address: row[5] || "-",
              discount: 0
            };
            setDocumentNonBlocking(doc(db, "members", memberId), memberData, { merge: true });
            successCount++;
          }
        });
        toast({ title: "Import Selesai", description: `${successCount} data member telah ditambahkan.` });
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
    XLSX.utils.book_append_sheet(wb, ws, "Format Import Member");
    XLSX.writeFile(wb, "format-import-member.xlsx");
  };

  const filtered = useMemo(() => {
    return members.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);

  const exportToPDF = () => {
    const docPdf = new jsPDF({ orientation: 'landscape' });
    docPdf.text("Database Member - Nibras House", 148, 10, { align: "center" });
    const tableData = filtered.map(m => [m.registrationDate, m.id, m.branch, m.name, m.phone, m.address || "-", `${m.discount}%`]);
    (docPdf as any).autoTable({ head: [['Tgl Daftar', 'ID Member', 'Cabang', 'Nama', 'Telepon', 'Alamat', 'Diskon']], body: tableData, startY: 20 });
    docPdf.save("database-member.pdf");
  };

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary uppercase">Database Member</h1>
          <p className="text-muted-foreground text-sm">Manajemen pelanggan setia per cabang.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setIsGlobalDiscountOpen(true)} className="h-10 font-bold border-primary text-primary hover:bg-primary/5">
            <Settings2 className="h-4 w-4 mr-2" /> Set Diskon Global
          </Button>

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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 font-bold"><Download className="h-4 w-4 mr-2" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer font-bold">
                <FileText className="h-4 w-4 mr-2 text-rose-600" /> PDF (Landscape)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 font-black shadow-lg shadow-primary/20 uppercase">
                <UserPlus className="h-4 w-4 mr-2" /> Tambah Member
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-md border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase text-primary">Daftarkan Member Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tgl Pendaftaran</Label>
                    <Input 
                      type="date"
                      value={newMember.registrationDate}
                      onChange={e => setNewMember({...newMember, registrationDate: e.target.value})}
                      className="h-11 rounded-xl bg-slate-50 border-none font-bold text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Cabang</Label>
                    <Select value={newMember.branch} onValueChange={v => setNewMember({...newMember, branch: v})}>
                      <SelectTrigger className="h-11 rounded-xl bg-slate-50 border-none font-black text-xs uppercase">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {MEMBER_BRANCHES.map(b => <SelectItem key={b} value={b} className="font-bold text-xs">{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nama Member</Label>
                  <Input 
                    placeholder="Nama Lengkap..." 
                    value={newMember.name} 
                    onChange={e => setNewMember({...newMember, name: e.target.value})}
                    className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">No. WhatsApp</Label>
                  <Input 
                    placeholder="0812..." 
                    value={newMember.phone} 
                    onChange={e => setNewMember({...newMember, phone: e.target.value})}
                    className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Alamat Lengkap</Label>
                  <Input 
                    placeholder="Masukkan alamat..." 
                    value={newMember.address} 
                    onChange={e => setNewMember({...newMember, address: e.target.value})}
                    className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full font-black h-14 rounded-2xl shadow-xl" onClick={handleAddMember}>SIMPAN DATA MEMBER</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="soft-shadow border-none rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari Member (Nama/ID/WA)..." 
              className="pl-10 h-11 bg-white border-none shadow-sm rounded-xl" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="text-[10px] font-black uppercase">
                  <TableHead className="pl-6">Registrasi</TableHead>
                  <TableHead>No. Member</TableHead>
                  <TableHead>Cabang</TableHead>
                  <TableHead>Nama Member</TableHead>
                  <TableHead>No Telepon</TableHead>
                  <TableHead>Alamat</TableHead>
                  <TableHead className="text-center">Diskon</TableHead>
                  <TableHead className="text-right pr-6">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((m) => (
                  <TableRow key={m.id} className="hover:bg-muted/20 transition-colors border-b border-muted/50">
                    <TableCell className="pl-6 text-[10px] font-bold text-slate-400 uppercase">{m.registrationDate || "-"}</TableCell>
                    <TableCell className="font-mono text-xs font-black text-primary">{m.id}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] font-black border-primary/20 text-primary px-2">{m.branch || "-"}</Badge></TableCell>
                    <TableCell className="font-bold text-sm uppercase">{m.name}</TableCell>
                    <TableCell className="text-sm font-medium">{m.phone}</TableCell>
                    <TableCell className="text-[11px] text-slate-500 max-w-[150px] truncate">{m.address || "-"}</TableCell>
                    <TableCell className="text-center">
                      <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-black border border-emerald-100">
                        {m.discount}%
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 rounded-xl"
                          onClick={() => { setSelectedMember(m); setIsCardPreviewOpen(true); }}
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-primary rounded-xl" onClick={() => { setSelectedMember(m); setIsEditOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive rounded-xl" onClick={() => handleDeleteMember(m.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground italic">Belum ada member terdaftar.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isCardPreviewOpen} onOpenChange={setIsCardPreviewOpen}>
        <DialogContent className="w-screen h-screen max-w-none md:max-w-4xl md:h-auto rounded-none md:rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl flex flex-col">
          <DialogHeader className="p-4 md:p-8 bg-primary text-white shrink-0">
            <DialogTitle className="text-xl font-black uppercase">CETAK KARTU MEMBER</DialogTitle>
          </DialogHeader>
          <div className="flex-1 p-4 md:p-12 bg-slate-100 flex items-center justify-center overflow-auto min-h-0">
            <div className="w-full flex items-center justify-center overflow-visible px-2">
              <div className="scale-[0.22] sm:scale-[0.45] md:scale-[0.65]" style={{ width: "1011px", height: "569px", transformOrigin: "center center", flexShrink: 0, marginTop: "40px", marginBottom: "40px" }}>
                <div style={{ position: "relative", width: "1011px", height: "569px", overflow: "hidden", borderRadius: "40px", backgroundColor: "#ffffff" }}>
                  <img src={currentCardBg} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", left: "95px", bottom: "152px", width: "600px", zIndex: 20, fontFamily: "Arial, sans-serif", color: "#24345d", fontSize: "24px", fontWeight: 700, textTransform: "uppercase" }}>{selectedMember?.name}</div>
                  <div style={{ position: "absolute", left: "95px", bottom: "132px", width: "580px", zIndex: 20, fontFamily: "Arial, sans-serif", color: "#24345d", fontSize: "16px", fontWeight: 500, textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedMember?.address || "-"}</div>
                  <div style={{ position: "absolute", right: "72px", bottom: "132px", zIndex: 20, fontFamily: "Arial, sans-serif", color: "#24345d", fontSize: "18px", fontWeight: 600 }}>ID. {selectedMember?.id}</div>
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

      <Dialog open={isGlobalDiscountOpen} onOpenChange={setIsGlobalDiscountOpen}>
        <DialogContent className="rounded-3xl max-sm border-none shadow-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2 uppercase font-black"><Percent className="h-5 w-5 text-primary" /> Atur Diskon Global</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase text-center text-slate-400">Persentase Diskon Member (%)</Label>
              <Input type="number" placeholder="10" value={globalDiscountValue} onChange={e => setGlobalDiscountValue(e.target.value)} className="h-16 text-center text-3xl font-black rounded-2xl bg-slate-50 border-none shadow-inner" />
            </div>
          </div>
          <DialogFooter><Button className="w-full font-black h-12 rounded-xl" onClick={handleSetGlobalDiscount}>TERAPKAN SEKARANG</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-[2rem] max-w-md border-none shadow-2xl overflow-hidden">
          <DialogHeader className="bg-primary p-6 text-white shrink-0"><DialogTitle className="text-xl font-black uppercase">Edit Profil Member</DialogTitle></DialogHeader>
          <div className="p-8 space-y-4 bg-slate-50/50">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Tgl Pendaftaran</Label>
                <Input type="date" value={selectedMember?.registrationDate || ""} onChange={e => setSelectedMember(p => p ? {...p, registrationDate: e.target.value} : null)} className="h-11 rounded-xl bg-white border-none font-bold text-xs" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase ml-1">Cabang</Label>
                <Select value={selectedMember?.branch} onValueChange={v => setSelectedMember(p => p ? {...p, branch: v} : null)}>
                  <SelectTrigger className="h-11 rounded-xl bg-white border-none font-black text-xs uppercase"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">{MEMBER_BRANCHES.map(b => <SelectItem key={b} value={b} className="font-bold text-xs">{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1">Nama Member</Label>
              <Input value={selectedMember?.name || ""} onChange={e => setSelectedMember(prev => prev ? {...prev, name: e.target.value} : null)} className="h-12 rounded-xl bg-white border-none font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1">No. WhatsApp</Label>
              <Input value={selectedMember?.phone || ""} onChange={e => setSelectedMember(prev => prev ? {...prev, phone: e.target.value} : null)} className="h-12 rounded-xl bg-white border-none font-bold" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1">Alamat</Label>
              <Input value={selectedMember?.address || ""} onChange={e => setSelectedMember(prev => prev ? {...prev, address: e.target.value} : null)} className="h-12 rounded-xl bg-white border-none font-bold" />
            </div>
          </div>
          <DialogFooter className="p-6 bg-white border-t"><Button className="w-full font-black h-12 rounded-xl" onClick={handleUpdateMember}>SIMPAN PERUBAHAN</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
