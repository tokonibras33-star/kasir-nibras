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
import { getItemUnitNetPrice, getTrxReturnSummary } from '@/components/cashier/types';

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
  const [showLogo, setShowLogo] = useState<boolean>(true);
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
      if (savedShowLogo !== null) {
        setShowLogo(savedShowLogo === 'true');
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
          1. RECEIPT AREA (FIRST CHILD IN DOM SO TOP OFFSET IS ALWAYS 0mm)
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
            paddingRight: '1.5mm',
            paddingBottom: `${bottomFeedMm}mm`,
            paddingLeft: '1.5mm',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif",
            fontVariantNumeric: 'tabular-nums',
            color: '#000000',
            backgroundColor: '#ffffff',
            fontSize: '9px',
            lineHeight: '1.35',
            fontWeight: 500,
            letterSpacing: '0.01em',
            height: 'auto',
            minHeight: 0,
            display: 'block',
          }}
        >
          {/* HEADER TOKO */}
          <div style={{ textAlign: 'center', marginBottom: '2mm', marginTop: 0, paddingTop: 0 }}>
            {showLogo && (
              <div style={{ textAlign: 'center', marginBottom: '1.2mm', marginTop: 0 }}>
                <img
                  src={logoToUse}
                  alt="Logo"
                  style={{
                    height: '8.5mm',
                    maxHeight: '8.5mm',
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
                fontSize: '10.5px',
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                lineHeight: '1.2',
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
                  fontSize: '8px',
                  fontWeight: 500,
                  color: '#000000',
                  marginTop: '0.6mm',
                  lineHeight: '1.25',
                }}
              >
                {headerInfo.address} {headerInfo.phone && `• ${headerInfo.phone}`}
              </div>
            )}
          </div>

          {/* META TRANSAKSI */}
          <div
            style={{
              borderTop: '1px dashed #000000',
              borderBottom: '1px dashed #000000',
              paddingTop: '1.5mm',
              paddingBottom: '1.5mm',
              marginTop: '1.5mm',
              marginBottom: '1.8mm',
              fontSize: '8.5px',
              lineHeight: '1.4',
              color: '#000000',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontWeight: 500 }}>No. Struk</span>
              <span style={{ fontWeight: 700 }}>{trx.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.4mm' }}>
              <span style={{ fontWeight: 500 }}>Tanggal</span>
              <span style={{ fontWeight: 500 }}>{trx.date?.toDate?.()?.toLocaleString('id-ID') || 'Baru'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '0.4mm' }}>
              <span style={{ fontWeight: 500 }}>Kasir</span>
              <span style={{ fontWeight: 600 }}>{activeCashierName}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginTop: '0.4mm',
              }}
            >
              <span style={{ fontWeight: 500 }}>Pelanggan</span>
              <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{trx.customerName || 'UMUM'}</span>
            </div>
            {returnSummary.isDpTransaction && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginTop: '0.4mm',
                }}
              >
                <span style={{ fontWeight: 500 }}>Jenis Transaksi</span>
                <span style={{ fontWeight: 800 }}>
                  {returnSummary.effectiveStatus === 'DP' ? 'DP (BELUM LUNAS)' : 'DP • LUNAS'}
                </span>
              </div>
            )}
          </div>

          {/* DAFTAR ITEM & DETAIL RETUR / TUKAR BARANG */}
          <div style={{ marginBottom: '1.8mm', color: '#000000' }}>
            {returnSummary.hasReturn && (
              <div
                style={{
                  fontSize: '8px',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                  marginBottom: '1.2mm',
                  paddingBottom: '0.5mm',
                  borderBottom: '1px dotted #000000',
                }}
              >
                1. BARANG TRANSAKSI AWAL
              </div>
            )}
            {consolidatedItems.map((item: any, i: number) => {
              const labelPrice = item.labelPrice || item.price;
              const totalDisc = item.totalNominalDisc || 0;
              const totalLabelPrice = labelPrice * item.quantity;
              const lineNetTotal = Math.max(0, totalLabelPrice - totalDisc);
              const effectiveDiscPct = totalLabelPrice > 0 ? Math.round((totalDisc / totalLabelPrice) * 100) : 0;
              const isLast = i === consolidatedItems.length - 1;

              return (
                <div
                  key={i}
                  style={{
                    marginBottom: isLast ? 0 : '1.6mm',
                    paddingBottom: 0,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '6px',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        lineHeight: '1.25',
                        fontSize: '9px',
                        flex: 1,
                        color: '#000000',
                      }}
                    >
                      {item.name}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '9px',
                        whiteSpace: 'nowrap',
                        textAlign: 'right',
                        color: '#000000',
                      }}
                    >
                      Rp{(returnSummary.hasReturn ? lineNetTotal : totalLabelPrice).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '8px',
                      fontWeight: 500,
                      color: '#000000',
                      marginTop: '0.3mm',
                      lineHeight: '1.3',
                    }}
                  >
                    {item.quantity} x Rp{labelPrice.toLocaleString('id-ID')}
                    {item.color ? ` • ${item.color}` : ''}
                    {item.size ? ` (${item.size})` : ''}
                    {totalDisc > 0 && ` • Disc ${effectiveDiscPct}% (-Rp${totalDisc.toLocaleString('id-ID')})`}
                  </div>
                </div>
              );
            })}

            {/* BAGIAN 2: BARANG YANG DIRETUR */}
            {returnSummary.hasReturn && (
              <div
                style={{
                  marginTop: '2mm',
                  paddingTop: '1.4mm',
                  borderTop: '1px dashed #000000',
                }}
              >
                <div
                  style={{
                    fontSize: '8px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    marginBottom: '1.2mm',
                    paddingBottom: '0.5mm',
                    borderBottom: '1px dotted #000000',
                  }}
                >
                  2. BARANG YANG DIRETUR (-)
                </div>
                {(trx.returnLog?.items || []).map((item: any, idx: number) => {
                  const unitNet = getItemUnitNetPrice(item);
                  const qty = Number(item.quantity || 1);
                  const lineRefund = unitNet * qty;
                  const isLast = idx === (trx.returnLog?.items?.length || 1) - 1;
                  return (
                    <div key={idx} style={{ marginBottom: isLast ? 0 : '1.4mm' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            lineHeight: '1.25',
                            fontSize: '8.5px',
                            flex: 1,
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '8.5px',
                            whiteSpace: 'nowrap',
                            textAlign: 'right',
                          }}
                        >
                          -Rp{lineRefund.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div style={{ fontSize: '7.5px', fontWeight: 500, marginTop: '0.2mm' }}>
                        {qty} x Rp{unitNet.toLocaleString('id-ID')}
                        {item.color ? ` • ${item.color}` : ''}
                        {item.size ? ` (${item.size})` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* BAGIAN 3: BARANG TUKAR / PENGGANTI DARI RETUR */}
            {returnSummary.hasExchange && (
              <div
                style={{
                  marginTop: '2mm',
                  paddingTop: '1.4mm',
                  borderTop: '1px dashed #000000',
                }}
              >
                <div
                  style={{
                    fontSize: '8px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    marginBottom: '1.2mm',
                    paddingBottom: '0.5mm',
                    borderBottom: '1px dotted #000000',
                  }}
                >
                  3. BARANG PENGGANTI / TUKAR (+)
                </div>
                {returnSummary.exchangeItems.map((item: any, idx: number) => {
                  const unitNet = getItemUnitNetPrice(item);
                  const labelPrice = Number(item.labelPrice || item.price || unitNet);
                  const qty = Number(item.quantity || 1);
                  const lineNet = unitNet * qty;
                  const totalDisc = Math.max(0, labelPrice - unitNet) * qty;
                  const isLast = idx === returnSummary.exchangeItems.length - 1;
                  return (
                    <div key={idx} style={{ marginBottom: isLast ? 0 : '1.4mm' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            lineHeight: '1.25',
                            fontSize: '8.5px',
                            flex: 1,
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: '8.5px',
                            whiteSpace: 'nowrap',
                            textAlign: 'right',
                          }}
                        >
                          +Rp{lineNet.toLocaleString('id-ID')}
                        </span>
                      </div>
                      <div style={{ fontSize: '7.5px', fontWeight: 500, marginTop: '0.2mm' }}>
                        {qty} x Rp{labelPrice.toLocaleString('id-ID')}
                        {item.color ? ` • ${item.color}` : ''}
                        {item.size ? ` (${item.size})` : ''}
                        {totalDisc > 0 ? ` • Disc -Rp${totalDisc.toLocaleString('id-ID')}` : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RINGKASAN PEMBAYARAN & PERHITUNGAN SELISIH RETUR */}
          <div
            style={{
              borderTop: '1px dashed #000000',
              paddingTop: '1.5mm',
              color: '#000000',
              fontSize: '8.5px',
              lineHeight: '1.45',
            }}
          >
            {!returnSummary.hasReturn && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                  <span>Jumlah Item</span>
                  <span style={{ fontWeight: 600 }}>{totalQty} Pcs</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, marginTop: '0.3mm' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600 }}>Rp{trx.subtotalLabel?.toLocaleString('id-ID')}</span>
                </div>
                {(trx.totalDiscount || 0) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500, marginTop: '0.3mm' }}>
                    <span>Total Diskon</span>
                    <span style={{ fontWeight: 600 }}>-Rp{trx.totalDiscount?.toLocaleString('id-ID')}</span>
                  </div>
                )}
              </>
            )}

            {returnSummary.hasReturn ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                  <span>Total Transaksi Awal</span>
                  <span style={{ fontWeight: 600 }}>Rp{returnSummary.originalTotal.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: '0.3mm' }}>
                  <span>Nilai Barang Diretur (-)</span>
                  <span>-Rp{returnSummary.totalRefund.toLocaleString('id-ID')}</span>
                </div>
                {returnSummary.hasExchange && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, marginTop: '0.3mm' }}>
                    <span>Nilai Barang Pengganti (+)</span>
                    <span>+Rp{returnSummary.exchangeTotal.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {/* SELISIH TUKAR BARANG (TAMBAH BAYAR ATAU SISA KEMBALI) */}
                <div
                  style={{
                    borderTop: '1px dotted #000000',
                    paddingTop: '0.9mm',
                    marginTop: '0.9mm',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    fontSize: '9px',
                    fontWeight: 800,
                  }}
                >
                  {returnSummary.netExchangeDiff > 0 ? (
                    <>
                      <span>TAMBAH BAYAR (KURANG)</span>
                      <span>+Rp{returnSummary.netExchangeDiff.toLocaleString('id-ID')}</span>
                    </>
                  ) : returnSummary.netExchangeDiff < 0 ? (
                    <>
                      <span>UANG SISA DIKEMBALIKAN</span>
                      <span>Rp{Math.abs(returnSummary.netExchangeDiff).toLocaleString('id-ID')}</span>
                    </>
                  ) : (
                    <>
                      <span>SELISIH TUKAR BARANG</span>
                      <span>Rp 0 (PAS)</span>
                    </>
                  )}
                </div>

                {returnSummary.netExchangeDiff > 0 && Number(trx.returnLog?.exchangeCashReceived || 0) > 0 && (
                  <div style={{ fontSize: '8px', marginTop: '0.4mm' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                      <span>Tunai Tambahan</span>
                      <span>Rp{Number(trx.returnLog.exchangeCashReceived).toLocaleString('id-ID')}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Kembalian Tambahan</span>
                      <span>Rp{Number(trx.returnLog.exchangeCashChange || 0).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    borderTop: '1px dashed #000000',
                    paddingTop: '1.2mm',
                    marginTop: '1.2mm',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    fontSize: '10px',
                    fontWeight: 800,
                  }}
                >
                  <span>TOTAL AKHIR TRANSAKSI</span>
                  <span>Rp{returnSummary.netTotal.toLocaleString('id-ID')}</span>
                </div>
              </>
            ) : (
              <div
                style={{
                  borderTop: '1px dashed #000000',
                  paddingTop: '1.2mm',
                  marginTop: '1.2mm',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  fontSize: '10px',
                  fontWeight: 800,
                }}
              >
                <span>TOTAL TAGIHAN</span>
                <span>Rp{returnSummary.netTotal.toLocaleString('id-ID')}</span>
              </div>
            )}

            {!returnSummary.isDpTransaction && trx.paymentMethod?.includes('CASH') && trx.cashReceived > 0 && (
              <div
                style={{
                  paddingTop: '1.2mm',
                  marginTop: '1.2mm',
                  borderTop: '1px dashed #000000',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                  <span>Tunai</span>
                  <span style={{ fontWeight: 600 }}>Rp{trx.cashReceived.toLocaleString('id-ID')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginTop: '0.4mm' }}>
                  <span>Kembalian</span>
                  <span>Rp{trx.cashChange.toLocaleString('id-ID')}</span>
                </div>
              </div>
            )}

            {/* RINCIAN KHUSUS TRANSAKSI DP (SEBELUM LUNAS MAUPUN SAAT PELUNASAN) */}
            {returnSummary.isDpTransaction && (
              <div
                style={{
                  paddingTop: '1.4mm',
                  marginTop: '1.4mm',
                  borderTop: '1px dashed #000000',
                }}
              >
                <div
                  style={{
                    fontSize: '8px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    marginBottom: '1mm',
                    paddingBottom: '0.4mm',
                    borderBottom: '1px dotted #000000',
                  }}
                >
                  {returnSummary.effectiveStatus === 'DP'
                    ? 'RINCIAN PEMBAYARAN DP'
                    : 'RIWAYAT DP & PELUNASAN'}
                </div>

                {/* Daftar Pembayaran DP Sebelumnya Lengkap dengan Tanggal */}
                {returnSummary.previousDpStages.map((st) => (
                  <div
                    key={st.index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      fontWeight: 500,
                      marginTop: '0.3mm',
                    }}
                  >
                    <span>
                      {st.label} ({st.dateStr})
                    </span>
                    <span style={{ fontWeight: 600 }}>Rp{st.amount.toLocaleString('id-ID')}</span>
                  </div>
                ))}

                {returnSummary.previousDpStages.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      fontWeight: 600,
                      marginTop: '0.5mm',
                      paddingTop: '0.5mm',
                      borderTop: '1px dotted #000000',
                    }}
                  >
                    <span>
                      {returnSummary.effectiveStatus === 'DP' ? 'Total DP Masuk' : 'Total DP Sebelumnya'}
                    </span>
                    <span>Rp{returnSummary.previousDpTotal.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {/* Jika Sudah Lunas: Tampilkan Pelunasan Kekurangan Bayar + Tanggal */}
                {returnSummary.settlementStage && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      fontWeight: 800,
                      fontSize: '9px',
                      marginTop: '0.7mm',
                      paddingTop: '0.7mm',
                      borderTop: '1px dotted #000000',
                    }}
                  >
                    <span>Pelunasan ({returnSummary.settlementStage.dateStr})</span>
                    <span>Rp{returnSummary.settlementStage.amount.toLocaleString('id-ID')}</span>
                  </div>
                )}

                {/* Status Akhir DP: Kekurangan Bayar (Sebelum Lunas) atau Lunas (Setelah Pelunasan) */}
                {returnSummary.effectiveStatus === 'DP' ? (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      fontWeight: 800,
                      fontSize: '9.5px',
                      marginTop: '0.9mm',
                      paddingTop: '0.9mm',
                      borderTop: '1px dashed #000000',
                    }}
                  >
                    <span>KEKURANGAN BAYAR</span>
                    <span>Rp{returnSummary.netRemaining.toLocaleString('id-ID')}</span>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: '0.9mm',
                      paddingTop: '0.9mm',
                      borderTop: '1px dashed #000000',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        fontWeight: 700,
                      }}
                    >
                      <span>Total Dibayar</span>
                      <span>Rp{returnSummary.netPaid.toLocaleString('id-ID')}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        fontWeight: 800,
                        fontSize: '9px',
                        marginTop: '0.3mm',
                      }}
                    >
                      <span>KEKURANGAN BAYAR</span>
                      <span>Rp0 (LUNAS)</span>
                    </div>
                    {trx.paymentMethod?.includes('CASH') && trx.cashReceived > 0 && (
                      <div style={{ fontSize: '8px', marginTop: '0.5mm' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 500 }}>
                          <span>Tunai Pelunasan</span>
                          <span>Rp{trx.cashReceived.toLocaleString('id-ID')}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                          <span>Kembalian</span>
                          <span>Rp{trx.cashChange.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER STRUK */}
          <div
            style={{
              textAlign: 'center',
              marginTop: '2.2mm',
              paddingTop: '1.5mm',
              borderTop: '1px dashed #000000',
              color: '#000000',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '8.5px', letterSpacing: '0.03em' }}>
              Terima Kasih atas Kunjungan Anda
            </div>
            <div
              style={{
                marginTop: '0.6mm',
                fontSize: '7.5px',
                fontWeight: 500,
                lineHeight: '1.3',
              }}
            >
              Barang yang sudah dibeli tidak dapat ditukar atau dikembalikan
            </div>
          </div>

          {/* STOPER AKHIR STRUK */}
          <div
            id="receipt-stopper"
            style={{
              marginTop: '1.2mm',
              paddingTop: '0.5mm',
              textAlign: 'center',
              fontSize: '8px',
              fontWeight: 600,
              letterSpacing: '3px',
              lineHeight: 1,
              color: '#000000',
            }}
          >
            • • •
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
                Tipografi modern bersih &amp; lega — mudah dibaca dan langsung mencetak mulai 2mm dari ujung atas kertas.
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
                {showLogo ? 'AKTIF' : 'NONAKTIF'}
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
                padding: ${topMarginMm}mm 1.5mm ${bottomFeedMm}mm 1.5mm !important;
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
