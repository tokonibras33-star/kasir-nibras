'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, ArrowLeft, Download, Loader2, Info, Scissors } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getTrxReturnSummary } from '@/components/cashier/types';

const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png';
const PX_TO_MM = 25.4 / 96; // Standard CSS 96 DPI -> mm

export default function PrintClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  const trxId = searchParams.get('id');
  const storeIdParam = searchParams.get('store') || 'TOKO_A';
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [bottomFeedMm, setBottomFeedMm] = useState<number>(3);
  const [measuredHeightMm, setMeasuredHeightMm] = useState<number>(120);
  const [isGenerating, setIsGenerating] = useState(false);

  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const [headerInfo, setHeaderInfo] = useState({ name: "", address: "", phone: "", cashier: "" });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const name = localStorage.getItem(`nh_store_name_${storeIdParam}`);
      const address = localStorage.getItem(`nh_store_address_${storeIdParam}`);
      const phone = localStorage.getItem(`nh_store_phone_${storeIdParam}`);
      const cashier = localStorage.getItem("nibras_house_cashier_name");
      const savedPaper = localStorage.getItem("nh_print_paper_size");
      const savedFeed = localStorage.getItem("nh_print_bottom_feed_mm");

      if (savedPaper === '58mm' || savedPaper === '80mm') {
        setPaperSize(savedPaper);
      }
      if (savedFeed && !Number.isNaN(Number(savedFeed))) {
        setBottomFeedMm(Number(savedFeed));
      }

      setHeaderInfo({
        name: name || "",
        address: address || "",
        phone: phone || "",
        cashier: cashier || ""
      });
    }
  }, [storeIdParam]);

  const handlePaperSizeChange = (val: '58mm' | '80mm') => {
    setPaperSize(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem("nh_print_paper_size", val);
    }
  };

  const handleBottomFeedChange = (mm: number) => {
    setBottomFeedMm(mm);
    if (typeof window !== 'undefined') {
      localStorage.setItem("nh_print_bottom_feed_mm", String(mm));
    }
  };

  const trxRef = useMemoFirebase(() => (trxId && user ? doc(db, 'stores', storeIdParam, 'transactions', trxId) : null), [db, storeIdParam, trxId, user]);
  const { data: trx, isLoading: isDocLoading } = useDoc<any>(trxRef);

  const brandRef = useMemoFirebase(() => doc(db, "settings", "brand"), [db]);
  const { data: brandData } = useDoc<any>(brandRef);

  // Measure exact receipt height in mm so @page stops right at the receipt end (no endless feed)
  const measureReceiptHeight = useCallback(() => {
    const el = printAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rawPx = Math.max(el.scrollHeight, rect.height);
    if (rawPx > 0) {
      // Add 1mm rounding buffer to avoid accidental 2nd blank page split
      const exactMm = Math.ceil(rawPx * PX_TO_MM) + 1;
      setMeasuredHeightMm(exactMm);
    }
  }, []);

  useEffect(() => {
    const el = printAreaRef.current;
    if (!el) return;

    measureReceiptHeight();
    const raf = requestAnimationFrame(measureReceiptHeight);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        measureReceiptHeight();
      });
      observer.observe(el);
    }

    return () => {
      cancelAnimationFrame(raf);
      if (observer) observer.disconnect();
    };
  }, [trx, paperSize, bottomFeedMm, headerInfo, brandData, measureReceiptHeight]);

  const handlePrint = () => {
    measureReceiptHeight();
    // Wait 2 animation frames so updated @page height CSS is committed before opening print dialog
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  };

  const handleDownloadPDF = async () => {
    if (!trx) return;
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const element = printAreaRef.current || document.getElementById('print-area');
      if (!element) throw new Error('Print area not found');
      const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff', height: element.scrollHeight, windowHeight: element.scrollHeight });
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = paperSize === '58mm' ? 58 : 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight] });
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`struk-${trx.id}.pdf`);
    } catch (err) { console.error(err); } finally { setIsGenerating(false); }
  };

  if (isUserLoading || isDocLoading) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><Loader2 className="animate-spin h-10 w-10 text-primary" /><p className="text-xs font-black uppercase">Memuat Data Antrean Cetak...</p></div>;
  if (!user || !trx) return <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4"><Info className="h-12 w-12 text-rose-500" /><h1 className="text-xl font-black">Data Transaksi Tidak Ditemukan</h1><Button onClick={() => router.back()}>Kembali</Button></div>;

  // CONSOLIDATE IDENTICAL ITEMS BY NAME (Peleburan Item Identik)
  const returnSummary = getTrxReturnSummary(trx);
  const sourceItems = Array.isArray(trx.originalItems) ? trx.originalItems : (trx.items || []);
  const consolidatedItems = sourceItems.reduce((acc: any[], item: any) => {
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
    <div id="print-page-wrapper" className="min-h-screen bg-[#F5F3F0] flex flex-col md:flex-row print:min-h-0 print:h-auto print:block print:bg-white print:p-0 print:m-0">
      <aside className="w-full md:w-[340px] bg-neutral-950 text-white p-6 space-y-8 print:hidden shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => router.back()} className="rounded-full text-neutral-300 hover:text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
            </Button>
            <Badge className="bg-[#C82368] text-white border-none rounded-full px-3 py-1 font-bold text-[10px] tracking-widest">
              PRINT CENTER
            </Badge>
          </div>
          <div className="space-y-5">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-white">Cetak Struk</h2>
              <p className="text-xs text-neutral-400 mt-1">Stoper thermal otomatis aktif — panjang kertas dikunci presisi sesuai isi struk.</p>
            </div>
            <div className="space-y-2.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Pilih Ukuran Kertas</Label>
              <RadioGroup value={paperSize} onValueChange={(v: any) => handlePaperSizeChange(v)} className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <RadioGroupItem value="58mm" id="p-58" className="sr-only peer" />
                  <Label htmlFor="p-58" className="flex items-center justify-center h-11 rounded-full border border-neutral-800 bg-neutral-900 text-neutral-300 peer-data-[state=checked]:border-[#C82368] peer-data-[state=checked]:bg-[#C82368] peer-data-[state=checked]:text-white cursor-pointer font-bold text-sm transition-all">58mm</Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="80mm" id="p-80" className="sr-only peer" />
                  <Label htmlFor="p-80" className="flex items-center justify-center h-11 rounded-full border border-neutral-800 bg-neutral-900 text-neutral-300 peer-data-[state=checked]:border-[#C82368] peer-data-[state=checked]:bg-[#C82368] peer-data-[state=checked]:text-white cursor-pointer font-bold text-sm transition-all">80mm</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                  <Scissors className="h-3 w-3 text-[#C82368]" /> Jarak Stoper / Potong
                </Label>
                <span className="text-[10px] font-mono text-emerald-400 font-bold">
                  {paperSize} × {measuredHeightMm}mm
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[1, 3, 5, 8].map((mm) => (
                  <button
                    key={mm}
                    type="button"
                    onClick={() => handleBottomFeedChange(mm)}
                    className={`h-9 rounded-full text-xs font-bold border transition-all ${
                      bottomFeedMm === mm
                        ? 'border-[#C82368] bg-[#C82368] text-white'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {mm}mm
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-neutral-500 leading-relaxed">
                Sesuaikan jarak ekstra di bawah struk agar pas dengan pisau sobek/auto-cutter printer Anda.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <Button className="w-full h-14 rounded-full font-bold text-sm tracking-wide shadow-xl bg-[#C82368] hover:bg-[#a81b56] text-white" onClick={handlePrint}>
                <Printer className="h-5 w-5 mr-2.5" /> CETAK STRUK
              </Button>
              <Button variant="outline" className="w-full h-12 rounded-full font-bold text-xs border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800" onClick={handleDownloadPDF} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Download className="h-4 w-4 mr-2" />} SIMPAN PDF
              </Button>
            </div>
          </div>
        </div>
        <div className="pt-6 border-t border-neutral-800 text-[10px] text-neutral-500 uppercase tracking-widest">
          Nibras House Thermal Receipt
        </div>
      </aside>

      <main id="print-main" className="flex-1 flex justify-center items-start p-4 sm:p-8 md:p-12 overflow-y-auto print:block print:overflow-visible print:p-0 print:m-0">
        <div
          id="print-area"
          ref={printAreaRef}
          className="bg-white shadow-xl rounded-xl print:shadow-none print:rounded-none"
          style={{
            width: paperSize,
            boxSizing: 'border-box',
            padding: `2mm 2.5mm ${bottomFeedMm}mm 2.5mm`,
            fontFamily: 'monospace',
            color: '#000',
            fontSize: '10px',
            lineHeight: '1.2',
            height: 'auto',
            minHeight: 0,
            display: 'block',
          }}
        >
          <div className="text-center mb-3 space-y-1">
            <div className="flex justify-center mb-2">
              <img
                src={logoToUse}
                alt="Logo"
                className="h-14 w-auto object-contain mx-auto"
                onLoad={measureReceiptHeight}
              />
            </div>
            {headerInfo.name && <h2 className="text-sm font-black uppercase leading-tight">{headerInfo.name}</h2>}
            {headerInfo.address && (
              <p className="text-[9px] font-bold uppercase opacity-80">
                {headerInfo.address} {headerInfo.phone && `(Tlp. ${headerInfo.phone})`}
              </p>
            )}
          </div>

          <div className="border-y border-dashed border-black/30 py-2.5 my-2.5 space-y-1 text-[9px]">
            <div className="flex justify-between"><span>NO STRUK:</span><span>{trx.id}</span></div>
            <div className="flex justify-between"><span>TANGGAL:</span><span>{trx.date?.toDate?.()?.toLocaleString('id-ID') || "Baru"}</span></div>
            <div className="flex justify-between"><span>KASIR:</span><span>{(headerInfo.cashier || trx.cashier || "").toUpperCase()}</span></div>
            <div className="pt-1 border-t border-dashed border-black/10 mt-1"><div className="flex justify-between font-bold"><span>CUSTOMER:</span><span className="uppercase">{trx.customerName || "UMUM"}</span></div></div>
          </div>

          <div className="space-y-2 mb-2">
            {consolidatedItems.map((item: any, i: number) => {
              const labelPrice = item.labelPrice || item.price;
              const totalDisc = item.totalNominalDisc || 0;
              const totalLabelPrice = labelPrice * item.quantity;
              const effectiveDiscPct = totalLabelPrice > 0 ? Math.round((totalDisc / totalLabelPrice) * 100) : 0;

              return (
                <div key={i} className="space-y-1 border-b border-dashed border-black/5 pb-2 last:border-none">
                  <div className="flex justify-between items-start gap-2">
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

          <div className="border-t border-dashed border-black/30 pt-2.5 space-y-1.5">
            <div className="flex justify-between text-[9px]"><span>JUMLAH QTY</span><span>{totalQty} PCS</span></div>
            <div className="flex justify-between text-[9px] font-bold"><span>SUBTOTAL (HARGA LABEL)</span><span>Rp{trx.subtotalLabel?.toLocaleString('id-ID')}</span></div>
            <div className="flex justify-between text-[9px] font-bold text-rose-600"><span>TOTAL POTONGAN</span><span>-Rp{trx.totalDiscount?.toLocaleString('id-ID')}</span></div>
            {returnSummary.hasReturn ? (
              <>
                <div className="flex justify-between text-[9px] font-bold"><span>TAGIHAN AWAL</span><span>Rp{returnSummary.originalTotal.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-[9px] font-bold text-rose-600"><span>TOTAL RETUR</span><span>-Rp{returnSummary.totalRefund.toLocaleString('id-ID')}</span></div>
                <div className="border-t border-black/10 pt-1 flex justify-between text-[11px] font-black uppercase"><span>TOTAL BERSIH</span><span>Rp{returnSummary.netTotal.toLocaleString('id-ID')}</span></div>
              </>
            ) : (
              <div className="border-t border-black/10 pt-1 flex justify-between text-[11px] font-black uppercase"><span>TOTAL TAGIHAN</span><span>Rp{returnSummary.netTotal.toLocaleString('id-ID')}</span></div>
            )}

            {trx.paymentMethod?.includes("CASH") && trx.cashReceived > 0 && (
              <div className="pt-2 space-y-1 border-t border-dashed border-black/20 mt-2">
                <div className="flex justify-between text-[9px]"><span>DIBAYAR CASH</span><span>Rp{trx.cashReceived.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-[9px] font-black"><span>KEMBALIAN</span><span>Rp{trx.cashChange.toLocaleString('id-ID')}</span></div>
              </div>
            )}

            {returnSummary.effectiveStatus === 'DP' && (
              <div className="pt-2 space-y-1 border-t border-dashed border-black/20 mt-2">
                <div className="flex justify-between text-[9px] font-bold"><span>TOTAL SUDAH DIBAYAR</span><span>Rp{returnSummary.netPaid.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-[9px] font-black text-rose-600"><span>SISA PELUNASAN</span><span>Rp{returnSummary.netRemaining.toLocaleString('id-ID')}</span></div>
              </div>
            )}
          </div>

          <div className="text-center mt-2.5 space-y-1 text-[8px] opacity-75">
            <p className="font-bold text-[9px]">*** TERIMA KASIH ***</p>
            <p>BARANG YANG SUDAH DIBELI TIDAK DAPAT DITUKAR/DIKEMBALIKAN</p>
          </div>

          {/* Precision Thermal Stopper Marker (triggers end-of-page / auto-cut cleanly) */}
          <div
            id="receipt-stopper"
            className="mt-2 pt-1 border-t border-dashed border-black/30 text-center text-[7px] tracking-[0.25em] leading-none text-black/40 select-none"
          >
            . . . . .
          </div>
        </div>
      </main>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: ${paperSize} ${measuredHeightMm}mm;
              margin: 0mm !important;
            }
            @media print {
              html, body {
                width: ${paperSize} !important;
                height: ${measuredHeightMm}mm !important;
                min-height: 0 !important;
                max-height: ${measuredHeightMm}mm !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: #ffffff !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              aside,
              [role="region"],
              [data-radix-popper-content-wrapper],
              .toaster,
              [data-sonner-toaster] {
                display: none !important;
                height: 0 !important;
                overflow: hidden !important;
              }
              #print-page-wrapper,
              #print-main {
                display: block !important;
                min-height: 0 !important;
                height: auto !important;
                max-height: ${measuredHeightMm}mm !important;
                width: ${paperSize} !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                background: #ffffff !important;
              }
              #print-area {
                width: ${paperSize} !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: ${measuredHeightMm}mm !important;
                overflow: hidden !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                page-break-before: avoid !important;
                break-before: avoid !important;
                page-break-after: avoid !important;
                break-after: avoid !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
