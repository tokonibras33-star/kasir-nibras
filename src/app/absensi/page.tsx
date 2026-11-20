"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Clock,
  MapPin,
  LogOut,
  Home,
  CheckCircle2,
  XCircle,
  RefreshCw,
  CalendarDays,
  User,
  Camera,
  Loader2,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  KaryawanData,
  AbsensiLogData,
  AbsensiConfig,
  DEFAULT_LOCATION,
  getBranchName,
  getDistanceMeters,
  uploadAttendanceSelfie,
} from "@/lib/absensi-utils";

const STORAGE_KEY = "nibras_absensi_user";

export default function AbsensiKaryawanPage() {
  const { auth, firestore: db } = useFirebase();
  const router = useRouter();

  const [user, setUser] = useState<KaryawanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceToday, setAttendanceToday] = useState<AbsensiLogData | null>(null);
  const [isWithinRadius, setIsWithinRadius] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({ username: "", password: "" });
  const [history, setHistory] = useState<AbsensiLogData[]>([]);
  const [config, setConfig] = useState<AbsensiConfig | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "absensi_config"));
      if (snap.exists()) {
        setConfig(snap.data() as AbsensiConfig);
      } else {
        setConfig({
          locations: {
            TOKO_A: DEFAULT_LOCATION,
            TOKO_B: DEFAULT_LOCATION,
            TOKO_C: DEFAULT_LOCATION,
          },
        });
      }
    } catch (e) {
      console.error("[ABSENSI] Failed to fetch config:", e);
    }
  }, [db]);

  const fetchAttendanceData = useCallback(
    async (karyawanId: string) => {
      try {
        const todayLocale = new Date().toLocaleDateString("id-ID");
        const todayIso = format(new Date(), "yyyy-MM-dd");
        const q = query(
          collection(db, "absensi_logs"),
          where("karyawanId", "==", karyawanId)
        );
        const snapshot = await getDocs(q);
        const logs = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() } as AbsensiLogData))
          .sort((a, b) => {
            const ta = a.timestamp?.toDate?.()?.getTime?.() || 0;
            const tb = b.timestamp?.toDate?.()?.getTime?.() || 0;
            return tb - ta;
          });

        setHistory(logs.slice(0, 7));
        const todayLog = logs.find(
          (l) => l.dateIso === todayIso || l.tanggal === todayLocale
        );
        setAttendanceToday(todayLog || null);
      } catch (e) {
        console.error("[ABSENSI] Failed to fetch attendance history:", e);
      }
    },
    [db]
  );

  // Live clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Restore persisted employee session
  useEffect(() => {
    const restore = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && auth.currentUser) {
          const parsed = JSON.parse(saved) as KaryawanData;
          setUser(parsed);
          await Promise.all([fetchConfig(), fetchAttendanceData(parsed.id)]);
        } else if (saved && !auth.currentUser) {
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setCheckingAuth(false);
      }
    };
    restore();
  }, [auth, fetchConfig, fetchAttendanceData]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const getActiveBranchLocation = useCallback(() => {
    if (!config) return DEFAULT_LOCATION;
    const branchKey = user?.cabang || "TOKO_A";
    if (config.locations?.[branchKey]?.lat && config.locations?.[branchKey]?.lng) {
      return config.locations[branchKey];
    }
    if (config.lat && config.lng) {
      return { lat: config.lat, lng: config.lng, radius: config.radius || "100" };
    }
    return DEFAULT_LOCATION;
  }, [config, user]);

  const validateLocation = useCallback(
    (showToast = false) => {
      const locConfig = getActiveBranchLocation();
      if (!locConfig.lat || !locConfig.lng) return;

      if (!navigator.geolocation) {
        setLocationError("Browser ini tidak mendukung deteksi GPS.");
        setIsWithinRadius(false);
        return;
      }

      setCheckingLocation(true);
      setLocationError(null);

      const onSuccess = (position: GeolocationPosition) => {
        const dist = getDistanceMeters(
          position.coords.latitude,
          position.coords.longitude,
          parseFloat(locConfig.lat),
          parseFloat(locConfig.lng)
        );
        const rounded = Math.round(dist);
        const maxRadius = parseFloat(locConfig.radius || "100");
        const inside = rounded <= maxRadius;

        setDistance(rounded);
        setIsWithinRadius(inside);
        setCheckingLocation(false);
        setLocationError(null);

        if (showToast) {
          toast({
            title: inside ? "Lokasi Terverifikasi" : "Di Luar Radius Toko",
            description: inside
              ? `Jarak Anda ${rounded}m dari toko (batas ${maxRadius}m).`
              : `Jarak Anda ${rounded}m dari toko (batas maksimal ${maxRadius}m).`,
            variant: inside ? "default" : "destructive",
          });
        }
      };

      const onError = (error: GeolocationPositionError) => {
        if (error.code === error.TIMEOUT) {
          navigator.geolocation.getCurrentPosition(
            onSuccess,
            () => {
              setIsWithinRadius(false);
              setCheckingLocation(false);
              setLocationError("Waktu permintaan GPS habis. Pastikan GPS aktif.");
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
          );
          return;
        }
        let msg = "Gagal membaca koordinat GPS.";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "Izin lokasi ditolak. Aktifkan GPS di pengaturan browser/HP.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = "Sinyal GPS tidak tersedia pada perangkat ini.";
        }
        setLocationError(msg);
        setIsWithinRadius(false);
        setCheckingLocation(false);
        if (showToast) {
          toast({ title: "GPS Bermasalah", description: msg, variant: "destructive" });
        }
      };

      navigator.geolocation.getCurrentPosition(onSuccess, onError, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      });
    },
    [getActiveBranchLocation]
  );

  useEffect(() => {
    if (user && config) {
      validateLocation(false);
      const interval = setInterval(() => validateLocation(false), 15000);
      return () => clearInterval(interval);
    }
  }, [user, config, validateLocation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = loginData.username.trim().toLowerCase();
    const cleanPass = loginData.password.trim();

    if (!cleanUser || !cleanPass) {
      toast({ title: "Gagal", description: "Masukkan Username dan Password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Authenticate Firebase session for Firestore read/write access
      const emailDomain = process.env.NEXT_PUBLIC_ABSENSI_EMAIL_DOMAIN || "absensi.nibrashouse.id";
      const synthEmail = `${cleanUser.replace(/[^a-z0-9._-]/g, "")}@${emailDomain}`;
      const sessionKey = process.env.NEXT_PUBLIC_ABSENSI_SESSION_KEY || "";
      const fallbackPass = cleanPass.length >= 6 ? cleanPass : cleanPass.padEnd(6, "0");
      const authPass = sessionKey.length >= 6 ? sessionKey : fallbackPass;

      try {
        await signInWithEmailAndPassword(auth, synthEmail, authPass);
      } catch {
        try {
          await createUserWithEmailAndPassword(auth, synthEmail, authPass);
        } catch {
          // If already exists with another pass, try user's pass directly
          await signInWithEmailAndPassword(auth, synthEmail, fallbackPass);
        }
      }

      // Verify employee credentials against Firestore `karyawan` collection
      const q = query(collection(db, "karyawan"), where("username", "==", cleanUser));
      const snap = await getDocs(q);

      if (snap.empty) {
        await signOut(auth);
        toast({
          title: "Login Gagal",
          description: "Username tidak terdaftar. Hubungi Owner untuk mendaftarkan akun karyawan.",
          variant: "destructive",
        });
        return;
      }

      const empDoc = snap.docs[0];
      const empData = { id: empDoc.id, ...empDoc.data() } as KaryawanData;

      if (String(empData.password || "").trim() !== cleanPass) {
        await signOut(auth);
        toast({
          title: "Password Salah",
          description: "Password tidak sesuai. Periksa huruf besar/kecil.",
          variant: "destructive",
        });
        return;
      }

      if (empData.status === "Nonaktif") {
        await signOut(auth);
        toast({
          title: "Akun Nonaktif",
          description: "Akun karyawan Anda dinonaktifkan. Hubungi Owner.",
          variant: "destructive",
        });
        return;
      }

      // Strip plaintext password before persisting employee session to localStorage
      const { password: _omittedPassword, ...safeEmpData } = empData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeEmpData));
      setUser(safeEmpData as KaryawanData);
      setLoginData({ username: "", password: "" });
      await Promise.all([fetchConfig(), fetchAttendanceData(empData.id)]);
      toast({ title: "Selamat Datang", description: `Berhasil masuk sebagai ${empData.nama}` });
    } catch (err: any) {
      console.error("[ABSENSI LOGIN ERROR]:", err);
      toast({
        title: "Login Gagal",
        description: err?.message || "Terjadi kesalahan saat masuk ke portal absensi.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    stopCamera();
    localStorage.removeItem(STORAGE_KEY);
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setUser(null);
    setAttendanceToday(null);
    setHistory([]);
    setSelfiePreview(null);
  };

  const startCamera = async () => {
    if (!isWithinRadius) {
      toast({
        title: "Luar Radius Toko",
        description: "Mendekat ke area toko terlebih dahulu sebelum membuka kamera.",
        variant: "destructive",
      });
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ title: "Kamera Tidak Didukung", description: "Gunakan browser modern di HP/PC.", variant: "destructive" });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraReady(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      toast({
        title: "Gagal Membuka Kamera",
        description: "Pastikan izin akses kamera telah diberikan pada browser.",
        variant: "destructive",
      });
    }
  };

  const captureSelfie = async (): Promise<string | null> => {
    if (!videoRef.current || !cameraReady) {
      toast({ title: "Kamera Belum Aktif", description: "Klik 'Buka Kamera' terlebih dahulu.", variant: "destructive" });
      return null;
    }
    setCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      const maxW = 480;
      const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1;
      canvas.width = Math.round(video.videoWidth * scale) || 480;
      canvas.height = Math.round(video.videoHeight * scale) || 360;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      const uploadedUrl = await uploadAttendanceSelfie(file, dataUrl, config);
      setSelfiePreview(uploadedUrl);
      return uploadedUrl;
    } catch (e) {
      console.error("[ABSENSI] Selfie capture error:", e);
      toast({ title: "Gagal Mengambil Foto", description: "Silakan coba lagi.", variant: "destructive" });
      return null;
    } finally {
      setCapturing(false);
    }
  };

  const handleAbsen = async (type: "masuk" | "pulang") => {
    if (!user) return;
    if (!isWithinRadius) {
      toast({
        title: "Luar Radius Toko",
        description: "Anda berada di luar jangkauan GPS toko. Silakan mendekat dan cek ulang GPS.",
        variant: "destructive",
      });
      return;
    }

    let currentSelfie = selfiePreview;
    if (!currentSelfie) {
      if (cameraReady) {
        currentSelfie = await captureSelfie();
      }
      if (!currentSelfie) {
        toast({
          title: "Foto Selfie Wajib",
          description: "Klik 'Buka Kamera' lalu 'Ambil Selfie' terlebih dahulu.",
          variant: "destructive",
        });
        return;
      }
    }

    setSubmitting(true);
    const todayLocale = new Date().toLocaleDateString("id-ID");
    const todayIso = format(new Date(), "yyyy-MM-dd");
    const time = currentTime.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    try {
      const branchId = user.cabang || "TOKO_A";
      const branchName = getBranchName(branchId);

      if (type === "masuk") {
        const docRef = await addDoc(collection(db, "absensi_logs"), {
          karyawanId: user.id,
          nama: user.nama,
          shift: user.shift || "shift1",
          cabang: branchId,
          cabangName: branchName,
          tanggal: todayLocale,
          dateIso: todayIso,
          jamMasuk: time,
          jamPulang: "-",
          selfieUrl: currentSelfie,
          selfieMasukUrl: currentSelfie,
          timestamp: serverTimestamp(),
        });
        setAttendanceToday({
          id: docRef.id,
          karyawanId: user.id,
          nama: user.nama,
          shift: user.shift || "shift1",
          cabang: branchId,
          cabangName: branchName,
          tanggal: todayLocale,
          dateIso: todayIso,
          jamMasuk: time,
          jamPulang: "-",
          selfieUrl: currentSelfie,
          selfieMasukUrl: currentSelfie,
        });
        toast({ title: "Absen Masuk Berhasil!", description: `Tercatat pukul ${time}` });
      } else {
        if (attendanceToday?.id) {
          await updateDoc(doc(db, "absensi_logs", attendanceToday.id), {
            jamPulang: time,
            selfiePulangUrl: currentSelfie,
            updatedAt: serverTimestamp(),
          });
          setAttendanceToday((prev) =>
            prev ? { ...prev, jamPulang: time, selfiePulangUrl: currentSelfie || undefined } : prev
          );
        } else {
          const docRef = await addDoc(collection(db, "absensi_logs"), {
            karyawanId: user.id,
            nama: user.nama,
            shift: user.shift || "shift1",
            cabang: branchId,
            cabangName: branchName,
            tanggal: todayLocale,
            dateIso: todayIso,
            jamMasuk: "-",
            jamPulang: time,
            selfieUrl: currentSelfie,
            selfiePulangUrl: currentSelfie,
            timestamp: serverTimestamp(),
          });
          setAttendanceToday({
            id: docRef.id,
            karyawanId: user.id,
            nama: user.nama,
            shift: user.shift || "shift1",
            cabang: branchId,
            cabangName: branchName,
            tanggal: todayLocale,
            dateIso: todayIso,
            jamMasuk: "-",
            jamPulang: time,
            selfiePulangUrl: currentSelfie,
          });
        }
        toast({ title: "Absen Pulang Berhasil!", description: `Tercatat pukul ${time}` });
      }

      setSelfiePreview(null);
      stopCamera();
      await fetchAttendanceData(user.id);
    } catch (e) {
      console.error("[ABSENSI] Submit error:", e);
      toast({ title: "Gagal Menyimpan Absensi", description: "Coba lagi beberapa saat.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#C82368]" />
      </div>
    );
  }

  // LOGIN SCREEN
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F3F0] flex flex-col items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md rounded-3xl p-6 sm:p-9 bg-white border border-neutral-200/80 shadow-2xl">
          <div className="text-center mb-7">
            <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-[#1F7A63]/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-7 w-7 sm:h-8 sm:w-8 text-[#1F7A63]" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#C82368]">Nibras House Official</p>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-neutral-950 tracking-tight mt-1">
              Absensi Karyawan
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Masuk dengan username &amp; password karyawan cabang.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-1">
                Username Karyawan
              </Label>
              <Input
                value={loginData.username}
                onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                className="h-11 rounded-2xl bg-[#F5F3F0] border-transparent focus:border-neutral-900 font-bold text-sm px-4"
                placeholder="Masukkan username..."
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-neutral-500 ml-1">
                Password
              </Label>
              <Input
                type="password"
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="h-11 rounded-2xl bg-[#F5F3F0] border-transparent focus:border-neutral-900 font-bold text-sm px-4"
                placeholder="••••••••"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-[#1F7A63] hover:bg-[#175c4a] text-white font-bold uppercase tracking-widest text-xs shadow-lg mt-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {loading ? "Memverifikasi..." : "Masuk Portal Absensi"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-[#C82368] transition-colors"
            >
              ← Kembali ke Halaman Utama
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // PORTAL ABSENSI SCREEN
  return (
    <div className="min-h-screen bg-[#F5F3F0] flex flex-col items-center p-3.5 sm:p-6 pb-14">
      {/* Top User Bar */}
      <div className="w-full max-w-2xl flex items-center justify-between gap-2 mb-4 sm:mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-neutral-950 text-white flex items-center justify-center shrink-0 shadow-sm">
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-lg font-serif font-bold text-neutral-950 uppercase truncate leading-tight">
              {user.nama}
            </h2>
            <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#C82368]/10 text-[#C82368]">
                <Building2 className="h-2.5 w-2.5" /> {getBranchName(user.cabang)}
              </span>
              <span className="text-[9px] font-bold uppercase text-neutral-500">
                {user.shift === "shift2" ? "Shift 2 (Siang)" : "Shift 1 (Pagi)"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            onClick={async () => {
              await handleLogout();
              router.push("/login");
            }}
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white border-neutral-200"
            title="Beranda"
          >
            <Home className="h-4 w-4 text-neutral-600" />
          </Button>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white border-rose-200 text-rose-600 hover:bg-rose-50"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Digital Clock & GPS Card */}
      <Card className="w-full max-w-2xl bg-neutral-950 rounded-3xl p-5 sm:p-8 text-white shadow-xl relative overflow-hidden mb-4">
        <div className="relative z-10">
          <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">
            {currentTime.toLocaleDateString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="flex items-baseline gap-1.5 mb-5 sm:mb-6">
            <h1 className="text-5xl sm:text-7xl font-serif font-bold tracking-tight tabular-nums">
              {currentTime.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
            </h1>
            <span className="text-lg sm:text-2xl text-[#C82368] font-bold tabular-nums">
              :{currentTime.toLocaleTimeString("id-ID", { second: "2-digit" })}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-wider",
                isWithinRadius
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                  : "bg-rose-500/20 border-rose-500/40 text-rose-200"
              )}
            >
              <MapPin className="h-3 w-3 shrink-0" />
              <span>
                {isWithinRadius
                  ? `Dalam Area Toko (${distance ?? 0}m)`
                  : distance !== null
                  ? `Luar Radius (${distance}m)`
                  : locationError || "Mencari GPS..."}
              </span>
              <button
                type="button"
                onClick={() => validateLocation(true)}
                className="ml-1 p-0.5 hover:bg-white/20 rounded-full transition-colors"
                title="Cek Ulang GPS"
              >
                <RefreshCw className={cn("h-3 w-3", checkingLocation && "animate-spin")} />
              </button>
            </div>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
          <Clock className="h-44 w-44" />
        </div>
      </Card>

      {/* Camera Selfie Card */}
      <Card className="w-full max-w-2xl rounded-2xl sm:rounded-3xl bg-white p-4 sm:p-6 border border-neutral-200/70 shadow-sm mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Selfie Absensi
            </p>
            <p className="text-xs sm:text-sm font-bold text-neutral-900">
              Ambil foto langsung dari kamera
            </p>
          </div>
          <Button
            onClick={startCamera}
            disabled={!isWithinRadius}
            className="rounded-full bg-[#C82368] hover:bg-[#a61c55] text-white h-8 sm:h-9 px-3.5 text-[10px] sm:text-xs font-bold disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5 mr-1.5" /> Buka Kamera
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div className="rounded-2xl border border-neutral-200 overflow-hidden bg-neutral-100 aspect-[4/3] flex items-center justify-center">
            {cameraReady ? (
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
            ) : (
              <p className="text-center text-[10px] font-bold uppercase tracking-widest text-neutral-400 px-4">
                Kamera belum aktif
              </p>
            )}
          </div>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={captureSelfie}
                disabled={capturing || !cameraReady}
                className="rounded-full bg-neutral-950 hover:bg-neutral-800 text-white h-9 font-bold uppercase text-[10px]"
              >
                {capturing ? "Memproses..." : "Ambil Selfie"}
              </Button>
              <Button
                onClick={stopCamera}
                variant="outline"
                disabled={!cameraReady}
                className="rounded-full h-9 font-bold uppercase text-[10px]"
              >
                Tutup Kamera
              </Button>
            </div>
            {selfiePreview ? (
              <img
                src={selfiePreview}
                alt="Preview Selfie"
                className="w-full h-36 sm:h-40 object-cover rounded-2xl border border-neutral-200"
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-200 h-24 sm:h-32 flex items-center justify-center text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                Foto selfie belum diambil
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Absen Masuk & Pulang Cards (Always 2 per row) */}
      <div className="w-full max-w-2xl grid grid-cols-2 gap-2.5 sm:gap-4 mb-4">
        <Card className="rounded-2xl sm:rounded-3xl bg-white p-3.5 sm:p-6 border border-neutral-200/70 shadow-sm flex flex-col gap-2">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Absen Masuk
          </p>
          <p className="text-lg sm:text-2xl font-serif font-bold text-neutral-950 tabular-nums">
            {attendanceToday?.jamMasuk || "--:--:--"}
          </p>
          {attendanceToday?.jamMasuk && attendanceToday.jamMasuk !== "-" ? (
            <span className="w-fit px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase">
              Sudah Masuk
            </span>
          ) : (
            <Button
              disabled={!isWithinRadius || submitting}
              onClick={() => handleAbsen("masuk")}
              className="mt-1 w-full rounded-full bg-[#1F7A63] hover:bg-[#175c4a] text-white font-bold uppercase text-[10px] sm:text-xs h-9 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Absen Masuk"}
            </Button>
          )}
        </Card>

        <Card className="rounded-2xl sm:rounded-3xl bg-white p-3.5 sm:p-6 border border-neutral-200/70 shadow-sm flex flex-col gap-2">
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            Absen Pulang
          </p>
          <p className="text-lg sm:text-2xl font-serif font-bold text-neutral-950 tabular-nums">
            {attendanceToday?.jamPulang || "--:--:--"}
          </p>
          {attendanceToday?.jamPulang && attendanceToday.jamPulang !== "-" ? (
            <span className="w-fit px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase">
              Selesai
            </span>
          ) : attendanceToday?.jamMasuk && attendanceToday.jamMasuk !== "-" ? (
            <Button
              disabled={!isWithinRadius || submitting}
              onClick={() => handleAbsen("pulang")}
              className="mt-1 w-full rounded-full bg-[#C82368] hover:bg-[#a61c55] text-white font-bold uppercase text-[10px] sm:text-xs h-9 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Absen Pulang"}
            </Button>
          ) : (
            <span className="text-[9px] font-bold text-neutral-400 uppercase mt-1">
              Absen masuk dulu
            </span>
          )}
        </Card>
      </div>

      {/* Status Banners */}
      {attendanceToday?.jamMasuk && attendanceToday.jamMasuk !== "-" && (
        <div className="w-full max-w-2xl rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-center justify-center gap-2.5 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Kehadiran Hari Ini Terverifikasi
          </p>
        </div>
      )}

      {!isWithinRadius && (
        <div className="w-full max-w-2xl rounded-2xl bg-rose-50 border border-rose-200 p-3.5 flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <XCircle className="h-5 w-5 text-rose-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">Luar Radius Toko</p>
              <p className="text-[10px] text-rose-500 truncate">
                {locationError || (distance !== null ? `Jarak Anda ${distance} meter dari titik toko` : "Mengecek koordinat GPS...")}
              </p>
            </div>
          </div>
          <Button
            onClick={() => validateLocation(true)}
            variant="outline"
            size="sm"
            className="rounded-full h-8 text-[10px] font-bold border-rose-200 text-rose-700 shrink-0"
          >
            <RefreshCw className={cn("h-3 w-3 mr-1", checkingLocation && "animate-spin")} /> Cek GPS
          </Button>
        </div>
      )}

      {/* Attendance History */}
      <div className="w-full max-w-2xl mt-2">
        <div className="flex items-center gap-2 mb-3 px-1">
          <CalendarDays className="h-4 w-4 text-[#C82368]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-700">
            Riwayat Kehadiran Terbaru
          </h3>
        </div>
        <div className="space-y-2.5">
          {history.length > 0 ? (
            history.map((log) => (
              <Card key={log.id} className="rounded-2xl p-3.5 sm:p-4 bg-white border border-neutral-200/70 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-neutral-900">{log.tanggal}</p>
                    <p className="text-[10px] font-medium text-neutral-500 tabular-nums">
                      Masuk: <strong className="text-neutral-800">{log.jamMasuk}</strong> • Pulang:{" "}
                      <strong className="text-neutral-800">{log.jamPulang}</strong>
                    </p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase">
                    {log.statusManual || "Hadir"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold uppercase text-neutral-400">Foto Masuk</span>
                    {log.selfieMasukUrl || log.selfieUrl ? (
                      <img
                        src={log.selfieMasukUrl || log.selfieUrl}
                        alt="Selfie Masuk"
                        className="w-full h-24 object-cover rounded-xl border border-neutral-200"
                      />
                    ) : (
                      <div className="w-full h-24 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center text-[9px] text-neutral-400">
                        Tidak Ada Foto
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className="text-[8px] font-bold uppercase text-neutral-400">Foto Pulang</span>
                    {log.selfiePulangUrl ? (
                      <img
                        src={log.selfiePulangUrl}
                        alt="Selfie Pulang"
                        className="w-full h-24 object-cover rounded-xl border border-neutral-200"
                      />
                    ) : (
                      <div className="w-full h-24 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 flex items-center justify-center text-[9px] text-neutral-400">
                        Belum Pulang
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <p className="text-center py-8 text-xs text-neutral-400 italic">
              Belum ada riwayat absensi.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
