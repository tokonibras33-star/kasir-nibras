
'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ArrowLeft, Download, Loader2, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png';

export default function PrintClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  const trxId = searchParams.get('id');
  const storeIdParam = searchParams.get('store') || 'TOKO_A';
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [isGenerating, setIsGenerating] = useState(false);

  const [headerInfo, setHeaderInfo] = useState({ name: "", address: "", phone: "", cashier: "" });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem(`nh_store_name_${storeIdParam}`);
      const address = localStorage.getItem(`nh_store_address_${storeIdParam}`);
      const phone = localStorage.getItem(`nh_store_phone_${storeIdParam}`);
      const cashier = localStorage.getItem("nibras_house_cashier_name");
      
      setHeaderInfo({ 
        name: name || "", 
        address: address || "", 
        phone: phone || "",
        cashier: cashier || ""
      });
    }
  }, [storeIdParam]);

  const trxRef = useMemoFirebase(() => (trxId && user ? doc(db, 'stores', storeIdParam, 'transactions', trxId) : null), [db, storeIdParam, trxId, user]);
  const { data: trx, isLoading: isDocLoading } = useDoc<any>(trxRef);

  const brandRef = useMemoFirebase(() => doc(db, "settings", "brand"), [db]);
  const { data: brandData } = useDoc<any>(brandRef);

  const handleDownloadPDF = async () => {
    if (!trx) return;
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const element = document.getElementById('print-area');
      if (!element) throw new Error('Print area not found');
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: paperSize === '58mm' ? [58, 200] : [80, 200] });
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`struk-${trx.id}.pdf`);
    } catch (err) { console.error(err); } finally { setIsGenerating(false); }
  };

  if (isUserLoading || isDocLoading) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin h-10 w-10 text-primary" /><p className="text-xs font-black uppercase">Memuat Data Antrean Cetak...</p></div>;
  if (!user || !trx) return <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4"><Info className="h-12 w-12 text-rose-500" /><h1 className="text-xl font-black">Data Transaksi Tidak Ditemukan</h1><Button onClick={() => router.back()}>Kembali</Button></div>;

  // CONSOLIDATE IDENTICAL ITEMS BY NAME (Peleburan Item Identik)
  const consolidatedItems = trx.items?.reduce((acc: any[], item: any) => {
    const itemName = (item.name || "").toUpperCase();
    const existing = acc.find(i => i.name.toUpperCase() === itemName && i.variantId === item.variantId);
    const labelPrice = item.labelPrice || item.price;
    const qty = item.quantity || 1;
    const itemDiscTotal = ((item.storeDiscountPercent > 0 ? (labelPrice * item.storeDiscountPercent / 100) : (item.storeDiscountNominal || 0)) * qty);
    
    if (existing) { 
      existing.quantity += qty; 
      existing.totalNominalDisc += itemDiscTotal; 
    } else { 
      acc.push({ ...item, labelPrice, totalNominalDisc: itemDiscTotal }); 
    }
    return acc;
  }, []) || [];

  const totalQty = consolidatedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
  const logoToUse = brandData?.receiptLogoUrl || DEFAULT_LOGO_URL;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row print:bg-white print:p-0">
      <aside className="w-full md:w-[350px] bg-white border-r p-6 space-y-8 print:hidden shrink-0">
        <div className="flex items-center justify-between"><Button variant="ghost" size="sm" onClick={() => router.back()}><ArrowLeft className="h-4 w-4 mr-2" /> Kembali</Button><Badge variant="secondary" className="font-black text-[10px]">PRINT CENTER</Badge></div>
        <div className="space-y-6">
          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-primary">Pilih Ukuran Kertas</Label>
            <RadioGroup value={paperSize} onValueChange={(v: any) => setPaperSize(v)} className="grid grid-cols-2 gap-3">
              <div className="relative"><RadioGroupItem value="58mm" id="p-58" className="sr-only peer" /><Label htmlFor="p-58" className="flex items-center justify-center h-12 rounded-2xl border-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer font-black text-sm transition-all">58mm</Label></div>
              <div className="relative"><RadioGroupItem value="80mm" id="p-80" className="sr-only peer" /><Label htmlFor="p-80" className="flex items-center justify-center h-12 rounded-2xl border-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer font-black text-sm transition-all">80mm</Label></div>
            </RadioGroup>
          </div>
          <Button className="w-full h-20 rounded-[2.5rem] font-black text-lg shadow-2xl bg-primary" onClick={() => window.print()}><Printer className="h-6 w-6 mr-3" /> CETAK STRUK</Button>
          <Button variant="outline" className="w-full h-14 rounded-2xl font-black text-xs" onClick={handleDownloadPDF} disabled={isGenerating}>{isGenerating ? <Loader2 className="animate-spin h-5 w-5 mr-3" /> : <Download className="h-5 w-5 mr-3" />} SIMPAN PDF</Button>
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-4 md:p-12 overflow-y-auto print:p-0 print:m-0">
        <div id="print-area" className="bg-white shadow-2xl print:shadow-none transition-all duration-300" style={{ width: paperSize, minHeight: '100mm', padding: '5mm', fontFamily: 'monospace', color: '#000', fontSize: '10px', lineHeight: '1.2' }}>
          <div className="text-center mb-6 space-y-1">
            <div className="flex justify-center mb-2">
              <img src={logoToUse} alt="Logo" className="h-14 w-auto object-contain mx-auto" />
            </div>
            {headerInfo.name && <h2 className="text-sm font-black uppercase leading-tight">{headerInfo.name}</h2>}
            {headerInfo.address && (
              <p className="text-[9px] font-bold uppercase opacity-80">
                {headerInfo.address} {headerInfo.phone && `(Tlp. ${headerInfo.phone})`}
              </p>
            )}
          </div>

          <div className="border-y border-dashed border-black/30 py-3 my-3 space-y-1 text-[9px]">
            <div className="flex justify-between"><span>NO STRUK:</span><span>{trx.id}</span></div>
            <div className="flex justify-between"><span>TANGGAL:</span><span>{trx.date?.toDate().toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between"><span>KASIR:</span><span>{(headerInfo.cashier || trx.cashier || "").toUpperCase()}</span></div>
            <div className="pt-1 border-t border-dashed border-black/10 mt-1"><div className="flex justify-between font-bold"><span>CUSTOMER:</span><span className="uppercase">{trx.customerName || "UMUM"}</span></div></div>
          </div>

          <div className="space-y-4 mb-4">
            {consolidatedItems.map((item, i) => {
              const labelPrice = item.labelPrice || item.price;
              const totalDisc = item.totalNominalDisc || 0;
              const totalLabelPrice = labelPrice * item.quantity;
              const effectiveDiscPct = totalLabelPrice > 0 ? Math.round((totalDisc / totalLabelPrice) * 100) : 0;
              
              return (
                <div key={i} className="space-y-1 border-b border-dashed border-black/5 pb-2 last:border-none">
                  <div className="flex justify-between items-start gap-4">
                    <p className="font-black uppercase leading-tight text-[10px] flex-1">{item.name}</p>
                    <p className="font-black text-[10px] whitespace-nowrap text-right">Rp{labelPrice.toLocaleString('id-ID')}</p>
                  </div>
                  <p className="text-[9px] opacity-90 italic">
                    {item.series || item.category} | {item.size} | {item.quantity}x @Rp{labelPrice.toLocaleString('id-ID')} 
                    {totalDisc > 0 && ` (disc ${effectiveDiscPct}% | Rp${totalDisc.toLocaleString('id-ID')})`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="border-t border-dashed border-black/30 pt-3 space-y-1.5">
            <div className="flex justify-between text-[9px]"><span>JUMLAH QTY</span><span>{totalQty} PCS</span></div>
            <div className="flex justify-between text-[9px] font-bold"><span>SUBTOTAL (HARGA LABEL)</span><span>Rp{trx.subtotalLabel?.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between text-[9px] font-bold text-rose-600"><span>TOTAL POTONGAN</span><span>-Rp{trx.totalDiscount?.toLocaleString('id-ID')}</span></div>
            <div className="border-t border-black/10 pt-1 flex justify-between text-[11px] font-black uppercase"><span>TOTAL TAGIHAN</span><span>Rp{trx.total?.toLocaleString('id-ID')}</span></div>
            
            {trx.paymentMethod?.includes("CASH") && trx.cashReceived > 0 && (
              <div className="pt-2 space-y-1 border-t border-dashed border-black/20 mt-2">
                <div className="flex justify-between text-[9px]"><span>DIBAYAR CASH</span><span>Rp{trx.cashReceived.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-[9px] font-black"><span>KEMBALIAN</span><span>Rp{trx.cashChange.toLocaleString('id-ID')}</span></div>
              </div>
            )}
            
            {trx.status === 'DP' && (
              <div className="pt-2 space-y-1 border-t border-dashed border-black/20 mt-2">
                <div className="flex justify-between text-[9px] font-bold"><span>TOTAL SUDAH DIBAYAR</span><span>Rp{trx.paidAmount?.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-[9px] font-black text-rose-600"><span>SISA PELUNASAN</span><span>Rp{trx.remainingAmount?.toLocaleString('id-ID')}</span></div>
              </div>
            )}
          </div>

          <div className="text-center mt-10 space-y-1 text-[8px] opacity-60">
            <p className="font-bold text-[9px]">*** TERIMA KASIH ***</p>
            <p>BARANG YANG SUDAH DIBELI TIDAK DAPAT DITUKAR/DIKEMBALIKAN</p>
          </div>
        </div>
      </main>
      <style dangerouslySetInnerHTML={{ __html: `@media print { body { background: white !important; margin: 0 !important; } aside { display: none !important; } main { padding: 0 !important; margin: 0 !important; } #print-area { box-shadow: none !important; width: ${paperSize} !important; margin: 0 auto; padding: 2mm !important; } @page { margin: 0; } }` }} />
    </div>
  );
}

