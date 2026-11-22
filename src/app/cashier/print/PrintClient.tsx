'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Printer, ArrowLeft, Download, Loader2, Info, Scissors, Store } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { getTrxReturnSummary } from '@/components/cashier/types';

const DEFAULT_LOGO_URL = 'https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png';
const PX_TO_MM = 25.4 / 96; // Standard CSS 96 DPI -> mm

const DEFAULT_STORE_NAMES: Record<string, string> = {
  TOKO_A: 'NIBRAS HOUSE KWT',
  TOKO_B: 'IND CO',
  TOKO_C: 'NIBRAS HOUSE GDM',
};

export default function PrintClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  const trxId = searchParams.get('id');
  const storeIdParam = searchParams.get('store') || 'TOKO_A';
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>('58mm');
  const [topMarginMm, setTopMarginMm] = useState<number>(2);
  const [bottomFeedMm, setBottomFeedMm] = useState<number>(2);
  const [measuredHeightMm, setMeasuredHeightMm] = useState<number>(85);
  const [isGenerating, setIsGenerating] = useState(false);

  const printAreaRef = useRef<HTMLDivElement | null>(null);
  const [headerInfo, setHeaderInfo] = useState({
    name: DEFAULT_STORE_NAMES[storeIdParam] || 'NIBRAS HOUSE',
    address: '',
    phone: '',
    cashier: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const defaultName = DEFAULT_STORE_NAMES[storeIdParam] || 'NIBRAS HOUSE';
      const name = localStorage.getItem(`nh_store_name_${storeIdParam}`);
      const address = localStorage.getItem(`nh_store_address_${storeIdParam}`);
      const phone = localStorage.getItem(`nh_store_phone_${storeIdParam}`);
      const cashier = localStorage.getItem('nibras_house_cashier_name');
      const savedPaper = localStorage.getItem('nh_print_paper_size');
      const savedTop = localStorage.getItem('nh_print_top_margin_mm');
      const savedFeed = localStorage.getItem('nh_print_bottom_feed_mm');

      if (savedPaper === '58mm' || savedPaper === '80mm') {
        setPaperSize(savedPaper);
      }
      if (savedTop && !Number.isNaN(Number(savedTop))) {
        setTopMarginMm(Number(savedTop));
      }
      if (savedFeed && !Number.isNaN(Number(savedFeed))) {
        setBottomFeedMm(Number(savedFeed));
      }

      setHeaderInfo({
        name: name && name.trim() ? name.trim() : defaultName,
        address: address || '',
        phone: phone || '',
        cashier: cashier || '',
      });
    }
  }, [storeIdParam]);

  const handleHeaderChange = (field: 'name' | 'address' | 'phone' | 'cashier', value: string) => {
    setHeaderInfo((prev) => ({ ...prev, [field]: value }));
    if (typeof window !== 'undefined') {
      if (field === 'name') localStorage.setItem(`nh_store_name_${storeIdParam}`, value);
      if (field === 'address') localStorage.setItem(`nh_store_address_${storeIdParam}`, value);
      if (field === 'phone') localStorage.setItem(`nh_store_phone_${storeIdParam}`, value);
      if (field === 'cashier') localStorage.setItem('nibras_house_cashier_name', value);
    }
  };

  const handlePaperSizeChange = (val: '58mm' | '80mm') => {
    setPaperSize(val);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nh_print_paper_size', val);
    }
  };

  const handleTopMarginChange = (mm: number) => {
    setTopMarginMm(mm);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nh_print_top_margin_mm', String(mm));
    }
  };

  const handleBottomFeedChange = (mm: number) => {
    setBottomFeedMm(mm);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nh_print_bottom_feed_mm', String(mm));
    }
  };

  const trxRef = useMemoFirebase(
    () => (trxId && user ? doc(db, 'stores', storeIdParam, 'transactions', trxId) : null),
    [db, storeIdParam, trxId, user]
  );
  const { data: trx, isLoading: isDocLoading } = useDoc<any>(trxRef);

  const brandRef = useMemoFirebase(() => doc(db, 'settings', 'brand'), [db]);
  const { data: brandData } = useDoc<any>(brandRef);

  // Printable width for POS-58 driver is 48mm; for POS-80 driver is 72mm
  const printableWidthMm = paperSize === '58mm' ? 48 : 72;

  const measureReceiptHeight = useCallback(() => {
    const el = printAreaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rawPx = Math.max(el.scrollHeight, rect.height);
    if (rawPx > 0) {
      const exactMm = Math.ceil(rawPx * PX_TO_MM);
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
  }, [trx, paperSize, topMarginMm, bottomFeedMm, headerInfo, brandData, measureReceiptHeight]);

  /**
   * POS-58 / POS-80 Direct Top-Zero Thermal Print Engine:
   * - CRITICAL FOR POS-58 DRIVER: Uses `@page { size: auto; margin: 0mm !important; }`!
   *   Why? Because passing a short custom `@page { size: 58mm 90mm }` causes Windows GDI / Chrome
   *   to vertically center the 90mm page inside POS-58's default 58x210mm or 58x297mm roll,
   *   which creates a huge ~100mm blank gap at the TOP before printing starts!
   * - With `@page { size: auto; margin: 0mm; }` and `#thermal-receipt-root` anchored at
   *   `position: absolute; top: 0mm; left: 0mm; padding-top: 2mm;`, printing starts IMMEDIATELY
   *   at 2mm from the top edge of the paper, and the POS-58 driver automatically stops feeding
   *   at the last black pixel (`#receipt-stopper`).
   */
  const handlePrint = () => {
    const el = printAreaRef.current;
    if (!el) {
      window.print();
      return;
    }

    const existingIframe = document.getElementById('thermal-print-iframe') as HTMLIFrameElement | null;
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = `${printableWidthMm}mm`;
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc || !iframe.contentWindow) {
      window.print();
      return;
    }

    const receiptHtml = el.innerHTML;

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Struk ${trx?.id || ''}</title>
  <style>
    @page {
      size: auto;
      margin: 0mm !important;
    }
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0mm !important;
      padding: 0mm !important;
      width: ${printableWidthMm}mm !important;
      max-width: ${printableWidthMm}mm !important;
      height: auto !important;
      min-height: 0 !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier New', Courier, monospace !important;
      font-size: 10px !important;
      line-height: 1.2 !important;
      font-weight: 700 !important;
    }
    #thermal-receipt-root {
      position: relative !important;
      top: 0mm !important;
      left: 0mm !important;
      width: ${printableWidthMm}mm !important;
      max-width: ${printableWidthMm}mm !important;
      margin: 0mm !important;
      padding: ${topMarginMm}mm 1mm ${bottomFeedMm}mm 1mm !important;
      background: #ffffff !important;
      color: #000000 !important;
      height: auto !important;
      min-height: 0 !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
    .text-center { text-align: center !important; }
    .text-right { text-align: right !important; }
    .uppercase { text-transform: uppercase !important; }
    .italic { font-style: italic !important; }
    .font-black, .font-bold { font-weight: 800 !important; }
    .flex { display: flex !important; }
    .justify-center { justify-content: center !important; }
    .justify-between { justify-content: space-between !important; }
    .items-start { align-items: flex-start !important; }
    .flex-1 { flex: 1 1 0% !important; }
    .whitespace-nowrap { white-space: nowrap !important; }
    .gap-2 { gap: 4px !important; }
    .mb-1 { margin-bottom: 0.8mm !important; }
    .mb-2 { margin-bottom: 1.2mm !important; }
    .mt-1 { margin-top: 0.8mm !important; }
    .mt-1\\.5 { margin-top: 1mm !important; }
    .mt-2 { margin-top: 1.2mm !important; }
    .my-2 { margin-top: 1.2mm !important; margin-bottom: 1.2mm !important; }
    .py-2 { padding-top: 1.2mm !important; padding-bottom: 1.2mm !important; }
    .pt-1 { padding-top: 0.8mm !important; }
    .pt-1\\.5 { padding-top: 1mm !important; }
    .pt-2 { padding-top: 1.2mm !important; }
    .pb-2 { padding-bottom: 1.2mm !important; }
    .space-y-1 > * + * { margin-top: 0.8mm !important; }
    .space-y-2 > * + * { margin-top: 1.2mm !important; }
    .border-y { border-top: 1px dashed #000000 !important; border-bottom: 1px dashed #000000 !important; }
    .border-t { border-top: 1px dashed #000000 !important; }
    .border-b { border-bottom: 1px dashed #000000 !important; }
    .last\\:border-none:last-child { border-bottom: none !important; }
    .text-sm { font-size: 11.5px !important; line-height: 1.15 !important; }
    .text-\\[11px\\] { font-size: 10.5px !important; }
    .text-\\[10px\\] { font-size: 9.5px !important; }
    .text-\\[9px\\] { font-size: 9px !important; }
    .text-\\[8px\\] { font-size: 8px !important; }
    img {
      display: block !important;
      margin: 0 auto 1mm auto !important;
      max-height: 10mm !important;
      width: auto !important;
      max-width: 75% !important;
      object-fit: contain !important;
      filter: grayscale(100%) contrast(180%) !important;
    }
    #receipt-stopper {
      margin-top: 1mm !important;
      padding-top: 0.8mm !important;
      border-top: 1px dashed #000000 !important;
      text-align: center !important;
      font-size: 8px !important;
      letter-spacing: 2px !important;
    }
  </style>
</head>
<body>
  <div id="thermal-receipt-root">${receiptHtml}</div>
</body>
</html>`);
    iframeDoc.close();

    const triggerIframePrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('[THERMAL PRINT ERROR]:', e);
        window.print();
      }
    };

    const imgs = Array.from(iframeDoc.images);
    if (imgs.length === 0 || imgs.every((img) => img.complete)) {
      setTimeout(triggerIframePrint, 60);
    } else {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        setTimeout(triggerIframePrint, 60);
      };
      imgs.forEach((img) => {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
      });
      setTimeout(done, 700);
    }
  };

  const handleDownloadPDF = async () => {
    if (!trx) return;
    setIsGenerating(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const element = printAreaRef.current || document.getElementById('print-area');
      if (!element) throw new Error('Print area not found');
      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        height: element.scrollHeight,
        windowHeight: element.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = paperSize === '58mm' ? 58 : 80;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [pdfWidth, pdfHeight] });
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`struk-${trx.id}.pdf`);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isUserLoading || isDocLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="text-xs font-black uppercase">Memuat Data Antrean Cetak...</p>
      </div>
    );
  }
  if (!user || !trx) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Info className="h-12 w-12 text-rose-500" />
        <h1 className="text-xl font-black">Data Transaksi Tidak Ditemukan</h1>
        <Button onClick={() => router.back()}>Kembali</Button>
      </div>
    );
  }

  // CONSOLIDATE IDENTICAL ITEMS BY NAME (Peleburan Item Identik)
  const returnSummary = getTrxReturnSummary(trx);
  const sourceItems = Array.isArray(trx.originalItems) ? trx.originalItems : trx.items || [];
  const consolidatedItems =
    sourceItems.reduce((acc: any[], item: any) => {
      const itemName = (item.name || '').toUpperCase();
      const existing = acc.find((i) => i.name.toUpperCase() === itemName && i.variantId === item.variantId);
      const labelPrice = item.labelPrice || item.price;
      const qty = item.quantity || 1;
      const itemDiscTotal =
        (item.storeDiscountPercent > 0
          ? (labelPrice * item.storeDiscountPercent) / 100
          : item.storeDiscountNominal || 0) * qty;

      if (existing) {
        existing.quantity += qty;
        existing.totalNominalDisc += itemDiscTotal;
      } else {
        acc.push({ ...item, labelPrice, totalNominalDisc: itemDiscTotal });
      }
      return acc;
    }, []) || [];

  const totalQty = consolidatedItems.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
  // Use Cloudinary e_trim to strip any transparent dead space around the PNG logo so top margin is exact 2mm
  const rawLogo = brandData?.receiptLogoUrl || DEFAULT_LOGO_URL;
  const logoToUse = rawLogo.includes('/image/upload/v')
    ? rawLogo.replace('/image/upload/v', '/image/upload/e_trim/v')
    : rawLogo;

  const activeStoreName = headerInfo.name || DEFAULT_STORE_NAMES[storeIdParam] || 'NIBRAS HOUSE';
  const activeCashierName = (
    headerInfo.cashier ||
    trx.cashier ||
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'KASIR'
  ).toUpperCase();

  return (
    <div
      id="print-page-wrapper"
      className="min-h-screen bg-[#F5F3F0] flex flex-col md:flex-row print:min-h-0 print:h-auto print:block print:bg-white print:p-0 print:m-0"
    >
      <aside className="w-full md:w-[360px] bg-neutral-950 text-white p-5 sm:p-6 space-y-6 print:hidden shrink-0 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="rounded-full text-neutral-300 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" /> Kembali
            </Button>
            <Badge className="bg-[#C82368] text-white border-none rounded-full px-3 py-1 font-bold text-[10px] tracking-widest">
              POS-58 / POS-80 READY
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-white">Cetak Struk Thermal</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Mode Driver POS-58 Aktif: Mulai cetak langsung dari atas (margin atas 2mm) tanpa jeda kosong.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Pilih Ukuran Kertas Thermal
              </Label>
              <RadioGroup
                value={paperSize}
                onValueChange={(v: any) => handlePaperSizeChange(v)}
                className="grid grid-cols-2 gap-3"
              >
                <div className="relative">
                  <RadioGroupItem value="58mm" id="p-58" className="sr-only peer" />
                  <Label
                    htmlFor="p-58"
                    className="flex flex-col items-center justify-center h-12 rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-300 peer-data-[state=checked]:border-[#C82368] peer-data-[state=checked]:bg-[#C82368] peer-data-[state=checked]:text-white cursor-pointer font-bold text-xs transition-all"
                  >
                    <span>58mm (POS-58)</span>
                    <span className="text-[9px] font-normal opacity-80">Area Cetak 48mm</span>
                  </Label>
                </div>
                <div className="relative">
                  <RadioGroupItem value="80mm" id="p-80" className="sr-only peer" />
                  <Label
                    htmlFor="p-80"
                    className="flex flex-col items-center justify-center h-12 rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-300 peer-data-[state=checked]:border-[#C82368] peer-data-[state=checked]:bg-[#C82368] peer-data-[state=checked]:text-white cursor-pointer font-bold text-xs transition-all"
                  >
                    <span>80mm (POS-80)</span>
                    <span className="text-[9px] font-normal opacity-80">Area Cetak 72mm</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                  Margin Mulai Atas
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0, 2, 4].map((mm) => (
                    <button
                      key={mm}
                      type="button"
                      onClick={() => handleTopMarginChange(mm)}
                      className={`h-8 rounded-xl text-xs font-bold border transition-all ${
                        topMarginMm === mm
                          ? 'border-[#C82368] bg-[#C82368] text-white'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {mm}mm
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1">
                  <Scissors className="h-3 w-3 text-[#C82368]" /> Stoper Bawah
                </Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0, 2, 4].map((mm) => (
                    <button
                      key={mm}
                      type="button"
                      onClick={() => handleBottomFeedChange(mm)}
                      className={`h-8 rounded-xl text-xs font-bold border transition-all ${
                        bottomFeedMm === mm
                          ? 'border-[#C82368] bg-[#C82368] text-white'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {mm}mm
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400">Estimasi Panjang Struk:</span>
              <span className="font-mono font-bold text-emerald-400">
                {paperSize} × {measuredHeightMm}mm (Atas: {topMarginMm}mm)
              </span>
            </div>

            {/* Pengaturan Nama Toko & Kasir di Struk */}
            <div className="space-y-2.5 pt-2 border-t border-neutral-800">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 flex items-center gap-1.5">
                <Store className="h-3 w-3 text-[#C82368]" /> Identitas Toko &amp; Kasir di Struk
              </Label>
              <div className="space-y-2">
                <Input
                  value={headerInfo.name}
                  onChange={(e) => handleHeaderChange('name', e.target.value)}
                  placeholder="Nama Toko (misal: NIBRAS HOUSE KWT)"
                  className="h-9 bg-neutral-900 border-neutral-800 text-white text-xs rounded-xl"
                />
                <Input
                  value={headerInfo.address}
                  onChange={(e) => handleHeaderChange('address', e.target.value)}
                  placeholder="Alamat Toko (opsional)"
                  className="h-9 bg-neutral-900 border-neutral-800 text-white text-xs rounded-xl"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={headerInfo.phone}
                    onChange={(e) => handleHeaderChange('phone', e.target.value)}
                    placeholder="No. Telp Toko"
                    className="h-9 bg-neutral-900 border-neutral-800 text-white text-xs rounded-xl"
                  />
                  <Input
                    value={headerInfo.cashier}
                    onChange={(e) => handleHeaderChange('cashier', e.target.value)}
                    placeholder="Nama Kasir"
                    className="h-9 bg-neutral-900 border-neutral-800 text-white text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <Button
                className="w-full h-13 rounded-full font-bold text-sm tracking-wide shadow-xl bg-[#C82368] hover:bg-[#a81b56] text-white"
                onClick={handlePrint}
              >
                <Printer className="h-5 w-5 mr-2.5" /> CETAK STRUK SEKARANG
              </Button>
              <Button
                variant="outline"
                className="w-full h-11 rounded-full font-bold text-xs border-neutral-700 bg-neutral-900 text-white hover:bg-neutral-800"
                onClick={handleDownloadPDF}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}{' '}
                SIMPAN PDF
              </Button>
            </div>
          </div>
        </div>
        <div className="pt-4 border-t border-neutral-800 text-[10px] text-neutral-500 uppercase tracking-widest">
          Nibras House Thermal Receipt
        </div>
      </aside>

      <main
        id="print-main"
        className="flex-1 flex justify-center items-start p-4 sm:p-8 md:p-12 overflow-y-auto print:block print:overflow-visible print:p-0 print:m-0"
      >
        <div
          id="print-area"
          ref={printAreaRef}
          className="bg-white shadow-xl rounded-xl print:shadow-none print:rounded-none"
          style={{
            width: `${printableWidthMm}mm`,
            boxSizing: 'border-box',
            padding: `${topMarginMm}mm 1mm ${bottomFeedMm}mm 1mm`,
            fontFamily: "'Courier New', Courier, monospace",
            color: '#000000',
            fontSize: '10px',
            lineHeight: '1.2',
            fontWeight: 700,
            height: 'fit-content',
            minHeight: 0,
            display: 'block',
          }}
        >
          <div className="text-center mb-1.5 space-y-1">
            <div className="flex justify-center mb-1">
              <img
                src={logoToUse}
                alt="Logo"
                className="h-10 w-auto object-contain mx-auto"
                onLoad={measureReceiptHeight}
              />
            </div>
            <h2 className="text-sm font-black uppercase leading-tight text-black">{activeStoreName}</h2>
            {(headerInfo.address || headerInfo.phone) && (
              <p className="text-[9px] font-bold uppercase text-black">
                {headerInfo.address} {headerInfo.phone && `(Tlp. ${headerInfo.phone})`}
              </p>
            )}
          </div>

          <div className="border-y border-dashed border-black py-1.5 my-1.5 space-y-1 text-[9px] text-black">
            <div className="flex justify-between">
              <span>NO STRUK:</span>
              <span className="font-black">{trx.id}</span>
            </div>
            <div className="flex justify-between">
              <span>TANGGAL:</span>
              <span>{trx.date?.toDate?.()?.toLocaleString('id-ID') || 'Baru'}</span>
            </div>
            <div className="flex justify-between">
              <span>KASIR:</span>
              <span className="font-black">{activeCashierName}</span>
            </div>
            <div className="pt-1 border-t border-dashed border-black mt-1">
              <div className="flex justify-between font-black">
                <span>CUSTOMER:</span>
                <span className="uppercase">{trx.customerName || 'UMUM'}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 mb-1.5 text-black">
            {consolidatedItems.map((item: any, i: number) => {
              const labelPrice = item.labelPrice || item.price;
              const totalDisc = item.totalNominalDisc || 0;
              const totalLabelPrice = labelPrice * item.quantity;
              const effectiveDiscPct = totalLabelPrice > 0 ? Math.round((totalDisc / totalLabelPrice) * 100) : 0;

              return (
                <div key={i} className="space-y-1 border-b border-dashed border-black pb-1.5 last:border-none">
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-black uppercase leading-tight text-[10px] flex-1 text-black">{item.name}</p>
                    <p className="font-black text-[10px] whitespace-nowrap text-right text-black">
                      Rp{labelPrice.toLocaleString('id-ID')}
                    </p>
                  </div>
                  <p className="text-[9px] italic font-bold text-black">
                    {item.series || item.category} | {item.size} | {item.quantity}x @Rp
                    {labelPrice.toLocaleString('id-ID')}
                    {totalDisc > 0 && ` (disc ${effectiveDiscPct}% | Rp${totalDisc.toLocaleString('id-ID')})`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="border-t border-dashed border-black pt-1.5 space-y-1 text-black">
            <div className="flex justify-between text-[9px] font-bold">
              <span>JUMLAH QTY</span>
              <span>{totalQty} PCS</span>
            </div>
            <div className="flex justify-between text-[9px] font-bold">
              <span>SUBTOTAL (HARGA LABEL)</span>
              <span>Rp{trx.subtotalLabel?.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-[9px] font-bold">
              <span>TOTAL POTONGAN</span>
              <span>-Rp{trx.totalDiscount?.toLocaleString('id-ID')}</span>
            </div>
            {returnSummary.hasReturn ? (
              <>
                <div className="flex justify-between text-[9px] font-bold">
                  <span>TAGIHAN AWAL</span>
                  <span>Rp{returnSummary.originalTotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[9px] font-bold">
                  <span>TOTAL RETUR</span>
                  <span>-Rp{returnSummary.totalRefund.toLocaleString('id-ID')}</span>
                </div>
                <div className="border-t border-dashed border-black pt-1 flex justify-between text-[11px] font-black uppercase">
                  <span>TOTAL BERSIH</span>
                  <span>Rp{returnSummary.netTotal.toLocaleString('id-ID')}</span>
                </div>
              </>
            ) : (
              <div className="border-t border-dashed border-black pt-1 flex justify-between text-[11px] font-black uppercase">
                <span>TOTAL TAGIHAN</span>
                <span>Rp{returnSummary.netTotal.toLocaleString('id-ID')}</span>
              </div>
            )}

            {trx.paymentMethod?.includes('CASH') && trx.cashReceived > 0 && (
              <div className="pt-1.5 space-y-1 border-t border-dashed border-black mt-1.5">
                <div className="flex justify-between text-[9px] font-bold">
                  <span>DIBAYAR CASH</span>
                  <span>Rp{trx.cashReceived.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[9px] font-black">
                  <span>KEMBALIAN</span>
                  <span>Rp{trx.cashChange.toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}

            {returnSummary.effectiveStatus === 'DP' && (
              <div className="pt-1.5 space-y-1 border-t border-dashed border-black mt-1.5">
                <div className="flex justify-between text-[9px] font-bold">
                  <span>TOTAL SUDAH DIBAYAR</span>
                  <span>Rp{returnSummary.netPaid.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[9px] font-black">
                  <span>SISA PELUNASAN</span>
                  <span>Rp{returnSummary.netRemaining.toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-1.5 space-y-1 text-[8px] font-bold text-black">
            <p className="font-black text-[9px]">*** TERIMA KASIH ***</p>
            <p>BARANG YANG SUDAH DIBELI TIDAK DAPAT DITUKAR/DIKEMBALIKAN</p>
          </div>

          {/* Precision Thermal Stopper Marker */}
          <div
            id="receipt-stopper"
            className="mt-1 pt-1 border-t border-dashed border-black text-center text-[8px] font-black tracking-[0.25em] leading-none text-black select-none"
          >
            -----
          </div>
        </div>
      </main>

      {/* Fallback @media print if user presses Ctrl+P directly on the page */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: auto;
              margin: 0mm !important;
            }
            @media print {
              html, body {
                width: ${printableWidthMm}mm !important;
                max-width: ${printableWidthMm}mm !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0mm !important;
                padding: 0mm !important;
                background: #ffffff !important;
                color: #000000 !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              aside,
              #thermal-print-iframe,
              [role="region"],
              [data-radix-popper-content-wrapper],
              .toaster,
              [data-sonner-toaster] {
                display: none !important;
              }
              #print-page-wrapper,
              #print-main {
                display: block !important;
                position: static !important;
                width: ${printableWidthMm}mm !important;
                height: auto !important;
                min-height: 0 !important;
                margin: 0mm !important;
                padding: 0mm !important;
                background: #ffffff !important;
              }
              #print-area {
                position: absolute !important;
                top: 0mm !important;
                left: 0mm !important;
                width: ${printableWidthMm}mm !important;
                max-width: ${printableWidthMm}mm !important;
                margin: 0mm !important;
                padding: ${topMarginMm}mm 1mm ${bottomFeedMm}mm 1mm !important;
                box-sizing: border-box !important;
                box-shadow: none !important;
                border-radius: 0 !important;
                height: auto !important;
                min-height: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
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
