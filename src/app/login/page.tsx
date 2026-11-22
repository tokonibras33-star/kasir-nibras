"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  ShieldCheck,
  UserCircle,
  Store,
  ArrowLeft,
  Mail,
  Lock,
  Menu,
  Search,
  ArrowUpRight,
  CheckCircle2,
  X,
  Play,
  Pause,
  Sparkles,
  Film,
  Clock,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";

interface CollectionItem {
  id: string;
  name: string;
  subtitle: string;
  series: string;
  colorName: string;
  material: string;
  priceRange: string;
  badge: string;
  image: string;
  details: string[];
}

const COLLECTIONS: CollectionItem[] = [
  {
    id: "ghadia",
    name: "Ghädiä",
    subtitle: "Gamis Dewasa • Rayya Series",
    series: "RAYYA SERIES 2026",
    colorName: "Cinnamon Mauve",
    material: "Premium Woven Jacquard Mix Soft Touch",
    priceRange: "Rp 248.000",
    badge: "Hero Signature",
    image: "/hero/ghadia.jpg",
    details: ["Busui Friendly", "Lengan Manset & Kancing", "Siluet A-Line Elegan"],
  },
  {
    id: "hildia",
    name: "Hildiä",
    subtitle: "Gamis Dewasa • Rayya Series",
    series: "RAYYA SERIES 2026",
    colorName: "Pale Mauve",
    material: "Dobby Hildia Mix Emerald Peach",
    priceRange: "Rp 288.000 – 340.000",
    badge: "Exclusive Layer",
    image: "/hero/hildia.jpg",
    details: ["Busui Friendly", "Variasi Kancing & Layer", "Saku Sisi Fungsional"],
  },
  {
    id: "resya-51",
    name: "Resya 51",
    subtitle: "Gamis Dewasa • Contemporary",
    series: "CONTEMPORARY SERIES",
    colorName: "Dark Grey",
    material: "Viscoseslub Mix Saluria",
    priceRange: "Rp 228.000 – 240.000",
    badge: "Best Seller",
    image: "/hero/resya-51.jpg",
    details: ["Busui Friendly", "Variasi Layer Vest", "Lengan Manset & Kancing"],
  },
  {
    id: "osadia",
    name: "Osädiä",
    subtitle: "Gamis Anak • Rayya Series",
    series: "RAYYA SERIES 2026",
    colorName: "Royal Maroon",
    material: "Sky Silk Mix Cerutty & Reina Crepe",
    priceRange: "Rp 238.000 – 258.000",
    badge: "Kids Edition",
    image: "/hero/osadia.jpg",
    details: ["Set Hijab Reina Crepe", "Zipper Depan & Pita", "Lengan Manset Karet"],
  },
];

interface RoleOption {
  role: UserRole;
  label: string;
  shortLabel: string;
  category: "MANAJEMEN PUSAT" | "OPERASIONAL KASIR";
  description: string;
  icon: any;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    role: "OWNER",
    label: "OWNER",
    shortLabel: "Owner",
    category: "MANAJEMEN PUSAT",
    description: "Pantau seluruh toko & laporan",
    icon: ShieldCheck,
  },
  {
    role: "ADMIN",
    label: "ADMIN",
    shortLabel: "Admin",
    category: "MANAJEMEN PUSAT",
    description: "Kelola stok & data master",
    icon: UserCircle,
  },
  {
    role: "KASIR_TOKO_A",
    label: "NHS KWT",
    shortLabel: "NHS KWT",
    category: "OPERASIONAL KASIR",
    description: "Cabang KWT",
    icon: Store,
  },
  {
    role: "KASIR_TOKO_B",
    label: "IND CO",
    shortLabel: "IND CO",
    category: "OPERASIONAL KASIR",
    description: "Cabang IND CO",
    icon: Store,
  },
  {
    role: "KASIR_TOKO_C",
    label: "NHS GDM",
    shortLabel: "NHS GDM",
    category: "OPERASIONAL KASIR",
    description: "Cabang GDM",
    icon: Store,
  },
];

const CASHIER_STORE_THEMES: Record<
  string,
  {
    gradient: string;
    shadow: string;
    ring: string;
    iconBg: string;
  }
> = {
  KASIR_TOKO_A: {
    gradient: "from-[#D32F73] to-[#C82368] hover:from-[#c22464] hover:to-[#b01c55]",
    shadow: "shadow-[#C82368]/30",
    ring: "ring-2 ring-white ring-offset-2 ring-offset-[#C82368]",
    iconBg: "bg-white/25",
  },
  KASIR_TOKO_B: {
    gradient: "from-neutral-800 to-neutral-950 hover:from-neutral-700 hover:to-neutral-900",
    shadow: "shadow-neutral-950/30",
    ring: "ring-2 ring-white ring-offset-2 ring-offset-neutral-900",
    iconBg: "bg-white/25",
  },
  KASIR_TOKO_C: {
    gradient: "from-amber-500 to-[#D97706] hover:from-amber-600 hover:to-[#b45309]",
    shadow: "shadow-amber-600/30",
    ring: "ring-2 ring-white ring-offset-2 ring-offset-[#D97706]",
    iconBg: "bg-white/25",
  },
};

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Hero stage state: null plays `/Generated video 1.mp4` full-stage, or a CollectionItem for lookbook preview
  const [activeCollection, setActiveCollection] = useState<CollectionItem | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(true);
  const [shouldLoadVideo, setShouldLoadVideo] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [showCatalogStrip, setShowCatalogStrip] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const { login } = useAuth();
  const router = useRouter();

  // Defer video network request until after initial paint & skip automatic download on 2G / Save-Data connections
  useEffect(() => {
    if (typeof window === "undefined") return;
    const nav = navigator as any;
    const conn = nav?.connection || nav?.mozConnection || nav?.webkitConnection;
    const isVerySlowConnection =
      conn?.saveData === true ||
      conn?.effectiveType === "slow-2g" ||
      conn?.effectiveType === "2g";

    if (isVerySlowConnection) {
      return;
    }

    const timer = window.setTimeout(() => {
      setShouldLoadVideo(true);
    }, 150);

    return () => window.clearTimeout(timer);
  }, []);

  // Pause background video when login modal is open so 100% of CPU & bandwidth goes to authentication
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (selectedRole || isLoggingIn) {
      vid.pause();
    } else if (shouldLoadVideo && isVideoPlaying) {
      vid.play().catch(() => {});
    }
  }, [selectedRole, isLoggingIn, shouldLoadVideo, isVideoPlaying]);

  const toggleVideoPlayback = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsVideoPlaying(true);
    } else {
      videoRef.current.pause();
      setIsVideoPlaying(false);
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setEmail("");
    setPassword("");
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole || !email || !password) {
      toast({
        title: "Gagal",
        description: "Email dan Password wajib diisi.",
        variant: "destructive",
      });
      return;
    }

    setIsLoggingIn(true);
    try {
      await login(email, password, selectedRole);

      if (selectedRole === "OWNER" || selectedRole === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/cashier");
      }

      toast({
        title: "Login Berhasil",
        description: "Selamat datang kembali di Nibras House Official!",
      });
    } catch (error: any) {
      console.error(error);
      let errorMsg = "Email atau Password salah.";
      if (error.code === "auth/invalid-email") errorMsg = "Format email tidak valid.";
      if (error.code === "auth/user-disabled") errorMsg = "Akun ini telah dinonaktifkan.";

      toast({
        title: "Login Gagal",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const getRoleDisplayName = (role: UserRole) => {
    return (
      ROLE_OPTIONS.find((r) => r.role === role)?.label ||
      role
        .replace(/KASIR_TOKO_A/g, "NHS KWT")
        .replace(/KASIR_TOKO_B/g, "IND CO")
        .replace(/KASIR_TOKO_C/g, "NHS GDM")
        .replace(/_/g, " ")
    );
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#ECEAE6] p-0 m-0 text-neutral-900 font-body select-none">
      {/* =====================================================================
          FULL-VIEWPORT MOTION HERO STAGE (100% Full-Bleed Background, No Card Border)
      ====================================================================== */}
      <section className="relative h-screen w-screen overflow-hidden bg-[#ECEAE6] flex flex-col justify-between">
        {/* 1. INSTANT FALLBACK POSTER IMAGE (33KB - renders in <50ms even on slow connections so screen is NEVER blank) */}
        <Image
          src="/hero/video-poster.jpg"
          alt="Nibras House Hero"
          fill
          priority
          sizes="100vw"
          className={cn(
            "object-cover object-[center_18%] transition-all duration-700 pointer-events-none",
            activeCollection ? "opacity-20 scale-105 blur-[2px]" : "opacity-100 scale-100"
          )}
        />

        {/* 2. PROGRESSIVE LIGHTWEIGHT BACKGROUND VIDEO (893KB faststart MP4, loaded after first paint) */}
        {shouldLoadVideo && (
          <video
            ref={videoRef}
            src="/Generated%20video%201.mp4"
            poster="/hero/video-poster.jpg"
            preload="metadata"
            autoPlay
            loop
            muted
            playsInline
            onCanPlay={() => setIsVideoReady(true)}
            onLoadedData={() => setIsVideoReady(true)}
            className={cn(
              "absolute inset-0 w-full h-full object-cover object-[center_18%] transition-opacity duration-700 pointer-events-none",
              !isVideoReady
                ? "opacity-0"
                : activeCollection
                ? "opacity-20 scale-105 blur-[2px]"
                : "opacity-100 scale-100"
            )}
          />
        )}

        {/* 2. TOP MINIMALIST EDITORIAL BAR
            Top-Right: Management Role Access Buttons (OWNER & ADMIN) */}
        <header className="relative z-30 w-full px-4 sm:px-7 pt-4 sm:pt-5 flex items-center justify-end gap-2 pointer-events-none">
          <nav
            aria-label="Akses Manajemen Pusat"
            className="pointer-events-auto flex items-center gap-1 bg-white/75 hover:bg-white/95 backdrop-blur-xl p-1 rounded-full border border-white/85 shadow-sm transition-all"
          >
            {ROLE_OPTIONS.filter((item) => item.category === "MANAJEMEN PUSAT").map((item) => {
              const Icon = item.icon;
              const isSelected = selectedRole === item.role;
              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleRoleSelect(item.role)}
                  className={cn(
                    "group flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider transition-all duration-200 whitespace-nowrap btn-press",
                    isSelected
                      ? "bg-[#C82368] text-white shadow-sm"
                      : "hover:bg-neutral-900 hover:text-white text-neutral-800"
                  )}
                >
                  <Icon className="h-3 w-3 opacity-70 group-hover:opacity-100 transition-opacity shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* 3. CENTER INTERACTIVE COLLECTION SHOWCASE (Appears when user clicks a collection in Katalog Rayya) */}
        {activeCollection && (
          <div className="relative z-20 my-auto mx-auto w-full max-w-5xl px-4 flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="font-serif italic font-bold text-[19vw] sm:text-[13rem] leading-none text-[#D32F73]/90 select-none tracking-tight drop-shadow-sm">
                Nibra&apos;s
              </span>
            </div>

            <div className="relative z-10 bg-white/88 backdrop-blur-2xl border border-white rounded-[2rem] p-4 sm:p-6 shadow-2xl max-w-xl w-full grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
              <div className="sm:col-span-5 relative aspect-[3/4] w-full rounded-2xl overflow-hidden shadow-md bg-neutral-100">
                <Image
                  src={activeCollection.image}
                  alt={activeCollection.name}
                  fill
                  className="object-cover object-top"
                />
              </div>
              <div className="sm:col-span-7 space-y-3 text-left">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-[#C82368]/10 text-[#C82368]">
                    <Sparkles className="h-2.5 w-2.5" />
                    {activeCollection.series}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveCollection(null)}
                    className="h-7 w-7 rounded-full bg-neutral-900/5 hover:bg-neutral-900/10 flex items-center justify-center text-neutral-700"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-neutral-900">
                    {activeCollection.name}
                  </h2>
                  <p className="text-xs font-semibold text-neutral-500">
                    {activeCollection.subtitle} • {activeCollection.colorName}
                  </p>
                </div>

                <p className="text-xs text-neutral-700 font-medium leading-relaxed">
                  Material: <span className="font-bold">{activeCollection.material}</span>
                </p>

                <div className="space-y-1 pt-1">
                  {activeCollection.details.map((detail, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-neutral-700">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#1F7A63]" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-neutral-200/70">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 block">
                      Harga Ritel
                    </span>
                    <span className="text-base font-black text-neutral-900">
                      {activeCollection.priceRange}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveCollection(null)}
                      className="rounded-full text-[10px] font-bold uppercase tracking-wider h-9"
                    >
                      Kembali ke Video
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        setActiveCollection(null);
                        handleRoleSelect("KASIR_TOKO_A");
                      }}
                      className="rounded-full bg-neutral-950 hover:bg-[#C82368] text-white text-[10px] font-bold uppercase tracking-wider h-9"
                    >
                      Buka POS
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. BOTTOM CASHIER ACCESS BUTTONS (KASIR NHS KWT, IND CO, NHS GDM) */}
        <div className="relative z-30 w-full px-3 sm:px-6 pb-6 sm:pb-9 flex items-center justify-center pointer-events-none">
          <nav
            aria-label="Akses Operasional Kasir"
            className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 sm:gap-3.5 max-w-full"
          >
            {ROLE_OPTIONS.filter((item) => item.category === "OPERASIONAL KASIR").map((item) => {
              const Icon = item.icon;
              const isSelected = selectedRole === item.role;
              const theme = CASHIER_STORE_THEMES[item.role] || {
                gradient: "from-[#C82368] to-[#C82368]",
                shadow: "shadow-neutral-900/20",
                ring: "ring-2 ring-white",
                iconBg: "bg-white/25",
              };

              return (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => handleRoleSelect(item.role)}
                  className={cn(
                    "group flex items-center gap-1.5 sm:gap-2.5 px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-full text-[11px] sm:text-sm md:text-[15px] font-black uppercase tracking-wider text-white bg-gradient-to-r border border-white/25 shadow-lg transition-all duration-200 whitespace-nowrap btn-press hover:scale-[1.03] active:scale-95",
                    theme.gradient,
                    theme.shadow,
                    isSelected && cn("scale-105 shadow-xl", theme.ring)
                  )}
                >
                  <span className={cn("p-1 sm:p-1.5 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110", theme.iconBg)}>
                    <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
                  </span>
                  <span className="drop-shadow-sm">{item.label}</span>
                </button>
              );
            })}
            <Link
              href="/absensi"
              className="group flex items-center gap-1.5 sm:gap-2.5 px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-full text-[11px] sm:text-sm md:text-[15px] font-black uppercase tracking-wider text-white bg-gradient-to-r from-[#1F7A63] to-[#0F766E] hover:from-[#196652] hover:to-[#0d625b] border border-white/25 shadow-lg shadow-[#1F7A63]/30 transition-all duration-200 whitespace-nowrap btn-press hover:scale-[1.03] active:scale-95"
            >
              <span className="p-1 sm:p-1.5 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 bg-white/25">
                <Clock className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              </span>
              <span className="drop-shadow-sm">Absensi Karyawan</span>
            </Link>
          </nav>
        </div>
      </section>

      {/* =====================================================================
          MODAL LOGIN OVERLAY (Appears directly over Motion Hero Section when Role is clicked)
      ====================================================================== */}
      {selectedRole && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => !isLoggingIn && setSelectedRole(null)}
        >
          <div
            className="w-full max-w-md rounded-[2.25rem] bg-white border border-neutral-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-neutral-950 text-white p-6 sm:p-7 relative">
              <div className="flex items-center justify-between mb-5">
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  disabled={isLoggingIn}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-300 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Kembali ke Hero</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  disabled={isLoggingIn}
                  className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-2xl bg-white p-1 flex items-center justify-center shrink-0 shadow-md overflow-hidden">
                  <Image
                    src="/hero/nibras-logo.jpg"
                    alt="Logo Nibras"
                    width={44}
                    height={44}
                    className="object-cover rounded-xl"
                  />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-[#F48FB1]">
                    Autentikasi Sistem POS
                  </p>
                  <h3 className="font-serif text-2xl font-bold tracking-tight">
                    Login {getRoleDisplayName(selectedRole)}
                  </h3>
                </div>
              </div>

              {/* Quick Role Switcher inside Modal */}
              <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap gap-1.5">
                {ROLE_OPTIONS.map((r) => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => handleRoleSelect(r.role)}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all",
                      selectedRole === r.role
                        ? "bg-white text-neutral-950 shadow-sm"
                        : "bg-white/10 text-neutral-300 hover:bg-white/20"
                    )}
                  >
                    {r.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleLoginSubmit} className="p-6 sm:p-7 space-y-4 bg-white">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-700 ml-1">
                  Email Terdaftar
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type="email"
                    placeholder="nama@nibras.com"
                    className="h-12 pl-11 rounded-2xl bg-[#F5F3F0] border-transparent focus:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900 font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-black uppercase tracking-widest text-neutral-700 ml-1">
                  Kata Sandi
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    className="h-12 pl-11 rounded-2xl bg-[#F5F3F0] border-transparent focus:border-neutral-900 focus-visible:ring-1 focus-visible:ring-neutral-900 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-13 py-3.5 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-black text-xs uppercase tracking-[0.15em] shadow-xl transition-all duration-300 mt-2"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    MEMVERIFIKASI...
                  </>
                ) : (
                  <>
                    MASUK SEKARANG
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-[10px] text-neutral-400 font-medium text-center pt-1">
                Gunakan email & password resmi yang terdaftar pada sistem Owner.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
