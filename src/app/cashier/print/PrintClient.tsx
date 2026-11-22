'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Printer, ArrowLeft, Download, Loader2, Info, Scissors, Store, Image as ImageIcon } from 'lucide-react';
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
  // Default OFF on POS-58 so printing starts immediately with text at 2mm from the top without any blank logo gap
  const [showLogo, setShowLogo] = useState<boolean>(false);
  const [measuredHeightMm, setMeasuredHeightMm] = useState<number>(75);
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
      const savedShowLogo = localStorage.getItem('nh_print_show_logo');

      if (savedPaper === '58mm' || savedPaper === '80mm') {
        setPaperSize(savedPaper);
      }
      if (savedTop && !Number.isNaN(Number(savedTop))) {
        setTopMarginMm(Number(savedTop));
      }
      if (savedFeed && !Number.isNaN(Number(savedFeed))) {
        setBottomFeedMm(Number(savedFeed));
      }
      if (savedShowLogo === 'true') {
        setShowLogo(true);
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

  const handleToggleLogo = (next: boolean) => {
    setShowLogo(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nh_print_show_logo', String(next));
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
  }, [trx, paperSize, topMarginMm, bottomFeedMm, showLogo, headerInfo, brandData, measureReceiptHeight]);

  /**
   * Direct Top-Zero Print for POS-58 / POS-80:
   * - `#print-area` is the VERY FIRST element in the DOM (`offsetTop = 0`, `offsetLeft = 0`).
   * - No hidden iframe, no flex wrapper, no custom `@page { size: W H }` that triggers Chromium's
   *   vertical centering (`(driver_height - css_height) / 2`) on POS-58's 210mm/297mm roll.
   * - Resets scroll position to (0, 0) and calls `window.print()` directly.
   */
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
      measureReceiptHeight();
      window.print();
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
      className="min-h-screen bg-[#F5F3F0] flex flex-col md:flex-row-reverse print:min-h-0 print:h-auto print:block print:bg-white print:p-0 print:m-0"
    >
      {/* =====================================================================
          1. RECEIPT AREA (MUST BE FIRST CHILD IN DOM SO TOP OFFSET IS ALWAYS 0mm)
          ===================================================================== */}
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
            maxWidth: `${printableWidthMm}mm`,
            boxSizing: 'border-box',
            margin: 0,
            paddingTop: `${topMarginMm}mm`,
            paddingRight: '1mm',
            paddingBottom: `${bottomFeedMm}mm`,
            paddingLeft: '1mm',
            fontFamily: "'Courier New', Courier, monospace",
            color: '#000000',
            backgroundColor: '#ffffff',
            fontSize: '10px',
            lineHeight: '1.18',
            fontWeight: 700,
            height: 'auto',
            minHeight: 0,
            display: 'block',
          }}
        >
          {/* HEADER TOKO (Langsung mulai di 2mm dari ujung atas kertas) */}
          <div style={{ textAlign: 'center', marginBottom: '1.5mm', marginTop: 0, paddingTop: 0 }}>
            {showLogo && (
              <div style={{ textAlign: 'center', marginBottom: '1mm', marginTop: 0 }}>
                <img
                  src={logoToUse}
                  alt="Logo"
                  style={{
                    height: '8mm',
                    maxHeight: '8mm',
                    width: 'auto',
                    maxWidth: '34mm',
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto',
                  }}
                  onLoad={measureReceiptHeight}
                />
              </div>
            )}
            <div
              style={{
                fontSize: '12px',
                fontWeight: 900,
                textTransform: 'uppercase',
                lineHeight: '1.15',
                color: '#000000',
                margin: 0,
                padding: 0,
              }}
            >
              {activeStoreName}
            </div>
            {(headerInfo.address || headerInfo.phone) && (
              <div
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#000000',
                  marginTop: '0.5mm',
                }}
              >
                {headerInfo.address} {headerInfo.phone && `(Tlp. ${headerInfo.phone})`}
              </div>
            )}
          </div>

          {/* META TRANSAKSI */}
          <div
            style={{
              borderTop: '1px dashed #000000',
              borderBottom: '1px dashed #000000',
              paddingTop: '1.2mm',
              paddingBottom: '1.2mm',
              marginTop: '1.2mm',
              marginBottom: '1.2mm',
              fontSize: '9px',
              color: '#000000',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>NO STRUK:</span>
              <span style={{ fontWeight: 900 }}>{trx.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6mm' }}>
              <span>TANGGAL:</span>
              <span>{trx.date?.toDate?.()?.toLocaleString('id-ID') || 'Baru'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6mm' }}>
              <span>KASIR:</span>
              <span style={{ fontWeight: 900 }}>{activeCashierName}</span>
            </div>
            <div
              style={{
                borderTop: '1px dashed #000000',
                paddingTop: '0.8mm',
                marginTop: '0.8mm',
                display: 'flex',
                justifyContent: 'space-between',
                fontWeight: 900,
              }}
            >
              <span>CUSTOMER:</span>
              <span style={{ textTransform: 'uppercase' }}>{trx.customerName || 'UMUM'}</span>
            </div>
          </div>

          {/* DAFTAR ITEM */}
          <div style={{ marginBottom: '1.2mm', color: '#000000' }}>
            {consolidatedItems.map((item: any, i: number) => {
              const labelPrice = item.labelPrice || item.price;
              const totalDisc = item.totalNominalDisc || 0;
              const totalLabelPrice = labelPrice * item.quantity;
              const effectiveDiscPct = totalLabelPrice > 0 ? Math.round((totalDisc / totalLabelPrice) * 100) : 0;
              const isLast = i === consolidatedItems.length - 1;

              return (
                <div
                  key={i}
                  style={{
                    paddingBottom: isLast ? '0.5mm' : '1.2mm',
                    marginBottom: isLast ? 0 : '1.2mm',
                    borderBottom: isLast ? 'none' : '1px dashed #000000',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '4px' }}>
                    <span
                      style={{
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        lineHeight: '1.15',
                        fontSize: '9.5px',
                        flex: 1,
                        color: '#000000',
                      }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontWeight: 900,
                        fontSize: '9.5px',
                        whiteSpace: 'nowrap',
                        textAlign: 'right',
                        color: '#000000',
                      }}
                    >
                      Rp{labelPrice.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '8.5px',
                      fontStyle: 'italic',
                      fontWeight: 700,
                      color: '#000000',
                      marginTop: '0.4mm',
                    }}
                  >
                    {item.series || item.category} | {item.size} | {item.quantity}x @Rp
                    {labelPrice.toLocaleString('id-ID')}
                    {totalDisc > 0 && ` (disc ${effectiveDiscPct}% | Rp${totalDisc.toLocaleString('id-ID')})`}
                  </div>
                </div>
              );
            })}
          </div>

          {/* RINGKASAN PEMBAYARAN */}
          <div
            style={{
              borderTop: '1px dashed #000000',
              paddingTop: '1.2mm',
              color: '#000000',
              fontSize: '9px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
              <span>JUMLAH QTY</span>
              <span>{totalQty} PCS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '0.6mm' }}>
              <span>SUBTOTAL (HARGA LABEL)</span>
              <span>Rp{trx.subtotalLabel?.toLocaleString('id-ID')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '0.6mm' }}>
              <span>TOTAL POTONGAN</span>
              <span>-Rp{trx.totalDiscount?.toLocaleString('id-ID')}</span>
            </div>

            {returnSummary.hasReturn ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '0.6mm' }}>
                  <span>TAGIHAN AWAL</span>
                  <span>Rp{returnSummary.originalTotal.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '0.6mm' }}>
                  <span>TOTAL RETUR</span>
                  <span>-Rp{returnSummary.totalRefund.toLocaleString('id-ID')}</span>
                </div>
                <div
                  style={{
                    borderTop: '1px dashed #000000',
                    paddingTop: '0.8mm',
                    marginTop: '0.8mm',
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '10.5px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                  }}
                >
                  <span>TOTAL BERSIH</span>
                  <span>Rp{returnSummary.netTotal.toLocaleString('id-ID')}</span>
                </div>
              </>
            ) : (
              <div
                style={{
                  borderTop: '1px dashed #000000',
                  paddingTop: '0.8mm',
                  marginTop: '0.8mm',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '10.5px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                }}
              >
                <span>TOTAL TAGIHAN</span>
                <span>Rp{returnSummary.netTotal.toLocaleString('id-ID')}</span>
              </div>
            )}

            {trx.paymentMethod?.includes('CASH') && trx.cashReceived > 0 && (
              <div
                style={{
                  paddingTop: '1mm',
                  marginTop: '1mm',
                  borderTop: '1px dashed #000000',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>DIBAYAR CASH</span>
                  <span>Rp{trx.cashReceived.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, marginTop: '0.5mm' }}>
                  <span>KEMBALIAN</span>
                  <span>Rp{trx.cashChange.toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}

            {returnSummary.effectiveStatus === 'DP' && (
              <div
                style={{
                  paddingTop: '1mm',
                  marginTop: '1mm',
                  borderTop: '1px dashed #000000',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                  <span>TOTAL SUDAH DIBAYAR</span>
                  <span>Rp{returnSummary.netPaid.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, marginTop: '0.5mm' }}>
                  <span>SISA PELUNASAN</span>
                  <span>Rp{returnSummary.netRemaining.toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER STRUK */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '1.5mm',
              fontSize: '8px',
              fontWeight: 700,
              color: '#000000',
            }}
          >
            <div style={{ fontWeight: 900, fontSize: '9px' }}>*** TERIMA KASIH ***</div>
            <div style={{ marginTop: '0.5mm' }}>BARANG YANG SUDAH DIBELI TIDAK DAPAT DITUKAR/DIKEMBALIKAN</div>
          </div>

          {/* STOPER AKHIR STRUK */}
          <div
            id="receipt-stopper"
            style={{
              marginTop: '1mm',
              paddingTop: '0.8mm',
              borderTop: '1px dashed #000000',
              textAlign: 'center',
              fontSize: '8px',
              fontWeight: 900,
              letterSpacing: '2px',
              lineHeight: 1,
              color: '#000000',
            }}
          >
            -----
          </div>
        </div>
      </main>

      {/* =====================================================================
          2. PRINT CONTROLS SIDEBAR (SECOND CHILD IN DOM, HIDDEN DURING PRINT)
          ===================================================================== */}
      <aside
        id="print-controls"
        className="w-full md:w-[360px] bg-neutral-950 text-white p-5 sm:p-6 space-y-6 print:hidden shrink-0 flex flex-col justify-between overflow-y-auto"
      >
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
              POS-58 TOP-2MM
            </Badge>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-white">Cetak Struk Thermal</h2>
              <p className="text-xs text-neutral-400 mt-1">
                Struk berada di urutan #1 DOM (koordinat 0,0) — langsung mencetak mulai 2mm dari ujung atas kertas.
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

            {/* Opsi Gambar Logo */}
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-3.5 w-3.5 text-[#C82368]" />
                <span className="text-[11px] font-bold text-neutral-200">Tampilkan Gambar Logo di Atas</span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleLogo(!showLogo)}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                  showLogo ? 'bg-[#C82368] text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {showLogo ? 'AKTIF' : 'NONAKTIF (MULAI TEKS 2MM)'}
              </button>
            </div>

            <div className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 flex items-center justify-between text-[10px]">
              <span className="text-neutral-400">Dimensi Cetak Aktif:</span>
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

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: auto;
              margin: 0mm !important;
            }
            @media print {
              html, body {
                margin: 0mm !important;
                padding: 0mm !important;
                width: ${printableWidthMm}mm !important;
                max-width: ${printableWidthMm}mm !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                background: #ffffff !important;
                color: #000000 !important;
                display: block !important;
                overflow: visible !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              #print-controls,
              aside,
              nextjs-portal,
              [role="region"],
              [data-radix-popper-content-wrapper],
              .toaster,
              [data-sonner-toaster] {
                display: none !important;
                height: 0 !important;
                width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
              }
              #print-page-wrapper,
              #print-main {
                display: block !important;
                position: static !important;
                width: ${printableWidthMm}mm !important;
                max-width: ${printableWidthMm}mm !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                margin: 0mm !important;
                padding: 0mm !important;
                background: #ffffff !important;
                overflow: visible !important;
              }
              #print-area {
                display: block !important;
                position: static !important;
                width: ${printableWidthMm}mm !important;
                max-width: ${printableWidthMm}mm !important;
                margin: 0mm !important;
                padding: ${topMarginMm}mm 1mm ${bottomFeedMm}mm 1mm !important;
                box-sizing: border-box !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                background: #ffffff !important;
                color: #000000 !important;
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
