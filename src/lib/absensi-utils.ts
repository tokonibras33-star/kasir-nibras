export type BranchStoreId = "TOKO_A" | "TOKO_B" | "TOKO_C";

export const ABSENSI_STORES: { id: BranchStoreId; name: string; fullName: string }[] = [
  { id: "TOKO_A", name: "NHS KWT", fullName: "Nibras House KWT (Toko A)" },
  { id: "TOKO_B", name: "IND CO", fullName: "Indah Collection (Toko B)" },
  { id: "TOKO_C", name: "NHS GDM", fullName: "Nibras House GDM (Toko C)" },
];

export const getBranchName = (branchId?: string): string => {
  return ABSENSI_STORES.find((s) => s.id === branchId)?.name || branchId || "NHS KWT";
};

export interface KaryawanData {
  id: string;
  nama: string;
  username: string;
  password: string;
  cabang: BranchStoreId;
  shift: "shift1" | "shift2";
  jabatan?: string;
  status?: "Aktif" | "Nonaktif";
  createdAt?: any;
  updatedAt?: any;
}

export interface AbsensiLogData {
  id: string;
  karyawanId: string;
  nama: string;
  cabang: BranchStoreId;
  cabangName: string;
  shift: string;
  tanggal: string; // format: dd/MM/yyyy or id-ID locale
  dateIso?: string; // format: yyyy-MM-dd for clean filtering
  jamMasuk: string;
  jamPulang: string;
  selfieUrl?: string;
  selfieMasukUrl?: string;
  selfiePulangUrl?: string;
  statusManual?: "Hadir" | "Ijin" | "Sakit" | "Alpha" | "Cuti" | "Libur" | "Tugas Luar" | "";
  keterangan?: string;
  timestamp?: any;
}

export interface ShiftsConfig {
  pagi: { masuk: string; pulang: string };
  siang: { masuk: string; pulang: string };
}

export interface BranchLocationConfig {
  lat: string;
  lng: string;
  radius: string;
}

export interface AbsensiConfig {
  shifts?: Record<string, ShiftsConfig>;
  locations?: Record<string, BranchLocationConfig>;
  // Legacy / fallback flat fields
  lat?: string;
  lng?: string;
  radius?: string;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryFolder?: string;
}

export const DEFAULT_SHIFTS: ShiftsConfig = {
  pagi: { masuk: "08:00", pulang: "16:00" },
  siang: { masuk: "13:00", pulang: "21:00" },
};

export const DEFAULT_LOCATION: BranchLocationConfig = {
  lat: "-7.4982",
  lng: "108.9025",
  radius: "100",
};

export interface AttendanceEvaluation {
  statusText: string;
  statusBadgeColor: "emerald" | "amber" | "rose" | "indigo" | "slate" | "sky" | "purple";
  lateMinutes: number;
  earlyMinutes: number;
  isLate: boolean;
  isEarly: boolean;
  notes: string;
  shiftLabel: string;
  shiftHours: string;
}

/**
 * Haversine distance formula in meters
 */
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluate attendance log against shift schedule (adapted from ZONAWAKTU)
 */
export function evaluateAttendance(
  log: Partial<AbsensiLogData>,
  shiftsConfig?: ShiftsConfig
): AttendanceEvaluation {
  const effectiveShifts = shiftsConfig || DEFAULT_SHIFTS;
  const isShift2 = log.shift === "shift2" || log.shift === "siang";
  const targetShift = isShift2 ? effectiveShifts.siang : effectiveShifts.pagi;
  const shiftLabel = isShift2 ? "Shift 2 (Siang)" : "Shift 1 (Pagi)";
  const shiftHours = `${targetShift.masuk} - ${targetShift.pulang}`;

  if (log.statusManual && log.statusManual !== "Hadir") {
    const manualMap: Record<string, { color: AttendanceEvaluation["statusBadgeColor"]; defaultNote: string }> = {
      Ijin: { color: "sky", defaultNote: "Ijin tidak masuk kerja" },
      Sakit: { color: "purple", defaultNote: "Izin sakit / istirahat" },
      Alpha: { color: "rose", defaultNote: "Tidak ada catatan absensi (Alpha)" },
      Cuti: { color: "indigo", defaultNote: "Cuti kerja terencana" },
      Libur: { color: "slate", defaultNote: "Jadwal libur karyawan" },
      "Tugas Luar": { color: "emerald", defaultNote: "Tugas kedinasan / luar toko" },
    };
    const info = manualMap[log.statusManual] || { color: "slate" as const, defaultNote: log.statusManual };
    return {
      statusText: log.statusManual,
      statusBadgeColor: info.color,
      lateMinutes: 0,
      earlyMinutes: 0,
      isLate: false,
      isEarly: false,
      notes: log.keterangan || info.defaultNote,
      shiftLabel,
      shiftHours,
    };
  }

  if (!log.jamMasuk || log.jamMasuk === "-") {
    return {
      statusText: "Alpha",
      statusBadgeColor: "rose",
      lateMinutes: 0,
      earlyMinutes: 0,
      isLate: false,
      isEarly: false,
      notes: log.keterangan || "Tidak ada catatan jam masuk",
      shiftLabel,
      shiftHours,
    };
  }

  const parseTimeToMinutes = (timeStr?: string): number | null => {
    if (!timeStr || timeStr === "-") return null;
    const cleaned = timeStr.trim().replace(/\./g, ":");
    const parts = cleaned.split(":");
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const masukMin = parseTimeToMinutes(log.jamMasuk);
  const shiftMasukMin = parseTimeToMinutes(targetShift.masuk);

  let isLate = false;
  let lateMinutes = 0;
  if (masukMin !== null && shiftMasukMin !== null && masukMin > shiftMasukMin) {
    isLate = true;
    lateMinutes = masukMin - shiftMasukMin;
  }

  const pulangMin = parseTimeToMinutes(log.jamPulang);
  const shiftPulangMin = parseTimeToMinutes(targetShift.pulang);

  let isEarly = false;
  let earlyMinutes = 0;
  if (pulangMin !== null && shiftPulangMin !== null && pulangMin < shiftPulangMin) {
    isEarly = true;
    earlyMinutes = shiftPulangMin - pulangMin;
  }

  if (isLate) {
    let note = `Terlambat ${lateMinutes} menit (Jadwal: ${targetShift.masuk})`;
    if (isEarly && log.jamPulang && log.jamPulang !== "-") {
      note += `, Pulang awal ${earlyMinutes} menit`;
    }
    if (log.keterangan) note += ` • ${log.keterangan}`;
    return {
      statusText: `Terlambat (${lateMinutes}m)`,
      statusBadgeColor: "amber",
      lateMinutes,
      earlyMinutes,
      isLate: true,
      isEarly,
      notes: note,
      shiftLabel,
      shiftHours,
    };
  }

  if (isEarly && log.jamPulang && log.jamPulang !== "-") {
    let note = `Pulang awal ${earlyMinutes} menit sebelum ${targetShift.pulang}`;
    if (log.keterangan) note += ` • ${log.keterangan}`;
    return {
      statusText: `Pulang Awal (${earlyMinutes}m)`,
      statusBadgeColor: "amber",
      lateMinutes: 0,
      earlyMinutes,
      isLate: false,
      isEarly: true,
      notes: note,
      shiftLabel,
      shiftHours,
    };
  }

  if (!log.jamPulang || log.jamPulang === "-") {
    return {
      statusText: "Sedang Bekerja",
      statusBadgeColor: "indigo",
      lateMinutes: 0,
      earlyMinutes: 0,
      isLate: false,
      isEarly: false,
      notes: log.keterangan || "Masuk tepat waktu, belum absen pulang",
      shiftLabel,
      shiftHours,
    };
  }

  return {
    statusText: "Tepat Waktu",
    statusBadgeColor: "emerald",
    lateMinutes: 0,
    earlyMinutes: 0,
    isLate: false,
    isEarly: false,
    notes: log.keterangan || "Kehadiran lengkap & tepat waktu",
    shiftLabel,
    shiftHours,
  };
}

/**
 * Calculate total work duration string
 */
export function calculateTotalWorkHours(jamMasuk?: string, jamPulang?: string): string {
  if (!jamMasuk || !jamPulang || jamPulang === "-" || jamMasuk === "-") return "-";

  const parseSec = (t: string): number | null => {
    const parts = t.trim().replace(/\./g, ":").split(":");
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const s = parts.length >= 3 ? parseInt(parts[2], 10) : 0;
    if (isNaN(h) || isNaN(m)) return null;
    return h * 3600 + m * 60 + (isNaN(s) ? 0 : s);
  };

  const startSec = parseSec(jamMasuk);
  const endSec = parseSec(jamPulang);
  if (startSec === null || endSec === null) return "-";

  let diffSec = endSec - startSec;
  if (diffSec < 0) diffSec += 24 * 3600;

  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);

  if (hours === 0) return `${minutes} Menit`;
  if (minutes === 0) return `${hours} Jam`;
  return `${hours} Jam ${minutes} Mnt`;
}

/**
 * Upload selfie to Cloudinary (if configured), or return compressed JPEG data URL fallback
 */
export async function uploadAttendanceSelfie(
  file: File,
  fallbackDataUrl: string,
  config?: AbsensiConfig | null
): Promise<string> {
  const cloudName = config?.cloudinaryCloudName?.trim() || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = config?.cloudinaryUploadPreset?.trim() || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
  const folder =
    config?.cloudinaryFolder?.trim() ||
    process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER?.trim() ||
    "absensi-selfie";

  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      formData.append("folder", folder);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (response.ok && result?.secure_url) {
        return result.secure_url as string;
      }
    } catch (err) {
      console.warn("[ABSENSI] Cloudinary upload failed, falling back to compressed image:", err);
    }
  }

  return fallbackDataUrl;
}
