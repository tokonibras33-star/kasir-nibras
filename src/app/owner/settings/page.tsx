"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { Loader2, User, Key, Mail, ShieldCheck, Store, Shirt } from "lucide-react";
import Image from "next/image";

const roles = [
  { id: "OWNER", label: "Owner Pusat", icon: ShieldCheck },
  { id: "ADMIN", label: "Administrator", icon: User },
  { id: "KASIR_TOKO_A", label: "Kasir NHS KWT", icon: Store },
  { id: "KASIR_TOKO_B", label: "Kasir IND CO", icon: Store },
  { id: "KASIR_TOKO_C", label: "Kasir NHS GDM", icon: Store },
];

const LOGO_URL = "https://res.cloudinary.com/dqujkgwah/image/upload/v1775115570/nibras_house-removebg-preview_gwdzut.png";

export default function OwnerSettingsPage() {
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // Ambil data Master Kredensial (Dokumen berawalan ROLE_)
  const usersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: usersData } = useCollection<any>(usersQuery);
  
  const [localUsers, setLocalUsers] = useState<Record<string, any>>({});

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

      // Kunci data ke Firestore Master menggunakan pola non-blocking
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

        {/* Logo Toko Terkunci (Cloudinary) */}
        <Card className="max-w-2xl border-none soft-shadow overflow-hidden rounded-3xl">
          <CardHeader className="bg-primary/5 pb-6">
            <CardTitle className="text-lg font-black flex items-center gap-2 uppercase text-primary">
              <Shirt className="h-5 w-5" /> Logo Aktif (Cloudinary)
            </CardTitle>
            <CardDescription>Logo ini digunakan secara sistem di seluruh operasional toko.</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative w-48 h-48 rounded-[2.5rem] bg-white border-2 border-primary/10 flex items-center justify-center overflow-hidden shadow-sm p-4">
                <Image 
                  src={LOGO_URL} 
                  alt="Logo Nibras House" 
                  width={160} 
                  height={160} 
                  className="object-contain" 
                />
              </div>
              <div className="flex-1 space-y-4">
                <h4 className="font-black text-sm uppercase text-slate-800">Status: Aktif</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Sistem branding saat ini dikunci menggunakan URL eksternal Cloudinary untuk stabilitas tampilan di seluruh perangkat.
                </p>
                <Badge variant="outline" className="font-mono text-[8px] bg-slate-50 py-1">
                  {LOGO_URL.slice(0, 40)}...
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
