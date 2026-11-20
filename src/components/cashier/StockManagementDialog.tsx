'use client';

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  GitMerge, 
  Search, 
  ArrowRightLeft, 
  Loader2,
  X
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  useFirestore, 
  setDocumentNonBlocking, 
  updateDocumentNonBlocking,
  useCollection,
  useMemoFirebase,
  useUser
} from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

interface StockManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  cashierName: string;
  stockDialogProducts: any[];
  isStockLoading: boolean;
  outgoingMutations: any[]; 
  incomingMutations: any[]; 
  stockViewingStoreId: string;
  setStockViewingStoreId: (id: string) => void;
}

export function StockManagementDialog({
  open,
  onOpenChange,
  storeId,
  cashierName,
  stockDialogProducts,
  isStockLoading,
  stockViewingStoreId,
  setStockViewingStoreId
}: StockManagementDialogProps) {
  const db = useFirestore();
  const { user } = useUser();
  const [stockSearch, setStockSearch] = useState("");
  const [isMutationRequestOpen, setIsMutationRequestOpen] = useState(false);
  const [selectedVariantForMutation, setSelectedVariantForMutation] = useState<any>(null);
  const [mutationQty, setMutationQty] = useState("1");
  const [isProcessing, setIsProcessing] = useState(false);

  // Mutasi Saya (Pengajuan yang dibuat toko ini)
  // Only query when dialog is open and user is authenticated
  const myRequestsQuery = useMemoFirebase(() => {
    if (!open || !user) return null;
    return collection(db, "mutationRequests");
  }, [db, open, user]);
  
  const { data: allRequests } = useCollection<any>(myRequestsQuery);
  
  const statusPengajuan = (allRequests || []).filter(r => r.targetStore === storeId);
  const konfirmasiPenerimaan = (allRequests || []).filter(r => r.fromStore === storeId && r.status === "PENDING");

  const isViewingOwnStore = stockViewingStoreId === storeId;
  const isViewingAllStores = stockViewingStoreId === "ALL";

  const handleRequestMutation = () => {
    const qty = parseInt(mutationQty);
    if (isNaN(qty) || qty <= 0 || qty > selectedVariantForMutation.stock) return toast({ title: "Jumlah tidak valid", variant: "destructive" });
    const reqId = `MUT-${Date.now().toString().slice(-6)}`;
    const mutationData = { 
      id: reqId, 
      fromStore: selectedVariantForMutation.storeId, 
      targetStore: storeId, 
      productId: selectedVariantForMutation.productId, 
      variantId: selectedVariantForMutation.variantId, 
      productName: selectedVariantForMutation.baseName, 
      color: selectedVariantForMutation.color, 
      size: selectedVariantForMutation.size, 
      invoiceNo: selectedVariantForMutation.invoiceNo || "-", 
      quantity: qty, 
      status: "PENDING", 
      requestedAt: new Date().toISOString(), 
      requestedBy: cashierName 
    };
    setDocumentNonBlocking(doc(db, "mutationRequests", reqId), mutationData, { merge: true });
    setIsMutationRequestOpen(false); 
    toast({ title: "Mutasi Berhasil Diajukan" });
  };

  const handleApproveMutation = async (req: any) => {
    setIsProcessing(true);
    try {
      const sourceStoreRef = doc(db, "stores", req.fromStore, "stock", req.productId);
      const sourceSnap = await getDoc(sourceStoreRef);
      if (!sourceSnap.exists()) throw new Error("Produk asal tidak ditemukan");
      
      const sourceData = sourceSnap.data();
      const updatedSourceVariants = (sourceData.variants || []).map((v: any) => 
        v.id === req.variantId ? { ...v, stock: Math.max(0, v.stock - req.quantity) } : v
      );
      updateDocumentNonBlocking(sourceStoreRef, { variants: updatedSourceVariants });

      const targetQuery = query(collection(db, "stores", req.targetStore, "stock"), where("name", "==", req.productName.toUpperCase()));
      const targetSnap = await getDocs(targetQuery);
      
      const variantToTransfer = sourceData.variants.find((v: any) => v.id === req.variantId);
      const newTransferId = `v-trans-${Date.now()}`;

      if (!targetSnap.empty) {
        const targetDoc = targetSnap.docs[0];
        const targetVariants = [...(targetDoc.data().variants || [])];
        const vIdx = targetVariants.findIndex((v: any) => 
          v.color === req.color && 
          v.size === req.size && 
          v.invoiceNo === req.invoiceNo
        );

        if (vIdx > -1) {
          targetVariants[vIdx].stock += req.quantity;
        } else {
          targetVariants.push({ ...variantToTransfer, id: newTransferId, stock: req.quantity });
        }
        updateDocumentNonBlocking(doc(db, "stores", req.targetStore, "stock", targetDoc.id), { variants: targetVariants });
      } else {
        const newProduct = { 
          ...sourceData, 
          id: `P-${Date.now()}`, 
          variants: [{ ...variantToTransfer, id: newTransferId, stock: req.quantity }] 
        };
        setDocumentNonBlocking(doc(db, "stores", req.targetStore, "stock", newProduct.id), newProduct, { merge: true });
      }

      updateDocumentNonBlocking(doc(db, "mutationRequests", req.id), { status: "APPROVED", approvedAt: new Date().toISOString() });
      toast({ title: "Mutasi Berhasil Disetujui" });
    } catch (err) { 
      toast({ title: "Gagal Menyetujui Mutasi", variant: "destructive" }); 
    } finally { 
      setIsProcessing(false); 
    }
  };

  const flattened = (stockDialogProducts || []).flatMap(p => (p.variants || []).map((v: any) => ({ 
    ...v, 
    productId: p.id, 
    variantId: v.id, 
    baseName: p.name, 
    brand: p.brand || '-', 
    storeId: v.storeId || p.storeId || stockViewingStoreId 
  })));
  
  const filtered = flattened.filter(i => 
    !stockSearch || 
    i.baseName.toLowerCase().includes(stockSearch.toLowerCase()) || 
    i.brand.toLowerCase().includes(stockSearch.toLowerCase())
  ).sort((a, b) => (a.invoiceDate || '') < (b.invoiceDate || '') ? 1 : -1);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent aria-describedby={undefined} className="max-w-7xl w-[98vw] h-[92vh] p-0 flex flex-col rounded-[2.25rem] overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-6 md:p-7 bg-neutral-950 text-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="bg-[#C82368]/20 p-3 rounded-2xl border border-[#C82368]/30"><GitMerge className="h-6 w-6 text-[#F48FB1]" /></div>
              <div>
                <DialogTitle className="font-serif text-xl md:text-2xl font-bold tracking-wide">Manajemen Stok & Mutasi</DialogTitle>
                <p className="text-[10px] font-bold text-[#F48FB1] uppercase tracking-widest mt-0.5">Audit Inventaris Cabang</p>
              </div>
            </div>
          </DialogHeader>
          
          <Tabs defaultValue="data-stok" className="bg-white flex-1 flex flex-col overflow-hidden">
            <div className="px-6 md:px-8 border-b border-neutral-200/70">
              <TabsList className="h-14 bg-transparent border-none w-full justify-start gap-8">
                <TabsTrigger value="data-stok" className="data-[state=active]:border-b-4 data-[state=active]:border-[#C82368] data-[state=active]:text-[#C82368] h-full rounded-none px-0 font-black text-[10px] uppercase tracking-widest">1. Data Stok</TabsTrigger>
                <TabsTrigger value="status-pengajuan" className="data-[state=active]:border-b-4 data-[state=active]:border-[#C82368] data-[state=active]:text-[#C82368] h-full rounded-none px-0 font-black text-[10px] uppercase tracking-widest">2. Status Pengajuan</TabsTrigger>
                <TabsTrigger value="konfirmasi" className="data-[state=active]:border-b-4 data-[state=active]:border-[#C82368] data-[state=active]:text-[#C82368] h-full rounded-none px-0 font-black text-[10px] uppercase tracking-widest">3. Konfirmasi Penerimaan</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#F5F3F0]">
              <TabsContent value="data-stok" className="m-0 p-0 focus-visible:ring-0">
                <div className="p-4 md:p-6 border-b border-neutral-200/60 bg-white flex flex-col md:flex-row gap-4 sticky top-0 z-10 shadow-sm">
                  <div className="w-full md:w-64">
                    <Select value={stockViewingStoreId} onValueChange={setStockViewingStoreId}>
                      <SelectTrigger className="h-11 rounded-2xl bg-[#F5F3F0] border-transparent font-black text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="ALL" className="font-bold">SEMUA TOKO</SelectItem>
                        <SelectItem value="TOKO_A" className="font-bold">NHS KWT</SelectItem>
                        <SelectItem value="TOKO_B" className="font-bold">IND CO</SelectItem>
                        <SelectItem value="TOKO_C" className="font-bold">NHS GDM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                    <Input placeholder="Cari barang..." className="h-11 pl-11 rounded-full bg-[#F5F3F0] border-transparent font-black text-sm focus-visible:ring-1 focus-visible:ring-[#C82368]" value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
                  </div>
                </div>
                <div className="p-4 md:p-6">
                  <Card className="bg-white rounded-3xl shadow-sm border border-neutral-200/70 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-[#F5F3F0]/60">
                        <TableRow className="text-[10px] font-black uppercase">
                          <TableHead className="pl-6 py-5">Merek</TableHead>
                          <TableHead>Produk</TableHead>
                          <TableHead className="text-center">Size</TableHead>
                          <TableHead>Warna</TableHead>
                          <TableHead className="text-center">Stok</TableHead>
                          <TableHead className="text-right">Harga</TableHead>
                          <TableHead className="text-right pr-6">{isViewingAllStores ? "Toko" : "Aksi"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isStockLoading ? (
                          <TableRow><TableCell colSpan={7} className="h-48 text-center font-black animate-pulse text-neutral-400">Memuat Data Inventaris...</TableCell></TableRow>
                        ) : filtered.map((v: any) => (
                          <TableRow key={`${v.productId}-${v.variantId}-${v.storeId}`} className="hover:bg-[#C82368]/5 transition-colors border-b border-neutral-100 last:border-none text-[11px] group">
                            <TableCell className="pl-6 font-bold uppercase text-neutral-600">{v.brand}</TableCell>
                            <TableCell className="font-black uppercase text-neutral-900">{v.baseName}</TableCell>
                            <TableCell className="text-center font-black">{v.size}</TableCell>
                            <TableCell className="uppercase">{v.color}</TableCell>
                            <TableCell className="text-center"><Badge className={cn("text-[10px] font-black border-none rounded-full", v.stock < 5 ? "bg-rose-100 text-rose-600" : "bg-[#C82368]/10 text-[#C82368]")}>{v.stock} PCS</Badge></TableCell>
                            <TableCell className="text-right font-black text-neutral-950">Rp{v.price.toLocaleString('id-ID')}</TableCell>
                            <TableCell className="text-right pr-6">
                              {isViewingAllStores ? (
                                <Badge variant="outline" className="bg-[#F5F3F0] text-neutral-700 border-none font-black text-[9px] uppercase px-2.5 rounded-full">{v.storeId === 'TOKO_A' ? 'KWT' : v.storeId === 'TOKO_B' ? 'IND' : 'GDM'}</Badge>
                              ) : !isViewingOwnStore ? (
                                <Button size="sm" variant="outline" className="rounded-full font-black border-neutral-900 text-neutral-900 h-8 px-3 gap-1.5 group-hover:bg-[#C82368] group-hover:border-[#C82368] group-hover:text-white transition-colors" onClick={() => { setSelectedVariantForMutation(v); setIsMutationRequestOpen(true); }}>
                                  <ArrowRightLeft className="h-3 w-3" /> MUTASI
                                </Button>
                              ) : (
                                <span className="text-[9px] font-bold text-neutral-300 italic uppercase">CABANG INI</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="status-pengajuan" className="m-0 p-6 focus-visible:ring-0">
                <Card className="rounded-3xl border border-neutral-200/70 shadow-sm overflow-hidden bg-white">
                  <Table>
                    <TableHeader className="bg-[#F5F3F0]/60">
                      <TableRow className="text-[10px] font-black uppercase">
                        <TableHead className="pl-6 py-5">Barang</TableHead>
                        <TableHead>Dari Cabang</TableHead>
                        <TableHead className="text-center">Jumlah</TableHead>
                        <TableHead className="text-center">Status Tracking</TableHead>
                        <TableHead className="text-right pr-6">Tanggal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statusPengajuan.map((m: any) => (
                        <TableRow key={m.id} className="border-b border-neutral-100 last:border-none text-[11px]">
                          <TableCell className="pl-6 py-5">
                            <p className="font-black uppercase text-neutral-900">{m.productName}</p>
                            <p className="text-[9px] text-neutral-400">{m.color} | {m.size}</p>
                          </TableCell>
                          <TableCell><Badge variant="outline" className="bg-[#C82368]/10 text-[#C82368] border-none font-black text-[10px] uppercase rounded-full">{m.fromStore}</Badge></TableCell>
                          <TableCell className="text-center font-black">{m.quantity} PCS</TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn("text-[9px] font-black border-none px-3 rounded-full", m.status === 'PENDING' ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600")}>
                              {m.status === 'PENDING' ? 'MENUNGGU KONFIRMASI' : 'BERHASIL DIMUTASI'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right pr-6 font-bold text-neutral-400">{format(new Date(m.requestedAt), "dd/MM/yyyy")}</TableCell>
                        </TableRow>
                      ))}
                      {statusPengajuan.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-neutral-400 italic">Belum ada pengajuan mutasi.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="konfirmasi" className="m-0 p-6 focus-visible:ring-0">
                <Card className="rounded-3xl border border-neutral-200/70 shadow-sm overflow-hidden bg-white">
                  <Table>
                    <TableHeader className="bg-[#F5F3F0]/60">
                      <TableRow className="text-[10px] font-black uppercase">
                        <TableHead className="pl-6 py-5">Barang</TableHead>
                        <TableHead>Dari Cabang</TableHead>
                        <TableHead>Ke Cabang</TableHead>
                        <TableHead>Tanggal Pengajuan</TableHead>
                        <TableHead className="text-center">Jumlah</TableHead>
                        <TableHead className="text-right pr-6">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {konfirmasiPenerimaan.map((m: any) => (
                        <TableRow key={m.id} className="border-b border-neutral-100 last:border-none text-[11px]">
                          <TableCell className="pl-6 py-5">
                            <p className="font-black uppercase text-neutral-900">{m.productName}</p>
                            <p className="text-[9px] text-neutral-400 font-bold uppercase">{m.color} | {m.size}</p>
                          </TableCell>
                          <TableCell className="font-bold">{m.fromStore}</TableCell>
                          <TableCell><Badge className="bg-[#F5F3F0] text-neutral-800 border-none font-black text-[10px] uppercase px-3 rounded-full">{m.targetStore}</Badge></TableCell>
                          <TableCell className="font-bold text-neutral-400">{format(new Date(m.requestedAt), "dd/MM/yyyy")}</TableCell>
                          <TableCell className="text-center font-black text-[#C82368]">{m.quantity} PCS</TableCell>
                          <TableCell className="text-right pr-6">
                            <Button size="sm" className="bg-neutral-950 hover:bg-[#C82368] text-white font-black h-9 px-6 rounded-full transition-colors" onClick={() => handleApproveMutation(m)} disabled={isProcessing}>
                              {isProcessing ? <Loader2 className="animate-spin h-3.5 w-3.5" /> : "KONFIRMASI"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {konfirmasiPenerimaan.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-neutral-400 italic">Tidak ada permintaan mutasi keluar.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
          <DialogFooter className="p-6 bg-white border-t border-neutral-200/70 shrink-0">
            <Button className="w-full h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black uppercase tracking-widest text-xs transition-all" onClick={() => onOpenChange(false)}>TUTUP PANEL</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isMutationRequestOpen} onOpenChange={setIsMutationRequestOpen}>
        <DialogContent aria-describedby={undefined} className="max-w-md rounded-[2.25rem] p-0 overflow-hidden border border-neutral-200 shadow-2xl">
          <DialogHeader className="p-6 bg-neutral-950 text-white"><DialogTitle className="font-serif text-xl font-bold flex items-center gap-3"><ArrowRightLeft className="h-5 w-5 text-[#F48FB1]" /> Ajukan Mutasi</DialogTitle></DialogHeader>
          <div className="space-y-5 p-7 bg-white">
            <Card className="p-5 rounded-3xl bg-[#F5F3F0] border border-neutral-200/70 shadow-none space-y-1">
              <p className="font-black text-sm uppercase leading-tight text-neutral-900">{selectedVariantForMutation?.baseName}</p>
              <p className="text-[10px] font-bold text-neutral-500 uppercase">{selectedVariantForMutation?.color} | {selectedVariantForMutation?.size}</p>
              <p className="text-[9px] font-black bg-[#C82368]/10 text-[#C82368] px-2.5 py-0.5 rounded-full w-fit uppercase mt-2">Cabang Asal: {selectedVariantForMutation?.storeId}</p>
            </Card>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Jumlah Mutasi (PCS)</Label>
              <Input type="number" value={mutationQty} onChange={e => setMutationQty(e.target.value)} className="h-16 text-4xl font-black text-center border-none bg-[#F5F3F0] rounded-2xl text-neutral-950 focus-visible:ring-1 focus-visible:ring-[#C82368]" />
              <p className="text-[9px] text-center font-bold text-neutral-400 uppercase">Tersedia: {selectedVariantForMutation?.stock} PCS</p>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 bg-white">
            <Button className="w-full h-12 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black shadow-xl uppercase tracking-widest text-xs transition-all" onClick={handleRequestMutation}>KIRIM PENGAJUAN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
