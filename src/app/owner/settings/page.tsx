"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, useDoc } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Key, Mail, ShieldCheck, Store, Shirt, Save, Globe } from "lucide-react";
import Image from "next/image";

const roles = [
  { id: "OWNER", label: "Owner Pusat", icon: ShieldCheck },
  { id: "ADMIN", label: "Administrator", icon: User },
  { id: "KASIR_TOKO_A", label: "Kasir NHS KWT", icon: Store },
  { id: "KASIR_TOKO_B", label: "Kasir IND CO", icon: Store },
  { id: "KASIR_TOKO_C", label: "Kasir NHS GDM", icon: Store },
];

const DEFAULT_LOGO = "https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png";

export default function OwnerSettingsPage() {
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);

  // Ambil data Master Kredensial
  const usersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: usersData } = useCollection<any>(usersQuery);
  
  // Ambil data Setting Brand (Logo Struk)
  const brandRef = useMemoFirebase(() => doc(db, "settings", "brand"), [db]);
  const { data: brandData } = useDoc<any>(brandRef);

  const [localUsers, setLocalUsers] = useState<Record<string, any>>({});
  const [receiptLogoUrl, setReceiptLogoUrl] = useState("");

  useEffect(() => {
    if (usersData) {
      const usersMap: Record<string, any> = {};
      roles.forEach(role => {
        const foundMaster = usersData.find((u: any) => u.id === `ROLE_${role.id}`);
        if (foundMaster) {
          usersMap[role.id] = foundMaster;
        } else {
          usersMap[role.id] = { role: role.id, email: "", passwordHint: "" };
        }
      });
      setLocalUsers(usersMap);
    }
  }, [usersData]);

  useEffect(() => {
    if (brandData?.receiptLogoUrl) {
      setReceiptLogoUrl(brandData.receiptLogoUrl);
    }
  }, [brandData]);

  const handleUpdateUser = async (roleId: string) => {
    const userData = localUsers[roleId];
    if (!userData?.email || !userData?.passwordHint) {
      toast({ title: "Gagal", description: "Email dan Password wajib diisi.", variant: "destructive" });
      return;
    }

    setIsSaving(roleId);
    
    try {
      const userRef = doc(db, "users", `ROLE_${roleId}`);
      const normalizedEmail = userData.email.toLowerCase().trim();
      
      const payload = {
        id: `ROLE_${roleId}`,
        role: roleId,
        email: normalizedEmail,
        passwordHint: userData.passwordHint.trim(),
        displayName: normalizedEmail.split('@')[0].toUpperCase(),
        updatedAt: new Date().toISOString()
      };

      setDocumentNonBlocking(userRef, payload, { merge: true });

      const displayLabel = roles.find(r => r.id === roleId)?.label || roleId;
      toast({ 
        title: "Kunci Berhasil", 
        description: `Kredensial untuk ${displayLabel} telah diperbarui.` 
      });
    } catch (error: any) {
      toast({ title: "Gagal Menyimpan", description: "Terjadi kesalahan sistem.", variant: "destructive" });
    } finally {
      setIsSaving(null);
    }
  };

  const handleSaveLogo = () => {
    if (!receiptLogoUrl) {
      toast({ title: "Gagal", description: "URL Logo tidak boleh kosong.", variant: "destructive" });
      return;
    }
    setIsSavingLogo(true);
    try {
      setDocumentNonBlocking(brandRef!, { receiptLogoUrl: receiptLogoUrl.trim() }, { merge: true });
      toast({ title: "Berhasil", description: "Logo struk telah diperbarui di sistem." });
    } catch (err) {
      toast({ title: "Gagal", variant: "destructive" });
    } finally {
      setTimeout(() => setIsSavingLogo(false), 500);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div>
        <h1 className="text-3xl font-black font-headline text-primary uppercase">Seting Sistem</h1>
        <p className="text-muted-foreground text-sm">Kelola akses operasional dan branding Nibras House.</p>
      </div>

      <div className="space-y-8">
        {/* Manajemen Akun */}
        <Card className="border-none soft-shadow overflow-hidden rounded-3xl">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-lg font-black flex items-center gap-2 uppercase">
              <ShieldCheck className="h-5 w-5 text-primary" /> Manajemen Akun Staf
            </CardTitle>
            <CardDescription>Email dan Password ini adalah akses tunggal bagi setiap staf cabang.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-muted/50">
              {roles.map((role) => {
                const userData = localUsers[role.id] || { email: "", passwordHint: "" };
                return (
                  <div key={role.id} className="p-6 hover:bg-muted/5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4 shrink-0 min-w-[220px]">
                        <div className="bg-primary/10 p-3 rounded-2xl">
                          <role.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-black text-base uppercase tracking-tight">{role.label}</p>
                          <p className="text-[10px] font-bold text-muted-foreground opacity-60">ID AKSES: {role.id}</p>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Email Login</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="nama@nibrashouse.id" 
                              className="pl-10 h-12 text-sm font-bold bg-white rounded-xl border-none shadow-sm"
                              value={userData.email || ""}
                              onChange={e => setLocalUsers({...localUsers, [role.id]: { ...userData, email: e.target.value }})}
                            />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Kata Sandi</Label>
                          <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              type="text"
                              placeholder="••••••••" 
                              className="pl-10 h-12 text-sm font-mono bg-white rounded-xl border-none shadow-sm"
                              value={userData.passwordHint || ""}
                              onChange={e => setLocalUsers({...localUsers, [role.id]: { ...userData, passwordHint: e.target.value }})}
                            />
                          </div>
                        </div>
                      </div>

                      <Button 
                        className="h-12 px-8 font-black rounded-xl shrink-0 shadow-lg shadow-primary/20"
                        disabled={isSaving === role.id}
                        onClick={() => handleUpdateUser(role.id)}
                      >
                        {isSaving === role.id ? <Loader2 className="h-5 w-5 animate-spin" /> : "KUNCI DATA"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Logo Struk Configuration */}
        <Card className="border-none soft-shadow overflow-hidden rounded-3xl">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle className="text-lg font-black flex items-center gap-2 uppercase text-primary">
              <Shirt className="h-5 w-5" /> Pengaturan Logo Struk
            </CardTitle>
            <CardDescription>Logo ini akan muncul pada hasil cetak struk belanja 58mm/80mm.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col lg:flex-row gap-12 items-start">
              <div className="flex-1 w-full space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Link Logo Struk (Cloudinary)</Label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="https://res.cloudinary.com/..." 
                      className="pl-12 h-14 rounded-2xl bg-white border-2 border-slate-100 font-medium"
                      value={receiptLogoUrl}
                      onChange={(e) => setReceiptLogoUrl(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic px-1">
                    * Pastikan link bersifat publik dan memiliki background transparan atau putih.
                  </p>
                </div>
                
                <Button 
                  className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20"
                  onClick={handleSaveLogo}
                  disabled={isSavingLogo}
                >
                  {isSavingLogo ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5 mr-2" /> SIMPAN LOGO STRUK</>}
                </Button>
              </div>

              <div className="w-full lg:w-72 flex flex-col items-center gap-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preview Struk</p>
                <div className="relative w-48 h-48 rounded-[2rem] bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden p-6 shadow-inner">
                  {receiptLogoUrl ? (
                    <img 
                      src={receiptLogoUrl} 
                      alt="Preview Logo Struk" 
                      className="max-w-full max-h-full object-contain"
                      onError={() => setReceiptLogoUrl("")}
                    />
                  ) : (
                    <div className="text-center space-y-2 opacity-20">
                      <Shirt className="h-12 w-12 mx-auto" />
                      <p className="text-[9px] font-bold uppercase">No Image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo App (Terkunci) */}
        <Card className="max-w-2xl border-none soft-shadow overflow-hidden rounded-3xl opacity-60">
          <CardHeader className="bg-slate-50 pb-6 border-b">
            <CardTitle className="text-sm font-black flex items-center gap-2 uppercase text-slate-400">
              Logo Sistem (Header & Login)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex items-center gap-8">
              <div className="relative w-24 h-24 rounded-2xl bg-white border flex items-center justify-center overflow-hidden p-2">
                <Image 
                  src={DEFAULT_LOGO} 
                  alt="Default App Logo" 
                  width={80} 
                  height={80} 
                  className="object-contain" 
                />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-black text-xs uppercase text-slate-500">Logo Aplikasi Aktif</h4>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Logo sistem untuk antarmuka aplikasi dikunci demi stabilitas UI. Hanya logo struk yang dapat diubah secara dinamis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}