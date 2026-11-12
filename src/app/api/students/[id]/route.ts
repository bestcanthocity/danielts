import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(req: NextRequest, { params }: Ctx) {
  const classId = new URL(req.url).searchParams.get("classId");

  const student = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      enrollments: {
        include: {
          classRoom: {
            include: {
              sessions: {
                orderBy: { sessionDate: "desc" },
                include: {
                  attendances: {
                    where: { studentId: params.id },
                  },
                },
              },
            },
          },
          tuitionCycles: {
            orderBy: { periodStart: "desc" },
          },
          payments: {
            orderBy: { paidAt: "desc" },
          },
        },
        orderBy: { joinDate: "asc" },
      },
      studentIssues: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!student) {
    return NextResponse.json(
      { error: "Không tìm thấy hồ sơ học viên." },
      { status: 404 }
    );
  }

  // Chọn enrollment theo classId (hoặc lấy enrollment đầu tiên)
  const activeEnrollment =
    student.enrollments.find((e) => !classId || e.classId === classId) ||
    student.enrollments[0];

  if (!activeEnrollment) {
    return NextResponse.json(
      { error: "Học viên chưa đăng ký lớp nào." },
      { status: 404 }
    );
  }

  const cls = activeEnrollment.classRoom;
  const isMonthly = (cls.type || "MONTHLY") === "MONTHLY";
  const cycles = activeEnrollment.tuitionCycles || [];
  const latestCycle = cycles[0] || null;

  // Tổng hợp lịch sử điểm danh từng ngày của học viên trong lớp
  const attendanceTimeline = cls.sessions
    .map((s) => {
      const rec = s.attendances[0];
      if (!rec) return null;
      return {
        sessionId: s.id,
        date: s.sessionDate,
        title: s.title,
        topic: s.topic,
        status: rec.status, // PRESENT | LATE | EXCUSED | ABSENT
        note: rec.note || "",
        homeworkDone: rec.homeworkDone,
      };
    })
    .filter(Boolean) as {
    sessionId: string;
    date: Date;
    title: string;
    topic: string | null;
    status: string;
    note: string;
    homeworkDone: boolean;
  }[];

  const presentCount = attendanceTimeline.filter(
    (a) => a.status === "PRESENT"
  ).length;
  const lateCount = attendanceTimeline.filter(
    (a) => a.status === "LATE"
  ).length;
  const excusedCount = attendanceTimeline.filter(
    (a) => a.status === "EXCUSED"
  ).length;
  const absentCount = attendanceTimeline.filter(
    (a) => a.status === "ABSENT"
  ).length;

  const attendedTotal = presentCount + lateCount;
  const usedSessions = attendedTotal + absentCount; // Có mặt + Muộn + Vắng không phép

  const totalRequired = cycles.reduce(
    (sum, cy) => sum + Math.max(0, cy.totalAmount - cy.discountAmount),
    0
  );
  const totalDiscount = cycles.reduce(
    (sum, cy) => sum + (cy.discountAmount || 0),
    0
  );
  const totalPaid = cycles.reduce((sum, cy) => sum + cy.paidAmount, 0);
  const totalDebt = Math.max(0, totalRequired - totalPaid);

  const totalExpectedSessions = cycles.reduce(
    (sum, cy) => sum + (cy.expectedSessions || 0),
    0
  );
  const paidSessions = cycles
    .filter((cy) => cy.paidAmount > 0)
    .reduce((sum, cy) => sum + (cy.expectedSessions || 0), 0);

  const targetSessions =
    paidSessions > 0 ? paidSessions : totalExpectedSessions || 8;
  const remainingSessions = targetSessions - usedSessions;

  const attendanceRate =
    attendanceTimeline.length > 0
      ? Math.round((attendedTotal / attendanceTimeline.length) * 100)
      : 100;

  // Tính số ngày đã gắn bó từ ngày bắt đầu học
  const joinDateObj = new Date(activeEnrollment.joinDate);
  const daysAtCenter = Math.max(
    1,
    Math.floor((Date.now() - joinDateObj.getTime()) / 86400000) + 1
  );

  // Danh sách các lần nộp tiền
  const paymentsList =
    activeEnrollment.payments.length > 0
      ? activeEnrollment.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentMethod: p.paymentMethod,
          paidAt: p.paidAt,
          note: p.note,
        }))
      : cycles
          .filter((cy) => cy.paidAmount > 0)
          .map((cy) => ({
            id: cy.id,
            amount: cy.paidAmount,
            paymentMethod: cy.paymentMethod || "TRANSFER",
            paidAt: cy.paidAt || cy.createdAt,
            note: cy.note || cy.cycleName,
          }));

  return NextResponse.json({
    student: {
      id: student.id,
      studentCode: student.studentCode,
      name: student.name,
      phone: student.phone,
      email: student.email,
    },
    enrollment: {
      id: activeEnrollment.id,
      joinDate: activeEnrollment.joinDate,
      daysAtCenter,
      billingMode: activeEnrollment.billingMode,
      note: activeEnrollment.note || "",
      classId: cls.id,
      className: cls.name,
      classType: cls.type || "MONTHLY",
      scheduleText: cls.scheduleText,
      monthlyTuition: cls.monthlyTuition,
      pricePerSession: cls.pricePerSession,
    },
    attendanceSummary: {
      totalRecorded: attendanceTimeline.length,
      presentCount,
      lateCount,
      excusedCount,
      absentCount,
      attendedTotal,
      usedSessions,
      targetSessions,
      paidSessions,
      remainingSessions,
      attendanceRate,
    },
    tuitionSummary: {
      totalRequired,
      totalDiscount,
      totalPaid,
      totalDebt,
      paidUntilDate: latestCycle?.periodEnd || null,
      currentCycleStart: latestCycle?.periodStart || null,
      currentCycleName: latestCycle?.cycleName || "Chưa có chu kỳ",
      nextDueDate: latestCycle?.dueDate || null,
      isMonthly,
    },
    cycles: cycles.map((cy) => ({
      id: cy.id,
      cycleName: cy.cycleName,
      periodStart: cy.periodStart,
      periodEnd: cy.periodEnd,
      dueDate: cy.dueDate,
      expectedSessions: cy.expectedSessions,
      totalAmount: cy.totalAmount,
      discountAmount: cy.discountAmount,
      paidAmount: cy.paidAmount,
      debt: Math.max(0, cy.totalAmount - cy.discountAmount - cy.paidAmount),
      status: cy.status,
      note: cy.note,
    })),
    payments: paymentsList,
    attendanceTimeline,
    allEnrollments: student.enrollments.map((e) => ({
      classId: e.classId,
      className: e.classRoom.name,
      joinDate: e.joinDate,
    })),
  });
}

// Cập nhật thông tin học viên (Họ tên, SĐT, Ngày bắt đầu học, Ghi chú quá trình học)
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const body = await req.json();
  const { enrollmentId, name, phone, joinDate, note } = body;

  await prisma.$transaction(async (tx) => {
    if (name !== undefined || phone !== undefined) {
      await tx.user.update({
        where: { id: params.id },
        data: {
          name: name ? String(name).trim() : undefined,
          phone: phone !== undefined ? (phone ? String(phone).trim() : null) : undefined,
        },
      });
    }

    if (enrollmentId && (joinDate !== undefined || note !== undefined)) {
      await tx.enrollment.update({
        where: { id: String(enrollmentId) },
        data: {
          joinDate: joinDate ? new Date(joinDate) : undefined,
          note: note !== undefined ? (note ? String(note).trim() : null) : undefined,
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
