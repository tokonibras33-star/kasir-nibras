"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/context/AuthContext";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shirt, Loader2, ShieldCheck, UserCircle, Store, ArrowLeft, Key, Mail, Lock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";

const LOGO_URL = "https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png";

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const { login } = useAuth();
  const router = useRouter();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    // Reset form
    setEmail("");
    setPassword("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !email || !password) {
      toast({ title: "Gagal", description: "Email dan Password wajib diisi.", variant: "destructive" });
      return;
    }

    setIsLoggingIn(true);
    try {
      await login(email, password, selectedRole);
      
      // Redirect based on role
      if (selectedRole === "OWNER" || selectedRole === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/cashier");
      }
      
      toast({ 
        title: "Login Berhasil", 
        description: `Selamat datang kembali!` 
      });
    } catch (error: any) {
      console.error(error);
      let errorMsg = "Email atau Password salah.";
      if (error.code === 'auth/invalid-email') errorMsg = "Format email tidak valid.";
      if (error.code === 'auth/user-disabled') errorMsg = "Akun ini telah dinonaktifkan.";
      
      toast({ title: "Login Gagal", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100/50 p-4 font-body">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl shadow-primary/10 animate-in zoom-in duration-500 w-24 h-24 flex items-center justify-center border border-primary/5">
              <Image 
                src={LOGO_URL} 
                alt="Logo Nibras House" 
                width={80} 
                height={80} 
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-foreground font-headline uppercase mt-4">
            Nibras House
          </h1>
          <p className="text-muted-foreground font-bold text-sm tracking-widest uppercase opacity-60">
            Sistem Kasir & Inventaris Modern
          </p>
        </div>

        {!selectedRole ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Management Access */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Manajemen Pusat</span>
              </div>
              
              <div className="grid gap-3">
                <RoleButton 
                  role="OWNER" 
                  icon={ShieldCheck} 
                  description="Pantau seluruh toko & laporan" 
                  onClick={() => handleRoleSelect("OWNER")} 
                  color="primary"
                />
                <RoleButton 
                  role="ADMIN" 
                  icon={UserCircle} 
                  description="Kelola stok & data master" 
                  onClick={() => handleRoleSelect("ADMIN")} 
                  color="primary"
                />
              </div>
            </div>

            {/* Cashier Access */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <Store className="h-4 w-4 text-blue-600" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Operasional Kasir</span>
              </div>
              
              <div className="grid gap-3">
                <RoleButton 
                  role="KASIR_TOKO_A" 
                  label="KASIR NHS KWT"
                  icon={Store} 
                  description="Cabang KWT" 
                  onClick={() => handleRoleSelect("KASIR_TOKO_A")} 
                  color="blue"
                />
                <div className="grid grid-cols-2 gap-3">
                  <RoleButton 
                    role="KASIR_TOKO_B" 
                    label="IND CO"
                    icon={Store} 
                    onClick={() => handleRoleSelect("KASIR_TOKO_B")} 
                    color="emerald"
                    compact
                  />
                  <RoleButton 
                    role="KASIR_TOKO_C" 
                    label="NHS GDM"
                    icon={Store} 
                    onClick={() => handleRoleSelect("KASIR_TOKO_C")} 
                    color="emerald"
                    compact
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <Card className="max-w-md mx-auto border-none soft-shadow rounded-3xl overflow-hidden animate-in zoom-in-95 fade-in duration-300">
            <CardHeader className="bg-primary/5 pb-8 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-4 left-4 rounded-full h-8 w-8" 
                onClick={() => setSelectedRole(null)}
                disabled={isLoggingIn}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="text-center pt-4">
                <div className="bg-white w-16 h-16 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-3 p-2">
                  <Image 
                    src={LOGO_URL} 
                    alt="Logo" 
                    width={48} 
                    height={48} 
                    className="object-contain"
                  />
                </div>
                <CardTitle className="text-xl font-black uppercase tracking-tight">Login {selectedRole.replace(/KASIR_TOKO_A/g, 'NHS KWT').replace(/KASIR_TOKO_B/g, 'IND CO').replace(/KASIR_TOKO_C/g, 'NHS GDM').replace(/_/g, ' ')}</CardTitle>
                <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-70">Masukkan kredensial Anda</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-8">
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Email Terdaftar</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="email" 
                      placeholder="nama@nibras.com" 
                      className="h-12 pl-10 rounded-xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-primary font-medium"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Kata Sandi</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="password" 
                      placeholder="••••••••" 
                      className="h-12 pl-10 rounded-xl bg-slate-50 border-none focus-visible:ring-2 focus-visible:ring-primary font-medium"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 mt-4"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      MEMVERIFIKASI...
                    </>
                  ) : (
                    "MASUK SEKARANG"
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="bg-slate-50/50 p-4 justify-center">
              <p className="text-[9px] text-muted-foreground font-medium text-center leading-relaxed">
                Gunakan email dan password yang telah diberikan oleh Owner melalui pengaturan sistem.
              </p>
            </CardFooter>
          </Card>
        )}

        {isLoggingIn && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-black text-sm uppercase tracking-widest animate-pulse">Menghubungkan ke Server...</p>
            </div>
          </div>
        )}

        <div className="text-center opacity-30 pt-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]">
            &copy; 2026 NIBRAS HOUSE POS SYSTEM • VERSION 1.0
          </p>
        </div>
      </div>
    </div>
  );
}

function RoleButton({ role, label, icon: Icon, description, onClick, disabled, color = "primary", compact = false }: any) {
  const colorClasses = {
    primary: "hover:border-primary hover:bg-primary/5 text-primary border-primary/20",
    blue: "hover:border-blue-600 hover:bg-blue-50 text-blue-700 border-blue-200",
    emerald: "hover:border-emerald-600 hover:bg-emerald-50 text-emerald-700 border-emerald-200",
  };

  return (
    <Button 
      variant="outline" 
      className={cn(
        "h-auto py-4 rounded-3xl border-2 flex flex-col items-center justify-center gap-1 transition-all group",
        colorClasses[color as keyof typeof colorClasses],
        compact ? "px-2" : "px-6"
      )}
      onClick={onClick}
      disabled={disabled}
    >
      <Icon className="h-6 w-6 opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all" />
      <div className="text-center">
        <p className="font-black text-sm tracking-tight">{label || role.replace(/_/g, ' ')}</p>
        {description && <p className="text-[10px] font-medium opacity-60 leading-none mt-1">{description}</p>}
      </div>
    </Button>
  );
}
