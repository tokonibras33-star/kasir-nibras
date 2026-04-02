
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
import { Search, Edit2, Trash2, Percent, Download, FileSpreadsheet, FileText, UserPlus, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";

interface Agent {
  id: string; // No Agen
  name: string; // Nama Agen
  phone: string; // No Telepon
  discount: number; // Potongan Diskon (%)
}

export default function AgentsManagementPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const [newAgent, setNewAgent] = useState({
    id: "",
    name: "",
    phone: "",
    discount: "0"
  });

  const agentsQuery = useMemoFirebase(() => collection(db, "agents"), [db]);
  const { data: agentsData } = useCollection<Agent>(agentsQuery);
  const agents = agentsData || [];

  const handleAddAgent = () => {
    if (!newAgent.id || !newAgent.name || !newAgent.phone) {
      toast({ title: "Gagal", description: "Nomor, Nama, dan No. Telepon wajib diisi.", variant: "destructive" });
      return;
    }

    const agentData = {
      id: newAgent.id,
      name: newAgent.name,
      phone: newAgent.phone,
      discount: parseInt(newAgent.discount) || 0
    };

    setDocumentNonBlocking(doc(db, "agents", agentData.id), agentData, { merge: true });
    setIsAddOpen(false);
    setNewAgent({ id: "", name: "", phone: "", discount: "0" });
    toast({ title: "Berhasil", description: "Agen baru telah didaftarkan." });
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
    doc.text("Database Agen Diskon - Nibras House", 105, 10, { align: "center" });
    const tableData = filtered.map(a => [
      a.id,
      a.name,
      a.phone,
      `${a.discount}%`
    ]);
    (doc as any).autoTable({
      head: [['No Agen', 'Nama Agen', 'No Telepon', 'Diskon']],
      body: tableData,
      startY: 20
    });
    doc.save("database-agen.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Agen Diskon</h1>
          <p className="text-muted-foreground text-sm">Kelola mitra agen dan tingkat diskon khusus mereka.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={exportToPDF} className="h-10"><Download className="h-4 w-4 mr-2" /> PDF</Button>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button className="h-10 font-bold shadow-lg shadow-primary/20">
                <ShieldCheck className="h-4 w-4 mr-2" /> Tambah Agen
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl max-w-md">
              <DialogHeader>
                <DialogTitle>Daftarkan Agen Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid gap-2">
                  <Label>Nomor Agen (ID)</Label>
                  <Input 
                    placeholder="Contoh: AG-001" 
                    value={newAgent.id} 
                    onChange={e => setNewAgent({...newAgent, id: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Nama Lengkap Agen</Label>
                  <Input 
                    placeholder="Contoh: Ahmad Subarjo" 
                    value={newAgent.name} 
                    onChange={e => setNewAgent({...newAgent, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>No. Telepon</Label>
                  <Input 
                    placeholder="0812..." 
                    value={newAgent.phone} 
                    onChange={e => setNewAgent({...newAgent, phone: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Potongan Diskon (%)</Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number"
                      className="pl-10"
                      placeholder="0"
                      value={newAgent.discount} 
                      onChange={e => setNewAgent({...newAgent, discount: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button className="w-full font-black h-12 rounded-xl" onClick={handleAddAgent}>SIMPAN DATA AGEN</Button>
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
              placeholder="Cari Agen..." 
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
                <TableHead>No Agen</TableHead>
                <TableHead>Nama Agen</TableHead>
                <TableHead>No Telepon</TableHead>
                <TableHead className="text-center">Potongan Diskon</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs font-bold text-primary">{a.id}</TableCell>
                  <TableCell className="font-bold">{a.name}</TableCell>
                  <TableCell className="text-sm">{a.phone}</TableCell>
                  <TableCell className="text-center">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-black border border-blue-100">
                      {a.discount}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-primary"
                        onClick={() => { setSelectedAgent(a); setIsEditOpen(true); }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDeleteAgent(a.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Tidak ditemukan agen.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="rounded-3xl max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Data Agen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label>Nama Agen</Label>
              <Input 
                value={selectedAgent?.name || ""} 
                onChange={e => setSelectedAgent(prev => prev ? {...prev, name: e.target.value} : null)}
              />
            </div>
            <div className="grid gap-2">
              <Label>No. Telepon</Label>
              <Input 
                value={selectedAgent?.phone || ""} 
                onChange={e => setSelectedAgent(prev => prev ? {...prev, phone: e.target.value} : null)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Potongan Diskon (%)</Label>
              <div className="relative">
                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number"
                  className="pl-10"
                  value={selectedAgent?.discount || 0} 
                  onChange={e => setSelectedAgent(prev => prev ? {...prev, discount: parseInt(e.target.value) || 0} : null)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full font-black h-12 rounded-xl" onClick={handleUpdateAgent}>SIMPAN PERUBAHAN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
