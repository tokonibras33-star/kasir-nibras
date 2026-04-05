
"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  ShoppingBag,
  Clock
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where, Timestamp, orderBy, limit } from "firebase/firestore";
import { format } from "date-fns";
import { useAuth } from "@/context/AuthContext";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))'];

export default function AdminDashboard() {
  const db = useFirestore();
  const { user } = useAuth();

  // Range waktu untuk HARI INI
  const startOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const endOfToday = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // Fetch Transaksi Hari Ini dari 3 Toko
  const qA = useMemoFirebase(() => user ? query(
    collection(db, "stores", "TOKO_A", "transactions"),
    where("date", ">=", Timestamp.fromDate(startOfToday)),
    where("date", "<=", Timestamp.fromDate(endOfToday))
  ) : null, [db, startOfToday, endOfToday, user]);

  const qB = useMemoFirebase(() => user ? query(
    collection(db, "stores", "TOKO_B", "transactions"),
    where("date", ">=", Timestamp.fromDate(startOfToday)),
    where("date", "<=", Timestamp.fromDate(endOfToday))
  ) : null, [db, startOfToday, endOfToday, user]);

  const qC = useMemoFirebase(() => user ? query(
    collection(db, "stores", "TOKO_C", "transactions"),
    where("date", ">=", Timestamp.fromDate(startOfToday)),
    where("date", "<=", Timestamp.fromDate(endOfToday))
  ) : null, [db, startOfToday, endOfToday, user]);

  const { data: trxA } = useCollection<any>(qA);
  const { data: trxB } = useCollection<any>(qB);
  const { data: trxC } = useCollection<any>(qC);

  // Fetch Stok untuk "Stok Menipis"
  const sA = useMemoFirebase(() => user ? collection(db, "stores", "TOKO_A", "stock") : null, [db, user]);
  const sB = useMemoFirebase(() => user ? collection(db, "stores", "TOKO_B", "stock") : null, [db, user]);
  const sC = useMemoFirebase(() => user ? collection(db, "stores", "TOKO_C", "stock") : null, [db, user]);

  const { data: stockA } = useCollection<any>(sA);
  const { data: stockB } = useCollection<any>(sB);
  const { data: stockC } = useCollection<any>(sC);

  // Kalkulasi Data Grafik & Stats
  const salesData = useMemo(() => {
    const totalA = (trxA || []).reduce((sum, t) => sum + (t.total || 0), 0);
    const totalB = (trxB || []).reduce((sum, t) => sum + (t.total || 0), 0);
    const totalC = (trxC || []).reduce((sum, t) => sum + (t.total || 0), 0);

    return [
      { name: "NHS KWT", sales: totalA },
      { name: "IND CO", sales: totalB },
      { name: "NHS GDM", sales: totalC },
    ];
  }, [trxA, trxB, trxC]);

  const stats = useMemo(() => {
    const totalTodaySales = salesData.reduce((sum, s) => sum + s.sales, 0);
    const totalTodayTrx = (trxA?.length || 0) + (trxB?.length || 0) + (trxC?.length || 0);
    
    // Hitung Low Stock (Stok <= 5)
    let lowStockCount = 0;
    [stockA, stockB, stockC].forEach(storeStock => {
      (storeStock || []).forEach(p => {
        (p.variants || []).forEach((v: any) => {
          if ((v.stock || 0) <= 5) lowStockCount++;
        });
      });
    });

    return [
      {
        title: "Penjualan Hari Ini",
        value: `Rp ${totalTodaySales.toLocaleString('id-ID')}`,
        change: totalTodaySales > 0 ? "Aktif" : "0",
        trend: "up",
        icon: TrendingUp,
        color: "text-primary"
      },
      {
        title: "Total Transaksi",
        value: totalTodayTrx.toString(),
        change: "Hari Ini",
        trend: "neutral",
        icon: ShoppingBag,
        color: "text-blue-500"
      },
      {
        title: "Stok Menipis",
        value: lowStockCount.toString(),
        change: "Item (<= 5)",
        trend: "neutral",
        icon: AlertTriangle,
        color: "text-amber-500"
      },
      {
        title: "Status Sistem",
        value: "Online",
        change: "Real-time",
        trend: "up",
        icon: Clock,
        color: "text-purple-500"
      }
    ];
  }, [salesData, trxA, trxB, trxC, stockA, stockB, stockC]);

  // Transaksi Terkini Gabungan
  const recentTransactions = useMemo(() => {
    const combined = [
      ...(trxA || []).map(t => ({ ...t, storeName: 'NHS KWT' })),
      ...(trxB || []).map(t => ({ ...t, storeName: 'IND CO' })),
      ...(trxC || []).map(t => ({ ...t, storeName: 'NHS GDM' })),
    ];
    return combined
      .sort((a, b) => (b.date?.toDate()?.getTime() || 0) - (a.date?.toDate()?.getTime() || 0))
      .slice(0, 5);
  }, [trxA, trxB, trxC]);

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold font-headline tracking-tight text-foreground text-center md:text-left">
          Dashboard Manajemen
        </h1>
        <p className="text-muted-foreground mt-1 text-center md:text-left text-sm md:text-base">
          Ringkasan aktivitas riil seluruh cabang Nibras House.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={i} className="soft-shadow border-none overflow-hidden group">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={stat.color + " bg-current/10 p-2.5 rounded-lg transition-transform group-hover:scale-110"}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <span className="text-muted-foreground text-xs font-bold">{stat.change}</span>
              </div>
              <div className="space-y-1">
                <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  {stat.title}
                </p>
                <h3 className="text-xl md:text-2xl font-bold text-foreground font-headline">
                  {stat.value}
                </h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="soft-shadow border-none">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Perbandingan Penjualan (Hari Ini)</CardTitle>
            <CardDescription className="text-xs md:text-sm">Berdasarkan transaksi yang tercatat hari ini.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] md:h-[300px] p-2 md:p-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} dy={10} tick={{fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
                />
                <Bar dataKey="sales" radius={[8, 8, 0, 0]} barSize={40}>
                  {salesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="soft-shadow border-none">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Transaksi Terkini</CardTitle>
            <CardDescription className="text-xs md:text-sm">Riwayat transaksi terbaru dari seluruh cabang.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-3">
              {recentTransactions.length > 0 ? recentTransactions.map((trx, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-muted">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs md:text-sm">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-semibold">{trx.storeName}</p>
                      <p className="text-[10px] md:text-xs text-muted-foreground">Oleh: {trx.cashier || 'Kasir'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs md:text-sm font-bold text-primary">Rp {(trx.total || 0).toLocaleString('id-ID')}</p>
                    <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">
                      {trx.date?.toDate() ? format(trx.date.toDate(), "HH:mm") : '-'}
                    </p>
                  </div>
                </div>
              )) : (
                <div className="h-40 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                  <ShoppingBag className="h-8 w-8 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-widest">Belum ada transaksi hari ini</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
