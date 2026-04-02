
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
import { Plus, Trash2, CheckCircle2, XCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, doc, serverTimestamp } from "firebase/firestore";

interface Coupon {
  id?: string;
  code: string;
  discount: number;
  isUsed: boolean;
  usedAt?: any;
  createdAt: any;
}

export default function CouponsManagementPage() {
  const db = useFirestore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ code: "", discount: "" });

  const couponsQuery = useMemoFirebase(() => collection(db, "coupons"), [db]);
  const { data: couponsData } = useCollection<Coupon>(couponsQuery);
  const coupons = couponsData || [];

  const handleAddCoupon = () => {
    if (!formData.code || !formData.discount) {
      toast({ title: "Gagal", description: "Lengkapi kode dan diskon.", variant: "destructive" });
      return;
    }

    if (coupons.find(c => c.code.toUpperCase() === formData.code.toUpperCase())) {
      toast({ title: "Gagal", description: "Kode kupon sudah ada.", variant: "destructive" });
      return;
    }

    const couponId = `CPN-${Date.now()}`;
    const newCoupon = {
      code: formData.code.toUpperCase(),
      discount: parseInt(formData.discount),
      isUsed: false,
      createdAt: serverTimestamp()
    };

    setDocumentNonBlocking(doc(db, "coupons", couponId), newCoupon, { merge: true });
    setIsAddOpen(false);
    setFormData({ code: "", discount: "" });
    toast({ title: "Berhasil", description: "Kupon baru telah dibuat." });
  };

  const handleDeleteCoupon = (id: string) => {
    if (confirm("Hapus kupon ini?")) {
      deleteDocumentNonBlocking(doc(db, "coupons", id));
      toast({ title: "Berhasil", description: "Kupon telah dihapus." });
    }
  };

  const filtered = useMemo(() => {
    return coupons.filter(c => 
      c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [coupons, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight">Kupon Diskon</h1>
          <p className="text-muted-foreground text-sm">Kelola kupon sekali pakai untuk promosi khusus.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4 mr-2" /> Buat Kupon Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle>Buat Kupon Diskon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid gap-2">
                <Label>Nomor / Kode Kupon</Label>
                <Input 
                  placeholder="CONTOH: PROMO10" 
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                />
              </div>
              <div className="grid gap-2">
                <Label>Potongan Diskon (%)</Label>
                <Input 
                  type="number"
                  placeholder="10"
                  value={formData.discount}
                  onChange={e => setFormData({...formData, discount: e.target.value})}
                />
              </div>
            </div>
            <DialogFooter>
              <Button className="w-full font-black h-12 rounded-xl" onClick={handleAddCoupon}>RILIS KUPON</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="soft-shadow border-none">
        <CardHeader className="pb-4 border-b bg-muted/20">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari kode kupon..." 
              className="pl-10" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Kode Kupon</TableHead>
                <TableHead>Potongan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat Pada</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-bold text-primary">{c.code}</TableCell>
                  <TableCell className="font-black text-emerald-600">{c.discount}%</TableCell>
                  <TableCell>
                    {c.isUsed ? (
                      <Badge variant="outline" className="text-rose-600 border-rose-200 bg-rose-50 gap-1.5">
                        <XCircle className="h-3 w-3" /> Terpakai
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 gap-1.5">
                        <CheckCircle2 className="h-3 w-3" /> Aktif
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.createdAt?.toDate().toLocaleString('id-ID') || "Baru"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteCoupon(c.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    Belum ada kupon diskon.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
