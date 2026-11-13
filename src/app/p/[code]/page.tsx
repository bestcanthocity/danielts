"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  XCircle,
  Copy,
  Check,
  CreditCard,
  QrCode,
  GraduationCap,
  Sparkles,
  Phone,
  HelpCircle,
  Award,
  Star,
  BookOpen,
  MessageSquare
} from "lucide-react";

const vnd = (n: number) => `${Math.round(n || 0).toLocaleString("vi-VN")}đ`;
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

export default function ParentPortalPage() {
  const params = useParams();
  const code = String(params.code || "");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/parent/${encodeURIComponent(code)}`);
        const json = await res.json();
        if (res.ok) setData(json);
      } finally {
        setLoading(false);
      }
    })();
  }, [code]);

  const copyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-500">Đang tải sổ liên lạc trực tuyến...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">Không tìm thấy thông tin</h2>
          <p className="text-xs text-slate-500 mt-1">
            Mã học viên hoặc số điện thoại <strong>{code}</strong> chưa có dữ liệu trên hệ thống DanielTS.
          </p>
        </div>
      </div>
    );
  }

  const { student, classInfo, attendance, tuition, payments, evaluations = [], latestEvaluation } = data;
  const [selectedEvalIndex, setSelectedEvalIndex] = useState(0);
  const currentEval = evaluations.length > 0 ? evaluations[selectedEvalIndex] || latestEvaluation : latestEvaluation;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-12">
      {/* HEADER PHỤ HUYNH */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-20 backdrop-blur-md bg-white/90">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white font-black flex items-center justify-center shadow-md shadow-indigo-600/20">
              D
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900">Sổ Liên Lạc & Học Phí</h1>
              <p className="text-[11px] text-slate-500">Trung tâm Anh ngữ DanielTS</p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {student.studentCode}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-5 space-y-4">
        {/* THÔNG TIN HỌC VIÊN */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{student.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lớp: <strong className="text-slate-800">{classInfo.name}</strong> ({classInfo.scheduleText})
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
              Đang theo học
            </span>
          </div>

          {/* CHỈ SỐ BUỔI HỌC */}
          <div className="grid grid-cols-3 gap-2.5 pt-2 text-center">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <span className="text-[11px] text-slate-500 block">Đã học</span>
              <span className="text-lg font-black text-slate-900">{attendance.attendedTotal} buổi</span>
            </div>
            <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100">
              <span className="text-[11px] text-sky-700 block">Nghỉ có phép</span>
              <span className="text-lg font-black text-sky-700">{attendance.excusedCount} buổi</span>
              <span className="text-[9px] text-sky-600 block">(được giữ buổi)</span>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100">
              <span className="text-[11px] text-indigo-700 block">Còn lại</span>
              <span className="text-lg font-black text-indigo-700">
                {attendance.remainingSessions >= 0 ? `${attendance.remainingSessions} buổi` : `Lố ${Math.abs(attendance.remainingSessions)} buổi`}
              </span>
            </div>
          </div>
        </div>

        {/* THẺ HỌC PHÍ & MÃ VIETQR ĐỘNG */}
        <div className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="w-4 h-4" /> Học Phí & Chuyển Khoản
            </span>
            {tuition.totalDebt > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                Cần đóng
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                Đã hoàn tất
              </span>
            )}
          </div>

          {attendance.remainingSessions <= 2 && (
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-xs font-bold text-amber-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                {attendance.remainingSessions <= 0
                  ? `Học viên đã dùng hết ${attendance.targetSessions} buổi học theo lịch của kỳ này. Kính mời Quý phụ huynh nạp học phí kỳ mới để tiếp tục lịch học.`
                  : `Học viên còn ${attendance.remainingSessions} buổi học theo lịch. Kính mời Quý phụ huynh chuẩn bị đóng học phí cho chu kỳ tiếp theo.`}
              </span>
            </div>
          )}

          <div>
            <span className="text-xs text-slate-300 block">Số tiền thanh toán:</span>
            <div className="text-3xl font-black text-white mt-1">
              {vnd(tuition.amountToPay)}
            </div>
            <p className="text-xs text-indigo-200 mt-1">
              {tuition.cycleName} {tuition.dueDate && `· Hạn đóng: ${fmtDate(tuition.dueDate)}`}
            </p>
          </div>

          {/* MÃ QR VIETQR NAPAS TỰ ĐIỀN */}
          <div className="bg-white text-slate-900 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="w-36 h-36 bg-white p-1 rounded-xl border border-slate-200 shadow-sm shrink-0 flex items-center justify-center">
              <img
                src={tuition.qrUrl}
                alt="Mã VietQR"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-xs space-y-1.5 flex-1 w-full">
              <div className="font-bold text-indigo-700 text-sm flex items-center gap-1.5">
                <QrCode className="w-4 h-4" /> Quét mã VietQR chuyển nhanh
              </div>
              <div>
                <span className="text-slate-400">Ngân hàng:</span>{" "}
                <strong>{tuition.bankInfo.bankName}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Số tài khoản: <strong>{tuition.bankInfo.accountNo}</strong></span>
                <button
                  type="button"
                  onClick={() => copyText(tuition.bankInfo.accountNo)}
                  className="text-indigo-600 font-bold text-[11px] underline"
                >
                  {copied ? "Đã chép" : "Sao chép"}
                </button>
              </div>
              <div>
                <span className="text-slate-400">Chủ tài khoản:</span>{" "}
                <strong>{tuition.bankInfo.accountName}</strong>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-[11px]">
                <span className="text-slate-400">Nội dung CK:</span>{" "}
                <strong className="text-indigo-700 font-mono">{tuition.bankInfo.transferContent}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* PHIẾU ĐÁNH GIÁ & XẾP LOẠI ĐỊNH KỲ THÁNG (DÀNH CHO HỌC SINH PHỔ THÔNG) */}
        {currentEval ? (
          <div className="bg-white rounded-3xl border border-indigo-100 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Phiếu Đánh Giá &amp; Xếp Loại Tháng
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Kỳ đánh giá: <strong className="text-slate-800">{currentEval.monthYear}</strong> (Áp dụng thang điểm 10)
                  </p>
                </div>
              </div>

              {evaluations.length > 1 && (
                <select
                  value={selectedEvalIndex}
                  onChange={(e) => setSelectedEvalIndex(Number(e.target.value))}
                  className="text-xs px-2.5 py-1 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-700"
                >
                  {evaluations.map((ev: any, idx: number) => (
                    <option key={ev.id || idx} value={idx}>
                      Kỳ {ev.monthYear} ({ev.classification})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* BANNER XẾP LOẠI CHÍNH */}
            <div
              className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-white ${
                currentEval.classification === "XUAT_SAC"
                  ? "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 shadow-md shadow-amber-500/20"
                  : currentEval.classification === "GIOI"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 shadow-md shadow-emerald-600/20"
                  : currentEval.classification === "KHA"
                  ? "bg-gradient-to-r from-indigo-600 to-blue-600 shadow-md shadow-indigo-600/20"
                  : "bg-gradient-to-r from-rose-500 to-amber-600 shadow-md shadow-rose-500/20"
              }`}
            >
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 block">
                  Xếp loại năng lực tháng
                </span>
                <span className="text-lg font-black tracking-tight">
                  {currentEval.classification === "XUAT_SAC"
                    ? "🏆 HỌC SINH XUẤT SẮC"
                    : currentEval.classification === "GIOI"
                    ? "🌟 HỌC SINH GIỎI"
                    : currentEval.classification === "KHA"
                    ? "📈 HỌC SINH KHÁ"
                    : "⚠️ CẦN KÈM THÊM KIẾN THỨC"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold opacity-90 block">ĐTB Điểm số</span>
                <span className="text-2xl font-black">
                  {(() => {
                    const scores = [currentEval.testScore, currentEval.grammarScore, currentEval.skillsScore].filter(
                      (s) => s !== null && s !== undefined
                    );
                    if (scores.length === 0) return "—";
                    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
                  })()}
                  <span className="text-xs font-semibold opacity-80">/10</span>
                </span>
              </div>
            </div>

            {/* 3 CHỈ SỐ ĐIỂM SỐ PHỔ THÔNG (THANG ĐIỂM 10) */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Kiểm tra tháng</span>
                <span className="text-base font-extrabold text-slate-900">
                  {currentEval.testScore !== null && currentEval.testScore !== undefined
                    ? `${currentEval.testScore}/10`
                    : "Chưa chấm"}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <span className="text-[11px] text-indigo-700 block">Ngữ pháp &amp; Từ vựng</span>
                <span className="text-base font-extrabold text-indigo-900">
                  {currentEval.grammarScore !== null && currentEval.grammarScore !== undefined
                    ? `${currentEval.grammarScore}/10`
                    : "—"}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-[11px] text-emerald-700 block">Kỹ năng Nghe - Nói</span>
                <span className="text-base font-extrabold text-emerald-900">
                  {currentEval.skillsScore !== null && currentEval.skillsScore !== undefined
                    ? `${currentEval.skillsScore}/10`
                    : "—"}
                </span>
              </div>
            </div>

            {/* THÁI ĐỘ & BTVN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500" /> Thái độ học tập:
                </span>
                <p className="font-semibold text-slate-800">
                  {currentEval.attitude || "Chăm chỉ, tích cực nghe giảng"}
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 block flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-teal-600" /> Tình hình BTVN:
                </span>
                <p className="font-semibold text-slate-800">
                  {currentEval.homeworkStatus || "Hoàn thành bài tập đầy đủ"}
                </p>
              </div>
            </div>

            {/* ĐIỂM MẠNH & CẦN CẢI THIỆN */}
            {(currentEval.strengths || currentEval.improvements) && (
              <div className="space-y-2 text-xs">
                {currentEval.strengths && (
                  <div className="p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-1">
                    <span className="text-[11px] font-bold text-emerald-800 block">
                      ⭐ Ưu điểm nổi bật:
                    </span>
                    <p className="text-slate-800 font-medium">{currentEval.strengths}</p>
                  </div>
                )}
                {currentEval.improvements && (
                  <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-100 space-y-1">
                    <span className="text-[11px] font-bold text-amber-800 block">
                      🎯 Kiến thức cần tiếp tục củng cố:
                    </span>
                    <p className="text-slate-800 font-medium">{currentEval.improvements}</p>
                  </div>
                )}
              </div>
            )}

            {/* LỜI NHẬN XÉT CỦA GIÁO VIÊN */}
            {currentEval.teacherComment && (
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-1 text-xs">
                <span className="text-[11px] font-bold text-indigo-900 block flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-600" /> Nhận xét chi tiết từ Giáo viên:
                </span>
                <p className="text-slate-800 font-medium leading-relaxed italic">
                  "{currentEval.teacherComment}"
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* LỊCH SỬ TỪNG BUỔI HỌC MINH BẠCH */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-indigo-600" />
            Nhật ký Điểm danh từng Buổi học
          </h3>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {attendance.timeline.map((att: any) => (
              <div
                key={att.sessionId}
                className="p-3 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5 min-w-0">
                  <span className="font-extrabold text-slate-800 block">
                    Ngày {fmtDate(att.date)} — {att.title}
                  </span>
                  {att.topic && (
                    <span className="text-indigo-700 font-semibold text-[11px] block">
                      📖 Bài học: {att.topic}
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    {att.homeworkDone !== undefined && (
                      <span className={att.homeworkDone ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"}>
                        {att.homeworkDone ? "✓ Đã làm BTVN" : "⚠️ Chưa làm BTVN"}
                      </span>
                    )}
                    {att.note && <span>💬 {att.note}</span>}
                  </div>
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
                    ? "⏰ Đi muộn"
                    : att.status === "EXCUSED"
                    ? "🛡️ Nghỉ có phép (bảo lưu)"
                    : "✕ Vắng"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
