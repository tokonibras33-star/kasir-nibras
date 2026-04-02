
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
import { Search, Edit2, Trash2, Percent, Download, FileSpreadsheet, FileText, UserPlus, Settings2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, writeBatch, getDocs } from "firebase/firestore";

interface Member {
  id: string;
  name: string;
  phone: string;
  address: string;
  discount: number;
}

export default function MembersDatabasePage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isGlobalDiscountOpen, setIsGlobalDiscountOpen] = useState(false);
  const [globalDiscountValue, setGlobalDiscountValue] = useState("");

  const [newMember, setNewMember] = useState({
    name: "",
    phone: "",
    address: ""
  });

  const membersQuery = useMemoFirebase(() => collection(db, "members"), [db]);
  const { data: membersData } = useCollection<Member>(membersQuery);
  const members = membersData || [];

  const handleAddMember = () => {
    if (!newMember.name || !newMember.phone) {
      toast({ title: "Gagal", description: "Nama dan No. Telepon wajib diisi.", variant: "destructive" });
      return;
    }

    const memberId = `MBR-${Date.now().toString().slice(-6)}`;
    const memberData = {
      id: memberId,
      name: newMember.name,
      phone: newMember.phone,
      address: newMember.address,
      discount: 0 // Default 0, will be updated by global discount
    };

    setDocumentNonBlocking(doc(db, "members", memberId), memberData, { merge: true });
    setIsAddOpen(false);
    setNewMember({ name: "", phone: "", address: "" });
    toast({ title: "Berhasil", description: "Member baru telah didaftarkan." });
  };

  const handleUpdateMember = () => {
    if (!selectedMember) return;
    updateDocumentNonBlocking(doc(db, "members", selectedMember.id), { 
      name: selectedMember.name,
      phone: selectedMember.phone,
      address: selectedMember.address
    });
    setIsEditOpen(false);
    toast({ title: "Berhasil", description: "Data member telah diperbarui." });
  };

  const handleSetGlobalDiscount = async () => {
    const discount = parseInt(globalDiscountValue);
    if (isNaN(discount)) {
      toast({ title: "Gagal", description: "Masukkan angka diskon yang valid.", variant: "destructive" });
      return;
    }

    if (!confirm(`Terapkan diskon ${discount}% ke SELURUH member (${members.length} orang)?`)) return;

    try {
      // We use a manual loop here for reliability across large collections
      // but keep it non-blocking for UX
      members.forEach(m => {
        updateDocumentNonBlocking(doc(db, "members", m.id), { discount });
      });

      setIsGlobalDiscountOpen(false);
      setGlobalDiscountValue("");
      toast({ title: "Berhasil", description: `Diskon global ${discount}% telah diterapkan.` });
    } catch (err) {
      toast({ title: "Gagal", description: "Terjadi kesalahan saat memperbarui data.", variant: "destructive" });
    }
  };

  const handleDeleteMember = (id: string) => {
    if (confirm("Hapus member ini dari database?")) {
      deleteDocumentNonBlocking(doc(db, "members", id));
      toast({ title: "Terhapus", description: "Member telah dihapus." });
    }
  };

  const filtered = useMemo(() => {
    return members.filter(m => 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.phone.includes(searchTerm) ||
      m.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [members, searchTerm]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Database Member - Nibras House", 105, 10, { align: "center" });
    const tableData = filtered.map(m => [
      m.id,
      m.name,
      m.phone,
      m.address,
      `${m.discount}%`
    ]);
    (doc as any).autoTable({
      head: [['ID', 'Nama', 'Telepon', 'Alamat', 'Diskon']],
      body: tableData,
      startY: 20
    });
    doc.save("database-member.pdf");
  };

  const exportToExcel = () => {
    const headers = ["ID", "Nama", "Telepon", "Alamat", "Diskon"];
    const rows = filtered.map(m => [
      m.id,
      m.name,
      m.phone,
      m.address,
      m.discount
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "database-member.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Database Member</h1>
          <p className="text-muted-foreground text-sm">Kelola pelanggan setia dan pengaturan diskon mereka secara global.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setIsGlobalDiscountOpen(true)} className="h-10 font-bold border-primary text-primary hover:bg-primary/5">
            <Settings2 className="h-4 w-4 mr-2" /> Set Diskon Global
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10"><Download className="h-4 w-4 mr-2" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer">
                <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel (CSV)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2 text-rose-600" /> PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 font-bold shadow-lg shadow-primary/20">
                <UserPlus className="h-4 w-4 mr-2" /> Tambah Member
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-md">
              <DialogHeader>
                <DialogTitle>Daftarkan Member Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label>Nama Lengkap</Label>
                  <Input 
                    placeholder="Contoh: Siti Aminah" 
                    value={newMember.name} 
                    onChange={e => setNewMember({...newMember, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>No. Telepon</Label>
                  <Input 
                    placeholder="0812..." 
                    value={newMember.phone} 
                    onChange={e => setNewMember({...newMember, phone: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Alamat</Label>
                  <Input 
                    placeholder="Alamat lengkap..." 
                    value={newMember.address} 
                    onChange={e => setNewMember({...newMember, address: e.target.value})}
                  />
                </div>
                <div className="p-3 bg-muted/30 rounded-xl">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-tight">Informasi:</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Potongan diskon akan mengikuti kebijakan diskon global yang diatur oleh Admin.</p>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full font-black h-12 rounded-xl" onClick={handleAddMember}>SIMPAN DATA MEMBER</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="soft-shadow border-none">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari Nama, ID, atau No. HP..." 
              className="pl-10 h-10 bg-white" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>No. Member</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>No. Telepon</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead className="text-center">Potongan Diskon</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs font-bold text-primary">{m.id}</TableCell>
                  <TableCell className="font-bold">{m.name}</TableCell>
                  <TableCell className="text-sm">{m.phone}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{m.address}</TableCell>
                  <TableCell className="text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-black border border-emerald-100">
                      {m.discount}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        className="h-8 w-8 text-primary hover:bg-primary/10 rounded-md flex items-center justify-center"
                        onClick={() => { setSelectedMember(m); setIsEditOpen(true); }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-md flex items-center justify-center"
                        onClick={() => handleDeleteMember(m.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Tidak ditemukan member.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Global Discount Dialog */}
      <Dialog open={isGlobalDiscountOpen} onOpenChange={setIsGlobalDiscountOpen}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Percent className="h-5 w-5 text-primary" /> Atur Diskon Global</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Persentase Diskon Member (%)</Label>
              <Input 
                type="number"
                placeholder="Contoh: 10" 
                value={globalDiscountValue}
                onChange={e => setGlobalDiscountValue(e.target.value)}
                className="h-12 text-center text-lg font-black"
              />
              <p className="text-[10px] text-muted-foreground text-center mt-1">Nilai ini akan menggantikan diskon seluruh member yang ada saat ini.</p>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-black h-12 rounded-xl" onClick={handleSetGlobalDiscount}>TERAPKAN KE SEMUA MEMBER</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Nama</Label>
              <Input 
                value={selectedMember?.name || ""} 
                onChange={e => setSelectedMember(prev => prev ? {...prev, name: e.target.value} : null)}
              />
            </div>
            <div className="grid gap-2">
              <Label>No. Telepon</Label>
              <Input 
                value={selectedMember?.phone || ""} 
                onChange={e => setSelectedMember(prev => prev ? {...prev, phone: e.target.value} : null)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Alamat</Label>
              <Input 
                value={selectedMember?.address || ""} 
                onChange={e => setSelectedMember(prev => prev ? {...prev, address: e.target.value} : null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-black h-12 rounded-xl" onClick={handleUpdateMember}>SIMPAN PERUBAHAN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
