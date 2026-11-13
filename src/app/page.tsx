"use client";

import React, { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { generateFixedSessions, parseScheduleDays, NUMBER_TO_SHORT_NAME, NUMBER_TO_DAY_NAME } from "@/lib/schedule";
import {
  Users,
  GraduationCap,
  Calendar,
  Clock,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  XCircle,
  Plus,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  Receipt,
  FileText,
  DollarSign,
  Phone,
  BookOpen,
  CalendarDays,
  ShieldCheck,
  Check,
  Building2,
  BarChart3,
  Layers,
  FileSpreadsheet,
  Eye,
  EyeOff,
  Share2,
  Copy,
  Zap,
  RotateCcw,
  MessageSquare,
  Download,
  Award,
  Star,
  Medal
} from "lucide-react";

type ClassType = "MONTHLY" | "COURSE";
type PeriodType = "MONTH" | "QUARTER" | "HALF_YEAR" | "YEAR";

type ClassItem = {
  id: string;
  name: string;
  type: ClassType;
  scheduleText: string;
  monthlyTuition: number;
  sessionsPerMonth: number;
  pricePerSession: number;
  studentCount: number;
  owingCount: number;
};

type PaymentHistoryItem = {
  id: string;
  cycleName: string;
  total: number;
  discount: number;
  paid: number;
  expectedSessions: number;
  paidAt: string;
  dueDate: string;
  note: string | null;
};

type Student = {
  enrollmentId: string;
  studentId: string;
  studentCode?: string | null;
  status?: "ACTIVE" | "PAUSED" | "FINISHED";
  name: string;
  phone: string | null;
  joinDate: string;
  billingMode: string;
  tuitionNote: string;
  attended: number;
  absentUnexcused: number;
  excused: number;
  usedSessions: number;
  targetSessions: number;
  paidSessions: number;
  remainingSessions: number;
  tuition: {
    cycleId: string;
    cycleName: string;
    total: number;
    paid: number;
    debt: number;
    dueDate: string;
    expectedSessions: number;
  } | null;
  paymentHistory: PaymentHistoryItem[];
  evaluations?: StudentEvaluationItem[];
  latestEvaluation?: StudentEvaluationItem | null;
};

type StudentEvaluationItem = {
  id?: string;
  enrollmentId: string;
  studentId: string;
  classId: string;
  monthYear: string;
  classification: "XUAT_SAC" | "GIOI" | "KHA" | "CAN_KEM";
  testScore: number | null;
  grammarScore: number | null;
  skillsScore: number | null;
  attitude: string | null;
  homeworkStatus: string | null;
  strengths: string | null;
  improvements: string | null;
  teacherComment: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type SessionHistoryItem = {
  id: string;
  index?: number;
  title?: string;
  date: string;
  presentCount: number;
  totalCount: number;
  isCompleted?: boolean;
};

type ClassDetail = {
  class: {
    id: string;
    name: string;
    type: ClassType;
    scheduleText: string;
    monthlyTuition: number;
    sessionsPerMonth: number;
    pricePerSession: number;
  };
  students: Student[];
  sessionHistory: SessionHistoryItem[];
};

type Status = "PRESENT" | "LATE" | "EXCUSED" | "ABSENT";

const STATUS_BUTTONS: {
  key: Status;
  label: string;
  sub: string;
  icon: any;
  colorActive: string;
}[] = [
  {
    key: "PRESENT",
    label: "Có mặt",
    sub: "Tính 1 buổi",
    icon: CheckCircle2,
    colorActive: "bg-emerald-600 text-white shadow-emerald-600/25 border-emerald-600",
  },
  {
    key: "LATE",
    label: "Muộn",
    sub: "Tính 1 buổi",
    icon: Clock,
    colorActive: "bg-amber-500 text-white shadow-amber-500/25 border-amber-500",
  },
  {
    key: "EXCUSED",
    label: "Có phép",
    sub: "Bảo lưu",
    icon: ShieldCheck,
    colorActive: "bg-sky-600 text-white shadow-sky-600/25 border-sky-600",
  },
  {
    key: "ABSENT",
    label: "Vắng",
    sub: "Mất buổi",
    icon: XCircle,
    colorActive: "bg-rose-600 text-white shadow-rose-600/25 border-rose-600",
  },
];

const vnd = (n: number) => `${Math.round(n || 0).toLocaleString("vi-VN")}đ`;
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtDate = (d?: string | null) => {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Có lỗi xảy ra");
  return json as T;
}

export default function Page() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"CLASSES" | "STATS">("CLASSES");
  const [showAddClass, setShowAddClass] = useState(false);
  const [toast, setToast] = useState("");
  const [classFilter, setClassFilter] = useState<"ALL" | "TODAY" | "NEEDS_COLLECTION" | "ACTIVE" | "EMPTY">("ALL");
  const [searchClassQuery, setSearchClassQuery] = useState("");

  const notify = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const d = await api<{ classes: ClassItem[] }>("/api/classes");
      setClasses(d.classes);
    } catch (e: any) {
      notify(e.message);
    }
  }, [notify]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  const handleDeleteClass = async (e: React.MouseEvent, cls: ClassItem) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc muốn xóa lớp "${cls.name}" không?`))
      return;
    try {
      await api(`/api/classes/${cls.id}`, { method: "DELETE" });
      notify(`Đã xóa lớp ${cls.name}`);
      loadClasses();
    } catch (err: any) {
      notify(err.message);
    }
  };

  const todayDayOfWeek = new Date().getDay();
  const todayName = NUMBER_TO_DAY_NAME[todayDayOfWeek] || "Hôm nay";

  const totalStudents = classes.reduce((sum, c) => sum + (c.studentCount || 0), 0);
  const totalOwing = classes.reduce((sum, c) => sum + (c.owingCount || 0), 0);
  const activeClasses = classes.filter((c) => (c.studentCount || 0) > 0);
  const todayClasses = classes.filter((c) =>
    parseScheduleDays(c.scheduleText).includes(todayDayOfWeek)
  );
  const classesNeedingCollection = classes.filter((c) => (c.owingCount || 0) > 0);

  const filteredClasses = classes.filter((c) => {
    if (searchClassQuery.trim()) {
      const q = searchClassQuery.toLowerCase().trim();
      const matchName = c.name.toLowerCase().includes(q);
      const matchSchedule = (c.scheduleText || "").toLowerCase().includes(q);
      if (!matchName && !matchSchedule) return false;
    }

    if (classFilter === "TODAY") {
      return parseScheduleDays(c.scheduleText).includes(todayDayOfWeek);
    }
    if (classFilter === "NEEDS_COLLECTION") {
      return (c.owingCount || 0) > 0;
    }
    if (classFilter === "ACTIVE") {
      return (c.studentCount || 0) > 0;
    }
    if (classFilter === "EMPTY") {
      return (c.studentCount || 0) === 0;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* TOAST THÔNG BÁO HIỆN ĐẠI */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl bg-slate-900/90 text-white text-sm font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2.5 border border-slate-800 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* HEADER CAO CẤP */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div
            onClick={() => {
              setOpenId(null);
              setViewMode("CLASSES");
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform duration-200">
              D
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5">
                  DanielTS
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-100/80">
                    LMS Portal
                  </span>
                </h1>
              </div>
              <p className="text-[11px] font-medium text-slate-500">
                Điểm danh & Quản trị Học phí linh hoạt (danielts.nextband.vn)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Chuyển đổi Segmented Pill */}
            <div className="flex items-center bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 text-xs font-bold shadow-inner">
              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  setViewMode("CLASSES");
                  loadClasses();
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                  viewMode === "CLASSES"
                    ? "bg-white text-indigo-600 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Danh sách lớp
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpenId(null);
                  setViewMode("STATS");
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all duration-200 ${
                  viewMode === "STATS"
                    ? "bg-white text-indigo-600 shadow-sm font-extrabold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                Thống kê Quản trị
              </button>
            </div>

            {openId ? (
              <button
                onClick={() => {
                  setOpenId(null);
                  loadClasses();
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
              >
                ← Quay lại danh sách
              </button>
            ) : (
              viewMode === "CLASSES" && (
                <button
                  onClick={() => setShowAddClass(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Thêm lớp mới
                </button>
              )
            )}
          </div>
        </div>
      </header>

      {/* NỘI DUNG CHÍNH */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-7">
        {viewMode === "STATS" && !openId ? (
          <StatsView
            notify={notify}
            onOpenClass={(cid) => {
              setViewMode("CLASSES");
              setOpenId(cid);
            }}
          />
        ) : openId ? (
          <ClassView classId={openId} notify={notify} />
        ) : (
          <div className="space-y-6">
            {/* TẦNG 1: EXECUTIVE KPI SUMMARY BENTO CARDS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* CARD 1: CA HỌC HÔM NAY */}
              <div
                onClick={() => setClassFilter("TODAY")}
                className={`p-4 rounded-3xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  todayClasses.length > 0
                    ? "bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 text-white border-indigo-700/60 shadow-lg shadow-indigo-950/20 hover:scale-[1.02]"
                    : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                      todayClasses.length > 0 ? "text-indigo-300" : "text-slate-500"
                    }`}
                  >
                    <CalendarDays className="w-3.5 h-3.5" /> Ca Học Hôm Nay
                  </span>
                  {todayClasses.length > 0 && (
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  )}
                </div>

                <div className="my-2">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-2xl sm:text-3xl font-black ${
                        todayClasses.length > 0 ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {todayClasses.length}
                    </span>
                    <span
                      className={`text-xs font-bold ${
                        todayClasses.length > 0 ? "text-indigo-200" : "text-slate-500"
                      }`}
                    >
                      ca học ({todayName})
                    </span>
                  </div>
                  <p
                    className={`text-[11px] mt-0.5 truncate ${
                      todayClasses.length > 0 ? "text-indigo-200/80" : "text-slate-400"
                    }`}
                  >
                    {todayClasses.length > 0
                      ? "Bấm để lọc ca học cần điểm danh"
                      : "Hôm nay không có ca học theo lịch"}
                  </p>
                </div>

                <div
                  className={`pt-2 border-t text-[11px] font-bold flex items-center justify-between ${
                    todayClasses.length > 0
                      ? "border-indigo-800/80 text-emerald-400"
                      : "border-slate-100 text-indigo-600"
                  }`}
                >
                  <span>{todayClasses.length > 0 ? "⚡ Điểm danh ca học" : "Xem tất cả lớp"}</span>
                  <span>→</span>
                </div>
              </div>

              {/* CARD 2: TỔNG SĨ SỐ HỌC VIÊN */}
              <div
                onClick={() => setClassFilter("ACTIVE")}
                className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" /> Sĩ Số Đang Học
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                    {activeClasses.length} lớp
                  </span>
                </div>
                <div className="my-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      {totalStudents}
                    </span>
                    <span className="text-xs font-bold text-slate-500">học viên</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Đang theo học tại trung tâm
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-indigo-600 flex items-center justify-between">
                  <span>Xem lớp có học viên</span>
                  <span>→</span>
                </div>
              </div>

              {/* CARD 3: CẢNH BÁO THU HỌC PHÍ */}
              <div
                onClick={() => setClassFilter("NEEDS_COLLECTION")}
                className={`p-4 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between shadow-sm ${
                  totalOwing > 0
                    ? "bg-amber-50/40 border-amber-300/80 hover:border-amber-400 hover:bg-amber-50/70"
                    : "bg-white border-slate-200/80 hover:border-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 ${
                      totalOwing > 0 ? "text-amber-900" : "text-slate-500"
                    }`}
                  >
                    <AlertCircle
                      className={`w-3.5 h-3.5 ${
                        totalOwing > 0 ? "text-amber-600" : "text-emerald-600"
                      }`}
                    />
                    Thu Học Phí
                  </span>
                  {totalOwing > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black border border-rose-200">
                      Cần thu ngay
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Hoàn tất 100%
                    </span>
                  )}
                </div>
                <div className="my-2">
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-2xl sm:text-3xl font-black ${
                        totalOwing > 0 ? "text-rose-700" : "text-emerald-700"
                      }`}
                    >
                      {totalOwing}
                    </span>
                    <span className="text-xs font-bold text-slate-600">em cần thu</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {totalOwing > 0
                      ? `Tại ${classesNeedingCollection.length} lớp (nợ hoặc sắp hết phí)`
                      : "Tất cả học viên đã nạp đủ học phí"}
                  </p>
                </div>
                <div
                  className={`pt-2 border-t text-[11px] font-bold flex items-center justify-between ${
                    totalOwing > 0 ? "border-amber-200 text-amber-900" : "border-slate-100 text-emerald-700"
                  }`}
                >
                  <span>{totalOwing > 0 ? "⚠️ Lọc học viên cần thu" : "Tài chính ổn định"}</span>
                  <span>→</span>
                </div>
              </div>

              {/* CARD 4: QUẢN LÝ LỚP HỌC */}
              <div
                onClick={() => setClassFilter("ALL")}
                className="p-4 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-600" /> Quy Mô Lớp Học
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Active
                  </span>
                </div>
                <div className="my-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900">
                      {classes.length}
                    </span>
                    <span className="text-xs font-bold text-slate-500">lớp học</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {classes.filter((c) => c.type === "MONTHLY").length} lớp tháng · {classes.filter((c) => c.type === "COURSE").length} khóa IELTS
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100 text-[11px] font-bold text-slate-700 flex items-center justify-between">
                  <span>Tất cả chương trình</span>
                  <span>→</span>
                </div>
              </div>
            </div>

            {/* TẦNG 2: TOOLBAR PHÂN LOẠI & TÌM KIẾM THÔNG MINH */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* TABS LỌC PHÂN CẤP */}
                <div className="flex flex-wrap items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200/70 text-xs font-bold gap-0.5">
                  <button
                    type="button"
                    onClick={() => setClassFilter("ALL")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      classFilter === "ALL"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tất cả ({classes.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setClassFilter("TODAY")}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                      classFilter === "TODAY"
                        ? "bg-indigo-600 text-white shadow-sm font-extrabold"
                        : "text-indigo-700 hover:bg-indigo-50 font-bold"
                    }`}
                  >
                    <span>⚡ Ca học hôm nay</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        classFilter === "TODAY" ? "bg-indigo-800 text-white" : "bg-indigo-100 text-indigo-800"
                      }`}
                    >
                      {todayClasses.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClassFilter("NEEDS_COLLECTION")}
                    className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
                      classFilter === "NEEDS_COLLECTION"
                        ? "bg-amber-500 text-white shadow-sm font-extrabold"
                        : "text-amber-800 hover:bg-amber-100 font-bold"
                    }`}
                  >
                    <span>🚨 Cần thu phí</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        classFilter === "NEEDS_COLLECTION" ? "bg-amber-700 text-white" : "bg-amber-200 text-amber-900"
                      }`}
                    >
                      {classesNeedingCollection.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setClassFilter("ACTIVE")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      classFilter === "ACTIVE"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Có học viên ({activeClasses.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setClassFilter("EMPTY")}
                    className={`px-3 py-1.5 rounded-xl transition ${
                      classFilter === "EMPTY"
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Lớp trống ({classes.length - activeClasses.length})
                  </button>
                </div>

                {/* SEARCH INPUT */}
                <div className="relative min-w-[240px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchClassQuery}
                    onChange={(e) => setSearchClassQuery(e.target.value)}
                    placeholder="Tìm theo tên lớp, ca học (T2, T4, T6)..."
                    className="w-full pl-9 pr-7 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-medium text-slate-800 placeholder-slate-400"
                  />
                  {searchClassQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchClassQuery("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* TẦNG 3: DANH SÁCH THẺ LỚP HỌC ĐƯỢC PHÂN CẤP RÕ RỆT */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredClasses.map((c) => {
                const isTodayClass = parseScheduleDays(c.scheduleText).includes(todayDayOfWeek);
                const hasStudents = (c.studentCount || 0) > 0;
                const hasOwing = (c.owingCount || 0) > 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => setOpenId(c.id)}
                    className={`group relative cursor-pointer rounded-3xl border p-5 transition-all duration-200 flex flex-col justify-between ${
                      isTodayClass
                        ? "bg-white border-indigo-400 ring-2 ring-indigo-500/15 shadow-lg shadow-indigo-500/5 hover:border-indigo-500"
                        : hasOwing
                        ? "bg-gradient-to-b from-amber-50/20 via-white to-white border-amber-300 hover:border-amber-400 shadow-sm"
                        : hasStudents
                        ? "bg-white border-slate-200/90 hover:border-indigo-300 shadow-sm"
                        : "bg-slate-50/50 border-dashed border-slate-300/80 hover:border-slate-400 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <div>
                      {/* BANNER ĐỈNH THẺ PHÂN CẤP TRẠNG THÁI */}
                      {isTodayClass ? (
                        <div className="mb-3.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-extrabold flex items-center justify-between shadow-xs">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                            ⚡ HÔM NAY CÓ CA HỌC
                          </span>
                          <span className="text-[10px] opacity-90">{todayName}</span>
                        </div>
                      ) : hasOwing ? (
                        <div className="mb-3.5 px-3 py-1 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 text-[11px] font-extrabold flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            CẦN THU HỌC PHÍ
                          </span>
                          <span className="px-1.5 py-0.2 rounded-full bg-amber-200 text-amber-900 text-[10px]">
                            {c.owingCount} em
                          </span>
                        </div>
                      ) : null}

                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wide uppercase ${
                            c.type === "COURSE"
                              ? "bg-purple-50 text-purple-700 border border-purple-200/80"
                              : "bg-blue-50 text-blue-700 border border-blue-200/80"
                          }`}
                        >
                          {c.type === "COURSE" ? (
                            <>
                              <GraduationCap className="w-3 h-3" /> Trọn Khóa IELTS
                            </>
                          ) : (
                            <>
                              <CalendarDays className="w-3 h-3" /> Theo Tháng (8 Buổi)
                            </>
                          )}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleDeleteClass(e, c)}
                          title="Xóa lớp này"
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h3 className="font-black text-slate-900 text-lg mt-2.5 group-hover:text-indigo-600 transition-colors leading-snug">
                        {c.name}
                      </h3>

                      <div className="text-xs text-slate-600 mt-1.5 flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>{c.scheduleText || "Chưa thiết lập thời gian học"}</span>
                      </div>

                      {/* KHỐI HỌC PHÍ TIÊU CHUẨN */}
                      <div className="mt-3.5 p-3 rounded-2xl bg-slate-50/90 border border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">
                            Học phí tiêu chuẩn
                          </span>
                          <span className="font-black text-indigo-700 text-base">
                            {vnd(c.monthlyTuition)}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-1 rounded-lg border border-slate-200">
                          {c.type === "MONTHLY"
                            ? `${vnd(c.pricePerSession)}/buổi`
                            : "Trọn khóa"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 mt-4 border-t border-slate-100">
                      {/* SĨ SỐ & CẢNH BÁO TÀI CHÍNH */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          {c.studentCount} học viên
                        </span>

                        {c.owingCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-extrabold border border-rose-200 text-[11px]">
                            <AlertCircle className="w-3 h-3 text-rose-600" /> {c.owingCount} cần thu
                          </span>
                        ) : c.studentCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                            <Check className="w-3 h-3 text-emerald-600" /> Đã đóng đủ
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">Lớp mới</span>
                        )}
                      </div>

                      {/* NÚT HÀNH ĐỘNG RÕ RÀNG */}
                      {isTodayClass ? (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 group-hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 transition">
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>Vào Điểm Danh Ca Hôm Nay</span>
                          <span>→</span>
                        </div>
                      ) : hasOwing ? (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-amber-50 group-hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs flex items-center justify-center gap-1.5 transition">
                          <span>Quản Lý Lớp &amp; Thu Phí</span>
                          <span>→</span>
                        </div>
                      ) : hasStudents ? (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-700 text-slate-700 border border-slate-200 group-hover:border-indigo-200 font-bold text-xs flex items-center justify-center gap-1.5 transition">
                          <span>Vào Quản Lý Lớp Học</span>
                          <span>→</span>
                        </div>
                      ) : (
                        <div className="w-full py-2.5 px-3 rounded-xl bg-slate-100/80 group-hover:bg-slate-200 text-slate-600 border border-dashed border-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition">
                          <span>+ Thêm Học Viên Vào Lớp</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {filteredClasses.length === 0 && (
                <div className="sm:col-span-2 lg:col-span-3 text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Không tìm thấy lớp học phù hợp</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchClassQuery
                      ? `Không có lớp nào khớp với từ khóa "${searchClassQuery}". Hãy thử tìm kiếm khác.`
                      : classFilter === "TODAY"
                      ? "Hôm nay không có ca học nào theo lịch đã xếp."
                      : classFilter === "NEEDS_COLLECTION"
                      ? "Tuyệt vời! Hiện không có học viên nào bị nợ hoặc cần thu học phí."
                      : "Chưa có lớp nào trong danh mục này."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setClassFilter("ALL");
                      setSearchClassQuery("");
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition mt-2"
                  >
                    Xem tất cả lớp học
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {showAddClass && (
        <AddClassModal
          onClose={() => setShowAddClass(false)}
          onDone={() => {
            setShowAddClass(false);
            notify("Đã thêm lớp mới");
            loadClasses();
          }}
        />
      )}
    </div>
  );
}

/* ========================================================================= */
/* MÀN HÌNH THỐNG KÊ QUẢN TRỊ (PREMIUM ANALYTICS DASHBOARD)                   */
/* ========================================================================= */
function StatsView({
  notify,
  onOpenClass,
}: {
  notify: (m: string) => void;
  onOpenClass: (classId: string) => void;
}) {
  const now = new Date();
  const [periodType, setPeriodType] = useState<PeriodType>("MONTH");
  const [year, setYear] = useState<number>(now.getFullYear());
  const [value, setValue] = useState<number>(now.getMonth() + 1);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dossierTarget, setDossierTarget] = useState<{
    studentId: string;
    classId?: string;
  } | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const d = await api<any>(
        `/api/stats?periodType=${periodType}&year=${year}&value=${value}`
      );
      setStats(d);
    } catch (e: any) {
      notify(e.message);
    } finally {
      setLoading(false);
    }
  }, [periodType, year, value, notify]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const handleChangePeriodType = (nextType: PeriodType) => {
    setPeriodType(nextType);
    const curMonth = now.getMonth() + 1;
    if (nextType === "MONTH") setValue(curMonth);
    else if (nextType === "QUARTER") setValue(Math.ceil(curMonth / 3));
    else if (nextType === "HALF_YEAR") setValue(curMonth <= 6 ? 1 : 2);
    else setValue(1);
  };

  const maxMonthlyRevenue = Math.max(
    1,
    ...(stats?.monthlyTrend?.map((m: any) => m.collected) || [1])
  );

  const handleExportExcel = () => {
    if (!stats) return;
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: KPI Tổng quan
      const kpiRows = [
        { "Chỉ tiêu": "Kỳ báo cáo", "Số liệu": stats.filter?.label || "" },
        { "Chỉ tiêu": "Tổng thực thu (VNĐ)", "Số liệu": stats.kpis?.totalCollected || 0 },
        { "Chỉ tiêu": "Thu qua Chuyển khoản (VNĐ)", "Số liệu": stats.kpis?.transferCollected || 0 },
        { "Chỉ tiêu": "Thu bằng Tiền mặt (VNĐ)", "Số liệu": stats.kpis?.cashCollected || 0 },
        { "Chỉ tiêu": "Tổng công nợ tồn đọng (VNĐ)", "Số liệu": stats.kpis?.totalDebt || 0 },
        { "Chỉ tiêu": "Số học viên còn nợ", "Số liệu": stats.kpis?.debtStudentCount || 0 },
        { "Chỉ tiêu": "Tổng số học viên hoạt động", "Số liệu": stats.kpis?.activeStudents || 0 },
        { "Chỉ tiêu": "Tổng lượt điểm danh", "Số liệu": stats.kpis?.totalAttendanceMarks || 0 },
        { "Chỉ tiêu": "Tỷ lệ chuyên cần trung bình", "Số liệu": `${stats.kpis?.attendanceRate || 0}%` },
      ];
      const wsKpi = XLSX.utils.json_to_sheet(kpiRows);
      XLSX.utils.book_append_sheet(wb, wsKpi, "Tong_Quan_KPI");

      // Sheet 2: Chi tiết theo lớp
      if (stats.classBreakdown && stats.classBreakdown.length > 0) {
        const classRows = stats.classBreakdown.map((c: any) => ({
          "Tên lớp": c.name,
          "Loại hình": c.type === "MONTHLY" ? "Theo tháng (8 buổi)" : "Trọn khóa IELTS",
          "Số học viên": c.studentCount,
          "Thực thu kỳ này (VNĐ)": c.revenueInPeriod,
          "Công nợ còn lại (VNĐ)": c.totalDebt,
          "Số HV còn nợ": c.owingCount,
          "Chuyên cần": `${c.attendanceRate}%`,
        }));
        const wsClass = XLSX.utils.json_to_sheet(classRows);
        XLSX.utils.book_append_sheet(wb, wsClass, "Chi_Tiet_Theo_Lop");
      }

      // Sheet 3: Danh sách giao dịch
      if (stats.recentTransactions && stats.recentTransactions.length > 0) {
        const transRows = stats.recentTransactions.map((t: any) => ({
          "Mã HV": t.studentCode || "",
          "Họ tên học viên": t.studentName,
          "Lớp học": t.className,
          "Số tiền (VNĐ)": t.amount,
          "Hình thức": t.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản",
          "Ngày nộp": t.paidAt ? new Date(t.paidAt).toLocaleDateString("vi-VN") : "",
          "Ghi chú": t.note || "",
        }));
        const wsTrans = XLSX.utils.json_to_sheet(transRows);
        XLSX.utils.book_append_sheet(wb, wsTrans, "Lich_Su_Giao_Dich");
      }

      XLSX.writeFile(wb, `BaoCao_TaiChinh_${periodType}_${year}.xlsx`);
      notify("Đã xuất báo cáo Excel thành công!");
    } catch (e: any) {
      notify("Lỗi xuất Excel: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* THANH BỘ LỌC THỜI GIAN */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
            Báo Cáo Tổng Hợp
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            Tài chính & Hiệu quả Giảng dạy
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Khoảng thời gian: <strong className="text-indigo-700">{stats?.filter?.label || "..."}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
            {(
              [
                { key: "MONTH", label: "Tháng" },
                { key: "QUARTER", label: "Quý" },
                { key: "HALF_YEAR", label: "6 Tháng" },
                { key: "YEAR", label: "Năm" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleChangePeriodType(tab.key)}
                className={`px-3 py-1.5 rounded-xl transition ${
                  periodType === tab.key
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {periodType === "MONTH" && (
            <select
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          )}

          {periodType === "QUARTER" && (
            <select
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-sm"
            >
              <option value={1}>Quý 1 (Tháng 1 - 3)</option>
              <option value={2}>Quý 2 (Tháng 4 - 6)</option>
              <option value={3}>Quý 3 (Tháng 7 - 9)</option>
              <option value={4}>Quý 4 (Tháng 10 - 12)</option>
            </select>
          )}

          {periodType === "HALF_YEAR" && (
            <select
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-sm"
            >
              <option value={1}>6 Tháng đầu năm (T1 - T6)</option>
              <option value={2}>6 Tháng cuối năm (T7 - T12)</option>
            </select>
          )}

          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-sm"
          >
            {[2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition"
            title="Xuất toàn bộ báo cáo sang file Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel</span>
          </button>
        </div>
      </div>

      {loading || !stats ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Đang tổng hợp số liệu quản trị...</p>
        </div>
      ) : (
        <>
          {/* 4 THẺ METRICS GRADIENT TINH TẾ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* THỰC THU */}
            <div className="bg-gradient-to-br from-emerald-500/10 via-white to-white p-5 rounded-3xl border border-emerald-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                  Thực Thu Kỳ Này
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-700 mt-2">
                {vnd(stats.kpis.totalCollected)}
              </div>
              <div className="text-xs text-slate-500 space-y-1 mt-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Chuyển khoản:</span>
                  <strong className="text-slate-800">{vnd(stats.kpis.transferCollected)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tiền mặt:</span>
                  <strong className="text-slate-800">{vnd(stats.kpis.cashCollected)}</strong>
                </div>
              </div>
            </div>

            {/* CÔNG NỢ */}
            <div className="bg-gradient-to-br from-rose-500/10 via-white to-white p-5 rounded-3xl border border-rose-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider">
                  Công Nợ Cần Thu
                </span>
                <div className="w-8 h-8 rounded-xl bg-rose-100/80 text-rose-700 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-rose-600 mt-2">
                {vnd(stats.kpis.currentTotalDebt)}
              </div>
              <div className="text-xs text-slate-500 space-y-1 mt-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Học viên nợ / hết buổi:</span>
                  <strong className="text-rose-700">{stats.kpis.studentsOwingCount} bạn</strong>
                </div>
                <div className="flex justify-between">
                  <span>Giảm trừ nghỉ phép:</span>
                  <strong className="text-slate-800">{vnd(stats.kpis.totalDiscountInPeriod)}</strong>
                </div>
              </div>
            </div>

            {/* DỰ BÁO TÁI TỤC */}
            <div className="bg-gradient-to-br from-amber-500/10 via-white to-white p-5 rounded-3xl border border-amber-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                  Dự Báo Thu Tháng Tới
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-100/80 text-amber-700 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2">
                {vnd(stats.kpis.upcomingRenewalAmount)}
              </div>
              <div className="text-xs text-slate-500 space-y-1 mt-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Sắp hết gói (≤ 1 buổi):</span>
                  <strong className="text-amber-800">{stats.kpis.upcomingRenewalCount} học viên</strong>
                </div>
                <p className="text-[11px] text-slate-400">Chủ động gửi thông báo học phí sớm</p>
              </div>
            </div>

            {/* CHUYÊN CẦN */}
            <div className="bg-gradient-to-br from-indigo-500/10 via-white to-white p-5 rounded-3xl border border-indigo-200 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-indigo-800 uppercase tracking-wider">
                  Chuyên Cần & Sĩ Số
                </span>
                <div className="w-8 h-8 rounded-xl bg-indigo-100/80 text-indigo-700 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-indigo-700 mt-2">
                {stats.kpis.overallAttendanceRate}% <span className="text-xs font-semibold text-slate-500">tỉ lệ</span>
              </div>
              <div className="text-xs text-slate-500 space-y-1 mt-3 pt-3 border-t border-slate-100">
                <div className="flex justify-between">
                  <span>Học viên mới:</span>
                  <strong className="text-indigo-700">+{stats.kpis.newEnrollmentsCount} bạn</strong>
                </div>
                <div className="flex justify-between">
                  <span>Số buổi đã dạy:</span>
                  <strong className="text-slate-800">{stats.kpis.sessionsTaughtCount} buổi</strong>
                </div>
              </div>
            </div>
          </div>

          {/* BIỂU ĐỒ DOANH THU 12 THÁNG SANG TRỌNG */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Biểu đồ Doanh thu & Điểm danh ({year})
                </h3>
                <p className="text-xs text-slate-500">Bấm vào cột tháng để chuyển nhanh chế độ xem của tháng đó</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> Kỳ chọn
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-slate-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Các tháng khác
                </span>
              </div>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end pt-6 min-h-[180px]">
              {(stats.monthlyTrend || []).map((m: any) => {
                const heightPct =
                  m.collected > 0
                    ? Math.max(12, Math.round((m.collected / maxMonthlyRevenue) * 100))
                    : 6;
                return (
                  <div
                    key={m.month}
                    onClick={() => {
                      setPeriodType("MONTH");
                      setValue(m.month);
                    }}
                    className="cursor-pointer flex flex-col items-center group"
                  >
                    <span className="text-[10px] font-bold text-slate-500 mb-1.5 group-hover:text-indigo-600 transition">
                      {m.collected > 0 ? `${(m.collected / 1000000).toFixed(1)}tr` : "—"}
                    </span>
                    <div className="w-full h-28 bg-slate-100/80 rounded-2xl flex items-end p-1 overflow-hidden group-hover:bg-slate-200/60 transition">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className={`w-full rounded-xl transition-all duration-300 ${
                          m.isSelected
                            ? "bg-gradient-to-t from-indigo-700 to-indigo-500 shadow-md shadow-indigo-600/30"
                            : "bg-slate-300 group-hover:bg-slate-400"
                        }`}
                      />
                    </div>
                    <span className={`text-xs font-black mt-2 ${m.isSelected ? "text-indigo-700 font-extrabold" : "text-slate-600"}`}>
                      {m.label}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {m.sessionsCount} buổi
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BẢNG TỔNG HỢP THEO LỚP HỌC */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Hiệu quả từng Lớp học ({stats.filter.label})
                </h3>
                <p className="text-xs text-slate-500">Bấm vào hàng để mở lớp điểm danh hoặc nạp tiền ngay</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-5">Tên lớp</th>
                    <th className="py-3 px-5">Sĩ số</th>
                    <th className="py-3 px-5">Buổi dạy & Chuyên cần</th>
                    <th className="py-3 px-5">Thực thu</th>
                    <th className="py-3 px-5 text-right">Công nợ tồn</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(stats.classBreakdown || []).map((c: any) => (
                    <tr
                      key={c.id}
                      onClick={() => onOpenClass(c.id)}
                      className="hover:bg-slate-50/80 cursor-pointer transition"
                    >
                      <td className="py-3.5 px-5">
                        <div className="font-extrabold text-indigo-700 hover:underline flex items-center gap-2">
                          {c.name}
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <span className="text-xs text-slate-500">
                          {c.type === "COURSE" ? "Trọn khóa IELTS" : "Theo tháng (8 buổi)"} · {vnd(c.monthlyTuition)}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-xs font-semibold">
                        {c.studentCount} bạn
                        {c.newStudentsInPeriod > 0 && (
                          <span className="ml-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                            +{c.newStudentsInPeriod} mới
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-5 text-xs">
                        <div>Đã dạy: <strong>{c.sessionsInPeriod} buổi</strong></div>
                        <div className="text-slate-500">
                          Chuyên cần: <strong className={c.attendanceRate >= 80 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>{c.attendanceRate}%</strong>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-black text-emerald-700 text-sm">
                        {vnd(c.collectedInPeriod)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {c.classDebt > 0 ? (
                          <div>
                            <span className="font-black text-rose-600 text-sm block">{vnd(c.classDebt)}</span>
                            <span className="text-[10px] text-rose-500 font-semibold">{c.classOwingStudents} bạn cần thu</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/60">
                            <Check className="w-3 h-3" /> Đủ 100%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* NHẬT KÝ PHIẾU THU */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Nhật ký Phiếu thu Học phí ({stats.transactions?.length || 0} giao dịch)
                </h3>
                <p className="text-xs text-slate-500">Đối chiếu trực tiếp với sao kê ngân hàng và sổ quỹ tiền mặt</p>
              </div>
            </div>

            {stats.transactions?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="py-3 px-5">Ngày thu</th>
                      <th className="py-3 px-5">Học viên</th>
                      <th className="py-3 px-5">Lớp học</th>
                      <th className="py-3 px-5">Hình thức</th>
                      <th className="py-3 px-5">Ghi chú</th>
                      <th className="py-3 px-5 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.transactions.map((t: any) => (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-5 font-bold text-slate-700">{fmtDate(t.paidAt)}</td>
                        <td className="py-3 px-5">
                          <button
                            type="button"
                            onClick={() =>
                              t.studentId &&
                              setDossierTarget({
                                studentId: t.studentId,
                                classId: t.classId,
                              })
                            }
                            className="font-extrabold text-indigo-700 hover:underline text-left block"
                          >
                            {t.studentName}
                          </button>
                          {t.studentPhone && <span className="text-slate-400 text-[10px]">{t.studentPhone}</span>}
                        </td>
                        <td className="py-3 px-5 font-medium text-slate-700">{t.className}</td>
                        <td className="py-3 px-5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              t.paymentMethod === "CASH"
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            }`}
                          >
                            {t.paymentMethod === "CASH" ? "💵 Tiền mặt" : "🏦 Chuyển khoản"}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-slate-600">{t.note || "—"}</td>
                        <td className="py-3 px-5 text-right font-black text-emerald-700 text-sm">
                          +{vnd(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                Chưa có giao dịch thu học phí nào trong khoảng thời gian này.
              </div>
            )}
          </div>
        </>
      )}

      {dossierTarget && (
        <StudentDossierModal
          studentId={dossierTarget.studentId}
          classId={dossierTarget.classId}
          onClose={() => setDossierTarget(null)}
          onSaved={async () => {
            notify("Đã cập nhật hồ sơ học viên!");
            await loadStats();
          }}
        />
      )}
    </div>
  );
}

/* ========================================================================= */
/* MÀN HÌNH CHI TIẾT LỚP HỌC (ĐIỂM DANH & NẠP HỌC PHÍ)                       */
/* ========================================================================= */
function ClassView({
  classId,
  notify,
}: {
  classId: string;
  notify: (m: string) => void;
}) {
  const [detail, setDetail] = useState<ClassDetail | null>(null);
  const [date, setDate] = useState(todayStr());
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payFor, setPayFor] = useState<Student | null>(null);
  const [noteFor, setNoteFor] = useState<Student | null>(null);
  const [evaluationFor, setEvaluationFor] = useState<Student | null>(null);
  const [dossierStudentId, setDossierStudentId] = useState<string | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "PAUSED" | "FINISHED" | "ALL" | "EXPIRING">("ACTIVE");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Tính năng học vụ cao cấp (Academy Suite)
  const [homeworkMarks, setHomeworkMarks] = useState<Record<string, boolean>>({});
  const [noteMarks, setNoteMarks] = useState<Record<string, string>>({});
  const [topic, setTopic] = useState("");
  const [teacherNote, setTeacherNote] = useState("");
  const [showLessonPlan, setShowLessonPlan] = useState(false);
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);

  // Tự động chọn buổi hôm nay hoặc buổi chưa điểm danh đầu tiên
  useEffect(() => {
    if (detail && detail.sessionHistory && detail.sessionHistory.length > 0) {
      const hasCurrent = detail.sessionHistory.some((s) => s.date === date);
      if (!hasCurrent) {
        const today = todayStr();
        const todaySession = detail.sessionHistory.find((s) => s.date === today);
        if (todaySession) {
          setDate(todaySession.date);
        } else {
          const firstIncomplete = detail.sessionHistory.find((s) => !s.isCompleted);
          if (firstIncomplete) {
            setDate(firstIncomplete.date);
          } else {
            setDate(detail.sessionHistory[0].date);
          }
        }
      }
    }
  }, [detail]);

  const handleInitFixedSessions = async () => {
    try {
      setActionLoading(true);
      await api(`/api/classes/${classId}/sessions`, {
        method: "POST",
        body: JSON.stringify({ action: "GENERATE_SCHEDULE" }),
      });
      notify("Đã tự động khởi tạo 8 buổi học cố định theo lịch của lớp!");
      await loadDetail();
    } catch (e: any) {
      notify(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleNextCycle = async () => {
    if (!window.confirm("Khởi tạo tiếp 8 buổi học cho chu kỳ tháng tiếp theo?")) return;
    try {
      setActionLoading(true);
      await api(`/api/classes/${classId}/sessions`, {
        method: "POST",
        body: JSON.stringify({ action: "NEXT_CYCLE" }),
      });
      notify("Đã khởi tạo thêm 8 buổi cho chu kỳ tiếp theo!");
      await loadDetail();
    } catch (e: any) {
      notify(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddMakeupSession = async () => {
    const inputDate = window.prompt("Nhập ngày học bù (định dạng YYYY-MM-DD):", todayStr());
    if (!inputDate || !/^\d{4}-\d{2}-\d{2}$/.test(inputDate)) {
      if (inputDate) notify("Ngày không đúng định dạng YYYY-MM-DD");
      return;
    }
    try {
      setActionLoading(true);
      await api(`/api/classes/${classId}/sessions`, {
        method: "POST",
        body: JSON.stringify({
          action: "ADD_SESSION",
          date: inputDate,
          title: `Buổi học bù (${inputDate.slice(8, 10)}/${inputDate.slice(5, 7)})`,
        }),
      });
      notify(`Đã thêm buổi học bù ngày ${fmtDate(inputDate)}!`);
      setDate(inputDate);
      await loadDetail();
    } catch (e: any) {
      notify(e.message);
    } finally {
      setActionLoading(false);
    }
  };

  const loadDetail = useCallback(async () => {
    try {
      setDetail(await api<ClassDetail>(`/api/classes/${classId}`));
    } catch (e: any) {
      notify(e.message);
    }
  }, [classId, notify]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (!detail) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await api<{
          saved: boolean;
          records: Record<string, string>;
          homeworkRecords?: Record<string, boolean>;
          noteRecords?: Record<string, string>;
          topic?: string;
          teacherNote?: string;
          title?: string;
        }>(`/api/classes/${classId}/attendance?date=${date}`);
        if (cancelled) return;
        const next: Record<string, Status> = {};
        const nextHw: Record<string, boolean> = {};
        const nextNotes: Record<string, string> = {};
        detail.students.forEach((s) => {
          next[s.studentId] =
            (r.records[s.studentId] as Status) || "PRESENT";
          nextHw[s.studentId] = r.homeworkRecords?.[s.studentId] ?? true;
          if (r.noteRecords?.[s.studentId]) {
            nextNotes[s.studentId] = r.noteRecords[s.studentId];
          }
        });
        setMarks(next);
        setHomeworkMarks(nextHw);
        setNoteMarks(nextNotes);
        setTopic(r.topic || "");
        setTeacherNote(r.teacherNote || "");
        setSaved(r.saved);
      } catch (e: any) {
        notify(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, date, classId, notify]);

  const saveAttendance = async () => {
    try {
      setSaving(true);
      await api(`/api/classes/${classId}/attendance`, {
        method: "POST",
        body: JSON.stringify({
          date,
          records: marks,
          homeworkRecords: homeworkMarks,
          noteRecords: noteMarks,
          topic,
          teacherNote,
        }),
      });
      notify(`Đã lưu điểm danh & kế hoạch buổi học ngày ${fmtDate(date)}!`);
      await loadDetail();
    } catch (e: any) {
      notify(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkAllPresent = () => {
    if (!detail) return;
    const next: Record<string, Status> = {};
    detail.students.forEach((s) => {
      next[s.studentId] = "PRESENT";
    });
    setMarks(next);
    notify("⚡ Đã chọn CÓ MẶT cho toàn bộ học viên!");
  };

  const handleCopyZaloReport = () => {
    if (!detail) return;
    const activeStudents = detail.students.filter(
      (s) => (s.status || "ACTIVE") === "ACTIVE"
    );
    const presentCount = activeStudents.filter((s) =>
      ["PRESENT", "LATE"].includes(marks[s.studentId])
    ).length;
    const onTimeCount = activeStudents.filter(
      (s) => marks[s.studentId] === "PRESENT"
    ).length;
    const lateCount = activeStudents.filter(
      (s) => marks[s.studentId] === "LATE"
    ).length;
    const excusedCount = activeStudents.filter(
      (s) => marks[s.studentId] === "EXCUSED"
    ).length;
    const absentCount = activeStudents.filter(
      (s) => marks[s.studentId] === "ABSENT"
    ).length;
    const hwDoneCount = activeStudents.filter(
      (s) => homeworkMarks[s.studentId] !== false
    ).length;

    const currentSession = detail.sessionHistory.find((s) => s.date === date);
    const sessionLabel = currentSession?.title || `Buổi học ngày ${fmtDate(date)}`;

    const text = `🎓 [DANIELTS ACADEMY - BÁO CÁO BUỔI HỌC]
📚 Lớp: ${detail.class.name} (${detail.class.scheduleText || ""})
📅 Buổi: ${sessionLabel} (${fmtDate(date)})
━━━━━━━━━━━━━━━━━━━━
👥 SĨ SỐ BUỔI HỌC:
• Có mặt: ${presentCount}/${activeStudents.length} học viên (${Math.round(
      (presentCount / (activeStudents.length || 1)) * 100
    )}%)
• Đúng giờ: ${onTimeCount} | Đi muộn: ${lateCount}
• Nghỉ có phép: ${excusedCount} | Vắng mặt: ${absentCount}
• Hoàn thành BTVN: ${hwDoneCount}/${activeStudents.length} em

📖 CHỦ ĐỀ BÀI HỌC:
${topic ? topic : "Theo phân phối chương trình giáo trình"}

📝 DẶN DÒ & BTVN:
${teacherNote ? teacherNote : "Các em ôn lại từ vựng và hoàn thành bài tập được giao."}

👉 Quý phụ huynh vui lòng tra cứu sổ liên lạc điện tử & quét mã VietQR tự động tại:
${typeof window !== "undefined" ? window.location.origin : "https://danielts.nextband.vn"}/p/...

Trân trọng cảm ơn Quý phụ huynh!`;

    navigator.clipboard.writeText(text);
    notify("📋 Đã sao chép tin nhắn báo cáo Zalo! Thầy chỉ cần bấm Ctrl+V để gửi vào nhóm lớp.");
  };

  const handleExportAttendanceExcel = () => {
    if (!detail) return;
    const rows = detail.students.map((s, idx) => {
      const row: Record<string, any> = {
        "STT": idx + 1,
        "Mã Học Viên": s.studentCode || `DTS-${String(idx + 1).padStart(3, "0")}`,
        "Họ và Tên": s.name,
        "Số Điện Thoại": s.phone || "—",
        "Trạng Thái":
          s.status === "ACTIVE"
            ? "Đang học"
            : s.status === "PAUSED"
            ? "Bảo lưu"
            : "Đã nghỉ",
      };

      // Đưa từng buổi trong dải 8 buổi vào cột Excel
      detail.sessionHistory.slice(0, 8).forEach((sh, sIdx) => {
        const colName = `Buổi ${sIdx + 1} (${sh.date.slice(8, 10)}/${sh.date.slice(5, 7)})`;
        row[colName] = sh.isCompleted ? "Có mặt" : "—";
      });

      row["Tổng Buổi Học"] = `${s.attended}/${s.targetSessions || 8}`;
      row["Tỉ Lệ Chuyên Cần"] = `${Math.round(
        (s.attended / (s.targetSessions || 8)) * 100
      )}%`;
      row["Học Phí Chu Kỳ"] = vnd(detail.class.monthlyTuition);
      row["Đã Đóng"] = vnd(s.tuition?.paid || 0);
      row["Còn Nợ"] = vnd(s.tuition?.debt || 0);

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "So_Diem_Danh");

    const fileName = `So_Diem_Danh_${detail.class.name.replace(/[^a-zA-Z0-9]/g, "_")}_${date}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    notify(`📊 Đã xuất file Excel sổ điểm danh: ${fileName}`);
  };

  const handleUpdateStudentStatus = async (
    s: Student,
    nextStatus: "ACTIVE" | "PAUSED" | "FINISHED"
  ) => {
    try {
      await api(`/api/classes/${classId}`, {
        method: "PATCH",
        body: JSON.stringify({
          enrollmentId: s.enrollmentId,
          status: nextStatus,
        }),
      });
      const label =
        nextStatus === "ACTIVE"
          ? "Đang học"
          : nextStatus === "PAUSED"
          ? "Bảo lưu"
          : "Đã nghỉ";
      notify(`Đã chuyển học viên ${s.name} sang trạng thái "${label}"`);
      await loadDetail();
    } catch (e: any) {
      notify(e.message);
    }
  };

  const handleCopyParentLink = (s: Student) => {
    const code = s.studentCode || s.phone || s.studentId;
    const parentUrl = `${typeof window !== "undefined" ? window.location.origin : "https://danielts.nextband.vn"}/p/${encodeURIComponent(code)}`;
    const sessionNotice =
      s.remainingSessions <= 0
        ? `⚠️ Lưu ý: Em đã qua hết ${s.usedSessions}/${s.targetSessions} buổi học theo lịch của kỳ này. Kính mời Quý phụ huynh nộp học phí kỳ mới để trung tâm tiếp tục xếp lịch học cho con.`
        : s.remainingSessions <= 2
        ? `ℹ️ Thông báo: Em còn ${s.remainingSessions} buổi học theo lịch trong chu kỳ này (${s.usedSessions}/${s.targetSessions} buổi đã qua). Kính mời Quý phụ huynh chuẩn bị nộp học phí cho kỳ tiếp theo.`
        : `📊 Tiến độ buổi học theo lịch: ${s.usedSessions}/${s.targetSessions} buổi (Còn lại: ${s.remainingSessions} buổi).`;

    const msg = `Kính gửi Quý phụ huynh em ${s.name},
Trung tâm Anh ngữ DanielTS xin gửi Sổ liên lạc trực tuyến và tình trạng học phí của học viên:

${sessionNotice}

👉 Phụ huynh bấm vào link bên dưới để xem chi tiết lịch sử học tập & quét mã VietQR tự động:
${parentUrl}

Trân trọng cảm ơn Quý phụ huynh!`;
    navigator.clipboard.writeText(msg);
    notify(`Đã sao chép link tra cứu & tin nhắn Zalo cho phụ huynh em ${s.name}!`);
  };

  const handleRemoveStudent = async (s: Student) => {
    if (!window.confirm(`Xóa hoàn toàn học viên "${s.name}" khỏi lớp này? (Khuyên dùng: Bạn có thể chọn chuyển trạng thái "Đã nghỉ" để lưu trữ hồ sơ thay vì xóa)`)) return;
    try {
      await api(
        `/api/classes/${classId}?enrollmentId=${s.enrollmentId}`,
        { method: "DELETE" }
      );
      notify(`Đã xóa học viên ${s.name}`);
      await loadDetail();
    } catch (err: any) {
      notify(err.message);
    }
  };

  if (!detail) {
    return (
      <div className="py-20 text-center text-slate-500 bg-white rounded-3xl border border-slate-200">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span className="text-xs font-bold">Đang tải danh sách lớp...</span>
      </div>
    );
  }

  const isMonthly = detail.class.type === "MONTHLY";

  return (
    <div className="space-y-5">
      {/* HEADER LỚP */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {detail.class.name}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                isMonthly
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-purple-50 text-purple-700 border border-purple-200"
              }`}
            >
              {isMonthly ? "Theo tháng (8 buổi)" : "Trọn khóa IELTS"}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span>{detail.class.scheduleText || "Chưa có lịch"}</span>
            <span>·</span>
            <span>Học phí: <strong className="text-indigo-700">{vnd(detail.class.monthlyTuition)}</strong></span>
            {isMonthly && <span>(lẻ: {vnd(detail.class.pricePerSession)}/buổi)</span>}
          </p>
        </div>

        <button
          onClick={() => setShowAddStudent(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4" />
          Thêm học viên vào lớp
        </button>
      </div>

      {/* THANH ĐIỂM DANH THEO LỊCH CỐ ĐỊNH & DẢI 8 BUỔI HỌC */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-4">
        {/* TIÊU ĐỀ KHU VỰC VÀ CÁC THAO TÁC QUẢN LÝ LỊCH HỌC */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700">
                <Calendar className="w-3.5 h-3.5" />
              </span>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Lịch học cố định & Điểm danh buổi học
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 ml-8">
              Lịch: <strong className="text-indigo-900 font-bold">{detail.class.scheduleText || "Chưa thiết lập"}</strong>
              {" · "}
              {detail.sessionHistory.length > 0 ? (
                <span>Đã ấn định {detail.sessionHistory.length} buổi (bấm chọn buổi bên dưới để điểm danh)</span>
              ) : (
                <span className="text-amber-600 font-semibold">Chưa sinh dải buổi học cố định</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {detail.sessionHistory.length === 0 ? (
              <button
                type="button"
                onClick={handleInitFixedSessions}
                disabled={actionLoading}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm active:scale-95 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {actionLoading ? "Đang tạo..." : "Khởi tạo 8 buổi cố định theo lịch"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAddMakeupSession}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                  title="Thêm một buổi học bù ngoài các buổi cố định"
                >
                  <Plus className="w-3 h-3" />
                  + Thêm buổi học bù
                </button>
                <button
                  type="button"
                  onClick={handleNextCycle}
                  disabled={actionLoading}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                  title="Tạo thêm 8 buổi cho chu kỳ tháng tiếp theo"
                >
                  <RotateCcw className="w-3 h-3" />
                  + 8 buổi tháng tiếp
                </button>
              </>
            )}
          </div>
        </div>

        {/* DẢI CÁC BUỔI HỌC CỐ ĐỊNH (BUỔI 1 -> BUỔI 8) */}
        {detail.sessionHistory.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
            {detail.sessionHistory.map((sh, idx) => {
              const isSelected = sh.date === date;
              const isToday = sh.date === todayStr();
              const [, m, d] = sh.date.split("-");
              const dt = new Date(`${sh.date}T12:00:00Z`);
              const dayOfWeek = dt.getUTCDay();
              const shortDay = NUMBER_TO_SHORT_NAME[dayOfWeek] || `T${dayOfWeek + 1}`;

              return (
                <button
                  key={sh.id || sh.date}
                  type="button"
                  onClick={() => setDate(sh.date)}
                  className={`relative p-2.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400 scale-[1.02]"
                      : sh.isCompleted
                      ? "bg-emerald-50/80 text-slate-900 border-emerald-300 hover:bg-emerald-100"
                      : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100/90"
                  }`}
                >
                  {isToday && (
                    <span
                      className={`absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow-xs ${
                        isSelected
                          ? "bg-amber-300 text-slate-950 font-black"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      ⚡ Hôm nay
                    </span>
                  )}
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`text-[10px] font-extrabold uppercase tracking-wide truncate ${
                        isSelected ? "text-indigo-100 font-black" : "text-slate-400"
                      }`}
                    >
                      {sh.title ? sh.title.split("(")[0].trim() : `Buổi ${idx + 1}`}
                    </span>
                  </div>

                  <div className="my-1">
                    <span className="text-sm font-black tracking-tight block">
                      {shortDay} · {d}/{m}
                    </span>
                  </div>

                  <div className="mt-1 pt-1.5 border-t border-black/5 flex items-center justify-between gap-1">
                    {sh.isCompleted ? (
                      <span
                        className={`text-[10px] font-bold flex items-center gap-1 ${
                          isSelected ? "text-emerald-200" : "text-emerald-700"
                        }`}
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        {sh.presentCount}/{sh.totalCount || detail.students.length}
                      </span>
                    ) : (
                      <span
                        className={`text-[10px] font-semibold ${
                          isSelected ? "text-indigo-200" : "text-slate-400"
                        }`}
                      >
                        ● Chưa lưu
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🗓️</span>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Lớp này chưa có danh sách 8 buổi học ấn định
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Bấm khởi tạo để tự động chốt 8 buổi học chuẩn theo lịch ({detail.class.scheduleText || "Thứ 3, Thứ 5"}), giúp điểm danh 1 chạm siêu nhanh!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleInitFixedSessions}
              disabled={actionLoading}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm whitespace-nowrap active:scale-95 transition"
            >
              {actionLoading ? "Đang tạo..." : "Khởi tạo ngay 8 buổi"}
            </button>
          </div>
        )}

        {/* THANH ĐIỀU KHIỂN ĐIỂM DANH CHO BUỔI ĐANG CHỌN */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                Đang điểm danh:
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-black">
                {fmtDate(date)}
              </span>
            </div>

            {saved ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" /> Đã lưu buổi này
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                <Clock className="w-3.5 h-3.5" /> Chưa lưu điểm danh
              </span>
            )}

            <button
              type="button"
              onClick={() => setShowCustomDate(!showCustomDate)}
              className="text-[11px] font-bold text-slate-500 hover:text-indigo-600 underline ml-1"
            >
              {showCustomDate ? "Ẩn chọn ngày khác" : "Chọn ngày khác ngoài lịch"}
            </button>

            {showCustomDate && (
              <div className="flex items-center gap-1.5 animate-fadeIn">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="px-2.5 py-1 rounded-xl border border-slate-300 text-xs font-extrabold text-slate-800 shadow-xs"
                />
                {date !== todayStr() && (
                  <button
                    type="button"
                    onClick={() => setDate(todayStr())}
                    className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 transition"
                  >
                    Hôm nay
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCopyZaloReport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-extrabold border border-indigo-200/80 active:scale-95 transition"
              title="Sao chép mẫu tin nhắn báo cáo buổi học định dạng chuẩn để gửi vào Zalo phụ huynh"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-600" />
              <span>Báo cáo Zalo</span>
            </button>

            <button
              type="button"
              onClick={handleExportAttendanceExcel}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold border border-slate-200 active:scale-95 transition"
              title="Xuất file Excel ma trận 8 buổi học và tỉ lệ chuyên cần chuẩn trung tâm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>Sổ Excel</span>
            </button>

            <button
              type="button"
              onClick={handleMarkAllPresent}
              disabled={detail.students.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold border border-emerald-200/80 active:scale-95 transition"
              title="Đánh dấu nhanh Có mặt cho toàn bộ học viên trong lớp"
            >
              <Zap className="w-3.5 h-3.5 fill-emerald-600" />
              <span>Có mặt tất cả</span>
            </button>

            <button
              type="button"
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                privacyMode
                  ? "bg-amber-100/90 text-amber-900 border-amber-300 shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
              title="Ẩn số tiền học phí và công nợ khi máy tính kết nối máy chiếu trên lớp"
            >
              {privacyMode ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                  <span>Ẩn học phí (Chiếu lớp)</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Hiện học phí</span>
                </>
              )}
            </button>

            <button
              onClick={saveAttendance}
              disabled={saving || detail.students.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              {saving ? "Đang lưu..." : "Lưu điểm danh"}
            </button>
          </div>
        </div>
      </div>

      {/* THANH CHỈ SỐ HỌC VỤ REAL-TIME (ACADEMY KPI BAR) */}
      {(() => {
        const activeStudents = detail.students.filter(
          (s) => (s.status || "ACTIVE") === "ACTIVE"
        );
        const presentCount = activeStudents.filter((s) =>
          ["PRESENT", "LATE"].includes(marks[s.studentId])
        ).length;
        const onTimeCount = activeStudents.filter(
          (s) => marks[s.studentId] === "PRESENT"
        ).length;
        const lateCount = activeStudents.filter(
          (s) => marks[s.studentId] === "LATE"
        ).length;
        const excusedCount = activeStudents.filter(
          (s) => marks[s.studentId] === "EXCUSED"
        ).length;
        const absentCount = activeStudents.filter(
          (s) => marks[s.studentId] === "ABSENT"
        ).length;
        const hwDoneCount = activeStudents.filter(
          (s) => homeworkMarks[s.studentId] !== false
        ).length;
        const rate =
          activeStudents.length > 0
            ? Math.round((presentCount / activeStudents.length) * 100)
            : 0;
        const currentSession = detail.sessionHistory.find((s) => s.date === date);

        return (
          <div className="p-4 rounded-3xl bg-slate-900 text-white space-y-3.5 shadow-lg border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Chỉ số học vụ thời gian thực · {currentSession?.title || `Buổi ngày ${fmtDate(date)}`}
                  </span>
                </div>
                <h4 className="text-base font-black text-white mt-0.5">
                  Tỉ lệ chuyên cần: <span className="text-emerald-400">{rate}%</span>
                  <span className="text-xs font-semibold text-slate-400 ml-2">
                    ({presentCount}/{activeStudents.length} học viên có mặt)
                  </span>
                </h4>
              </div>

              {/* 4 CHỈ SỐ NHANH */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
                <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 font-bold block">🟢 Đúng giờ</span>
                  <strong className="text-xs font-black text-emerald-400">{onTimeCount} em</strong>
                </div>
                <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 font-bold block">🟠 Đi muộn</span>
                  <strong className="text-xs font-black text-amber-400">{lateCount} em</strong>
                </div>
                <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 font-bold block">🔵 Có phép</span>
                  <strong className="text-xs font-black text-sky-400">{excusedCount} em</strong>
                </div>
                <div className="bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 font-bold block">🔴 Vắng mặt</span>
                  <strong className="text-xs font-black text-rose-400">{absentCount} em</strong>
                </div>
              </div>
            </div>

            {/* THANH TIẾN ĐỘ CHUYÊN CẦN */}
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${rate}%` }}
              />
            </div>

            {/* KẾ HOẠCH BÀI HỌC & DẶN DÒ */}
            <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300 min-w-0">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">
                  {topic ? `📖 ${topic}` : "Chưa có chủ đề bài học"}
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">
                  BTVN: <strong className="text-teal-300 font-bold">{hwDoneCount}/{activeStudents.length} em nộp</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowLessonPlan(!showLessonPlan)}
                className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-[11px] font-bold transition flex items-center gap-1 shrink-0"
              >
                <Edit3 className="w-3 h-3" />
                {showLessonPlan ? "Đóng giáo án" : "Soạn giáo án & BTVN buổi này"}
              </button>
            </div>

            {showLessonPlan && (
              <div className="p-3.5 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-2.5 animate-fadeIn text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-300 block mb-1">
                    Chủ đề bài giảng (Lesson Topic) — Tự động hiển thị ở Cổng Phụ Huynh:
                  </label>
                  <input
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="VD: Unit 4 - Writing Task 2 (Causes & Solutions) / Speaking Part 2"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-300 block mb-1">
                    Dặn dò &amp; Bài tập về nhà (Homework Assignment):
                  </label>
                  <textarea
                    rows={2}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="VD: Hoàn thành bài viết Task 2 nộp trước 18:00 Thứ 5, học thuộc 15 từ vựng Topic Environment..."
                    value={teacherNote}
                    onChange={(e) => setTeacherNote(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* THANH LỌC TRẠNG THÁI HỌC VIÊN */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1.5 rounded-xl transition ${
              statusFilter === "ACTIVE"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Đang học ({detail.students.filter((s) => (s.status || "ACTIVE") === "ACTIVE").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("EXPIRING")}
            className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 ${
              statusFilter === "EXPIRING"
                ? "bg-amber-500 text-white shadow-sm font-extrabold"
                : "text-amber-800 hover:bg-amber-100 font-bold"
            }`}
            title="Học viên còn lại ≤ 2 buổi học theo lịch — Cần thông báo thu học phí"
          >
            <span>⚠️ Sắp hết phí (≤ 2 buổi)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              statusFilter === "EXPIRING" ? "bg-amber-700/50 text-white" : "bg-amber-200 text-amber-900"
            }`}>
              {detail.students.filter(
                (s) =>
                  (s.status || "ACTIVE") === "ACTIVE" &&
                  isMonthly &&
                  s.paidSessions > 0 &&
                  s.remainingSessions <= 2
              ).length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PAUSED")}
            className={`px-3 py-1.5 rounded-xl transition ${
              statusFilter === "PAUSED"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Bảo lưu ({detail.students.filter((s) => s.status === "PAUSED").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("FINISHED")}
            className={`px-3 py-1.5 rounded-xl transition ${
              statusFilter === "FINISHED"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Đã nghỉ ({detail.students.filter((s) => s.status === "FINISHED").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl transition ${
              statusFilter === "ALL"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Tất cả ({detail.students.length})
          </button>
        </div>

        {privacyMode && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
            <span>Chế độ chiếu lớp: Số tiền học phí &amp; công nợ đang được ẩn an toàn.</span>
          </div>
        )}
      </div>

      {/* DANH SÁCH THẺ HỌC VIÊN */}
      <div className="space-y-3">
        {detail.students
          .filter((s) => {
            const st = s.status || "ACTIVE";
            if (statusFilter === "ALL") return true;
            if (statusFilter === "EXPIRING") {
              return st === "ACTIVE" && isMonthly && s.paidSessions > 0 && s.remainingSessions <= 2;
            }
            return st === statusFilter;
          })
          .map((s) => {
          const debt = s.tuition?.debt || 0;
          const noPaidYet = !s.tuition || s.tuition.paid === 0;
          const isExpiredOrOver =
            isMonthly && s.paidSessions > 0 && s.remainingSessions <= 0;
          const isExpiringSoon =
            isMonthly &&
            s.paidSessions > 0 &&
            s.remainingSessions > 0 &&
            s.remainingSessions <= 2;

          return (
            <div
              key={s.studentId}
              className={`bg-white rounded-3xl border p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 card-hover-effect transition-all ${
                s.status === "PAUSED"
                  ? "border-amber-200/80 bg-amber-50/20"
                  : s.status === "FINISHED"
                  ? "border-slate-200 opacity-60 bg-slate-50/40"
                  : debt > 0 || isExpiredOrOver || noPaidYet
                  ? "border-rose-300 bg-rose-50/15 hover:border-rose-400"
                  : isExpiringSoon
                  ? "border-amber-300 bg-amber-50/25 hover:border-amber-400"
                  : "border-slate-200/80 hover:border-indigo-200"
              }`}
            >
              {/* TRÁI: AVATAR & THÔNG TIN HỌC VIÊN & CẢNH BÁO */}
              <div className="min-w-0 lg:w-5/12 flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 mt-0.5">
                  {s.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(-2)
                    .map((w) => w[0]?.toUpperCase())
                    .join("") || "HV"}
                </div>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDossierStudentId(s.studentId)}
                      className="font-extrabold text-slate-900 hover:text-indigo-600 transition text-base text-left flex items-center gap-1.5 group"
                      title="Bấm để xem toàn bộ hồ sơ học viên"
                    >
                      <span>{s.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200/60 group-hover:bg-indigo-600 group-hover:text-white transition">
                        Hồ sơ ↗
                      </span>
                    </button>

                    <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                      {s.studentCode || `DTS-${s.studentId.slice(-4).toUpperCase()}`}
                    </span>

                    {/* CHỌN TRẠNG THÁI HỌC VIÊN */}
                    <select
                      value={s.status || "ACTIVE"}
                      onChange={(e) => handleUpdateStudentStatus(s, e.target.value as any)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border transition cursor-pointer ${
                        (s.status || "ACTIVE") === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : s.status === "PAUSED"
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : "bg-slate-100 text-slate-600 border-slate-300"
                      }`}
                      title="Chuyển trạng thái: Đang học / Bảo lưu / Đã nghỉ"
                    >
                      <option value="ACTIVE">🟢 Đang học</option>
                      <option value="PAUSED">⏸️ Bảo lưu</option>
                      <option value="FINISHED">🏁 Đã nghỉ</option>
                    </select>

                    {/* HUY HIỆU ĐÁNH GIÁ & PHÂN LOẠI THÁNG */}
                    {s.latestEvaluation ? (
                      <button
                        type="button"
                        onClick={() => setEvaluationFor(s)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border transition flex items-center gap-1 ${
                          s.latestEvaluation.classification === "XUAT_SAC"
                            ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                            : s.latestEvaluation.classification === "GIOI"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                            : s.latestEvaluation.classification === "KHA"
                            ? "bg-indigo-50 text-indigo-800 border-indigo-300 hover:bg-indigo-100"
                            : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100"
                        }`}
                        title={`Đánh giá tháng ${s.latestEvaluation.monthYear}: Bấm để xem / sửa`}
                      >
                        <span>
                          {s.latestEvaluation.classification === "XUAT_SAC"
                            ? "🏆 Xuất sắc"
                            : s.latestEvaluation.classification === "GIOI"
                            ? "🌟 Giỏi"
                            : s.latestEvaluation.classification === "KHA"
                            ? "📈 Khá"
                            : "⚠️ Cần kèm"}
                        </span>
                        {s.latestEvaluation.testScore !== null && s.latestEvaluation.testScore !== undefined && (
                          <span className="font-mono">({s.latestEvaluation.testScore}đ)</span>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEvaluationFor(s)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 transition flex items-center gap-1"
                        title="Bấm để đánh giá & xếp loại định kỳ tháng"
                      >
                        <Star className="w-3 h-3 text-amber-500" />
                        <span>Đánh giá tháng</span>
                      </button>
                    )}

                    {s.phone && (
                      <span className="text-xs text-slate-400 font-medium">· {s.phone}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveStudent(s)}
                      title="Xóa học viên khỏi lớp"
                      className="ml-auto text-slate-300 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {isMonthly ? (
                    <div className="text-xs text-slate-600 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>
                        Đã qua theo lịch: <strong className="text-slate-900">{s.usedSessions}/{s.targetSessions} buổi</strong>
                      </span>
                      <span className="text-slate-300">·</span>
                      <span>Đi học: <strong>{s.attended}</strong></span>
                      {s.absentUnexcused > 0 && (
                        <span className="text-rose-600 font-bold">· Vắng: {s.absentUnexcused}</span>
                      )}
                      {s.excused > 0 && (
                        <span className="text-sky-700 font-bold">· Có phép: {s.excused}</span>
                      )}
                      <span className="text-slate-300">·</span>
                      <span className={`px-2 py-0.5 rounded-md font-extrabold ${
                        s.remainingSessions <= 0
                          ? "bg-rose-100 text-rose-800 border border-rose-200"
                          : s.remainingSessions <= 2
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : "text-emerald-700 bg-emerald-50"
                      }`}>
                        {s.remainingSessions > 0
                          ? `Còn ${s.remainingSessions} buổi`
                          : s.remainingSessions === 0
                          ? `Hết buổi (0 buổi)`
                          : `Lố ${Math.abs(s.remainingSessions)} buổi`}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-600">
                      Đã học: <strong className="text-slate-900">{s.attended} buổi</strong> · Có phép: {s.excused} · Vắng: {s.absentUnexcused}
                    </div>
                  )}

                  {/* TRẠNG THÁI HỌC PHÍ (HỖ TRỢ PRIVACY MODE) */}
                  {s.tuition ? (
                    <div className="pt-0.5">
                      {isExpiredOrOver ? (
                        <div className="inline-flex flex-wrap items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-300 text-xs font-black text-rose-800 shadow-xs">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          {privacyMode ? (
                            <span>Đã hết số buổi đóng phí theo lịch — Cần thu kỳ mới</span>
                          ) : s.remainingSessions === 0 ? (
                            <span>🚨 Đã dùng hết {s.targetSessions} buổi đã nộp — Cần thu học phí kỳ mới ({vnd(detail.class.monthlyTuition)})</span>
                          ) : (
                            <span>🚨 Học lố {Math.abs(s.remainingSessions)} buổi theo lịch — Cần thu học phí kỳ mới ({vnd(detail.class.monthlyTuition)})</span>
                          )}
                        </div>
                      ) : debt > 0 ? (
                        <div className="inline-flex flex-wrap items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {privacyMode ? (
                            <span>Chưa đóng đủ học phí</span>
                          ) : (
                            <span>Còn thiếu {vnd(debt)} (Đã đóng {vnd(s.tuition.paid)}/{vnd(s.tuition.total)})</span>
                          )}
                          {!privacyMode && s.tuition.dueDate && (
                            <span className="text-[11px] font-normal text-rose-600">· Hạn: {fmtDate(s.tuition.dueDate)}</span>
                          )}
                        </div>
                      ) : isExpiringSoon ? (
                        <div className="inline-flex flex-wrap items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 text-xs font-extrabold text-amber-900 shadow-xs">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>
                            ⚠️ Sắp hết kỳ phí: Còn {s.remainingSessions} buổi theo lịch — Cần gửi phiếu nhắc PH nộp tháng sau
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200/60">
                          <Check className="w-3.5 h-3.5" />
                          {privacyMode ? (
                            <span>Đã hoàn thành học phí</span>
                          ) : (
                            <span>Đã đóng đủ ({vnd(s.tuition.paid)})</span>
                          )}
                          {isMonthly && s.remainingSessions > 0 && ` · Còn ${s.remainingSessions} buổi`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs font-bold text-rose-600">Chưa nạp học phí</div>
                  )}

                  {s.tuitionNote && (
                    <div
                      onClick={() => setNoteFor(s)}
                      className="cursor-pointer mt-1 px-3 py-1.5 rounded-xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 font-medium flex items-center justify-between gap-2"
                    >
                      <span>📌 {s.tuitionNote}</span>
                      <span className="text-[11px] font-bold text-amber-700 underline">Sửa</span>
                    </div>
                  )}
                </div>
              </div>

              {/* PHẢI: 4 NÚT ĐIỂM DANH + BTVN + NHẬN XÉT + LINK PH + NẠP PHÍ */}
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2">
                {/* 4 NÚT TRẠNG THÁI */}
                <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-200/80 gap-1">
                  {STATUS_BUTTONS.map((b) => {
                    const active = marks[s.studentId] === b.key;
                    const Icon = b.icon;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => setMarks((p) => ({ ...p, [s.studentId]: b.key }))}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold border transition-all duration-150 ${
                          active
                            ? `${b.colorActive} shadow-sm`
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{b.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* BTVN TOGGLE */}
                <button
                  type="button"
                  onClick={() =>
                    setHomeworkMarks((p) => ({
                      ...p,
                      [s.studentId]: p[s.studentId] === false ? true : false,
                    }))
                  }
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                    homeworkMarks[s.studentId] !== false
                      ? "bg-teal-50 text-teal-700 border-teal-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                  title="Nhấn để đổi trạng thái làm bài tập về nhà"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>
                    {homeworkMarks[s.studentId] !== false
                      ? "✓ Đã làm BTVN"
                      : "✕ Chưa làm BTVN"}
                  </span>
                </button>

                {/* NHẬN XÉT BUỔI HỌC VỚI QUICK TAGS */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingNoteFor(
                        editingNoteFor === s.studentId ? null : s.studentId
                      )
                    }
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
                      noteMarks[s.studentId]
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                    title="Nhận xét buổi học gửi phụ huynh"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span className="max-w-[120px] truncate">
                      {noteMarks[s.studentId] || "Nhận xét..."}
                    </span>
                  </button>

                  {editingNoteFor === s.studentId && (
                    <div className="absolute right-0 top-full mt-1.5 z-30 w-72 p-3 bg-white rounded-2xl shadow-xl border border-slate-200 space-y-2 animate-fadeIn text-xs">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>Nhận xét buổi học:</span>
                        <button
                          type="button"
                          onClick={() => setEditingNoteFor(null)}
                          className="text-slate-400 hover:text-slate-600 font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      {/* QUICK TAGS */}
                      <div className="flex flex-wrap gap-1">
                        {[
                          "⭐ Phát biểu tích cực",
                          "💬 Nói tự tin",
                          "📖 Cần ôn từ vựng",
                          "✍️ Cải thiện bài viết",
                          "⚠️ Mất tập trung",
                        ].map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              setNoteMarks((p) => ({
                                ...p,
                                [s.studentId]: tag,
                              }));
                              setEditingNoteFor(null);
                            }}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>

                      <input
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                        placeholder="Hoặc gõ nhận xét riêng..."
                        value={noteMarks[s.studentId] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNoteMarks((p) => ({
                            ...p,
                            [s.studentId]: val,
                          }));
                        }}
                      />
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setEvaluationFor(s)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-200 bg-amber-50/60 hover:bg-amber-100 text-amber-900 shadow-xs transition"
                  title="Đánh giá & xếp loại định kỳ tháng (Học sinh phổ thông - thang điểm 10)"
                >
                  <Award className="w-3.5 h-3.5 text-amber-600" />
                  <span>Đánh giá tháng</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopyParentLink(s)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 shadow-xs transition"
                  title="Sao chép link sổ liên lạc và tin nhắn Zalo gửi phụ huynh"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Link PH</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPayFor(s)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95 transition"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  Nạp học phí
                </button>
              </div>
            </div>
          );
        })}

        {detail.students.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">Lớp chưa có học viên nào.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Bấm Thêm học viên ở trên để ghi nhận học viên mới.</p>
          </div>
        )}
      </div>

      {payFor && (
        <PayModal
          student={payFor}
          classInfo={detail.class}
          onClose={() => setPayFor(null)}
          onDone={async () => {
            setPayFor(null);
            notify("Đã nạp học phí thành công!");
            await loadDetail();
          }}
        />
      )}

      {noteFor && (
        <NoteModal
          student={noteFor}
          onClose={() => setNoteFor(null)}
          onDone={async () => {
            setNoteFor(null);
            notify("Đã lưu ghi chú học phí!");
            await loadDetail();
          }}
        />
      )}

      {evaluationFor && (
        <MonthlyEvaluationModal
          student={evaluationFor}
          classId={classId}
          className={detail.class.name}
          onClose={() => setEvaluationFor(null)}
          onDone={async () => {
            setEvaluationFor(null);
            notify("Đã lưu đánh giá & xếp loại định kỳ tháng!");
            await loadDetail();
          }}
        />
      )}

      {showAddStudent && (
        <AddStudentModal
          classId={classId}
          classType={detail.class.type}
          pricePerSession={detail.class.pricePerSession}
          monthlyTuition={detail.class.monthlyTuition}
          onClose={() => setShowAddStudent(false)}
          onDone={async () => {
            setShowAddStudent(false);
            notify("Đã thêm học viên vào lớp");
            await loadDetail();
          }}
        />
      )}

      {dossierStudentId && (
        <StudentDossierModal
          studentId={dossierStudentId}
          classId={classId}
          onClose={() => setDossierStudentId(null)}
          onSaved={async () => {
            notify("Đã cập nhật hồ sơ học viên!");
            await loadDetail();
          }}
        />
      )}
    </div>
  );
}

/* ========================================================================= */
/* HỒ SƠ TOÀN DIỆN HỌC VIÊN (360° STUDENT DOSSIER MODAL)                     */
/* ========================================================================= */
function StudentDossierModal({
  studentId,
  classId,
  onClose,
  onSaved,
}: {
  studentId: string;
  classId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [dossier, setDossier] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tab, setTab] = useState<"ATTENDANCE" | "TUITION" | "EDIT">(
    "ATTENDANCE"
  );

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editJoinDate, setEditJoinDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);

  const loadDossier = useCallback(async () => {
    try {
      setLoading(true);
      const q = classId ? `?classId=${encodeURIComponent(classId)}` : "";
      const d = await api<any>(`/api/students/${studentId}${q}`);
      setDossier(d);
      setEditName(d.student?.name || "");
      setEditPhone(d.student?.phone || "");
      setEditJoinDate(
        d.enrollment?.joinDate
          ? new Date(d.enrollment.joinDate).toISOString().slice(0, 10)
          : ""
      );
      setEditNote(d.enrollment?.note || "");
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [studentId, classId]);

  useEffect(() => {
    loadDossier();
  }, [loadDossier]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dossier) return;
    try {
      setSaving(true);
      await api(`/api/students/${studentId}`, {
        method: "PATCH",
        body: JSON.stringify({
          enrollmentId: dossier.enrollment.id,
          name: editName,
          phone: editPhone,
          joinDate: editJoinDate,
          note: editNote,
        }),
      });
      await loadDossier();
      onSaved();
      setTab("ATTENDANCE");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (p: any) => {
    if (!window.confirm(`Hủy phiếu thu ${vnd(p.amount)} ngày ${fmtDate(p.paidAt)}? Công nợ học phí của học viên sẽ được khôi phục lại tương ứng.`)) return;
    try {
      await api(`/api/payments/${p.id}`, { method: "DELETE" });
      await loadDossier();
      onSaved();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCopyParent = () => {
    if (!dossier) return;
    const code = dossier.student.studentCode || dossier.student.phone || dossier.student.id;
    const parentUrl = `${typeof window !== "undefined" ? window.location.origin : "http://danielts.nextband.vn"}/p/${encodeURIComponent(code)}`;
    const msg = `Kính gửi Quý phụ huynh em ${dossier.student.name},\nDanielTS xin gửi link tra cứu sổ điểm danh và thanh toán học phí trực tuyến (quét mã VietQR tự động):\n👉 ${parentUrl}\nTrân trọng cảm ơn Quý phụ huynh!`;
    navigator.clipboard.writeText(msg);
    alert(`Đã sao chép link tra cứu & tin nhắn Zalo gửi phụ huynh em ${dossier.student.name}!`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl p-6 sm:p-7 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto border border-slate-100">
        {loading || !dossier ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Đang tải hồ sơ chi tiết học viên...
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
                    {dossier.student.studentCode || "HV"}
                  </span>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {dossier.student.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <span>📞 {dossier.student.phone || "Chưa có SĐT"}</span>
                  <span>·</span>
                  <span>Lớp: <strong className="text-slate-800">{dossier.enrollment.className}</strong></span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyParent}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition"
                  title="Sao chép link sổ liên lạc và tin nhắn Zalo gửi phụ huynh"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Gửi Zalo PH</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* 4 THẺ CHỈ SỐ HỌC VIÊN */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 font-semibold block text-[11px]">Bắt đầu học</span>
                <span className="text-sm font-extrabold text-slate-900 mt-1 block">
                  {fmtDate(dossier.enrollment.joinDate)}
                </span>
                <span className="text-[10px] text-indigo-600 font-bold">
                  {dossier.enrollment.daysAtCenter} ngày gắn bó
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-emerald-800 font-semibold block text-[11px]">
                  Chuyên cần ({dossier.attendanceSummary.attendanceRate}%)
                </span>
                <span className="text-sm font-extrabold text-emerald-700 mt-1 block">
                  {dossier.attendanceSummary.attendedTotal} buổi đi học
                </span>
                <span className="text-[10px] text-slate-500">
                  Phép: {dossier.attendanceSummary.excusedCount} · Vắng: {dossier.attendanceSummary.absentCount}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200">
                <span className="text-indigo-800 font-semibold block text-[11px]">Đóng phí đến</span>
                <span className="text-sm font-extrabold text-indigo-700 mt-1 block">
                  {fmtDate(dossier.tuitionSummary.paidUntilDate)}
                </span>
                <span className="text-[10px] text-indigo-900 font-medium">
                  {dossier.tuitionSummary.isMonthly
                    ? `Dùng ${dossier.attendanceSummary.usedSessions}/${dossier.attendanceSummary.targetSessions} buổi`
                    : "Gói trọn khóa"}
                </span>
              </div>

              <div
                className={`p-3.5 rounded-2xl border ${
                  dossier.tuitionSummary.totalDebt > 0
                    ? "bg-rose-50/80 border-rose-200"
                    : "bg-slate-50 border-slate-200/80"
                }`}
              >
                <span className="text-slate-500 font-semibold block text-[11px]">Tổng đã nộp</span>
                <span className="text-sm font-extrabold text-emerald-700 mt-1 block">
                  {vnd(dossier.tuitionSummary.totalPaid)}
                </span>
                {dossier.tuitionSummary.totalDebt > 0 ? (
                  <span className="text-[10px] font-bold text-rose-600">
                    Nợ: {vnd(dossier.tuitionSummary.totalDebt)}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-600">Đã đủ 100%</span>
                )}
              </div>
            </div>

            {dossier.enrollment.note && (
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2">
                <div>
                  <strong>📌 Ghi chú:</strong> {dossier.enrollment.note}
                </div>
                <button
                  type="button"
                  onClick={() => setTab("EDIT")}
                  className="text-amber-800 font-bold underline shrink-0"
                >
                  Sửa
                </button>
              </div>
            )}

            {/* TAB SELECTOR */}
            <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTab("ATTENDANCE")}
                className={`flex-1 py-1.5 rounded-xl transition ${
                  tab === "ATTENDANCE"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Buổi học & Nghỉ ({dossier.attendanceTimeline.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("TUITION")}
                className={`flex-1 py-1.5 rounded-xl transition ${
                  tab === "TUITION"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Lịch sử học phí ({dossier.payments.length})
              </button>
              <button
                type="button"
                onClick={() => setTab("EDIT")}
                className={`flex-1 py-1.5 rounded-xl transition ${
                  tab === "EDIT"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Cập nhật thông tin
              </button>
            </div>

            {/* NỘI DUNG TỪNG TAB */}
            {tab === "ATTENDANCE" && (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {dossier.attendanceTimeline.length > 0 ? (
                  dossier.attendanceTimeline.map((att: any) => (
                    <div
                      key={att.sessionId}
                      className="p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <span className="font-extrabold text-slate-900 block">
                          {fmtDate(att.date)} — {att.title}
                        </span>
                        {att.note && <span className="text-slate-500 text-[11px]">💬 {att.note}</span>}
                      </div>
                      <span
                        className={`px-3 py-1 rounded-xl font-bold shrink-0 text-[11px] ${
                          att.status === "PRESENT"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : att.status === "LATE"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : att.status === "EXCUSED"
                            ? "bg-sky-50 text-sky-700 border border-sky-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {att.status === "PRESENT"
                          ? "✓ Có mặt"
                          : att.status === "LATE"
                          ? "⏰ Muộn"
                          : att.status === "EXCUSED"
                          ? "🛡️ Có phép"
                          : "✕ Vắng"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-xs text-slate-400 py-10">
                    Chưa có lịch sử điểm danh nào.
                  </div>
                )}
              </div>
            )}

            {tab === "TUITION" && (
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1 text-xs">
                <div>
                  <h4 className="font-bold text-slate-700 mb-2">Chu kỳ áp dụng</h4>
                  <div className="space-y-2">
                    {dossier.cycles.map((cy: any) => (
                      <div
                        key={cy.id}
                        className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-wrap items-center justify-between gap-2"
                      >
                        <div>
                          <span className="font-extrabold text-slate-900 block">
                            {cy.cycleName} ({cy.expectedSessions} buổi)
                          </span>
                          <span className="text-slate-500 text-[11px]">
                            {fmtDate(cy.periodStart)} → {fmtDate(cy.periodEnd)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-emerald-700 text-sm block">
                            {vnd(cy.paidAmount)} / {vnd(cy.totalAmount - cy.discountAmount)}
                          </span>
                          {cy.debt > 0 && (
                            <span className="text-rose-600 font-bold text-[11px]">Còn nợ {vnd(cy.debt)}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-slate-700 mb-2">Lịch sử các lần nộp</h4>
                  {dossier.payments.length > 0 ? (
                    <div className="space-y-1.5">
                      {dossier.payments.map((p: any) => (
                        <div
                          key={p.id}
                          className="p-3 rounded-2xl border border-slate-200/80 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-bold text-slate-800">{fmtDate(p.paidAt)}</span>
                            <span className="text-slate-400 mx-1">·</span>
                            <span className="text-indigo-600 font-bold">
                              {p.paymentMethod === "CASH" ? "Tiền mặt" : "Chuyển khoản"}
                            </span>
                            {p.note && <span className="text-slate-500 block text-[11px]">{p.note}</span>}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-black text-emerald-700 text-sm">+{vnd(p.amount)}</span>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(p)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition"
                              title="Hủy/xóa phiếu thu này và khôi phục công nợ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-400 text-xs">Chưa có giao dịch nạp tiền nào.</div>
                  )}
                </div>
              </div>
            )}

            {tab === "EDIT" && (
              <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Họ tên học viên</label>
                    <input
                      className={inputCls}
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Số điện thoại</label>
                    <input
                      className={inputCls}
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ngày bắt đầu học</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={editJoinDate}
                    onChange={(e) => setEditJoinDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Ghi chú quá trình học tập & học phí
                  </label>
                  <textarea
                    rows={3}
                    className={inputCls}
                    placeholder="Mục tiêu band điểm, nhận xét giáo viên, tình trạng học phí..."
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setTab("ATTENDANCE")}
                    className="px-4 py-2 rounded-xl border border-slate-300 font-bold text-slate-700"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                  >
                    {saving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 my-8 border border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-slate-900 text-base">{title}</h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = "w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition";

function AddClassModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ClassType>("MONTHLY");

  // Bộ chọn lịch học thông minh
  const [selectedDays, setSelectedDays] = useState<string[]>(["Thứ 3", "Thứ 5"]);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("19:30");
  const [startDate, setStartDate] = useState(todayStr());
  const [isCustomSchedule, setIsCustomSchedule] = useState(false);
  const [customScheduleText, setCustomScheduleText] = useState("");

  const [fee, setFee] = useState(1000000);
  const [pricePerSession, setPricePerSession] = useState(125000);
  const [err, setErr] = useState("");

  const ALL_DAYS = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];

  const toggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return;
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const generatedSchedule =
    selectedDays.length > 0
      ? `${selectedDays.join(", ")} (${startTime} - ${endTime})`
      : "";

  const finalSchedule = isCustomSchedule ? customScheduleText : generatedSchedule;

  const targetDaysNum = isCustomSchedule
    ? parseScheduleDays(customScheduleText)
    : parseScheduleDays(selectedDays.join(", "));

  const previewSessions = generateFixedSessions(
    startDate,
    targetDaysNum,
    type === "MONTHLY" ? 8 : 12,
    startTime
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      await api("/api/classes", {
        method: "POST",
        body: JSON.stringify({
          name,
          type,
          scheduleText: finalSchedule,
          scheduleDays: targetDaysNum,
          startDate,
          startTime,
          monthlyTuition: fee,
          pricePerSession: type === "MONTHLY" ? pricePerSession : undefined,
        }),
      });
      onDone();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <Modal title="Thêm lớp học mới" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Loại hình thu phí *
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setType("MONTHLY");
                if (fee === 6000000) {
                  setFee(1000000);
                  setPricePerSession(125000);
                }
              }}
              className={`p-3 rounded-2xl text-xs font-bold border text-left transition ${
                type === "MONTHLY"
                  ? "bg-blue-50/80 border-blue-500 text-blue-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              1. Theo tháng (8 buổi)
              <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                Mặc định 1.000.000đ / 8 buổi
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType("COURSE");
                setFee(6000000);
              }}
              className={`p-3 rounded-2xl text-xs font-bold border text-left transition ${
                type === "COURSE"
                  ? "bg-purple-50/80 border-purple-500 text-purple-700 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              2. Theo khóa IELTS
              <span className="block text-[10px] font-normal text-slate-500 mt-0.5">
                Trọn gói cả khóa
              </span>
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Tên lớp học *</label>
          <input
            className={inputCls}
            required
            placeholder="VD: Tiếng Anh THCS / IELTS 6.5+"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* NGÀY BẮT ĐẦU / KHAI GIẢNG */}
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Ngày bắt đầu khóa / chu kỳ (Khai giảng) *
          </label>
          <input
            type="date"
            className={inputCls}
            required
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        {/* BỘ CHỌN LỊCH HỌC TRỰC QUAN */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800">
              Lịch học trong tuần
            </label>
            <button
              type="button"
              onClick={() => {
                if (!isCustomSchedule) setCustomScheduleText(generatedSchedule);
                setIsCustomSchedule(!isCustomSchedule);
              }}
              className="text-[11px] font-bold text-indigo-600 hover:underline"
            >
              {isCustomSchedule ? "Dùng bộ chọn nhanh" : "Nhập tay tự do"}
            </button>
          </div>

          {isCustomSchedule ? (
            <input
              className={inputCls}
              placeholder="VD: Thứ 3, Thứ 5 (18:00 - 19:30)"
              value={customScheduleText}
              onChange={(e) => setCustomScheduleText(e.target.value)}
            />
          ) : (
            <div className="space-y-2.5">
              {/* CÁC NÚT BẤM NHANH CA HỌC PHỔ BIẾN */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Thứ 3, 5", days: ["Thứ 3", "Thứ 5"] },
                  { label: "Thứ 2, 4, 6", days: ["Thứ 2", "Thứ 4", "Thứ 6"] },
                  { label: "Thứ 3, 5, 7", days: ["Thứ 3", "Thứ 5", "Thứ 7"] },
                  { label: "Cuối tuần (T7, CN)", days: ["Thứ 7", "Chủ Nhật"] },
                ].map((p) => {
                  const isMatch =
                    p.days.length === selectedDays.length &&
                    p.days.every((d) => selectedDays.includes(d));
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setSelectedDays(p.days)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition ${
                        isMatch
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>

              {/* 7 NÚT CHỌN TỪNG NGÀY TRONG TUẦN */}
              <div>
                <span className="text-[11px] text-slate-500 font-medium block mb-1.5">
                  Bấm để chọn 2 ngày cố định (hoặc nhiều hơn):
                </span>
                <div className="grid grid-cols-7 gap-1">
                  {ALL_DAYS.map((d) => {
                    const active = selectedDays.includes(d);
                    const shortName = d === "Chủ Nhật" ? "CN" : d.replace("Thứ ", "T");
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => toggleDay(d)}
                        className={`py-2 rounded-xl text-xs font-extrabold border text-center transition ${
                          active
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                        title={d}
                      >
                        {shortName}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CHỌN GIỜ BẮT ĐẦU VÀ GIỜ KẾT THÚC */}
              <div>
                <span className="text-[11px] text-slate-500 font-medium block mb-1.5">
                  Khung giờ học:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Giờ bắt đầu:</span>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-extrabold bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-0.5">Giờ kết thúc:</span>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-extrabold bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* CA GIỜ GỢI Ý */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[
                    { label: "17:30 - 19:00", s: "17:30", e: "19:00" },
                    { label: "18:00 - 19:30", s: "18:00", e: "19:30" },
                    { label: "19:30 - 21:00", s: "19:30", e: "21:00" },
                    { label: "08:00 - 09:30", s: "08:00", e: "09:30" },
                  ].map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => {
                        setStartTime(t.s);
                        setEndTime(t.e);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition ${
                        startTime === t.s && endTime === t.e
                          ? "bg-slate-800 text-white border-slate-800"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* KẾT QUẢ TỰ ĐỘNG SINH */}
              <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200/60 text-xs flex items-center justify-between">
                <span className="text-slate-500 font-medium">Lịch lớp:</span>
                <strong className="text-indigo-700 font-extrabold">{generatedSchedule}</strong>
              </div>
            </div>
          )}
        </div>

        {/* DỰ KIẾN 8 BUỔI HỌC ẤN ĐỊNH CỐ ĐỊNH */}
        <div className="p-3 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-extrabold text-indigo-900">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Ấn định sẵn 8 buổi học cố định:
            </span>
            <span className="text-[10px] text-emerald-700 bg-emerald-100/90 px-2 py-0.5 rounded-md font-bold">
              ✓ Điểm danh 1 chạm
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {previewSessions.slice(0, 8).map((ps) => (
              <div
                key={ps.index}
                className="p-1.5 bg-white rounded-xl border border-indigo-200/80 text-center shadow-xs"
              >
                <span className="text-[10px] font-bold text-slate-400 block">Buổi {ps.index}</span>
                <span className="text-xs font-black text-indigo-950 block">
                  {ps.shortDay} · {ps.dateStr.slice(8, 10)}/{ps.dateStr.slice(5, 7)}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-slate-500 leading-tight">
            💡 Khi tạo lớp, hệ thống sẽ chốt cố định 8 buổi này. Đến ngày học giáo viên chỉ cần bấm chọn buổi để điểm danh, không cần chọn ngày thủ công!
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            {type === "MONTHLY" ? "Học phí 1 tháng (8 buổi)" : "Học phí trọn khóa"}
          </label>
          <input
            className={inputCls}
            type="number"
            min={0}
            step="any"
            value={fee}
            onChange={(e) => {
              const v = Number(e.target.value);
              setFee(v);
              if (type === "MONTHLY") setPricePerSession(Math.round(v / 8));
            }}
          />
        </div>

        {type === "MONTHLY" && (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Giá tính 1 buổi lẻ
            </label>
            <input
              className={inputCls}
              type="number"
              min={0}
              step="any"
              value={pricePerSession}
              onChange={(e) => setPricePerSession(Number(e.target.value))}
            />
          </div>
        )}

        {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
        <button className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition">
          Lưu lớp học
        </button>
      </form>
    </Modal>
  );
}

function AddStudentModal({
  classId,
  classType,
  pricePerSession,
  monthlyTuition,
  onClose,
  onDone,
}: {
  classId: string;
  classType: ClassType;
  pricePerSession: number;
  monthlyTuition: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"NEW" | "EXISTING">("NEW");
  const [existingList, setExistingList] = useState<Array<{ id: string; name: string; studentCode: string | null; phone: string | null }>>([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [searchStudent, setSearchStudent] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [joinDate, setJoinDate] = useState(todayStr());
  const [extraSessions, setExtraSessions] = useState(0);
  const [tuitionNote, setTuitionNote] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (mode === "EXISTING") {
      setLoadingExisting(true);
      api<{ students: Array<{ id: string; name: string; studentCode: string | null; phone: string | null }> }>("/api/students")
        .then((r) => setExistingList(r.students || []))
        .catch(() => {})
        .finally(() => setLoadingExisting(false));
    }
  }, [mode]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      if (mode === "EXISTING") {
        if (!selectedStudentId) {
          setErr("Vui lòng chọn học viên từ danh sách.");
          return;
        }
        await api(`/api/classes/${classId}`, {
          method: "POST",
          body: JSON.stringify({
            existingStudentId: selectedStudentId,
            joinDate,
            extraSessions,
            tuitionNote,
          }),
        });
      } else {
        await api(`/api/classes/${classId}`, {
          method: "POST",
          body: JSON.stringify({
            name,
            phone,
            joinDate,
            extraSessions,
            tuitionNote,
          }),
        });
      }
      onDone();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  const unitPrice = pricePerSession || Math.round(monthlyTuition / 8);
  const calculatedTotal =
    classType === "COURSE"
      ? monthlyTuition
      : extraSessions > 0
      ? extraSessions * unitPrice + monthlyTuition
      : monthlyTuition;

  const filteredExisting = existingList.filter((s) => {
    const q = searchStudent.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.includes(q)) ||
      (s.studentCode && s.studentCode.toLowerCase().includes(q))
    );
  });

  return (
    <Modal title="Thêm học viên vào lớp" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        {/* TAB CHỌN CHẾ ĐỘ THÊM */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setMode("NEW")}
            className={`flex-1 py-1.5 rounded-xl transition ${
              mode === "NEW"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Học viên mới
          </button>
          <button
            type="button"
            onClick={() => setMode("EXISTING")}
            className={`flex-1 py-1.5 rounded-xl transition ${
              mode === "EXISTING"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Chọn học viên có sẵn
          </button>
        </div>

        {mode === "EXISTING" ? (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              Tìm học viên từ danh sách trung tâm *
            </label>
            <input
              type="text"
              placeholder="Nhập tên, mã học viên hoặc SĐT để tìm..."
              value={searchStudent}
              onChange={(e) => setSearchStudent(e.target.value)}
              className={inputCls}
            />

            {loadingExisting ? (
              <p className="text-xs text-slate-400 py-3 text-center">Đang tải danh sách học viên...</p>
            ) : filteredExisting.length > 0 ? (
              <div className="max-h-40 overflow-y-auto space-y-1 border border-slate-200 rounded-2xl p-1 bg-slate-50/50">
                {filteredExisting.map((st) => (
                  <div
                    key={st.id}
                    onClick={() => setSelectedStudentId(st.id)}
                    className={`p-2.5 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                      selectedStudentId === st.id
                        ? "bg-indigo-600 text-white font-bold"
                        : "hover:bg-slate-200/70 text-slate-800"
                    }`}
                  >
                    <div>
                      <span className="block font-bold">{st.name}</span>
                      <span className={`text-[10px] ${selectedStudentId === st.id ? "text-indigo-100" : "text-slate-500"}`}>
                        {st.studentCode || "HV"} · 📞 {st.phone || "Không có SĐT"}
                      </span>
                    </div>
                    {selectedStudentId === st.id && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-2 text-center">Không tìm thấy học viên nào phù hợp.</p>
            )}
          </div>
        ) : (
          <>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Họ tên học viên *</label>
              <input
                className={inputCls}
                required
                placeholder="VD: Nguyễn Bảo Long"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Số điện thoại</label>
              <input
                className={inputCls}
                placeholder="Số điện thoại phụ huynh hoặc học viên"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Ngày bắt đầu vào học</label>
          <input
            className={inputCls}
            type="date"
            value={joinDate}
            onChange={(e) => setJoinDate(e.target.value)}
          />
        </div>

        {classType === "MONTHLY" ? (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-0.5">
              Số buổi lẻ của tháng này (nếu vào cuối tháng)
            </label>
            <p className="text-[11px] text-slate-500 mb-1">
              Ví dụ: Vào cuối tháng học 1 buổi lẻ ➔ Nhập 1. Hệ thống tính: 1 buổi lẻ + 8 buổi tháng sau.
            </p>
            <input
              className={inputCls}
              type="number"
              min={0}
              max={7}
              value={extraSessions}
              onChange={(e) => setExtraSessions(Number(e.target.value))}
            />
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-purple-50 text-purple-700 text-xs">
            Lớp thu theo khóa IELTS: Học viên có thể đóng đủ 1 lần hoặc chia làm nhiều đợt.
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú ban đầu (nếu có)</label>
          <input
            className={inputCls}
            placeholder="Hẹn ngày đóng phí, mục tiêu band điểm..."
            value={tuitionNote}
            onChange={(e) => setTuitionNote(e.target.value)}
          />
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs space-y-1">
          <span className="text-slate-500 block text-[11px]">Học phí cần thu kỳ đầu:</span>
          <span className="text-indigo-700 font-black text-base block">
            {vnd(calculatedTotal)}
          </span>
          {classType === "MONTHLY" && extraSessions > 0 && (
            <span className="text-[11px] text-indigo-600 block">
              Gồm {extraSessions} buổi lẻ ({vnd(extraSessions * unitPrice)}) + 8 buổi tháng sau ({vnd(monthlyTuition)})
            </span>
          )}
        </div>

        {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
        <button className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition">
          Thêm học viên vào lớp
        </button>
      </form>
    </Modal>
  );
}

function NoteModal({
  student,
  onClose,
  onDone,
}: {
  student: Student;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tuitionNote, setTuitionNote] = useState(student.tuitionNote || "");
  const [dueDate, setDueDate] = useState(
    student.tuition?.dueDate
      ? new Date(student.tuition.dueDate).toISOString().slice(0, 10)
      : ""
  );
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/pay", {
        method: "POST",
        body: JSON.stringify({
          action: "SAVE_NOTE",
          enrollmentId: student.enrollmentId,
          tuitionNote,
          dueDate: dueDate || undefined,
        }),
      });
      onDone();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <Modal title={`Ghi chú học phí · ${student.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Ghi chú trao đổi với phụ huynh / học viên
          </label>
          <textarea
            rows={3}
            className={inputCls}
            placeholder="VD: Phụ huynh hẹn ngày 05/12 chuyển khoản, đã CK đang chờ sao kê..."
            value={tuitionNote}
            onChange={(e) => setTuitionNote(e.target.value)}
            autoFocus
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              "Hẹn đầu tháng chuyển khoản",
              "Báo đã CK - Chờ đối soát",
              "Xin đóng trước 50%",
              "Tháng sau trừ 1 buổi nghỉ phép",
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setTuitionNote(sample)}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700 font-semibold transition"
              >
                + {sample}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Hẹn ngày đóng (nếu có)
          </label>
          <input
            type="date"
            className={inputCls}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
        <div className="flex gap-2 pt-1">
          {student.tuitionNote && (
            <button
              type="button"
              onClick={async () => {
                await api("/api/pay", {
                  method: "POST",
                  body: JSON.stringify({
                    action: "SAVE_NOTE",
                    enrollmentId: student.enrollmentId,
                    tuitionNote: "",
                  }),
                });
                onDone();
              }}
              className="px-3.5 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition"
            >
              Xóa ghi chú
            </button>
          )}
          <button
            type="submit"
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition"
          >
            Lưu ghi chú
          </button>
        </div>
      </form>
    </Modal>
  );
}

function MonthlyEvaluationModal({
  student,
  classId,
  className,
  onClose,
  onDone,
}: {
  student: Student;
  classId: string;
  className: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [monthYear, setMonthYear] = useState(
    student.latestEvaluation?.monthYear || currentMonthStr
  );

  const existing =
    student.evaluations?.find((e) => e.monthYear === monthYear) ||
    (monthYear === student.latestEvaluation?.monthYear ? student.latestEvaluation : null);

  const [classification, setClassification] = useState<"XUAT_SAC" | "GIOI" | "KHA" | "CAN_KEM">(
    existing?.classification || "GIOI"
  );
  const [testScore, setTestScore] = useState<string>(
    existing?.testScore !== null && existing?.testScore !== undefined ? String(existing.testScore) : "8.5"
  );
  const [grammarScore, setGrammarScore] = useState<string>(
    existing?.grammarScore !== null && existing?.grammarScore !== undefined ? String(existing.grammarScore) : "8.0"
  );
  const [skillsScore, setSkillsScore] = useState<string>(
    existing?.skillsScore !== null && existing?.skillsScore !== undefined ? String(existing.skillsScore) : "8.5"
  );
  const [attitude, setAttitude] = useState(
    existing?.attitude || "Chăm chỉ, tích cực phát biểu xây dựng bài"
  );
  const [homeworkStatus, setHomeworkStatus] = useState(
    existing?.homeworkStatus || "Hoàn thành 100% bài tập về nhà đầy đủ"
  );
  const [strengths, setStrengths] = useState(
    existing?.strengths || "Nắm chắc cấu trúc câu, phát âm chuẩn, từ vựng tốt"
  );
  const [improvements, setImprovements] = useState(
    existing?.improvements || "Tiếp tục duy trì và luyện thêm kỹ năng phản xạ nghe"
  );
  const [teacherComment, setTeacherComment] = useState(
    existing?.teacherComment ||
      `Em ${student.name} trong tháng học tập rất chăm chỉ, tiếp thu bài nhanh và có ý thức làm bài tập đầy đủ. Trung tâm đánh giá cao tinh thần học tập của em!`
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [copiedZalo, setCopiedZalo] = useState(false);

  useEffect(() => {
    const ev = student.evaluations?.find((e) => e.monthYear === monthYear);
    if (ev) {
      setClassification(ev.classification);
      setTestScore(ev.testScore !== null && ev.testScore !== undefined ? String(ev.testScore) : "");
      setGrammarScore(ev.grammarScore !== null && ev.grammarScore !== undefined ? String(ev.grammarScore) : "");
      setSkillsScore(ev.skillsScore !== null && ev.skillsScore !== undefined ? String(ev.skillsScore) : "");
      setAttitude(ev.attitude || "");
      setHomeworkStatus(ev.homeworkStatus || "");
      setStrengths(ev.strengths || "");
      setImprovements(ev.improvements || "");
      setTeacherComment(ev.teacherComment || "");
    }
  }, [monthYear, student.evaluations]);

  const generateComment = () => {
    const t = Number(testScore) || 8;
    let rankText = "Học sinh Giỏi";
    if (classification === "XUAT_SAC") rankText = "Học sinh Xuất sắc";
    if (classification === "KHA") rankText = "Học sinh Khá";
    if (classification === "CAN_KEM") rankText = "Cần kèm thêm";

    const text = `Tháng ${monthYear}, em ${student.name} đạt xếp loại ${rankText} với điểm kiểm tra định kỳ ${t}/10. ${
      attitude ? `Về thái độ: ${attitude}. ` : ""
    }${homeworkStatus ? `Về BTVN: ${homeworkStatus}. ` : ""}${
      improvements ? `Cần củng cố thêm: ${improvements}. ` : ""
    }Giáo viên khuyến khích em tiếp tục phát huy trong tháng tới!`;
    setTeacherComment(text);
  };

  const handleCopyZalo = () => {
    const parentCode = student.studentCode || student.phone || student.studentId;
    const parentUrl = `https://danielts.nextband.vn/p/${encodeURIComponent(parentCode)}`;
    const rankTitle =
      classification === "XUAT_SAC"
        ? "🏆 HỌC SINH XUẤT SẮC"
        : classification === "GIOI"
        ? "🌟 HỌC SINH GIỎI"
        : classification === "KHA"
        ? "📈 HỌC SINH KHÁ"
        : "⚠️ CẦN KÈM THÊM KIẾN THỨC";

    const msg = `📢 BÁO CÁO ĐÁNH GIÁ & XẾP LOẠI ĐỊNH KỲ THÁNG ${monthYear}
Trung tâm Anh ngữ DanielTS xin gửi tới Quý Phụ huynh kết quả học tập của học viên:

👤 Học viên: ${student.name} (${student.studentCode || "DTS"})
🏫 Lớp: ${className}
🎖️ XẾP LOẠI THÁNG: ${rankTitle}

📊 BẢNG ĐIỂM ĐỊNH KỲ (Thang điểm 10):
• Điểm kiểm tra tháng: ${testScore || "—"}/10
• Điểm Ngữ pháp & Từ vựng: ${grammarScore || "—"}/10
• Điểm Kỹ năng Nghe - Nói: ${skillsScore || "—"}/10

🌟 THÁI ĐỘ & CHUYÊN CẦN:
• Thái độ trên lớp: ${attitude || "Chăm chỉ, tích cực"}
• Tình hình BTVN: ${homeworkStatus || "Hoàn thành đầy đủ"}

⭐ ƯU ĐIỂM: ${strengths || "Tiếp thu nhanh, phát âm chuẩn"}
🎯 ĐIỂM CẦN CỐ GẮNG: ${improvements || "Tiếp tục rèn luyện kỹ năng"}

💌 NHẬN XÉT CỦA GIÁO VIÊN:
"${teacherComment || "Em học tập rất chăm chỉ và có nhiều tiến bộ!"}"

🔗 Phụ huynh bấm vào link bên dưới để xem Sổ liên lạc trực tuyến chi tiết và lịch sử điểm danh từng buổi:
${parentUrl}

Trân trọng,
Giáo viên phụ trách & Trung tâm Anh ngữ DanielTS`;

    navigator.clipboard.writeText(msg);
    setCopiedZalo(true);
    setTimeout(() => setCopiedZalo(false), 2500);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setErr("");
      await api(`/api/classes/${classId}/evaluations`, {
        method: "POST",
        body: JSON.stringify({
          enrollmentId: student.enrollmentId,
          studentId: student.studentId,
          monthYear,
          classification,
          testScore: testScore !== "" ? Number(testScore) : null,
          grammarScore: grammarScore !== "" ? Number(grammarScore) : null,
          skillsScore: skillsScore !== "" ? Number(skillsScore) : null,
          attitude,
          homeworkStatus,
          strengths,
          improvements,
          teacherComment,
        }),
      });
      onDone();
    } catch (e: any) {
      setErr(e.message || "Lỗi khi lưu đánh giá.");
    } finally {
      setLoading(false);
    }
  };

  const avgScore = (() => {
    const scores = [testScore, grammarScore, skillsScore]
      .filter((s) => s !== "" && !isNaN(Number(s)))
      .map((s) => Number(s));
    if (scores.length === 0) return null;
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  })();

  return (
    <Modal
      title={`🏆 Đánh Giá & Xếp Loại Định Kỳ Tháng · ${student.name}`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
        {/* CHỌN THÁNG ĐÁNH GIÁ & GHI CHÚ PHỔ THÔNG */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100">
          <div>
            <span className="text-xs font-extrabold text-indigo-950 block">
              Kỳ đánh giá định kỳ tháng:
            </span>
            <span className="text-[11px] text-indigo-700 font-medium">
              Áp dụng cho học sinh phổ thông (Thang điểm 10)
            </span>
          </div>
          <input
            type="month"
            value={monthYear}
            onChange={(e) => setMonthYear(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-xs font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* 1. CHỌN XẾP LOẠI (CLASSIFICATION) */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-800 flex items-center justify-between">
            <span>1. Phân loại &amp; Xếp loại học lực tháng</span>
            {avgScore && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                ĐTB: <strong className="text-indigo-600">{avgScore}</strong>/10
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                id: "XUAT_SAC",
                label: "Xuất sắc",
                sub: "≥ 9.0 · Gương mẫu",
                icon: "🏆",
                activeBg: "bg-amber-500 text-white border-amber-600 shadow-md",
              },
              {
                id: "GIOI",
                label: "Giỏi",
                sub: "8.0 - 8.9 · Nắm chắc",
                icon: "🌟",
                activeBg: "bg-emerald-600 text-white border-emerald-700 shadow-md",
              },
              {
                id: "KHA",
                label: "Khá",
                sub: "6.5 - 7.9 · Tiến bộ",
                icon: "📈",
                activeBg: "bg-indigo-600 text-white border-indigo-700 shadow-md",
              },
              {
                id: "CAN_KEM",
                label: "Cần kèm",
                sub: "< 6.5 · Củng cố",
                icon: "⚠️",
                activeBg: "bg-rose-600 text-white border-rose-700 shadow-md",
              },
            ].map((tier) => {
              const active = classification === tier.id;
              return (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setClassification(tier.id as any)}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    active
                      ? tier.activeBg
                      : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span className="text-xl block mb-0.5">{tier.icon}</span>
                  <span className="text-xs font-extrabold block">{tier.label}</span>
                  <span
                    className={`text-[10px] block opacity-80 ${
                      active ? "text-white" : "text-slate-500"
                    }`}
                  >
                    {tier.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. ĐIỂM SỐ CHI TIẾT (THANG ĐIỂM 10) */}
        <div className="space-y-2">
          <label className="text-xs font-extrabold text-slate-800 block">
            2. Điểm số định kỳ (Thang điểm 10)
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                📝 Bài KT tháng:
              </span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="0.0 - 10"
                value={testScore}
                onChange={(e) => setTestScore(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                📚 Ngữ pháp &amp; Từ:
              </span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="0.0 - 10"
                value={grammarScore}
                onChange={(e) => setGrammarScore(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 block mb-1">
                🗣️ Kỹ năng Nghe - Nói:
              </span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="0.0 - 10"
                value={skillsScore}
                onChange={(e) => setSkillsScore(e.target.value)}
                className="w-full px-2 py-1.5 rounded-xl border border-slate-300 text-sm font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* 3. THÁI ĐỘ HỌC TẬP & BÀI TẬP VỀ NHÀ */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-800 block">
              3. Thái độ học tập trên lớp:
            </label>
            <div className="flex flex-wrap gap-1">
              {[
                "Chăm chỉ, tích cực phát biểu",
                "Tập trung nghe giảng",
                "Có nhiều tiến bộ vượt bậc",
                "Cần tập trung hơn",
                "Còn rụt rè khi phát biểu",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setAttitude(chip)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 transition"
                >
                  + {chip}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={attitude}
              onChange={(e) => setAttitude(e.target.value)}
              placeholder="VD: Chăm chỉ, tích cực phát biểu..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-slate-800 block">
              Tình hình BTVN:
            </label>
            <div className="flex flex-wrap gap-1">
              {[
                "Hoàn thành 100% đầy đủ",
                "Trình bày sạch đẹp, đúng hạn",
                "Còn thiếu 1 vài bài",
                "Cần nhắc nhở nộp bài đúng hạn",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setHomeworkStatus(chip)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-700 transition"
                >
                  + {chip}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={homeworkStatus}
              onChange={(e) => setHomeworkStatus(e.target.value)}
              placeholder="VD: Hoàn thành 100% đầy đủ..."
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* 4. ƯU ĐIỂM & ĐIỂM CẦN CỦNG CỐ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-emerald-800 block">
              ⭐ Ưu điểm nổi bật:
            </label>
            <div className="flex flex-wrap gap-1">
              {[
                "Phát âm chuẩn",
                "Vốn từ phong phú",
                "Nắm chắc ngữ pháp",
                "Tự tin giao tiếp",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setStrengths(chip)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition"
                >
                  + {chip}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              placeholder="Ưu điểm của học sinh..."
              className="w-full px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-extrabold text-amber-800 block">
              🎯 Cần tiếp tục củng cố:
            </label>
            <div className="flex flex-wrap gap-1">
              {[
                "Củng cố các thì ngữ pháp",
                "Ôn tập từ vựng Unit",
                "Rèn luyện kỹ năng nghe",
                "Cải thiện cấu trúc viết",
              ].map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setImprovements(chip)}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 transition"
                >
                  + {chip}
                </button>
              ))}
            </div>
            <textarea
              rows={2}
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              placeholder="Kiến thức cần củng cố thêm..."
              className="w-full px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50/20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* 5. LỜI NHẬN XÉT GỬI PHỤ HUYNH */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-extrabold text-slate-800">
              5. Nhận xét chi tiết của Giáo viên gửi Phụ huynh:
            </label>
            <button
              type="button"
              onClick={generateComment}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Tự tạo mẫu nhận xét
            </button>
          </div>
          <textarea
            rows={3}
            value={teacherComment}
            onChange={(e) => setTeacherComment(e.target.value)}
            placeholder="Lời nhận xét, động viên và hướng dẫn phụ huynh đồng hành cùng con..."
            className="w-full px-3 py-2 rounded-2xl border border-slate-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {err && <p className="text-xs font-bold text-rose-600">{err}</p>}

        {/* NÚT HÀNH ĐỘNG */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCopyZalo}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
              copiedZalo
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white hover:bg-indigo-50 border-indigo-200 text-indigo-700 shadow-xs"
            }`}
          >
            {copiedZalo ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedZalo ? "✓ Đã copy phiếu Zalo!" : "📋 Copy Phiếu gửi Zalo PH"}</span>
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition"
          >
            {loading ? "Đang lưu..." : "💾 Lưu Đánh Giá Định Kỳ Tháng"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PayModal({
  student,
  classInfo,
  onClose,
  onDone,
}: {
  student: Student;
  classInfo: ClassDetail["class"];
  onClose: () => void;
  onDone: () => void;
}) {
  const isMonthly = classInfo.type === "MONTHLY";
  const baseFee = classInfo.monthlyTuition || 1000000;
  const unitPrice = classInfo.pricePerSession || Math.round(baseFee / 8);
  const currentDebt = student.tuition?.debt || 0;

  const [amount, setAmount] = useState(currentDebt > 0 ? currentDebt : baseFee);
  const [sessionsAdded, setSessionsAdded] = useState(isMonthly ? 8 : 36);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"TRANSFER" | "CASH">("TRANSFER");
  const [paidAt, setPaidAt] = useState(todayStr());
  const [cycleLabel, setCycleLabel] = useState("");
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [clearTuitionNote, setClearTuitionNote] = useState(true);
  const [err, setErr] = useState("");

  const applyPreset = (preset: {
    label: string;
    amt: number;
    sessions: number;
    disc?: number;
  }) => {
    setCycleLabel(preset.label);
    setAmount(preset.amt);
    setSessionsAdded(preset.sessions);
    setDiscountAmount(preset.disc || 0);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/api/pay", {
        method: "POST",
        body: JSON.stringify({
          enrollmentId: student.enrollmentId,
          amount,
          sessionsAdded: isMonthly ? sessionsAdded : undefined,
          discountAmount,
          paymentMethod,
          paidAt,
          cycleLabel: cycleLabel || undefined,
          dueDate: dueDate || undefined,
          note,
          clearTuitionNote,
        }),
      });
      onDone();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <Modal title={`Thu học phí · ${student.name}`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1">
          {isMonthly ? (
            <div>
              Tiến độ: <strong>Đã dùng {student.usedSessions}/{student.targetSessions} buổi</strong> (Phép: {student.excused})
            </div>
          ) : (
            <div>Khóa học IELTS ({vnd(baseFee)})</div>
          )}
          {student.tuition && (
            <div>
              Đã nộp: <strong className="text-emerald-700">{vnd(student.tuition.paid)}</strong> / {vnd(student.tuition.total)}
              {student.tuition.debt > 0 && (
                <span className="text-rose-600 font-bold ml-1">(Còn thiếu {vnd(student.tuition.debt)})</span>
              )}
            </div>
          )}
        </div>

        {/* CÁC NÚT CHỌN NHANH */}
        {isMonthly ? (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Gói đóng phổ biến:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    label: "1 tháng (8 buổi)",
                    amt: baseFee,
                    sessions: 8,
                  })
                }
                className="p-2.5 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white text-left text-xs transition"
              >
                <div className="font-extrabold text-slate-900">1 tháng (8 buổi)</div>
                <div className="text-indigo-600 font-black">{vnd(baseFee)}</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    label: "1 buổi lẻ + 1 tháng (9 buổi)",
                    amt: baseFee + unitPrice,
                    sessions: 9,
                  })
                }
                className="p-2.5 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white text-left text-xs transition"
              >
                <div className="font-extrabold text-slate-900">1 buổi lẻ + 1 tháng</div>
                <div className="text-indigo-600 font-black">{vnd(baseFee + unitPrice)}</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    label: "2 buổi lẻ + 1 tháng (10 buổi)",
                    amt: baseFee + unitPrice * 2,
                    sessions: 10,
                  })
                }
                className="p-2.5 rounded-2xl border border-slate-200 hover:border-indigo-500 bg-white text-left text-xs transition"
              >
                <div className="font-extrabold text-slate-900">2 buổi lẻ + 1 tháng</div>
                <div className="text-indigo-600 font-black">{vnd(baseFee + unitPrice * 2)}</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    label: "Trừ 1 buổi nghỉ phép",
                    amt: Math.max(0, baseFee - unitPrice),
                    sessions: 8,
                    disc: unitPrice,
                  })
                }
                className="p-2.5 rounded-2xl border border-sky-200 hover:border-sky-500 bg-sky-50/60 text-left text-xs transition"
              >
                <div className="font-extrabold text-sky-900">Trừ 1 buổi có phép</div>
                <div className="text-sky-700 font-black">{vnd(Math.max(0, baseFee - unitPrice))}</div>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Mức đóng khóa IELTS:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAmount(currentDebt > 0 ? currentDebt : baseFee)}
                className="p-2.5 rounded-2xl border border-slate-200 hover:border-indigo-500 text-xs font-extrabold bg-white text-center transition"
              >
                Đóng đủ
              </button>
              <button
                type="button"
                onClick={() => setAmount(Math.round(baseFee / 2))}
                className="p-2.5 rounded-2xl border border-slate-200 hover:border-indigo-500 text-xs font-extrabold bg-white text-center transition"
              >
                Đóng 50%
              </button>
              <button
                type="button"
                onClick={() => setAmount(2000000)}
                className="p-2.5 rounded-2xl border border-slate-200 hover:border-indigo-500 text-xs font-extrabold bg-white text-center transition"
              >
                Cọc 2tr
              </button>
            </div>
          </div>
        )}

        {/* HÌNH THỨC & NGÀY THU */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Hình thức</label>
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setPaymentMethod("TRANSFER")}
                className={`py-1.5 px-2 rounded-xl text-xs font-extrabold transition ${
                  paymentMethod === "TRANSFER"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                CK
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`py-1.5 px-2 rounded-xl text-xs font-extrabold transition ${
                  paymentMethod === "CASH"
                    ? "bg-white text-amber-800 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Tiền mặt
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Ngày thu tiền</label>
            <input
              type="date"
              className={inputCls}
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Số tiền thực thu (VNĐ) *</label>
            <input
              className={`${inputCls} font-black text-emerald-700 text-sm`}
              type="number"
              min={1000}
              step="any"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>

          {isMonthly ? (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Số buổi tương ứng</label>
              <input
                className={inputCls}
                type="number"
                min={1}
                max={48}
                value={sessionsAdded}
                onChange={(e) => setSessionsAdded(Number(e.target.value))}
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Hạn đóng đợt sau (nếu còn nợ)</label>
              <input
                className={inputCls}
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">Ghi chú</label>
          <input
            className={inputCls}
            placeholder="VD: Phụ huynh chuyển qua Vietcombank..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {student.tuitionNote && (
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={clearTuitionNote}
              onChange={(e) => setClearTuitionNote(e.target.checked)}
              className="rounded text-indigo-600"
            />
            Xóa lời nhắc nợ &ldquo;{student.tuitionNote}&rdquo; sau khi nạp
          </label>
        )}

        {student.paymentHistory && student.paymentHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 block">Lịch sử phiếu thu gần đây:</span>
            <div className="max-h-28 overflow-y-auto space-y-1">
              {student.paymentHistory.slice(0, 3).map((ph) => (
                <div key={ph.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700">{fmtDate(ph.paidAt)}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="font-extrabold text-emerald-700">+{vnd(ph.paid)}</span>
                    {ph.note && <span className="text-slate-400 ml-1">({ph.note})</span>}
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!window.confirm(`Hủy phiếu thu ${vnd(ph.paid)}? Công nợ của học viên sẽ được khôi phục lại.`)) return;
                      try {
                        await api(`/api/payments/${ph.id}`, { method: "DELETE" });
                        onDone();
                      } catch (err: any) {
                        setErr(err.message);
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Hủy phiếu thu này"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {err && <p className="text-xs font-bold text-rose-600">{err}</p>}
        <button className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/25 active:scale-95 transition">
          Xác nhận nạp {vnd(amount)}
        </button>
      </form>
    </Modal>
  );
}
