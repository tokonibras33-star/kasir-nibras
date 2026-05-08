
"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  LogOut, 
  CheckCircle2,
  History,
  Settings,
  ShieldCheck,
  ArrowUpDown,
  Banknote,
  QrCode,
  CreditCard,
  Printer,
  Loader2,
  X,
  UserPlus,
  Percent,
  Ticket,
  Menu,
  Calculator,
  Package,
  RotateCcw,
  GitMerge,
  Wallet,
  MessageSquare,
  User,
  Globe,
  Wifi,
  Users,
  Edit2,
  Download
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { 
  useFirestore, 
  useCollection, 
  useDoc, 
  useMemoFirebase,
  setDocumentNonBlocking,
  updateDocumentNonBlocking 
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, getDocs, limit, Timestamp, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format, subDays } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import Image from "next/image";

// Modularized Components
import { CashDrawerDialog } from "@/components/cashier/CashDrawerDialog";
import { StockManagementDialog } from "@/components/cashier/StockManagementDialog";
import { TransactionHistorySheet } from "@/components/cashier/TransactionHistorySheet";
import { TransactionDetailsDialog } from "@/components/cashier/TransactionDetailsDialog";

interface CartItem {
  cartId: string;
  productId: string;
  variantId: string;
  name: string;
  color: string;
  size: string;
  brand: string;
  category: string;
  series: string;
  price: number; 
  labelPrice: number; 
  buyPrice: number;
  buyDiscount: string;
  storeDiscountPercent: number; 
  storeDiscountNominal: number;
  quantity: number;
  stock: number;
}

interface Member { id: string; name: string; phone: string; address: string; discount: number; branch: string; registrationDate: string; }
interface Agent { id: string; name: string; phone: string; address: string; discount: number; branch: string; registrationDate: string; }
interface Reseller { id: string; name: string; phone: string; address: string; discount: number; branch: string; registrationDate: string; }
interface Voucher { id: string; code: string; discount: number; isUsed: boolean; }

const LOGO_URL = "https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png";
const DEFAULT_CARD_BG = "https://res.cloudinary.com/dgsxujjb1/image/upload/v1778132431/KartuMember_IndahFashion_1_lun0a1.png";

const formatCurrencyInput = (val: string | number) => {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? val.replace(/[^0-9]/g, '') : Math.round(val).toString();
  if (!num) return '';
  return 'Rp ' + parseInt(num).toLocaleString('id-ID');
};

const parseCurrencyInput = (val: string) => {
  return val.replace(/[^0-9]/g, '');
};

const generateSearchTokens = (name: string, brand: string, category: string, series: string, variants: any[]) => {
  const tokens = new Set<string>();
  const add = (val: string) => {
    if (!val) return;
    val.toLowerCase().split(/[\s-/]+/).forEach(t => {
      if (t && t.length > 0) tokens.add(t);
    });
  };
  add(name); add(brand); add(category); add(series);
  variants.forEach(v => { add(v.color); add(v.size); });
  return Array.from(tokens);
};

const CartItemRow = ({ 
  item, 
  updateItemDiscountPercent, 
  updateItemDiscountNominal, 
  removeFromCart, 
  updateQuantity,
  isSuccess,
  settlementTrx 
}: any) => {
  const [localPct, setLocalPct] = useState(item?.storeDiscountPercent > 0 ? item.storeDiscountPercent.toString() : "");
  const [localNom, setLocalNom] = useState(item?.storeDiscountNominal > 0 ? item.storeDiscountNominal.toString() : "");

  useEffect(() => {
    if (item) {
      setLocalPct(item.storeDiscountPercent > 0 ? item.storeDiscountPercent.toString() : "");
      setLocalNom(item.storeDiscountNominal > 0 ? item.storeDiscountNominal.toString() : "");
    }
  }, [item]);

  if (!item) return null;

  const handlePctBlur = () => updateItemDiscountPercent(item.cartId, localPct);
  const handleNomBlur = () => updateItemDiscountNominal(item.cartId, localNom);

  return (
    <div className={cn("flex flex-col gap-1 pb-3 mb-1 border-b last:border-0 border-white/10")}>
      <div className="flex justify-between items-start gap-1">
        <div className="min-w-0 flex-1">
          <p className="text-[9px] md:text-[11px] uppercase leading-tight font-black text-white line-clamp-2">{item.name}</p>
          <p className="text-[7px] md:text-[9px] font-bold text-white/60">
            {item.color}/{item.size}/{item.buyDiscount || '0'}%
          </p>
        </div>
        {!isSuccess && !settlementTrx && (
          <button onClick={() => removeFromCart(item.cartId)} className="shrink-0 p-1 rounded-full hover:bg-white/10 transition-colors text-rose-300">
            <Trash2 className="h-3 md:h-3.5 w-3 md:w-3.5" />
          </button>
        )}
      </div>
      {!isSuccess && !settlementTrx && (
        <div className="flex flex-col sm:flex-row items-center gap-1.5 pt-1.5 mt-1 border-t border-dashed border-white/10">
          <div className="flex gap-1 w-full sm:w-auto">
            <div className="flex-1 sm:w-10"><Input placeholder="%" value={localPct} onChange={(e) => { setLocalPct(e.target.value); if (e.target.value !== "") setLocalNom(""); }} onBlur={handlePctBlur} className="h-6 md:h-7 border-none text-[8px] md:text-[10px] font-black text-center px-1 rounded-lg bg-white/20 text-white placeholder:text-white/40 shadow-none focus-visible:ring-0" /></div>
            <div className="flex-1 sm:w-16"><Input placeholder="DISC" value={localNom} onChange={(e) => { setLocalNom(e.target.value); if (e.target.value !== "") setLocalPct(""); }} onBlur={handleNomBlur} className="h-6 md:h-7 border-none text-[8px] md:text-[10px] font-black text-center px-1 rounded-lg bg-white/20 text-white placeholder:text-white/40 shadow-none focus-visible:ring-0" /></div>
          </div>
          <div className="flex items-center justify-between w-full sm:w-auto sm:flex-1 gap-2">
            <div className="flex items-center gap-1">
              <button onClick={() => updateQuantity(item.cartId, -1)} className="h-6 w-6 rounded-lg flex items-center justify-center bg-white/10 text-white hover:bg-white/20"><Minus className="h-2 w-2" /></button>
              <span className="text-[9px] font-black w-3 text-center text-white">{item.quantity}</span>
              <button onClick={() => updateQuantity(item.cartId, 1)} className="h-6 w-6 rounded-lg flex items-center justify-center bg-white/10 text-white hover:bg-white/20"><Plus className="h-2 w-2" /></button>
            </div>
            <p className="text-[9px] font-black leading-none text-white text-right">Rp{(item.price * item.quantity).toLocaleString('id-ID')}</p>
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
  const displayStoreName = storeId === "TOKO_A" ? "NHS KWT" : storeId === "TOKO_B" ? "IND CO" : "NHS GDM";
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cashierName, setCashierName] = useState("");
  
  const [customStoreName, setCustomStoreName] = useState("");
  const [customStoreAddress, setCustomStoreAddress] = useState("");
  const [customStorePhone, setCustomStorePhone] = useState("");

  const [showSettings, setShowSettings] = useState(false);
  const [showStockList, setShowStockList] = useState(false);
  const [stockViewingStoreId, setStockViewingStoreId] = useState<string>(storeId);
  const [showCashDrawer, setShowCashLogs] = useState(false);

  const todayId = format(new Date(), "yyyy-MM-dd");
  const yesterdayId = format(subDays(new Date(), 1), "yyyy-MM-dd");
  
  const [customerType, setCustomerType] = useState<"UMUM" | "MEMBER" | "AGEN" | "ONLINE" | "RESELLER">("UMUM");
  const [generalName, setGeneralName] = useState("");
  const [generalPhone, setGeneralPhone] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedReseller, setSelectedReseller] = useState<Reseller | null>(null);
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
  const [showHistory, setShowHistory] = useState(false);
  const [showSelectMember, setShowSelectMember] = useState(false);
  const [showSelectAgent, setShowSelectAgent] = useState(false);
  const [showSelectReseller, setShowSelectReseller] = useState(false);
  const [historyDate, setHistoryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [historyFilterMode, setHistoryFilterMode] = useState<"daily" | "monthly">("daily");
  const [showOnlyDP, setShowOnlyDP] = useState(false);
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [receivedCash, setReceivedCash] = useState("");
  const [selectedTrxForDetails, setSelectedTrxForDetails] = useState<any>(null);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [trxForReturn, setTrxForReturn] = useState<any>(null);

  const [isRegisterMemberOpen, setIsRegisterMemberOpen] = useState(false);
  const [isRegisterAgentOpen, setIsRegisterAgentOpen] = useState(false);
  const [isRegisterResellerOpen, setIsRegisterResellerOpen] = useState(false);
  const [newRegData, setNewRegData] = useState({ name: "", phone: "", address: "" });

  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [isEditAgentOpen, setIsEditAgentOpen] = useState(false);
  const [isEditResellerOpen, setIsEditResellerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);

  const [isPrintingCard, setIsPrintingCard] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (user?.associatedStoreId) setStockViewingStoreId(user.associatedStoreId);
    
    const savedName = localStorage.getItem("nibras_house_cashier_name");
    if (savedName) setCashierName(savedName);
    else if (user?.name) setCashierName(user.name);
  }, [user, loading, router]);

  useEffect(() => {
    if (storeId) {
      setCustomStoreName(localStorage.getItem(`nh_store_name_${storeId}`) || "");
      setCustomStoreAddress(localStorage.getItem(`nh_store_address_${storeId}`) || "");
      setCustomStorePhone(localStorage.getItem(`nh_store_phone_${storeId}`) || "");
    }
  }, [storeId]);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const productsQuery = useMemoFirebase(() => user ? query(collection(db, "stores", storeId, "stock"), limit(500)) : null, [db, storeId, user]);
  const { data: products } = useCollection<any>(productsQuery);

  const stockAQuery = useMemoFirebase(() => user ? collection(db, 'stores', 'TOKO_A', 'stock') : null, [db, user]);
  const { data: dataA, isLoading: isALoading } = useCollection<any>(stockAQuery);
  
  const stockBQuery = useMemoFirebase(() => user ? collection(db, 'stores', 'TOKO_B', 'stock') : null, [db, user]);
  const { data: dataB, isLoading: isBLoading } = useCollection<any>(stockBQuery);

  const stockCQuery = useMemoFirebase(() => user ? collection(db, 'stores', 'TOKO_C', 'stock') : null, [db, user]);
  const { data: dataC, isLoading: isCLoading } = useCollection<any>(stockCQuery);

  const stockA = dataA || [];
  const stockB = dataB || [];
  const stockC = dataC || [];
  const isStockLoading = isALoading || isBLoading || isCLoading;

  const membersQuery = useMemoFirebase(() => user ? collection(db, "members") : null, [db, user]);
  const { data: members } = useCollection<Member>(membersQuery);

  const agentsQuery = useMemoFirebase(() => user ? collection(db, "agents") : null, [db, user]);
  const { data: agents } = useCollection<Agent>(agentsQuery);

  const resellersQuery = useMemoFirebase(() => user ? collection(db, "resellers") : null, [db, user]);
  const { data: resellers } = useCollection<Reseller>(resellersQuery);

  const cardSettingsRef = useMemoFirebase(() => doc(db, "settings", "memberCard"), [db]);
  const { data: cardSettings } = useDoc<any>(cardSettingsRef);
  const currentCardBg = cardSettings?.backgroundUrl || DEFAULT_CARD_BG;

  const stockDialogProducts = useMemo(() => {
    if (stockViewingStoreId === "ALL") return [...stockA, ...stockB, ...stockC];
    if (stockViewingStoreId === "TOKO_A") return stockA;
    if (stockViewingStoreId === "TOKO_B") return stockB;
    if (stockViewingStoreId === "TOKO_C") return stockC;
    return [];
  }, [stockViewingStoreId, stockA, stockB, stockC]);

  const historyQuery = useMemoFirebase(() => {
    if (!user || !historyDate) return null;
    const q = collection(db, "stores", storeId, "transactions");
    if (historyFilterMode === "daily") {
      const start = new Date(historyDate); start.setHours(0, 0, 0, 0);
      const end = new Date(historyDate); end.setHours(23, 59, 59, 999);
      return query(q, where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)), orderBy("date", "desc"));
    } else {
      const [year, month] = historyDate.split("-");
      const start = new Date(parseInt(year), parseInt(month) - 1, 1);
      const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      return query(q, where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)), orderBy("date", "desc"));
    }
  }, [db, storeId, user, historyDate, historyFilterMode]);
  const { data: historyData } = useCollection<any>(historyQuery);

  const liveTrxRef = useMemoFirebase(() => 
    selectedTrxForDetails && user ? doc(db, "stores", storeId, "transactions", selectedTrxForDetails.id) : null, 
    [db, user, selectedTrxForDetails, storeId]
  );
  const { data: liveTrxDetails } = useDoc<any>(liveTrxRef);

  const [yesterdayTrx, setYesterdayTrx] = useState<any[]>([]);
  useEffect(() => {
    if (storeId && db) {
      const start = new Date(yesterdayId); start.setHours(0, 0, 0, 0);
      const end = new Date(yesterdayId); end.setHours(23, 59, 59, 999);
      const q = query(collection(db, "stores", storeId, "transactions"), where("date", ">=", Timestamp.fromDate(start)), where("date", "<=", Timestamp.fromDate(end)));
      getDocs(q).then(snap => setYesterdayTrx(snap.docs.map(d => ({ ...d.data(), id: d.id }))));
    }
  }, [storeId, db, yesterdayId]);

  const yesterdayLogRef = useMemoFirebase(() => user ? doc(db, "stores", storeId, "cashLogs", yesterdayId) : null, [db, storeId, user, yesterdayId]);
  const { data: yesterdayLog } = useDoc<any>(yesterdayLogRef);

  const yesterdaySplit = useMemo(() => {
    if (!yesterdayLog) return { murni: 0, lanjutan: 0, totalOpening: 0, totalCash: 0, totalWithdrawals: 0, totalExpenses: 0, closingBalance: 0 };
    const openingY = (yesterdayLog.saldo_awal_kemarin || 0) + (yesterdayLog.modal_awal || 0);
    const withdrawalsY = yesterdayLog.pengambilan || [];
    const totalWithdrawalsY = withdrawalsY.reduce((s: number, w: any) => s + w.amount, 0);
    const expensesY = yesterdayLog.pengeluaran || [];
    const totalExpensesY = expensesY.reduce((s: number, e: any) => s + e.amount, 0);
    const cashTrxY = yesterdayTrx.filter(t => t.paymentBreakdown ? (t.paymentBreakdown.cash || 0) > 0 : (t.paymentMethod === "CASH" || t.paymentMethod?.includes("CASH")));
    const totalCashSalesY = cashTrxY.reduce((s, t) => s + (t.paymentBreakdown ? t.paymentBreakdown.cash : (t.paidAmount || 0)), 0);
    const latestWithdrawal = withdrawalsY.length > 0 ? [...withdrawalsY].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp : "1970-01-01";
    const latestExpense = expensesY.length > 0 ? [...expensesY].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp : "1970-01-01";
    const lastActionTime = Math.max(new Date(latestWithdrawal).getTime(), new Date(latestExpense).getTime());
    let salesBefore = 0; let salesAfter = 0;
    cashTrxY.forEach(t => {
      const tTime = t.date?.toDate?.()?.getTime() || 0;
      const cash = t.paymentBreakdown ? t.paymentBreakdown.cash : (t.paidAmount || 0);
      if (tTime <= lastActionTime) salesBefore += cash; else salesAfter += cash;
    });
    const murni = openingY + salesBefore - totalWithdrawalsY - totalExpensesY;
    const lanjutan = salesAfter;
    return { murni, lanjutan, totalOpening: openingY, totalCash: totalCashSalesY, totalWithdrawals: totalWithdrawalsY, totalExpenses: totalExpensesY, closingBalance: murni + lanjutan };
  }, [yesterdayLog, yesterdayTrx]);

  const yesterdayRemaining = yesterdaySplit.closingBalance;
  const cashLogRef = useMemoFirebase(() => user ? doc(db, "stores", storeId, "cashLogs", todayId) : null, [db, storeId, user, todayId]);
  const { data: cashLog } = useDoc<any>(cashLogRef);

  const todaySalesStats = useMemo(() => {
    if (!historyData) return { cash: 0, transfer: 0, qris: 0 };
    return historyData.reduce((acc, trx) => {
      const paid = trx.paidAmount || 0;
      if (trx.paymentBreakdown) {
        acc.cash += trx.paymentBreakdown.cash || 0;
        const otherMethod = trx.paymentBreakdown.otherMethod;
        if (otherMethod === "TRANSFER") acc.transfer += trx.paymentBreakdown.other || 0;
        if (otherMethod === "QRIS") acc.qris += trx.paymentBreakdown.other || 0;
      } else {
        const method = trx.paymentMethod || "CASH";
        if (method === "CASH" || method.includes("CASH")) acc.cash += paid;
        else if (method === "TRANSFER") acc.transfer += paid;
        else if (method === "QRIS") acc.qris += paid;
      }
      return acc;
    }, { cash: 0, transfer: 0, qris: 0 });
  }, [historyData]);

  const filteredProducts = useMemo(() => {
    const tokens = debouncedSearch.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    const flattened: any[] = [];
    products?.forEach(p => {
      p.variants?.forEach((v: any) => {
        if (v.stock <= 0) return;
        const searchableText = [p.name, p.brand, p.category, p.series, v.color, v.size].join(" ").toLowerCase();
        const matchCount = tokens.length > 0 ? tokens.filter(token => searchableText.includes(token)).length : 1;
        if (matchCount > 0 || tokens.length === 0) flattened.push({ ...v, productId: p.id, baseName: p.name, category: p.category, brand: p.brand || '-', series: p.series || '-', variantId: v.id, matchCount });
      });
    });
    return flattened.sort((a, b) => (tokens.length > 0 && b.matchCount !== a.matchCount) ? b.matchCount - a.matchCount : sortBy === "name-asc" ? a.baseName.localeCompare(b.baseName) : sortBy === "price-asc" ? a.price - b.price : b.price - a.price).slice(0, 24);
  }, [debouncedSearch, products, sortBy]);

  const subtotalLabel = cart.reduce((s, i) => s + (i.labelPrice * i.quantity), 0);
  const storeDiscount = cart.reduce((s, i) => s + ((i.storeDiscountPercent > 0 ? (i.labelPrice * i.storeDiscountPercent / 100) : i.storeDiscountNominal) * i.quantity), 0);
  const subtotalSetelahToko = subtotalLabel - storeDiscount;
  const voucherDiscount = appliedVoucher ? (subtotalSetelahToko * appliedVoucher.discount / 100) : 0;
  const totalPotongan = storeDiscount + voucherDiscount + (parseFloat(manualAdditionalDiscount) || 0);
  const totalTagihan = Math.max(0, subtotalLabel - totalPotongan);

  const amountToProcess = useMemo(() => {
    if (settlementTrx) return isAdditionalDP ? (parseFloat(additionalDPInput) || 0) : settlementTrx.remainingAmount;
    return totalTagihan;
  }, [settlementTrx, isAdditionalDP, additionalDPInput, totalTagihan]);

  const updateQuantity = (cartId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newQty = Math.max(1, item.quantity + delta);
        if (newQty > item.stock) {
          toast({ title: "Stok Terbatas", variant: "destructive" });
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (cartId: string) => {
    setCart(prev => prev.filter(i => i.cartId !== cartId));
  };

  const updateItemDiscountPercent = (cartId: string, pct: string) => {
    const val = parseFloat(pct) || 0;
    setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, storeDiscountPercent: val, storeDiscountNominal: 0 } : i));
  };

  const updateItemDiscountNominal = (cartId: string, nom: string) => {
    const val = parseFloat(nom) || 0;
    setCart(prev => prev.map(i => i.cartId === cartId ? { ...i, storeDiscountNominal: val, storeDiscountPercent: 0 } : i));
  };

  const handleProductClick = (item: any) => {
    if (isSuccess || settlementTrx) return;
    const cartId = `${item.productId}-${item.variantId}`;
    const idx = cart.findIndex(i => i.cartId === cartId);
    if (idx > -1) {
      if (cart[idx].quantity >= item.stock) return toast({ title: "Stok Terbatas", variant: "destructive" });
      setCart(prev => prev.map((c, i) => i === idx ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart(prev => [...prev, { cartId, productId: item.productId, variantId: item.variantId, name: item.baseName, color: item.color, size: item.size, brand: item.brand, category: item.category, series: item.series, price: item.labelPrice || item.price, labelPrice: item.labelPrice || item.price, buyPrice: item.buyPrice || 0, buyDiscount: item.buyDiscount || '0', storeDiscountPercent: 0, storeDiscountNominal: 0, quantity: 1, stock: item.stock }]);
    }
  };

  const getBranchName = (type: string) => {
    if (storeId === "TOKO_A") return `${type}. KWT`;
    if (storeId === "TOKO_B") return `${type}. KWT 2`;
    if (storeId === "TOKO_C") return `${type}. GDM`;
    return `${type}. KWT`;
  };

  const handleRegisterMember = () => {
    if (!newRegData.name || !newRegData.phone) return toast({ title: "Nama & HP wajib diisi", variant: "destructive" });
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const id = `M-${randomNum}`;
    const memberData = { id, name: newRegData.name, phone: newRegData.phone, address: newRegData.address, discount: 0, registrationDate: format(new Date(), "yyyy-MM-dd"), branch: getBranchName("M") };
    setDocumentNonBlocking(doc(db, "members", id), memberData, { merge: true });
    setSelectedMember(memberData); setCustomerType("MEMBER"); setIsRegisterMemberOpen(false); setNewRegData({ name: "", phone: "", address: "" });
    toast({ title: "Member Terdaftar & Terpilih" });
  };

  const handleRegisterAgent = () => {
    if (!newRegData.name || !newRegData.phone) return toast({ title: "Nama & HP wajib diisi", variant: "destructive" });
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const id = `AG-${randomNum}`;
    const agentData = { id, name: newRegData.name, phone: newRegData.phone, address: newRegData.address, discount: 0, registrationDate: format(new Date(), "yyyy-MM-dd"), branch: getBranchName("AG") };
    setDocumentNonBlocking(doc(db, "agents", id), agentData, { merge: true });
    setSelectedAgent(agentData); setCustomerType("AGEN"); setIsRegisterAgentOpen(false); setNewRegData({ name: "", phone: "", address: "" });
    toast({ title: "Agen Terdaftar & Terpilih" });
  };

  const handleRegisterReseller = () => {
    if (!newRegData.name || !newRegData.phone) return toast({ title: "Nama & HP wajib diisi", variant: "destructive" });
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const id = `R-${randomNum}`;
    const resellerData = { id, name: newRegData.name, phone: newRegData.phone, address: newRegData.address, discount: 0, registrationDate: format(new Date(), "yyyy-MM-dd"), branch: getBranchName("R") };
    setDocumentNonBlocking(doc(db, "resellers", id), resellerData, { merge: true });
    setSelectedReseller(resellerData); setCustomerType("RESELLER"); setIsRegisterResellerOpen(false); setNewRegData({ name: "", phone: "", address: "" });
    toast({ title: "Reseller Terdaftar & Terpilih" });
  };

  const handleUpdateCustomer = (type: string) => {
    if (!editingCustomer) return;
    const colName = type === "MEMBER" ? "members" : type === "AGEN" ? "agents" : "resellers";
    updateDocumentNonBlocking(doc(db, colName, editingCustomer.id), {
      name: editingCustomer.name,
      phone: editingCustomer.phone,
      address: editingCustomer.address
    });
    if (type === "MEMBER") setIsEditMemberOpen(false);
    else if (type === "AGEN") setIsEditAgentOpen(false);
    else setIsEditResellerOpen(false);
    toast({ title: "Data Pelanggan Diperbarui" });
  };

  const handleDownloadCard = async (customer: any, type: string) => {
    if (!customer) return;
    setIsPrintingCard(true);

    try {
      const scale = 3;
      const canvas = document.createElement("canvas");
      canvas.width = 1011 * scale;
      canvas.height = 569 * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context error");

      ctx.scale(scale, scale);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.src = currentCardBg;

      img.onload = () => {
        ctx.drawImage(img, 0, 0, 1011, 569);
        ctx.fillStyle = "#24345d";
        ctx.textBaseline = "middle";

        ctx.font = "bold 24px Arial, sans-serif";
        ctx.fillText((customer.name || "").toUpperCase(), 95, 397);

        ctx.font = "500 16px Arial, sans-serif";
        ctx.fillText((customer.address || "-").toUpperCase(), 95, 423);

        ctx.font = "600 18px Arial, sans-serif";
        ctx.fillText(`ID. ${customer.id}`, 820, 418);

        const pngUrl = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `kartu-${type.toLowerCase()}-${customer.id}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        
        setIsPrintingCard(false);
        toast({ title: "Kartu Diunduh" });
      };

      img.onerror = () => {
        setIsPrintingCard(false);
        toast({ title: "Gagal memuat latar", variant: "destructive" });
      };
    } catch (error) {
      setIsPrintingCard(false);
      toast({ title: "Kesalahan Render", variant: "destructive" });
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherInput) return; setIsValidatingVoucher(true);
    try {
      const qv = query(collection(db, "coupons"), where("code", "==", voucherInput.toUpperCase()));
      const snap = await getDocs(qv);
      if (snap.empty || snap.docs[0].data().isUsed) { toast({ title: "Voucher Tidak Valid", variant: "destructive" }); setAppliedVoucher(null); }
      else { setAppliedVoucher({ ...snap.docs[0].data() as Voucher, id: snap.docs[0].id }); toast({ title: "Voucher Berhasil" }); }
    } catch (err) { toast({ title: "Gagal Verifikasi", variant: "destructive" }); } finally { setIsValidatingVoucher(false); }
  };

  const handleStartProcess = () => { 
    if (cart.length === 0 && !settlementTrx) return; 
    if (!settlementTrx) { 
      if (isMultiMode || paymentMethod !== "CASH" || isDPMode) handleProcessTransaction(); 
      else { setReceivedCash(totalTagihan.toString()); setIsCashDialogOpen(true); } 
    } else {
      const amount = isAdditionalDP ? parseFloat(additionalDPInput) : settlementTrx.remainingAmount;
      if (paymentMethod === "CASH") { setReceivedCash(amount.toString()); setIsCashDialogOpen(true); } else handleSettlement();
    }
  };

  const handleProcessTransaction = async (cashPayload?: { received: number, change: number }) => {
    setIsProcessing(true); const trxId = `TRX-${Date.now().toString().slice(-6)}`;
    const paidAmount = isDPMode ? (parseFloat(manualDPInput) || 0) : totalTagihan;
    const now = new Date();
    const trxData = { 
      id: trxId, 
      items: cart, 
      subtotalLabel, 
      storeDiscount, 
      voucherDiscount, 
      total: totalTagihan, 
      paidAmount, 
      remainingAmount: totalTagihan - paidAmount, 
      totalDiscount: totalPotongan, 
      paymentMethod: isMultiMode ? `CASH & ${paymentMethod}` : paymentMethod, 
      customerType, 
      customerName: (customerType === "UMUM" || customerType === "ONLINE" ? generalName : customerType === "MEMBER" ? selectedMember?.name : customerType === "AGEN" ? selectedAgent?.name : selectedReseller?.name) || "UMUM", 
      customerPhone: (customerType === "UMUM" || customerType === "ONLINE" ? generalPhone : customerType === "MEMBER" ? selectedMember?.phone : customerType === "AGEN" ? selectedAgent?.phone : selectedReseller?.phone) || "", 
      date: serverTimestamp(), 
      cashier: cashierName, 
      store: storeId, 
      status: isDPMode ? "DP" : "COMPLETED", 
      cashReceived: cashPayload?.received || 0, 
      cashChange: cashPayload?.change || 0, 
      paymentHistory: [{ index: 1, date: format(now, "yyyy-MM-dd"), time: format(now, "HH:mm:ss"), amount: paidAmount }] 
    };
    try {
      cart.forEach(item => {
        const p = products?.find(prod => prod.id === item.productId);
        if (p) {
          const updated = p.variants.map((v: any) => v.id === item.variantId ? { ...v, stock: v.stock - item.quantity } : v);
          updateDocumentNonBlocking(doc(db, "stores", storeId, "stock", p.id), { 
            variants: updated,
            searchTokens: generateSearchTokens(p.name, p.brand || '-', p.category || '-', p.series || '-', updated)
          });
        }
      });
      setDocumentNonBlocking(doc(db, "stores", storeId, "transactions", trxId), trxData, { merge: true });
      setIsProcessing(false); setIsSuccess(true); setLastTrxId(trxId); setLastTrxData(trxData); setIsCashDialogOpen(false);
    } catch (err) { setIsProcessing(false); toast({ title: "Gagal", variant: "destructive" }); }
  };

  const handleSettlement = (cashPayload?: { received: number, change: number }) => {
    if (!settlementTrx) return; setIsProcessing(true);
    const now = new Date();
    const added = isAdditionalDP ? (parseFloat(additionalDPInput) || 0) : settlementTrx.remainingAmount;
    const newPaid = (settlementTrx.paidAmount || 0) + added;
    const newRem = Math.max(0, settlementTrx.total - newPaid);
    const newHistory = [...(settlementTrx.paymentHistory || []), { index: (settlementTrx.paymentHistory?.length || 1) + 1, date: format(now, "yyyy-MM-dd"), time: format(now, "HH:mm:ss"), amount: added }];
    const updated = { ...settlementTrx, status: newRem > 0 ? "DP" : "COMPLETED", paidAmount: newPaid, remainingAmount: newRem, settledAt: newRem === 0 ? serverTimestamp() : null, cashReceived: cashPayload?.received || 0, cashChange: cashPayload?.change || 0, paymentHistory: newHistory };
    updateDocumentNonBlocking(doc(db, "stores", storeId, "transactions", settlementTrx.id), updated);
    setIsProcessing(false); setIsSuccess(true); setLastTrxId(settlementTrx.id); setLastTrxData(updated); setSettlementTrx(null); setIsCashDialogOpen(false);
  };

  const handleNewTransaction = () => { setCart([]); setGeneralName(""); setGeneralPhone(""); setSelectedMember(null); setSelectedAgent(null); setSelectedReseller(null); setIsDPMode(false); setManualDPInput(""); setIsSuccess(false); setSettlementTrx(null); setAppliedVoucher(null); setManualAdditionalDiscount(""); setIsMultiMode(false); setMultiCashAmount(""); setAdditionalDPInput(""); setCustomerType("UMUM"); };

  return (
    <div className="flex flex-col h-screen bg-[#F7F9FB] overflow-hidden font-body">
      <header className="h-14 flex items-center justify-between px-4 bg-[#1F7A63] shrink-0 z-30 shadow-md">
        <div className="flex items-center gap-2">
          <div className="bg-white p-1 rounded-lg w-8 h-8 flex items-center justify-center border border-white/20 overflow-hidden"><Image src={LOGO_URL} alt="Logo" width={24} height={24} /></div>
          <div><p className="font-black text-xs text-white uppercase leading-tight tracking-tight">INDAH FASHION</p><p className="text-[8px] text-white/70 font-bold uppercase tracking-widest">{displayStoreName}</p></div>
        </div>
        <div className="hidden md:flex items-center gap-2 lg:gap-4">
          <button onClick={() => setShowCashLogs(true)} className="px-2 py-2 text-[10px] font-black tracking-widest text-white/90 hover:text-white uppercase flex items-center gap-2 rounded-md transition-all"><Wallet className="h-3.5 w-3.5" /> KAS KASIR</button>
          <button onClick={() => setShowStockList(true)} className="px-2 py-2 text-[10px] font-black tracking-widest text-white/90 hover:text-white uppercase flex items-center gap-2 rounded-md transition-all"><GitMerge className="h-3.5 w-3.5" /> STOK</button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="px-2 py-2 text-[10px] font-black tracking-widest text-white/90 hover:text-white uppercase flex items-center gap-2 rounded-md transition-all">
                <Users className="h-3.5 w-3.5" /> DATA MEMBER
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl font-bold w-44">
              <DropdownMenuItem onClick={() => { setCustomerType("MEMBER"); setShowSelectMember(true); }} className="cursor-pointer">1. MEMBER</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setCustomerType("AGEN"); setShowSelectAgent(true); }} className="cursor-pointer">2. AGEN</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setCustomerType("RESELLER"); setShowSelectReseller(true); }} className="cursor-pointer">3. RESELLER</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button onClick={() => setShowHistory(true)} className="px-2 py-2 text-[10px] font-black tracking-widest text-white/90 hover:text-white uppercase flex items-center gap-2 rounded-md transition-all"><History className="h-3.5 w-3.5" /> RIWAYAT</button>
          <button onClick={() => setShowSettings(true)} className="px-2 py-2 text-[10px] font-black tracking-widest text-white/90 hover:text-white uppercase flex items-center gap-2 rounded-md transition-all"><Settings className="h-3.5 w-3.5" /> SETING</button>
          <div className="h-6 w-px bg-white/20 mx-1" />
          <Button variant="ghost" size="icon" onClick={() => logout()} className="rounded-full h-10 w-10 text-white hover:bg-rose-500/20"><LogOut className="h-5 w-5" /></Button>
        </div>
        <div className="md:hidden">
          <Sheet><SheetTrigger asChild><Button variant="ghost" size="icon" className="text-white"><Menu className="h-6 w-6" /></Button></SheetTrigger><SheetContent side="right" className="w-72 p-0 border-none"><div className="flex flex-col h-full bg-white"><SheetHeader className="p-6 bg-[#1F7A63] text-white text-left"><SheetTitle className="sr-only">Menu Kasir</SheetTitle><div className="flex items-center gap-3"><div className="bg-white p-1 rounded-lg"><Image src={LOGO_URL} alt="Logo" width={32} height={32} /></div><div><p className="font-black text-sm uppercase">{cashierName || "KASIR"}</p><p className="text-[10px] opacity-70 uppercase tracking-widest">{displayStoreName}</p></div></div></SheetHeader><div className="flex-1 py-4"><nav className="space-y-1"><button onClick={() => { setShowCashLogs(true); }} className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b"><Wallet className="h-5 w-5 text-primary" /> KAS KASIR</button><button onClick={() => { setShowStockList(true); }} className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b"><GitMerge className="h-5 w-5 text-primary" /> MANAJEMEN STOK</button>
            <div className="px-6 py-4 border-b space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Member</p>
              <button onClick={() => { setCustomerType("MEMBER"); setShowSelectMember(true); }} className="w-full text-left py-2 text-sm font-bold flex items-center gap-3"><UserPlus className="h-4 w-4 text-primary" /> 1. MEMBER</button>
              <button onClick={() => { setCustomerType("AGEN"); setShowSelectAgent(true); }} className="w-full text-left py-2 text-sm font-bold flex items-center gap-3"><ShieldCheck className="h-4 w-4 text-primary" /> 2. AGEN</button>
              <button onClick={() => { setCustomerType("RESELLER"); setShowSelectReseller(true); }} className="w-full text-left py-2 text-sm font-bold flex items-center gap-3"><Users className="h-4 w-4 text-primary" /> 3. RESELLER</button>
            </div>
            <button onClick={() => { setShowHistory(true); }} className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b"><History className="h-5 w-5 text-primary" /> RIWAYAT PENJUALAN</button><button onClick={() => { setShowSettings(true); }} className="w-full flex items-center gap-4 px-6 py-4 text-sm font-bold text-slate-700 hover:bg-slate-50 border-b"><Settings className="h-5 w-5 text-primary" /> PENGATURAN</button></nav></div><div className="p-6 border-t"><Button variant="destructive" className="w-full h-12 rounded-xl font-black gap-2" onClick={() => logout()}><LogOut className="h-4 w-4" /> KELUAR</Button></div></div></SheetContent></Sheet>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:grid md:grid-cols-12 overflow-hidden relative">
        <main className="h-[45vh] md:h-full md:col-span-6 p-3 md:p-6 overflow-y-auto bg-slate-50/50 border-b md:border-b-0 md:border-r scrollbar-hide">
          <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Cari produk..." className="h-10 md:h-12 pl-10 rounded-2xl border-none shadow-sm bg-white text-xs md:text-sm font-bold" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" className="h-10 md:h-12 rounded-2xl shadow-sm bg-white border-none px-4 font-bold text-[10px] md:text-sm"><ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Urutkan</Button></DropdownMenuTrigger><DropdownMenuContent className="rounded-2xl w-48" align="end"><DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}><DropdownMenuRadioItem value="name-asc" className="text-xs font-bold uppercase">Nama (A-Z)</DropdownMenuRadioItem><DropdownMenuRadioItem value="price-asc" className="text-xs font-bold uppercase">Harga Terendah</DropdownMenuRadioItem><DropdownMenuRadioItem value="price-desc" className="text-xs font-bold uppercase">Harga Tertinggi</DropdownMenuRadioItem></DropdownMenuRadioGroup></DropdownMenuContent></DropdownMenu>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 pb-4">
              {filteredProducts.length > 0 ? filteredProducts.map((p, idx) => (
                <Card key={idx} className="border-none shadow-sm rounded-2xl bg-white card-hover cursor-pointer overflow-hidden group" onClick={() => handleProductClick(p)}>
                  <CardContent className="p-2 md:p-4 space-y-1.5 md:space-y-3">
                    <div className="flex justify-between items-center gap-1"><div className="flex flex-wrap gap-0.5 md:gap-1"><Badge className="bg-primary/5 text-primary border-none text-[6px] md:text-[8px] font-black uppercase px-1.5 py-0.5">{p.category}</Badge><Badge variant="outline" className="text-[6px] md:text-[8px] font-black border-slate-100 opacity-60 px-1">{p.brand}</Badge></div><span className={cn("text-[7px] md:text-[9px] font-black shrink-0", p.stock < 5 ? "text-rose-500" : "text-slate-400")}>{p.stock} PCS</span></div>
                    <div><h3 className="text-[10px] md:text-[11px] font-black uppercase text-slate-800 line-clamp-2 leading-tight">{p.baseName}</h3><p className="text-[7px] md:text-[10px] text-slate-400 font-bold uppercase mt-1">{p.color}/{p.size}/{p.buyDiscount || '0'}%</p></div>
                    <div className="flex items-center justify-between pt-2 md:pt-4 border-t border-dashed border-slate-100"><p className="text-primary font-black text-[10px] md:text-[15px]">Rp{p.price.toLocaleString()}</p><div className="bg-primary/10 p-1 md:p-1.5 rounded-xl text-primary group-hover:bg-primary group-hover:text-white transition-all"><Plus className="h-3 w-3 md:h-4 md:w-4" /></div></div>
                  </CardContent>
                </Card>
              )) : (<div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20"><Package className="h-16 w-16 mb-4" /><p className="font-black uppercase tracking-widest text-sm">Produk tidak ditemukan</p></div>)}
            </div>
          </div>
        </main>

        <div className="h-[55vh] md:h-full grid grid-cols-2 md:grid md:grid-cols-6 overflow-hidden md:col-span-6">
          <aside className="border-r flex flex-col bg-slate-50 col-span-1 md:col-span-3 h-full overflow-hidden">
            <Card className="flex-1 border-none shadow-none md:soft-shadow md:rounded-[2rem] bg-[#1F7A63] text-white flex flex-col overflow-hidden md:shadow-2xl relative md:m-4">
              <div className="p-1 md:p-4 border-b border-white/10 shrink-0">
                <div className="hidden md:flex items-center gap-2 mb-3"><ShoppingCart className="h-4 w-4 text-white/70" /><span className="text-[10px] font-black uppercase tracking-widest">KERANJANG</span><Badge className="ml-auto bg-white/20 text-white border-none h-5 px-1.5 text-[9px] font-black">{cart.length}</Badge></div>
                {settlementTrx ? (
                  <div className="bg-white/10 p-2 md:p-3 rounded-xl md:rounded-2xl border border-white/20 flex justify-between items-center animate-in slide-in-from-top duration-300">
                    <div className="min-w-0 flex-1"><p className="text-[7px] md:text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5 truncate">{isAdditionalDP ? "MODE DP+" : "PELUNASAN"}</p><p className="text-[9px] md:text-[11px] font-black text-white uppercase truncate">{settlementTrx.id}</p></div>
                    <button onClick={() => { setSettlementTrx(null); setIsAdditionalDP(false); }} className="text-white/40 hover:text-white p-1 bg-white/5 rounded-lg transition-all ml-2"><X className="h-3.5 w-3.5 md:h-4 md:w-4" /></button>
                  </div>
                ) : (
                  <div className="flex gap-0.5 md:gap-1 p-0.5 bg-white/10 rounded-lg md:rounded-xl border border-white/5 overflow-x-auto scrollbar-hide">
                    {(["UMUM", "MEMBER", "AGEN", "RESELLER", "ONLINE"] as const).map(type => (
                      <button 
                        key={type} 
                        onClick={() => { 
                          setCustomerType(type); 
                          if(type === "MEMBER") setShowSelectMember(true); 
                          if(type === "AGEN") setShowSelectAgent(true); 
                          if(type === "RESELLER") setShowSelectReseller(true);
                          if(type === "ONLINE") {
                            setPaymentMethod("TRANSFER");
                            setIsDPMode(false);
                            setIsMultiMode(false);
                            setSelectedMember(null);
                            setSelectedAgent(null);
                            setSelectedReseller(null);
                          }
                        }} 
                        className={cn(
                          "flex-1 flex flex-col items-center justify-center py-1 md:py-2 rounded-md md:rounded-lg transition-all min-w-[50px]", 
                          customerType === type ? "bg-white text-primary shadow-sm" : "text-white/50 hover:text-white"
                        )}
                      >
                        <span className="text-[6px] xs:text-[7px] md:text-[8px] font-black uppercase leading-none">{type}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <ScrollArea className="flex-1 px-1.5 md:px-4 py-2">
                {cart.map((item) => (
                  <CartItemRow 
                    key={item.cartId} 
                    item={item} 
                    updateItemDiscountPercent={updateItemDiscountPercent}
                    updateItemDiscountNominal={updateItemDiscountNominal}
                    removeFromCart={removeFromCart}
                    updateQuantity={updateQuantity}
                    isSuccess={isSuccess} 
                    settlementTrx={settlementTrx} 
                  />
                ))}
              </ScrollArea>
              <div className="p-1.5 md:p-5 border-t border-dashed border-white/20 shrink-0 space-y-1.5 md:space-y-4 bg-black/10">
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => setIsDPMode(!isDPMode)} disabled={!!settlementTrx || customerType === "ONLINE"} className={cn("h-7 md:h-9 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1", isDPMode ? "bg-white text-primary shadow-lg" : "bg-white/10 text-white/70 border border-white/10")}><Wallet className="h-3 w-3 md:h-3.5 md:w-3.5" /> DP</button>
                    <button onClick={() => setIsMultiMode(!isMultiMode)} disabled={!!settlementTrx || customerType === "ONLINE"} className={cn("h-7 md:h-9 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1", isMultiMode ? "bg-white text-primary shadow-lg" : "bg-white/10 text-white/70 border border-white/10")}><Calculator className="h-3 w-3 md:h-3.5 md:w-3.5" /> MULTI</button>
                  </div>
                  <div className="relative group"><div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"><Percent className="h-3 w-3 md:h-3.5 md:w-3.5" /></div><Input placeholder="DISC TAMBAHAN" type="number" value={manualAdditionalDiscount} onChange={e => setManualAdditionalDiscount(e.target.value)} disabled={!!settlementTrx} className="h-7 md:h-9 pl-6 md:pl-8 bg-white/10 border-none text-white text-[8px] md:text-[10px] font-black rounded-lg md:rounded-xl placeholder:text-white/30 focus-visible:ring-1 focus-visible:ring-white/20" /></div>
                </div>
                <div className="relative group"><div className="absolute left-2 top-1/2 -translate-y-1/2 text-white/40"><Ticket className="h-3 w-3 md:h-3.5 md:w-3.5" /></div><Input placeholder="VOCER" value={voucherInput} onChange={e => setVoucherCode(e.target.value)} disabled={!!settlementTrx} className="h-7 md:h-10 pl-6 md:pl-8 pr-10 md:pr-12 bg-white/10 border-none text-white text-[8px] md:text-[10px] font-black rounded-lg md:rounded-xl placeholder:text-white/30" /><button onClick={handleApplyVoucher} disabled={isValidatingVoucher} className="absolute right-0.5 top-0.5 bottom-0.5 px-1 md:px-2 bg-[#1A6351] text-white rounded-md text-[7px] md:text-[8px] font-black hover:bg-white/30">CEK</button></div>
                <div className="block md:block space-y-1 pt-1 md:pt-2 border-t border-white/5 md:border-none">
                  <div className="flex justify-between items-center text-[7px] md:text-[10px] opacity-60 font-bold"><span>Total Potongan</span><span className="text-rose-300">-Rp {totalPotongan.toLocaleString('id-ID')}</span></div>
                  <div className="flex flex-col items-end pt-1 md:pt-3">
                    <p className="text-[7px] md:text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Tagihan</p>
                    <p className="text-sm md:text-3xl font-black text-white tracking-tighter leading-none">Rp{totalTagihan.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            </Card>
          </aside>
          <aside className="bg-white flex flex-col h-full overflow-hidden col-span-1 md:col-span-3 md:border-l">
            <div className="hidden md:flex p-3 md:p-6 shrink-0 items-center gap-2 md:gap-3 border-b border-slate-100"><div className="bg-primary/5 p-1.5 md:p-2 rounded-lg md:rounded-xl text-primary"><CreditCard className="h-4 w-4 md:h-5 md:w-5" /></div><span className="text-[10px] md:text-[12px] font-black uppercase tracking-widest text-slate-800">Pembayaran</span></div>
            <div className="flex-1 overflow-y-auto p-2 md:p-6 space-y-2 md:space-y-8 scrollbar-hide">
              {!isSuccess ? (
                <div className="space-y-3 md:space-y-8 animate-in fade-in slide-in-from-right duration-500">
                  {settlementTrx ? (
                    <div className="p-2 md:p-5 rounded-xl md:rounded-[2rem] border-2 bg-orange-50 border-orange-100 space-y-0.5 md:space-y-2">
                      <p className="text-[7px] md:text-[10px] font-black uppercase opacity-60 leading-none">{isAdditionalDP ? "MODE DP+" : "TOTAL PELUNASAN"}</p>
                      <h3 className="text-xs md:text-2xl font-black tracking-tighter text-orange-700">Rp{settlementTrx.remainingAmount.toLocaleString()}</h3>
                      {(isAdditionalDP || settlementTrx) && (
                        <div className="space-y-1 mt-2">
                          <Label className="text-[7px] md:text-[10px] font-black uppercase text-orange-600">NOMINAL BAYAR</Label>
                          <input type="text" value={isAdditionalDP ? formatCurrencyInput(additionalDPInput) : formatCurrencyInput(receivedCash)} onChange={e => isAdditionalDP ? setAdditionalDPInput(parseCurrencyInput(e.target.value)) : setReceivedCash(parseCurrencyInput(e.target.value))} className="h-8 md:h-12 w-full text-[10px] md:text-xl font-black bg-white border-none text-orange-700 text-center rounded-lg shadow-inner" placeholder="Rp 0" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      {isDPMode && <div className="p-2 md:p-5 bg-orange-50 rounded-xl md:rounded-[2rem] border-2 border-orange-100 space-y-1"><Label className="text-[7px] md:text-[10px] font-black uppercase text-orange-600">BAYAR DP (RP)</Label><input type="text" value={formatCurrencyInput(manualDPInput)} onChange={e => setManualDPInput(parseCurrencyInput(e.target.value))} className="h-8 md:h-14 w-full text-[10px] md:text-2xl font-black bg-white border-none text-orange-700 text-center rounded-lg shadow-inner" placeholder="Rp 0" /></div>}
                      {isMultiMode && <div className="p-2 md:p-5 bg-blue-50 rounded-xl md:rounded-[2rem] border-2 border-blue-100 space-y-1"><Label className="text-[7px] md:text-[10px] font-black uppercase text-blue-600">INPUT TUNAI</Label><input type="text" value={formatCurrencyInput(multiCashAmount)} onChange={e => setMultiCashAmount(parseCurrencyInput(e.target.value))} className="h-8 md:h-14 w-full text-[10px] md:text-2xl font-black bg-white border-none text-blue-700 text-center rounded-lg shadow-inner" placeholder="Rp 0" /></div>}
                      {(customerType === "UMUM" || customerType === "ONLINE") && <div className="space-y-1.5 md:space-y-6"><Input value={generalName} onChange={e => setGeneralName(e.target.value)} placeholder="Nama..." className="h-8 md:h-12 rounded-lg bg-slate-50 border-none font-bold text-[9px] md:text-sm" /><Input value={generalPhone} onChange={e => setGeneralPhone(e.target.value)} placeholder="No WA..." className="h-8 md:h-12 rounded-lg bg-slate-50 border-none font-bold text-[9px] md:text-sm" /></div>}
                      {(customerType === "MEMBER" && selectedMember) && <Card className="p-1.5 md:p-4 rounded-lg bg-primary/5 border border-primary/20"><p className="text-[6px] md:text-[10px] font-black text-primary uppercase leading-none">MEMBER:</p><p className="font-black text-[9px] md:text-sm uppercase text-slate-800 truncate">{selectedMember.name}</p></Card>}
                      {(customerType === "AGEN" && selectedAgent) && <Card className="p-1.5 md:p-4 rounded-lg bg-blue-50/50 border border-blue-100"><p className="text-[6px] md:text-[10px] font-black text-blue-600 uppercase leading-none">AGEN:</p><p className="font-black text-[9px] md:text-sm uppercase text-slate-800 truncate">{selectedAgent.name}</p></Card>}
                      {(customerType === "RESELLER" && selectedReseller) && <Card className="p-1.5 md:p-4 rounded-lg bg-emerald-50/50 border border-emerald-100"><p className="text-[6px] md:text-[10px] font-black text-emerald-600 uppercase leading-none">RESELLER:</p><p className="font-black text-[9px] md:text-sm uppercase text-slate-800 truncate">{selectedReseller.name}</p></Card>}
                    </>
                  )}
                  <div className="grid grid-cols-1 gap-1.5 md:gap-2">
                    {(["CASH", "TRANSFER", "QRIS"] as const).map(m => (
                      <button 
                        key={m} 
                        onClick={() => setPaymentMethod(m)} 
                        disabled={customerType === "ONLINE" && m !== "TRANSFER"}
                        className={cn(
                          "flex flex-row items-center h-10 md:h-16 px-2 md:px-6 gap-2 md:gap-5 rounded-lg md:rounded-2xl border-2 transition-all", 
                          paymentMethod === m ? "border-primary bg-primary/5 text-primary" : "border-slate-50 text-slate-300",
                          customerType === "ONLINE" && m !== "TRANSFER" && "opacity-30 grayscale cursor-not-allowed"
                        )}
                      >
                        <div className={cn("p-1 md:p-2.5 rounded-lg transition-all", paymentMethod === m ? "bg-primary text-white" : "bg-slate-100")}>{m === "CASH" ? <Banknote className="h-3.5 w-3.5 md:h-6 md:w-6" /> : m === "TRANSFER" ? <CreditCard className="h-3.5 w-3.5 md:h-6 md:w-6" /> : <QrCode className="h-3.5 w-3.5 md:h-6 md:w-6" />}</div>
                        <span className="text-[9px] md:text-[13px] font-black uppercase">{m}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 md:space-y-6 animate-in zoom-in duration-500 h-full flex flex-col justify-center text-center">
                  <div className="bg-emerald-50 p-3 md:p-8 rounded-2xl md:rounded-[3rem] border-2 border-emerald-100 flex flex-col items-center gap-1.5">
                    <div className="bg-emerald-500 p-1.5 md:p-4 rounded-full text-white"><CheckCircle2 className="h-4 w-4 md:h-10 md:w-10" /></div>
                    <p className="text-[8px] md:text-xl font-black text-emerald-900 truncate w-full">{lastTrxId}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-1.5">
                    <button className="h-9 md:h-14 rounded-lg md:rounded-xl font-black text-[9px] md:text-[12px] bg-[#1F7A63] text-white flex items-center justify-center gap-1.5" onClick={() => window.open(`/cashier/print?id=${lastTrxId}&store=${storeId}`, '_blank')}><Printer className="h-3.5 w-3.5" /> STRUK</button>
                    <button className="h-9 md:h-14 rounded-lg md:rounded-xl font-black text-[9px] md:text-[12px] bg-slate-800 text-white" onClick={handleNewTransaction}>BARU</button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-2 md:p-6 shrink-0 border-t bg-slate-50/50">
              {!isSuccess && (<Button className={cn("w-full h-10 md:h-20 rounded-lg md:rounded-[2.5rem] font-black text-[11px] md:text-lg tracking-widest uppercase shadow-lg", settlementTrx ? "bg-orange-600" : "bg-[#1F7A63]")} disabled={isProcessing || (cart.length === 0 && !settlementTrx)} onClick={handleStartProcess}>{isProcessing ? <Loader2 className="animate-spin h-4 w-4 md:h-8 md:w-8" /> : "BAYAR"}</Button>)}
            </div>
          </aside>
        </div>
      </div>

      <CashDrawerDialog open={showCashDrawer} onOpenChange={setShowCashLogs} storeId={storeId} displayStoreName={displayStoreName} cashierName={cashierName} cashLog={cashLog} yesterdayRemaining={yesterdayRemaining} todaySalesStats={todaySalesStats} yesterdaySplit={yesterdaySplit} />
      <StockManagementDialog open={showStockList} onOpenChange={setShowStockList} storeId={storeId} cashierName={cashierName} stockDialogProducts={stockDialogProducts || []} isStockLoading={isStockLoading} outgoingMutations={[]} incomingMutations={[]} stockViewingStoreId={stockViewingStoreId} setStockViewingStoreId={setStockViewingStoreId} />
      <TransactionHistorySheet open={showHistory} onOpenChange={setShowHistory} isMobile={isMobile} historyDate={historyDate} setHistoryDate={setHistoryDate} historyFilterMode={historyFilterMode} setHistoryFilterMode={setHistoryFilterMode} showOnlyDP={showOnlyDP} setShowOnlyDP={setShowOnlyDP} history={historyData || []} storeId={storeId} onViewDetails={setSelectedTrxForDetails} onPrint={(id) => window.open(`/cashier/print?id=${id}&store=${storeId}`, '_blank')} onWhatsApp={() => {}} onReturn={(trx) => { setTrxForReturn(trx); setIsReturnDialogOpen(true); }} onSettle={(trx, isAdd) => { setSettlementTrx(trx); setIsAdditionalDP(isAdd); setShowHistory(false); setPaymentMethod("CASH"); }} />
      <TransactionDetailsDialog trx={liveTrxDetails} onClose={() => setSelectedTrxForDetails(null)} />

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md rounded-3xl p-8 border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase">Pengaturan Kasir</DialogTitle></DialogHeader>
          <div className="py-4 space-y-5">
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase ml-1">Nama Tampilan Kasir</Label><Input value={cashierName} onChange={e => setCashierName(e.target.value)} placeholder="Nama Kasir..." className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div>
          </div>
          <DialogFooter><Button className="w-full h-12 rounded-xl font-black" onClick={() => { localStorage.setItem("nibras_house_cashier_name", cashierName); setShowSettings(false); toast({ title: "Tersimpan" }); }}>SIMPAN PENGATURAN</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MEMBER SELECTION & MANAGEMENT */}
      <Dialog open={showSelectMember} onOpenChange={setShowSelectMember}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-[#1F7A63] text-white flex flex-row items-center justify-between"><DialogTitle className="text-xl font-black uppercase">Database Member</DialogTitle><Button size="sm" className="bg-white text-primary hover:bg-white/90 font-black rounded-xl" onClick={() => { setShowSelectMember(false); setIsRegisterMemberOpen(true); }}><UserPlus className="h-4 w-4 mr-2" /> DAFTAR BARU</Button></DialogHeader>
          <div className="p-6 space-y-4">
             <ScrollArea className="h-[50vh]"><div className="grid grid-cols-1 gap-2">{members?.map(m => (<Card key={m.id} className="p-4 border-none shadow-sm flex justify-between items-center group"><div className="cursor-pointer flex-1" onClick={() => { setSelectedMember(m); setCustomerType("MEMBER"); setShowSelectMember(false); }}><p className="font-black text-sm uppercase">{m.name}</p><p className="text-[10px] font-bold text-slate-400">{m.phone} | {m.id} | {m.branch}</p><p className="text-[9px] text-slate-500 uppercase mt-1 italic">{m.address}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => { setEditingCustomer(m); setIsEditMemberOpen(true); }}><Edit2 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleDownloadCard(m, "MEMBER")} disabled={isPrintingCard}><Download className="h-3.5 w-3.5" /></Button><Button size="sm" className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] px-3 h-8" onClick={() => { setSelectedMember(m); setCustomerType("MEMBER"); setShowSelectMember(false); }}>PILIH</Button></div></Card>))}</div></ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* AGENT SELECTION & MANAGEMENT */}
      <Dialog open={showSelectAgent} onOpenChange={setShowSelectAgent}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-blue-600 text-white flex flex-row items-center justify-between"><DialogTitle className="text-xl font-black uppercase">Database Agen</DialogTitle><Button size="sm" className="bg-white text-blue-600 hover:bg-white/90 font-black rounded-xl" onClick={() => { setShowSelectAgent(false); setIsRegisterAgentOpen(true); }}><UserPlus className="h-4 w-4 mr-2" /> DAFTAR BARU</Button></DialogHeader>
          <div className="p-6 space-y-4">
             <ScrollArea className="h-[50vh]"><div className="grid grid-cols-1 gap-2">{agents?.map(a => (<Card key={a.id} className="p-4 border-none shadow-sm flex justify-between items-center group"><div className="cursor-pointer flex-1" onClick={() => { setSelectedAgent(a); setCustomerType("AGEN"); setShowSelectAgent(false); }}><p className="font-black text-sm uppercase">{a.name}</p><p className="text-[10px] font-bold text-slate-400">{a.phone} | {a.id} | {a.branch}</p><p className="text-[9px] text-slate-500 uppercase mt-1 italic">{a.address}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => { setEditingCustomer(a); setIsEditAgentOpen(true); }}><Edit2 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleDownloadCard(a, "AGEN")} disabled={isPrintingCard}><Download className="h-3.5 w-3.5" /></Button><Button size="sm" className="bg-blue-100 text-blue-700 border-none font-black text-[9px] px-3 h-8" onClick={() => { setSelectedAgent(a); setCustomerType("AGEN"); setShowSelectAgent(false); }}>PILIH</Button></div></Card>))}</div></ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* RESELLER SELECTION & MANAGEMENT */}
      <Dialog open={showSelectReseller} onOpenChange={setShowSelectReseller}>
        <DialogContent className="max-w-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-6 bg-emerald-700 text-white flex flex-row items-center justify-between"><DialogTitle className="text-xl font-black uppercase">Database Reseller</DialogTitle><Button size="sm" className="bg-white text-emerald-700 hover:bg-white/90 font-black rounded-xl" onClick={() => { setShowSelectReseller(false); setIsRegisterResellerOpen(true); }}><UserPlus className="h-4 w-4 mr-2" /> DAFTAR BARU</Button></DialogHeader>
          <div className="p-6 space-y-4">
             <ScrollArea className="h-[50vh]"><div className="grid grid-cols-1 gap-2">{resellers?.map(r => (<Card key={r.id} className="p-4 border-none shadow-sm flex justify-between items-center group"><div className="cursor-pointer flex-1" onClick={() => { setSelectedReseller(r); setCustomerType("RESELLER"); setShowSelectReseller(false); }}><p className="font-black text-sm uppercase">{r.name}</p><p className="text-[10px] font-bold text-slate-400">{r.phone} | {r.id} | {r.branch}</p><p className="text-[9px] text-slate-500 uppercase mt-1 italic">{r.address}</p></div><div className="flex gap-1"><Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={() => { setEditingCustomer(r); setIsEditResellerOpen(true); }}><Edit2 className="h-3.5 w-3.5" /></Button><Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleDownloadCard(r, "RESELLER")} disabled={isPrintingCard}><Download className="h-3.5 w-3.5" /></Button><Button size="sm" className="bg-emerald-100 text-emerald-700 border-none font-black text-[9px] px-3 h-8" onClick={() => { setSelectedReseller(r); setCustomerType("RESELLER"); setShowSelectReseller(false); }}>PILIH</Button></div></Card>))}</div></ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* REGISTRATION DIALOGS */}
      <Dialog open={isRegisterMemberOpen} onOpenChange={setIsRegisterMemberOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-[#1F7A63] text-white"><DialogTitle className="text-xl font-black uppercase flex items-center gap-3"><UserPlus /> Daftar Member Baru</DialogTitle></DialogHeader>
          <div className="p-8 space-y-5 bg-slate-50/50">
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">Nama Member</Label><Input value={newRegData.name} onChange={e => setNewRegData({...newRegData, name: e.target.value})} className="h-12 rounded-xl bg-white border-none font-bold" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">No. WhatsApp</Label><Input value={newRegData.phone} onChange={e => setNewRegData({...newRegData, phone: e.target.value})} className="h-12 rounded-xl bg-white border-none font-bold" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">Alamat</Label><Textarea value={newRegData.address} onChange={e => setNewRegData({...newRegData, address: e.target.value})} className="rounded-xl bg-white border-none font-bold min-h-[80px]" /></div>
          </div>
          <DialogFooter className="p-6 bg-white border-t"><Button className="w-full h-12 rounded-xl font-black" onClick={handleRegisterMember}>SIMPAN & PILIH</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRegisterAgentOpen} onOpenChange={setIsRegisterAgentOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-blue-600 text-white"><DialogTitle className="text-xl font-black uppercase flex items-center gap-3"><ShieldCheck /> Registrasi Agen Baru</DialogTitle></DialogHeader>
          <div className="p-8 space-y-5 bg-slate-50/50">
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">Nama Agen</Label><Input value={newRegData.name} onChange={e => setNewRegData({...newRegData, name: e.target.value})} className="h-12 rounded-xl bg-white border-none font-bold" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">No. WhatsApp</Label><Input value={newRegData.phone} onChange={e => setNewRegData({...newRegData, phone: e.target.value})} className="h-12 rounded-xl bg-white border-none font-bold" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">Alamat</Label><Textarea value={newRegData.address} onChange={e => setNewRegData({...newRegData, address: e.target.value})} className="rounded-xl bg-white border-none font-bold min-h-[80px]" /></div>
          </div>
          <DialogFooter className="p-6 bg-white border-t"><Button className="w-full h-12 rounded-xl font-black bg-blue-600" onClick={handleRegisterAgent}>SIMPAN & PILIH</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRegisterResellerOpen} onOpenChange={setIsRegisterResellerOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-emerald-700 text-white"><DialogTitle className="text-xl font-black uppercase flex items-center gap-3"><Users /> Registrasi Reseller Baru</DialogTitle></DialogHeader>
          <div className="p-8 space-y-5 bg-slate-50/50">
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">Nama Reseller</Label><Input value={newRegData.name} onChange={e => setNewRegData({...newRegData, name: e.target.value})} className="h-12 rounded-xl bg-white border-none font-bold" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">No. WhatsApp</Label><Input value={newRegData.phone} onChange={e => setNewRegData({...newRegData, phone: e.target.value})} className="h-12 rounded-xl bg-white border-none font-bold" /></div>
            <div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400">Alamat</Label><Textarea value={newRegData.address} onChange={e => setNewRegData({...newRegData, address: e.target.value})} className="rounded-xl bg-white border-none font-bold min-h-[80px]" /></div>
          </div>
          <DialogFooter className="p-6 bg-white border-t"><Button className="w-full h-12 rounded-xl font-black bg-emerald-700" onClick={handleRegisterReseller}>SIMPAN & PILIH</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOGS */}
      <Dialog open={isEditMemberOpen} onOpenChange={setIsEditMemberOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-[#1F7A63] text-white"><DialogTitle className="text-lg font-black uppercase">Edit Data Member</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4 bg-slate-50/50">
            <Input value={editingCustomer?.name || ""} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} placeholder="Nama.." className="h-11 rounded-xl" />
            <Input value={editingCustomer?.phone || ""} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} placeholder="WhatsApp.." className="h-11 rounded-xl" />
            <Textarea value={editingCustomer?.address || ""} onChange={setEditingCustomer && (e => setEditingCustomer({...editingCustomer, address: e.target.value}))} placeholder="Alamat.." className="rounded-xl min-h-[80px]" />
          </div>
          <DialogFooter className="p-4 bg-white border-t"><Button className="w-full h-11 rounded-xl font-black" onClick={() => handleUpdateCustomer("MEMBER")}>SIMPAN PERUBAHAN</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditAgentOpen} onOpenChange={setIsEditAgentOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-blue-600 text-white"><DialogTitle className="text-lg font-black uppercase">Edit Data Agen</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4 bg-slate-50/50">
            <Input value={editingCustomer?.name || ""} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} placeholder="Nama.." className="h-11 rounded-xl" />
            <Input value={editingCustomer?.phone || ""} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} placeholder="WhatsApp.." className="h-11 rounded-xl" />
            <Textarea value={editingCustomer?.address || ""} onChange={setEditingCustomer && (e => setEditingCustomer({...editingCustomer, address: e.target.value}))} placeholder="Alamat.." className="rounded-xl min-h-[80px]" />
          </div>
          <DialogFooter className="p-4 bg-white border-t"><Button className="w-full h-11 rounded-xl font-black bg-blue-600" onClick={() => handleUpdateCustomer("AGEN")}>SIMPAN PERUBAHAN</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditResellerOpen} onOpenChange={setIsEditResellerOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-emerald-700 text-white"><DialogTitle className="text-lg font-black uppercase">Edit Data Reseller</DialogTitle></DialogHeader>
          <div className="p-6 space-y-4 bg-slate-50/50">
            <Input value={editingCustomer?.name || ""} onChange={e => setEditingCustomer({...editingCustomer, name: e.target.value})} placeholder="Nama.." className="h-11 rounded-xl" />
            <Input value={editingCustomer?.phone || ""} onChange={e => setEditingCustomer({...editingCustomer, phone: e.target.value})} placeholder="WhatsApp.." className="h-11 rounded-xl" />
            <Textarea value={editingCustomer?.address || ""} onChange={setEditingCustomer && (e => setEditingCustomer({...editingCustomer, address: e.target.value}))} placeholder="Alamat.." className="rounded-xl min-h-[80px]" />
          </div>
          <DialogFooter className="p-4 bg-white border-t"><Button className="w-full h-11 rounded-xl font-black bg-emerald-700" onClick={() => handleUpdateCustomer("RESELLER")}>SIMPAN PERUBAHAN</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 text-center border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-2xl font-black uppercase mx-auto">Input Tunai</DialogTitle></DialogHeader>
          <div className="py-8 space-y-6">
            <p className="text-[10px] font-black text-slate-400 uppercase">Total Tagihan</p>
            <p className="text-3xl font-black text-primary">{formatCurrencyInput(amountToProcess)}</p>
            <input type="text" value={formatCurrencyInput(receivedCash)} onChange={e => setReceivedCash(parseCurrencyInput(e.target.value))} className="h-16 w-full text-center text-3xl font-black border-none bg-slate-50 rounded-2xl shadow-inner" placeholder="Rp 0" autoFocus />
            {parseFloat(receivedCash) >= amountToProcess && (<div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Kembalian</p><p className="text-2xl font-black text-emerald-700">Rp{(parseFloat(receivedCash) - amountToProcess).toLocaleString('id-ID')}</p></div>)}
          </div>
          <DialogFooter className="flex gap-3"><Button variant="ghost" className="flex-1 font-bold h-12" onClick={() => setIsCashDialogOpen(false)}>BATAL</Button><Button className="flex-1 font-black h-12 shadow-lg" disabled={!receivedCash || parseFloat(receivedCash) < amountToProcess} onClick={() => { if (settlementTrx) handleSettlement({ received: parseFloat(receivedCash), change: parseFloat(receivedCash) - amountToProcess }); else handleProcessTransaction({ received: parseFloat(receivedCash), change: parseFloat(receivedCash) - amountToProcess }); }}>PROSES</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-8 bg-rose-600 text-white shrink-0">
            <DialogTitle className="text-2xl font-black uppercase flex items-center gap-3"><RotateCcw /> Retur Barang</DialogTitle>
          </DialogHeader>
          <div className="p-8 space-y-3 max-h-[60vh] overflow-y-auto bg-slate-50/50">
            {trxForReturn?.items?.map((item: any) => (
              <Card key={`${item.productId}-${item.variantId}`} className="p-4 rounded-2xl border-none shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-black text-xs uppercase">{item.name}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">{item.color} | {item.size}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400">Max: {item.quantity}</span>
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
                    <button className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm" onClick={() => setReturnQtys(prev => ({ ...prev, [`${item.productId}-${item.variantId}`]: Math.max(0, (prev[`${item.productId}-${item.variantId}`] || 0) - 1) }))}>
                      <Minus className="h-2 w-2" />
                    </button>
                    <span className="w-6 text-center font-black">{returnQtys[`${item.productId}-${item.variantId}`] || 0}</span>
                    <button className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm" onClick={() => setReturnQtys(prev => ({ ...prev, [`${item.productId}-${item.variantId}`]: Math.min(item.quantity, (prev[`${item.productId}-${item.variantId}`] || 0) + 1) }))}>
                      <Plus className="h-2 w-2" />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <DialogFooter className="p-6 bg-white border-t">
            <Button 
              className="w-full h-12 rounded-xl font-black bg-rose-600 uppercase tracking-widest text-white shadow-lg" 
              disabled={isProcessing || !Object.values(returnQtys).some(q => q > 0)}
              onClick={() => {}}
            >
              {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : "KONFIRMASI RETUR"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
