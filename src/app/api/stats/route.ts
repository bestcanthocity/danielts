import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PeriodType = "MONTH" | "QUARTER" | "HALF_YEAR" | "YEAR";

function getPeriodRange(periodType: PeriodType, year: number, value: number) {
  let startMonth = 0; // 0-indexed (0 = Jan)
  let endMonth = 11;
  let label = `Năm ${year}`;

  if (periodType === "MONTH") {
    const m = Math.min(12, Math.max(1, value)) - 1;
    startMonth = m;
    endMonth = m;
    label = `Tháng ${m + 1}/${year}`;
  } else if (periodType === "QUARTER") {
    const q = Math.min(4, Math.max(1, value));
    startMonth = (q - 1) * 3;
    endMonth = startMonth + 2;
    label = `Quý ${q}/${year} (T${startMonth + 1} - T${endMonth + 1})`;
  } else if (periodType === "HALF_YEAR") {
    const h = value === 2 ? 2 : 1;
    startMonth = h === 1 ? 0 : 6;
    endMonth = h === 1 ? 5 : 11;
    label =
      h === 1
        ? `6 Tháng đầu năm ${year} (T1 - T6)`
        : `6 Tháng cuối năm ${year} (T7 - T12)`;
  }

  const startDate = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, endMonth + 1, 0, 23, 59, 59, 999));

  return { startDate, endDate, startMonth, endMonth, label };
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const now = new Date();
  const periodType = (sp.get("periodType") as PeriodType) || "MONTH";
  const year = Number(sp.get("year")) || now.getFullYear();
  const value =
    Number(sp.get("value")) ||
    (periodType === "MONTH"
      ? now.getMonth() + 1
      : periodType === "QUARTER"
      ? Math.floor(now.getMonth() / 3) + 1
      : periodType === "HALF_YEAR"
      ? now.getMonth() < 6
        ? 1
        : 2
      : 1);

  const { startDate, endDate, startMonth, endMonth, label } = getPeriodRange(
    periodType,
    year,
    value
  );

  // Tự động đồng bộ các khoản đã đóng từ dữ liệu cũ sang PaymentRecord nếu chưa có
  const existingCyclesWithPay = await prisma.tuitionCycle.findMany({
    where: { paidAmount: { gt: 0 } },
    include: { payments: true },
  });

  for (const cy of existingCyclesWithPay) {
    if (cy.payments.length === 0) {
      await prisma.paymentRecord.create({
        data: {
          enrollmentId: cy.enrollmentId,
          tuitionCycleId: cy.id,
          amount: cy.paidAmount,
          paymentMethod: cy.paymentMethod === "CASH" ? "CASH" : "TRANSFER",
          paidAt: cy.paidAt || cy.createdAt,
          note: cy.note || cy.cycleName,
        },
      });
    }
  }

  // Lấy toàn bộ lớp, học viên, điểm danh, chu kỳ và phiếu thu
  const classes = await prisma.classRoom.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      sessions: {
        include: { attendances: true },
      },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: true,
          tuitionCycles: true,
          payments: { orderBy: { paidAt: "desc" } },
        },
      },
    },
  });

  const allPayments = classes.flatMap((c) =>
    c.enrollments.flatMap((e) =>
      e.payments.map((p) => ({
        ...p,
        studentId: e.studentId,
        studentName: e.student.name,
        studentPhone: e.student.phone,
        classId: c.id,
        className: c.name,
        classType: c.type || "MONTHLY",
      }))
    )
  );

  const paymentsInPeriod = allPayments
    .filter((p) => {
      const dt = new Date(p.paidAt);
      return dt >= startDate && dt <= endDate;
    })
    .sort(
      (a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime()
    );

  const totalCollected = paymentsInPeriod.reduce((s, p) => s + p.amount, 0);
  const transferCollected = paymentsInPeriod
    .filter((p) => p.paymentMethod !== "CASH")
    .reduce((s, p) => s + p.amount, 0);
  const cashCollected = paymentsInPeriod
    .filter((p) => p.paymentMethod === "CASH")
    .reduce((s, p) => s + p.amount, 0);

  // Giảm trừ học phí phát sinh trong kỳ
  const allCycles = classes.flatMap((c) =>
    c.enrollments.flatMap((e) => e.tuitionCycles)
  );
  const totalDiscountInPeriod = allCycles
    .filter((cy) => {
      const dt = new Date(cy.createdAt);
      return dt >= startDate && dt <= endDate;
    })
    .reduce((s, cy) => s + (cy.discountAmount || 0), 0);

  // Tổng công nợ hiện tại & Dự kiến thu tiếp (học viên sắp hết buổi / quá buổi)
  let currentTotalDebt = 0;
  let studentsOwingCount = 0;
  let upcomingRenewalAmount = 0;
  let upcomingRenewalCount = 0;

  // Thống kê từng lớp trong kỳ
  const classBreakdown = classes.map((c) => {
    const isMonthly = (c.type || "MONTHLY") === "MONTHLY";
    const sessionsInPeriod = c.sessions.filter((s) => {
      const dt = new Date(s.sessionDate);
      return dt >= startDate && dt <= endDate;
    });

    const attInPeriod = sessionsInPeriod.flatMap((s) => s.attendances);
    const presentInPeriod = attInPeriod.filter((a) =>
      ["PRESENT", "LATE"].includes(a.status)
    ).length;
    const attendanceRate =
      attInPeriod.length > 0
        ? Math.round((presentInPeriod / attInPeriod.length) * 100)
        : 0;

    const newStudentsInPeriod = c.enrollments.filter((e) => {
      const dt = new Date(e.joinDate);
      return dt >= startDate && dt <= endDate;
    }).length;

    const collectedInPeriod = paymentsInPeriod
      .filter((p) => p.classId === c.id)
      .reduce((s, p) => s + p.amount, 0);

    const allClassAtt = c.sessions.flatMap((s) => s.attendances);
    let classDebt = 0;
    let classOwingStudents = 0;

    for (const e of c.enrollments) {
      const req = e.tuitionCycles.reduce(
        (s, cy) => s + Math.max(0, cy.totalAmount - cy.discountAmount),
        0
      );
      const paid = e.tuitionCycles.reduce((s, cy) => s + cy.paidAmount, 0);
      const debt = Math.max(0, req - paid);

      const paidSessions = e.tuitionCycles
        .filter((cy) => cy.paidAmount > 0)
        .reduce((s, cy) => s + (cy.expectedSessions || 0), 0);
      const usedSessions = allClassAtt.filter(
        (a) =>
          a.studentId === e.studentId &&
          ["PRESENT", "LATE", "ABSENT"].includes(a.status)
      ).length;

      const overSessions =
        isMonthly && paidSessions > 0 && usedSessions > paidSessions
          ? usedSessions - paidSessions
          : 0;

      if (debt > 0 || overSessions > 0) {
        const effectiveDebt =
          debt > 0 ? debt : c.monthlyTuition || 1000000;
        classDebt += effectiveDebt;
        currentTotalDebt += effectiveDebt;
        classOwingStudents++;
        studentsOwingCount++;
      } else if (
        isMonthly &&
        paidSessions > 0 &&
        paidSessions - usedSessions <= 1
      ) {
        upcomingRenewalAmount += c.monthlyTuition || 1000000;
        upcomingRenewalCount++;
      }
    }

    return {
      id: c.id,
      name: c.name,
      type: c.type || "MONTHLY",
      monthlyTuition: c.monthlyTuition,
      studentCount: c.enrollments.length,
      newStudentsInPeriod,
      sessionsInPeriod: sessionsInPeriod.length,
      attendanceRate,
      collectedInPeriod,
      classDebt,
      classOwingStudents,
    };
  });

  // Tổng hợp chuyên cần toàn trung tâm trong kỳ
  const allSessionsInPeriod = classes.flatMap((c) =>
    c.sessions.filter((s) => {
      const dt = new Date(s.sessionDate);
      return dt >= startDate && dt <= endDate;
    })
  );
  const allAttInPeriod = allSessionsInPeriod.flatMap((s) => s.attendances);
  const presentCount = allAttInPeriod.filter(
    (a) => a.status === "PRESENT"
  ).length;
  const lateCount = allAttInPeriod.filter((a) => a.status === "LATE").length;
  const excusedCount = allAttInPeriod.filter(
    (a) => a.status === "EXCUSED"
  ).length;
  const absentCount = allAttInPeriod.filter(
    (a) => a.status === "ABSENT"
  ).length;
  const overallAttendanceRate =
    allAttInPeriod.length > 0
      ? Math.round(((presentCount + lateCount) / allAttInPeriod.length) * 100)
      : 0;

  const newEnrollmentsCount = classes.reduce(
    (sum, c) =>
      sum +
      c.enrollments.filter((e) => {
        const dt = new Date(e.joinDate);
        return dt >= startDate && dt <= endDate;
      }).length,
    0
  );

  // Biểu đồ xu hướng theo từng tháng (Nếu chọn 1 Tháng thì hiển thị cả 12 tháng của năm đó để dễ so sánh, nếu chọn Quý/6 Tháng/Năm thì hiển thị các tháng trong kỳ)
  const chartStartM = periodType === "MONTH" ? 0 : startMonth;
  const chartEndM = periodType === "MONTH" ? 11 : endMonth;
  const monthlyTrend = [];

  for (let m = chartStartM; m <= chartEndM; m++) {
    const mStart = new Date(Date.UTC(year, m, 1, 0, 0, 0, 0));
    const mEnd = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59, 999));

    const mPayments = allPayments.filter((p) => {
      const dt = new Date(p.paidAt);
      return dt >= mStart && dt <= mEnd;
    });

    const mSessions = classes.flatMap((c) =>
      c.sessions.filter((s) => {
        const dt = new Date(s.sessionDate);
        return dt >= mStart && dt <= mEnd;
      })
    );

    const mNewStudents = classes.reduce(
      (sum, c) =>
        sum +
        c.enrollments.filter((e) => {
          const dt = new Date(e.joinDate);
          return dt >= mStart && dt <= mEnd;
        }).length,
      0
    );

    monthlyTrend.push({
      month: m + 1,
      label: `T${m + 1}`,
      isSelected:
        periodType === "MONTH" ? m === startMonth : m >= startMonth && m <= endMonth,
      collected: mPayments.reduce((s, p) => s + p.amount, 0),
      transfer: mPayments
        .filter((p) => p.paymentMethod !== "CASH")
        .reduce((s, p) => s + p.amount, 0),
      cash: mPayments
        .filter((p) => p.paymentMethod === "CASH")
        .reduce((s, p) => s + p.amount, 0),
      sessionsCount: mSessions.length,
      newStudents: mNewStudents,
    });
  }

  return NextResponse.json({
    filter: { periodType, year, value, label },
    kpis: {
      totalCollected,
      transferCollected,
      cashCollected,
      transactionCount: paymentsInPeriod.length,
      totalDiscountInPeriod,
      currentTotalDebt,
      studentsOwingCount,
      upcomingRenewalAmount,
      upcomingRenewalCount,
      newEnrollmentsCount,
      sessionsTaughtCount: allSessionsInPeriod.length,
      overallAttendanceRate,
      presentCount,
      lateCount,
      excusedCount,
      absentCount,
    },
    monthlyTrend,
    classBreakdown,
    transactions: paymentsInPeriod,
  });
}
