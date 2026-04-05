
"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  LogOut, 
  Shirt,
  CheckCircle2,
  History,
  Settings,
  ShieldCheck,
  ArrowUpDown,
  Banknote,
  QrCode,
  CreditCard,
  UserCheck,
  Printer,
  Download,
  Loader2,
  X,
  UserPlus,
  User,
  Percent,
  Ticket,
  Menu,
  ChevronUp,
  MessageSquare,
  Calculator,
  Database,
  Package,
  RotateCcw,
  AlertCircle,
  Eye,
  FileText,
  Wallet,
  Coins,
  ArrowDownToLine,
  Save,
  ArrowRight,
  TrendingUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  useFirestore, 
  useCollection, 
  useDoc,
  useMemoFirebase,
  updateDocumentNonBlocking,
  setDocumentNonBlocking
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, Timestamp, getDocs, limit } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import Image from "next/image";

interface CartItem {
  cartId: string;
  productId: string;
  variantId: string;
  name: string;
  color: string;
  size: string;
  price: number; 
  labelPrice: number; 
  buyPrice: number;
  storeDiscountPercent: number; 
  storeDiscountNominal: number;
  quantity: number;
  stock: number;
}

interface Member { id: string; name: string; phone: string; address: string; discount: number; }
interface Agent { id: string; name: string; phone: string; address: string; discount: number; }
interface Voucher { id: string; code: string; discount: number; isUsed: boolean; }

const LOGO_URL = "https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png";

const CartItemRow = ({ 
  item, 
  isMobileView, 
  updateItemDiscountPercent, 
  updateItemDiscountNominal, 
  removeFromCart, 
  updateQuantity,
  isSuccess,
  settlementTrx 
}: any) => {
  const [localPct, setLocalPct] = useState(item.storeDiscountPercent > 0 ? item.storeDiscountPercent.toString() : "");
  const [localNom, setLocalNom] = useState(item.storeDiscountNominal > 0 ? item.storeDiscountNominal.toString() : "");

  useEffect(() => {
    setLocalPct(item.storeDiscountPercent > 0 ? item.storeDiscountPercent.toString() : "");
    setLocalNom(item.storeDiscountNominal > 0 ? item.storeDiscountNominal.toString() : "");
  }, [item.storeDiscountPercent, item.storeDiscountNominal]);

  const handlePctBlur = () => updateItemDiscountPercent(item.cartId, localPct);
  const handleNomBlur = () => updateItemDiscountNominal(item.cartId, localNom);

  return (
    <div className={cn("flex flex-col gap-1 pb-2 border-b last:border-0", isMobileView ? "border-slate-100" : "border-white/10")}>
      <div className="flex justify-between items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className={cn("text-[10px] uppercase leading-tight break-words", isMobileView ? "text-slate-800" : "text-white")}>{item.name}</p>
          <p className={cn("text-[8px] font-medium", isMobileView ? "text-slate-400" : "text-white/50")}>{item.color} | {item.size}</p>
        </div>
        {!isSuccess && !settlementTrx && (
          <button onClick={() => removeFromCart(item.cartId)} className={cn("shrink-0 p-0.5", isMobileView ? "text-rose-500" : "text-rose-400")}>
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {!isSuccess && !settlementTrx && (
        <div className={cn("flex items-center gap-1.5 pt-1 mt-0.5 border-t border-dashed", isMobileView ? "border-slate-100" : "border-white/10")}>
          <div className="w-[15%]">
            <Input placeholder="%" value={localPct} onChange={(e) => { setLocalPct(e.target.value); if (e.target.value !== "") setLocalNom(""); }} onBlur={handlePctBlur} className="h-6 border-none text-[10px] font-black text-center px-1 rounded shadow-none bg-white text-primary" />
          </div>
          <div className="w-[35%]">
            <Input placeholder="DISC" value={localNom} onChange={(e) => { setLocalNom(e.target.value); if (e.target.value !== "") setLocalPct(""); }} onBlur={handleNomBlur} className="h-6 border-none text-[10px] font-black text-center px-1 rounded shadow-none bg-white text-primary" />
          </div>
          <div className="flex items-center gap-1 w-[25%] justify-center">
            <button onClick={() => updateQuantity(item.cartId, -1)} className={cn("h-6 w-6 rounded-md flex items-center justify-center shadow-sm", isMobileView ? "bg-slate-100 text-slate-600" : "bg-white/10 text-white")}><Minus className="h-2 w-2" /></button>
            <span className={cn("text-[10px] font-black w-4 text-center", isMobileView ? "text-primary" : "text-white")}>{item.quantity}</span>
            <button onClick={() => updateQuantity(item.cartId, 1)} className={cn("h-6 w-6 rounded-md flex items-center justify-center shadow-sm", isMobileView ? "bg-slate-100 text-slate-600" : "bg-white/10 text-white")}><Plus className="h-2 w-2" /></button>
          </div>
          <div className="w-[25%] text-right">
            <p className={cn("text-[10px] font-black leading-none", isMobileView ? "text-primary" : "text-white")}>Rp{(item.price * item.quantity).toLocaleString('id-ID')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default function CashierPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const db = useFirestore();
  const isMobile = useIsMobile();
  
  const storeId = user?.associatedStoreId || "TOKO_A";
  const displayStoreName = storeId === "TOKO_A" ? "NHS KWT" : storeId === "TOKO_B" ? "IND CO" : storeId === "TOKO_C" ? "NHS GDM" : "STORE";
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashierName, setCashierName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showStockList, setShowStockList] = useState(false);
  const [stockViewingStoreId, setStockViewingStoreId] = useState<string>(storeId);
  const [showCashDrawer, setShowCashLogs] = useState(false);
  const [initialCapitalInput, setInitialCapitalInput] = useState("");
  const [withdrawalAmountInput, setWithdrawalAmountInput] = useState("");
  const [withdrawalNoteInput, setWithdrawalNoteInput] = useState("");
  const [physicalCashInput, setPhysicalCashInput] = useState("");
  
  const todayId = format(new Date(), "yyyy-MM-dd");
  const yesterdayId = format(subDays(new Date(), 1), "yyyy-MM-dd");
  
  const [customerType, setCustomerType] = useState<"UMUM" | "MEMBER" | "AGEN">("UMUM");
  const [generalName, setGeneralName] = useState("");
  const [generalPhone, setGeneralPhone] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS">("CASH");
  const [voucherInput, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [manualAdditionalDiscount, setManualAdditionalDiscount] = useState("");
  const [isDPMode, setIsDPMode] = useState(false);
  const [manualDPInput, setManualDPInput] = useState("");
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [multiCashAmount, setMultiCashAmount] = useState("");
  const [settlementTrx, setSettlementTrx] = useState<any>(null);
  const [isAdditionalDP, setIsAdditionalDP] = useState(false);
  const [additionalDPInput, setAdditionalDPInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastTrxId, setLastTrxId] = useState<string | null>(null);
  const [lastTrxData, setLastTrxData] = useState<any>(null); 
  const [activeTrxStatus, setActiveTrxStatus] = useState<string>("COMPLETED");
  const [showHistory, setShowHistory] = useState(false);
  const [showSelectMember, setShowSelectMember] = useState(false);
  const [showSelectAgent, setShowSelectAgent] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [historyDate, setHistoryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [receivedCash, setReceivedCash] = useState("");
  const [selectedTrxForDetails, setSelectedTrxForDetails] = useState<any>(null);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [trxForReturn, setTrxForReturn] = useState<any>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [newMember, setNewMember] = useState({ name: "", phone: "", address: "" });
  const [newAgent, setNewAgent] = useState({ name: "", phone: "", address: "" });

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user?.associatedStoreId) setStockViewingStoreId(user.associatedStoreId);
    const savedName = localStorage.getItem("nibras_cashier_name");
    if (savedName) setCashierName(savedName);
    else if (user?.name) setCashierName(user.name);
  }, [user, loading, router]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handleSaveSettings = () => {
    localStorage.setItem("nibras_cashier_name", cashierName);
    setShowSettings(false);
    toast({ title: "Pengaturan Tersimpan" });
  };

  const productsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "stores", storeId, "stock"), limit(500));
  }, [db, storeId, user]);

  const { data: productsData } = useCollection<any>(productsQuery);
  const products = productsData || [];

  const stockDialogProductsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "stores", stockViewingStoreId, "stock"), limit(500));
  }, [db, stockViewingStoreId, user]);
  const { data: stockDialogProductsData } = useCollection<any>(stockDialogProductsQuery);
  const stockDialogProducts = stockDialogProductsData || [];

  const membersQuery = useMemoFirebase(() => user ? collection(db, "members") : null, [db, user]);
  const { data: membersData } = useCollection<Member>(membersQuery);
  const members = membersData || [];

  const agentsQuery = useMemoFirebase(() => user ? collection(db, "agents") : null, [db, user]);
  const { data: agentsData } = useCollection<Agent>(agentsQuery);
  const agents = agentsData || [];

  const historyQuery = useMemoFirebase(() => {
    if (!user) return null;
    const start = new Date(historyDate); start.setHours(0, 0, 0, 0);
    const end = new Date(historyDate); end.setHours(23, 59, 59, 999);
    return query(collection(db, "stores", storeId, "transactions"), where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)), orderBy("date", "desc"));
  }, [db, storeId, user, historyDate]);
  const { data: history } = useCollection<any>(historyQuery);

  const cashLogRef = useMemoFirebase(() => user ? doc(db, "stores", storeId, "cashLogs", todayId) : null, [db, storeId, user, todayId]);
  const { data: cashLog } = useDoc<any>(cashLogRef);

  const yesterdayCashLogRef = useMemoFirebase(() => user ? doc(db, "stores", storeId, "cashLogs", yesterdayId) : null, [db, storeId, user, yesterdayId]);
  const { data: yesterdayLog } = useDoc<any>(yesterdayCashLogRef);

  const todaySalesStats = useMemo(() => {
    if (!history) return { cash: 0, transfer: 0, qris: 0 };
    const todayStr = format(new Date(), "yyyy-MM-dd");
    if (historyDate !== todayStr) return { cash: 0, transfer: 0, qris: 0 };
    
    return history.reduce((acc, trx) => {
      const method = trx.paymentMethod || "CASH";
      const paid = trx.paidAmount || 0;
      if (trx.paymentBreakdown) {
        acc.cash += trx.paymentBreakdown.cash || 0;
        const otherMethod = trx.paymentBreakdown.otherMethod;
        if (otherMethod === "TRANSFER") acc.transfer += trx.paymentBreakdown.other || 0;
        if (otherMethod === "QRIS") acc.qris += trx.paymentBreakdown.other || 0;
      } else {
        if (method === "CASH") acc.cash += paid;
        else if (method === "TRANSFER") acc.transfer += paid;
        else if (method === "QRIS") acc.qris += paid;
      }
      return acc;
    }, { cash: 0, transfer: 0, qris: 0 });
  }, [history, historyDate]);

  const [yesterdayTrx, setYesterdayTrx] = useState<any[]>([]);
  useEffect(() => {
    if (showCashDrawer && user) {
      const start = new Date(yesterdayId); start.setHours(0, 0, 0, 0);
      const end = new Date(yesterdayId); end.setHours(23, 59, 59, 999);
      const q = query(collection(db, "stores", storeId, "transactions"), where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)));
      getDocs(q).then(snap => {
        setYesterdayTrx(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      });
    }
  }, [showCashDrawer, user, db, storeId, yesterdayId]);

  const yesterdaySplit = useMemo(() => {
    if (!yesterdayLog) return { murni: 0, lanjutan: 0, totalOpening: 0, totalCash: 0, totalWithdrawals: 0, closingBalance: 0 };
    
    const openingY = (yesterdayLog.saldo_awal_kemarin || 0) + (yesterdayLog.modal_awal || 0);
    const withdrawalsY = yesterdayLog.pengambilan || [];
    const totalWithdrawalsY = withdrawalsY.reduce((s: number, w: any) => s + w.amount, 0);
    
    const cashTrxY = yesterdayTrx.filter(t => {
      if (t.paymentBreakdown) return (t.paymentBreakdown.cash || 0) > 0;
      return t.paymentMethod === "CASH" || t.paymentMethod.includes("CASH");
    }).sort((a, b) => (a.date?.toDate?.()?.getTime() || 0) - (b.date?.toDate?.()?.getTime() || 0));

    const totalCashSalesY = cashTrxY.reduce((s, t) => {
      const cash = t.paymentBreakdown ? (t.paymentBreakdown.cash || 0) : (t.paidAmount || 0);
      return s + cash;
    }, 0);

    if (withdrawalsY.length === 0) {
      return { 
        murni: openingY, 
        lanjutan: totalCashSalesY,
        totalOpening: openingY,
        totalCash: totalCashSalesY,
        totalWithdrawals: 0,
        closingBalance: openingY + totalCashSalesY
      };
    }

    const lastW = [...withdrawalsY].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
    const lastWTime = new Date(lastW.timestamp).getTime();

    let salesBefore = 0;
    let salesAfter = 0;
    cashTrxY.forEach(t => {
      const tTime = t.date?.toDate?.()?.getTime() || 0;
      const cash = t.paymentBreakdown ? (t.paymentBreakdown.cash || 0) : (t.paidAmount || 0);
      if (tTime <= lastWTime) salesBefore += cash;
      else salesAfter += cash;
    });

    const murni = openingY + salesBefore - totalWithdrawalsY;
    const lanjutan = salesAfter;

    return { 
      murni, 
      lanjutan,
      totalOpening: openingY,
      totalCash: totalCashSalesY,
      totalWithdrawals: totalWithdrawalsY,
      closingBalance: murni + lanjutan
    };
  }, [yesterdayLog, yesterdayTrx]);

  const yesterdayRemaining = yesterdaySplit.closingBalance;

  const filteredProducts = useMemo(() => {
    const tokens = debouncedSearch.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const flattened: any[] = [];
    
    products.forEach(p => {
      if (p.variants) {
        p.variants.forEach(v => {
          const searchableText = [
            p.name || "",
            p.brand || "", 
            p.category || "", 
            p.series || "", 
            v.color || "", 
            v.size || ""
          ].join(" ").toLowerCase();

          const matchCount = tokens.length > 0 
            ? tokens.filter(token => searchableText.includes(token)).length 
            : 1;

          if (matchCount > 0 || tokens.length === 0) {
            flattened.push({ 
              ...v, 
              productId: p.id, 
              baseName: p.name, 
              category: p.category, 
              brand: p.brand || p.category || "-", 
              variantId: v.id, 
              matchCount: matchCount 
            });
          }
        });
      }
    });

    return flattened.sort((a, b) => {
      if (tokens.length > 0) {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      }
      if (sortBy === "name-asc") return a.baseName.localeCompare(b.baseName);
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    }).slice(0, 24);
  }, [debouncedSearch, products, sortBy]);

  const subtotalLabel = cart.reduce((s, i) => s + (i.labelPrice * i.quantity), 0);
  const storeDiscount = cart.reduce((s, i) => {
    const itemDiscount = i.storeDiscountPercent > 0 ? (i.labelPrice * i.storeDiscountPercent / 100) : (i.storeDiscountNominal || 0);
    return s + (itemDiscount * i.quantity);
  }, 0);
  const subtotalSetelahToko = subtotalLabel - storeDiscount;
  const voucherDiscount = appliedVoucher ? (subtotalSetelahToko * appliedVoucher.discount / 100) : 0;
  const additionalManualDiscountValue = parseFloat(manualAdditionalDiscount) || 0;
  const totalPotongan = storeDiscount + 0 + 0 + voucherDiscount + additionalManualDiscountValue;
  const totalTagihan = Math.max(0, subtotalLabel - totalPotongan);

  const handleProductClick = (item: any) => {
    if (isSuccess || settlementTrx) return;
    if (item.stock <= 0) return toast({ title: "Stok Habis", variant: "destructive" });
    const cartId = `${item.productId}-${item.variantId}`;
    const idx = cart.findIndex(i => i.cartId === cartId);
    if (idx > -1) {
      if (cart[idx].quantity >= item.stock) return toast({ title: "Stok Terbatas", variant: "destructive" });
      setCart(prev => prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      const label = item.labelPrice || item.price;
      const buyPrice = item.buyPrice || 0;
      setCart(prev => [...prev, { cartId, productId: item.productId, variantId: item.variantId, name: item.baseName, color: item.color, size: item.size, price: label, labelPrice: label, buyPrice: buyPrice, storeDiscountPercent: 0, storeDiscountNominal: 0, quantity: 1, stock: item.stock }]);
    }
    toast({ title: "Item Ditambahkan" });
  };

  const updateItemDiscountPercent = (cartId: string, percentStr: string) => {
    const p = parseFloat(percentStr);
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const val = !isNaN(p) ? p : 0;
        const calculatedNominal = item.labelPrice * val / 100;
        return { ...item, storeDiscountPercent: val, storeDiscountNominal: 0, price: item.labelPrice - calculatedNominal };
      }
      return item;
    }));
  };

  const updateItemDiscountNominal = (cartId: string, nominalStr: string) => {
    const n = parseFloat(nominalStr);
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const val = !isNaN(n) ? n : 0;
        return { ...item, storeDiscountNominal: val, storeDiscountPercent: 0, price: item.labelPrice - val };
      }
      return item;
    }));
  };

  const handleApplyVoucher = async () => {
    if (!voucherInput) return;
    setIsValidatingVoucher(true);
    try {
      const qv = query(collection(db, "coupons"), where("code", "==", voucherInput.toUpperCase()));
      const snap = await getDocs(qv);
      if (snap.empty) { toast({ title: "Voucher Tidak Ditemukan", variant: "destructive" }); setAppliedVoucher(null); }
      else { const vData = snap.docs[0].data() as Voucher; if (vData.isUsed) { toast({ title: "Voucher Sudah Terpakai", variant: "destructive" }); setAppliedVoucher(null); } else { setAppliedVoucher({ ...vData, id: snap.docs[0].id }); toast({ title: `Voucher Berhasil: Potongan ${vData.discount}%` }); } }
    } catch (err) { toast({ title: "Gagal Verifikasi Voucher", variant: "destructive" }); }
    finally { setIsValidatingVoucher(false); }
  };

  const handleWhatsAppReceipt = (trx: any, isReturn = false) => {
    if (!trx) return;
    const phone = trx.customerPhone;
    if (!phone) { toast({ title: "Gagal", description: "Nomor WhatsApp pelanggan tidak ditemukan.", variant: "destructive" }); return; }
    let formattedPhone = phone.toString().replace(/\D/g, ''); 
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);
    const currentStoreDisplayName = trx.store === "TOKO_A" ? "NHS KWT" : trx.store === "TOKO_B" ? "IND CO" : trx.store === "TOKO_C" ? "NHS GDM" : "STORE";
    const storeName = `NIBRAS HOUSE ${currentStoreDisplayName}`;
    const dateStr = trx.date?.toDate ? format(trx.date.toDate(), "dd/MM/yyyy HH:mm") : format(new Date(), "dd/MM/yyyy HH:mm");
    let msg = `*${isReturn ? 'STRUK RETUR BARANG' : 'STRUK PEMBELIAN'}*\n🛍️ ${storeName}\n----------------------------\n📅 Tanggal: ${dateStr}\n👤 Kasir: ${trx.cashier}\n👤 Konsumen: ${trx.customerName || "UMUM"}\n📱 No Tlp: ${trx.customerPhone || "-"}\n----------------------------\n\n`;
    if (isReturn && trx.returnLog) {
      msg += `*RINCIAN BARANG DIKEMBALIKAN:*\n`;
      trx.returnLog.items.forEach((item: any) => { msg += `${item.name}\n  ${item.quantity} PCS @Rp${item.price.toLocaleString('id-ID')}\n`; });
      msg += `\n----------------------------\n*TOTAL PENGEMBALIAN: Rp${trx.returnLog.totalRefund.toLocaleString('id-ID')}*\n`;
    } else {
      const items = trx.items || [];
      let totalQty = 0;
      items.forEach((item: any) => {
        const itemSubLabel = (item.labelPrice || item.price) * item.quantity;
        const discountPct = item.storeDiscountPercent || 0;
        const finalItemPrice = item.price;
        totalQty += item.quantity;
        msg += `${item.name}\n  ${item.quantity}x @Rp${(item.labelPrice || item.price).toLocaleString('id-ID')} = Rp${itemSubLabel.toLocaleString('id-ID')} | dis ${discountPct}% | Rp${(finalItemPrice * item.quantity).toLocaleString('id-ID')}\n`;
      });
      msg += `\n----------------------------\nJUMLAH QTY: ${totalQty} PCS\nSUBTOTAL (LABEL): Rp${(trx.subtotalLabel || 0).toLocaleString('id-ID')}\n`;
      if (trx.totalDiscount > 0) msg += `TOTAL POTONGAN: -Rp${(trx.totalDiscount || 0).toLocaleString('id-ID')}\n`;
      msg += `----------------------------\n*GRAND TOTAL: Rp${trx.total.toLocaleString('id-ID')}*\n`;
      if (trx.status === "DP") msg += `Status: *BELUM LUNAS (DP)*\nDibayar: Rp${trx.paidAmount.toLocaleString('id-ID')}\nSisa: Rp${trx.remainingAmount.toLocaleString('id-ID')}\n`;
      else msg += `Status: *LUNAS / SELESAI*\n`;
    }
    msg += `----------------------------\nTerima kasih telah berbelanja di Nibras House! 🙏✨`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleStartProcess = () => { if (cart.length === 0) return; if (isMultiMode) handleProcessTransaction(); else if (paymentMethod === "CASH" && !isDPMode) { setReceivedCash(totalTagihan.toString()); setIsCashDialogOpen(true); } else handleProcessTransaction(); };

  const handleProcessTransaction = async (cashPayload?: { received: number, change: number }) => {
    setIsProcessing(true); const trxId = `TRX-${Date.now().toString().slice(-6)}`;
    const paidAmount = isDPMode ? (parseFloat(manualDPInput) || 0) : totalTagihan;
    const status = isDPMode ? "DP" : "COMPLETED";
    let finalPaymentMethod: string = paymentMethod; let paymentBreakdown: any = null;
    if (isMultiMode) { const cashPart = parseFloat(multiCashAmount) || 0; const otherPart = totalTagihan - cashPart; finalPaymentMethod = `CASH & ${paymentMethod}`; paymentBreakdown = { cash: cashPart, other: otherPart, otherMethod: paymentMethod }; }
    const trxData = { id: trxId, items: cart, subtotalLabel, storeDiscount, memberDiscount: 0, agentDiscount: 0, voucherDiscount, additionalManualDiscount: additionalManualDiscountValue, appliedVoucher: appliedVoucher ? { id: appliedVoucher.id, code: appliedVoucher.code, discount: appliedVoucher.discount } : null, total: totalTagihan, paidAmount, remainingAmount: totalTagihan - paidAmount, totalDiscount: totalPotongan, paymentMethod: finalPaymentMethod, paymentBreakdown, customerType, customerName: (customerType === "UMUM" ? generalName : customerType === "MEMBER" ? selectedMember?.name : selectedAgent?.name) || "UMUM", customerPhone: (customerType === "UMUM" ? generalPhone : customerType === "MEMBER" ? selectedMember?.phone : selectedAgent?.phone) || "", date: serverTimestamp(), cashier: cashierName || user?.name || "KASIR", store: storeId, status, cashReceived: cashPayload?.received || (isMultiMode ? (parseFloat(multiCashAmount) || 0) : 0), cashChange: cashPayload?.change || 0, lastAddedDP: paidAmount };
    try {
      for (const item of cart) {
        const productRef = doc(db, "stores", storeId, "stock", item.productId); 
        const productDoc = products.find(p => p.id === item.productId);
        if (productDoc && productDoc.variants) { 
          const updatedVariants = productDoc.variants.map((v: any) => { 
            if (v.id === item.variantId) return { ...v, stock: Math.max(0, v.stock - item.quantity) }; 
            return v; 
          }); 
          updateDocumentNonBlocking(productRef, { variants: updatedVariants }); 
        }
      }
      if (appliedVoucher) updateDocumentNonBlocking(doc(db, "coupons", appliedVoucher.id), { isUsed: true, usedAt: serverTimestamp(), usedByTrx: trxId });
      setDocumentNonBlocking(doc(db, "stores", storeId, "transactions", trxId), trxData, { merge: true });
      setTimeout(() => { setIsProcessing(false); setIsSuccess(true); setLastTrxId(trxId); setLastTrxData(trxData); setActiveTrxStatus(status); setIsCashDialogOpen(false); toast({ title: status === "DP" ? "DP Berhasil" : "Transaksi Berhasil" }); }, 800);
    } catch (err) { console.error(err); setIsProcessing(false); toast({ title: "Gagal memproses transaksi", variant: "destructive" }); }
  };

  const handleSettlement = () => {
    if (!settlementTrx) return; setIsProcessing(true);
    const trxRef = doc(db, "stores", storeId, "transactions", settlementTrx.id);
    let updatedTrx;
    if (isAdditionalDP) { const addedAmount = parseFloat(additionalDPInput) || 0; const newPaid = (settlementTrx.paidAmount || 0) + addedAmount; const newRemaining = Math.max(0, settlementTrx.total - newPaid); const newStatus = newRemaining > 0 ? "DP" : "COMPLETED"; updatedTrx = { ...settlementTrx, status: newStatus, paidAmount: newPaid, remainingAmount: newRemaining, lastAddedDP: addedAmount, lastAddedDPAt: serverTimestamp(), lastAddedDPCashier: cashierName || user?.name || "KASIR" }; }
    else { const remainingBefore = settlementTrx.remainingAmount || (settlementTrx.total - (settlementTrx.paidAmount || 0)); updatedTrx = { ...settlementTrx, status: "COMPLETED", paidAmount: settlementTrx.total, remainingAmount: 0, lastAddedDP: remainingBefore, settledAt: serverTimestamp(), settlementCashier: cashierName || user?.name || "KASIR", settlementPaymentMethod: paymentMethod }; }
    updateDocumentNonBlocking(trxRef, updatedTrx);
    setTimeout(() => { setIsProcessing(false); setIsSuccess(true); setLastTrxId(settlementTrx.id); setLastTrxData(updatedTrx); setActiveTrxStatus(updatedTrx.status === "COMPLETED" ? "COMPLETED" : "DP_ADDED"); setSettlementTrx(null); setAdditionalDPInput(""); setIsAdditionalDP(false); toast({ title: isAdditionalDP ? "DP Tambahan Tersimpan" : "Pelunasan Berhasil" }); }, 800);
  };

  const handleNewTransaction = () => { setCart([]); setGeneralName(""); setGeneralPhone(""); setSelectedMember(null); setSelectedAgent(null); setIsDPMode(false); setManualDPInput(""); setIsSuccess(false); setLastTrxId(null); setLastTrxData(null); setSettlementTrx(null); setAppliedVoucher(null); setVoucherCode(""); setReceivedCash(""); setAdditionalDPInput(""); setIsAdditionalDP(false); setManualAdditionalDiscount(""); setIsMultiMode(false); setMultiCashAmount(""); setSelectedTrxForDetails(null); };

  const handleAddMember = () => {
    if (!newMember.name || !newMember.phone) return toast({ title: "Lengkapi data", variant: "destructive" });
    const id = `MBR-${Date.now().toString().slice(-6)}`;
    setDocumentNonBlocking(doc(db, "members", id), { id, name: newMember.name, phone: newMember.phone, address: newMember.address, discount: 0 }, { merge: true });
    setNewMember({ name: "", phone: "", address: "" }); setShowAddMember(false); toast({ title: "Member Terdaftar" });
  };

  const handleAddAgent = () => {
    if (!newAgent.name || !newAgent.phone) return toast({ title: "Lengkapi Nama dan No Telepon", variant: "destructive" });
    
    // Sequential Auto-ID: AGNB-0001
    const maxNum = agents.reduce((max, a) => {
      const num = parseInt(a.id.replace('AGNB-', ''));
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    const nextId = `AGNB-${(maxNum + 1).toString().padStart(4, '0')}`;

    setDocumentNonBlocking(doc(db, "agents", nextId), { 
      id: nextId, 
      name: newAgent.name, 
      phone: newAgent.phone, 
      address: newAgent.address,
      discount: 0 
    }, { merge: true });
    
    setNewAgent({ name: "", phone: "", address: "" }); 
    setShowAddAgent(false); 
    toast({ title: "Agen Terdaftar", description: `ID: ${nextId}` });
  };

  const handleProcessReturn = async () => {
    if (!trxForReturn) return;
    const itemsToReturn = Object.entries(returnQtys).filter(([_, qty]) => qty > 0).map(([id, qty]) => { const item = trxForReturn.items.find((i: any) => `${i.productId}-${i.variantId}` === id); return { ...item, quantity: qty }; });
    if (itemsToReturn.length === 0) { toast({ title: "Gagal", description: "Pilih minimal 1 barang untuk diretur.", variant: "destructive" }); return; }
    setIsProcessing(true);
    try {
      for (const item of itemsToReturn) { const productRef = doc(db, "stores", storeId, "stock", item.productId); const productDoc = products.find(p => p.id === item.productId); if (productDoc && productDoc.variants) { const updatedVariants = productDoc.variants.map((v: any) => { if (v.id === item.variantId) return { ...v, stock: v.stock + item.quantity }; return v; }); updateDocumentNonBlocking(productRef, { variants: updatedVariants }); } }
      const updatedItems = trxForReturn.items.map((item: any) => { const returnQty = returnQtys[`${item.productId}-${item.variantId}`] || 0; return { ...item, quantity: Math.max(0, item.quantity - returnQty) }; }).filter((item: any) => item.quantity > 0);
      const newSubtotalLabel = updatedItems.reduce((sum: number, i: any) => sum + (i.labelPrice * i.quantity), 0);
      const newStoreDiscount = updatedItems.reduce((sum: number, i: any) => sum + (i.storeDiscountNominal * i.quantity), 0);
      const subtotalAfterStore = newSubtotalLabel - newStoreDiscount;
      const origSubtotalAfterStore = (trxForReturn.subtotalLabel || 0) - (trxForReturn.storeDiscount || 0);
      const voucherPct = origSubtotalAfterStore > 0 ? (trxForReturn.voucherDiscount || 0) / origSubtotalAfterStore : 0;
      const newVoucherDiscount = subtotalAfterStore * voucherPct;
      const newTotalDiscount = newStoreDiscount + 0 + 0 + newVoucherDiscount + (trxForReturn.additionalManualDiscount || 0);
      const newTotal = Math.max(0, newSubtotalLabel - newTotalDiscount);
      let newPaidAmount = trxForReturn.paidAmount || 0; if (trxForReturn.status === "COMPLETED") newPaidAmount = newTotal; else newPaidAmount = Math.min(newPaidAmount, newTotal);
      const newRemaining = Math.max(0, newTotal - newPaidAmount); const newStatus = newRemaining > 0 ? "DP" : "COMPLETED";
      const refundTotal = itemsToReturn.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      const returnLog = { returnedAt: new Date().toISOString(), returnedBy: cashierName || user?.name || "KASIR", items: itemsToReturn, totalRefund: refundTotal };
      const trxRef = doc(db, "stores", storeId, "transactions", trxForReturn.id);
      updateDocumentNonBlocking(trxRef, { items: updatedItems, subtotalLabel: newSubtotalLabel, storeDiscount: newStoreDiscount, memberDiscount: 0, agentDiscount: 0, voucherDiscount: newVoucherDiscount, totalDiscount: newTotalDiscount, total: newTotal, paidAmount: newPaidAmount, remainingAmount: newRemaining, status: newStatus, returnLog });
      setTimeout(() => { setIsProcessing(false); setIsReturnDialogOpen(false); toast({ title: "Retur Berhasil", description: "Laporan transaksi telah disesuaikan." }); setIsSuccess(true); setLastTrxId(trxForReturn.id); setLastTrxData({ ...trxForReturn, items: updatedItems, total: newTotal, returnLog }); setActiveTrxStatus("RETURN"); setTrxForReturn(null); }, 800);
    } catch (err) { console.error(err); setIsProcessing(false); toast({ title: "Gagal memproses retur", variant: "destructive" }); }
  };

  const handleSaveModal = () => { const modal = parseFloat(initialCapitalInput) || 0; setDocumentNonBlocking(doc(db, "stores", storeId, "cashLogs", todayId), { modal_awal: modal, saldo_awal_kemarin: yesterdayRemaining, lastUpdated: serverTimestamp(), updatedBy: cashierName || user?.name || "KASIR" }, { merge: true }); toast({ title: "Modal Awal Disimpan" }); };
  const handleAddWithdrawal = () => { const amount = parseFloat(withdrawalAmountInput); if (!amount || amount <= 0) return; const newWithdrawals = [...(cashLog?.pengambilan || []), { amount, timestamp: new Date().toISOString(), note: withdrawalNoteInput, cashier: cashierName || user?.name || "KASIR" }]; setDocumentNonBlocking(doc(db, "stores", storeId, "cashLogs", todayId), { pengambilan: newWithdrawals, lastUpdated: serverTimestamp() }, { merge: true }); setWithdrawalAmountInput(""); setWithdrawalNoteInput(""); toast({ title: "Pengambilan Dicatat" }); };
  const handleSaveCashSettlement = () => { const physical = parseFloat(physicalCashInput) || 0; const expected = yesterdayRemaining + (cashLog?.modal_awal || 0) + todaySalesStats.cash - (cashLog?.pengambilan?.reduce((s: number, w: any) => s + w.amount, 0) || 0); const diff = physical - expected; setDocumentNonBlocking(doc(db, "stores", storeId, "cashLogs", todayId), { uang_fisik: physical, selisih: diff, saldo_awal_kemarin: yesterdayRemaining, total_cash: todaySalesStats.cash, total_transfer: todaySalesStats.transfer, total_qris: todaySalesStats.qris, status: diff === 0 ? "SESUAI" : diff > 0 ? "LEBIH" : "KURANG", isClosed: true, closedAt: serverTimestamp(), closedBy: cashierName || user?.name || "KASIR" }, { merge: true }); toast({ title: "Kas Berhasil Ditutup & Disimpan" }); };

  const CartContentItems = ({ isMobileView = false }) => (
    <div className="space-y-2">
      {settlementTrx ? (
        <div className="space-y-2 py-1">
          {settlementTrx.items?.map((item: any, i: number) => (
            <div key={i} className={cn("pb-1 border-b last:border-0", isMobileView ? "border-slate-100" : "border-white/10")}>
              <p className={cn("text-[9px] uppercase leading-tight font-bold", isMobileView ? "text-slate-800" : "text-white")}>{item.name}</p>
              <div className="flex justify-between mt-0.5">
                <span className={cn("text-[8px] font-bold opacity-60", isMobileView ? "text-slate-400" : "text-white/40")}>{item.quantity}x</span>
                <span className={cn("text-[9px] font-black", isMobileView ? "text-primary" : "text-white")}>Rp{(item.price * item.quantity).toLocaleString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>
      ) : cart.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center py-10">
          <ShoppingCart className={cn("h-10 w-10 mb-2 opacity-20", isMobileView ? "text-slate-300" : "text-white")} />
          <p className={cn("text-[10px] font-black uppercase opacity-30", isMobileView ? "text-slate-400" : "text-white")}>KOSONG</p>
        </div>
      ) : (
        <div className="space-y-2">
          {cart.map(item => (
            <CartItemRow 
              key={item.cartId} item={item} isMobileView={isMobileView} updateItemDiscountPercent={updateItemDiscountPercent} updateItemDiscountNominal={updateItemDiscountNominal} removeFromCart={(id: string) => setCart(prev => prev.filter(i => i.cartId !== id))}
              updateQuantity={(id: string, delta: number) => { setCart(prev => prev.map(i => { if (i.cartId === id) { const newQty = Math.max(1, Math.min(i.stock, i.quantity + delta)); return { ...i, quantity: newQty }; } return i; })); }}
              isSuccess={isSuccess} settlementTrx={settlementTrx}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F7F9FB] overflow-hidden font-body">
      <header className="h-14 flex items-center justify-between px-4 bg-[#1F7A63] shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-lg w-8 h-8 flex items-center justify-center border border-white/20 overflow-hidden">
            <Image src={LOGO_URL} alt="Logo" width={24} height={24} className="object-contain" />
          </div>
          <div><p className="font-black text-xs text-white uppercase leading-tight tracking-tight">NIBRAS HOUSE</p><p className="text-[8px] text-white/70 font-bold uppercase tracking-widest">{displayStoreName}</p></div>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <button onClick={() => setShowCashLogs(true)} className="px-3 py-2 text-[10px] font-black tracking-widest text-white/90 hover:text-white hover:bg-white/10 transition-all uppercase flex items-center gap-2 rounded-md"><Wallet className="h-3.5 w-3.5" /> KAS KASIR</button>
          <button onClick={() => setShowStockList(true)} className="px-3 py-2 text-[10px] font-black tracking-widest text-white/90 hover:text-white hover:bg-white/10 transition-all uppercase flex items-center gap-2 rounded-md"><Database className="h-3.5 w-3.5" /> LIHAT STOK</button>
          <Button variant="ghost" className="text-[10px] font-black tracking-widest text-white/90 hover:text-white hover:bg-white/10 gap-2 px-3" onClick={() => setShowAddMember(true)}><UserPlus className="h-3.5 w-3.5" /> MEMBER</Button>
          <Button variant="ghost" className="text-[10px] font-black tracking-widest text-white/90 hover:text-white hover:bg-white/10 gap-2 px-3" onClick={() => setShowAddAgent(true)}><ShieldCheck className="h-3.5 w-3.5" /> AGEN</Button>
          <button onClick={() => setShowHistory(true)} className="px-3 py-2 text-[10px] font-black tracking-widest text-white/90 hover:text-white hover:bg-white/10 transition-all uppercase flex items-center gap-2 rounded-md"><History className="h-3.5 w-3.5" /> RIWAYAT</button>
          <Button variant="ghost" className="text-[10px] font-black tracking-widest text-white/90 hover:text-white hover:bg-white/10 gap-2 px-3" onClick={() => setShowSettings(true)}><Settings className="h-3.5 w-3.5" /> SETING</Button>
          <div className="h-6 w-px bg-white/20 mx-1" /><Button variant="ghost" size="icon" onClick={() => logout()} className="rounded-full h-10 w-10 text-white hover:bg-rose-500/20 hover:text-white"><LogOut className="h-5 w-5" /></Button>
        </div>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="text-white hover:bg-white/10"><Menu className="h-6 w-6" /></Button></SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 border-none">
              <div className="flex flex-col h-full bg-white">
                <SheetHeader className="p-6 bg-[#1F7A63] text-white text-left">
                  <SheetTitle className="sr-only">Menu Navigasi Kasir</SheetTitle>
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-1 rounded-lg">
                      <Image src={LOGO_URL} alt="Logo" width={32} height={32} className="object-contain" />
                    </div>
                    <div>
                      <p className="font-black text-sm uppercase">{cashierName || "KASIR"}</p>
                      <p className="text-[10px] opacity-70 font-bold uppercase tracking-widest">{displayStoreName}</p>
                    </div>
                  </div>
                </SheetHeader>
                <div className="flex-1 py-4"><nav className="space-y-1">
                  <button onClick={() => { setShowCashLogs(true); }} className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b"><Wallet className="h-5 w-5 text-primary" /> KAS KASIR</button>
                  <button onClick={() => { setShowStockList(true); }} className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b"><Database className="h-5 w-5 text-primary" /> LIHAT STOK</button>
                  <button onClick={() => { setShowAddMember(true); }} className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b"><UserPlus className="h-5 w-5 text-primary" /> TAMBAH MEMBER</button>
                  <button onClick={() => { setShowAddAgent(true); }} className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b"><ShieldCheck className="h-5 w-5 text-primary" /> TAMBAH AGEN</button>
                  <button onClick={() => { setShowHistory(true); }} className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b"><History className="h-5 w-5 text-primary" /> RIWAYAT TRANSAKSI</button>
                  <button onClick={() => { setShowSettings(true); }} className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors border-b"><Settings className="h-5 w-5 text-primary" /> PENGATURAN KASIR</button>
                </nav></div>
                <div className="p-6 border-t"><Button variant="destructive" className="w-full h-12 rounded-xl font-black gap-2" onClick={() => logout()}><LogOut className="h-4 w-4" /> KELUAR</Button></div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:grid md:grid-cols-4 overflow-hidden relative">
        <main className="h-1/2 md:h-full md:col-span-2 p-3 md:p-6 overflow-y-auto bg-slate-50/50 border-b md:border-b-0 md:border-r scrollbar-hide">
          <div className="max-w-5xl mx-auto space-y-3 md:space-y-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Cari produk..." className="h-10 md:h-12 pl-10 rounded-2xl border-none shadow-sm bg-white text-xs md:text-sm" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <div className="flex justify-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="outline" className="h-10 md:h-12 rounded-2xl shadow-sm bg-white border-none px-4 font-bold text-[10px] md:text-sm"><ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Urutkan</Button></DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-2xl w-48" align="end">
                    <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                      <DropdownMenuRadioItem value="name-asc" className="text-xs font-bold uppercase">Nama (A-Z)</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="price-asc" className="text-xs font-bold uppercase">Harga Terendah</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="price-desc" className="text-xs font-bold uppercase">Harga Tertinggi</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 pb-4">
              {filteredProducts.length > 0 ? filteredProducts.map((p, idx) => (
                <Card key={idx} className="border-none shadow-sm rounded-2xl bg-white card-hover cursor-pointer overflow-hidden group" onClick={() => handleProductClick(p)}>
                  <CardContent className="p-2 md:p-4 space-y-1.5 md:space-y-3">
                    <div className="flex justify-between items-center gap-1">
                      <div className="flex flex-wrap gap-0.5 md:gap-1">
                        <Badge className="bg-primary/5 text-primary border-none text-[6px] md:text-[8px] font-black uppercase px-1.5 py-0.5">{p.category}</Badge>
                        <Badge className="bg-slate-100 text-slate-600 border-none text-[6px] md:text-[8px] font-black uppercase px-1.5 py-0.5">{p.brand}</Badge>
                      </div>
                      <span className={cn("text-[6px] md:text-[8px] font-black tracking-tight shrink-0", p.stock < 5 ? "text-rose-500" : "text-slate-400")}>{p.stock} PCS</span>
                    </div>
                    <div>
                      <h3 className="text-[9px] md:text-xs font-black uppercase text-slate-800 line-clamp-1 md:line-clamp-2 leading-tight group-hover:text-primary transition-colors">{p.baseName}</h3>
                      <p className="text-[6px] md:text-[9px] text-slate-400 font-bold uppercase mt-0.5">{p.color}/{p.size}/NOTA: {p.invoiceNo || 'BARU'}</p>
                    </div>
                    <div className="flex items-center justify-between pt-1.5 md:pt-3 border-t border-dashed border-slate-100">
                      <p className="text-primary font-black text-[9px] md:text-sm">Rp{p.price.toLocaleString('id-ID')}</p>
                      <div className="bg-primary/10 p-1 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all">
                        <Plus className="h-2 w-2 md:h-3 md:w-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (<div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20"><Package className="h-16 w-16 mb-4" /><p className="font-black uppercase tracking-widest">Produk tidak ditemukan</p></div>)}
            </div>
          </div>
        </main>

        <div className="flex-1 flex flex-row h-1/2 md:hidden border-t border-slate-200 bg-white">
          <div className="w-1/2 flex flex-col border-r border-slate-100 bg-white">
            <div className="bg-[#1F7A63] text-white p-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="h-3 w-3" />
                <span className="text-[9px] font-black uppercase tracking-widest">Keranjang</span>
              </div>
              <Badge className="bg-white text-primary border-none h-4 min-w-[16px] px-1 text-[8px] font-black">{settlementTrx ? settlementTrx.items?.length || 0 : cart.length}</Badge>
            </div>
            
            <div className="p-2 border-b shrink-0">
              {settlementTrx ? (
                <div className="bg-orange-50 p-2 rounded-xl border border-orange-100 flex justify-between items-center">
                  <div className="min-w-0">
                    <p className="text-[7px] font-black text-orange-600 uppercase tracking-widest mb-0.5">{isAdditionalDP ? "MODE DP+" : "PELUNASAN"}</p>
                    <p className="text-[9px] font-black text-slate-800 uppercase truncate">{settlementTrx.id}</p>
                  </div>
                  <button onClick={() => { setSettlementTrx(null); setIsAdditionalDP(false); }} className="text-orange-400 hover:text-orange-600 p-1">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg">
                    {(["UMUM", "MEMBER", "AGEN"] as const).map(type => (
                      <button key={type} onClick={() => { setCustomerType(type); setSelectedMember(null); setSelectedAgent(null); }} className={cn("flex-1 py-1.5 text-[7px] font-black rounded-md transition-all", customerType === type ? "bg-white text-primary shadow-sm" : "text-slate-400")}>
                        {type}
                      </button>
                    ))}
                  </div>
                  {customerType === "MEMBER" && (
                    <button onClick={() => setShowSelectMember(true)} className="w-full mt-1.5 h-7 border border-dashed border-primary/30 rounded-lg text-[7px] font-black text-primary bg-primary/5 uppercase">
                      {selectedMember ? selectedMember.name : "Pilih Member"}
                    </button>
                  )}
                  {customerType === "AGEN" && (
                    <button onClick={() => setShowSelectAgent(true)} className="w-full mt-1.5 h-7 border border-dashed border-primary/30 rounded-lg text-[7px] font-black text-primary bg-primary/5 uppercase">
                      {selectedAgent ? selectedAgent.name : "Pilih Agen"}
                    </button>
                  )}
                </>
              )}
            </div>

            <ScrollArea className="flex-1 p-2">
              <CartContentItems isMobileView={true} />
            </ScrollArea>

            {!settlementTrx && (
              <div className="p-2 border-t bg-slate-50 shrink-0">
                <div className="relative">
                  <Ticket className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-slate-400" />
                  <Input placeholder="VOCER" className="h-7 pl-6 pr-10 text-[8px] font-black bg-white rounded-lg border-slate-200 uppercase" value={voucherInput} onChange={e => setVoucherCode(e.target.value)} />
                  <button onClick={handleApplyVoucher} className="absolute right-1 top-1/2 -translate-y-1/2 h-5 px-2 bg-[#1F7A63] text-white rounded-md text-[7px] font-black uppercase">CEK</button>
                </div>
              </div>
            )}
          </div>

          <div className="w-1/2 flex flex-col bg-white overflow-hidden">
            <div className="bg-slate-50 p-2.5 flex items-center gap-1.5 border-b shrink-0">
              <Wallet className="h-3 w-3 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-800">Bayar</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
              {isSuccess ? (
                <div className="space-y-3 h-full flex flex-col justify-center animate-in fade-in zoom-in duration-300">
                  <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-emerald-700 uppercase">{activeTrxStatus === 'RETURN' ? 'RETUR SUKSES' : activeTrxStatus === 'DP_ADDED' ? 'DP DITAMBAH' : 'SUKSES!'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold text-[8px] gap-1.5 border-primary text-primary" onClick={() => window.open(`/cashier/print?id=${lastTrxId}&store=${storeId}`, '_blank')}>
                      <Printer className="h-3 w-3" /> STRUK
                    </Button>
                    <Button variant="outline" size="sm" className="h-10 rounded-xl font-bold text-[8px] gap-1.5 border-primary text-primary" onClick={() => window.open(`/cashier/print?id=${lastTrxId}&store=${storeId}&mode=download`, '_blank')}>
                      <Download className="h-3 w-3" /> PDF
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="w-full h-10 rounded-xl font-bold text-[8px] gap-1.5 border-[#25D366] text-[#25D366]" onClick={() => handleWhatsAppReceipt(lastTrxData, activeTrxStatus === 'RETURN')}>
                    <MessageSquare className="h-3 w-3" /> WHATSAPP
                  </Button>
                  <div className="pt-2">
                    <Button className="w-full h-12 rounded-2xl font-black text-[9px] bg-slate-800 uppercase tracking-widest shadow-lg" onClick={handleNewTransaction}>
                      TRANSAKSI BARU
                    </Button>
                  </div>
                </div>
              ) : settlementTrx ? (
                <div className="space-y-4">
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 space-y-2">
                    <div className="flex justify-between text-[8px] font-bold text-orange-400"><span>SUDAH BAYAR</span><span>Rp{settlementTrx.paidAmount?.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between text-[9px] font-black text-orange-700 border-t border-orange-200 border-dashed pt-1.5"><span>SISA TAGIHAN</span><span>Rp{settlementTrx.remainingAmount?.toLocaleString('id-ID')}</span></div>
                  </div>

                  {isAdditionalDP && (
                    <div className="space-y-1">
                      <Label className="text-[7px] font-black uppercase text-orange-600 ml-1">Nominal Tambahan</Label>
                      <Input type="number" placeholder="Rp 0" className="h-8 text-[9px] font-black border-orange-200 bg-orange-50/50 rounded-lg text-center" value={additionalDPInput} onChange={e => setAdditionalDPInput(e.target.value)} />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-[7px] font-black uppercase text-slate-400 ml-1">Metode Bayar</Label>
                    <div className="grid gap-1.5">
                      {(["CASH", "TRANSFER", "QRIS"] as const).map(m => (
                        <button key={m} onClick={() => setPaymentMethod(m)} className={cn("flex items-center justify-between h-9 px-3 rounded-xl border transition-all", paymentMethod === m ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-400")}>
                          <div className="flex items-center gap-2">
                            {m === "CASH" ? <Banknote className="h-3 w-3" /> : m === "TRANSFER" ? <CreditCard className="h-3 w-3" /> : <QrCode className="h-3 w-3" />}
                            <span className="text-[8px] font-black">{m}</span>
                          </div>
                          {paymentMethod === m && <CheckCircle2 className="h-2.5 w-2.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {customerType === "UMUM" && (
                    <div className="space-y-1.5">
                      <Input placeholder="Nama..." className="h-8 text-[9px] font-bold bg-slate-50 border-none rounded-lg" value={generalName} onChange={e => setGeneralName(e.target.value)} />
                      <Input placeholder="No WA..." className="h-8 text-[9px] font-bold bg-slate-50 border-none rounded-lg" value={generalPhone} onChange={e => setGeneralPhone(e.target.value)} />
                    </div>
                  )}

                  <div className="space-y-1 py-2 border-y border-dashed border-slate-100">
                    <div className="flex justify-between text-[8px] font-bold text-slate-400 uppercase"><span>Subtotal</span><span>Rp{subtotalLabel.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between text-[8px] font-black text-rose-500 uppercase"><span>Disc</span><span>-Rp{totalPotongan.toLocaleString('id-ID')}</span></div>
                    <div className="flex justify-between items-end mt-1 pt-1 border-t border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 uppercase">Total</span>
                      <span className="text-sm font-black text-primary leading-none">Rp{totalTagihan.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-1.5">
                      {(["CASH", "TRANSFER", "QRIS"] as const).map(m => (
                        <button key={m} onClick={() => setPaymentMethod(m)} disabled={isMultiMode && m === "CASH"} className={cn("flex-1 h-10 rounded-xl border flex flex-col items-center justify-center gap-0.5 transition-all", paymentMethod === m ? "border-primary bg-primary/5 text-primary" : "border-slate-100 text-slate-300", isMultiMode && m === "CASH" && "opacity-20 grayscale cursor-not-allowed")}>
                          {m === "CASH" ? <Banknote className="h-3.5 w-3.5" /> : m === "TRANSFER" ? <CreditCard className="h-3.5 w-3.5" /> : <QrCode className="h-3.5 w-3.5" />}
                          <span className="text-[6px] font-black">{m}</span>
                        </button>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => { setIsDPMode(!isDPMode); if (!isDPMode) setIsMultiMode(false); }} className={cn("h-8 rounded-lg text-[7px] font-black transition-all", isDPMode ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400")}>
                        {isDPMode ? "DP AKTIF" : "DP"}
                      </button>
                      <button onClick={() => { setIsMultiMode(!isMultiMode); if (!isMultiMode) setIsDPMode(false); }} className={cn("h-8 rounded-lg text-[7px] font-black transition-all", isMultiMode ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-400")}>
                        {isMultiMode ? "MULTI AKTIF" : "MULTI"}
                      </button>
                    </div>

                    <div className="relative">
                      <Percent className="absolute left-2 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-slate-400" />
                      <Input placeholder="DISC TAMBAHAN" type="number" className="h-8 pl-7 text-[8px] font-black bg-slate-50 border-none rounded-lg" value={manualAdditionalDiscount} onChange={e => setManualAdditionalDiscount(e.target.value)} />
                    </div>

                    {isMultiMode && (
                      <div className="bg-blue-50 p-2 rounded-xl border border-blue-100 space-y-2 animate-in slide-in-from-top-2">
                        <Label className="text-[7px] font-black uppercase text-blue-600">Tunai (Cash)</Label>
                        <Input type="number" placeholder="Rp 0" className="h-8 text-[9px] font-black border-blue-200 bg-white text-blue-700 text-center rounded-lg shadow-inner" value={multiCashAmount} onChange={e => setMultiCashAmount(e.target.value)} />
                        <div className="pt-1.5 border-t border-blue-200 border-dashed flex justify-between items-center">
                          <span className="text-[7px] font-bold text-blue-400 uppercase">Sisa via {paymentMethod}</span>
                          <span className="text-[9px] font-black text-blue-600">Rp{Math.max(0, totalTagihan - (parseFloat(multiCashAmount) || 0)).toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    )}

                    {isDPMode && (
                      <div className="bg-orange-50 p-2 rounded-xl border border-orange-100 space-y-1.5 animate-in slide-in-from-top-2">
                        <Label className="text-[7px] font-black uppercase text-orange-600">Nominal DP</Label>
                        <Input type="number" placeholder="Rp 0" className="h-8 text-[9px] font-black border-orange-200 bg-white text-orange-700 text-center rounded-lg shadow-inner" value={manualDPInput} onChange={e => setManualDPInput(e.target.value)} />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {!isSuccess && (
              <div className="p-3 border-t shrink-0">
                <Button 
                  className={cn("w-full h-12 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg", settlementTrx ? "bg-emerald-600" : isDPMode ? "bg-orange-600" : isMultiMode ? "bg-blue-600" : "bg-[#1F7A63]")} 
                  disabled={isProcessing || (settlementTrx ? (isAdditionalDP && !additionalDPInput) : cart.length === 0)} 
                  onClick={settlementTrx ? handleSettlement : handleStartProcess}
                >
                  {isProcessing ? <Loader2 className="animate-spin h-4 w-4" /> : settlementTrx ? (isAdditionalDP ? "SIMPAN DP+" : "LUNASI") : "BAYAR"}
                </Button>
              </div>
            )}
          </div>
        </div>

        <aside className="hidden md:flex col-span-1 border-r flex-col p-5 space-y-4 bg-primary/5 overflow-hidden">
          <Card className="flex-1 border-none soft-shadow rounded-[2rem] bg-primary text-white flex flex-col overflow-hidden shadow-2xl shadow-primary/20">
            <div className="p-5 border-b border-white/10 shrink-0">
              {settlementTrx ? (
                <div className="bg-white/10 p-4 rounded-2xl border border-white/20"><div className="flex justify-between items-start"><p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">{isAdditionalDP ? "MODE DP TAMBAHAN" : "MODE PELUNASAN"}</p><button onClick={() => { setSettlementTrx(null); setIsAdditionalDP(false); }} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button></div><p className="text-xs font-bold text-white uppercase">{settlementTrx.id}</p></div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-1 p-1 bg-white/10 rounded-xl border border-white/5">{(["UMUM", "MEMBER", "AGEN"] as const).map(type => (<button key={type} onClick={() => { setCustomerType(type); setSelectedMember(null); setSelectedAgent(null); }} className={cn("flex-1 py-2 text-[9px] font-black rounded-lg transition-all", customerType === type ? "bg-white text-primary shadow-sm" : "text-white/50 hover:text-white")}>{type}</button>))}</div>
                  {customerType === "MEMBER" && <Button variant="outline" className="w-full h-10 rounded-xl text-[10px] font-black gap-2 border-dashed border-2 border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => setShowSelectMember(true)}><UserCheck className="h-4 w-4" /> {selectedMember ? selectedMember.name.toUpperCase() : "PILIH MEMBER"}</Button>}
                  {customerType === "AGEN" && <Button variant="outline" className="w-full h-10 rounded-xl text-[10px] font-black gap-2 border-dashed border-2 border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => setShowSelectAgent(true)}><ShieldCheck className="h-4 w-4" /> {selectedAgent ? `${selectedAgent.name.toUpperCase()}` : "PILIH AGEN"}</Button>}
                </div>
              )}
            </div>
            <ScrollArea className="flex-1 px-5 py-2"><div className="space-y-3"><CartContentItems /></div></ScrollArea>
            <div className="p-5 border-t border-dashed border-white/20 shrink-0 space-y-4 bg-black/5">
              {!settlementTrx && (<div className="space-y-3">
                <div className="grid grid-cols-2 gap-2"><button onClick={() => { setIsDPMode(!isDPMode); if (!isDPMode) setIsMultiMode(false); }} className={cn("h-10 rounded-2xl text-[9px] font-black tracking-widest transition-all", isDPMode ? "bg-orange-500 text-white border-none shadow-lg shadow-orange-500/20" : "bg-white/5 text-white border-2 border-white/10 hover:bg-white/10")}>{isDPMode ? "DP AKTIF" : "DP"}</button><button onClick={() => { setIsMultiMode(!isMultiMode); if (!isMultiMode) setIsDPMode(false); }} className={cn("h-10 rounded-2xl text-[9px] font-black tracking-widest transition-all", isMultiMode ? "bg-blue-500 text-white border-none shadow-lg shadow-blue-500/20" : "bg-white/5 text-white border-2 border-white/10 hover:bg-white/10")}>{isMultiMode ? "MULTI AKTIF" : "MULTI"}</button></div>
                <div className="relative group"><Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" /><Input placeholder="KODE VOUCHER" className="h-10 pl-9 pr-20 bg-white/10 border-white/10 text-[9px] font-black text-white placeholder:text-white/30 uppercase rounded-xl" value={voucherInput} onChange={e => setVoucherCode(e.target.value)} /><button onClick={handleApplyVoucher} disabled={isValidatingVoucher || !voucherInput} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-3 bg-white text-primary rounded-lg text-[8px] font-black uppercase hover:bg-emerald-50 disabled:opacity-50">{isValidatingVoucher ? "..." : "CEK"}</button></div>
                <div className="relative group"><Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" /><Input placeholder="DISKON TAMBAHAN (RP)" type="number" className="h-10 pl-9 bg-white/10 border-white/10 text-[9px] font-black text-white placeholder:text-white/30 uppercase rounded-xl" value={manualAdditionalDiscount} onChange={e => setManualAdditionalDiscount(e.target.value)} /></div>
                {appliedVoucher && <div className="bg-emerald-500/20 p-2 rounded-lg flex justify-between items-center border border-emerald-500/30"><span className="text-[8px] font-black text-emerald-300">VOUCHER: {appliedVoucher.code}</span><button onClick={() => { setAppliedVoucher(null); setVoucherCode(""); }} className="text-white/50 hover:text-white"><X className="h-3 w-3" /></button></div>}
              </div>)}
              <div className="space-y-1.5 pt-2"><div className="flex justify-between text-[10px] font-bold text-white/50"><span>Subtotal</span><span>Rp{(settlementTrx ? settlementTrx.subtotalLabel : subtotalLabel).toLocaleString('id-ID')}</span></div>{!settlementTrx && (<div className="flex justify-between text-[10px] font-black text-white pt-1 border-t border-white/5 mt-1"><span>Total Potongan</span><span className="text-emerald-300">-Rp{totalPotongan.toLocaleString('id-ID')}</span></div>)}<div className="flex justify-between items-end pt-3 border-t border-dashed border-white/20 mt-2"><span className="text-[10px] font-black text-white/40 uppercase">{settlementTrx ? (isAdditionalDP ? "Cicilan DP" : "Sisa Tagihan") : "Tagihan"}</span><p className="text-2xl font-black text-white tracking-tighter">Rp{(settlementTrx ? (isAdditionalDP ? (parseFloat(additionalDPInput) || 0) : settlementTrx.remainingAmount) : totalTagihan).toLocaleString('id-ID')}</p></div></div>
            </div>
          </Card>
        </aside>

        <aside className="hidden md:flex col-span-1 bg-white flex-col h-full overflow-hidden shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
          <div className="p-6 shrink-0 flex items-center gap-2 border-b-2 border-primary/10"><CreditCard className="h-5 w-5 text-primary" /><span className="text-[11px] font-black uppercase tracking-widest text-slate-800">Pembayaran</span></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {settlementTrx ? (
              <div className="space-y-6">
                <Card className="p-5 border-none bg-orange-50 rounded-3xl space-y-4"><div><p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">CUSTOMER</p><p className="text-sm font-black text-slate-800 uppercase">{settlementTrx.customerName}</p></div><div className="pt-4 border-t border-orange-200 border-dashed space-y-2"><div className="flex justify-between"><span className="text-[10px] font-bold text-slate-500">SUDAH DIBAYAR</span><span className="text-xs font-black">Rp{settlementTrx.paidAmount?.toLocaleString('id-ID')}</span></div><div className="flex justify-between bg-orange-100 p-2 rounded-xl"><span className="text-[10px] font-black text-orange-700">SISA TAGIHAN</span><span className="text-sm font-black text-orange-700">Rp{settlementTrx.remainingAmount?.toLocaleString('id-ID')}</span></div></div></Card>
                {isAdditionalDP && (<div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-100 space-y-3"><Label className="text-[10px] font-black uppercase text-orange-600">Nominal DP Tambahan</Label><Input type="number" value={additionalDPInput} onChange={e => setAdditionalDPInput(e.target.value)} placeholder="0" className="h-12 rounded-xl bg-white border-none font-black text-orange-700 shadow-sm" /></div>)}
                <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Metode {isAdditionalDP ? "DP" : "Pelunasan"}</Label><div className="grid gap-2">{(["CASH", "TRANSFER", "QRIS"] as const).map(m => (<button key={m} onClick={() => setPaymentMethod(m)} className={cn("flex items-center h-14 px-4 gap-4 rounded-xl border-2 transition-all", paymentMethod === m ? "border-primary bg-primary/5 text-primary shadow-inner" : "border-slate-50 text-slate-400 hover:bg-slate-50")}>{m === "CASH" ? <Banknote className="h-5 w-5" /> : m === "TRANSFER" ? <CreditCard className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}<span className="text-[11px] font-black">{m}</span>{paymentMethod === m && <CheckCircle2 className="h-4 w-4 ml-auto" />}</button>))}</div></div>
              </div>
            ) : (
              <>
                {customerType === "UMUM" && (<div className="space-y-4"><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nama (Opsional)</Label><Input value={generalName} onChange={e => setGeneralName(e.target.value)} placeholder="Nama..." className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">No. WA (Opsional)</Label><Input value={generalPhone} onChange={e => setGeneralPhone(e.target.value)} placeholder="08..." className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div></div>)}
                {isMultiMode && (<div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-100 space-y-3 mb-4"><Label className="text-[10px] font-black uppercase text-blue-600">Bagian Pembayaran Tunai (Cash)</Label><Input type="number" value={multiCashAmount} onChange={e => setMultiCashAmount(e.target.value)} placeholder="Masukkan nominal tunai..." className="h-12 rounded-xl bg-white border-none font-black text-blue-700 shadow-sm" /><div className="pt-2 border-t border-blue-200 border-dashed flex justify-between items-center"><span className="text-[9px] font-bold text-blue-400 uppercase">Sisa Metode Lain</span><span className="text-sm font-black text-blue-600">Rp{Math.max(0, totalTagihan - (parseFloat(multiCashAmount) || 0)).toLocaleString('id-ID')}</span></div></div>)}
                <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">{isMultiMode ? "Metode Pembayaran Sisa" : "Metode Bayar Utama"}</Label><div className="grid gap-2">{(["CASH", "TRANSFER", "QRIS"] as const).map(m => (<button key={m} onClick={() => setPaymentMethod(m)} disabled={isMultiMode && m === "CASH"} className={cn("flex items-center h-14 px-4 gap-4 rounded-xl border-2 transition-all", paymentMethod === m ? "border-primary bg-primary/5 text-primary shadow-inner" : "border-slate-50 text-slate-300", isMultiMode && m === "CASH" && "opacity-20 grayscale cursor-not-allowed")}>{m === "CASH" ? <Banknote className="h-5 w-5" /> : m === "TRANSFER" ? <CreditCard className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}<span className="text-[11px] font-black">{m}</span>{paymentMethod === m && <CheckCircle2 className="h-4 w-4 ml-auto" />}</button>))}</div></div>
                {isDPMode && (<div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-100 space-y-3"><Label className="text-[10px] font-black uppercase text-orange-600">Nominal DP</Label><Input type="number" value={manualDPInput} onChange={e => setManualDPInput(e.target.value)} placeholder="0" className="h-12 rounded-xl bg-white border-none font-black text-orange-700 shadow-sm" /></div>)}
              </>
            )}
          </div>
          <div className="p-6 shrink-0 border-t bg-slate-50/50">
            {!isSuccess ? (
              <Button className={cn("w-full h-20 rounded-[2.5rem] font-black text-sm tracking-widest shadow-2xl transition-all", settlementTrx ? "bg-emerald-600 hover:bg-emerald-700" : isDPMode ? "bg-orange-600 hover:bg-orange-700" : isMultiMode ? "bg-blue-600 hover:bg-blue-700" : "bg-primary hover:bg-[#125241]")} disabled={isProcessing || (settlementTrx ? (isAdditionalDP && !additionalDPInput) : cart.length === 0)} onClick={settlementTrx ? handleSettlement : handleStartProcess}>{isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : (settlementTrx ? (isAdditionalDP ? "SIMPAN DP TAMBAHAN" : "KONFIRMASI PELUNASAN") : (isDPMode ? "SIMPAN PESANAN DP" : isMultiMode ? "PROSES MULTI BAYAR" : "BAYAR SEKARANG"))}</Button>
            ) : (
              <div className="space-y-4 animate-in zoom-in duration-300"><div className="bg-emerald-50 p-6 rounded-[2.5rem] flex flex-col items-center gap-2 border-2 border-emerald-100 text-center"><CheckCircle2 className="h-8 w-8 text-emerald-500" /><p className="text-[11px] font-black text-emerald-700 uppercase">{activeTrxStatus === 'RETURN' ? 'RETUR SUKSES' : activeTrxStatus === 'DP_ADDED' ? 'DP BERHASIL DITAMBAH' : 'TRANSAKSI SELESAI'}</p></div><div className="grid grid-cols-2 gap-3"><Button variant="outline" className="h-12 rounded-xl font-black text-[10px] gap-2 border-primary text-primary" onClick={() => window.open(`/cashier/print?id=${lastTrxId}&store=${storeId}${activeTrxStatus === 'RETURN' ? '&type=return' : ''}`, '_blank')}><Printer className="h-4 w-4" /> STRUK</Button><Button variant="outline" className="h-12 rounded-xl font-black text-[10px] gap-2 border-primary text-primary" onClick={() => window.open(`/cashier/print?id=${lastTrxId}&store=${storeId}&mode=download${activeTrxStatus === 'RETURN' ? '&type=return' : ''}`, '_blank')}><Download className="h-4 w-4" /> PDF</Button></div><Button variant="outline" className="w-full h-12 rounded-xl font-black text-[10px] gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10" onClick={() => handleWhatsAppReceipt(lastTrxData, activeTrxStatus === 'RETURN')}><MessageSquare className="h-4 w-4" /> KIRIM STRUK VIA WHATSAPP</Button><Button className="w-full h-14 rounded-xl font-black text-[11px] bg-slate-800" onClick={handleNewTransaction}>TRANSAKSI BARU</Button></div>
            )}
          </div>
        </aside>
      </div>

      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side={isMobile ? "bottom" : "left"} className={cn("p-0 border-none shadow-2xl bg-white", isMobile ? "h-[90vh] rounded-t-[2.5rem]" : "w-[450px]")}>
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <SheetTitle className="font-black uppercase text-xs tracking-widest flex items-center gap-3">
                <History className="h-5 w-5 text-primary" /> Riwayat
              </SheetTitle>
              {isMobile && <button onClick={() => setShowHistory(false)} className="bg-slate-200 p-2 rounded-full"><X className="h-4 w-4" /></button>}
            </SheetHeader>
            <div className="p-6 border-b space-y-2"><Label className="text-[10px] font-black text-slate-400">Filter Tanggal</Label><Input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="h-12 rounded-2xl bg-slate-50 font-bold border-none shadow-inner" /></div>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4 pb-10">
                {history?.map(trx => (
                  <Card key={trx.id} className="p-5 rounded-[1.5rem] soft-shadow border-none hover:bg-primary/5 transition-all group">
                    <div className="flex justify-between mb-2"><p className="text-[10px] font-black text-primary">{trx.id}</p><div className="flex gap-1">{trx.returnLog && <Badge className="bg-rose-100 text-rose-700 text-[8px] font-black border-none px-2">SUDAH RETUR</Badge>}<Badge className={cn("text-[8px] font-black border-none rounded-lg px-2", trx.status === 'DP' ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>{trx.status}</Badge></div></div>
                    <p className="text-sm font-black uppercase text-slate-800">{trx.customerName}</p><p className="text-[9px] text-muted-foreground font-bold">{trx.date?.toDate().toLocaleString('id-ID')}</p>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-slate-200">
                      <p className="text-sm font-black text-primary">Rp{trx.total?.toLocaleString('id-ID')}</p>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={() => setSelectedTrxForDetails(trx)} title="Lihat Rincian"><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={() => window.open(`/cashier/print?id=${trx.id}&store=${storeId}`, '_blank')}><Printer className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-[#25D366] hover:bg-[#25D366]/10 rounded-xl" onClick={() => handleWhatsAppReceipt(trx)}><MessageSquare className="h-4 w-4" /></Button>
                        {trx.status === 'DP' && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-9 border-orange-200 text-orange-600 text-[8px] font-black px-2 rounded-xl hover:bg-orange-50" onClick={() => { setSettlementTrx(trx); setIsAdditionalDP(true); setShowHistory(false); }}>+DP</Button>
                            <Button size="sm" className="h-9 bg-orange-600 text-[8px] font-black px-2 rounded-xl shadow-lg shadow-orange-600/20" onClick={() => { setSettlementTrx(trx); setIsAdditionalDP(false); setShowHistory(false); }}>LUNASI</Button>
                          </div>
                        )}
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-rose-500 hover:bg-rose-50 rounded-xl" onClick={() => { setTrxForReturn(trx); setIsReturnDialogOpen(true); }}><RotateCcw className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showCashDrawer} onOpenChange={setShowCashLogs}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] md:h-[85vh] p-0 flex flex-col rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-5 md:p-8 bg-[#1F7A63] text-white shrink-0">
            <div className="flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 md:p-3 rounded-2xl">
                  <Wallet className="h-5 w-5 md:h-6 md:w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-lg md:text-2xl font-black uppercase flex items-center gap-3">
                    Kas Kasir (Running)
                  </DialogTitle>
                  <p className="text-[9px] md:text-xs font-bold opacity-70 uppercase tracking-widest mt-0.5">
                    {displayStoreName} • {todayId}
                  </p>
                </div>
              </div>
              <Button variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-primary rounded-xl font-bold text-[10px] md:text-sm h-10 md:h-11 px-3 md:px-4 gap-2">
                <Download className="h-3.5 w-3.5 md:h-4 md:w-4" /> <span className="hidden sm:inline">CETAK AUDIT</span><span className="sm:hidden">CETAK</span>
              </Button>
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-6 md:space-y-8 bg-slate-50/50 scrollbar-hide">
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] md:tracking-[0.2em]">Audit Kemarin (Closed)</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
                <StatBox label="Modal Awal" value={yesterdaySplit.totalOpening} sub="Y_O" />
                <StatBox label="Cash Masuk" value={yesterdaySplit.totalCash} sub="Y_S" color="emerald" />
                <StatBox label="Pengambilan" value={yesterdaySplit.totalWithdrawals} sub="Y_W" color="rose" />
                <StatBox label="Trx Lanjutan" value={yesterdaySplit.lanjutan} sub="Y_L" color="blue" />
                <div className="col-span-2 md:col-span-1">
                  <StatBox label="Saldo Akhir" value={yesterdaySplit.closingBalance} sub="Carry Over" color="primary" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <div className="h-px flex-1 bg-primary/20" />
                <span className="text-[9px] md:text-[10px] font-black text-primary uppercase tracking-[0.1em] md:tracking-[0.2em]">Audit Hari Ini (Running)</span>
                <div className="h-px flex-1 bg-primary/20" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50 border-b p-4 md:p-5">
                    <CardTitle className="text-[10px] md:text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                      <Coins className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" /> Rincian Modal Awal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">1. Modal Murni</span>
                        <span className="text-xs font-black">Rp {yesterdaySplit.murni.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">2. Transaksi Lanjutan</span>
                        <span className="text-xs font-black">Rp {yesterdaySplit.lanjutan.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="pt-3 border-t border-dashed flex justify-between items-center">
                        <span className="text-[9px] md:text-[10px] font-black text-slate-800 uppercase">Total Modal Awal</span>
                        <span className="text-sm font-black text-primary">Rp {yesterdayRemaining.toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
                  <CardHeader className="bg-slate-50 border-b p-4 md:p-5">
                    <CardTitle className="text-[10px] md:text-xs font-black uppercase text-slate-400 flex items-center gap-2">
                      <ShoppingCart className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" /> Aktivitas Hari Ini
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Cash Masuk Hari Ini</span>
                        <span className="text-sm font-black text-emerald-600">Rp {todaySalesStats.cash.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase">Total Pengambilan</span>
                        <span className="text-sm font-black text-rose-600">- Rp {(cashLog?.pengambilan?.reduce((s: number, w: any) => s + w.amount, 0) || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] md:rounded-[2.5rem] border-none shadow-2xl bg-primary text-white flex flex-col justify-center text-center p-6 md:p-8">
                  <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-60 mb-1 md:mb-2">Saldo Fisik Saat Ini</p>
                  <p className="text-2xl md:text-4xl font-black tracking-tighter">
                    Rp {(yesterdayRemaining + todaySalesStats.cash - (cashLog?.pengambilan?.reduce((s: number, w: any) => s + w.amount, 0) || 0)).toLocaleString('id-ID')}
                  </p>
                  <div className="mt-3 md:mt-4 inline-flex items-center gap-2 mx-auto bg-white/10 px-3 md:px-4 py-1 md:py-1.5 rounded-full">
                    <div className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[7px] md:text-[8px] font-black uppercase tracking-widest">Running Real-time</span>
                  </div>
                </Card>
              </div>
            </div>

            <Card className="rounded-3xl border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-rose-50 border-b p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="text-[10px] md:text-xs font-black uppercase text-rose-600 flex items-center gap-2">
                  <ArrowDownToLine className="h-3.5 w-3.5 md:h-4 md:w-4" /> Pengambilan Uang (Owner)
                </CardTitle>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Input type="number" value={withdrawalAmountInput} onChange={e => setWithdrawalAmountInput(e.target.value)} placeholder="Nominal Rp" className="h-9 flex-1 sm:w-32 rounded-xl bg-white border-none font-bold text-[10px] md:text-xs shadow-inner" />
                  <Input value={withdrawalNoteInput} onChange={e => setWithdrawalNoteInput(e.target.value)} placeholder="Catatan" className="h-9 flex-1 sm:w-40 rounded-xl bg-white border-none font-bold text-[10px] md:text-xs shadow-inner" />
                  <Button size="sm" onClick={handleAddWithdrawal} className="h-9 rounded-xl font-black bg-rose-600 hover:bg-rose-700 text-[10px]">CATAT</Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                        <TableHead className="text-[8px] md:text-[9px] font-black uppercase pl-5 md:pl-8">Waktu Ambil</TableHead>
                        <TableHead className="text-[8px] md:text-[9px] font-black uppercase">Nominal</TableHead>
                        <TableHead className="text-[8px] md:text-[9px] font-black uppercase">Catatan</TableHead>
                        <TableHead className="text-[8px] md:text-[9px] font-black uppercase text-right pr-5 md:pr-8">Kasir</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashLog?.pengambilan?.map((w: any, idx: number) => (
                        <TableRow key={idx} className="border-b last:border-none">
                          <TableCell className="text-[9px] md:text-[10px] font-bold pl-5 md:pl-8">{format(new Date(w.timestamp), "HH:mm:ss")}</TableCell>
                          <TableCell className="text-[9px] md:text-[10px] font-black text-rose-600">Rp {w.amount.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-[9px] md:text-[10px] text-slate-500 italic uppercase max-w-[100px] truncate">{w.note || "-"}</TableCell>
                          <TableCell className="text-[9px] md:text-[10px] text-right pr-5 md:pr-8 font-bold text-slate-400">{w.cashier || "-"}</TableCell>
                        </TableRow>
                      ))}
                      {(!cashLog?.pengambilan || cashLog.pengambilan.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={4} className="h-20 text-center text-slate-400 text-xs italic">Belum ada pengambilan hari ini.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <DialogFooter className="p-5 md:p-8 bg-white border-t shrink-0">
            <div className="w-full flex flex-col md:flex-row gap-3 md:gap-4 items-center">
              <div className="flex-1 space-y-1 w-full">
                <Label className="text-[9px] md:text-[10px] font-black uppercase text-slate-400 ml-1">Uang Fisik di Tangan (Opname Kasir)</Label>
                <Input 
                  type="number" 
                  value={physicalCashInput || cashLog?.uang_fisik || ""} 
                  onChange={e => setPhysicalCashInput(e.target.value)} 
                  placeholder="Input nominal fisik..." 
                  className="h-12 md:h-14 rounded-2xl bg-slate-50 border-none font-black text-lg md:text-xl text-primary text-center shadow-inner focus-visible:ring-primary" 
                />
              </div>
              <Button 
                className="w-full md:w-auto h-12 md:h-14 px-8 md:px-10 rounded-2xl font-black text-xs md:text-sm shadow-xl shadow-primary/20 uppercase tracking-widest" 
                disabled={isProcessing || !physicalCashInput} 
                onClick={handleSaveCashSettlement}
              >
                SIMPAN & TUTUP KAS
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSelectMember} onOpenChange={setShowSelectMember}><DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl"><DialogHeader className="p-6 border-b bg-slate-50/50"><DialogTitle className="text-xl font-black uppercase">Pilih Member</DialogTitle></DialogHeader><div className="p-6"><div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Cari member..." className="pl-10 h-11 rounded-xl bg-slate-50 border-none" value={search} onChange={e => setSearch(e.target.value)} /></div><ScrollArea className="h-[300px] pr-4"><div className="space-y-2">{members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.phone.includes(search)).map(m => (<button key={m.id} onClick={() => { setSelectedMember(m); setShowSelectMember(false); setSearch(""); }} className="w-full text-left p-4 rounded-2xl hover:bg-primary/5 border border-slate-100 transition-all group"><p className="font-black text-sm uppercase group-hover:text-primary">{m.name}</p><p className="text-[10px] text-slate-400 font-bold">{m.phone}</p></button>))}</div></ScrollArea></div></DialogContent></Dialog>
      <Dialog open={showSelectAgent} onOpenChange={setShowSelectAgent}><DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl"><DialogHeader className="p-6 border-b bg-slate-50/50"><DialogTitle className="text-xl font-black uppercase">Pilih Agen</DialogTitle></DialogHeader><div className="p-6"><div className="relative mb-4"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Cari agen..." className="pl-10 h-11 rounded-xl bg-slate-50 border-none" value={search} onChange={e => setSearch(e.target.value)} /></div><ScrollArea className="h-[300px] pr-4"><div className="space-y-2">{agents.filter(a => a.name.toLowerCase().includes(search.toLowerCase()) || a.phone.includes(search)).map(a => (<button key={a.id} onClick={() => { setSelectedAgent(a); setShowSelectAgent(false); setSearch(""); }} className="w-full text-left p-4 rounded-2xl hover:bg-primary/5 border border-slate-100 transition-all group"><div className="flex justify-between items-center"><p className="font-black text-sm uppercase group-hover:text-primary">{a.name}</p><Badge className="bg-blue-100 text-blue-700 border-none text-[8px] font-black">{a.discount}%</Badge></div><p className="text-[10px] text-slate-400 font-bold">{a.phone}</p></button>))}</div></ScrollArea></div></DialogContent></Dialog>
      <Dialog open={!!selectedTrxForDetails} onOpenChange={o => !o && setSelectedTrxForDetails(null)}><DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl"><DialogHeader className="p-8 bg-primary text-white shrink-0"><div className="flex justify-between items-start"><div><p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Rincian Transaksi</p><DialogTitle className="text-2xl font-black tracking-tighter uppercase">{selectedTrxForDetails?.id}</DialogTitle><p className="text-[10px] font-bold opacity-80 mt-1">{selectedTrxForDetails?.date?.toDate().toLocaleString('id-ID')}</p></div><Badge className={cn("text-[9px] font-black px-3 py-1 rounded-full border-none", selectedTrxForDetails?.status === 'DP' ? "bg-orange-500 text-white" : "bg-white text-primary")}>{selectedTrxForDetails?.status}</Badge></div></DialogHeader><div className="p-8 space-y-6 overflow-y-auto max-h-[60vh] bg-slate-50/50"><div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-2 gap-4"><div><p className="text-[9px] font-black text-muted-foreground uppercase mb-0.5">Nama Customer</p><p className="text-sm font-black uppercase">{selectedTrxForDetails?.customerName || "UMUM"}</p></div><div><p className="text-[9px] font-black text-muted-foreground uppercase mb-0.5">Metode Bayar</p><p className="text-sm font-black uppercase">{selectedTrxForDetails?.paymentMethod || "CASH"}</p></div></div><div className="space-y-3"><div className="flex items-center gap-2 px-2"><Package className="h-4 w-4 text-primary" /><h3 className="text-[10px] font-black uppercase tracking-widest">Daftar Produk</h3></div><Card className="rounded-2xl border-none shadow-sm overflow-hidden bg-white"><Table><TableHeader className="bg-slate-50"><TableRow className="text-[9px] font-black uppercase border-none"><TableHead className="pl-6">Produk</TableHead><TableHead className="text-center">Qty</TableHead><TableHead className="text-right pr-6">Subtotal</TableHead></TableRow></TableHeader><TableBody>{selectedTrxForDetails?.items?.map((item: any, i: number) => (<TableRow key={i} className="border-b last:border-none"><TableCell className="pl-6"><p className="font-bold text-[11px] uppercase leading-tight">{item.name}</p><p className="text-[9px] text-muted-foreground uppercase">{item.color} | {item.size}</p></TableCell><TableCell className="text-center font-black text-xs">{item.quantity}</TableCell><TableCell className="text-right pr-6 font-black text-xs">Rp {(item.price * item.quantity).toLocaleString('id-ID')}</TableCell></TableRow>))}</TableBody></Table></Card></div><div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-2"><div className="flex justify-between text-xs font-bold"><span>Total Tagihan</span><span>Rp {selectedTrxForDetails?.total.toLocaleString('id-ID')}</span></div><div className="flex justify-between text-xs font-black text-emerald-600"><span>Sudah Dibayar</span><span>Rp {selectedTrxForDetails?.paidAmount.toLocaleString('id-ID')}</span></div><div className="flex justify-between text-xs font-black text-orange-600"><span>Sisa Pelunasan</span><span>Rp {selectedTrxForDetails?.remainingAmount.toLocaleString('id-ID')}</span></div></div></div><DialogFooter className="p-6 bg-white border-t shrink-0"><Button variant="outline" className="w-full h-12 rounded-xl font-black uppercase text-[10px] tracking-widest" onClick={() => setSelectedTrxForDetails(null)}>Tutup</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}><DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl"><DialogHeader className="p-8 border-b bg-slate-50/50"><DialogTitle className="text-xl font-black uppercase">Tambah Member Baru</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase ml-1">Nama Lengkap</Label><Input value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="Contoh: Siti Aminah" className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase ml-1">No. WhatsApp</Label><Input value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} placeholder="08..." className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase ml-1">Alamat</Label><Input value={newMember.address} onChange={e => setNewMember({...newMember, address: e.target.value})} placeholder="Alamat..." className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div></div><DialogFooter><Button className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20" onClick={handleAddMember}>DAFTARKAN MEMBER</Button></DialogFooter></DialogContent></Dialog>
      
      {/* Dialog Tambah Agen Baru - Kasir */}
      <Dialog open={showAddAgent} onOpenChange={setShowAddAgent}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader className="p-8 border-b bg-slate-50/50">
            <DialogTitle className="text-xl font-black uppercase text-primary">Tambah Agen Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1">Nama Lengkap Agen</Label>
              <Input 
                value={newAgent.name} 
                onChange={e => setNewAgent({...newAgent, name: e.target.value})} 
                placeholder="Contoh: Ahmad Subarjo" 
                className="h-12 rounded-xl bg-slate-50 border-none font-bold" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1">No. WhatsApp</Label>
              <Input 
                value={newAgent.phone} 
                onChange={e => setNewAgent({...newAgent, phone: e.target.value})} 
                placeholder="08..." 
                className="h-12 rounded-xl bg-slate-50 border-none font-bold" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase ml-1">Alamat Lengkap</Label>
              <Textarea 
                value={newAgent.address} 
                onChange={e => setNewAgent({...newAgent, address: e.target.value})} 
                placeholder="Masukkan alamat lengkap..." 
                className="rounded-xl bg-slate-50 border-none font-bold min-h-[100px]" 
              />
            </div>
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-[10px] font-black text-primary uppercase">Info:</p>
              <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">ID Agen (AGNB-xxxx) akan terbuat otomatis.</p>
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 text-lg" onClick={handleAddAgent}>DAFTARKAN AGEN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSettings} onOpenChange={setShowSettings}><DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl"><DialogHeader><DialogTitle className="text-xl font-black uppercase">Pengaturan Kasir</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase ml-1">Nama Tampilan Kasir</Label><Input value={cashierName} onChange={e => setCashierName(e.target.value)} placeholder="Ketik nama Anda..." className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div></div><DialogFooter><Button className="w-full h-12 rounded-xl font-black" onClick={handleSaveSettings}>SIMPAN</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen}><DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl text-center"><DialogHeader><DialogTitle className="text-2xl font-black uppercase tracking-tighter mx-auto">Input Tunai</DialogTitle></DialogHeader><div className="py-8 space-y-6"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Total Tagihan</Label><p className="text-3xl font-black text-primary">Rp{totalTagihan.toLocaleString('id-ID')}</p></div><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400">Uang Diterima (Rp)</Label><Input type="number" value={receivedCash} onChange={e => setReceivedCash(e.target.value)} className="h-16 text-center text-3xl font-black border-none bg-slate-50 rounded-2xl focus-visible:ring-primary shadow-inner" placeholder="0" autoFocus onFocus={(e) => e.target.select()} /></div><div className="flex gap-2 justify-center flex-wrap">{[50000, 100000, 150000, 200000].map(val => (<Button key={val} variant="outline" size="sm" className="rounded-full font-bold text-[10px] border-slate-200" onClick={() => setReceivedCash(val.toString())}>+Rp{val.toLocaleString('id-ID')}</Button>))}</div>{parseFloat(receivedCash) >= totalTagihan && (<div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 animate-in zoom-in duration-300"><p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Kembalian</p><p className="text-2xl font-black text-emerald-700">Rp{(parseFloat(receivedCash) - totalTagihan).toLocaleString('id-ID')}</p></div>)}</div><DialogFooter className="flex gap-3"><Button variant="ghost" className="flex-1 font-bold h-12 rounded-xl" onClick={() => setIsCashDialogOpen(false)}>BATAL</Button><Button className="flex-1 font-black h-12 rounded-xl shadow-lg shadow-primary/20" disabled={!receivedCash || parseFloat(receivedCash) < totalTagihan} onClick={() => handleProcessTransaction({ received: parseFloat(receivedCash), change: parseFloat(receivedCash) - totalTagihan })}>PROSES BAYAR</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}><DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl"><DialogHeader className="p-8 bg-rose-600 text-white shrink-0"><div className="flex justify-between items-center"><DialogTitle className="text-2xl font-black uppercase flex items-center gap-3"><RotateCcw className="h-6 w-6" /> Proses Retur Barang</DialogTitle><Badge className="bg-white/20 text-white border-none font-black px-3">{trxForReturn?.id}</Badge></div></DialogHeader><div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50/50"><div className="bg-rose-50 p-4 rounded-2xl border border-rose-100 text-rose-700 flex items-start gap-3"><AlertCircle className="h-5 w-5 shrink-0 mt-0.5" /><p className="text-[11px] font-bold leading-relaxed uppercase">Pilih jumlah barang yang akan dikembalikan. Stok sistem akan otomatis bertambah kembali setelah proses ini selesai.</p></div><div className="space-y-3">{trxForReturn?.items?.map((item: any, i: number) => { const itemId = `${item.productId}-${item.variantId}`; return (<Card key={itemId} className="p-4 rounded-2xl border-none shadow-sm bg-white flex items-center justify-between"><div><p className="font-black text-xs uppercase leading-tight">{item.name}</p><p className="text-[9px] text-muted-foreground uppercase font-bold">{item.color} | {item.size}</p><p className="text-[9px] font-black text-primary mt-1">Rp {item.price.toLocaleString('id-ID')}</p></div><div className="flex items-center gap-3"><span className="text-[10px] font-bold text-slate-400 uppercase">Max: {item.quantity}</span><div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl"><button className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm disabled:opacity-30" disabled={!returnQtys[itemId]} onClick={() => setReturnQtys(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) - 1 }))}><Minus className="h-3 w-3" /></button><span className="w-6 text-center font-black text-sm">{returnQtys[itemId] || 0}</span><button className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm disabled:opacity-30" disabled={(returnQtys[itemId] || 0) >= item.quantity} onClick={() => setReturnQtys(prev => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }))}><Plus className="h-3 w-3" /></button></div></div></Card>); })}</div></div><DialogFooter className="p-6 bg-white border-t shrink-0"><Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => { setIsReturnDialogOpen(false); setTrxForReturn(null); setReturnQtys({}); }}>BATAL</Button><Button className="flex-[2] h-12 rounded-xl font-black bg-rose-600 hover:bg-rose-700 shadow-xl shadow-rose-600/20 uppercase tracking-widest" disabled={isProcessing || !Object.values(returnQtys).some(q => q > 0)} onClick={handleProcessReturn}>{isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "KONFIRMASI RETUR"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showStockList} onOpenChange={setShowStockList}><DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 flex flex-col rounded-[2.5rem] overflow-hidden border-none shadow-2xl"><DialogHeader className="p-6 md:p-8 bg-[#1F7A63] text-white shrink-0"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="bg-white/10 p-3 rounded-2xl"><Database className="h-6 w-6 text-white" /></div><div><DialogTitle className="text-xl md:text-2xl font-black uppercase">Cek Stok Barang</DialogTitle><p className="text-[10px] md:text-xs font-bold opacity-70 uppercase tracking-widest mt-1">Data inventaris real-time cabang</p></div></div><div className="w-full md:w-64"><Select value={stockViewingStoreId} onValueChange={setStockViewingStoreId}><SelectTrigger className="h-12 rounded-2xl bg-white/10 border-white/20 text-white font-black text-sm"><SelectValue placeholder="Pilih Cabang" /></SelectTrigger><SelectContent className="rounded-2xl"><SelectItem value="TOKO_A" className="font-bold">NHS KWT</SelectItem><SelectItem value="TOKO_B" className="font-bold">IND CO</SelectItem><SelectItem value="TOKO_C" className="font-bold">NHS GDM</SelectItem></SelectContent></Select></div></div></DialogHeader><div className="p-6 border-b bg-slate-50/50"><div className="relative"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" /><Input placeholder="Cari..." className="h-12 pl-12 rounded-2xl bg-white border-none shadow-inner font-bold text-sm" value={search} onChange={e => setSearch(e.target.value)} /></div></div><div className="flex-1 overflow-y-auto p-0 scrollbar-hide"><Table><TableHeader className="bg-slate-50 sticky top-0 z-10"><TableRow className="text-[10px] font-black uppercase border-none"><TableHead className="pl-8">Produk & Varian</TableHead><TableHead className="text-center">Stok</TableHead><TableHead className="text-right pr-8">Harga</TableHead></TableRow></TableHeader><TableBody>{stockDialogProducts.flatMap(p => (p.variants || []).map((v: any, idx: number) => {
          const searchableText = [p.name, v.color, v.size, p.brand || "", p.category || ""].join(" ").toLowerCase();
          if (search && !searchableText.includes(search.toLowerCase())) return null;
          return (<TableRow key={`${p.id}-${v.id}`} className="hover:bg-primary/5 transition-colors border-b border-slate-50"><TableCell className="pl-8 py-4"><p className="font-black text-sm uppercase text-slate-800">{p.name}</p><div className="flex items-center gap-2 mt-1"><Badge variant="outline" className="text-[8px] font-black border-slate-200 uppercase">{v.color}</Badge><Badge variant="outline" className="text-[8px] font-black border-slate-200 uppercase">{v.size}</Badge></div></TableCell><TableCell className="text-center"><Badge className={cn("text-[10px] font-black border-none px-3", v.stock < 5 ? "bg-rose-100 text-rose-600" : "bg-primary/10 text-primary")}>{v.stock} PCS</Badge></TableCell><TableCell className="text-right pr-8 font-black text-sm text-slate-800">Rp{v.price.toLocaleString('id-ID')}</TableCell></TableRow>);
        }))}</TableBody></Table></div><DialogFooter className="p-6 bg-white border-t shrink-0"><Button className="w-full font-black h-12 rounded-xl" onClick={() => setShowStockList(false)}>TUTUP</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function StatBox({ label, value, sub, color = "slate" }: any) {
  const colorMap: any = {
    slate: "text-slate-600 bg-slate-100",
    emerald: "text-emerald-700 bg-emerald-50",
    rose: "text-rose-700 bg-rose-50",
    blue: "text-blue-700 bg-blue-50",
    primary: "text-white bg-[#1F7A63] shadow-lg shadow-primary/20",
  };
  return (
    <div className={cn("p-3 md:p-4 rounded-2xl flex flex-col items-center text-center transition-all", colorMap[color])}>
      <p className="text-[7px] md:text-[8px] font-black uppercase opacity-60 leading-none mb-1 md:mb-1.5 tracking-wider">{label}</p>
      <p className="text-xs md:text-sm font-black tracking-tight">Rp {value.toLocaleString('id-ID')}</p>
      {sub && <p className="text-[5px] md:text-[6px] font-bold opacity-40 mt-0.5 md:mt-1">{sub}</p>}
    </div>
  );
}
