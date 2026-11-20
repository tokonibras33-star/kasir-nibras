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
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase";
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
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ code: "", discount: "" });

  const couponsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return collection(db, "coupons");
  }, [db, user]);
  
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
          <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-neutral-950">Kupon Diskon</h1>
          <p className="text-neutral-500 text-sm">Kelola kupon sekali pakai untuk promosi khusus.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="h-10 px-5 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-bold shadow-lg text-xs transition-colors w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Buat Kupon Baru
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md w-[95vw] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
            <DialogHeader className="p-6 bg-neutral-950 text-white">
              <DialogTitle className="font-serif text-xl font-bold">Buat Kupon Diskon</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 p-6 bg-[#F5F3F0]">
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase text-neutral-600">Nomor / Kode Kupon</Label>
                <Input 
                  placeholder="CONTOH: PROMO10" 
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="bg-white rounded-xl h-11 font-bold"
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs font-bold uppercase text-neutral-600">Potongan Diskon (%)</Label>
                <Input 
                  type="number"
                  placeholder="10"
                  value={formData.discount}
                  onChange={e => setFormData({...formData, discount: e.target.value})}
                  className="bg-white rounded-xl h-11 font-bold"
                />
              </div>
            </div>
            <DialogFooter className="p-5 bg-white border-t">
              <Button className="w-full font-bold h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white transition-colors" onClick={handleAddCoupon}>RILIS KUPON</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border border-neutral-200/70 shadow-sm bg-white rounded-2xl sm:rounded-3xl overflow-hidden">
        <CardHeader className="p-3.5 sm:p-5 border-b border-neutral-200/60 bg-[#F5F3F0]/50">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-neutral-400" />
            <Input 
              placeholder="Cari kode kupon..." 
              className="pl-9 sm:pl-10 h-9 sm:h-10 bg-white border-neutral-200 rounded-full text-xs" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile Compact Cards (Zero Horizontal Scroll) */}
          <div className="md:hidden divide-y divide-neutral-100">
            {filtered.length > 0 ? filtered.map((c) => (
              <div key={c.id} className="p-3 flex items-center justify-between gap-2 hover:bg-[#F5F3F0]/50 transition-colors">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-[#C82368]">{c.code}</span>
                    <span className="bg-neutral-950 text-white px-2 py-0.5 rounded-full text-[9px] font-bold">{c.discount}%</span>
                    {c.isUsed ? (
                      <Badge variant="outline" className="rounded-full text-rose-600 border-rose-200 bg-rose-50 gap-1 font-bold text-[8px] px-2 py-0 h-4">
                        <XCircle className="h-2.5 w-2.5" /> Terpakai
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full text-emerald-700 border-emerald-200 bg-emerald-50 gap-1 font-bold text-[8px] px-2 py-0 h-4">
                        <CheckCircle2 className="h-2.5 w-2.5" /> Aktif
                      </Badge>
                    )}
                  </div>
                  <p className="text-[9px] text-neutral-400 mt-1">{c.createdAt?.toDate?.()?.toLocaleString('id-ID') || "Baru"}</p>
                </div>
                <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 shrink-0" onClick={() => handleDeleteCoupon(c.id!)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )) : (
              <div className="p-8 text-center text-xs text-neutral-400 italic">Belum ada kupon diskon.</div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block w-full overflow-x-auto">
            <Table>
              <TableHeader className="bg-neutral-950 text-white">
                <TableRow className="text-[10px] font-bold uppercase tracking-wider hover:bg-neutral-950">
                  <TableHead className="text-white">Kode Kupon</TableHead>
                  <TableHead className="text-white">Potongan</TableHead>
                  <TableHead className="text-white">Status</TableHead>
                  <TableHead className="text-white">Dibuat Pada</TableHead>
                  <TableHead className="text-right text-white">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length > 0 ? filtered.map((c) => (
                  <TableRow key={c.id} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100">
                    <TableCell className="font-mono font-bold text-[#C82368]">{c.code}</TableCell>
                    <TableCell className="font-bold text-neutral-950">{c.discount}%</TableCell>
                    <TableCell>
                      {c.isUsed ? (
                        <Badge variant="outline" className="rounded-full text-rose-600 border-rose-200 bg-rose-50 gap-1.5 font-bold">
                          <XCircle className="h-3 w-3" /> Terpakai
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="rounded-full text-emerald-700 border-emerald-200 bg-emerald-50 gap-1.5 font-bold">
                          <CheckCircle2 className="h-3 w-3" /> Aktif
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-neutral-500">
                      {c.createdAt?.toDate().toLocaleString('id-ID') || "Baru"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full text-rose-600 hover:bg-rose-50"
                        onClick={() => handleDeleteCoupon(c.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-neutral-400 italic">
                      Belum ada kupon diskon.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
