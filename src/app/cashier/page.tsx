"use client";

import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  useFirestore,
  useCollection,
  useDoc,
  useMemoFirebase,
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
} from "@/firebase";
import {
  collection,
  doc,
  query,
  orderBy,
  serverTimestamp,
  where,
  getDocs,
  limit,
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { format, subDays } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

import { CashDrawerDialog } from "@/components/cashier/CashDrawerDialog";
import { StockManagementDialog } from "@/components/cashier/StockManagementDialog";
import { TransactionHistorySheet } from "@/components/cashier/TransactionHistorySheet";
import { TransactionDetailsDialog } from "@/components/cashier/TransactionDetailsDialog";
import { CashierHeader } from "@/components/cashier/CashierHeader";
import { ProductCatalogSection } from "@/components/cashier/ProductCatalogSection";
import { CartAndPaymentSection } from "@/components/cashier/CartAndPaymentSection";
import { CustomerModals } from "@/components/cashier/CustomerModals";
import { CashierActionDialogs } from "@/components/cashier/CashierActionDialogs";
import {
  Agent,
  CartItem,
  CustomerType,
  DEFAULT_CARD_BG,
  ExchangeReturnSession,
  Member,
  Reseller,
  Voucher,
  buildReceiptWhatsAppMessage,
  formatWhatsAppPhone,
  generateSearchTokens,
  getItemUnitNetPrice,
  getTrxReturnSummary,
} from "@/components/cashier/types";

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

  const [customerType, setCustomerType] = useState<CustomerType>("UMUM");
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
  const [exchangeReturnSession, setExchangeReturnSession] = useState<ExchangeReturnSession | null>(null);

  const [isRegisterMemberOpen, setIsRegisterMemberOpen] = useState(false);
  const [isRegisterAgentOpen, setIsRegisterAgentOpen] = useState(false);
  const [isRegisterResellerOpen, setIsRegisterResellerOpen] = useState(false);
  const [newRegData, setNewRegData] = useState({ name: "", phone: "", address: "" });

  const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
  const [isEditAgentOpen, setIsEditAgentOpen] = useState(false);
  const [isEditResellerOpen, setIsEditResellerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [customerModalSource, setCustomerModalSource] = useState<"CART" | "MENU">("CART");

  const [waReceiptTrx, setWaReceiptTrx] = useState<any>(null);
  const [waReceiptPhone, setWaReceiptPhone] = useState("");

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

  const productsQuery = useMemoFirebase(
    () => (user ? query(collection(db, "stores", storeId, "stock"), limit(500)) : null),
    [db, storeId, user]
  );
  const { data: products } = useCollection<any>(productsQuery);

  // Only subscribe to cross-store stock collections when the Stock Management dialog (`showStockList`) is actually open!
  // For the cashier's own active store, reuse `products` directly to avoid duplicate Firestore listeners.
  const stockAQuery = useMemoFirebase(
    () => (user && showStockList && storeId !== "TOKO_A" ? collection(db, "stores", "TOKO_A", "stock") : null),
    [db, user, showStockList, storeId]
  );
  const { data: dataA, isLoading: isALoading } = useCollection<any>(stockAQuery);
  const stockBQuery = useMemoFirebase(
    () => (user && showStockList && storeId !== "TOKO_B" ? collection(db, "stores", "TOKO_B", "stock") : null),
    [db, user, showStockList, storeId]
  );
  const { data: dataB, isLoading: isBLoading } = useCollection<any>(stockBQuery);
  const stockCQuery = useMemoFirebase(
    () => (user && showStockList && storeId !== "TOKO_C" ? collection(db, "stores", "TOKO_C", "stock") : null),
    [db, user, showStockList, storeId]
  );
  const { data: dataC, isLoading: isCLoading } = useCollection<any>(stockCQuery);

  const stockA = storeId === "TOKO_A" ? products || [] : dataA || [];
  const stockB = storeId === "TOKO_B" ? products || [] : dataB || [];
  const stockC = storeId === "TOKO_C" ? products || [] : dataC || [];
  const isStockLoading = isALoading || isBLoading || isCLoading;

  const membersQuery = useMemoFirebase(() => (user ? collection(db, "members") : null), [db, user]);
  const { data: members } = useCollection<Member>(membersQuery);
  const agentsQuery = useMemoFirebase(() => (user ? collection(db, "agents") : null), [db, user]);
  const { data: agents } = useCollection<Agent>(agentsQuery);
  const resellersQuery = useMemoFirebase(() => (user ? collection(db, "resellers") : null), [db, user]);
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
    // When "FILTER DP" (`showOnlyDP`) is active, fetch recent transactions across dates so multi-day DP transactions are always visible!
    if (showOnlyDP) {
      return query(q, orderBy("date", "desc"), limit(200));
    }
    if (historyFilterMode === "daily") {
      const start = new Date(historyDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(historyDate);
      end.setHours(23, 59, 59, 999);
      return query(
        q,
        where("date", ">=", Timestamp.fromDate(start)),
        where("date", "<=", Timestamp.fromDate(end)),
        orderBy("date", "desc")
      );
    }
    const [year, month] = historyDate.split("-");
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    return query(
      q,
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end)),
      orderBy("date", "desc")
    );
  }, [db, storeId, user, historyDate, historyFilterMode, showOnlyDP]);
  const { data: historyData } = useCollection<any>(historyQuery);

  const liveTrxRef = useMemoFirebase(
    () => (selectedTrxForDetails && user ? doc(db, "stores", storeId, "transactions", selectedTrxForDetails.id) : null),
    [db, user, selectedTrxForDetails, storeId]
  );
  const { data: liveTrxDetails } = useDoc<any>(liveTrxRef);

  const todayTrxQuery = useMemoFirebase(() => {
    if (!user || !storeId) return null;
    const start = new Date(`${todayId}T00:00:00`);
    const end = new Date(`${todayId}T23:59:59.999`);
    return query(
      collection(db, "stores", storeId, "transactions"),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end))
    );
  }, [db, storeId, user, todayId]);
  const { data: todayTrxData } = useCollection<any>(todayTrxQuery);

  const yesterdayTrxQuery = useMemoFirebase(() => {
    if (!user || !storeId) return null;
    const start = new Date(`${yesterdayId}T00:00:00`);
    const end = new Date(`${yesterdayId}T23:59:59.999`);
    return query(
      collection(db, "stores", storeId, "transactions"),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end))
    );
  }, [db, storeId, user, yesterdayId]);
  const { data: yesterdayTrx } = useCollection<any>(yesterdayTrxQuery);

  const yesterdayLogRef = useMemoFirebase(
    () => (user ? doc(db, "stores", storeId, "cashLogs", yesterdayId) : null),
    [db, storeId, user, yesterdayId]
  );
  const { data: yesterdayLog } = useDoc<any>(yesterdayLogRef);

  const yesterdaySplit = useMemo(() => {
    if (!yesterdayLog)
      return {
        murni: 0,
        lanjutan: 0,
        totalOpening: 0,
        totalCash: 0,
        totalWithdrawals: 0,
        totalExpenses: 0,
        closingBalance: 0,
      };
    const openingY = (yesterdayLog.saldo_awal_kemarin || 0) + (yesterdayLog.modal_awal || 0);
    const withdrawalsY = yesterdayLog.pengambilan || [];
    const totalWithdrawalsY = withdrawalsY.reduce((s: number, w: any) => s + w.amount, 0);
    const expensesY = yesterdayLog.pengeluaran || [];
    const totalExpensesY = expensesY.reduce((s: number, e: any) => s + e.amount, 0);
    const returTunaiY = (yesterdayLog.retur_tunai || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    const cashTrxY = (yesterdayTrx || []).filter((t) =>
      t.paymentBreakdown
        ? Number(t.originalPaymentBreakdown?.cash ?? t.paymentBreakdown.cash ?? 0) > 0
        : t.paymentMethod === "CASH" || t.paymentMethod?.includes("CASH")
    );
    const getNetCashForTrx = (t: any) => {
      const summary = getTrxReturnSummary(t);
      const rawOrigCash = t.paymentBreakdown
        ? Number(t.originalPaymentBreakdown?.cash ?? t.paymentBreakdown.cash ?? 0)
        : summary.originalPaid;
      return Math.max(0, rawOrigCash - summary.cashRefunded);
    };
    const totalCashSalesY = cashTrxY.reduce((s, t) => s + getNetCashForTrx(t), 0);
    const latestWithdrawal =
      withdrawalsY.length > 0
        ? [...withdrawalsY].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp
        : "1970-01-01";
    const latestExpense =
      expensesY.length > 0
        ? [...expensesY].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp
        : "1970-01-01";
    const lastActionTime = Math.max(new Date(latestWithdrawal).getTime(), new Date(latestExpense).getTime());
    let salesBefore = 0;
    let salesAfter = 0;
    cashTrxY.forEach((t) => {
      const tTime = t.date?.toDate?.()?.getTime() || 0;
      const cash = getNetCashForTrx(t);
      if (tTime <= lastActionTime) salesBefore += cash;
      else salesAfter += cash;
    });
    const murni = openingY + salesBefore - totalWithdrawalsY - totalExpensesY - returTunaiY;
    const lanjutan = salesAfter;
    return {
      murni,
      lanjutan,
      totalOpening: openingY,
      totalCash: totalCashSalesY,
      totalWithdrawals: totalWithdrawalsY,
      totalExpenses: totalExpensesY,
      closingBalance: murni + lanjutan,
    };
  }, [yesterdayLog, yesterdayTrx]);

  const yesterdayRemaining = yesterdaySplit.closingBalance;
  const cashLogRef = useMemoFirebase(
    () => (user ? doc(db, "stores", storeId, "cashLogs", todayId) : null),
    [db, storeId, user, todayId]
  );
  const { data: cashLog } = useDoc<any>(cashLogRef);

  const todaySalesStats = useMemo(() => {
    const crossDayCashReturn = (cashLog?.retur_tunai || []).reduce(
      (sum: number, r: any) => sum + Number(r.amount || 0),
      0
    );
    const base = { cash: 0, grossCash: 0, cashReturn: crossDayCashReturn, transfer: 0, qris: 0 };
    if (!todayTrxData) return base;

    const result = todayTrxData.reduce((acc, trx) => {
      const summary = getTrxReturnSummary(trx);
      const exchMethod = String(trx.returnLog?.exchangePaymentMethod || trx.paymentMethod || "CASH").toUpperCase();
      if (summary.additionalPaid > 0) {
        if (exchMethod.includes("CASH")) acc.grossCash += summary.additionalPaid;
        else if (exchMethod === "TRANSFER") acc.transfer += summary.additionalPaid;
        else if (exchMethod === "QRIS") acc.qris += summary.additionalPaid;
      }
      if (trx.paymentBreakdown) {
        const origCash = Number(trx.originalPaymentBreakdown?.cash ?? trx.paymentBreakdown.cash ?? 0);
        const origOther = Number(trx.originalPaymentBreakdown?.other ?? trx.paymentBreakdown.other ?? 0);
        acc.grossCash += origCash;
        acc.cashReturn += summary.cashRefunded;
        const otherMethod = String(trx.paymentBreakdown.otherMethod || "").toUpperCase();
        if (otherMethod === "TRANSFER") acc.transfer += Math.max(0, origOther - summary.transferRefunded);
        if (otherMethod === "QRIS") acc.qris += Math.max(0, origOther - summary.qrisRefunded);
      } else {
        const method = String(trx.paymentMethod || "CASH").toUpperCase();
        if (method === "CASH" || method.includes("CASH")) {
          acc.grossCash += summary.originalPaid;
          acc.cashReturn += summary.cashRefunded;
        } else if (method === "TRANSFER") {
          acc.transfer += Math.max(0, summary.originalPaid - summary.transferRefunded);
        } else if (method === "QRIS") {
          acc.qris += Math.max(0, summary.originalPaid - summary.qrisRefunded);
        }
      }
      return acc;
    }, base);

    return {
      ...result,
      cash: Math.max(0, result.grossCash - result.cashReturn),
    };
  }, [todayTrxData, cashLog]);

  const filteredProducts = useMemo(() => {
    const tokens = debouncedSearch
      .toLowerCase()
      .split(/\s+/)
      .filter((t) => t.length > 0);
    const flattened: any[] = [];
    products?.forEach((p) => {
      p.variants?.forEach((v: any) => {
        if (v.stock <= 0) return;
        const searchableText = [p.name, p.brand, p.category, p.series, v.color, v.size].join(" ").toLowerCase();
        const matchCount = tokens.length > 0 ? tokens.filter((token) => searchableText.includes(token)).length : 1;
        if (matchCount > 0 || tokens.length === 0)
          flattened.push({
            ...v,
            productId: p.id,
            baseName: p.name,
            category: p.category,
            brand: p.brand || "-",
            series: p.series || "-",
            variantId: v.id,
            matchCount,
          });
      });
    });
    return flattened
      .sort((a, b) =>
        tokens.length > 0 && b.matchCount !== a.matchCount
          ? b.matchCount - a.matchCount
          : sortBy === "name-asc"
          ? a.baseName.localeCompare(b.baseName)
          : sortBy === "price-asc"
          ? a.price - b.price
          : b.price - a.price
      )
      .slice(0, 24);
  }, [debouncedSearch, products, sortBy]);

  const subtotalLabel = cart.reduce((s, i) => s + i.labelPrice * i.quantity, 0);
  const storeDiscount = cart.reduce(
    (s, i) =>
      s +
      (i.storeDiscountPercent > 0 ? (i.labelPrice * i.storeDiscountPercent) / 100 : i.storeDiscountNominal) *
        i.quantity,
    0
  );
  const subtotalSetelahToko = subtotalLabel - storeDiscount;
  const voucherDiscount = appliedVoucher ? (subtotalSetelahToko * appliedVoucher.discount) / 100 : 0;
  const totalPotongan = storeDiscount + voucherDiscount + (parseFloat(manualAdditionalDiscount) || 0);
  const totalTagihan = Math.max(0, subtotalLabel - totalPotongan);

  const amountToProcess = useMemo(() => {
    if (exchangeReturnSession) {
      return Math.max(0, totalTagihan - exchangeReturnSession.returnCreditAmount);
    }
    if (settlementTrx) {
      const rem = getTrxReturnSummary(settlementTrx).netRemaining;
      return isAdditionalDP ? parseFloat(additionalDPInput) || 0 : rem;
    }
    return totalTagihan;
  }, [exchangeReturnSession, settlementTrx, isAdditionalDP, additionalDPInput, totalTagihan]);

  const updateQuantity = (cartId: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartId === cartId) {
          const newQty = Math.max(1, item.quantity + delta);
          if (newQty > item.stock) {
            toast({ title: "Stok Terbatas", variant: "destructive" });
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (cartId: string) => {
    setCart((prev) => prev.filter((i) => i.cartId !== cartId));
  };

  const updateItemDiscountPercent = (cartId: string, pct: string) => {
    const val = parseFloat(pct) || 0;
    setCart((prev) =>
      prev.map((i) =>
        i.cartId === cartId
          ? {
              ...i,
              storeDiscountPercent: val,
              storeDiscountNominal: 0,
              price: Math.max(0, i.labelPrice - (i.labelPrice * val) / 100),
            }
          : i
      )
    );
  };

  const updateItemDiscountNominal = (cartId: string, nom: string) => {
    const val = parseFloat(nom) || 0;
    setCart((prev) =>
      prev.map((i) =>
        i.cartId === cartId
          ? {
              ...i,
              storeDiscountNominal: val,
              storeDiscountPercent: 0,
              price: Math.max(0, i.labelPrice - val),
            }
          : i
      )
    );
  };

  const handleProductClick = (item: any) => {
    if (isSuccess || settlementTrx) return;
    const cartId = `${item.productId}-${item.variantId}`;
    const idx = cart.findIndex((i) => i.cartId === cartId);
    if (idx > -1) {
      if (cart[idx].quantity >= item.stock) return toast({ title: "Stok Terbatas", variant: "destructive" });
      setCart((prev) => prev.map((c, i) => (i === idx ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart((prev) => [
        ...prev,
        {
          cartId,
          productId: item.productId,
          variantId: item.variantId,
          name: item.baseName,
          color: item.color,
          size: item.size,
          brand: item.brand,
          category: item.category,
          series: item.series,
          price: item.labelPrice || item.price,
          labelPrice: item.labelPrice || item.price,
          buyPrice: item.buyPrice || 0,
          buyDiscount: item.buyDiscount || "0",
          storeDiscountPercent: 0,
          storeDiscountNominal: 0,
          quantity: 1,
          stock: item.stock,
        },
      ]);
    }
  };

  const getBranchName = (type: string) => {
    if (storeId === "TOKO_A") return `${type}. KWT`;
    if (storeId === "TOKO_B") return `${type}. KWT 2`;
    if (storeId === "TOKO_C") return `${type}. GDM`;
    return `${type}. KWT`;
  };

  const handleRegisterMember = () => {
    if (!newRegData.name || !newRegData.phone)
      return toast({ title: "Nama & HP wajib diisi", variant: "destructive" });
    const id = `M-${Math.floor(100000 + Math.random() * 900000)}`;
    const memberData: Member = {
      id,
      name: newRegData.name,
      phone: newRegData.phone,
      address: newRegData.address,
      discount: 0,
      registrationDate: format(new Date(), "yyyy-MM-dd"),
      branch: getBranchName("M"),
    };
    setDocumentNonBlocking(doc(db, "members", id), memberData, { merge: true });
    setSelectedMember(memberData);
    setCustomerType("MEMBER");
    setIsRegisterMemberOpen(false);
    setNewRegData({ name: "", phone: "", address: "" });
    toast({ title: "Member Terdaftar & Terpilih" });
  };

  const handleRegisterAgent = () => {
    if (!newRegData.name || !newRegData.phone)
      return toast({ title: "Nama & HP wajib diisi", variant: "destructive" });
    const id = `AG-${Math.floor(100000 + Math.random() * 900000)}`;
    const agentData: Agent = {
      id,
      name: newRegData.name,
      phone: newRegData.phone,
      address: newRegData.address,
      discount: 0,
      registrationDate: format(new Date(), "yyyy-MM-dd"),
      branch: getBranchName("AG"),
    };
    setDocumentNonBlocking(doc(db, "agents", id), agentData, { merge: true });
    setSelectedAgent(agentData);
    setCustomerType("AGEN");
    setIsRegisterAgentOpen(false);
    setNewRegData({ name: "", phone: "", address: "" });
    toast({ title: "Agen Terdaftar & Terpilih" });
  };

  const handleRegisterReseller = () => {
    if (!newRegData.name || !newRegData.phone)
      return toast({ title: "Nama & HP wajib diisi", variant: "destructive" });
    const id = `R-${Math.floor(100000 + Math.random() * 900000)}`;
    const resellerData: Reseller = {
      id,
      name: newRegData.name,
      phone: newRegData.phone,
      address: newRegData.address,
      discount: 0,
      registrationDate: format(new Date(), "yyyy-MM-dd"),
      branch: getBranchName("R"),
    };
    setDocumentNonBlocking(doc(db, "resellers", id), resellerData, { merge: true });
    setSelectedReseller(resellerData);
    setCustomerType("RESELLER");
    setIsRegisterResellerOpen(false);
    setNewRegData({ name: "", phone: "", address: "" });
    toast({ title: "Reseller Terdaftar & Terpilih" });
  };

  const handleUpdateCustomer = (type: string) => {
    if (!editingCustomer) return;
    const colName = type === "MEMBER" ? "members" : type === "AGEN" ? "agents" : "resellers";
    updateDocumentNonBlocking(doc(db, colName, editingCustomer.id), {
      name: editingCustomer.name,
      phone: editingCustomer.phone,
      address: editingCustomer.address,
    });
    if (type === "MEMBER") setIsEditMemberOpen(false);
    else if (type === "AGEN") setIsEditAgentOpen(false);
    else setIsEditResellerOpen(false);
    toast({ title: "Data Pelanggan Diperbarui" });
  };

  const resolveTransactionPhone = (trx: any): string => {
    if (!trx) return "";
    if (trx.customerPhone && String(trx.customerPhone).trim()) return String(trx.customerPhone).trim();
    if (trx.phone && String(trx.phone).trim()) return String(trx.phone).trim();

    const targetName = String(trx.customerName || "").trim().toLowerCase();
    if (!targetName || targetName === "umum") return "";

    const matchedCustomer = [...(members || []), ...(agents || []), ...(resellers || [])].find(
      (c) => String(c.name || "").trim().toLowerCase() === targetName && String(c.phone || "").trim() !== ""
    );
    return matchedCustomer?.phone || "";
  };

  const openReceiptWhatsApp = (trx: any, rawPhone: string): boolean => {
    const waPhone = formatWhatsAppPhone(rawPhone);
    if (!waPhone || waPhone.length < 9) {
      toast({
        title: "Nomor WhatsApp tidak valid",
        description: "Masukkan nomor HP/WA tujuan yang valid.",
        variant: "destructive",
      });
      return false;
    }

    const message = buildReceiptWhatsAppMessage(trx, {
      customStoreName,
      displayStoreName,
      customStoreAddress,
      customStorePhone,
      cashierName,
    });
    const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    toast({ title: "Membuka WhatsApp", description: `Mengirim struk ${trx.id} ke +${waPhone}` });
    return true;
  };

  const handleSendReceiptWhatsApp = (trx: any) => {
    if (!trx) return;
    const foundPhone = resolveTransactionPhone(trx);
    if (foundPhone && formatWhatsAppPhone(foundPhone).length >= 9) {
      openReceiptWhatsApp(trx, foundPhone);
      return;
    }
    setWaReceiptTrx(trx);
    setWaReceiptPhone("");
  };

  const handleApplyVoucher = async () => {
    if (!voucherInput) return;
    setIsValidatingVoucher(true);
    try {
      const qv = query(collection(db, "coupons"), where("code", "==", voucherInput.toUpperCase()));
      const snap = await getDocs(qv);
      if (snap.empty || snap.docs[0].data().isUsed) {
        toast({ title: "Voucher Tidak Valid", variant: "destructive" });
        setAppliedVoucher(null);
      } else {
        setAppliedVoucher({ ...(snap.docs[0].data() as Voucher), id: snap.docs[0].id });
        toast({ title: "Voucher Berhasil" });
      }
    } catch {
      toast({ title: "Gagal Verifikasi", variant: "destructive" });
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleStartProcess = () => {
    if (cart.length === 0 && !settlementTrx) return;
    if (exchangeReturnSession) {
      if (cart.length === 0) {
        toast({
          title: "Pilih Barang Pengganti",
          description: "Retur wajib ganti barang. Pilih produk pengganti dari katalog terlebih dahulu.",
          variant: "destructive",
        });
        return;
      }
      const diff = totalTagihan - exchangeReturnSession.returnCreditAmount;
      if (diff > 0 && paymentMethod === "CASH") {
        setReceivedCash(diff.toString());
        setIsCashDialogOpen(true);
      } else {
        handleExecuteExchangeReturn();
      }
      return;
    }
    if (!settlementTrx) {
      if (isDPMode) {
        const dpVal = parseFloat(manualDPInput) || 0;
        if (dpVal <= 0) {
          toast({
            title: "Nominal DP Kosong",
            description: "Masukkan nominal pembayaran DP 1 terlebih dahulu.",
            variant: "destructive",
          });
          return;
        }
        if (dpVal >= totalTagihan) {
          toast({
            title: "Nominal DP Melebihi/Sama dengan Tagihan",
            description: "Untuk pembayaran penuh (lunas), matikan tombol mode DP.",
            variant: "destructive",
          });
          return;
        }
      }
      if (isMultiMode || paymentMethod !== "CASH" || isDPMode) handleProcessTransaction();
      else {
        setReceivedCash(totalTagihan.toString());
        setIsCashDialogOpen(true);
      }
    } else {
      const settleSummary = getTrxReturnSummary(settlementTrx);
      const amount = isAdditionalDP
        ? parseFloat(additionalDPInput) || 0
        : settleSummary.netRemaining;
      if (amount <= 0) {
        toast({
          title: "Nominal Pembayaran Kosong",
          description: "Masukkan nominal pembayaran DP terlebih dahulu.",
          variant: "destructive",
        });
        return;
      }
      if (isAdditionalDP && amount > settleSummary.netRemaining) {
        toast({
          title: "Melebihi Kekurangan Bayar",
          description: `Nominal tidak boleh melebihi sisa kekurangan bayar (Rp${settleSummary.netRemaining.toLocaleString("id-ID")}).`,
          variant: "destructive",
        });
        return;
      }
      if (paymentMethod === "CASH") {
        setReceivedCash(amount.toString());
        setIsCashDialogOpen(true);
      } else handleSettlement();
    }
  };

  const handleProcessTransaction = async (cashPayload?: { received: number; change: number }) => {
    setIsProcessing(true);
    const trxId = `TRX-${Date.now().toString().slice(-6)}`;
    const paidAmount = isDPMode ? parseFloat(manualDPInput) || 0 : totalTagihan;
    const now = new Date();
    const multiCash = isMultiMode ? Math.min(paidAmount, parseFloat(multiCashAmount) || 0) : 0;
    const multiOther = isMultiMode ? Math.max(0, paidAmount - multiCash) : 0;
    const trxData: any = {
      id: trxId,
      items: cart,
      subtotalLabel,
      storeDiscount,
      voucherDiscount,
      total: totalTagihan,
      paidAmount,
      remainingAmount: Math.max(0, totalTagihan - paidAmount),
      totalDiscount: totalPotongan,
      paymentMethod: isMultiMode ? `CASH & ${paymentMethod}` : paymentMethod,
      ...(isMultiMode
        ? {
            paymentBreakdown: {
              cash: multiCash,
              other: multiOther,
              otherMethod: paymentMethod === "CASH" ? "TRANSFER" : paymentMethod,
            },
          }
        : {}),
      customerType,
      customerName:
        (customerType === "UMUM" || customerType === "ONLINE"
          ? generalName
          : customerType === "MEMBER"
          ? selectedMember?.name
          : customerType === "AGEN"
          ? selectedAgent?.name
          : selectedReseller?.name) || "UMUM",
      customerPhone:
        (customerType === "UMUM" || customerType === "ONLINE"
          ? generalPhone
          : customerType === "MEMBER"
          ? selectedMember?.phone
          : customerType === "AGEN"
          ? selectedAgent?.phone
          : selectedReseller?.phone) || "",
      date: serverTimestamp(),
      cashier: cashierName,
      store: storeId,
      status: isDPMode ? "DP" : "COMPLETED",
      isDpTransaction: isDPMode,
      cashReceived: cashPayload?.received || 0,
      cashChange: cashPayload?.change || 0,
      paymentHistory: [
        {
          index: 1,
          type: isDPMode ? "DP 1" : "LUNAS",
          date: format(now, "yyyy-MM-dd"),
          time: format(now, "HH:mm:ss"),
          amount: paidAmount,
          method: isMultiMode ? `CASH & ${paymentMethod}` : paymentMethod,
        },
      ],
    };
    try {
      const cartQtyByProduct: Record<string, Record<string, number>> = {};
      cart.forEach((item) => {
        if (!cartQtyByProduct[item.productId]) cartQtyByProduct[item.productId] = {};
        cartQtyByProduct[item.productId][item.variantId] =
          (cartQtyByProduct[item.productId][item.variantId] || 0) + item.quantity;
      });

      Object.entries(cartQtyByProduct).forEach(([productId, variantQtyMap]) => {
        const p = products?.find((prod) => prod.id === productId);
        if (p) {
          const updated = p.variants.map((v: any) =>
            variantQtyMap[v.id] ? { ...v, stock: Math.max(0, (v.stock || 0) - variantQtyMap[v.id]) } : v
          );
          updateDocumentNonBlocking(doc(db, "stores", storeId, "stock", p.id), {
            variants: updated,
            searchTokens: generateSearchTokens(p.name, p.brand || "-", p.category || "-", p.series || "-", updated),
          });
        }
      });

      setDocumentNonBlocking(doc(db, "stores", storeId, "transactions", trxId), trxData, { merge: true });
      if (appliedVoucher?.id) {
        updateDocumentNonBlocking(doc(db, "coupons", appliedVoucher.id), {
          isUsed: true,
          usedAt: serverTimestamp(),
          usedByTrx: trxId,
        });
      }
      setIsProcessing(false);
      setIsSuccess(true);
      setLastTrxId(trxId);
      setIsCashDialogOpen(false);
    } catch {
      setIsProcessing(false);
      toast({ title: "Gagal", variant: "destructive" });
    }
  };

  const handleSettlement = (cashPayload?: { received: number; change: number }) => {
    if (!settlementTrx) return;
    setIsProcessing(true);
    const now = new Date();
    const summary = getTrxReturnSummary(settlementTrx);
    const rawAdded = isAdditionalDP ? parseFloat(additionalDPInput) || 0 : summary.netRemaining;
    const added = Math.min(summary.netRemaining, Math.max(0, rawAdded));
    const newPaid = summary.netPaid + added;
    const newRem = Math.max(0, summary.netTotal - newPaid);
    const prevStagesCount = summary.dpStages?.length || settlementTrx.paymentHistory?.length || 1;
    const nextIdx = prevStagesCount + 1;
    const isNowFullyPaid = newRem <= 0;
    const stageType = isNowFullyPaid ? "PELUNASAN" : `DP ${nextIdx}`;

    const existingHistory =
      Array.isArray(settlementTrx.paymentHistory) && settlementTrx.paymentHistory.length > 0
        ? settlementTrx.paymentHistory
        : [
            {
              index: 1,
              type: "DP 1",
              date: settlementTrx.date?.toDate
                ? format(settlementTrx.date.toDate(), "yyyy-MM-dd")
                : format(now, "yyyy-MM-dd"),
              time: settlementTrx.date?.toDate ? format(settlementTrx.date.toDate(), "HH:mm:ss") : "00:00:00",
              amount: summary.netPaid,
              method: settlementTrx.paymentMethod || "CASH",
            },
          ];

    const newHistory = [
      ...existingHistory,
      {
        index: existingHistory.length + 1,
        type: stageType,
        date: format(now, "yyyy-MM-dd"),
        time: format(now, "HH:mm:ss"),
        amount: added,
        method: paymentMethod,
      },
    ];
    const updated: any = {
      status: newRem > 0 ? "DP" : "COMPLETED",
      isDpTransaction: true,
      paidAmount: newPaid,
      remainingAmount: newRem,
      settledAt: newRem === 0 ? serverTimestamp() : null,
      lastDpPaidAt: serverTimestamp(),
      cashReceived: cashPayload?.received || 0,
      cashChange: cashPayload?.change || 0,
      paymentHistory: newHistory,
    };
    if (settlementTrx.originalPaidAmount !== undefined) {
      updated.originalPaidAmount = Number(settlementTrx.originalPaidAmount) + added;
    }
    updateDocumentNonBlocking(doc(db, "stores", storeId, "transactions", settlementTrx.id), updated);
    setIsProcessing(false);
    setIsSuccess(true);
    setLastTrxId(settlementTrx.id);
    setSettlementTrx(null);
    setIsCashDialogOpen(false);
    toast({
      title: isNowFullyPaid ? "Pelunasan DP Berhasil" : `Pembayaran ${stageType} Berhasil`,
      description: isNowFullyPaid
        ? `Transaksi ${settlementTrx.id} kini telah LUNAS.`
        : `DP masuk Rp${added.toLocaleString("id-ID")} • Kekurangan bayar: Rp${newRem.toLocaleString("id-ID")}`,
    });
  };

  // Step 1 of Return: Confirm items to return -> automatically switch to Cashier to pick replacement items
  const handleConfirmReturn = () => {
    if (!trxForReturn) return;
    const summary = getTrxReturnSummary(trxForReturn);
    const returnableList = summary.returnableItems;
    const returnedItems = returnableList
      .map((item: any) => {
        const key = `${item.productId}-${item.variantId}`;
        const qty = Math.min(item.quantity, returnQtys[key] || 0);
        if (qty <= 0) return null;
        return { ...item, quantity: qty };
      })
      .filter(Boolean);

    if (returnedItems.length === 0) return;

    const returnedQtyThisTime: Record<string, number> = {};
    returnedItems.forEach((item: any) => {
      const key = `${item.productId}-${item.variantId}`;
      returnedQtyThisTime[key] = (returnedQtyThisTime[key] || 0) + item.quantity;
    });

    const remainingItems = returnableList
      .map((item: any) => {
        const key = `${item.productId}-${item.variantId}`;
        const retQty = returnedQtyThisTime[key] || 0;
        const remQty = Math.max(0, Number(item.quantity || 0) - retQty);
        if (remQty <= 0) return null;
        return { ...item, quantity: remQty };
      })
      .filter(Boolean);

    const isFullReturn = remainingItems.length === 0;
    const computedRefundNow = returnedItems.reduce(
      (sum: number, item: any) => sum + getItemUnitNetPrice(item) * Number(item.quantity || 0),
      0
    );
    const returnCreditAmount = isFullReturn ? summary.netTotal : Math.min(summary.netTotal, computedRefundNow);

    // Enter Exchange Return Session in Cashier
    setCart([]);
    setSettlementTrx(null);
    setIsAdditionalDP(false);
    setIsDPMode(false);
    setIsMultiMode(false);
    setAppliedVoucher(null);
    setManualAdditionalDiscount("");
    setIsSuccess(false);
    setPaymentMethod("CASH");

    setExchangeReturnSession({
      trx: trxForReturn,
      returnedItems,
      returnedQtyMap: returnedQtyThisTime,
      returnCreditAmount,
    });

    setIsReturnDialogOpen(false);
    setShowHistory(false);
    setTrxForReturn(null);
    setReturnQtys({});

    toast({
      title: "Mode Tukar Barang Retur Aktif",
      description: `Silakan pilih barang pengganti dari katalog. Nilai kredit retur: Rp${returnCreditAmount.toLocaleString("id-ID")}`,
    });
  };

  // Step 2 of Return: Execute Return & Exchange with replacement items in `cart`
  const handleExecuteExchangeReturn = (cashPayload?: { received: number; change: number }) => {
    if (!exchangeReturnSession || cart.length === 0) return;
    const targetTrx = exchangeReturnSession.trx;
    const returnedItems = exchangeReturnSession.returnedItems;
    const returnedQtyThisTime = exchangeReturnSession.returnedQtyMap;
    const refundNow = exchangeReturnSession.returnCreditAmount;

    const summary = getTrxReturnSummary(targetTrx);
    const returnableList = summary.returnableItems;

    setIsProcessing(true);
    try {
      // 1. Combine stock deltas: +qty for returned items, -qty for replacement items in cart
      const stockDeltaByProduct: Record<string, Record<string, number>> = {};

      returnedItems.forEach((item: any) => {
        if (!stockDeltaByProduct[item.productId]) stockDeltaByProduct[item.productId] = {};
        stockDeltaByProduct[item.productId][item.variantId] =
          (stockDeltaByProduct[item.productId][item.variantId] || 0) + Number(item.quantity || 0);
      });

      cart.forEach((item) => {
        if (!stockDeltaByProduct[item.productId]) stockDeltaByProduct[item.productId] = {};
        stockDeltaByProduct[item.productId][item.variantId] =
          (stockDeltaByProduct[item.productId][item.variantId] || 0) - Number(item.quantity || 0);
      });

      Object.entries(stockDeltaByProduct).forEach(([productId, variantDeltaMap]) => {
        const p = products?.find((prod) => prod.id === productId);
        if (p) {
          const updated = p.variants.map((v: any) =>
            variantDeltaMap[v.id]
              ? { ...v, stock: Math.max(0, (v.stock || 0) + variantDeltaMap[v.id]) }
              : v
          );
          updateDocumentNonBlocking(doc(db, "stores", storeId, "stock", p.id), {
            variants: updated,
            searchTokens: generateSearchTokens(p.name, p.brand || "-", p.category || "-", p.series || "-", updated),
          });
        }
      });

      // 2. Build remaining unreturned items + new replacement items
      const remainingKeptItems = returnableList
        .map((item: any) => {
          const key = `${item.productId}-${item.variantId}`;
          const retQty = returnedQtyThisTime[key] || 0;
          const remQty = Math.max(0, Number(item.quantity || 0) - retQty);
          if (remQty <= 0) return null;
          return { ...item, quantity: remQty };
        })
        .filter(Boolean);

      // Attach effective net unit price on replacement items if global discount was applied
      const globalExtraDisc = voucherDiscount + (parseFloat(manualAdditionalDiscount) || 0);
      const exchangeItemsToSave = cart.map((item) => {
        const itemSubtotal = item.price * item.quantity;
        const shareOfExtra =
          globalExtraDisc > 0 && subtotalSetelahToko > 0
            ? (itemSubtotal / subtotalSetelahToko) * globalExtraDisc
            : 0;
        const effectiveUnitNet = Math.max(0, item.price - shareOfExtra / Math.max(1, item.quantity));
        return {
          ...item,
          price: Math.round(effectiveUnitNet),
          storeDiscountNominal: Math.round(
            (item.labelPrice || item.price) - effectiveUnitNet
          ),
          storeDiscountPercent: item.storeDiscountPercent || 0,
        };
      });

      const activeCombinedItems = [...remainingKeptItems, ...exchangeItemsToSave];

      // 3. Calculate exchange difference (tambah bayar vs sisa kembali)
      const exchangeNetNow = totalTagihan;
      const diffNow = exchangeNetNow - refundNow; // > 0: customer pays more, < 0: customer gets refund
      const additionalPaidNow = Math.max(0, diffNow);
      const refundFromPaidNow = Math.max(0, -diffNow);

      const newTotal = Math.max(0, summary.netTotal - refundNow + exchangeNetNow);
      const prevPaid = summary.netPaid;
      const newPaid = Math.min(newTotal, Math.max(0, prevPaid + additionalPaidNow - refundFromPaidNow));
      const newRemaining = Math.max(0, newTotal - newPaid);
      const newStatus: "RETURNED" | "DP" | "COMPLETED" = newRemaining > 0 ? "DP" : "COMPLETED";

      let cashRefundNow = 0;
      let transferRefundNow = 0;
      let qrisRefundNow = 0;
      let updatedPaymentBreakdown = targetTrx.paymentBreakdown
        ? { ...targetTrx.paymentBreakdown }
        : undefined;

      if (refundFromPaidNow > 0) {
        if (updatedPaymentBreakdown) {
          const currentCash = Number(updatedPaymentBreakdown.cash || 0);
          cashRefundNow = Math.min(currentCash, refundFromPaidNow);
          const remOther = Math.max(0, refundFromPaidNow - cashRefundNow);
          updatedPaymentBreakdown.cash = Math.max(0, currentCash - cashRefundNow);
          updatedPaymentBreakdown.other = Math.max(0, Number(updatedPaymentBreakdown.other || 0) - remOther);
          const otherMethod = String(updatedPaymentBreakdown.otherMethod || "").toUpperCase();
          if (otherMethod === "TRANSFER") transferRefundNow = remOther;
          else if (otherMethod === "QRIS") qrisRefundNow = remOther;
        } else {
          const method = String(targetTrx.paymentMethod || "CASH").toUpperCase();
          if (method.includes("CASH")) cashRefundNow = refundFromPaidNow;
          else if (method === "TRANSFER") transferRefundNow = refundFromPaidNow;
          else if (method === "QRIS") qrisRefundNow = refundFromPaidNow;
        }
      } else if (additionalPaidNow > 0 && updatedPaymentBreakdown) {
        if (paymentMethod === "CASH") {
          updatedPaymentBreakdown.cash = Number(updatedPaymentBreakdown.cash || 0) + additionalPaidNow;
        } else {
          updatedPaymentBreakdown.other = Number(updatedPaymentBreakdown.other || 0) + additionalPaidNow;
        }
      }

      // 4. Merge returned items & exchange items into returnLog
      const prevReturnedItems = Array.isArray(targetTrx.returnLog?.items) ? targetTrx.returnLog.items : [];
      const mergedReturnedMap = new Map<string, any>();
      [...prevReturnedItems, ...returnedItems].forEach((item: any) => {
        const key = `${item.productId}-${item.variantId}`;
        const existing = mergedReturnedMap.get(key);
        if (existing) {
          mergedReturnedMap.set(key, {
            ...existing,
            quantity: Number(existing.quantity || 0) + Number(item.quantity || 0),
          });
        } else {
          mergedReturnedMap.set(key, { ...item });
        }
      });
      const mergedReturnedItems = Array.from(mergedReturnedMap.values());

      const prevExchangeItems = Array.isArray(targetTrx.returnLog?.exchangeItems)
        ? targetTrx.returnLog.exchangeItems
        : [];
      const mergedExchangeMap = new Map<string, any>();
      [...prevExchangeItems, ...exchangeItemsToSave].forEach((item: any) => {
        const key = `${item.productId}-${item.variantId}`;
        const existing = mergedExchangeMap.get(key);
        if (existing) {
          mergedExchangeMap.set(key, {
            ...existing,
            quantity: Number(existing.quantity || 0) + Number(item.quantity || 0),
          });
        } else {
          mergedExchangeMap.set(key, { ...item });
        }
      });
      const mergedExchangeItems = Array.from(mergedExchangeMap.values());

      const totalRefundAccumulated = summary.totalRefund + refundNow;
      const totalExchangeAccumulated = summary.exchangeTotal + exchangeNetNow;
      const totalAdditionalPaidAccumulated = summary.additionalPaid + additionalPaidNow;
      const totalRefundFromPaidAccumulated = summary.refundFromPaid + refundFromPaidNow;
      const totalCashRefundedAccumulated = summary.cashRefunded + cashRefundNow;
      const totalTransferRefundedAccumulated = summary.transferRefunded + transferRefundNow;
      const totalQrisRefundedAccumulated = summary.qrisRefunded + qrisRefundNow;

      const now = new Date();
      const updatedPaymentHistory =
        additionalPaidNow > 0
          ? [
              ...(targetTrx.paymentHistory || []),
              {
                index: (targetTrx.paymentHistory?.length || 1) + 1,
                date: format(now, "yyyy-MM-dd"),
                time: format(now, "HH:mm:ss"),
                amount: additionalPaidNow,
                note: "TAMBAH BAYAR TUKAR RETUR",
              },
            ]
          : targetTrx.paymentHistory;

      const updatePayload: any = {
        originalTotal: summary.originalTotal,
        originalPaidAmount: summary.originalPaid,
        originalItems: targetTrx.originalItems ?? targetTrx.items ?? [],
        items: activeCombinedItems,
        total: newTotal,
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        status: newStatus,
        ...(updatedPaymentHistory ? { paymentHistory: updatedPaymentHistory } : {}),
        returnLog: {
          returnedAt: now.toISOString(),
          returnedBy: cashierName || "Kasir",
          isDeductedFromTotal: true,
          totalRefund: totalRefundAccumulated,
          exchangeTotal: totalExchangeAccumulated,
          additionalPaid: totalAdditionalPaidAccumulated,
          netExchangeDiff: totalExchangeAccumulated - totalRefundAccumulated,
          exchangePaymentMethod: paymentMethod,
          exchangeCashReceived:
            cashPayload?.received || (additionalPaidNow > 0 && paymentMethod === "CASH" ? additionalPaidNow : 0),
          exchangeCashChange: cashPayload?.change || 0,
          refundFromPaid: totalRefundFromPaidAccumulated,
          cashRefunded: totalCashRefundedAccumulated,
          transferRefunded: totalTransferRefundedAccumulated,
          qrisRefunded: totalQrisRefundedAccumulated,
          items: mergedReturnedItems,
          exchangeItems: mergedExchangeItems,
        },
      };

      if (updatedPaymentBreakdown) {
        updatePayload.originalPaymentBreakdown =
          targetTrx.originalPaymentBreakdown ?? targetTrx.paymentBreakdown;
        updatePayload.paymentBreakdown = updatedPaymentBreakdown;
      }

      updateDocumentNonBlocking(doc(db, "stores", storeId, "transactions", targetTrx.id), updatePayload);

      const trxDateId = targetTrx.date?.toDate ? format(targetTrx.date.toDate(), "yyyy-MM-dd") : todayId;
      if (trxDateId !== todayId && cashRefundNow > 0) {
        const newReturTunai = [
          ...(cashLog?.retur_tunai || []),
          {
            trxId: targetTrx.id,
            customerName: targetTrx.customerName || "UMUM",
            amount: cashRefundNow,
            timestamp: now.toISOString(),
            cashier: cashierName || "Kasir",
          },
        ];
        setDocumentNonBlocking(
          doc(db, "stores", storeId, "cashLogs", todayId),
          {
            retur_tunai: newReturTunai,
            lastUpdated: serverTimestamp(),
          },
          { merge: true }
        );
      }

      setIsCashDialogOpen(false);
      setExchangeReturnSession(null);
      setIsSuccess(true);
      setLastTrxId(targetTrx.id);

      toast({
        title: "Retur & Tukar Barang Berhasil",
        description:
          diffNow > 0
            ? `Transaksi ${targetTrx.id} diperbarui • Tambah bayar +Rp${diffNow.toLocaleString("id-ID")}`
            : diffNow < 0
            ? `Transaksi ${targetTrx.id} diperbarui • Sisa kembali Rp${Math.abs(diffNow).toLocaleString("id-ID")}`
            : `Transaksi ${targetTrx.id} diperbarui • Tukar barang pas (Rp 0)`,
      });
    } catch {
      toast({ title: "Gagal Memproses Tukar Retur", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewTransaction = () => {
    setCart([]);
    setGeneralName("");
    setGeneralPhone("");
    setSelectedMember(null);
    setSelectedAgent(null);
    setSelectedReseller(null);
    setIsDPMode(false);
    setManualDPInput("");
    setIsSuccess(false);
    setSettlementTrx(null);
    setExchangeReturnSession(null);
    setAppliedVoucher(null);
    setManualAdditionalDiscount("");
    setIsMultiMode(false);
    setMultiCashAmount("");
    setAdditionalDPInput("");
    setCustomerType("UMUM");
  };

  return (
    <div className="flex flex-col h-screen bg-[#ECEAE6] text-neutral-900 overflow-hidden font-body selection:bg-neutral-950 selection:text-white">
      <CashierHeader
        displayStoreName={displayStoreName}
        cashierName={cashierName}
        onOpenCashLogs={() => setShowCashLogs(true)}
        onOpenStockList={() => setShowStockList(true)}
        onOpenMemberMenu={(type) => {
          setCustomerModalSource("MENU");
          setCustomerType(type);
          if (type === "MEMBER") setShowSelectMember(true);
          if (type === "AGEN") setShowSelectAgent(true);
          if (type === "RESELLER") setShowSelectReseller(true);
        }}
        onOpenHistory={() => setShowHistory(true)}
        onOpenSettings={() => setShowSettings(true)}
        onLogout={() => logout()}
      />

      <div className="flex-1 flex flex-col md:grid md:grid-cols-12 overflow-hidden relative">
        <ProductCatalogSection
          search={search}
          setSearch={setSearch}
          sortBy={sortBy}
          setSortBy={setSortBy}
          filteredProducts={filteredProducts}
          onProductClick={handleProductClick}
        />

        <CartAndPaymentSection
          cart={cart}
          storeId={storeId}
          isSuccess={isSuccess}
          isProcessing={isProcessing}
          settlementTrx={settlementTrx}
          onCancelSettlement={() => {
            setSettlementTrx(null);
            setIsAdditionalDP(false);
          }}
          exchangeReturnSession={exchangeReturnSession}
          onCancelExchangeReturn={() => {
            setExchangeReturnSession(null);
            setCart([]);
          }}
          isAdditionalDP={isAdditionalDP}
          setIsAdditionalDP={setIsAdditionalDP}
          additionalDPInput={additionalDPInput}
          setAdditionalDPInput={setAdditionalDPInput}
          receivedCash={receivedCash}
          setReceivedCash={setReceivedCash}
          customerType={customerType}
          onSelectCustomerType={(type) => {
            setCustomerType(type);
            setCustomerModalSource("CART");
            if (type === "MEMBER") setShowSelectMember(true);
            if (type === "AGEN") setShowSelectAgent(true);
            if (type === "RESELLER") setShowSelectReseller(true);
            if (type === "ONLINE") {
              setPaymentMethod("TRANSFER");
              setIsDPMode(false);
              setIsMultiMode(false);
              setSelectedMember(null);
              setSelectedAgent(null);
              setSelectedReseller(null);
            }
          }}
          updateItemDiscountPercent={updateItemDiscountPercent}
          updateItemDiscountNominal={updateItemDiscountNominal}
          removeFromCart={removeFromCart}
          updateQuantity={updateQuantity}
          isDPMode={isDPMode}
          setIsDPMode={setIsDPMode}
          manualDPInput={manualDPInput}
          setManualDPInput={setManualDPInput}
          isMultiMode={isMultiMode}
          setIsMultiMode={setIsMultiMode}
          multiCashAmount={multiCashAmount}
          setMultiCashAmount={setMultiCashAmount}
          manualAdditionalDiscount={manualAdditionalDiscount}
          setManualAdditionalDiscount={setManualAdditionalDiscount}
          voucherInput={voucherInput}
          setVoucherCode={setVoucherCode}
          handleApplyVoucher={handleApplyVoucher}
          isValidatingVoucher={isValidatingVoucher}
          totalPotongan={totalPotongan}
          totalTagihan={totalTagihan}
          generalName={generalName}
          setGeneralName={setGeneralName}
          generalPhone={generalPhone}
          setGeneralPhone={setGeneralPhone}
          selectedMember={selectedMember}
          selectedAgent={selectedAgent}
          selectedReseller={selectedReseller}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          lastTrxId={lastTrxId}
          onNewTransaction={handleNewTransaction}
          onStartProcess={handleStartProcess}
        />
      </div>

      <CashDrawerDialog
        open={showCashDrawer}
        onOpenChange={setShowCashLogs}
        storeId={storeId}
        displayStoreName={displayStoreName}
        cashierName={cashierName}
        cashLog={cashLog}
        yesterdayRemaining={yesterdayRemaining}
        todaySalesStats={todaySalesStats}
        yesterdaySplit={yesterdaySplit}
      />
      <StockManagementDialog
        open={showStockList}
        onOpenChange={setShowStockList}
        storeId={storeId}
        cashierName={cashierName}
        stockDialogProducts={stockDialogProducts || []}
        isStockLoading={isStockLoading}
        outgoingMutations={[]}
        incomingMutations={[]}
        stockViewingStoreId={stockViewingStoreId}
        setStockViewingStoreId={setStockViewingStoreId}
      />
      <TransactionHistorySheet
        open={showHistory}
        onOpenChange={setShowHistory}
        isMobile={isMobile}
        historyDate={historyDate}
        setHistoryDate={setHistoryDate}
        historyFilterMode={historyFilterMode}
        setHistoryFilterMode={setHistoryFilterMode}
        showOnlyDP={showOnlyDP}
        setShowOnlyDP={setShowOnlyDP}
        history={historyData || []}
        storeId={storeId}
        onViewDetails={setSelectedTrxForDetails}
        onPrint={(id) => window.open(`/cashier/print?id=${id}&store=${storeId}`, "_blank")}
        onWhatsApp={handleSendReceiptWhatsApp}
        onReturn={(trx) => {
          setTrxForReturn(trx);
          setReturnQtys({});
          setIsReturnDialogOpen(true);
        }}
        onSettle={(trx, isAdd) => {
          const summary = getTrxReturnSummary(trx);
          setSettlementTrx({ ...trx, remainingAmount: summary.netRemaining });
          setIsAdditionalDP(isAdd);
          setReceivedCash(isAdd ? "" : summary.netRemaining.toString());
          setAdditionalDPInput("");
          setShowHistory(false);
          setPaymentMethod("CASH");
        }}
      />
      <TransactionDetailsDialog trx={liveTrxDetails} onClose={() => setSelectedTrxForDetails(null)} />

      <CustomerModals
        customerModalSource={customerModalSource}
        currentCardBg={currentCardBg}
        members={members}
        agents={agents}
        resellers={resellers}
        showSelectMember={showSelectMember}
        setShowSelectMember={setShowSelectMember}
        showSelectAgent={showSelectAgent}
        setShowSelectAgent={setShowSelectAgent}
        showSelectReseller={showSelectReseller}
        setShowSelectReseller={setShowSelectReseller}
        isRegisterMemberOpen={isRegisterMemberOpen}
        setIsRegisterMemberOpen={setIsRegisterMemberOpen}
        isRegisterAgentOpen={isRegisterAgentOpen}
        setIsRegisterAgentOpen={setIsRegisterAgentOpen}
        isRegisterResellerOpen={isRegisterResellerOpen}
        setIsRegisterResellerOpen={setIsRegisterResellerOpen}
        newRegData={newRegData}
        setNewRegData={setNewRegData}
        onRegisterMember={handleRegisterMember}
        onRegisterAgent={handleRegisterAgent}
        onRegisterReseller={handleRegisterReseller}
        isEditMemberOpen={isEditMemberOpen}
        setIsEditMemberOpen={setIsEditMemberOpen}
        isEditAgentOpen={isEditAgentOpen}
        setIsEditAgentOpen={setIsEditAgentOpen}
        isEditResellerOpen={isEditResellerOpen}
        setIsEditResellerOpen={setIsEditResellerOpen}
        editingCustomer={editingCustomer}
        setEditingCustomer={setEditingCustomer}
        onUpdateCustomer={handleUpdateCustomer}
        onSelectMember={setSelectedMember}
        onSelectAgent={setSelectedAgent}
        onSelectReseller={setSelectedReseller}
        setCustomerType={setCustomerType}
      />

      <CashierActionDialogs
        showSettings={showSettings}
        setShowSettings={setShowSettings}
        cashierName={cashierName}
        setCashierName={setCashierName}
        storeId={storeId}
        customStoreName={customStoreName}
        setCustomStoreName={setCustomStoreName}
        customStoreAddress={customStoreAddress}
        setCustomStoreAddress={setCustomStoreAddress}
        customStorePhone={customStorePhone}
        setCustomStorePhone={setCustomStorePhone}
        isCashDialogOpen={isCashDialogOpen}
        setIsCashDialogOpen={setIsCashDialogOpen}
        amountToProcess={amountToProcess}
        receivedCash={receivedCash}
        setReceivedCash={setReceivedCash}
        settlementTrx={settlementTrx}
        onConfirmCashPayment={(payload) => {
          if (exchangeReturnSession) handleExecuteExchangeReturn(payload);
          else if (settlementTrx) handleSettlement(payload);
          else handleProcessTransaction(payload);
        }}
        isReturnDialogOpen={isReturnDialogOpen}
        setIsReturnDialogOpen={setIsReturnDialogOpen}
        trxForReturn={trxForReturn}
        returnQtys={returnQtys}
        setReturnQtys={setReturnQtys}
        isProcessing={isProcessing}
        onConfirmReturn={handleConfirmReturn}
        waReceiptTrx={waReceiptTrx}
        waReceiptPhone={waReceiptPhone}
        setWaReceiptPhone={setWaReceiptPhone}
        onCloseWaReceipt={() => {
          setWaReceiptTrx(null);
          setWaReceiptPhone("");
        }}
        onSendWaReceiptWithPhone={(trx, phone) => {
          if (openReceiptWhatsApp(trx, phone)) {
            updateDocumentNonBlocking(doc(db, "stores", storeId, "transactions", trx.id), {
              customerPhone: phone,
            });
            setWaReceiptTrx(null);
            setWaReceiptPhone("");
          }
        }}
      />
    </div>
  );
}
