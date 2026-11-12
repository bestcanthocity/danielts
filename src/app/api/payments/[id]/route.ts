import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// HỦY PHIẾU THU / HOÀN TIỀN VÀ KHÔI PHỤC LẠI CÔNG NỢ HỌC SINH
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const paymentId = params.id;

  const payment = await prisma.paymentRecord.findUnique({
    where: { id: paymentId },
    include: {
      tuitionCycle: true,
      enrollment: true,
    },
  });

  if (!payment) {
    return NextResponse.json(
      { error: "Không tìm thấy phiếu thu này." },
      { status: 404 }
    );
  }

  await prisma.$transaction(async (tx) => {
    // 1. Trừ lại số tiền trong chu kỳ học phí tương ứng
    if (payment.tuitionCycleId && payment.tuitionCycle) {
      const cycle = payment.tuitionCycle;
      const newPaid = Math.max(0, cycle.paidAmount - payment.amount);
      const need = Math.max(0, cycle.totalAmount - cycle.discountAmount);

      await tx.tuitionCycle.update({
        where: { id: cycle.id },
        data: {
          paidAmount: newPaid,
          status: newPaid >= need ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID",
        },
      });
    }

    // 2. Xóa phiếu thu khỏi sổ nhật ký
    await tx.paymentRecord.delete({
      where: { id: paymentId },
    });
  });

  return NextResponse.json({ ok: true });
}
