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
import { Loader2, User, Key, Mail, ShieldCheck, Store, Shirt, Save, Globe, CreditCard, Image as ImageIcon } from "lucide-react";
import Image from "next/image";

const roles = [
  { id: "OWNER", label: "Owner Pusat", icon: ShieldCheck },
  { id: "ADMIN", label: "Administrator", icon: User },
  { id: "KASIR_TOKO_A", label: "Kasir NHS KWT", icon: Store },
  { id: "KASIR_TOKO_B", label: "Kasir IND CO", icon: Store },
  { id: "KASIR_TOKO_C", label: "Kasir NHS GDM", icon: Store },
];

const DEFAULT_LOGO = "/hero/nibras-logo.jpg";
const DEFAULT_CARD_BG = "https://res.cloudinary.com/dgsxujjb1/image/upload/v1778132431/KartuMember_IndahFashion_1_lun0a1.png";

export default function OwnerSettingsPage() {
  const db = useFirestore();
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Ambil data Master Kredensial
  const usersQuery = useMemoFirebase(() => collection(db, "users"), [db]);
  const { data: usersData } = useCollection<any>(usersQuery);
  
  // Ambil data Setting Brand (Logo Struk)
  const brandRef = useMemoFirebase(() => doc(db, "settings", "brand"), [db]);
  const { data: brandData } = useDoc<any>(brandRef);

  // Ambil data Setting Kartu
  const cardRef = useMemoFirebase(() => doc(db, "settings", "memberCard"), [db]);
  const { data: cardSettings } = useDoc<any>(cardRef);

  const [localUsers, setLocalUsers] = useState<Record<string, any>>({});
  const [receiptLogoUrl, setReceiptLogoUrl] = useState("");
  const [cardBackgroundUrl, setCardBackgroundUrl] = useState("");

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

  useEffect(() => {
    if (cardSettings?.backgroundUrl) {
      setCardBackgroundUrl(cardSettings.backgroundUrl);
    } else {
      setCardBackgroundUrl(DEFAULT_CARD_BG);
    }
  }, [cardSettings]);

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

  const handleSaveCardBg = () => {
    if (!cardBackgroundUrl) {
      toast({ title: "Gagal", description: "URL Background tidak boleh kosong.", variant: "destructive" });
      return;
    }
    setIsSavingCard(true);
    try {
      setDocumentNonBlocking(cardRef!, { backgroundUrl: cardBackgroundUrl.trim() }, { merge: true });
      toast({ title: "Berhasil", description: "Desain latar kartu telah diperbarui." });
    } catch (err) {
      toast({ title: "Gagal", variant: "destructive" });
    } finally {
      setTimeout(() => setIsSavingCard(false), 500);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6 pb-10">
      <div>
        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">System Preferences</p>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">Seting Sistem</h1>
        <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">Kelola akses operasional dan branding Nibras House.</p>
      </div>

      <div className="space-y-5 sm:space-y-6">
        {/* Manajemen Akun */}
        <Card className="border border-neutral-200/70 shadow-sm overflow-hidden rounded-2xl sm:rounded-3xl bg-white">
          <CardHeader className="bg-neutral-950 text-white p-4 sm:p-5">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-neutral-200">
              <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-[#C82368]" /> Manajemen Akun Staf
            </CardTitle>
            <CardDescription className="text-neutral-400 text-xs">Email dan Password ini adalah akses tunggal bagi setiap staf cabang.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-neutral-100">
              {roles.map((role) => {
                const userData = localUsers[role.id] || { email: "", passwordHint: "" };
                return (
                  <div key={role.id} className="p-3.5 sm:p-5 hover:bg-[#F5F3F0]/50 transition-colors">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 sm:gap-5">
                      <div className="flex items-center gap-3 shrink-0 min-w-[200px]">
                        <div className="bg-[#C82368]/10 p-2.5 rounded-full">
                          <role.icon className="h-4 w-4 text-[#C82368]" />
                        </div>
                        <div>
                          <p className="font-bold text-xs sm:text-sm uppercase tracking-tight text-neutral-900">{role.label}</p>
                          <p className="text-[9px] sm:text-[10px] font-bold text-neutral-400">ID AKSES: {role.id}</p>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                        <div className="space-y-1">
                          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Email Login</Label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                            <Input 
                              placeholder="nama@nibrashouse.id" 
                              className="pl-10 h-9 sm:h-10 text-xs sm:text-sm font-bold bg-[#F5F3F0] rounded-full border border-neutral-200/70"
                              value={userData.email || ""}
                              onChange={e => setLocalUsers({...localUsers, [role.id]: { ...userData, email: e.target.value }})}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Kata Sandi</Label>
                          <div className="relative">
                            <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                            <Input 
                              type="text"
                              placeholder="••••••••" 
                              className="pl-10 h-9 sm:h-10 text-xs sm:text-sm font-mono bg-[#F5F3F0] rounded-full border border-neutral-200/70"
                              value={userData.passwordHint || ""}
                              onChange={e => setLocalUsers({...localUsers, [role.id]: { ...userData, passwordHint: e.target.value }})}
                            />
                          </div>
                        </div>
                      </div>

                      <Button 
                        className="h-9 sm:h-10 px-5 sm:px-6 font-bold text-[11px] sm:text-xs rounded-full shrink-0 bg-neutral-950 hover:bg-neutral-800 text-white"
                        disabled={isSaving === role.id}
                        onClick={() => handleUpdateUser(role.id)}
                      >
                        {isSaving === role.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "KUNCI DATA"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Kartu Cetak Member */}
        <Card className="border border-neutral-200/70 shadow-sm overflow-hidden rounded-2xl sm:rounded-3xl bg-white">
          <CardHeader className="bg-neutral-950 text-white p-4 sm:p-5">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-neutral-200">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-[#C82368]" /> Desain Kartu Member
            </CardTitle>
            <CardDescription className="text-neutral-400 text-xs">Atur desain latar belakang kartu member fisik Indah Fashion.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-5 lg:gap-10 items-start">
              <div className="flex-1 w-full space-y-4">
                <div className="space-y-1">
                  <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Link Background Kartu (Cloudinary)</Label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                    <Input 
                      placeholder="https://res.cloudinary.com/..." 
                      className="pl-10 h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-medium text-xs"
                      value={cardBackgroundUrl}
                      onChange={(e) => setCardBackgroundUrl(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1 italic px-2">
                    * Gunakan gambar dengan rasio kartu ID-1 (sekitar 1011x569 pixel).
                  </p>
                </div>
                
                <Button 
                  className="w-full h-10 rounded-full font-bold text-xs uppercase tracking-widest bg-[#C82368] hover:bg-[#a61c55] text-white"
                  onClick={handleSaveCardBg}
                  disabled={isSavingCard}
                >
                  {isSavingCard ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-2" /> SIMPAN DESAIN KARTU</>}
                </Button>
              </div>

              <div className="w-full lg:w-80 flex flex-col items-center gap-2">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400">Pratinjau Background</p>
                <div className="relative w-full aspect-[1.58/1] rounded-2xl bg-[#F5F3F0] border-2 border-dashed border-neutral-200 flex items-center justify-center overflow-hidden shadow-inner">
                  {cardBackgroundUrl ? (
                    <img 
                      src={cardBackgroundUrl} 
                      alt="Preview Card Background" 
                      className="w-full h-full object-cover"
                      onError={() => setCardBackgroundUrl(DEFAULT_CARD_BG)}
                    />
                  ) : (
                    <div className="text-center space-y-2 opacity-25">
                      <ImageIcon className="h-10 w-10 mx-auto" />
                      <p className="text-[10px] font-bold uppercase">No Background</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo Struk Configuration */}
        <Card className="border border-neutral-200/70 shadow-sm overflow-hidden rounded-2xl sm:rounded-3xl bg-white">
          <CardHeader className="bg-neutral-950 text-white p-4 sm:p-5">
            <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-neutral-200">
              <Shirt className="h-4 w-4 sm:h-5 sm:w-5 text-[#C82368]" /> Pengaturan Logo Struk
            </CardTitle>
            <CardDescription className="text-neutral-400 text-xs">Logo ini akan muncul pada hasil cetak struk belanja 58mm/80mm.</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row gap-5 lg:gap-10 items-start">
              <div className="flex-1 w-full space-y-4">
                <div className="space-y-1">
                  <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Link Logo Struk (Cloudinary)</Label>
                  <div className="relative">
                    <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                    <Input 
                      placeholder="https://res.cloudinary.com/..." 
                      className="pl-10 h-10 rounded-full bg-[#F5F3F0] border border-neutral-200/70 font-medium text-xs"
                      value={receiptLogoUrl}
                      onChange={(e) => setReceiptLogoUrl(e.target.value)}
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1 italic px-2">
                    * Pastikan link bersifat publik dan memiliki background transparan atau putih.
                  </p>
                </div>
                
                <Button 
                  className="w-full h-10 rounded-full font-bold text-xs uppercase tracking-widest bg-[#C82368] hover:bg-[#a61c55] text-white"
                  onClick={handleSaveLogo}
                  disabled={isSavingLogo}
                >
                  {isSavingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-3.5 w-3.5 mr-2" /> SIMPAN LOGO STRUK</>}
                </Button>
              </div>

              <div className="w-full lg:w-64 flex flex-col items-center gap-2">
                <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400">Preview Struk</p>
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-[#F5F3F0] border-2 border-dashed border-neutral-200 flex items-center justify-center overflow-hidden p-4 shadow-inner">
                  {receiptLogoUrl ? (
                    <img 
                      src={receiptLogoUrl} 
                      alt="Preview Logo Struk" 
                      className="max-w-full max-h-full object-contain"
                      onError={() => setReceiptLogoUrl("")}
                    />
                  ) : (
                    <div className="text-center space-y-2 opacity-25">
                      <Shirt className="h-10 w-10 mx-auto" />
                      <p className="text-[10px] font-bold uppercase">No Image</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo App (Terkunci) */}
        <Card className="max-w-2xl border border-neutral-200/70 shadow-sm overflow-hidden rounded-3xl bg-white opacity-80">
          <CardHeader className="bg-[#F5F3F0] pb-4 border-b border-neutral-200/70">
            <CardTitle className="text-xs font-bold flex items-center gap-2 uppercase tracking-widest text-neutral-500">
              Logo Sistem (Header &amp; Login)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20 rounded-2xl bg-[#F5F3F0] border border-neutral-200/70 flex items-center justify-center overflow-hidden p-1 shrink-0">
                <Image 
                  src={DEFAULT_LOGO} 
                  alt="Default App Logo" 
                  width={72} 
                  height={72} 
                  className="object-cover rounded-xl" 
                />
              </div>
              <div className="flex-1 space-y-1">
                <h4 className="font-bold text-xs uppercase text-neutral-800">Logo Aplikasi Aktif</h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
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
