
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useFirestore, useDoc, useMemoFirebase, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ArrowLeft, Download, Loader2, Info, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import Image from "next/image";

const LOGO_URL = "https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png";

export default function PrintCenterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  
  const trxId = searchParams.get("id");
  const storeId = searchParams.get("store") || "TOKO_A";
  const displayStoreName = storeId === "TOKO_A" ? "NHS KWT" : storeId === "TOKO_B" ? "IND CO" : "NHS GDM";
  
  const mode = searchParams.get("mode");
  const [paperSize, setPaperSize] = useState<"58mm" | "80mm">("58mm");
  const [isGenerating, setIsGenerating] = useState(false);

  // Memoize reference but ONLY start fetch if user is authenticated
  const trxRef = useMemoFirebase(() => (trxId && user) ? doc(db, "stores", storeId, "transactions", trxId) : null, [db, storeId, trxId, user]);
  const { data: trx, isLoading: isDocLoading } = useDoc<any>(trxRef);

  useEffect(() => {
    if (trx && mode === 'download') {
      setTimeout(() => handleDownloadPDF(), 1000);
    }
  }, [trx, mode]);

  const handleDownloadPDF = async () => {
    if (!trx) return;
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const element = document.getElementById('print-area');
      if (!element) throw new Error("Print area not found");
      
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ 
        orientation: 'portrait', 
        unit: 'mm', 
        format: paperSize === '58mm' ? [58, 200] : [80, 200] 
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`struk-${trx.id}.pdf`);
    } catch (err) { 
      console.error(err); 
    } finally { 
      setIsGenerating(false); 
    }
  };

  // 1. Loading Sesi Auth
  if (isUserLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menghubungkan Sesi...</p>
      </div>
    );
  }

  // 2. Jika tidak ada sesi (mencegah error permission)
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4 bg-white">
        <div className="bg-rose-50 p-6 rounded-full"><Lock className="h-12 w-12 text-rose-500" /></div>
        <h1 className="text-xl font-black uppercase tracking-tight">Akses Terbatas</h1>
        <p className="text-sm text-muted-foreground max-w-xs">Silakan login kembali di tab utama untuk mengakses struk belanja ini.</p>
        <Button onClick={() => window.close()} variant="outline" className="rounded-xl px-8">Tutup Tab</Button>
      </div>
    );
  }

  // 3. Loading Dokumen Firestore
  if (isDocLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Mengambil Data Struk...</p>
      </div>
    );
  }

  // 4. Data Tidak Ditemukan
  if (!trx) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Info className="h-12 w-12 text-rose-500" />
        <h1 className="text-xl font-black">Data Struk Tidak Ditemukan</h1>
        <p className="text-sm text-muted-foreground">ID: {trxId}</p>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row print:bg-white print:p-0">
      <aside className="w-full md:w-[350px] bg-white border-r p-6 space-y-8 print:hidden shrink-0">
        <div className="flex items-center justify-between"><Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" /> Kembali</Button><Badge variant="secondary" className="font-black text-[10px]">PRINT CENTER</Badge></div>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Ukuran Kertas</Label>
            <RadioGroup value={paperSize} onValueChange={(v: any) => setPaperSize(v)} className="grid grid-cols-2 gap-3">
              <div className="relative"><RadioGroupItem value="58mm" id="p-58" className="sr-only peer" /><Label htmlFor="p-58" className="flex items-center justify-center h-12 rounded-2xl border-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer font-black text-sm transition-all">58mm</Label></div>
              <div className="relative"><RadioGroupItem value="80mm" id="p-80" className="sr-only peer" /><Label htmlFor="p-80" className="flex items-center justify-center h-12 rounded-2xl border-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer font-black text-sm transition-all">80mm</Label></div>
            </RadioGroup>
          </div>
          <div className={cn("p-5 rounded-[2rem] border-2 space-y-1", trx.status === 'DP' ? "bg-orange-50 border-orange-100" : "bg-emerald-50 border-emerald-100")}>
            <p className={cn("text-[9px] font-black uppercase", trx.status === 'DP' ? "text-orange-600" : "text-emerald-600")}>Status Pembayaran</p>
            <p className="text-xl font-black uppercase">{trx.status === 'DP' ? "Belum Lunas (DP)" : "Lunas / Selesai"}</p>
          </div>
          <Button className="w-full h-20 rounded-[2.5rem] font-black text-lg shadow-2xl" onClick={() => window.print()}><Printer className="h-6 w-6 mr-3" /> CETAK STRUK</Button>
          <Button variant="outline" className="w-full h-14 rounded-2xl font-black text-xs" onClick={handleDownloadPDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : <Download className="h-5 w-5 mr-3" />} SIMPAN SEBAGAI PDF</Button>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-y-auto print:p-0 print:m-0">
        <div id="print-area" className="bg-white shadow-2xl print:shadow-none transition-all duration-300 overflow-hidden" style={{ width: paperSize, minHeight: paperSize === '58mm' ? '100mm' : '120mm', padding: '5mm', fontFamily: 'monospace', color: '#000', fontSize: '10px', lineHeight: '1.2' }}>
          <div className="text-center mb-6 space-y-2">
            <div className="flex justify-center mb-2">
              <Image src={LOGO_URL} alt="Logo Nibras" width={60} height={60} className="object-contain" />
            </div>
            <h2 className="text-sm font-black uppercase">NIBRAS HOUSE</h2>
            <p className="text-[9px] font-bold uppercase opacity-80">Cabang {displayStoreName}</p>
          </div>
          
          <div className="border-y border-dashed border-black/30 py-3 my-3 space-y-1 text-[9px]">
            <div className="flex justify-between"><span>NO STRUK:</span><span>{trx.id}</span></div>
            <div className="flex justify-between"><span>TANGGAL:</span><span>{trx.date?.toDate().toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span>KASIR:</span><span>{trx.cashier?.toUpperCase()}</span></div>
            <div className="pt-1 border-t border-dashed border-black/10 mt-1">
              <div className="flex justify-between font-bold"><span>CUSTOMER:</span><span className="uppercase">{trx.customerName || "UMUM"}</span></div>
              {trx.customerPhone && <div className="flex justify-between opacity-70"><span>WHATSAPP:</span><span>{trx.customerPhone}</span></div>}
            </div>
          </div>

          <table className="w-full mb-6 text-[10px]">
            <tbody>
              {trx.items?.map((item: any, i: number) => (
                <tr key={i} className="align-top">
                  <td className="py-1.5 pr-2">
                    <div className="font-bold uppercase leading-tight">{item.name}</div>
                    <div className="text-[8px] opacity-70 italic">{item.color} | {item.size} ({item.quantity}x @{item.price.toLocaleString('id-ID')})</div>
                  </td>
                  <td className="py-1.5 text-right font-bold whitespace-nowrap">Rp{((item.price || 0) * (item.quantity || 0)).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-black/30 pt-3 space-y-1.5">
            <div className="flex justify-between text-[9px]"><span>SUBTOTAL (HARGA LABEL)</span><span>Rp{(trx.subtotalLabel || 0).toLocaleString('id-ID')}</span></div>
            
            {trx.storeDiscount > 0 && (
              <div className="flex justify-between text-[9px]"><span>DISC TOKO</span><span>-Rp{(trx.storeDiscount || 0).toLocaleString('id-ID')}</span></div>
            )}
            {trx.memberDiscount > 0 && (
              <div className="flex justify-between text-[9px]"><span>DISC MEMBER</span><span>-Rp{(trx.memberDiscount || 0).toLocaleString('id-ID')}</span></div>
            )}
            {trx.agentDiscount > 0 && (
              <div className="flex justify-between text-[9px]"><span>DISC AGEN</span><span>-Rp{(trx.agentDiscount || 0).toLocaleString('id-ID')}</span></div>
            )}
            {trx.voucherDiscount > 0 && (
              <div className="flex justify-between text-[9px]"><span>DISC VOUCHER {trx.appliedVoucher?.code ? `(${trx.appliedVoucher.code})` : ''}</span><span>-Rp{(trx.voucherDiscount || 0).toLocaleString('id-ID')}</span></div>
            )}
            
            <div className="flex justify-between text-[9px] font-black border-t border-black/10 pt-1"><span>TOTAL POTONGAN</span><span>-Rp{(trx.totalDiscount || 0).toLocaleString('id-ID')}</span></div>
            
            <div className="flex justify-between text-[10px] font-black border-t border-black/20 pt-1 bg-black/5 p-1 my-1"><span>GRAND TOTAL</span><span>Rp{(trx.total || 0).toLocaleString('id-ID')}</span></div>

            {trx.status === 'DP' ? (
              <>
                <div className="flex justify-between text-[9px] font-bold border-t border-black/10 pt-1"><span>DIBAYAR AWAL (DP)</span><span>Rp{(trx.paidAmount || 0).toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-[9px] font-black bg-black text-white p-1 my-1"><span>SISA PELUNASAN</span><span>Rp{(trx.remainingAmount || 0).toLocaleString('id-ID')}</span></div>
              </>
            ) : (
              <>
                <div className="flex justify-between text-[9px] font-black border-t border-black/10 pt-1"><span>TOTAL DIBAYAR</span><span>Rp{(trx.paidAmount || 0).toLocaleString('id-ID')}</span></div>
                {trx.paymentMethod === "CASH" && trx.customerType === "UMUM" && trx.cashReceived > 0 && (
                  <div className="pt-1 space-y-1">
                    <div className="flex justify-between text-[9px] font-bold"><span>TUNAI</span><span>Rp{(trx.cashReceived || 0).toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between text-[9px] font-bold"><span>KEMBALIAN</span><span>Rp{(trx.cashChange || 0).toLocaleString('id-ID')}</span></div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="text-center mt-10 space-y-1 text-[8px] opacity-60">
            <p className="font-bold text-[9px]">*** TERIMA KASIH ***</p>
            {trx.status === 'DP' && (
              <div className="font-bold text-black border border-black p-2 my-2 leading-tight">BARANG DAPAT DIAMBIL<br/>SETELAH PELUNASAN SISA TAGIHAN</div>
            )}
            <p>BARANG YANG SUDAH DIBELI TIDAK DAPAT DITUKAR / DIKEMBALIKAN</p>
          </div>
        </div>
      </main>
      <style dangerouslySetInnerHTML={{ __html: `@media print { body { background: white !important; margin: 0 !important; } aside { display: none !important; } main { padding: 0 !important; margin: 0 !important; } #print-area { box-shadow: none !important; width: ${paperSize} !important; margin: 0 auto; padding: 2mm !important; } @page { margin: 0; } }`}} />
    </div>
  );
}
