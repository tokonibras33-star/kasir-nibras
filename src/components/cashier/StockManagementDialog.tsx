
'use client';

import { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
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
  CheckCircle2, 
  Loader2,
  X,
  History,
  Inbox
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { 
  useFirestore, 
  setDocumentNonBlocking, 
  updateDocumentNonBlocking 
} from "@/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

/**
 * Helper to generate search tokens for POS Panel 1 search optimization
 */
const generateSearchTokens = (name: string, brand: string, category: string, series: string, variants: any[]) => {
  const tokens = new Set<string>();
  const add = (val: string) => {
    if (!val) return;
    val.toLowerCase().split(/[\s-/]+/).forEach(t => {
      if (t && t.length > 0) tokens.add(t);
    });
  };
  add(name); add(brand); add(category); add(series);
  variants.forEach(v => { add(v.color); add(v.size); if (v.id) add(v.id); });
  return Array.from(tokens);
};

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
  outgoingMutations,
  incomingMutations,
  stockViewingStoreId,
  setStockViewingStoreId
}: StockManagementDialogProps) {
  const db = useFirestore();
  const [stockSearch, setStockSearch] = useState("");
  const [isMutationRequestOpen, setIsMutationRequestOpen] = useState(false);
  const [selectedVariantForMutation, setSelectedVariantForMutation] = useState<any>(null);
  const [mutationQty, setMutationQty] = useState("1");
  const [isProcessing, setIsProcessing] = useState(false);

  const isViewingOwnStore = stockViewingStoreId === storeId;

  const handleRequestMutation = () => {
    const qty = parseInt(mutationQty);
    if (isNaN(qty) || qty <= 0 || qty > selectedVariantForMutation.stock) {
      toast({ title: "Gagal", description: "Jumlah tidak valid.", variant: "destructive" });
      return;
    }

    const reqId = `MUT-${Date.now().toString().slice(-6)}`;
    const mutationData = {
      id: reqId,
      fromStore: stockViewingStoreId,
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
    setSelectedVariantForMutation(null);
    setMutationQty("1");
    toast({ title: "Mutasi Diajukan", description: "Menunggu persetujuan cabang asal." });
  };

  const handleApproveMutation = async (req: any) => {
    setIsProcessing(true);
    try {
      const sourceStoreRef = doc(db, "stores", req.fromStore, "stock", req.productId);
      const sourceSnap = await getDoc(sourceStoreRef);
      if (!sourceSnap.exists()) throw new Error("Produk asal tidak ditemukan.");
      
      const sourceData = sourceSnap.data();
      const updatedSourceVariants = (sourceData.variants || []).map((v: any) => {
        if (v.id === req.variantId) return { ...v, stock: Math.max(0, v.stock - req.quantity) };
        return v;
      });

      const targetStoreStockRef = collection(db, "stores", req.targetStore, "stock");
      const targetQuery = query(targetStoreStockRef, where("name", "==", req.productName.toUpperCase()));
      const targetSnap = await getDocs(targetQuery);
      
      let targetDocRef;
      let existingVariants = [];
      let productBaseData = {};

      if (!targetSnap.empty) {
        const existingDoc = targetSnap.docs[0];
        targetDocRef = doc(db, "stores", req.targetStore, "stock", existingDoc.id);
        const data = existingDoc.data();
        existingVariants = data.variants || [];
        productBaseData = data;
      } else {
        targetDocRef = doc(db, "stores", req.targetStore, "stock", req.productId);
        productBaseData = { 
          ...sourceData, 
          id: req.productId, 
          variants: [] 
        };
      }

      const updatedTargetVariants = [...existingVariants];
      const vIdx = updatedTargetVariants.findIndex((v: any) => 
        v.color === req.color && 
        v.size === req.size && 
        v.invoiceNo === req.invoiceNo
      );

      if (vIdx > -1) {
        updatedTargetVariants[vIdx].stock += req.quantity;
      } else {
        const sourceV = sourceData.variants.find((v: any) => v.id === req.variantId);
        updatedTargetVariants.push({ 
          ...sourceV, 
          id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, 
          stock: req.quantity 
        });
      }

      updateDocumentNonBlocking(sourceStoreRef, { 
        variants: updatedSourceVariants,
        searchTokens: generateSearchTokens(sourceData.name, sourceData.brand || '-', sourceData.category || '-', sourceData.series || '-', updatedSourceVariants)
      });
      
      setDocumentNonBlocking(targetDocRef, { 
        ...productBaseData,
        variants: updatedTargetVariants,
        searchTokens: generateSearchTokens(productBaseData.name, productBaseData.brand || '-', productBaseData.category || '-', productBaseData.series || '-', updatedTargetVariants)
      }, { merge: true });

      updateDocumentNonBlocking(doc(db, "mutationRequests", req.id), { 
        status: "APPROVED", 
        approvedAt: new Date().toISOString(),
        approvedBy: cashierName
      });

      toast({ title: "Mutasi Berhasil", description: "Barang telah berhasil digabungkan ke stok tujuan." });
    } catch (err: any) {
      toast({ title: "Gagal Mutasi", description: err.message, variant: "destructive" });
    } finally { 
      setIsProcessing(false); 
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[98vw] md:max-w-7xl max-h-[95vh] p-0 flex flex-col rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-5 md:p-8 bg-[#1F7A63] text-white shrink-0">
            <div className="flex items-center gap-3 md:gap-4">
              <div className="bg-white/10 p-2 md:p-3 rounded-xl md:rounded-2xl shrink-0"><GitMerge className="h-5 w-5 md:h-6 md:w-6 text-white" /></div>
              <div>
                <DialogTitle className="text-lg md:text-2xl font-black uppercase tracking-tight">Manajemen Stok</DialogTitle>
                <DialogDescription className="text-[8px] md:text-xs font-bold text-white/70 uppercase tracking-widest mt-0.5">Audit Inventaris & Mutasi Antar Cabang</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="data-stok" className="bg-white flex-1 flex flex-col min-h-0">
            <div className="px-4 md:px-8 border-b bg-white shrink-0">
              <TabsList className="h-12 md:h-14 bg-transparent border-none w-full justify-start gap-4 md:gap-8 overflow-x-auto scrollbar-hide flex-nowrap whitespace-nowrap">
                <TabsTrigger value="data-stok" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary h-full rounded-none px-0 font-black text-[9px] md:text-xs uppercase tracking-widest transition-all shrink-0">1. Data Stok Cabang</TabsTrigger>
                <TabsTrigger value="proses-mutasi" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary h-full rounded-none px-0 font-black text-[9px] md:text-xs uppercase tracking-widest transition-all shrink-0">2. Riwayat Pengajuan</TabsTrigger>
                <TabsTrigger value="penerimaan-mutasi" className="data-[state=active]:bg-transparent data-[state=active]:border-b-4 data-[state=active]:border-primary h-full rounded-none px-0 font-black text-[9px] md:text-xs uppercase tracking-widest transition-all shrink-0">3. Penerimaan Mutasi</TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide bg-slate-50/50">
              <TabsContent value="data-stok" className="m-0 focus-visible:ring-0">
                <div className="p-3 md:p-6 border-b bg-white flex flex-col md:flex-row gap-3 md:gap-4 sticky top-0 z-10 shadow-sm">
                  <div className="w-full md:w-64">
                    <Select value={stockViewingStoreId} onValueChange={setStockViewingStoreId}>
                      <SelectTrigger className="h-10 md:h-11 rounded-xl bg-slate-50 border-none shadow-inner font-black text-xs md:text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="TOKO_A" className="font-bold">NHS KWT</SelectItem>
                        <SelectItem value="TOKO_B" className="font-bold">IND CO</SelectItem>
                        <SelectItem value="TOKO_C" className="font-bold">NHS GDM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input placeholder="Cari Nama, Merek, Warna..." className="h-10 md:h-11 pl-10 rounded-xl bg-slate-50 border-none shadow-inner font-black text-xs md:text-sm" value={stockSearch} onChange={e => setStockSearch(e.target.value)} />
                  </div>
                </div>
                
                <div className="p-3 md:p-6">
                  <Card className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/80">
                          <TableRow className="text-[9px] md:text-[10px] font-black uppercase border-none hover:bg-transparent">
                            <TableHead className="pl-4 md:pl-6 py-4 md:py-5">Tgl Nota</TableHead>
                            <TableHead>No Nota</TableHead>
                            <TableHead>Merek</TableHead>
                            <TableHead>Kategori</TableHead>
                            <TableHead>Produk</TableHead>
                            <TableHead className="text-center">Size</TableHead>
                            <TableHead>Warna</TableHead>
                            <TableHead className="text-center">Stok</TableHead>
                            <TableHead className="text-right">Harga Jual</TableHead>
                            <TableHead className="text-right pr-4 md:pr-6">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isStockLoading ? (
                            <TableRow><TableCell colSpan={10} className="h-48 md:h-64 text-center text-slate-400 animate-pulse uppercase font-black text-[10px]">Memuat Data Inventaris...</TableCell></TableRow>
                          ) : (
                            (() => {
                              const flattened = (stockDialogProducts || []).flatMap(p => (p.variants || []).map((v: any) => ({
                                ...v, 
                                productId: p.id, 
                                variantId: v.id, 
                                baseName: p.name, 
                                brand: p.brand || '-', 
                                category: p.category || '-'
                              })));
                              
                              const filtered = flattened.filter(item => {
                                if (!stockSearch) return true;
                                const s = stockSearch.toLowerCase();
                                return (
                                  item.baseName.toLowerCase().includes(s) || 
                                  item.brand.toLowerCase().includes(s) || 
                                  item.color.toLowerCase().includes(s)
                                );
                              }).sort((a, b) => (a.invoiceDate || '') < (b.invoiceDate || '') ? 1 : -1);

                              return filtered.length > 0 ? filtered.map((v: any) => (
                                <TableRow key={`${v.productId}-${v.variantId}`} className="hover:bg-primary/5 transition-colors border-b border-slate-50 text-[10px] md:text-[11px] group">
                                  <TableCell className="pl-4 md:pl-6 py-3 md:py-4 text-muted-foreground font-medium">{v.invoiceDate || '-'}</TableCell>
                                  <TableCell className="font-mono font-bold text-primary">{v.invoiceNo || '-'}</TableCell>
                                  <TableCell className="font-bold uppercase text-slate-600">{v.brand}</TableCell>
                                  <TableCell className="uppercase text-slate-500">{v.category}</TableCell>
                                  <TableCell className="font-black uppercase text-slate-800 min-w-[120px]">{v.baseName}</TableCell>
                                  <TableCell className="text-center font-black text-slate-700">{v.size}</TableCell>
                                  <TableCell className="uppercase text-slate-600">{v.color}</TableCell>
                                  <TableCell className="text-center">
                                    <Badge className={cn("text-[9px] md:text-[10px] font-black border-none px-2 md:px-3 py-1 rounded-lg", v.stock <= 0 ? "bg-slate-100 text-slate-400" : v.stock < 5 ? "bg-rose-100 text-rose-600" : "bg-primary/10 text-primary")}>
                                      {v.stock} PCS
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right font-black text-slate-900">Rp{v.price.toLocaleString('id-ID')}</TableCell>
                                  <TableCell className="text-right pr-4 md:pr-6">
                                    {!isViewingOwnStore ? (
                                      <Button size="sm" variant="outline" className="rounded-lg md:rounded-xl font-black text-[9px] md:text-[10px] border-primary text-primary h-8 md:h-9 gap-1 md:gap-2 shadow-sm group-hover:bg-primary group-hover:text-white transition-all px-2 md:px-3" onClick={() => { setSelectedVariantForMutation(v); setIsMutationRequestOpen(true); }}>
                                        <ArrowRightLeft className="h-3 w-3" /> MUTASI
                                      </Button>
                                    ) : (
                                      <span className="text-[9px] md:text-[10px] font-bold text-slate-300 italic uppercase">Toko Sendiri</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )) : (
                                <TableRow><TableCell colSpan={10} className="h-48 md:h-64 text-center text-slate-300 italic font-medium">Data stok tidak ditemukan.</TableCell></TableRow>
                              );
                            })()
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="proses-mutasi" className="m-0 focus-visible:ring-0">
                <div className="p-3 md:p-6">
                  <Card className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/80">
                          <TableRow className="text-[9px] md:text-[10px] font-black uppercase border-none hover:bg-transparent">
                            <TableHead className="pl-5 md:pl-8 py-4 md:py-5">Barang</TableHead>
                            <TableHead>Dari Cabang</TableHead>
                            <TableHead className="text-center">Jumlah</TableHead>
                            <TableHead className="text-center">Status Tracking</TableHead>
                            <TableHead className="text-right pr-5 md:pr-8">Tanggal</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {outgoingMutations?.map((m: any) => (
                            <TableRow key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <TableCell className="pl-5 md:pl-8 py-4 md:py-5">
                                <p className="font-black text-xs md:text-sm uppercase text-slate-800 leading-tight">{m.productName}</p>
                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase mt-1">{m.color} | {m.size}</p>
                              </TableCell>
                              <TableCell><Badge className="bg-slate-100 text-slate-600 border-none font-black text-[9px] uppercase px-2 py-0.5">{m.fromStore?.replace('_', ' ')}</Badge></TableCell>
                              <TableCell className="text-center font-black text-xs md:text-sm">{m.quantity} PCS</TableCell>
                              <TableCell className="text-center">
                                <Badge className={cn("text-[9px] md:text-[10px] font-black border-none px-3 md:px-4 py-1 uppercase rounded-full", m.status === "PENDING" ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-600")}>
                                  {m.status === "PENDING" ? "PROSES PENGAJUAN" : "PENGAJUAN DITERIMA"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right pr-5 md:pr-8 text-[9px] md:text-[10px] font-bold text-slate-400">{format(new Date(m.requestedAt), "dd/MM/yy HH:mm")}</TableCell>
                            </TableRow>
                          ))}
                          {(!outgoingMutations || outgoingMutations.length === 0) && (
                            <TableRow><TableCell colSpan={5} className="h-48 md:h-64 text-center text-slate-300 italic font-medium">Belum ada pengajuan mutasi.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="penerimaan-mutasi" className="m-0 focus-visible:ring-0">
                <div className="p-3 md:p-6">
                  <Card className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-slate-50/80">
                          <TableRow className="text-[9px] md:text-[10px] font-black uppercase border-none hover:bg-transparent">
                            <TableHead className="pl-5 md:pl-8 py-4 md:py-5">Barang</TableHead>
                            <TableHead>Ke Cabang (Tujuan)</TableHead>
                            <TableHead className="text-center">Jumlah</TableHead>
                            <TableHead className="text-right pr-5 md:pr-8">Aksi</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {incomingMutations?.map((m: any) => (
                            <TableRow key={m.id} className="border-b border-slate-50 bg-orange-50/5 hover:bg-orange-50/10">
                              <TableCell className="pl-5 md:pl-8 py-4 md:py-5">
                                <p className="font-black text-xs md:text-sm uppercase text-slate-800 leading-tight">{m.productName}</p>
                                <p className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase mt-1">{m.color} | {m.size}</p>
                              </TableCell>
                              <TableCell><Badge className="bg-blue-100 text-blue-700 border-none font-black text-[9px] uppercase px-2 py-0.5">{m.targetStore?.replace('_', ' ')}</Badge></TableCell>
                              <TableCell className="text-center font-black text-xs md:text-sm text-primary">{m.quantity} PCS</TableCell>
                              <TableCell className="text-right pr-5 md:pr-8">
                                <Button size="sm" className="h-9 md:h-10 px-4 md:px-8 rounded-lg md:rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg text-[10px] md:text-[11px] tracking-widest text-white" onClick={() => handleApproveMutation(m)} disabled={isProcessing}>
                                  {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCircle2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1 md:mr-2" /> TERIMA</>}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {(!incomingMutations || incomingMutations.length === 0) && (
                            <TableRow><TableCell colSpan={4} className="h-48 md:h-64 text-center text-slate-300 italic font-medium">Tidak ada permintaan mutasi.</TableCell></TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="p-4 md:p-6 bg-white border-t shrink-0 shadow-inner">
            <Button className="w-full font-black h-12 md:h-14 rounded-xl md:rounded-2xl bg-slate-800 text-white text-xs md:text-sm tracking-widest uppercase shadow-xl" onClick={() => onOpenChange(false)}>TUTUP PANEL</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMutationRequestOpen} onOpenChange={setIsMutationRequestOpen}>
        <DialogContent className="max-w-[90vw] md:max-w-md rounded-2xl md:rounded-3xl p-6 md:p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4 text-left">
            <DialogTitle className="text-lg md:text-xl font-black uppercase text-primary flex items-center gap-2 md:gap-3"><ArrowRightLeft className="h-5 w-5 md:h-6 md:w-6" /> Ajukan Mutasi Barang</DialogTitle>
            <DialogDescription className="text-[10px] md:text-xs">Meminta barang ini dari cabang {stockViewingStoreId?.replace('_', ' ')} ke toko Anda ({storeId?.replace('_', ' ')}).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 md:space-y-6">
            <Card className="p-4 md:p-5 rounded-xl md:rounded-2xl border-none bg-primary/5 space-y-1.5 md:space-y-2">
              <p className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-widest">Barang Terpilih:</p>
              <p className="font-black text-sm md:text-base uppercase text-slate-800 leading-tight">{selectedVariantForMutation?.baseName}</p>
              <p className="text-[10px] md:text-[11px] font-bold text-slate-400 uppercase">{selectedVariantForMutation?.color} | {selectedVariantForMutation?.size}</p>
              <div className="pt-2 flex justify-between items-center border-t border-primary/10 mt-2">
                <span className="text-[9px] md:text-[10px] font-bold text-emerald-600 uppercase">Nota: {selectedVariantForMutation?.invoiceNo || '-'}</span>
                <span className="text-[9px] md:text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded">STOK: {selectedVariantForMutation?.stock}</span>
              </div>
            </Card>
            <div className="space-y-2 md:space-y-3">
              <Label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">Jumlah Yang Diminta (PCS)</Label>
              <Input type="number" value={mutationQty} onChange={e => setMutationQty(e.target.value)} max={selectedVariantForMutation?.stock} className="h-12 md:h-16 text-3xl md:text-4xl font-black text-center border-none bg-slate-100 rounded-xl md:rounded-2xl text-primary shadow-inner" />
              <p className="text-[8px] md:text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest">Tersedia: {selectedVariantForMutation?.stock} PCS</p>
            </div>
          </div>
          <DialogFooter className="mt-6 md:mt-8">
            <Button className="w-full h-12 md:h-16 rounded-xl md:rounded-2xl font-black shadow-xl shadow-primary/20 text-sm md:text-lg uppercase tracking-widest transition-transform active:scale-95 text-white" onClick={handleRequestMutation}>KIRIM PENGAJUAN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

