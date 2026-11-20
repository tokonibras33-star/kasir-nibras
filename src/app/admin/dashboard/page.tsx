"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  AlertTriangle, 
  ShoppingBag,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  QrCode,
  Users,
  Package,
  ArrowDownToLine,
  BarChart3,
  Calculator,
  Banknote,
  ShieldCheck
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, where, Timestamp } from "firebase/firestore";
import { format, startOfToday, endOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STORES = [
  { id: "TOKO_A", name: "NHS KWT", color: "#C82368" },
  { id: "TOKO_B", name: "IND CO", color: "#171717" },
  { id: "TOKO_C", name: "NHS GDM", color: "#D97706" },
];

const COLORS = ['#C82368', '#171717', '#D97706', '#525252'];

export default function EnhancedAdminDashboard() {
  const db = useFirestore();
  const { user: authUser } = useUser();
  
  // 1. Global States
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [dateMode, setDateMode] = useState<"today" | "weekly" | "monthly" | "custom">("today");
  const [customRange, setCustomRange] = useState({ 
    start: format(new Date(), "yyyy-MM-dd"), 
    end: format(new Date(), "yyyy-MM-dd") 
  });

  // 2. Date Range Logic
  const dateInterval = useMemo(() => {
    let start = startOfToday();
    let end = endOfToday();

    if (dateMode === "weekly") {
      start = startOfWeek(new Date(), { weekStartsOn: 1 });
      end = endOfWeek(new Date(), { weekStartsOn: 1 });
    } else if (dateMode === "monthly") {
      start = startOfMonth(new Date());
      end = endOfMonth(new Date());
    } else if (dateMode === "custom") {
      start = new Date(customRange.start);
      start.setHours(0, 0, 0, 0);
      end = new Date(customRange.end);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }, [dateMode, customRange]);

  // Previous period for trend comparison
  const prevInterval = useMemo(() => {
    const diff = dateInterval.end.getTime() - dateInterval.start.getTime();
    const start = new Date(dateInterval.start.getTime() - diff - 1000);
    const end = new Date(dateInterval.start.getTime() - 1000);
    return { start, end };
  }, [dateInterval]);

  // 3. Data Fetching (Properly Memoized and Auth-Guarded)
  const qA = useMemoFirebase(() => {
    if (!authUser) return null;
    return query(
      collection(db, "stores", "TOKO_A", "transactions"),
      where("date", ">=", Timestamp.fromDate(prevInterval.start)),
      where("date", "<=", Timestamp.fromDate(dateInterval.end))
    );
  }, [db, dateInterval, prevInterval, authUser]);

  const qB = useMemoFirebase(() => {
    if (!authUser) return null;
    return query(
      collection(db, "stores", "TOKO_B", "transactions"),
      where("date", ">=", Timestamp.fromDate(prevInterval.start)),
      where("date", "<=", Timestamp.fromDate(dateInterval.end))
    );
  }, [db, dateInterval, prevInterval, authUser]);

  const qC = useMemoFirebase(() => {
    if (!authUser) return null;
    return query(
      collection(db, "stores", "TOKO_C", "transactions"),
      where("date", ">=", Timestamp.fromDate(prevInterval.start)),
      where("date", "<=", Timestamp.fromDate(dateInterval.end))
    );
  }, [db, dateInterval, prevInterval, authUser]);

  const { data: trxA } = useCollection<any>(qA);
  const { data: trxB } = useCollection<any>(qB);
  const { data: trxC } = useCollection<any>(qC);

  // Operational Data
  const logsAQuery = useMemoFirebase(() => {
    if (!authUser) return null;
    return collection(db, "stores", "TOKO_A", "cashLogs");
  }, [db, authUser]);

  const logsBQuery = useMemoFirebase(() => {
    if (!authUser) return null;
    return collection(db, "stores", "TOKO_B", "cashLogs");
  }, [db, authUser]);

  const logsCQuery = useMemoFirebase(() => {
    if (!authUser) return null;
    return collection(db, "stores", "TOKO_C", "cashLogs");
  }, [db, authUser]);

  const ownerLogsQuery = useMemoFirebase(() => {
    if (!authUser) return null;
    return collection(db, "ownerExpenses");
  }, [db, authUser]);

  const { data: logsA } = useCollection<any>(logsAQuery);
  const { data: logsB } = useCollection<any>(logsBQuery);
  const { data: logsC } = useCollection<any>(logsCQuery);
  const { data: logsOwner } = useCollection<any>(ownerLogsQuery);

  // Stock Data
  const stockAQuery = useMemoFirebase(() => {
    if (!authUser) return null;
    return collection(db, "stores", "TOKO_A", "stock");
  }, [db, authUser]);

  const stockBQuery = useMemoFirebase(() => {
    if (!authUser) return null;
    return collection(db, "stores", "TOKO_B", "stock");
  }, [db, authUser]);

  const stockCQuery = useMemoFirebase(() => {
    if (!authUser) return null;
    return collection(db, "stores", "TOKO_C", "stock");
  }, [db, authUser]);

  const stockEntriesQuery = useMemoFirebase(() => {
    if (!authUser) return null;
    return collection(db, "stockEntries");
  }, [db, authUser]);

  const { data: stockA } = useCollection<any>(stockAQuery);
  const { data: stockB } = useCollection<any>(stockBQuery);
  const { data: stockC } = useCollection<any>(stockCQuery);
  const { data: stockEntries } = useCollection<any>(stockEntriesQuery);

  // 4. Aggregations
  const stats = useMemo(() => {
    const combineTrx = (list: any[], storeId: string) => 
      (list || []).map(t => ({ ...t, storeId, timestamp: t.date?.toDate?.()?.getTime() }));

    const allTrx = [
      ...combineTrx(trxA || [], "TOKO_A"),
      ...combineTrx(trxB || [], "TOKO_B"),
      ...combineTrx(trxC || [], "TOKO_C"),
    ];

    const currentTrx = allTrx.filter(t => 
      t.timestamp >= dateInterval.start.getTime() && 
      t.timestamp <= dateInterval.end.getTime() &&
      (storeFilter === "ALL" || t.storeId === storeFilter)
    );

    const pastTrx = allTrx.filter(t => 
      t.timestamp >= prevInterval.start.getTime() && 
      t.timestamp <= prevInterval.end.getTime() &&
      (storeFilter === "ALL" || t.storeId === storeFilter)
    );

    // Sales
    const sales = currentTrx.reduce((sum, t) => sum + (t.total || 0), 0);
    const pastSales = pastTrx.reduce((sum, t) => sum + (t.total || 0), 0);
    const salesTrend = pastSales > 0 ? ((sales - pastSales) / pastSales) * 100 : 0;

    const count = currentTrx.length;
    const pastCount = pastTrx.length;
    const countTrend = pastCount > 0 ? ((count - pastCount) / pastCount) * 100 : 0;

    // Operational Calculation
    const getOps = (logs: any[], interval: { start: Date, end: Date }) => {
      let total = 0;
      logs?.forEach(log => {
        const logDate = new Date(log.id);
        if (isWithinInterval(logDate, { start: interval.start, end: interval.end })) {
          if (log.pengeluaran) log.pengeluaran.forEach((e: any) => total += e.amount);
          if (log.expenses) log.expenses.forEach((e: any) => total += e.amount); // Owner logs
        }
      });
      return total;
    };

    let currentOps = 0;
    let pastOps = 0;

    if (storeFilter === "ALL" || storeFilter === "TOKO_A") {
      currentOps += getOps(logsA || [], dateInterval);
      pastOps += getOps(logsA || [], prevInterval);
    }
    if (storeFilter === "ALL" || storeFilter === "TOKO_B") {
      currentOps += getOps(logsB || [], dateInterval);
      pastOps += getOps(logsB || [], prevInterval);
    }
    if (storeFilter === "ALL" || storeFilter === "TOKO_C") {
      currentOps += getOps(logsC || [], dateInterval);
      pastOps += getOps(logsC || [], prevInterval);
    }
    if (storeFilter === "ALL") {
      currentOps += getOps(logsOwner || [], dateInterval);
      pastOps += getOps(logsOwner || [], prevInterval);
    }

    const opsTrend = pastOps > 0 ? ((currentOps - pastOps) / pastOps) * 100 : 0;

    const margin = sales - currentOps;
    const pastMargin = pastSales - pastOps;
    const marginTrend = pastMargin !== 0 ? ((margin - pastMargin) / Math.abs(pastMargin)) * 100 : 0;

    // Payment Methods
    const payments = { cash: 0, transfer: 0, qris: 0 };
    currentTrx.forEach(t => {
      if (t.paymentBreakdown) {
        payments.cash += t.paymentBreakdown.cash || 0;
        if (t.paymentBreakdown.otherMethod === "TRANSFER") payments.transfer += t.paymentBreakdown.other || 0;
        if (t.paymentBreakdown.otherMethod === "QRIS") payments.qris += t.paymentBreakdown.other || 0;
      } else {
        const method = (t.paymentMethod || "CASH").toUpperCase();
        if (method === "CASH") payments.cash += t.paidAmount || 0;
        else if (method === "TRANSFER") payments.transfer += t.paidAmount || 0;
        else if (method === "QRIS") payments.qris += t.paidAmount || 0;
      }
    });

    // Customer Types
    const custTypes = { UMUM: 0, MEMBER: 0, AGEN: 0, ONLINE: 0 };
    currentTrx.forEach(t => {
      const type = (t.customerType || "UMUM").toUpperCase() as keyof typeof custTypes;
      if (custTypes[type] !== undefined) custTypes[type] += (t.total || 0);
    });

    return {
      sales, salesTrend,
      count, countTrend,
      ops: currentOps, opsTrend,
      margin, marginTrend,
      payments,
      custTypes,
      allTrx
    };
  }, [trxA, trxB, trxC, logsA, logsB, logsC, logsOwner, storeFilter, dateInterval, prevInterval]);

  // 5. Chart Data
  const chartData = useMemo(() => {
    const storesMap: Record<string, number> = { "NHS KWT": 0, "IND CO": 0, "NHS GDM": 0 };
    const dateMap: Record<string, any> = {};

    const filtered = stats.allTrx.filter(t => 
      t.timestamp >= dateInterval.start.getTime() && 
      t.timestamp <= dateInterval.end.getTime()
    );

    filtered.forEach(t => {
      const storeName = STORES.find(s => s.id === t.storeId)?.name || "Lainnya";
      if (storesMap[storeName] !== undefined) storesMap[storeName] += (t.total || 0);

      const d = format(new Date(t.timestamp), "dd/MM");
      if (!dateMap[d]) dateMap[d] = { name: d, total: 0 };
      dateMap[d].total += (t.total || 0);
    });

    return {
      byStore: Object.entries(storesMap).map(([name, sales]) => ({ name, sales })),
      byDate: Object.values(dateMap).sort((a: any, b: any) => a.name.localeCompare(b.name))
    };
  }, [stats.allTrx, dateInterval]);

  // 6. Stock Status Logic
  const stockSummary = useMemo(() => {
    if (storeFilter === "ALL") {
      const countA = (stockA || []).reduce((s, p) => s + (p.variants?.reduce((vAcc: number, i: any) => vAcc + (i.stock || 0), 0) || 0), 0);
      const countB = (stockB || []).reduce((s, p) => s + (p.variants?.reduce((vAcc: number, i: any) => vAcc + (i.stock || 0), 0) || 0), 0);
      const countC = (stockC || []).reduce((s, p) => s + (p.variants?.reduce((vAcc: number, i: any) => vAcc + (i.stock || 0), 0) || 0), 0);
      return [
        { name: "NHS KWT", qty: countA, color: "#C82368" },
        { name: "IND CO", qty: countB, color: "#171717" },
        { name: "NHS GDM", qty: countC, color: "#D97706" }
      ];
    } else {
      const selected = storeFilter === "TOKO_A" ? stockA : storeFilter === "TOKO_B" ? stockB : stockC;
      const lowStock: any[] = [];
      selected?.forEach(p => {
        p.variants?.forEach((v: any) => {
          if (v.stock <= 5 && v.stock > 0) lowStock.push({ name: p.name, color: v.color, size: v.size, stock: v.stock });
        });
      });
      return lowStock.slice(0, 8);
    }
  }, [storeFilter, stockA, stockB, stockC]);

  // 7. Monthly Finance Comparison
  const monthlyFinance = useMemo(() => {
    const monthId = format(dateInterval.start, "yyyy-MM");
    const summary = { purchase: 0, sales: stats.sales, ops: stats.ops, margin: 0 };
    
    stockEntries?.forEach(entry => {
      if (entry.invoiceDate?.startsWith(monthId)) {
        entry.items?.forEach((item: any) => {
          if (storeFilter === "ALL" || item.targetStore === storeFilter) {
            summary.purchase += (item.buyPrice || 0) * (item.stock || 0);
          }
        });
      }
    });

    summary.margin = summary.sales - summary.purchase - summary.ops;
    return summary;
  }, [dateInterval, stockEntries, stats, storeFilter]);

  return (
    <div className="space-y-6 md:space-y-8 pb-20">
      {/* GLOBAL FILTER HEADER - STICKY */}
      <div className="sticky top-16 md:top-0 z-30 bg-[#F5F3F0]/90 backdrop-blur-xl border-b border-neutral-200/70 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-4 space-y-4">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-neutral-950 tracking-tight">Dashboard Manajemen</h1>
            <p className="text-[10px] text-[#C82368] font-bold uppercase tracking-[0.2em] mt-0.5">Real-time Analytics • Konsolidasi Cabang</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
            {/* Store Filter */}
            <div className="flex bg-white p-1 rounded-full w-full sm:w-auto border border-neutral-200/80 shadow-sm overflow-x-auto">
              {[{ id: "ALL", name: "SEMUA" }, ...STORES].map(s => (
                <button 
                  key={s.id} 
                  onClick={() => setStoreFilter(s.id)}
                  className={cn(
                    "flex-1 sm:flex-none px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all whitespace-nowrap",
                    storeFilter === s.id ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-950"
                  )}
                >
                  {s.name.replace('NHS ', '')}
                </button>
              ))}
            </div>

            {/* Date Filter */}
            <div className="flex bg-white p-1 rounded-full w-full sm:w-auto border border-neutral-200/80 shadow-sm overflow-x-auto">
              {[
                { id: "today", name: "HARI INI" },
                { id: "weekly", name: "MINGGU" },
                { id: "monthly", name: "BULAN" },
                { id: "custom", name: "KUSTOM" }
              ].map(d => (
                <button 
                  key={d.id} 
                  onClick={() => setDateMode(d.id as any)}
                  className={cn(
                    "flex-1 sm:flex-none px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all whitespace-nowrap",
                    dateMode === d.id ? "bg-[#C82368] text-white shadow-sm" : "text-neutral-500 hover:text-neutral-950"
                  )}
                >
                  {d.name}
                </button>
              ))}
            </div>

            {dateMode === "custom" && (
              <div className="flex items-center gap-2 w-full sm:w-auto animate-in slide-in-from-right duration-300">
                <Input type="date" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} className="h-9 text-xs font-bold rounded-full bg-white border-neutral-200 shadow-sm flex-1" />
                <span className="text-neutral-400">-</span>
                <Input type="date" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} className="h-9 text-xs font-bold rounded-full bg-white border-neutral-200 shadow-sm flex-1" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 1: MAIN KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Total Penjualan" value={stats.sales} trend={stats.salesTrend} icon={DollarSign} color="obsidian" />
        <KPICard title="Total Transaksi" value={stats.count} trend={stats.countTrend} icon={ShoppingBag} color="light" isCurrency={false} />
        <KPICard title="Biaya Operasional" value={stats.ops} trend={stats.opsTrend} icon={ArrowDownToLine} color="light" />
        <KPICard title="Margin (Profit)" value={stats.margin} trend={stats.marginTrend} icon={TrendingUp} color="berry" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ROW 2: PAYMENT METHODS */}
        <Card className="rounded-3xl border border-neutral-200/70 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-[#F5F3F0]/60 px-6 py-4 border-b border-neutral-200/60 flex flex-row items-center justify-between">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-[#C82368]" /> Metode Pembayaran
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <PaymentStat label="CASH" value={stats.payments.cash} total={stats.sales} icon={Banknote} color="emerald" />
              <PaymentStat label="TRANSFER" value={stats.payments.transfer} total={stats.sales} icon={CreditCard} color="obsidian" />
              <PaymentStat label="QRIS" value={stats.payments.qris} total={stats.sales} icon={QrCode} color="berry" />
            </div>
            <div className="h-3 w-full bg-[#F5F3F0] rounded-full overflow-hidden flex shadow-inner">
              <div style={{ width: `${(stats.payments.cash/stats.sales)*100 || 0}%` }} className="bg-emerald-600 h-full" />
              <div style={{ width: `${(stats.payments.transfer/stats.sales)*100 || 0}%` }} className="bg-neutral-950 h-full" />
              <div style={{ width: `${(stats.payments.qris/stats.sales)*100 || 0}%` }} className="bg-[#C82368] h-full" />
            </div>
          </CardContent>
        </Card>

        {/* ROW 3: CUSTOMER TYPES */}
        <Card className="rounded-3xl border border-neutral-200/70 shadow-sm bg-white overflow-hidden">
          <CardHeader className="bg-[#F5F3F0]/60 px-6 py-4 border-b border-neutral-200/60">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
              <Users className="h-4 w-4 text-[#C82368]" /> Jenis Transaksi (Customer)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(stats.custTypes).map(([type, total]) => (
                <div key={type} className="p-4 rounded-2xl bg-[#F5F3F0]/70 border border-neutral-200/60 text-center">
                  <p className="text-[9px] font-bold text-neutral-500 uppercase tracking-wider mb-1">{type}</p>
                  <p className="text-sm font-serif font-bold text-neutral-950">Rp {total.toLocaleString('id-ID')}</p>
                  <p className="text-[9px] font-bold text-[#C82368] mt-1">{((total / (stats.sales || 1)) * 100).toFixed(1)}%</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: SALES TREND & COMPARISON */}
      <Card className="rounded-3xl border border-neutral-200/70 shadow-sm bg-white overflow-hidden">
        <CardHeader className="p-6 sm:p-8 pb-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-xl font-serif font-bold flex items-center gap-2 tracking-tight text-neutral-950">
                <BarChart3 className="h-5 w-5 text-[#C82368]" /> Analisis Penjualan & Tren
              </CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-widest mt-1 text-neutral-500">Performa Transaksi pada periode terpilih</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-[300px] sm:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.byDate}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C82368" stopOpacity={0.28}/>
                      <stop offset="95%" stopColor="#C82368" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} tickFormatter={(v) => `Rp${v/1000}k`} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e5e5e5', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)' }}
                    formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}`, "Penjualan"]}
                  />
                  <Area type="monotone" dataKey="total" stroke="#C82368" strokeWidth={3.5} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="h-[280px] sm:h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.byStore} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold'}} />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '16px', border: '1px solid #e5e5e5', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)' }}
                  />
                  <Bar dataKey="sales" radius={[0, 12, 12, 0]} barSize={30}>
                    {chartData.byStore.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STORES.find(s => s.name === entry.name)?.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROW 5: DYNAMIC STOCK STATUS */}
      <Card className="rounded-3xl border border-neutral-200/70 shadow-sm bg-white overflow-hidden">
        <CardHeader className="bg-[#F5F3F0]/60 px-6 py-4 border-b border-neutral-200/60">
          <CardTitle className="text-xs font-bold uppercase tracking-widest text-neutral-950 flex items-center gap-2">
            <Package className="h-4 w-4 text-[#C82368]" /> Status Inventaris ({storeFilter === "ALL" ? "Global" : "Toko"})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {storeFilter === "ALL" ? (
              stockSummary.map((s: any) => (
                <div key={s.name} className="p-5 rounded-2xl bg-[#F5F3F0]/60 border border-neutral-200/70 text-center">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest mb-2">{s.name}</p>
                  <p className="text-3xl font-serif font-bold" style={{ color: s.color }}>{s.qty}</p>
                  <p className="text-[9px] font-bold text-neutral-400 uppercase mt-1 tracking-wider">UNIT AKTIF</p>
                </div>
              ))
            ) : (
              stockSummary.map((i: any, idx: number) => (
                <div key={idx} className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200/70 shadow-sm">
                  <p className="text-[10px] font-bold text-rose-800 uppercase line-clamp-1">{i.name}</p>
                  <p className="text-[9px] font-bold text-rose-500 mt-0.5">{i.color} / {i.size}</p>
                  <div className="mt-2.5 flex items-center justify-between">
                    <TrendingUp className="h-3.5 w-3.5 text-rose-500 rotate-180" />
                    <span className="text-xs font-bold text-rose-800">{i.stock} PCS</span>
                  </div>
                </div>
              ))
            )}
            {stockSummary.length === 0 && (
              <div className="col-span-full py-10 text-center opacity-40">
                <Package className="h-10 w-10 mx-auto mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Stok Aman / Kosong</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ROW 6: MONTHLY FINANCE AUDIT */}
      <Card className="rounded-3xl border-none shadow-xl bg-neutral-950 text-white overflow-hidden">
        <CardHeader className="p-6 sm:p-8 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-serif font-bold flex items-center gap-2 tracking-tight">
              <Calculator className="h-5 w-5 text-[#C82368]" /> Perbandingan Keuangan Bulanan
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mt-1">Estimasi Margin Murni (Pemasukan - Belanja - Operasional)</CardDescription>
          </div>
          <Badge className="bg-[#C82368] text-white border-none font-bold text-[10px] px-4 py-1.5 rounded-full uppercase w-fit">Audit {format(dateInterval.start, "MMMM")}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-white/10">
            <MonthlyStat label="Total Pemasukan" value={monthlyFinance.sales} />
            <MonthlyStat label="Total Belanja (HPP)" value={monthlyFinance.purchase} color="amber" />
            <MonthlyStat label="Biaya Operasional" value={monthlyFinance.ops} color="rose" />
            <MonthlyStat label="Estimasi Margin" value={monthlyFinance.margin} color="emerald" isLast />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ title, value, trend, icon: Icon, color, isCurrency = true }: any) {
  const isDark = color === "obsidian" || color === "berry";
  const colorMap: any = {
    obsidian: "bg-neutral-950 text-white border-none shadow-xl",
    berry: "bg-[#C82368] text-white border-none shadow-xl shadow-[#C82368]/20",
    light: "bg-white text-neutral-950 border border-neutral-200/70 shadow-sm",
  };

  return (
    <Card className={cn("rounded-3xl overflow-hidden relative group hover:-translate-y-0.5 transition-all", colorMap[color] || colorMap.light)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2.5 rounded-full", isDark ? "bg-white/15" : "bg-[#F5F3F0]")}>
            <Icon className={cn("h-5 w-5", color === "obsidian" ? "text-[#C82368]" : isDark ? "text-white" : "text-neutral-950")} />
          </div>
          <div className={cn(
            "flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold",
            isDark
              ? (trend >= 0 ? "bg-white/15 text-emerald-200" : "bg-white/15 text-rose-200")
              : (trend >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700")
          )}>
            {trend >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        </div>
        <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-1.5", isDark ? "text-white/70" : "text-neutral-500")}>{title}</p>
        <h3 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight truncate leading-none">
          {isCurrency ? `Rp ${value.toLocaleString('id-ID')}` : value.toLocaleString('id-ID')}
        </h3>
      </CardContent>
    </Card>
  );
}

function PaymentStat({ label, value, total, icon: Icon, color }: any) {
  const colorClasses: any = {
    emerald: "bg-emerald-50 text-emerald-700",
    obsidian: "bg-neutral-950 text-white",
    berry: "bg-[#C82368]/10 text-[#C82368]",
  };
  const percentage = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="p-3.5 rounded-2xl bg-[#F5F3F0]/60 border border-neutral-200/60 space-y-2">
      <div className="flex items-center gap-2">
        <div className={cn("p-2 rounded-full", colorClasses[color])}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{label}</span>
      </div>
      <div>
        <p className="text-base font-serif font-bold text-neutral-950">Rp {value.toLocaleString('id-ID')}</p>
        <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">{percentage.toFixed(1)}% TOTAL</p>
      </div>
    </div>
  );
}

function MonthlyStat({ label, value, color = "default", isLast = false }: any) {
  const colorMap: any = {
    default: "text-white",
    amber: "text-amber-400",
    rose: "text-rose-400",
    emerald: "text-[#f472b6]",
  };

  return (
    <div className={cn("p-6 sm:p-8", !isLast && "lg:border-r border-white/10")}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">{label}</p>
      <h4 className={cn("text-xl sm:text-2xl font-serif font-bold tracking-tight leading-none", colorMap[color])}>
        Rp {value.toLocaleString('id-ID')}
      </h4>
    </div>
  );
}
