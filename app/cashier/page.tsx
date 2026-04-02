
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
  Calculator
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { Label } from "@/components/ui/label";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuRadioGroup, 
  DropdownMenuRadioItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  updateDocumentNonBlocking,
  setDocumentNonBlocking
} from "@/firebase";
import { collection, doc, query, orderBy, serverTimestamp, where, Timestamp, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
  quantity: number;
  stock: number;
}

interface Member { id: string; name: string; phone: string; address: string; discount: number; }
interface Agent { id: string; name: string; phone: string; discount: number; }
interface Voucher { id: string; code: string; discount: number; isUsed: boolean; }

const LOGO_URL = "https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png";

export default function CashierPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const db = useFirestore();
  const isMobile = useIsMobile();
  
  const storeId = user?.associatedStoreId || "TOKO_A";
  const displayStoreName = storeId === "TOKO_A" ? "NHS KWT" : storeId === "TOKO_B" ? "IND CO" : storeId === "TOKO_C" ? "NHS GDM" : "STORE";
  
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [cashierName, setCashierName] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const [customerType, setCustomerType] = useState<"UMUM" | "MEMBER" | "AGEN">("UMUM");
  const [generalName, setGeneralName] = useState("");
  const [generalPhone, setGeneralPhone] = useState("");
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER" | "QRIS">("CASH");
  
  const [voucherInput, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  const [isDPMode, setIsDPMode] = useState(false);
  const [manualDPInput, setManualDPInput] = useState("");
  const [settlementTrx, setSettlementTrx] = useState<any>(null);
  
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
  
  // States for Cash Payment Dialog
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [receivedCash, setReceivedCash] = useState("");

  const [newMember, setNewMember] = useState({ name: "", phone: "", address: "" });
  const [newAgent, setNewAgent] = useState({ id: "", name: "", phone: "", discount: "0" });

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    
    const savedName = localStorage.getItem("nibras_cashier_name");
    if (savedName) setCashierName(savedName);
    else if (user?.name) setCashierName(user.name);
  }, [user, loading, router]);

  const handleSaveSettings = () => {
    localStorage.setItem("nibras_cashier_name", cashierName);
    setShowSettings(false);
    toast({ title: "Pengaturan Tersimpan" });
  };

  const productsQuery = useMemoFirebase(() => user ? collection(db, "stores", storeId, "stock") : null, [db, storeId, user]);
  const { data: productsData } = useCollection<any>(productsQuery);
  const products = productsData || [];

  const membersQuery = useMemoFirebase(() => user ? collection(db, "members") : null, [db, user]);
  const { data: membersData } = useCollection<Member>(membersQuery);
  const members = membersData || [];

  const agentsQuery = useMemoFirebase(() => user ? collection(db, "agents") : null, [db, user]);
  const { data: agentsData } = useCollection<Agent>(agentsQuery);
  const agents = agentsData || [];

  const historyQuery = useMemoFirebase(() => {
    if (!user || !showHistory) return null;
    const start = new Date(historyDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(historyDate);
    end.setHours(23, 59, 59, 999);
    return query(
      collection(db, "stores", storeId, "transactions"),
      where("date", ">=", Timestamp.fromDate(start)),
      where("date", "<=", Timestamp.fromDate(end)),
      orderBy("date", "desc")
    );
  }, [db, storeId, user, historyDate, showHistory]);
  const { data: history } = useCollection<any>(historyQuery);

  const filteredProducts = useMemo(() => {
    const keyword = search.toLowerCase();
    const flattened: any[] = [];
    products.forEach(p => {
      if (p.variants) {
        p.variants.forEach(v => {
          const fullName = `${p.name} ${v.color} ${v.size} ${p.brand || ""}`.toLowerCase();
          if (fullName.includes(keyword)) {
            flattened.push({ 
              ...v, 
              productId: p.id, 
              baseName: p.name, 
              category: p.category, 
              brand: p.brand || p.category || "-", 
              variantId: v.id, 
              invoiceDate: v.invoiceDate || "-" 
            });
          }
        });
      }
    });
    return flattened.sort((a, b) => {
      if (sortBy === "name-asc") return a.baseName.localeCompare(b.baseName);
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });
  }, [search, products, sortBy]);

  const subtotalLabel = cart.reduce((s, i) => s + (i.labelPrice * i.quantity), 0);
  const storeDiscount = cart.reduce((s, i) => s + ((i.labelPrice * i.storeDiscountPercent / 100) * i.quantity), 0);
  const subtotalSetelahToko = subtotalLabel - storeDiscount;
  
  const memberDiscount = (customerType === "MEMBER" && selectedMember) ? (subtotalSetelahToko * selectedMember.discount / 100) : 0;
  const agentDiscount = (customerType === "AGEN" && selectedAgent) ? (subtotalSetelahToko * selectedAgent.discount / 100) : 0;
  
  const voucherDiscount = appliedVoucher ? (subtotalSetelahToko * appliedVoucher.discount / 100) : 0;
  
  const totalPotongan = storeDiscount + memberDiscount + agentDiscount + voucherDiscount;
  const totalTagihan = subtotalLabel - totalPotongan;

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
      setCart(prev => [...prev, { 
        cartId, 
        productId: item.productId, 
        variantId: item.variantId,
        name: item.baseName, 
        color: item.color, 
        size: item.size, 
        price: label, 
        labelPrice: label, 
        buyPrice: buyPrice,
        storeDiscountPercent: 0, 
        quantity: 1, 
        stock: item.stock 
      }]);
    }
    toast({ title: "Item Ditambahkan" });
  };

  const updateItemDiscount = (cartId: string, percent: string) => {
    const p = parseFloat(percent) || 0;
    setCart(prev => prev.map(item => {
      if (item.cartId === cartId) {
        const newPrice = item.labelPrice - (item.labelPrice * p / 100);
        return { ...item, storeDiscountPercent: p, price: newPrice };
      }
      return item;
    }));
  };

  const handleApplyVoucher = async () => {
    if (!voucherInput) return;
    setIsValidatingVoucher(true);
    try {
      const q = query(collection(db, "coupons"), where("code", "==", voucherInput.toUpperCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        toast({ title: "Voucher Tidak Ditemukan", variant: "destructive" });
        setAppliedVoucher(null);
      } else {
        const vData = snap.docs[0].data() as Voucher;
        if (vData.isUsed) {
          toast({ title: "Voucher Sudah Terpakai", variant: "destructive" });
          setAppliedVoucher(null);
        } else {
          setAppliedVoucher({ ...vData, id: snap.docs[0].id });
          toast({ title: `Voucher Berhasil: Potongan ${vData.discount}%` });
        }
      }
    } catch (err) {
      toast({ title: "Gagal Verifikasi Voucher", variant: "destructive" });
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleWhatsAppReceipt = (trx: any) => {
    if (!trx) return;
    const phone = trx.customerPhone;
    if (!phone) {
      toast({ title: "Gagal", description: "Nomor WhatsApp pelanggan tidak ditemukan.", variant: "destructive" });
      return;
    }
    let formattedPhone = phone.toString().replace(/\D/g, ''); 
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);
    const currentStoreDisplayName = trx.store === "TOKO_A" ? "NHS KWT" : trx.store === "TOKO_B" ? "IND CO" : trx.store === "TOKO_C" ? "NHS GDM" : "STORE";
    const storeName = `NIBRAS HOUSE ${currentStoreDisplayName}`;
    const dateStr = trx.date?.toDate ? format(trx.date.toDate(), "dd/MM/yyyy HH:mm") : format(new Date(), "dd/MM/yyyy HH:mm");
    
    let msg = `*STRUK PEMBELIAN*\n🛍️ ${storeName}\n----------------------------\n📅 Tanggal: ${dateStr}\n👤 Kasir: ${trx.cashier}\n----------------------------\n\n`;
    const items = trx.items || [];
    items.forEach((item: any) => {
      msg += `• *${item.name}*\n  ${item.quantity}x @Rp${item.price.toLocaleString('id-ID')} = Rp${(item.price * item.quantity).toLocaleString('id-ID')}\n`;
    });
    
    msg += `\n----------------------------\n`;
    msg += `SUBTOTAL (LABEL): Rp${(trx.subtotalLabel || 0).toLocaleString('id-ID')}\n`;
    if (trx.storeDiscount > 0) msg += `DISC TOKO: -Rp${trx.storeDiscount.toLocaleString('id-ID')}\n`;
    if (trx.memberDiscount > 0) msg += `DISC MEMBER: -Rp${trx.memberDiscount.toLocaleString('id-ID')}\n`;
    if (trx.agentDiscount > 0) msg += `DISC AGEN: -Rp${trx.agentDiscount.toLocaleString('id-ID')}\n`;
    if (trx.voucherDiscount > 0) msg += `DISC VOUCHER: -Rp${trx.voucherDiscount.toLocaleString('id-ID')}\n`;
    msg += `TOTAL POTONGAN: -Rp${(trx.totalDiscount || 0).toLocaleString('id-ID')}\n`;
    msg += `----------------------------\n`;
    msg += `*GRAND TOTAL: Rp${trx.total.toLocaleString('id-ID')}*\n`;
    
    if (trx.status === "DP") {
      msg += `Status: *BELUM LUNAS (DP)*\nDibayar: Rp${trx.paidAmount.toLocaleString('id-ID')}\nSisa: Rp${trx.remainingAmount.toLocaleString('id-ID')}\n`;
    } else {
      msg += `Status: *LUNAS / SELESAI*\n`;
      if (trx.paymentMethod === "CASH" && trx.cashReceived > 0) {
        msg += `Tunai: Rp${trx.cashReceived.toLocaleString('id-ID')}\nKembalian: Rp${trx.cashChange.toLocaleString('id-ID')}\n`;
      }
    }
    
    msg += `----------------------------\nTerima kasih telah berbelanja di Nibras House! 🙏✨`;
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const handleStartProcess = () => {
    if (cart.length === 0) return;
    if (paymentMethod === "CASH" && !isDPMode) {
      setReceivedCash(totalTagihan.toString());
      setIsCashDialogOpen(true);
    } else {
      handleProcessTransaction();
    }
  };

  const handleProcessTransaction = async (cashPayload?: { received: number, change: number }) => {
    setIsProcessing(true);
    const trxId = `TRX-${Date.now().toString().slice(-6)}`;
    const paidAmount = isDPMode ? (parseFloat(manualDPInput) || 0) : totalTagihan;
    const status = isDPMode ? "DP" : "COMPLETED";

    const trxData = {
      id: trxId, 
      items: cart, 
      subtotalLabel, 
      storeDiscount, 
      memberDiscount, 
      agentDiscount, 
      voucherDiscount,
      appliedVoucher: appliedVoucher ? { id: appliedVoucher.id, code: appliedVoucher.code, discount: appliedVoucher.discount } : null,
      total: totalTagihan,
      paidAmount, 
      remainingAmount: totalTagihan - paidAmount, 
      totalDiscount: totalPotongan, 
      paymentMethod,
      customerType, 
      customerName: (customerType === "UMUM" ? generalName : customerType === "MEMBER" ? selectedMember?.name : selectedAgent?.name) || "UMUM",
      customerPhone: (customerType === "UMUM" ? generalPhone : customerType === "MEMBER" ? selectedMember?.phone : selectedAgent?.phone) || "",
      date: serverTimestamp(), 
      cashier: cashierName || user?.name || "KASIR", 
      store: storeId, 
      status,
      cashReceived: cashPayload?.received || 0,
      cashChange: cashPayload?.change || 0
    };

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
      setTimeout(() => {
        setIsProcessing(false); 
        setIsSuccess(true); 
        setLastTrxId(trxId); 
        setLastTrxData(trxData); 
        setActiveTrxStatus(status);
        setIsCashDialogOpen(false);
        toast({ title: status === "DP" ? "DP Berhasil" : "Transaksi Berhasil" });
      }, 800);
    } catch (err) {
      console.error(err); setIsProcessing(false);
      toast({ title: "Gagal memproses transaksi", variant: "destructive" });
    }
  };

  const handleSettlement = () => {
    if (!settlementTrx) return;
    setIsProcessing(true);
    const trxRef = doc(db, "stores", storeId, "transactions", settlementTrx.id);
    const updatedTrx = { ...settlementTrx, status: "COMPLETED", paidAmount: settlementTrx.total, remainingAmount: 0, settledAt: serverTimestamp(), settlementCashier: cashierName || user?.name || "KASIR", settlementPaymentMethod: paymentMethod };
    updateDocumentNonBlocking(trxRef, updatedTrx);
    setTimeout(() => {
      setIsProcessing(false); setIsSuccess(true); setLastTrxId(settlementTrx.id); setLastTrxData(updatedTrx); setActiveTrxStatus("COMPLETED"); setSettlementTrx(null);
      toast({ title: "Pelunasan Berhasil" });
    }, 800);
  };

  const handleNewTransaction = () => {
    setCart([]); setGeneralName(""); setGeneralPhone(""); setSelectedMember(null); setSelectedAgent(null);
    setIsDPMode(false); setManualDPInput(""); setIsSuccess(false); setLastTrxId(null); setLastTrxData(null); setSettlementTrx(null);
    setAppliedVoucher(null); setVoucherCode(""); setReceivedCash("");
  };

  const handleAddMember = () => {
    if (!newMember.name || !newMember.phone) return toast({ title: "Lengkapi data", variant: "destructive" });
    const id = `MBR-${Date.now().toString().slice(-6)}`;
    setDocumentNonBlocking(doc(db, "members", id), { id, name: newMember.name, phone: newMember.phone, address: newMember.address, discount: 0 }, { merge: true });
    setNewMember({ name: "", phone: "", address: "" });
    setShowAddMember(false);
    toast({ title: "Member Terdaftar" });
  };

  const handleAddAgent = () => {
    if (!newAgent.id || !newAgent.name || !newAgent.phone) return toast({ title: "Lengkapi data", variant: "destructive" });
    setDocumentNonBlocking(doc(db, "agents", newAgent.id), { id: newAgent.id, name: newAgent.name, phone: newAgent.phone, discount: parseInt(newAgent.discount) || 0 }, { merge: true });
    setNewAgent({ id: "", name: "", phone: "", discount: "0" });
    setShowAddAgent(false);
    toast({ title: "Agen Terdaftar" });
  };

  const CartContentItems = ({ isMobileView = false }) => (
    <div className="space-y-3">
      {settlementTrx ? (
        <div className="space-y-3 py-1">
          <div className={cn("flex items-center gap-2", isMobileView ? "text-slate-400" : "text-white/70")}>
            <History className="h-3 w-3" />
            <span className="text-[9px] font-black uppercase tracking-widest">Rincian Barang</span>
          </div>
          {settlementTrx.items?.map((item: any, i: number) => (
            <div key={i} className={cn("pb-2 border-b last:border-0", isMobileView ? "border-slate-100" : "border-white/10")}>
              <p className={cn("text-[10px] font-black uppercase leading-tight", isMobileView ? "text-slate-800" : "text-white")}>{item.name}</p>
              <div className="flex justify-between mt-1">
                <span className={cn("text-[9px] font-bold", isMobileView ? "text-slate-400" : "text-white/40")}>{item.quantity}x</span>
                <span className={cn("text-[9px] font-black", isMobileView ? "text-primary" : "text-white")}>Rp{(item.price * item.quantity).toLocaleString('id-ID')}</span>
              </div>
            </div>
          ))}
        </div>
      ) : cart.length === 0 ? (
        <div className="h-24 flex flex-col items-center justify-center opacity-20">
          <ShoppingCart className={cn("h-8 w-8 mb-1", isMobileView ? "text-primary" : "text-white")} />
          <p className={cn("text-[9px] font-black uppercase", isMobileView ? "text-primary" : "text-white")}>Kosong</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cart.map(item => (
            <div key={item.cartId} className={cn("flex flex-col gap-1.5 pb-2 border-b last:border-0", isMobileView ? "border-slate-100" : "border-white/10")}>
              <div className="flex justify-between items-start gap-1">
                <div className="min-w-0 flex-1">
                  <p className={cn("text-[10px] font-black uppercase leading-tight truncate", isMobileView ? "text-slate-800" : "text-white")}>{item.name}</p>
                  <p className={cn("text-[8px] font-medium", isMobileView ? "text-slate-400" : "text-white/50")}>{item.color} | {item.size}</p>
                </div>
                {!isSuccess && !settlementTrx && !isMobileView && (
                  <button onClick={() => setCart(prev => prev.filter(i => i.cartId !== item.cartId))} className="text-rose-400 shrink-0 p-0.5">
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
              
              {!isSuccess && !settlementTrx && (
                <div className={cn("flex items-center", isMobileView ? "bg-slate-50" : "bg-white/5", "p-1.5 rounded-lg border", isMobileView ? "border-slate-100" : "border-white/10")}>
                  <div className="flex items-center justify-between w-full gap-1">
                    <div className="flex items-center gap-0.5">
                      <Percent className={cn("h-2.5 w-2.5 shrink-0", isMobileView ? "text-slate-400" : "text-white/40")} />
                      <Input 
                        type="number" 
                        value={item.storeDiscountPercent} 
                        onChange={(e) => updateItemDiscount(item.cartId, e.target.value)} 
                        className={cn("h-5 w-8 border-none text-[8px] font-bold text-center p-0 rounded shadow-none", isMobileView ? "bg-white text-primary" : "bg-white/10 text-white")} 
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCart(prev => prev.map(i => i.cartId === item.cartId ? { ...i, quantity: Math.max(1, i.quantity - 1) } : i))} className={cn("h-5 w-5 rounded-md flex items-center justify-center shadow-sm", isMobileView ? "bg-white text-slate-600" : "bg-white/10 text-white")}><Minus className="h-2 w-2" /></button>
                      <span className={cn("text-[9px] font-black w-3 text-center", isMobileView ? "text-primary" : "text-white")}>{item.quantity}</span>
                      <button onClick={() => setCart(prev => prev.map(i => i.cartId === item.cartId ? { ...i, quantity: Math.min(item.stock, i.quantity + 1) } : i))} className={cn("h-5 w-5 rounded-md flex items-center justify-center shadow-sm", isMobileView ? "bg-white text-slate-600" : "bg-white/10 text-white")}><Plus className="h-2 w-2" /></button>
                    </div>
                    {isMobileView && (
                      <button onClick={() => setCart(prev => prev.filter(i => i.cartId !== item.cartId))} className="text-rose-500 p-1">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-end">
                <p className={cn("text-[10px] font-black", isMobileView ? "text-primary" : "text-white")}>Rp{(item.price * item.quantity).toLocaleString('id-ID')}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F7F9FB] overflow-hidden font-body">
      <header className="h-14 md:h-16 flex items-center justify-between px-4 md:px-6 bg-primary shrink-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-lg w-8 h-8 md:w-10 md:h-10 flex items-center justify-center border border-white/20 overflow-hidden">
            <Image src={LOGO_URL} alt="Logo" width={32} height={32} className="object-contain" />
          </div>
          <div><p className="font-black text-xs md:text-sm text-white uppercase leading-tight tracking-tight">NIBRAS HOUSE</p><p className="text-[8px] md:text-[10px] text-white/70 font-bold uppercase tracking-widest">{displayStoreName}</p></div>
        </div>
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Button variant="ghost" className="text-[10px] font-black tracking-widest text-white/90 hover:text-white hover:bg-white/10 gap-2" onClick={() => setShowAddMember(true)}><UserPlus className="h-3.5 w-3.5" /> TAMBAH MEMBER</Button>
            <Button variant="ghost" className="text-[10px] font-black tracking-widest text-white/90 hover:text-white hover:bg-white/10 gap-2" onClick={() => setShowAddAgent(true)}><ShieldCheck className="h-3.5 w-3.5" /> TAMBAH AGEN</Button>
            <button onClick={() => setShowHistory(true)} className="px-4 py-2 text-[11px] font-black tracking-widest text-white/90 hover:text-white hover:bg-white/10 transition-all uppercase flex items-center gap-2 rounded-md"><History className="h-3.5 w-3.5" /> RIWAYAT</button>
            <Button variant="ghost" className="text-[10px] font-black tracking-widest text-white/90 hover:text-white hover:bg-white/10 gap-2" onClick={() => setShowSettings(true)}><Settings className="h-3.5 w-3.5" /> SETING</Button>
          </div>
          <div className="h-6 w-px bg-white/20 mx-2" /><Button variant="ghost" size="icon" onClick={() => logout()} className="rounded-full h-10 w-10 text-white hover:bg-rose-500/20 hover:text-white"><LogOut className="h-5 w-5" /></Button>
        </div>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild><Button variant="ghost" size="icon" className="text-white hover:bg-white/10"><Menu className="h-6 w-6" /></Button></SheetTrigger>
            <SheetContent side="right" className="w-72 p-0 border-none">
              <div className="flex flex-col h-full bg-white">
                <SheetHeader className="p-6 bg-primary text-white text-left">
                  <SheetTitle className="sr-only">Menu Utama Kasir</SheetTitle>
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
        <main className="h-[45vh] md:h-auto md:col-span-2 p-3 md:p-6 overflow-y-auto bg-slate-50/50 border-b md:border-b-0 md:border-r scrollbar-hide">
          <div className="max-w-5xl mx-auto space-y-3 md:space-y-6">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><Input placeholder="Cari produk..." className="h-10 md:h-12 pl-10 rounded-xl md:rounded-2xl border-none shadow-sm bg-white text-xs md:text-sm" value={search} onChange={e => setSearch(e.target.value)} /></div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline" className="h-10 md:h-12 rounded-xl md:rounded-2xl shadow-sm bg-white border-none px-4 font-bold text-[10px] md:text-sm"><ArrowUpDown className="h-3.5 w-3.5 mr-2" /> Urutkan</Button></DropdownMenuTrigger>
                <DropdownMenuContent className="rounded-2xl w-48" align="end">
                  <DropdownMenuRadioGroup value={sortBy} onValueChange={setSortBy}>
                    <DropdownMenuRadioItem value="name-asc" className="text-xs font-bold uppercase">Nama (A-Z)</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="price-asc" className="text-xs font-bold uppercase">Harga Terendah</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="price-desc" className="text-xs font-bold uppercase">Harga Tertinggi</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4 pb-4">
              {filteredProducts.map((p, idx) => (
                <Card key={idx} className="border-none shadow-sm rounded-xl bg-white card-hover cursor-pointer overflow-hidden group" onClick={() => handleProductClick(p)}>
                  <CardContent className="p-2 md:p-4 space-y-1 md:space-y-2">
                    <div className="flex justify-between items-center gap-1">
                      <div className="flex flex-wrap gap-0.5">
                        <Badge className="bg-primary/5 text-primary border-none text-[6px] md:text-[8px] font-black uppercase px-1">{p.category}</Badge>
                        <Badge className="bg-slate-100 text-slate-600 border-none text-[6px] md:text-[8px] font-black uppercase px-1">{p.brand}</Badge>
                      </div>
                      <span className={cn("text-[6px] md:text-[8px] font-black tracking-tight shrink-0", p.stock < 5 ? "text-rose-500" : "text-slate-400")}>{p.stock} PCS</span>
                    </div>
                    <div>
                      <h3 className="text-[9px] md:text-xs font-bold uppercase text-slate-800 line-clamp-1 md:line-clamp-2 leading-tight group-hover:text-primary transition-colors">{p.baseName}</h3>
                      <p className="text-[6px] md:text-[9px] text-slate-400 font-bold uppercase mt-0.5 truncate">
                        {p.color}/{p.size}/NOTA BELI: {p.invoiceDate}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1 md:pt-2 border-t border-dashed border-slate-100">
                      <p className="text-primary font-black text-[9px] md:text-sm">Rp{p.price.toLocaleString('id-ID')}</p>
                      <div className="bg-primary/10 p-1 rounded-lg text-primary group-hover:bg-primary group-hover:text-white transition-all"><Plus className="h-2 w-2 md:h-3 md:w-3" /></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>

        <div className="flex-1 flex md:hidden h-[55vh] overflow-hidden bg-white">
          <div className="w-[45%] flex flex-col border-r bg-primary/5 h-full">
            <div className="p-2 bg-primary text-white shrink-0 flex items-center justify-between">
              <span className="text-[8px] font-black uppercase tracking-widest flex items-center gap-1"><ShoppingCart className="h-2.5 w-2.5" /> Keranjang</span>
              <Badge className="bg-white/20 text-white text-[7px] h-3.5 min-w-[14px] px-1">{cart.length}</Badge>
            </div>
            <div className="flex-1 flex flex-col overflow-hidden p-2 gap-2">
              {!settlementTrx && (
                <div className="flex gap-0.5 shrink-0">
                  {(["UMUM", "MEMBER", "AGEN"] as const).map(type => (
                    <button key={type} onClick={() => { setCustomerType(type); setSelectedMember(null); setSelectedAgent(null); }} className={cn("flex-1 h-6 text-[6px] font-black rounded transition-all", customerType === type ? "bg-primary text-white" : "bg-white text-primary/40 border border-primary/10")}>{type}</button>
                  ))}
                </div>
              )}
              <div className="flex-1 overflow-y-auto">
                <CartContentItems isMobileView={true} />
              </div>
              {!settlementTrx && !isSuccess && (
                <div className="shrink-0 mt-auto pt-2 border-t border-primary/10">
                  <div className="relative">
                    <Ticket className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2.5 w-2.5 text-primary/40" />
                    <Input placeholder="VOCER" className="h-6 pl-5 pr-8 bg-white border-primary/10 text-[7px] font-bold uppercase rounded shadow-none" value={voucherInput} onChange={e => setVoucherCode(e.target.value)} />
                    <button onClick={handleApplyVoucher} disabled={isValidatingVoucher || !voucherInput} className="absolute right-1 top-1/2 -translate-y-1/2 h-4 px-1.5 bg-primary text-white rounded text-[6px] font-black">{isValidatingVoucher ? "..." : "CEK"}</button>
                  </div>
                  {appliedVoucher && <div className="mt-1 flex justify-between items-center bg-emerald-50 p-1 rounded border border-emerald-100"><span className="text-[6px] font-black text-emerald-700">{appliedVoucher.code}</span><X className="h-2 w-2 text-emerald-400 cursor-pointer" onClick={() => setAppliedVoucher(null)} /></div>}
                </div>
              )}
            </div>
          </div>

          <div className="w-[55%] flex flex-col bg-white overflow-hidden relative h-full">
            <div className="p-2 bg-slate-50 border-b shrink-0 flex items-center gap-1"><CreditCard className="h-2.5 w-2.5 text-primary" /><span className="text-[8px] font-black uppercase tracking-widest text-slate-800">Bayar</span></div>
            <ScrollArea className="flex-1 p-2 space-y-2">
              {isSuccess ? (
                <div className="space-y-2 animate-in fade-in zoom-in duration-300">
                  <div className="bg-emerald-50 p-3 rounded-xl flex flex-col items-center gap-1 border border-emerald-100 text-center"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><p className="text-[8px] font-black text-emerald-700 uppercase">SUKSES</p></div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <Button variant="outline" className="h-8 rounded font-black text-[7px] gap-1 border-primary text-primary px-1" onClick={() => window.open(`/cashier/print?id=${lastTrxId}&store=${storeId}`, '_blank')}><Printer className="h-2.5 w-2.5" /> STRUK</Button>
                    <Button variant="outline" className="h-8 rounded font-black text-[7px] gap-1 border-[#25D366] text-[#25D366]" onClick={() => handleWhatsAppReceipt(lastTrxData)}><MessageSquare className="h-2.5 w-2.5" /> WA</Button>
                  </div>
                  <Button className="w-full h-9 rounded font-black text-[8px] bg-slate-800" onClick={handleNewTransaction}>BARU</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* SETTLEMENT INFO CARD MOBILE */}
                  {settlementTrx && (
                    <div className="p-2 bg-orange-50 rounded-lg border border-orange-100 space-y-1 mb-1 animate-in slide-in-from-top-2">
                      <div className="flex justify-between items-center">
                        <p className="text-[7px] font-black text-orange-600 uppercase">Pelunasan DP</p>
                        <Badge className="bg-orange-500 text-white text-[5px] h-3 px-1 border-none shadow-none">{settlementTrx.id.slice(-6)}</Badge>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[8px] font-black uppercase text-slate-800 truncate">{settlementTrx.customerName}</p>
                        <div className="flex justify-between text-[6px] font-bold text-slate-500">
                          <span>SUDAH DIBAYAR</span>
                          <span>Rp{settlementTrx.paidAmount?.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="flex justify-between items-center bg-orange-100 p-1 rounded-md mt-1">
                          <span className="text-[7px] font-black text-orange-700 uppercase">Sisa Tagihan</span>
                          <span className="text-[9px] font-black text-orange-700">Rp{settlementTrx.remainingAmount?.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!settlementTrx && (
                    <div className="space-y-1">
                      {customerType === "MEMBER" && <Button variant="outline" className="w-full h-7 rounded text-[7px] font-black gap-1 border-dashed border-primary/20 text-primary" onClick={() => setShowSelectMember(true)}><UserCheck className="h-2.5 w-2.5" /> {selectedMember ? selectedMember.name.toUpperCase() : "PILIH MEMBER"}</Button>}
                      {customerType === "AGEN" && <Button variant="outline" className="w-full h-7 rounded text-[7px] font-black gap-1 border-dashed border-primary/20 text-primary" onClick={() => setShowSelectAgent(true)}><ShieldCheck className="h-2.5 w-2.5" /> {selectedAgent ? selectedAgent.name.toUpperCase() : "PILIH AGEN"}</Button>}
                      {customerType === "UMUM" && (
                        <div className="space-y-1">
                          <Input value={generalName} onChange={e => setGeneralName(e.target.value)} placeholder="Nama..." className="h-6 rounded bg-slate-50 border-none text-[7px] font-bold" />
                          <Input value={generalPhone} onChange={e => setGeneralPhone(e.target.value)} placeholder="No WA..." className="h-6 rounded bg-slate-50 border-none text-[7px] font-bold" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="p-2 bg-primary/5 rounded-lg border border-primary/10 space-y-0.5">
                    {!settlementTrx ? (
                      <>
                        <div className="flex justify-between text-[6px] font-bold text-slate-400"><span>SUBTOTAL</span><span>Rp{subtotalLabel.toLocaleString('id-ID')}</span></div>
                        <div className="flex justify-between text-[6px] font-black text-emerald-600"><span>DISC</span><span>-Rp{totalPotongan.toLocaleString('id-ID')}</span></div>
                      </>
                    ) : (
                      <div className="flex justify-between text-[6px] font-bold text-slate-400"><span>TOTAL ASLI</span><span>Rp{settlementTrx.total?.toLocaleString('id-ID')}</span></div>
                    )}
                    <div className="pt-1 border-t border-dashed mt-1 flex justify-between items-end">
                      <span className="text-[6px] font-black text-slate-400 uppercase">{settlementTrx ? "Bayar Sisa" : "Total"}</span>
                      <p className="text-[10px] font-black text-primary">Rp{(settlementTrx ? settlementTrx.remainingAmount : totalTagihan).toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 w-full">{(["CASH", "TRANSFER", "QRIS"] as const).map(m => (<button key={m} onClick={() => setPaymentMethod(m)} className={cn("flex-1 flex items-center justify-center h-10 rounded-xl border-2 transition-all", paymentMethod === m ? "border-primary bg-primary/5 text-primary shadow-inner" : "border-slate-50 text-slate-300")}>{m === "CASH" ? <Banknote className="h-4 w-4" /> : m === "TRANSFER" ? <CreditCard className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}</button>))}</div>
                  {!settlementTrx && (
                    <div className="space-y-1">
                      <button onClick={() => setIsDPMode(!isDPMode)} className={cn("w-full h-5 rounded text-[6px] font-black tracking-widest", isDPMode ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400")}>{isDPMode ? "DP AKTIF" : "AKTIFKAN DP"}</button>
                      {isDPMode && <Input type="number" value={manualDPInput} onChange={e => setManualDPInput(e.target.value)} placeholder="Nominal DP..." className="h-6 rounded bg-orange-50 border-orange-100 text-[8px] font-black" />}
                    </div>
                  )}
                  <Button className={cn("w-full h-10 rounded-lg font-black text-[9px] tracking-widest shadow-lg", settlementTrx ? "bg-emerald-600" : isDPMode ? "bg-orange-600" : "bg-primary")} disabled={isProcessing || (settlementTrx ? false : cart.length === 0)} onClick={settlementTrx ? handleSettlement : handleStartProcess}>{isProcessing ? <Loader2 className="animate-spin h-3 w-3" /> : settlementTrx ? "LUNASI" : "BAYAR"}</Button>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <aside className="hidden md:flex col-span-1 border-r flex-col p-5 space-y-4 bg-primary/5 overflow-hidden">
          <Card className="flex-1 border-none soft-shadow rounded-[2rem] bg-primary text-white flex flex-col overflow-hidden shadow-2xl shadow-primary/20">
            <div className="p-5 border-b border-white/10 shrink-0">
              {settlementTrx ? (
                <div className="bg-white/10 p-4 rounded-2xl border border-white/20"><div className="flex justify-between items-start"><p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">MODE PELUNASAN AKTIF</p><button onClick={() => setSettlementTrx(null)} className="text-white/40 hover:text-white"><X className="h-4 w-4" /></button></div><p className="text-xs font-bold text-white uppercase">{settlementTrx.id}</p></div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-1 p-1 bg-white/10 rounded-xl border border-white/5">{(["UMUM", "MEMBER", "AGEN"] as const).map(type => (<button key={type} onClick={() => { setCustomerType(type); setSelectedMember(null); setSelectedAgent(null); }} className={cn("flex-1 py-2 text-[9px] font-black rounded-lg transition-all", customerType === type ? "bg-white text-primary shadow-sm" : "text-white/50 hover:text-white")}>{type}</button>))}</div>
                  {customerType === "MEMBER" && <Button variant="outline" className="w-full h-10 rounded-xl text-[10px] font-black gap-2 border-dashed border-2 border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => setShowSelectMember(true)}><UserCheck className="h-4 w-4" /> {selectedMember ? selectedMember.name.toUpperCase() : "PILIH MEMBER"}</Button>}
                  {customerType === "AGEN" && <Button variant="outline" className="w-full h-10 rounded-xl text-[10px] font-black gap-2 border-dashed border-2 border-white/20 bg-white/5 text-white hover:bg-white/10" onClick={() => setShowSelectAgent(true)}><ShieldCheck className="h-4 w-4" /> {selectedAgent ? `${selectedAgent.name.toUpperCase()} (-${selectedAgent.discount}%)` : "PILIH AGEN"}</Button>}
                </div>
              )}
            </div>
            <ScrollArea className="flex-1 px-5 py-2"><CartContentItems /></ScrollArea>
            <div className="p-5 border-t border-dashed border-white/20 shrink-0 space-y-4 bg-black/5">
              {!settlementTrx && (<div className="space-y-3">
                <button onClick={() => setIsDPMode(!isDPMode)} className={cn("w-full h-10 rounded-2xl text-[9px] font-black tracking-widest transition-all", isDPMode ? "bg-orange-500 text-white border-none shadow-lg shadow-orange-500/20" : "bg-white/5 text-white border-2 border-white/10 hover:bg-white/10")}>{isDPMode ? "MODE DP AKTIF" : "AKTIFKAN MODE DP"}</button>
                <div className="relative group"><Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" /><Input placeholder="KODE VOUCHER" className="h-10 pl-9 pr-20 bg-white/10 border-white/10 text-[9px] font-black text-white placeholder:text-white/30 uppercase rounded-xl" value={voucherInput} onChange={e => setVoucherCode(e.target.value)} /><button onClick={handleApplyVoucher} disabled={isValidatingVoucher || !voucherInput} className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-3 bg-white text-primary rounded-lg text-[8px] font-black uppercase hover:bg-emerald-50 disabled:opacity-50">{isValidatingVoucher ? "..." : "CEK"}</button></div>
                {appliedVoucher && <div className="bg-emerald-500/20 p-2 rounded-lg flex justify-between items-center border border-emerald-500/30"><span className="text-[8px] font-black text-emerald-300">VOUCHER: {appliedVoucher.code}</span><button onClick={() => { setAppliedVoucher(null); setVoucherCode(""); }} className="text-white/50 hover:text-white"><X className="h-3 w-3" /></button></div>}
              </div>)}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[10px] font-bold text-white/50"><span>Subtotal</span><span>Rp{(settlementTrx ? settlementTrx.subtotalLabel : subtotalLabel).toLocaleString('id-ID')}</span></div>
                {!settlementTrx && (<div className="flex justify-between text-[10px] font-black text-white pt-1 border-t border-white/5 mt-1"><span>Total Potongan</span><span className="text-emerald-300">-Rp{totalPotongan.toLocaleString('id-ID')}</span></div>)}
                <div className="flex justify-between items-end pt-3 border-t border-dashed border-white/20 mt-2"><span className="text-[10px] font-black text-white/40 uppercase">Tagihan</span><p className="text-2xl font-black text-white tracking-tighter">Rp{(settlementTrx ? settlementTrx.total : totalTagihan).toLocaleString('id-ID')}</p></div>
              </div>
            </div>
          </Card>
        </aside>

        <aside className="hidden md:flex col-span-1 bg-white flex-col h-full overflow-hidden shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)]">
          <div className="p-6 shrink-0 flex items-center gap-2 border-b-2 border-primary/10"><CreditCard className="h-5 w-5 text-primary" /><span className="text-[11px] font-black uppercase tracking-widest text-slate-800">Pembayaran</span></div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {settlementTrx ? (
              <div className="space-y-6">
                <Card className="p-5 border-none bg-orange-50 rounded-3xl space-y-4"><div><p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">CUSTOMER</p><p className="text-sm font-black text-slate-800 uppercase">{settlementTrx.customerName}</p></div><div className="pt-4 border-t border-orange-200 border-dashed space-y-2"><div className="flex justify-between"><span className="text-[10px] font-bold text-slate-500">SUDAH DIBAYAR</span><span className="text-xs font-black">Rp{settlementTrx.paidAmount?.toLocaleString('id-ID')}</span></div><div className="flex justify-between bg-orange-100 p-2 rounded-xl"><span className="text-[10px] font-black text-orange-700">SISA PELUNASAN</span><span className="text-sm font-black text-orange-700">Rp{settlementTrx.remainingAmount?.toLocaleString('id-ID')}</span></div></div></Card>
                <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Metode Pelunasan</Label><div className="grid gap-2">{(["CASH", "TRANSFER", "QRIS"] as const).map(m => (<button key={m} onClick={() => setPaymentMethod(m)} className={cn("flex items-center h-14 px-4 gap-4 rounded-xl border-2 transition-all", paymentMethod === m ? "border-primary bg-primary/5 text-primary shadow-inner" : "border-slate-50 text-slate-400 hover:bg-slate-50")}>{m === "CASH" ? <Banknote className="h-5 w-5" /> : m === "TRANSFER" ? <CreditCard className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}<span className="text-[11px] font-black">{m}</span>{paymentMethod === m && <CheckCircle2 className="h-4 w-4 ml-auto" />}</button>))}</div></div>
              </div>
            ) : (
              <>
                {customerType === "UMUM" && (<div className="space-y-4"><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nama (Opsional)</Label><Input value={generalName} onChange={e => setGeneralName(e.target.value)} placeholder="Nama..." className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">No. WA (Opsional)</Label><Input value={generalPhone} onChange={e => setGeneralPhone(e.target.value)} placeholder="08..." className="h-12 rounded-xl bg-slate-50 border-none font-bold" /></div></div>)}
                <div className="space-y-3"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Metode Bayar</Label><div className="grid gap-2">{(["CASH", "TRANSFER", "QRIS"] as const).map(m => (<button key={m} onClick={() => setPaymentMethod(m)} className={cn("flex items-center h-14 px-4 gap-4 rounded-xl border-2 transition-all", paymentMethod === m ? "border-primary bg-primary/5 text-primary shadow-inner" : "border-slate-50 text-slate-300")}>{m === "CASH" ? <Banknote className="h-5 w-5" /> : m === "TRANSFER" ? <CreditCard className="h-5 w-5" /> : <QrCode className="h-5 w-5" />}<span className="text-[11px] font-black">{m}</span>{paymentMethod === m && <CheckCircle2 className="h-4 w-4 ml-auto" />}</button>))}</div></div>
                {isDPMode && (<div className="p-4 bg-orange-50 rounded-2xl border-2 border-orange-100 space-y-3"><Label className="text-[10px] font-black uppercase text-orange-600">Nominal DP</Label><Input type="number" value={manualDPInput} onChange={e => setManualDPInput(e.target.value)} placeholder="0" className="h-12 rounded-xl bg-white border-none font-black text-orange-700 shadow-sm" /></div>)}
              </>
            )}
          </div>
          <div className="p-6 shrink-0 border-t bg-slate-50/50">
            {!isSuccess ? (
              <Button className={cn("w-full h-20 rounded-[2.5rem] font-black text-sm tracking-widest shadow-2xl transition-all", settlementTrx ? "bg-emerald-600 hover:bg-emerald-700" : isDPMode ? "bg-orange-600 hover:bg-orange-700" : "bg-primary hover:bg-[#125241]")} disabled={isProcessing || (settlementTrx ? false : cart.length === 0)} onClick={settlementTrx ? handleSettlement : handleStartProcess}>{isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : settlementTrx ? "KONFIRMASI PELUNASAN" : (isDPMode ? "SIMPAN PESANAN DP" : "BAYAR SEKARANG")}</Button>
            ) : (
              <div className="space-y-4 animate-in zoom-in duration-300"><div className="bg-emerald-50 p-6 rounded-[2.5rem] flex flex-col items-center gap-2 border-2 border-emerald-100 text-center"><CheckCircle2 className="h-8 w-8 text-emerald-500" /><p className="text-[11px] font-black text-emerald-700 uppercase">TRANSAKSI SELESAI</p></div><div className="grid grid-cols-2 gap-3"><Button variant="outline" className="h-12 rounded-xl font-black text-[10px] gap-2 border-primary text-primary" onClick={() => window.open(`/cashier/print?id=${lastTrxId}&store=${storeId}`, '_blank')}><Printer className="h-4 w-4" /> STRUK</Button><Button variant="outline" className="h-12 rounded-xl font-black text-[10px] gap-2 border-primary text-primary" onClick={() => window.open(`/cashier/print?id=${lastTrxId}&store=${storeId}&mode=download`, '_blank')}><Download className="h-4 w-4" /> PDF</Button></div><Button variant="outline" className="w-full h-12 rounded-xl font-black text-[10px] gap-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10" onClick={() => handleWhatsAppReceipt(lastTrxData)}><MessageSquare className="h-4 w-4" /> KIRIM STRUK VIA WHATSAPP</Button><Button className="w-full h-14 rounded-xl font-black text-[11px] bg-slate-800" onClick={handleNewTransaction}>TRANSAKSI BARU</Button></div>
            )}
          </div>
        </aside>
      </div>

      <Sheet open={showHistory} onOpenChange={setShowHistory}>
        <SheetContent side={isMobile ? "bottom" : "left"} className={cn("p-0 border-none shadow-2xl bg-white", isMobile ? "h-[90vh] rounded-t-[2.5rem]" : "w-[450px]")}>
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 border-b bg-slate-50/50 flex flex-row items-center justify-between"><SheetTitle className="font-black uppercase text-xs tracking-widest flex items-center gap-3"><History className="h-5 w-5 text-primary" /> Riwayat</SheetTitle>{isMobile && <button onClick={() => setShowHistory(false)} className="bg-slate-200 p-2 rounded-full"><X className="h-4 w-4" /></button>}</SheetHeader>
            <div className="p-6 border-b space-y-2"><Label className="text-[10px] font-black text-slate-400">Filter Tanggal</Label><Input type="date" value={historyDate} onChange={e => setHistoryDate(e.target.value)} className="h-12 rounded-2xl bg-slate-50 font-bold border-none shadow-inner" /></div>
            <ScrollArea className="flex-1 p-6">
              <div className="space-y-4 pb-10">
                {history?.map(trx => (
                  <Card key={trx.id} className="p-5 rounded-[1.5rem] soft-shadow border-none hover:bg-primary/5 transition-all group"><div className="flex justify-between mb-2"><p className="text-[10px] font-black text-primary">{trx.id}</p><Badge className={cn("text-[8px] font-black border-none rounded-lg", trx.status === 'DP' ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700")}>{trx.status}</Badge></div><p className="text-sm font-black uppercase text-slate-800">{trx.customerName}</p><p className="text-[9px] text-muted-foreground font-bold">{trx.date?.toDate().toLocaleString('id-ID')}</p><div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-slate-200"><p className="text-sm font-black text-primary">Rp{trx.total?.toLocaleString('id-ID')}</p><div className="flex gap-2"><Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={() => window.open(`/cashier/print?id=${trx.id}&store=${storeId}`, '_blank')}><Printer className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl" onClick={() => window.open(`/cashier/print?id=${trx.id}&store=${storeId}&mode=download`, '_blank')}><Download className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-9 w-9 text-[#25D366] hover:bg-[#25D366]/10 rounded-xl" onClick={() => handleWhatsAppReceipt(trx)}><MessageSquare className="h-4 w-4" /></Button>{trx.status === 'DP' && <Button size="sm" className="h-9 bg-orange-600 text-[9px] font-black px-4 rounded-xl shadow-lg shadow-orange-600/20" onClick={() => { setSettlementTrx(trx); setShowHistory(false); }}>LUNASI</Button>}</div></div></Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md rounded-[2rem] p-6"><DialogHeader><DialogTitle className="text-lg font-black uppercase flex items-center gap-3"><User className="h-6 w-6 text-primary" /> Pengaturan Kasir</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-2"><Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Nama Kasir (Tampil di Struk)</Label><Input value={cashierName} onChange={e => setCashierName(e.target.value)} placeholder="Nama Anda..." className="h-14 rounded-2xl bg-slate-50 border-none font-bold text-lg" /></div></div><DialogFooter><Button onClick={handleSaveSettings} className="w-full h-14 rounded-2xl font-black uppercase shadow-xl shadow-primary/20">Simpan Pengaturan</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent className="max-w-md rounded-[2rem] p-6"><DialogHeader><DialogTitle className="text-lg font-black uppercase">Daftarkan Member Baru</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase">Nama Lengkap</Label><Input value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} placeholder="Nama..." className="h-12 rounded-2xl bg-slate-50 border-none font-bold" /></div><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase">Nomor WhatsApp</Label><Input value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})} placeholder="08..." className="h-12 rounded-2xl bg-slate-50 border-none font-bold" /></div><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase">Alamat</Label><Input value={newMember.address} onChange={e => setNewMember({...newMember, address: e.target.value})} placeholder="Alamat lengkap..." className="h-12 rounded-2xl bg-slate-50 border-none font-bold" /></div><div className="p-3 bg-muted/30 rounded-xl"><p className="text-[9px] text-muted-foreground italic">Diskon member akan mengikuti kebijakan diskon global yang diatur oleh Admin.</p></div></div><DialogFooter><Button onClick={handleAddMember} className="w-full h-14 rounded-2xl font-black uppercase">Simpan Data Member</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={showAddAgent} onOpenChange={setShowAddAgent}>
        <DialogContent className="max-w-md rounded-[2rem] p-6"><DialogHeader><DialogTitle className="text-lg font-black uppercase">Daftarkan Agen Baru</DialogTitle></DialogHeader><div className="space-y-4 py-4"><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase">ID Agen</Label><Input value={newAgent.id} onChange={e => setNewAgent({...newAgent, id: e.target.value})} placeholder="AG-001" className="h-12 rounded-2xl bg-slate-50 border-none font-bold" /></div><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase">Nama Agen</Label><Input value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} placeholder="Nama..." className="h-12 rounded-2xl bg-slate-50 border-none font-bold" /></div><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase">Nomor WhatsApp</Label><Input value={newAgent.phone} onChange={e => setNewAgent({...newAgent, phone: e.target.value})} placeholder="08..." className="h-12 rounded-2xl bg-slate-50 border-none font-bold" /></div><div className="space-y-1.5"><Label className="text-[10px] font-black uppercase">Potongan (%)</Label><Input type="number" value={newAgent.discount} onChange={e => setNewAgent({...newAgent, discount: e.target.value})} placeholder="0" className="h-12 rounded-2xl bg-slate-50 border-none font-bold" /></div></div><DialogFooter><Button onClick={handleAddAgent} className="w-full h-14 rounded-2xl font-black uppercase">Simpan Data Agen</Button></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={showSelectMember} onOpenChange={setShowSelectMember}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden"><DialogHeader className="p-6 bg-slate-50 border-b"><DialogTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Pilih Member Terdaftar</DialogTitle></DialogHeader><ScrollArea className="h-[400px] p-4">{members.map(m => (<div key={m.id} onClick={() => { setSelectedMember(m); setShowSelectMember(false); }} className="p-4 rounded-2xl border-2 border-slate-50 mb-3 cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all flex justify-between items-center group"><div><p className="font-black text-sm uppercase text-slate-800 group-hover:text-primary">{m.name}</p><p className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">WA: {m.phone}</p></div><Badge className="bg-emerald-50 text-emerald-700 font-black border-none rounded-lg px-3">-{m.discount}%</Badge></div>))}</ScrollArea></DialogContent>
      </Dialog>

      <Dialog open={showSelectAgent} onOpenChange={setShowSelectAgent}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden"><DialogHeader className="p-6 bg-slate-50 border-b"><DialogTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Pilih Agen Terdaftar</DialogTitle></DialogHeader><ScrollArea className="h-[400px] p-4">{agents.map(a => (<div key={a.id} onClick={() => { setSelectedAgent(a); setShowSelectAgent(false); }} className="p-4 rounded-2xl border-2 border-slate-50 mb-3 cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all flex justify-between items-center group"><div><p className="font-black text-sm uppercase text-slate-800 group-hover:text-primary">{a.name}</p><p className="text-[10px] text-slate-400 font-bold tracking-tight uppercase">ID: {a.id}</p></div><Badge className="bg-primary text-white font-black border-none rounded-lg px-3">-{a.discount}%</Badge></div>))}</ScrollArea></DialogContent>
      </Dialog>

      {/* CASH PAYMENT DIALOG */}
      <Dialog open={isCashDialogOpen} onOpenChange={setIsCashDialogOpen}>
        <DialogContent className="max-w-md rounded-[2rem] p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-6 bg-primary text-white shrink-0 text-center">
            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <DialogTitle className="text-xl font-black uppercase">Pembayaran Tunai</DialogTitle>
            <DialogDescription className="text-white/70 text-[10px] font-bold uppercase tracking-widest">Hitung kembalian pelanggan</DialogDescription>
          </DialogHeader>
          <div className="p-8 space-y-6 bg-slate-50/50">
            <div className="space-y-1">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Total Tagihan</Label>
              <p className="text-3xl font-black text-primary">Rp{totalTagihan.toLocaleString('id-ID')}</p>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Uang Diterima</Label>
              <Input 
                type="number" 
                value={receivedCash} 
                onChange={e => setReceivedCash(e.target.value)} 
                className="h-16 rounded-2xl bg-white border-2 border-primary/10 focus-visible:border-primary font-black text-2xl text-primary px-6"
                placeholder="0"
                autoFocus
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {[10000, 20000, 50000, 100000].map(val => (
                  <button 
                    key={val} 
                    onClick={() => setReceivedCash(val.toString())}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-black hover:bg-primary/5 hover:border-primary/20 transition-all"
                  >
                    +Rp{val.toLocaleString('id-ID')}
                  </button>
                ))}
                <button 
                  onClick={() => setReceivedCash(totalTagihan.toString())}
                  className="px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-[10px] font-black text-primary"
                >
                  UANG PAS
                </button>
              </div>
            </div>

            <div className="p-5 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex justify-between items-center">
              <span className="text-[10px] font-black text-emerald-600 uppercase">Kembalian</span>
              <span className="text-2xl font-black text-emerald-700">
                Rp{Math.max(0, (parseFloat(receivedCash) || 0) - totalTagihan).toLocaleString('id-ID')}
              </span>
            </div>
          </div>
          <DialogFooter className="p-6 bg-white border-t">
            <Button 
              className="w-full h-16 rounded-2xl font-black text-lg shadow-xl shadow-primary/20"
              disabled={isProcessing || (parseFloat(receivedCash) || 0) < totalTagihan}
              onClick={() => handleProcessTransaction({
                received: parseFloat(receivedCash) || 0,
                change: Math.max(0, (parseFloat(receivedCash) || 0) - totalTagihan)
              })}
            >
              {isProcessing ? <Loader2 className="animate-spin h-6 w-6" /> : "PROSES & CETAK STRUK"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
