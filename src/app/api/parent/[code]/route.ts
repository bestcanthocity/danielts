import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: { code: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const code = params.code.trim();

  // Tìm học viên theo studentCode hoặc số điện thoại
  const student = await prisma.user.findFirst({
    where: {
      OR: [
        { studentCode: code.toUpperCase() },
        { phone: code },
      ],
    },
    include: {
      enrollments: {
        where: { status: { in: ["ACTIVE", "PAUSED"] } },
        include: {
          classRoom: {
            include: {
              sessions: {
                orderBy: { sessionDate: "desc" },
                include: {
                  attendances: true,
                },
              },
            },
          },
          tuitionCycles: {
            orderBy: { createdAt: "desc" },
          },
          payments: {
            orderBy: { paidAt: "desc" },
          },
        },
        orderBy: { joinDate: "asc" },
      },
    },
  });

  if (!student || student.enrollments.length === 0) {
    return NextResponse.json(
      { error: "Không tìm thấy thông tin học viên." },
      { status: 404 }
    );
  }

  const enr = student.enrollments[0];
  const cls = enr.classRoom;
  const isMonthly = (cls.type || "MONTHLY") === "MONTHLY";
  const cycles = enr.tuitionCycles || [];
  const latestCycle = cycles[0] || null;

  // Lịch sử điểm danh chi tiết
  const attendanceTimeline = cls.sessions
    .map((s) => {
      const rec = s.attendances.find((a) => a.studentId === student.id);
      if (!rec) return null;
      return {
        sessionId: s.id,
        date: s.sessionDate,
        title: s.title,
        status: rec.status, // PRESENT | LATE | EXCUSED | ABSENT
        note: rec.note || "",
        homeworkDone: rec.homeworkDone,
      };
    })
    .filter(Boolean) as {
    sessionId: string;
    date: Date;
    title: string;
    status: string;
    note: string;
    homeworkDone: boolean;
  }[];

  const presentCount = attendanceTimeline.filter((a) => a.status === "PRESENT").length;
  const lateCount = attendanceTimeline.filter((a) => a.status === "LATE").length;
  const excusedCount = attendanceTimeline.filter((a) => a.status === "EXCUSED").length;
  const absentCount = attendanceTimeline.filter((a) => a.status === "ABSENT").length;
  const attendedTotal = presentCount + lateCount;
  const usedSessions = attendedTotal + absentCount; // Đã dùng = Đi học + Vắng không phép

  const totalRequired = cycles.reduce(
    (sum, cy) => sum + Math.max(0, cy.totalAmount - cy.discountAmount),
    0
  );
  const totalPaid = cycles.reduce((sum, cy) => sum + cy.paidAmount, 0);
  const totalDebt = Math.max(0, totalRequired - totalPaid);

  const paidSessions = cycles
    .filter((cy) => cy.paidAmount > 0)
    .reduce((sum, cy) => sum + (cy.expectedSessions || 0), 0);
  const totalExpectedSessions = cycles.reduce(
    (sum, cy) => sum + (cy.expectedSessions || 0),
    0
  );

  const targetSessions = paidSessions > 0 ? paidSessions : totalExpectedSessions || 8;
  const remainingSessions = targetSessions - usedSessions;

  // Số tiền đề xuất thanh toán kỳ này
  const amountToPay = totalDebt > 0 ? totalDebt : cls.monthlyTuition;

  // Cấu hình VietQR ngân hàng trung tâm DanielTS
  // Mẫu NAPAS: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact2.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<NAME>
  const bankId = "MB"; // MBBank hoặc VCB
  const accountNo = "0901000111"; // STK Trung tâm
  const accountName = "TRUNG TAM DANIELTS";
  const transferContent = `HP ${student.studentCode || student.name} ${cls.name}`.slice(0, 50);

  const qrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amountToPay}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountName)}`;

  return NextResponse.json({
    student: {
      id: student.id,
      name: student.name,
      studentCode: student.studentCode,
      phone: student.phone,
    },
    classInfo: {
      name: cls.name,
      type: cls.type || "MONTHLY",
      scheduleText: cls.scheduleText,
      monthlyTuition: cls.monthlyTuition,
    },
    enrollment: {
      joinDate: enr.joinDate,
      status: enr.status,
      note: enr.note,
    },
    attendance: {
      timeline: attendanceTimeline,
      presentCount,
      lateCount,
      excusedCount,
      absentCount,
      attendedTotal,
      usedSessions,
      targetSessions,
      remainingSessions,
    },
    tuition: {
      isMonthly,
      totalPaid,
      totalDebt,
      paidUntilDate: latestCycle?.periodEnd || null,
      cycleName: latestCycle?.cycleName || "Chưa có chu kỳ",
      dueDate: latestCycle?.dueDate || null,
      amountToPay,
      qrUrl,
      bankInfo: {
        bankName: "Ngân hàng Quân Đội (MBBank)",
        accountNo,
        accountName,
        transferContent,
      },
    },
    payments: enr.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      paidAt: p.paidAt,
      note: p.note,
    })),
  });
}
