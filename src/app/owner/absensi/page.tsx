"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  MapPin,
  Camera,
  Users,
  Monitor,
  Trash2,
  CalendarDays,
  Pencil,
  Eye,
  Plus,
  Save,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Navigation,
  Loader2,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import {
  collection,
  doc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import {
  ABSENSI_STORES,
  BranchStoreId,
  KaryawanData,
  AbsensiLogData,
  ShiftsConfig,
  BranchLocationConfig,
  AbsensiConfig,
  DEFAULT_SHIFTS,
  DEFAULT_LOCATION,
  getBranchName,
  evaluateAttendance,
  calculateTotalWorkHours,
} from "@/lib/absensi-utils";

const STATUS_BADGE_MAP: Record<string, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-800",
  rose: "bg-rose-100 text-rose-700",
  indigo: "bg-indigo-100 text-indigo-700",
  sky: "bg-sky-100 text-sky-700",
  purple: "bg-purple-100 text-purple-700",
  slate: "bg-neutral-100 text-neutral-700",
};

const MANUAL_STATUS_OPTIONS = ["Hadir", "Ijin", "Sakit", "Alpha", "Cuti", "Libur", "Tugas Luar"] as const;

export default function OwnerAbsensiPage() {
  const db = useFirestore();
  const [activeTab, setActiveTab] = useState("monitoring");
  const [selectedBranch, setSelectedBranch] = useState<string>("ALL");
  const [configBranch, setConfigBranch] = useState<BranchStoreId>("TOKO_A");
  const [filterMode, setFilterMode] = useState<"daily" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [searchTerm, setSearchTerm] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [gettingGps, setGettingGps] = useState(false);

  // Config states per branch
  const [branchShifts, setBranchShifts] = useState<Record<string, ShiftsConfig>>({
    TOKO_A: { ...DEFAULT_SHIFTS },
    TOKO_B: { ...DEFAULT_SHIFTS },
    TOKO_C: { ...DEFAULT_SHIFTS },
  });
  const [branchLocations, setBranchLocations] = useState<Record<string, BranchLocationConfig>>({
    TOKO_A: { ...DEFAULT_LOCATION },
    TOKO_B: { ...DEFAULT_LOCATION },
    TOKO_C: { ...DEFAULT_LOCATION },
  });
  const [cloudinaryConfig, setCloudinaryConfig] = useState({
    cloudinaryCloudName: "",
    cloudinaryUploadPreset: "",
    cloudinaryFolder: "absensi-selfie",
  });

  // Employee CRUD modal states
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<KaryawanData | null>(null);
  const [empForm, setEmpForm] = useState({
    nama: "",
    username: "",
    password: "",
    cabang: "TOKO_A" as BranchStoreId,
    shift: "shift1" as "shift1" | "shift2",
    jabatan: "Kasir / Pramuniaga",
    status: "Aktif" as "Aktif" | "Nonaktif",
  });

  // Photo preview & manual status override modals
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string; subtitle: string } | null>(null);
  const [editingLog, setEditingLog] = useState<AbsensiLogData | null>(null);
  const [editLogForm, setEditLogForm] = useState({
    statusManual: "Hadir",
    jamMasuk: "",
    jamPulang: "",
    keterangan: "",
  });

  // Load config from Firestore
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "settings", "absensi_config"));
        if (snap.exists()) {
          const data = snap.data() as AbsensiConfig;
          if (data.shifts) {
            setBranchShifts((prev) => ({
              TOKO_A: data.shifts?.TOKO_A || prev.TOKO_A,
              TOKO_B: data.shifts?.TOKO_B || prev.TOKO_B,
              TOKO_C: data.shifts?.TOKO_C || prev.TOKO_C,
            }));
          }
          if (data.locations) {
            setBranchLocations((prev) => ({
              TOKO_A: data.locations?.TOKO_A || prev.TOKO_A,
              TOKO_B: data.locations?.TOKO_B || prev.TOKO_B,
              TOKO_C: data.locations?.TOKO_C || prev.TOKO_C,
            }));
          }
          setCloudinaryConfig({
            cloudinaryCloudName: data.cloudinaryCloudName || "",
            cloudinaryUploadPreset: data.cloudinaryUploadPreset || "",
            cloudinaryFolder: data.cloudinaryFolder || "absensi-selfie",
          });
        }
      } catch (e) {
        console.error("[OWNER ABSENSI] Failed to load config:", e);
      }
    };
    loadConfig();
  }, [db]);

  // Real-time Firestore collections
  const karyawanQuery = useMemoFirebase(() => query(collection(db, "karyawan"), orderBy("nama", "asc")), [db]);
  const logsQuery = useMemoFirebase(() => query(collection(db, "absensi_logs"), orderBy("timestamp", "desc")), [db]);

  const { data: karyawanRaw } = useCollection<KaryawanData>(karyawanQuery);
  const { data: logsRaw } = useCollection<AbsensiLogData>(logsQuery);

  const karyawanList = useMemo(() => karyawanRaw || [], [karyawanRaw]);
  const allLogs = useMemo(() => logsRaw || [], [logsRaw]);

  const filteredKaryawan = useMemo(() => {
    return karyawanList.filter((k) => {
      const matchBranch = selectedBranch === "ALL" || k.cabang === selectedBranch;
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        (k.nama || "").toLowerCase().includes(q) ||
        (k.username || "").toLowerCase().includes(q) ||
        (k.jabatan || "").toLowerCase().includes(q);
      return matchBranch && matchSearch;
    });
  }, [karyawanList, selectedBranch, searchTerm]);

  const filteredLogs = useMemo(() => {
    const targetDateLocale = new Date(selectedDate + "T00:00:00").toLocaleDateString("id-ID");
    return allLogs.filter((log) => {
      const matchBranch = selectedBranch === "ALL" || log.cabang === selectedBranch;
      let matchPeriod = true;
      if (filterMode === "daily") {
        matchPeriod = log.dateIso ? log.dateIso === selectedDate : log.tanggal === targetDateLocale;
      } else {
        if (log.dateIso) {
          matchPeriod = log.dateIso.startsWith(selectedMonth);
        } else if (log.tanggal) {
          const parts = log.tanggal.split("/");
          if (parts.length === 3) {
            const isoPrefix = `${parts[2]}-${parts[1].padStart(2, "0")}`;
            matchPeriod = isoPrefix === selectedMonth;
          }
        }
      }
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !q ||
        (log.nama || "").toLowerCase().includes(q) ||
        (log.cabangName || "").toLowerCase().includes(q) ||
        (log.keterangan || "").toLowerCase().includes(q);
      return matchBranch && matchPeriod && matchSearch;
    });
  }, [allLogs, selectedBranch, filterMode, selectedDate, selectedMonth, searchTerm]);

  const monitoringStats = useMemo(() => {
    let hadir = 0;
    let tepatWaktu = 0;
    let terlambat = 0;
    let tidakHadir = 0;

    filteredLogs.forEach((log) => {
      const ev = evaluateAttendance(log, branchShifts[log.cabang || "TOKO_A"]);
      if (["Ijin", "Sakit", "Alpha", "Cuti", "Libur"].includes(ev.statusText)) {
        tidakHadir++;
      } else {
        hadir++;
        if (ev.isLate) terlambat++;
        else tepatWaktu++;
      }
    });

    return { hadir, tepatWaktu, terlambat, tidakHadir };
  }, [filteredLogs, branchShifts]);

  // Save config to Firestore
  const saveAbsensiConfig = async (
    nextShifts = branchShifts,
    nextLocations = branchLocations,
    nextCloud = cloudinaryConfig
  ) => {
    setIsSavingConfig(true);
    try {
      await setDoc(
        doc(db, "settings", "absensi_config"),
        {
          shifts: nextShifts,
          locations: nextLocations,
          lat: nextLocations.TOKO_A.lat,
          lng: nextLocations.TOKO_A.lng,
          radius: nextLocations.TOKO_A.radius,
          ...nextCloud,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast({ title: "Pengaturan Disimpan", description: "Konfigurasi absensi berhasil diperbarui." });
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal Menyimpan", variant: "destructive" });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      toast({ title: "GPS Tidak Didukung", variant: "destructive" });
      return;
    }
    setGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBranchLocations((prev) => ({
          ...prev,
          [configBranch]: {
            ...prev[configBranch],
            lat: pos.coords.latitude.toFixed(6),
            lng: pos.coords.longitude.toFixed(6),
          },
        }));
        setGettingGps(false);
        toast({ title: "Koordinat Diperoleh", description: `GPS ${getBranchName(configBranch)} diperbarui.` });
      },
      () => {
        setGettingGps(false);
        toast({ title: "Gagal Mendapatkan GPS", description: "Pastikan izin lokasi browser aktif.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Employee CRUD handlers
  const openAddEmployee = () => {
    setEditingEmp(null);
    setEmpForm({
      nama: "",
      username: "",
      password: "",
      cabang: selectedBranch !== "ALL" ? (selectedBranch as BranchStoreId) : "TOKO_A",
      shift: "shift1",
      jabatan: "Kasir / Pramuniaga",
      status: "Aktif",
    });
    setIsEmpModalOpen(true);
  };

  const openEditEmployee = (emp: KaryawanData) => {
    setEditingEmp(emp);
    setEmpForm({
      nama: emp.nama || "",
      username: emp.username || "",
      password: emp.password || "",
      cabang: emp.cabang || "TOKO_A",
      shift: emp.shift || "shift1",
      jabatan: emp.jabatan || "Kasir / Pramuniaga",
      status: emp.status || "Aktif",
    });
    setIsEmpModalOpen(true);
  };

  const handleSaveEmployee = async () => {
    const cleanName = empForm.nama.trim();
    const cleanUser = empForm.username.trim().toLowerCase().replace(/\s+/g, "");
    const cleanPass = empForm.password.trim();

    if (!cleanName || !cleanUser || !cleanPass) {
      toast({ title: "Data Belum Lengkap", description: "Nama, Username, dan Password wajib diisi.", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        nama: cleanName,
        username: cleanUser,
        password: cleanPass,
        cabang: empForm.cabang,
        shift: empForm.shift,
        jabatan: empForm.jabatan.trim() || "Staf Toko",
        status: empForm.status,
        updatedAt: serverTimestamp(),
      };

      if (editingEmp) {
        await updateDoc(doc(db, "karyawan", editingEmp.id), payload);
        toast({ title: "Karyawan Diperbarui", description: `${cleanName} berhasil disimpan.` });
      } else {
        await addDoc(collection(db, "karyawan"), { ...payload, createdAt: serverTimestamp() });
        toast({ title: "Karyawan Ditambahkan", description: `${cleanName} kini bisa login di Portal Absensi.` });
      }
      setIsEmpModalOpen(false);
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal Menyimpan Karyawan", variant: "destructive" });
    }
  };

  const handleDeleteEmployee = async (emp: KaryawanData) => {
    if (!confirm(`Hapus akun karyawan ${emp.nama}?`)) return;
    try {
      await deleteDoc(doc(db, "karyawan", emp.id));
      toast({ title: "Karyawan Dihapus" });
    } catch {
      toast({ title: "Gagal Menghapus", variant: "destructive" });
    }
  };

  const handleQuickShiftChange = async (emp: KaryawanData, nextShift: "shift1" | "shift2") => {
    try {
      await updateDoc(doc(db, "karyawan", emp.id), { shift: nextShift, updatedAt: serverTimestamp() });
      toast({ title: "Shift Diperbarui", description: `${emp.nama} -> ${nextShift === "shift1" ? "Shift 1 (Pagi)" : "Shift 2 (Siang)"}` });
    } catch {
      toast({ title: "Gagal Update Shift", variant: "destructive" });
    }
  };

  // Manual status override for attendance logs
  const openEditLogModal = (log: AbsensiLogData) => {
    setEditingLog(log);
    setEditLogForm({
      statusManual: log.statusManual || "Hadir",
      jamMasuk: log.jamMasuk || "-",
      jamPulang: log.jamPulang || "-",
      keterangan: log.keterangan || "",
    });
  };

  const handleSaveLogEdit = async () => {
    if (!editingLog) return;
    try {
      await updateDoc(doc(db, "absensi_logs", editingLog.id), {
        statusManual: editLogForm.statusManual === "Hadir" ? "" : editLogForm.statusManual,
        jamMasuk: editLogForm.jamMasuk || "-",
        jamPulang: editLogForm.jamPulang || "-",
        keterangan: editLogForm.keterangan,
        updatedAt: serverTimestamp(),
      });
      setEditingLog(null);
      toast({ title: "Log Absensi Diperbarui" });
    } catch {
      toast({ title: "Gagal Memperbarui Log", variant: "destructive" });
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm("Hapus catatan absensi ini secara permanen?")) return;
    try {
      await deleteDoc(doc(db, "absensi_logs", logId));
      toast({ title: "Log Dihapus" });
    } catch {
      toast({ title: "Gagal Menghapus", variant: "destructive" });
    }
  };

  // Export Excel & PDF
  const handleExportExcel = () => {
    if (filteredLogs.length === 0) return;
    const headers = ["Tanggal", "Cabang", "Nama Karyawan", "Shift", "Jam Masuk", "Jam Pulang", "Durasi", "Status", "Catatan"];
    const rows = filteredLogs.map((log) => {
      const ev = evaluateAttendance(log, branchShifts[log.cabang || "TOKO_A"]);
      return [
        log.tanggal,
        log.cabangName || getBranchName(log.cabang),
        log.nama,
        ev.shiftLabel,
        log.jamMasuk,
        log.jamPulang,
        calculateTotalWorkHours(log.jamMasuk, log.jamPulang),
        ev.statusText,
        ev.notes,
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `rekap-absensi-${filterMode === "daily" ? selectedDate : selectedMonth}.xlsx`);
    toast({ title: "Excel Berhasil Diunduh" });
  };

  const handleExportPDF = () => {
    if (filteredLogs.length === 0) return;
    const docPdf = new jsPDF({ orientation: "landscape" });
    docPdf.text("Laporan Absensi Karyawan - Nibras House", 148, 12, { align: "center" });
    docPdf.setFontSize(10);
    docPdf.text(`Periode: ${filterMode === "daily" ? selectedDate : selectedMonth} | Cabang: ${selectedBranch}`, 148, 18, { align: "center" });
    const rows = filteredLogs.map((log) => {
      const ev = evaluateAttendance(log, branchShifts[log.cabang || "TOKO_A"]);
      return [
        log.tanggal,
        log.cabangName || getBranchName(log.cabang),
        log.nama,
        ev.shiftLabel,
        log.jamMasuk,
        log.jamPulang,
        calculateTotalWorkHours(log.jamMasuk, log.jamPulang),
        ev.statusText,
      ];
    });
    (docPdf as any).autoTable({
      head: [["Tanggal", "Cabang", "Karyawan", "Shift", "Masuk", "Pulang", "Durasi", "Status"]],
      body: rows,
      startY: 24,
      theme: "grid",
      headStyles: { fillColor: [23, 23, 23] },
    });
    docPdf.save(`rekap-absensi-${filterMode === "daily" ? selectedDate : selectedMonth}.pdf`);
    toast({ title: "PDF Berhasil Diunduh" });
  };

  return (
    <div className="space-y-4 sm:space-y-5 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">
            Attendance Control Center
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif text-neutral-900 tracking-tight">
            Absensi &amp; Pengaturan Karyawan
          </h1>
          <p className="text-neutral-500 text-xs sm:text-sm mt-0.5">
            Monitoring kehadiran selfie GPS, jadwal shift, lokasi cabang, dan akun karyawan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExportExcel} className="h-8 sm:h-9 rounded-full px-3.5 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white flex-1 sm:flex-none">
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-emerald-600" /> EXCEL
          </Button>
          <Button variant="outline" onClick={handleExportPDF} className="h-8 sm:h-9 rounded-full px-3.5 font-bold text-[11px] sm:text-xs border-neutral-200 bg-white flex-1 sm:flex-none">
            <FileText className="h-3.5 w-3.5 mr-1.5 text-[#C82368]" /> PDF
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full h-auto grid grid-cols-3 sm:grid-cols-6 gap-1 bg-white p-1.5 rounded-2xl border border-neutral-200/70 shadow-sm">
          <TabsTrigger value="monitoring" className="rounded-xl py-2 text-[10px] sm:text-xs font-bold gap-1 data-[state=active]:bg-neutral-950 data-[state=active]:text-white">
            <Monitor className="h-3.5 w-3.5" /> Monitoring
          </TabsTrigger>
          <TabsTrigger value="karyawan" className="rounded-xl py-2 text-[10px] sm:text-xs font-bold gap-1 data-[state=active]:bg-neutral-950 data-[state=active]:text-white">
            <Users className="h-3.5 w-3.5" /> Karyawan
          </TabsTrigger>
          <TabsTrigger value="penjadwalan" className="rounded-xl py-2 text-[10px] sm:text-xs font-bold gap-1 data-[state=active]:bg-neutral-950 data-[state=active]:text-white">
            <CalendarDays className="h-3.5 w-3.5" /> Jadwal
          </TabsTrigger>
          <TabsTrigger value="jam-kerja" className="rounded-xl py-2 text-[10px] sm:text-xs font-bold gap-1 data-[state=active]:bg-neutral-950 data-[state=active]:text-white">
            <Clock className="h-3.5 w-3.5" /> Jam Kerja
          </TabsTrigger>
          <TabsTrigger value="lokasi" className="rounded-xl py-2 text-[10px] sm:text-xs font-bold gap-1 data-[state=active]:bg-neutral-950 data-[state=active]:text-white">
            <MapPin className="h-3.5 w-3.5" /> Lokasi GPS
          </TabsTrigger>
          <TabsTrigger value="cloudinary" className="rounded-xl py-2 text-[10px] sm:text-xs font-bold gap-1 data-[state=active]:bg-neutral-950 data-[state=active]:text-white">
            <Camera className="h-3.5 w-3.5" /> Cloudinary
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: MONITORING ================= */}
        <TabsContent value="monitoring" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 bg-white p-3 sm:p-4 rounded-2xl sm:rounded-3xl shadow-sm border border-neutral-200/70">
            <div className="space-y-1">
              <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Mode</Label>
              <div className="flex bg-[#F5F3F0] p-1 rounded-full border border-neutral-200/70">
                <button onClick={() => setFilterMode("daily")} className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all", filterMode === "daily" ? "bg-neutral-950 text-white" : "text-neutral-500")}>HARIAN</button>
                <button onClick={() => setFilterMode("monthly")} className={cn("flex-1 py-1.5 text-[10px] font-bold rounded-full transition-all", filterMode === "monthly" ? "bg-neutral-950 text-white" : "text-neutral-500")}>BULANAN</button>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Periode</Label>
              {filterMode === "daily" ? (
                <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-9 rounded-full bg-[#F5F3F0] border-neutral-200/70 text-[11px] sm:text-xs font-bold px-3.5" />
              ) : (
                <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="h-9 rounded-full bg-[#F5F3F0] border-neutral-200/70 text-[11px] sm:text-xs font-bold px-3.5" />
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Cabang</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-9 rounded-full bg-[#F5F3F0] border-neutral-200/70 font-bold text-[11px] sm:text-xs px-3.5"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="ALL" className="text-xs font-bold">SEMUA CABANG</SelectItem>
                  {ABSENSI_STORES.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-400 ml-2">Cari</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input placeholder="Nama karyawan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 pl-8 rounded-full bg-[#F5F3F0] border-neutral-200/70 text-[11px] sm:text-xs" />
              </div>
            </div>
          </div>

          {/* 4 Summary Cards -> 2x2 on mobile */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            <Card className="rounded-2xl sm:rounded-3xl bg-neutral-950 text-white border-none p-3.5 sm:p-5">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Total Hadir</p>
              <p className="text-lg sm:text-2xl font-serif font-bold mt-0.5">{monitoringStats.hadir} <span className="text-xs font-sans font-normal text-neutral-400">Log</span></p>
            </Card>
            <Card className="rounded-2xl sm:rounded-3xl bg-[#1F7A63] text-white border-none p-3.5 sm:p-5">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase text-emerald-100 tracking-wider">Tepat Waktu</p>
              <p className="text-lg sm:text-2xl font-serif font-bold mt-0.5">{monitoringStats.tepatWaktu} <span className="text-xs font-sans font-normal text-emerald-100">Log</span></p>
            </Card>
            <Card className="rounded-2xl sm:rounded-3xl bg-white border border-neutral-200/70 p-3.5 sm:p-5">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Terlambat</p>
              <p className="text-lg sm:text-2xl font-serif font-bold text-amber-600 mt-0.5">{monitoringStats.terlambat} <span className="text-xs font-sans font-normal text-neutral-400">Log</span></p>
            </Card>
            <Card className="rounded-2xl sm:rounded-3xl bg-white border border-neutral-200/70 p-3.5 sm:p-5">
              <p className="text-[9px] sm:text-[10px] font-bold uppercase text-neutral-400 tracking-wider">Ijin / Sakit / Alpha</p>
              <p className="text-lg sm:text-2xl font-serif font-bold text-rose-600 mt-0.5">{monitoringStats.tidakHadir} <span className="text-xs font-sans font-normal text-neutral-400">Log</span></p>
            </Card>
          </div>

          <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 bg-white overflow-hidden shadow-sm">
            <CardContent className="p-0">
              {/* Mobile Zero-Scroll Cards */}
              <div className="md:hidden divide-y divide-neutral-100">
                {filteredLogs.length > 0 ? filteredLogs.map((log) => {
                  const ev = evaluateAttendance(log, branchShifts[log.cabang || "TOKO_A"]);
                  const workDur = calculateTotalWorkHours(log.jamMasuk, log.jamPulang);
                  return (
                    <div key={log.id} className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold uppercase text-neutral-950">{log.nama}</span>
                            <Badge variant="outline" className="text-[8px] font-bold border-none bg-[#F5F3F0] text-neutral-700 rounded-full px-2 py-0 h-4">{log.cabangName || getBranchName(log.cabang)}</Badge>
                          </div>
                          <p className="text-[9px] text-neutral-400 mt-0.5">{log.tanggal} • {ev.shiftLabel}</p>
                        </div>
                        <Badge variant="outline" className={cn("text-[8px] font-bold border-none rounded-full px-2 shrink-0", STATUS_BADGE_MAP[ev.statusBadgeColor])}>
                          {ev.statusText}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 bg-[#F5F3F0]/80 rounded-xl p-2 text-center">
                        <div><p className="text-[8px] font-bold uppercase text-neutral-400">Masuk</p><p className="text-[11px] font-mono font-bold text-neutral-900">{log.jamMasuk}</p></div>
                        <div><p className="text-[8px] font-bold uppercase text-neutral-400">Pulang</p><p className="text-[11px] font-mono font-bold text-neutral-900">{log.jamPulang}</p></div>
                        <div><p className="text-[8px] font-bold uppercase text-neutral-400">Durasi</p><p className="text-[10px] font-bold text-[#1F7A63] truncate">{workDur}</p></div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <p className="text-[9px] text-neutral-500 italic truncate">{ev.notes}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          {(log.selfieMasukUrl || log.selfieUrl) && (
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-neutral-200" onClick={() => setPreviewPhoto({ url: (log.selfieMasukUrl || log.selfieUrl)!, title: `Selfie Masuk - ${log.nama}`, subtitle: `${log.tanggal} (${log.jamMasuk})` })}>
                              <Eye className="h-3.5 w-3.5 text-[#1F7A63]" />
                            </Button>
                          )}
                          {log.selfiePulangUrl && (
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-neutral-200" onClick={() => setPreviewPhoto({ url: log.selfiePulangUrl!, title: `Selfie Pulang - ${log.nama}`, subtitle: `${log.tanggal} (${log.jamPulang})` })}>
                              <Camera className="h-3.5 w-3.5 text-[#C82368]" />
                            </Button>
                          )}
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-neutral-200" onClick={() => openEditLogModal(log)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-rose-200 text-rose-600" onClick={() => handleDeleteLog(log.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-8 text-center text-xs text-neutral-400 italic">Belum ada data absensi pada periode ini.</div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-neutral-950 text-white">
                    <TableRow className="text-[10px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                      <TableHead className="pl-6 text-neutral-300">Tanggal &amp; Cabang</TableHead>
                      <TableHead className="text-neutral-300">Karyawan</TableHead>
                      <TableHead className="text-center text-neutral-300">Masuk / Pulang</TableHead>
                      <TableHead className="text-center text-neutral-300">Durasi</TableHead>
                      <TableHead className="text-center text-neutral-300">Selfie</TableHead>
                      <TableHead className="text-neutral-300">Status &amp; Catatan</TableHead>
                      <TableHead className="text-right pr-6 text-neutral-300">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length > 0 ? filteredLogs.map((log) => {
                      const ev = evaluateAttendance(log, branchShifts[log.cabang || "TOKO_A"]);
                      const workDur = calculateTotalWorkHours(log.jamMasuk, log.jamPulang);
                      return (
                        <TableRow key={log.id} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 text-xs">
                          <TableCell className="pl-6 py-3.5">
                            <p className="font-bold text-neutral-900">{log.tanggal}</p>
                            <Badge variant="outline" className="text-[9px] font-bold border-none bg-[#F5F3F0] text-neutral-700 rounded-full px-2.5 mt-0.5">{log.cabangName || getBranchName(log.cabang)}</Badge>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold uppercase text-neutral-900">{log.nama}</p>
                            <p className="text-[10px] text-neutral-400">{ev.shiftLabel} ({ev.shiftHours})</p>
                          </TableCell>
                          <TableCell className="text-center font-mono font-bold">
                            <span className="text-emerald-700">{log.jamMasuk}</span> / <span className="text-[#C82368]">{log.jamPulang}</span>
                          </TableCell>
                          <TableCell className="text-center font-bold text-neutral-700">{workDur}</TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              {(log.selfieMasukUrl || log.selfieUrl) && (
                                <Button variant="outline" size="sm" className="h-7 px-2 rounded-full text-[10px]" onClick={() => setPreviewPhoto({ url: (log.selfieMasukUrl || log.selfieUrl)!, title: `Selfie Masuk - ${log.nama}`, subtitle: `${log.tanggal} (${log.jamMasuk})` })}>
                                  <Eye className="h-3 w-3 mr-1 text-emerald-600" /> Masuk
                                </Button>
                              )}
                              {log.selfiePulangUrl && (
                                <Button variant="outline" size="sm" className="h-7 px-2 rounded-full text-[10px]" onClick={() => setPreviewPhoto({ url: log.selfiePulangUrl!, title: `Selfie Pulang - ${log.nama}`, subtitle: `${log.tanggal} (${log.jamPulang})` })}>
                                  <Eye className="h-3 w-3 mr-1 text-[#C82368]" /> Pulang
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[9px] font-bold border-none rounded-full px-2.5", STATUS_BADGE_MAP[ev.statusBadgeColor])}>{ev.statusText}</Badge>
                            <p className="text-[10px] text-neutral-500 mt-0.5 max-w-[200px] truncate">{ev.notes}</p>
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEditLogModal(log)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-rose-600" onClick={() => handleDeleteLog(log.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow><TableCell colSpan={7} className="h-40 text-center text-neutral-400 italic">Belum ada data absensi pada periode ini.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2: KARYAWAN ================= */}
        <TabsContent value="karyawan" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2.5 bg-white p-3.5 rounded-2xl sm:rounded-3xl border border-neutral-200/70 shadow-sm">
            <div className="grid grid-cols-2 sm:flex gap-2 flex-1">
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-9 sm:w-44 rounded-full bg-[#F5F3F0] border-neutral-200/70 font-bold text-xs px-3.5"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="ALL" className="text-xs font-bold">SEMUA CABANG</SelectItem>
                  {ABSENSI_STORES.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
                <Input placeholder="Cari karyawan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-9 pl-8 rounded-full bg-[#F5F3F0] border-neutral-200/70 text-xs" />
              </div>
            </div>
            <Button onClick={openAddEmployee} className="h-9 rounded-full bg-[#C82368] hover:bg-[#a61c55] text-white font-bold text-xs px-4">
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Tambah Karyawan
            </Button>
          </div>

          <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 bg-white overflow-hidden shadow-sm">
            <CardContent className="p-0">
              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-neutral-100">
                {filteredKaryawan.length > 0 ? filteredKaryawan.map((emp) => (
                  <div key={emp.id} className="p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs uppercase text-neutral-950">{emp.nama}</span>
                        <Badge variant="outline" className="text-[8px] font-bold border-none bg-[#F5F3F0] rounded-full px-2 py-0 h-4">{getBranchName(emp.cabang)}</Badge>
                        <Badge variant="outline" className={cn("text-[8px] font-bold border-none rounded-full px-2 py-0 h-4", emp.status === "Nonaktif" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                          {emp.status || "Aktif"}
                        </Badge>
                      </div>
                      <p className="text-[10px] font-mono text-neutral-600 mt-1">
                        User: <strong className="text-[#C82368]">{emp.username}</strong> • Pass: <strong>{emp.password}</strong>
                      </p>
                      <p className="text-[9px] text-neutral-400 mt-0.5">
                        {emp.jabatan || "Staf"} • {emp.shift === "shift2" ? "Shift 2 (Siang)" : "Shift 1 (Pagi)"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-neutral-200" onClick={() => openEditEmployee(emp)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded-full border-rose-200 text-rose-600" onClick={() => handleDeleteEmployee(emp)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center text-xs text-neutral-400 italic">Belum ada akun karyawan. Klik &quot;Tambah Karyawan&quot;.</div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block w-full overflow-x-auto">
                <Table>
                  <TableHeader className="bg-neutral-950 text-white">
                    <TableRow className="text-[10px] font-bold uppercase tracking-widest border-none hover:bg-neutral-950">
                      <TableHead className="pl-6 text-neutral-300">Nama &amp; Jabatan</TableHead>
                      <TableHead className="text-neutral-300">Cabang</TableHead>
                      <TableHead className="text-neutral-300">Username</TableHead>
                      <TableHead className="text-neutral-300">Password</TableHead>
                      <TableHead className="text-neutral-300">Shift</TableHead>
                      <TableHead className="text-center text-neutral-300">Status</TableHead>
                      <TableHead className="text-right pr-6 text-neutral-300">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKaryawan.length > 0 ? filteredKaryawan.map((emp) => (
                      <TableRow key={emp.id} className="hover:bg-[#F5F3F0]/60 border-b border-neutral-100 text-xs">
                        <TableCell className="pl-6 py-3.5">
                          <p className="font-bold uppercase text-neutral-950">{emp.nama}</p>
                          <p className="text-[10px] text-neutral-400">{emp.jabatan || "Staf Toko"}</p>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px] font-bold border-none bg-[#F5F3F0] rounded-full px-3">{getBranchName(emp.cabang)}</Badge></TableCell>
                        <TableCell className="font-mono font-bold text-[#C82368]">{emp.username}</TableCell>
                        <TableCell className="font-mono text-neutral-600">{emp.password}</TableCell>
                        <TableCell className="font-bold text-neutral-700">{emp.shift === "shift2" ? "Shift 2 (Siang)" : "Shift 1 (Pagi)"}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn("text-[9px] font-bold border-none rounded-full px-2.5", emp.status === "Nonaktif" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700")}>
                            {emp.status || "Aktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => openEditEmployee(emp)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-rose-600" onClick={() => handleDeleteEmployee(emp)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )) : (
                      <TableRow><TableCell colSpan={7} className="h-36 text-center text-neutral-400 italic">Belum ada karyawan terdaftar.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 3: PENJADWALAN SHIFT ================= */}
        <TabsContent value="penjadwalan" className="space-y-4">
          <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 bg-white overflow-hidden shadow-sm">
            <CardHeader className="bg-neutral-950 text-white p-4 sm:p-5">
              <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-widest">Penjadwalan Shift Karyawan</CardTitle>
              <CardDescription className="text-neutral-400 text-xs">Ubah penugasan shift harian karyawan dengan satu klik.</CardDescription>
            </CardHeader>
            <CardContent className="p-3.5 sm:p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
                {karyawanList.map((emp) => (
                  <div key={emp.id} className="p-3.5 rounded-2xl border border-neutral-200/70 bg-[#F5F3F0]/50 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-xs uppercase text-neutral-950 truncate">{emp.nama}</p>
                        <p className="text-[10px] text-neutral-500">{getBranchName(emp.cabang)} • {emp.jabatan || "Staf"}</p>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold bg-white border-neutral-200 rounded-full shrink-0">
                        {emp.shift === "shift2" ? "Siang" : "Pagi"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Button
                        size="sm"
                        variant={emp.shift !== "shift2" ? "default" : "outline"}
                        onClick={() => handleQuickShiftChange(emp, "shift1")}
                        className={cn("h-8 rounded-full text-[10px] font-bold", emp.shift !== "shift2" && "bg-neutral-950 text-white")}
                      >
                        Shift 1 (Pagi)
                      </Button>
                      <Button
                        size="sm"
                        variant={emp.shift === "shift2" ? "default" : "outline"}
                        onClick={() => handleQuickShiftChange(emp, "shift2")}
                        className={cn("h-8 rounded-full text-[10px] font-bold", emp.shift === "shift2" && "bg-[#C82368] text-white")}
                      >
                        Shift 2 (Siang)
                      </Button>
                    </div>
                  </div>
                ))}
                {karyawanList.length === 0 && (
                  <p className="col-span-full text-center py-8 text-xs text-neutral-400 italic">Tambahkan karyawan terlebih dahulu pada tab Karyawan.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 4: JAM KERJA ================= */}
        <TabsContent value="jam-kerja" className="space-y-4">
          <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 bg-white overflow-hidden shadow-sm">
            <CardHeader className="bg-neutral-950 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-widest">Pengaturan Jam Kerja (Shift)</CardTitle>
                <CardDescription className="text-neutral-400 text-xs">Atur jam masuk &amp; pulang per cabang untuk evaluasi keterlambatan otomatis.</CardDescription>
              </div>
              <Select value={configBranch} onValueChange={(v) => setConfigBranch(v as BranchStoreId)}>
                <SelectTrigger className="h-9 sm:w-44 rounded-full bg-white/10 border-white/20 text-white font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {ABSENSI_STORES.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#F5F3F0] border border-neutral-200/70 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-neutral-900">Shift 1 (Pagi)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-neutral-500">Jam Masuk</Label>
                      <Input
                        type="time"
                        value={branchShifts[configBranch]?.pagi.masuk || "08:00"}
                        onChange={(e) =>
                          setBranchShifts((prev) => ({
                            ...prev,
                            [configBranch]: { ...prev[configBranch], pagi: { ...prev[configBranch].pagi, masuk: e.target.value } },
                          }))
                        }
                        className="h-10 rounded-xl bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-neutral-500">Jam Pulang</Label>
                      <Input
                        type="time"
                        value={branchShifts[configBranch]?.pagi.pulang || "16:00"}
                        onChange={(e) =>
                          setBranchShifts((prev) => ({
                            ...prev,
                            [configBranch]: { ...prev[configBranch], pagi: { ...prev[configBranch].pagi, pulang: e.target.value } },
                          }))
                        }
                        className="h-10 rounded-xl bg-white font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-[#F5F3F0] border border-neutral-200/70 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#C82368]">Shift 2 (Siang)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-neutral-500">Jam Masuk</Label>
                      <Input
                        type="time"
                        value={branchShifts[configBranch]?.siang.masuk || "13:00"}
                        onChange={(e) =>
                          setBranchShifts((prev) => ({
                            ...prev,
                            [configBranch]: { ...prev[configBranch], siang: { ...prev[configBranch].siang, masuk: e.target.value } },
                          }))
                        }
                        className="h-10 rounded-xl bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold uppercase text-neutral-500">Jam Pulang</Label>
                      <Input
                        type="time"
                        value={branchShifts[configBranch]?.siang.pulang || "21:00"}
                        onChange={(e) =>
                          setBranchShifts((prev) => ({
                            ...prev,
                            [configBranch]: { ...prev[configBranch], siang: { ...prev[configBranch].siang, pulang: e.target.value } },
                          }))
                        }
                        className="h-10 rounded-xl bg-white font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={() => saveAbsensiConfig()} disabled={isSavingConfig} className="w-full sm:w-auto h-10 px-6 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white font-bold text-xs">
                {isSavingConfig ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                SIMPAN JAM KERJA
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 5: LOKASI GPS ================= */}
        <TabsContent value="lokasi" className="space-y-4">
          <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 bg-white overflow-hidden shadow-sm">
            <CardHeader className="bg-neutral-950 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-widest">Titik Lokasi GPS &amp; Radius Toko</CardTitle>
                <CardDescription className="text-neutral-400 text-xs">Karyawan hanya bisa absen jika berada di dalam radius meter yang ditentukan.</CardDescription>
              </div>
              <Select value={configBranch} onValueChange={(v) => setConfigBranch(v as BranchStoreId)}>
                <SelectTrigger className="h-9 sm:w-44 rounded-full bg-white/10 border-white/20 text-white font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {ABSENSI_STORES.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-neutral-500">Latitude</Label>
                  <Input
                    value={branchLocations[configBranch]?.lat || ""}
                    onChange={(e) => setBranchLocations((prev) => ({ ...prev, [configBranch]: { ...prev[configBranch], lat: e.target.value } }))}
                    placeholder="-7.498200"
                    className="h-10 rounded-xl bg-[#F5F3F0] font-mono font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-neutral-500">Longitude</Label>
                  <Input
                    value={branchLocations[configBranch]?.lng || ""}
                    onChange={(e) => setBranchLocations((prev) => ({ ...prev, [configBranch]: { ...prev[configBranch], lng: e.target.value } }))}
                    placeholder="108.902500"
                    className="h-10 rounded-xl bg-[#F5F3F0] font-mono font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-neutral-500">Radius Maksimal (Meter)</Label>
                  <Input
                    type="number"
                    value={branchLocations[configBranch]?.radius || "100"}
                    onChange={(e) => setBranchLocations((prev) => ({ ...prev, [configBranch]: { ...prev[configBranch], radius: e.target.value } }))}
                    placeholder="50"
                    className="h-10 rounded-xl bg-[#F5F3F0] font-bold text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleGetCurrentGps} disabled={gettingGps} className="h-10 rounded-full px-5 font-bold text-xs border-neutral-300">
                  {gettingGps ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Navigation className="h-3.5 w-3.5 mr-1.5 text-[#1F7A63]" />}
                  Ambil Lokasi Saat Ini (GPS)
                </Button>
                <Button onClick={() => saveAbsensiConfig()} disabled={isSavingConfig} className="h-10 rounded-full px-6 bg-neutral-950 hover:bg-[#C82368] text-white font-bold text-xs">
                  {isSavingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  SIMPAN LOKASI {getBranchName(configBranch)}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 6: CLOUDINARY ================= */}
        <TabsContent value="cloudinary" className="space-y-4">
          <Card className="rounded-2xl sm:rounded-3xl border border-neutral-200/70 bg-white overflow-hidden shadow-sm">
            <CardHeader className="bg-neutral-950 text-white p-4 sm:p-5">
              <CardTitle className="text-xs sm:text-sm font-bold uppercase tracking-widest">Konfigurasi Cloudinary (Foto Selfie)</CardTitle>
              <CardDescription className="text-neutral-400 text-xs">Opsional: isi Cloud Name &amp; Unsigned Upload Preset agar foto selfie tersimpan di Cloudinary. Jika dikosongkan, foto tetap tersimpan otomatis dalam format terkompresi.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-neutral-500">Cloud Name</Label>
                  <Input
                    value={cloudinaryConfig.cloudinaryCloudName}
                    onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, cloudinaryCloudName: e.target.value })}
                    placeholder="Mis: dgsxujjb1"
                    className="h-10 rounded-xl bg-[#F5F3F0] font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-neutral-500">Upload Preset (Unsigned)</Label>
                  <Input
                    value={cloudinaryConfig.cloudinaryUploadPreset}
                    onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, cloudinaryUploadPreset: e.target.value })}
                    placeholder="Mis: nibras_absensi"
                    className="h-10 rounded-xl bg-[#F5F3F0] font-bold text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase text-neutral-500">Folder</Label>
                  <Input
                    value={cloudinaryConfig.cloudinaryFolder}
                    onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, cloudinaryFolder: e.target.value })}
                    placeholder="absensi-selfie"
                    className="h-10 rounded-xl bg-[#F5F3F0] font-bold text-xs"
                  />
                </div>
              </div>
              <Button onClick={() => saveAbsensiConfig()} disabled={isSavingConfig} className="h-10 rounded-full px-6 bg-neutral-950 hover:bg-[#C82368] text-white font-bold text-xs">
                {isSavingConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                SIMPAN CLOUDINARY
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Tambah / Edit Karyawan */}
      <Dialog open={isEmpModalOpen} onOpenChange={setIsEmpModalOpen}>
        <DialogContent className="w-[95vw] max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-5 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-xl">{editingEmp ? "Edit Data Karyawan" : "Tambah Karyawan Baru"}</DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">Akun ini digunakan karyawan untuk login di Portal Absensi.</DialogDescription>
          </DialogHeader>
          <div className="p-5 space-y-3 bg-[#F5F3F0]">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-neutral-500">Nama Lengkap</Label>
              <Input value={empForm.nama} onChange={(e) => setEmpForm({ ...empForm, nama: e.target.value })} placeholder="Mis: Siti Aminah" className="h-10 rounded-xl bg-white font-bold text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-neutral-500">Username Login</Label>
                <Input value={empForm.username} onChange={(e) => setEmpForm({ ...empForm, username: e.target.value })} placeholder="sitiaminah" className="h-10 rounded-xl bg-white font-mono font-bold text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-neutral-500">Password</Label>
                <Input value={empForm.password} onChange={(e) => setEmpForm({ ...empForm, password: e.target.value })} placeholder="123456" className="h-10 rounded-xl bg-white font-mono font-bold text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-neutral-500">Cabang</Label>
                <Select value={empForm.cabang} onValueChange={(v) => setEmpForm({ ...empForm, cabang: v as BranchStoreId })}>
                  <SelectTrigger className="h-10 rounded-xl bg-white font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{ABSENSI_STORES.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs font-bold">{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-neutral-500">Shift Default</Label>
                <Select value={empForm.shift} onValueChange={(v) => setEmpForm({ ...empForm, shift: v as "shift1" | "shift2" })}>
                  <SelectTrigger className="h-10 rounded-xl bg-white font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shift1" className="text-xs font-bold">Shift 1 (Pagi)</SelectItem>
                    <SelectItem value="shift2" className="text-xs font-bold">Shift 2 (Siang)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-neutral-500">Jabatan</Label>
                <Input value={empForm.jabatan} onChange={(e) => setEmpForm({ ...empForm, jabatan: e.target.value })} className="h-10 rounded-xl bg-white font-bold text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-neutral-500">Status</Label>
                <Select value={empForm.status} onValueChange={(v) => setEmpForm({ ...empForm, status: v as "Aktif" | "Nonaktif" })}>
                  <SelectTrigger className="h-10 rounded-xl bg-white font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif" className="text-xs font-bold">Aktif</SelectItem>
                    <SelectItem value="Nonaktif" className="text-xs font-bold">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="p-4 bg-white border-t flex gap-2">
            <Button variant="outline" onClick={() => setIsEmpModalOpen(false)} className="flex-1 h-10 rounded-full text-xs font-bold">BATAL</Button>
            <Button onClick={handleSaveEmployee} className="flex-1 h-10 rounded-full bg-neutral-950 hover:bg-[#C82368] text-white text-xs font-bold">SIMPAN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Edit Status Log Absensi */}
      <Dialog open={!!editingLog} onOpenChange={(o) => !o && setEditingLog(null)}>
        <DialogContent className="w-[95vw] max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-5 bg-neutral-950 text-white">
            <DialogTitle className="font-serif text-xl">Koreksi Status Absensi</DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">{editingLog?.nama} • {editingLog?.tanggal}</DialogDescription>
          </DialogHeader>
          <div className="p-5 space-y-3 bg-[#F5F3F0]">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-neutral-500">Status Kehadiran</Label>
              <Select value={editLogForm.statusManual} onValueChange={(v) => setEditLogForm({ ...editLogForm, statusManual: v })}>
                <SelectTrigger className="h-10 rounded-xl bg-white font-bold text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MANUAL_STATUS_OPTIONS.map((st) => <SelectItem key={st} value={st} className="text-xs font-bold">{st}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-neutral-500">Jam Masuk</Label>
                <Input value={editLogForm.jamMasuk} onChange={(e) => setEditLogForm({ ...editLogForm, jamMasuk: e.target.value })} placeholder="08:00:00" className="h-10 rounded-xl bg-white font-mono text-xs font-bold" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase text-neutral-500">Jam Pulang</Label>
                <Input value={editLogForm.jamPulang} onChange={(e) => setEditLogForm({ ...editLogForm, jamPulang: e.target.value })} placeholder="16:00:00" className="h-10 rounded-xl bg-white font-mono text-xs font-bold" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase text-neutral-500">Keterangan / Catatan</Label>
              <Input value={editLogForm.keterangan} onChange={(e) => setEditLogForm({ ...editLogForm, keterangan: e.target.value })} placeholder="Opsional..." className="h-10 rounded-xl bg-white text-xs font-bold" />
            </div>
          </div>
          <DialogFooter className="p-4 bg-white border-t flex gap-2">
            <Button variant="outline" onClick={() => setEditingLog(null)} className="flex-1 h-10 rounded-full text-xs font-bold">BATAL</Button>
            <Button onClick={handleSaveLogEdit} className="flex-1 h-10 rounded-full bg-[#C82368] hover:bg-[#a61c55] text-white text-xs font-bold">SIMPAN KOREKSI</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Preview Foto Selfie */}
      <Dialog open={!!previewPhoto} onOpenChange={(o) => !o && setPreviewPhoto(null)}>
        <DialogContent className="w-[95vw] max-w-md rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-4 bg-neutral-950 text-white flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="font-serif text-lg">{previewPhoto?.title}</DialogTitle>
              <DialogDescription className="text-xs text-neutral-400">{previewPhoto?.subtitle}</DialogDescription>
            </div>
            <button onClick={() => setPreviewPhoto(null)} className="text-white/60 hover:text-white"><X className="h-5 w-5" /></button>
          </DialogHeader>
          <div className="p-4 bg-[#F5F3F0] flex justify-center">
            {previewPhoto && (
              <img src={previewPhoto.url} alt={previewPhoto.title} className="w-full max-h-[65vh] object-contain rounded-2xl border border-neutral-200 bg-white" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
