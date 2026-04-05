
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
import { Search, Edit2, Trash2, Download, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";

interface Agent {
  id: string; // No Agen (AGNB-0001)
  name: string; // Nama Agen
  phone: string; // No Telepon
  address: string; // Alamat
  discount: number; // Diskon (tetap ada di data, tapi tidak diinput manual)
}

export default function AgentsManagementPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newAgent, setNewAgent] = useState({
    name: "",
    phone: "",
    address: ""
  });

  const agentsQuery = useMemoFirebase(() => collection(db, "agents"), [db]);
  const { data: agentsData } = useCollection<Agent>(agentsQuery);
  const agents = agentsData || [];

  const handleAddAgent = () => {
    if (!newAgent.name || !newAgent.phone) {
      toast({ title: "Gagal", description: "Nama dan No. Telepon wajib diisi.", variant: "destructive" });
      return;
    }

    // Generate Sequential ID: AGNB-0001
    const maxNum = agents.reduce((max, a) => {
      const num = parseInt(a.id.replace('AGNB-', ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const nextId = `AGNB-${(maxNum + 1).toString().padStart(4, '0')}`;

    const agentData = {
      id: nextId,
      name: newAgent.name,
      phone: newAgent.phone,
      address: newAgent.address,
      discount: 0 // Default 0
    };

    setDocumentNonBlocking(doc(db, "agents", agentData.id), agentData, { merge: true });
    setIsAddOpen(false);
    setNewAgent({ name: "", phone: "", address: "" });
    toast({ title: "Berhasil", description: `Agen baru terdaftar dengan ID: ${nextId}` });
  };

  const handleUpdateAgent = () => {
    if (!selectedAgent) return;
    updateDocumentNonBlocking(doc(db, "agents", selectedAgent.id), { ...selectedAgent });
    setIsEditOpen(false);
    toast({ title: "Berhasil", description: "Data agen telah diperbarui." });
  };

  const handleDeleteAgent = (id: string) => {
    if (confirm("Hapus agen ini dari database?")) {
      deleteDocumentNonBlocking(doc(db, "agents", id));
      toast({ title: "Terhapus", description: "Agen telah dihapus." });
    }
  };

  const filtered = useMemo(() => {
    return agents.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.phone.includes(searchTerm) ||
      a.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agents, searchTerm]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Database Agen - Nibras House", 105, 10, { align: "center" });
    const tableData = filtered.map(a => [
      a.id,
      a.name,
      a.phone,
      a.address || "-"
    ]);
    (doc as any).autoTable({
      head: [['ID Agen', 'Nama Agen', 'No Telepon', 'Alamat']],
      body: tableData,
      startY: 20
    });
    doc.save("database-agen.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-primary uppercase">Agen Diskon</h1>
          <p className="text-muted-foreground text-sm">Kelola mitra agen Nibras House.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportToPDF} className="h-10 font-bold"><Download className="h-4 w-4 mr-2" /> PDF</Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 font-black shadow-lg shadow-primary/20 uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4 mr-2" /> Tambah Agen
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-md border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-black uppercase text-primary">Daftarkan Agen Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nama Lengkap Agen</Label>
                  <Input 
                    placeholder="Contoh: Ahmad Subarjo" 
                    value={newAgent.name} 
                    onChange={e => setNewAgent({...newAgent, name: e.target.value})}
                    className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">No. WhatsApp</Label>
                  <Input 
                    placeholder="0812..." 
                    value={newAgent.phone} 
                    onChange={e => setNewAgent({...newAgent, phone: e.target.value})}
                    className="h-12 rounded-xl bg-slate-50 border-none font-bold"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Alamat Lengkap</Label>
                  <Textarea 
                    placeholder="Masukkan alamat..." 
                    value={newAgent.address} 
                    onChange={e => setNewAgent({...newAgent, address: e.target.value})}
                    className="rounded-xl bg-slate-50 border-none font-bold min-h-[100px]"
                  />
                </div>
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                  <p className="text-[10px] font-black text-primary uppercase">Info:</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium">Nomor Agen (ID) akan dibuat secara otomatis oleh sistem setelah data disimpan.</p>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full font-black h-14 rounded-2xl shadow-xl shadow-primary/20 text-lg" onClick={handleAddAgent}>SIMPAN DATA AGEN</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="soft-shadow border-none rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari Agen..." 
              className="pl-10 h-11 bg-white border-none shadow-sm rounded-xl" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50 border-none">
              <TableRow className="text-[10px] font-black uppercase">
                <TableHead className="pl-6">ID Agen</TableHead>
                <TableHead>Nama Agen</TableHead>
                <TableHead>No Telepon</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead className="text-right pr-6">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((a) => (
                <TableRow key={a.id} className="hover:bg-muted/20 transition-colors border-b border-muted/50">
                  <TableCell className="pl-6 font-mono text-xs font-black text-primary">{a.id}</TableCell>
                  <TableCell className="font-bold text-sm uppercase">{a.name}</TableCell>
                  <TableCell className="text-sm font-medium">{a.phone}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{a.address || "-"}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary rounded-xl hover:bg-primary/10"
                        onClick={() => { setSelectedAgent(a); setIsEditOpen(true); }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive rounded-xl hover:bg-destructive/10"
                        onClick={() => handleDeleteAgent(a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center text-muted-foreground italic">
                    Tidak ditemukan agen.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-3xl max-w-md border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase text-primary">Edit Data Agen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase ml-1">Nama Agen</Label>
              <Input 
                value={selectedAgent?.name || ""} 
                onChange={e => setSelectedAgent(prev => prev ? {...prev, name: e.target.value} : null)}
                className="h-12 rounded-xl bg-slate-50 border-none font-bold"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase ml-1">No. Telepon</Label>
              <Input 
                value={selectedAgent?.phone || ""} 
                onChange={e => setSelectedAgent(prev => prev ? {...prev, phone: e.target.value} : null)}
                className="h-12 rounded-xl bg-slate-50 border-none font-bold"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[10px] font-black uppercase ml-1">Alamat</Label>
              <Textarea 
                value={selectedAgent?.address || ""} 
                onChange={e => setSelectedAgent(prev => prev ? {...prev, address: e.target.value} : null)}
                className="rounded-xl bg-slate-50 border-none font-bold min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-black h-14 rounded-2xl shadow-xl shadow-primary/20 text-lg" onClick={handleUpdateAgent}>SIMPAN PERUBAHAN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
