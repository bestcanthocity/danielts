import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Trường hợp 1: Chỉ lưu ghi chú vấn đề học phí / hẹn đóng (không cần nạp tiền)
  if (body.action === "SAVE_NOTE") {
    const { enrollmentId, tuitionNote, dueDate } = body;
    if (!enrollmentId) {
      return NextResponse.json(
        { error: "Thiếu mã học viên." },
        { status: 400 }
      );
    }

    await prisma.enrollment.update({
      where: { id: String(enrollmentId) },
      data: {
        note: tuitionNote ? String(tuitionNote).trim() : null,
      },
    });

    if (dueDate) {
      const latest = await prisma.tuitionCycle.findFirst({
        where: { enrollmentId: String(enrollmentId) },
        orderBy: { createdAt: "desc" },
      });
      if (latest) {
        await prisma.tuitionCycle.update({
          where: { id: latest.id },
          data: { dueDate: new Date(dueDate) },
        });
      }
    }

    return NextResponse.json({ ok: true });
  }

  // Trường hợp 2: Nạp học phí (theo tháng / buổi lẻ hoặc theo đợt khóa IELTS)
  const amount = Math.round(Number(body.amount));
  const note = body.note ? String(body.note).trim() : null;
  const sessionsAdded = Number(body.sessionsAdded) || 0;
  const discountAmount = Math.max(0, Number(body.discountAmount) || 0);
  const cycleLabel = body.cycleLabel ? String(body.cycleLabel).trim() : null;
  const nextDueDate = body.dueDate ? new Date(body.dueDate) : null;
  const paymentMethod = body.paymentMethod === "CASH" ? "CASH" : "TRANSFER";
  const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();

  if (!body.enrollmentId || !amount || amount <= 0) {
    return NextResponse.json(
      { error: "Số tiền nạp không hợp lệ." },
      { status: 400 }
    );
  }

  const enr = await prisma.enrollment.findUnique({
    where: { id: String(body.enrollmentId) },
    include: {
      classRoom: true,
      tuitionCycles: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!enr) {
    return NextResponse.json(
      { error: "Không tìm thấy học viên." },
      { status: 404 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const latest = enr.tuitionCycles[0];
    const isSettled =
      latest &&
      latest.paidAmount >= latest.totalAmount - latest.discountAmount;

    let targetCycleId: string;

    // Nếu kỳ hiện tại chưa đóng đủ -> cập nhật vào kỳ hiện tại
    if (latest && !isSettled) {
      const newDiscount = latest.discountAmount + discountAmount;
      const newPaid = latest.paidAmount + amount;
      const newTotal =
        body.overrideTotalAmount !== undefined
          ? Number(body.overrideTotalAmount)
          : latest.totalAmount;
      const need = Math.max(0, newTotal - newDiscount);

      const updated = await tx.tuitionCycle.update({
        where: { id: latest.id },
        data: {
          cycleName: cycleLabel || latest.cycleName,
          totalAmount: newTotal,
          discountAmount: newDiscount,
          paidAmount: newPaid,
          expectedSessions:
            sessionsAdded > 0 ? sessionsAdded : latest.expectedSessions,
          status: newPaid >= need ? "PAID" : "PARTIAL",
          paymentMethod,
          paidAt,
          dueDate: nextDueDate || latest.dueDate,
          note: note || latest.note,
        },
      });
      targetCycleId = updated.id;
    } else {
      // Nếu kỳ trước đã đóng đủ (hoặc chưa có kỳ nào) -> Tạo kỳ đóng mới
      const start = paidAt;
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const due = nextDueDate || new Date(start.getTime() + 7 * 86400000);
      const sessions =
        sessionsAdded > 0
          ? sessionsAdded
          : enr.classRoom.type === "COURSE"
          ? 36
          : enr.classRoom.sessionsPerMonth || 8;

      const total =
        body.overrideTotalAmount !== undefined
          ? Number(body.overrideTotalAmount)
          : amount + discountAmount;
      const need = Math.max(0, total - discountAmount);

      const created = await tx.tuitionCycle.create({
        data: {
          enrollmentId: enr.id,
          cycleName:
            cycleLabel ||
            (enr.classRoom.type === "COURSE"
              ? "Đóng học phí khóa IELTS"
              : `Gia hạn ${sessions} buổi (${start.toLocaleDateString("vi-VN")})`),
          periodStart: start,
          periodEnd: end,
          dueDate: due,
          expectedSessions: sessions,
          totalAmount: total,
          discountAmount,
          paidAmount: amount,
          status: amount >= need ? "PAID" : "PARTIAL",
          paymentMethod,
          paidAt,
          note,
        },
      });
      targetCycleId = created.id;
    }

    // Lưu phiếu thu độc lập (PaymentRecord) để thống kê dòng tiền chính xác theo ngày thu
    await tx.paymentRecord.create({
      data: {
        enrollmentId: enr.id,
        tuitionCycleId: targetCycleId,
        amount,
        paymentMethod,
        paidAt,
        note: note || cycleLabel || null,
      },
    });

    if (body.clearTuitionNote) {
      await tx.enrollment.update({
        where: { id: enr.id },
        data: { note: null },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
