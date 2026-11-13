import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateStudentTuition } from "@/lib/tuition-calculator";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const cls = await prisma.classRoom.findUnique({
    where: { id: params.id },
    include: {
      sessions: {
        orderBy: { sessionDate: "desc" },
        include: { attendances: true },
      },
      enrollments: {
        orderBy: { createdAt: "asc" },
        include: {
          student: true,
          tuitionCycles: { orderBy: { createdAt: "desc" } },
          payments: { orderBy: { paidAt: "desc" } },
          evaluations: { orderBy: { monthYear: "desc" } },
        },
      },
    },
  });
  if (!cls) {
    return NextResponse.json({ error: "Không tìm thấy lớp." }, { status: 404 });
  }

  const allAtt = cls.sessions.flatMap((s) => s.attendances);

  const students = cls.enrollments.map((e) => {
    const cycles = e.tuitionCycles || [];
    const latestCycle = cycles[0] || null;

    const totalRequired = cycles.reduce(
      (sum, cy) => sum + Math.max(0, cy.totalAmount - cy.discountAmount),
      0
    );
    const totalPaid = cycles.reduce((sum, cy) => sum + cy.paidAmount, 0);
    const debt = Math.max(0, totalRequired - totalPaid);

    const totalExpectedSessions = cycles.reduce(
      (sum, cy) => sum + (cy.expectedSessions || 0),
      0
    );
    const paidSessions = cycles
      .filter((cy) => cy.paidAmount > 0)
      .reduce((sum, cy) => sum + (cy.expectedSessions || 0), 0);

    const studentAtt = allAtt.filter((a) => a.studentId === e.studentId);
    const attended = studentAtt.filter((a) =>
      ["PRESENT", "LATE"].includes(a.status)
    ).length;
    const absentUnexcused = studentAtt.filter(
      (a) => a.status === "ABSENT"
    ).length;
    const excused = studentAtt.filter((a) => a.status === "EXCUSED").length;

    // TÍNH SỐ BUỔI ĐÃ QUA THEO LỊCH CỦA LỚP (SCHEDULE TIMELINE):
    // Chi phí tổ chức lớp học phát sinh theo lịch. Bất kể giáo viên có quên điểm danh hay học sinh nghỉ ốm,
    // buổi học theo lịch vẫn bị tính trừ vào học phí (trừ trường hợp nghỉ có phép EXCUSED được duyệt bảo lưu).
    const todayStr = new Date().toISOString().slice(0, 10);
    const joinDateStr = new Date(e.joinDate).toISOString().slice(0, 10);
    const pastScheduledSessions = cls.sessions.filter((s) => {
      const sDate = new Date(s.sessionDate).toISOString().slice(0, 10);
      return sDate <= todayStr && sDate >= joinDateStr;
    });
    const scheduledPassed = Math.max(0, pastScheduledSessions.length - excused);

    // Số buổi đã sử dụng = max giữa buổi điểm danh thực tế và số buổi đã diễn ra theo lịch
    const usedSessions = Math.max(attended + absentUnexcused, scheduledPassed);
    const targetSessions =
      paidSessions > 0 ? paidSessions : totalExpectedSessions || 8;
    const remainingSessions = targetSessions - usedSessions;
    const scheduledSessionsCount = pastScheduledSessions.length;

    const paymentHistory =
      e.payments.length > 0
        ? e.payments.map((p) => ({
            id: p.id,
            cycleName:
              p.paymentMethod === "CASH" ? "💵 Tiền mặt" : "🏦 Chuyển khoản",
            total: p.amount,
            discount: 0,
            paid: p.amount,
            expectedSessions: 0,
            paidAt: p.paidAt,
            dueDate: p.paidAt,
            note: p.note,
          }))
        : cycles
            .filter((cy) => cy.paidAmount > 0)
            .map((cy) => ({
              id: cy.id,
              cycleName: cy.cycleName,
              total: Math.max(0, cy.totalAmount - cy.discountAmount),
              discount: cy.discountAmount,
              paid: cy.paidAmount,
              expectedSessions: cy.expectedSessions,
              paidAt: cy.paidAt || cy.createdAt,
              dueDate: cy.dueDate,
              note: cy.note,
            }));

    return {
      enrollmentId: e.id,
      studentId: e.studentId,
      studentCode: e.student.studentCode,
      name: e.student.name,
      phone: e.student.phone,
      joinDate: e.joinDate,
      billingMode: e.billingMode,
      status: e.status || "ACTIVE", // ACTIVE | PAUSED | FINISHED
      tuitionNote: e.note || "",
      attended,
      absentUnexcused,
      excused,
      usedSessions,
      targetSessions,
      paidSessions,
      remainingSessions,
      scheduledSessionsCount,
      tuition: latestCycle
        ? {
            cycleId: latestCycle.id,
            cycleName: latestCycle.cycleName,
            total: totalRequired,
            paid: totalPaid,
            debt,
            dueDate: latestCycle.dueDate,
            expectedSessions: totalExpectedSessions,
          }
        : null,
      paymentHistory,
      evaluations: e.evaluations || [],
      latestEvaluation: e.evaluations?.[0] || null,
    };
  });

  const sortedSessions = [...cls.sessions].sort(
    (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()
  );

  const sessionHistory = sortedSessions.map((s, idx) => {
    const d = new Date(s.sessionDate).toISOString().slice(0, 10);
    const presentCount = s.attendances.filter((a) =>
      ["PRESENT", "LATE"].includes(a.status)
    ).length;
    return {
      id: s.id,
      index: idx + 1,
      title: s.title || `Buổi ${idx + 1}`,
      date: d,
      presentCount,
      totalCount: s.attendances.length,
      isCompleted: s.isCompleted || s.attendances.length > 0,
    };
  });

  return NextResponse.json({
    class: {
      id: cls.id,
      name: cls.name,
      type: cls.type || "MONTHLY",
      scheduleText: cls.scheduleText,
      monthlyTuition: cls.monthlyTuition,
      sessionsPerMonth: cls.sessionsPerMonth || 8,
      pricePerSession:
        cls.pricePerSession || Math.round(cls.monthlyTuition / 8),
    },
    students,
    sessionHistory,
  });
}

// Thêm học viên vào lớp (hoặc gán học viên cũ vào thêm lớp này)
export async function POST(req: NextRequest, { params }: Ctx) {
  const body = await req.json();
  const cls = await prisma.classRoom.findUnique({ where: { id: params.id } });
  if (!cls) {
    return NextResponse.json({ error: "Không tìm thấy lớp." }, { status: 404 });
  }

  const joinDate = body.joinDate ? new Date(body.joinDate) : new Date();
  const extraSessions = Math.max(0, Number(body.extraSessions) || 0);
  const tuitionNote = body.tuitionNote ? String(body.tuitionNote).trim() : null;

  const est = calculateStudentTuition({
    classType: (cls.type as "MONTHLY" | "COURSE") || "MONTHLY",
    monthlyTuition: cls.monthlyTuition,
    pricePerSession: cls.pricePerSession || Math.round(cls.monthlyTuition / 8),
    sessionsPerMonth: cls.sessionsPerMonth || 8,
    joinDate,
    extraSessions,
  });

  // Nếu chọn học viên cũ đã có trong hệ thống
  if (body.existingStudentId) {
    const existing = await prisma.user.findUnique({
      where: { id: body.existingStudentId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Không tìm thấy học viên." }, { status: 404 });
    }

    const alreadyEnrolled = await prisma.enrollment.findUnique({
      where: {
        classId_studentId: {
          classId: cls.id,
          studentId: existing.id,
        },
      },
    });

    if (alreadyEnrolled) {
      return NextResponse.json(
        { error: "Học viên này đã có trong lớp rồi." },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.create({
        data: {
          classId: cls.id,
          studentId: existing.id,
          joinDate,
          billingMode: cls.type || "MONTHLY",
          note: tuitionNote,
        },
      });
      await tx.tuitionCycle.create({
        data: {
          enrollmentId: enrollment.id,
          cycleName: est.cycleName,
          periodStart: est.periodStart,
          periodEnd: est.periodEnd,
          dueDate: est.dueDate,
          expectedSessions: est.expectedSessions,
          totalAmount: est.totalAmount,
          status: "UNPAID",
        },
      });
    });

    return NextResponse.json({ ok: true });
  }

  // Nếu tạo học viên mới hoàn toàn
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json(
      { error: "Vui lòng nhập tên học viên." },
      { status: 400 }
    );
  }

  const phone = body.phone ? String(body.phone).trim() : null;
  if (phone && (await prisma.user.findUnique({ where: { phone } }))) {
    return NextResponse.json(
      { error: "Số điện thoại này đã tồn tại trên hệ thống." },
      { status: 400 }
    );
  }

  let n = (await prisma.user.count({ where: { role: "STUDENT_PARENT" } })) + 1;
  while (
    await prisma.user.findUnique({
      where: { studentCode: `DAN-${String(n).padStart(3, "0")}` },
    })
  )
    n++;
  const studentCode = `DAN-${String(n).padStart(3, "0")}`;

  await prisma.$transaction(async (tx) => {
    const student = await tx.user.create({
      data: {
        name,
        phone,
        studentCode,
        email: `${studentCode.toLowerCase()}@danielts.vn`,
        role: "STUDENT_PARENT",
        passwordHash: "123456",
      },
    });
    const enrollment = await tx.enrollment.create({
      data: {
        classId: cls.id,
        studentId: student.id,
        joinDate,
        billingMode: cls.type || "MONTHLY",
        note: tuitionNote,
      },
    });
    await tx.tuitionCycle.create({
      data: {
        enrollmentId: enrollment.id,
        cycleName: est.cycleName,
        periodStart: est.periodStart,
        periodEnd: est.periodEnd,
        dueDate: est.dueDate,
        expectedSessions: est.expectedSessions,
        totalAmount: est.totalAmount,
        status: "UNPAID",
      },
    });
  });

  return NextResponse.json({ ok: true });
}

// CẬP NHẬT TRẠNG THÁI HỌC VIÊN HOẶC XÓA LỚP
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const body = await req.json();
  const { enrollmentId, status } = body;

  if (enrollmentId && status) {
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status }, // ACTIVE | PAUSED | FINISHED
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Tham số không hợp lệ." }, { status: 400 });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const enrollmentId = new URL(req.url).searchParams.get("enrollmentId");
  if (enrollmentId) {
    // Chuyển sang lưu trữ (FINISHED) thay vì xóa mất dữ liệu
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: "FINISHED" },
    });
    return NextResponse.json({ ok: true });
  }

  // Xóa lớp chỉ khi không còn học viên hoặc có xác nhận
  await prisma.classRoom.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
