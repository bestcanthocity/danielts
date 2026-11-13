import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const classes = await prisma.classRoom.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        enrollments: {
          where: { status: "ACTIVE" },
          include: {
            tuitionCycles: { orderBy: { createdAt: "desc" } },
          },
        },
        sessions: {
          include: { attendances: true },
        },
      },
    });

    return NextResponse.json({
      classes: classes.map((c) => {
        const isMonthly = (c.type || "MONTHLY") === "MONTHLY";
        const allAtt = c.sessions.flatMap((s) => s.attendances);

        const owing = c.enrollments.filter((e) => {
          const totalNeed = e.tuitionCycles.reduce(
            (sum, cy) => sum + Math.max(0, cy.totalAmount - cy.discountAmount),
            0
          );
          const totalPaid = e.tuitionCycles.reduce(
            (sum, cy) => sum + cy.paidAmount,
            0
          );
          const debt = Math.max(0, totalNeed - totalPaid);
          if (debt > 0) return true;

          if (isMonthly) {
            const paidSessions = e.tuitionCycles
              .filter((cy) => cy.paidAmount > 0)
              .reduce((sum, cy) => sum + cy.expectedSessions, 0);
            const usedSessions = allAtt.filter(
              (a) =>
                a.studentId === e.studentId &&
                ["PRESENT", "LATE", "ABSENT"].includes(a.status)
            ).length;
            if (paidSessions === 0 || usedSessions >= paidSessions) return true;
          }
          return false;
        }).length;

        return {
          id: c.id,
          name: c.name,
          type: c.type || "MONTHLY",
          scheduleText: c.scheduleText,
          monthlyTuition: c.monthlyTuition,
          sessionsPerMonth: c.sessionsPerMonth || 8,
          pricePerSession: c.pricePerSession || Math.round(c.monthlyTuition / 8),
          studentCount: c.enrollments.length,
          owingCount: owing,
        };
      }),
    });
  } catch (err: any) {
    console.error("GET /api/classes error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi tải danh sách lớp học." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Vui lòng nhập tên lớp." },
        { status: 400 }
      );
    }
    const type = body.type === "COURSE" ? "COURSE" : "MONTHLY";
    const monthlyTuition = Math.max(
      0,
      Number(body.monthlyTuition) || (type === "MONTHLY" ? 1000000 : 6000000)
    );
    const sessionsPerMonth = type === "MONTHLY" ? 8 : 36;
    const pricePerSession =
      Number(body.pricePerSession) ||
      (type === "MONTHLY" ? Math.round(monthlyTuition / 8) : 0);

    let owner = await prisma.user.findFirst({
      where: { role: { in: ["ADMIN", "TEACHER"] } },
    });
    if (!owner) {
      owner = await prisma.user.create({
        data: {
          email: "admin@danielts.vn",
          name: "Admin DanielTS",
          role: "ADMIN",
          passwordHash: "123456",
        },
      });
    }

    const created = await prisma.classRoom.create({
      data: {
        code: `LOP-${Date.now().toString(36).toUpperCase()}`,
        name,
        level: type === "COURSE" ? "IELTS" : "General",
        type,
        scheduleText: String(body.scheduleText || "").trim(),
        sessionsPerMonth,
        monthlyTuition,
        pricePerSession,
        teacherId: owner.id,
      },
    });
    return NextResponse.json({ class: created });
  } catch (err: any) {
    console.error("POST /api/classes error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi lưu lớp học." },
      { status: 500 }
    );
  }
}
