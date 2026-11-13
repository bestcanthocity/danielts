import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  parseScheduleDays,
  generateFixedSessions,
  NUMBER_TO_DAY_NAME,
  NUMBER_TO_SHORT_NAME,
} from "@/lib/schedule";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const sessions = await prisma.classSession.findMany({
      where: { classId: params.id },
      orderBy: { sessionDate: "asc" },
      include: { attendances: true },
    });

    return NextResponse.json({
      sessions: sessions.map((s, idx) => {
        const d = new Date(s.sessionDate);
        const dayOfWeek = d.getUTCDay();
        return {
          id: s.id,
          index: idx + 1,
          title: s.title || `Buổi ${idx + 1}`,
          date: d.toISOString().slice(0, 10),
          dayName: NUMBER_TO_DAY_NAME[dayOfWeek],
          shortDay: NUMBER_TO_SHORT_NAME[dayOfWeek],
          isCompleted: s.isCompleted || s.attendances.length > 0,
          presentCount: s.attendances.filter((a) =>
            ["PRESENT", "LATE"].includes(a.status)
          ).length,
          totalCount: s.attendances.length,
        };
      }),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Lỗi tải danh sách buổi học." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json();
    const action = body.action || "GENERATE_SCHEDULE";

    const cls = await prisma.classRoom.findUnique({
      where: { id: params.id },
      include: {
        sessions: {
          orderBy: { sessionDate: "desc" },
        },
      },
    });

    if (!cls) {
      return NextResponse.json({ error: "Không tìm thấy lớp học." }, { status: 404 });
    }

    if (action === "GENERATE_SCHEDULE") {
      const scheduleDays = Array.isArray(body.scheduleDays) && body.scheduleDays.length > 0
        ? body.scheduleDays.map((d: any) => typeof d === "number" ? d : parseScheduleDays(String(d))[0])
        : parseScheduleDays(cls.scheduleText);

      const startDate = body.startDate || new Date().toISOString().slice(0, 10);
      const count = Number(body.count) || cls.sessionsPerMonth || 8;
      const startTime = body.startTime || "18:00";

      const generated = generateFixedSessions(startDate, scheduleDays, count, startTime);

      const created = await prisma.$transaction(
        generated.map((g) =>
          prisma.classSession.create({
            data: {
              classId: cls.id,
              sessionDate: g.sessionDate,
              title: g.title,
              isCompleted: false,
            },
          })
        )
      );

      return NextResponse.json({ ok: true, createdCount: created.length });
    }

    if (action === "NEXT_CYCLE") {
      // Tiếp tục chu kỳ 8 buổi từ ngày sau buổi cuối cùng hiện tại
      const lastSession = cls.sessions[0]; // ordered desc
      let startDateStr = new Date().toISOString().slice(0, 10);

      if (lastSession) {
        const lastDate = new Date(lastSession.sessionDate);
        lastDate.setUTCDate(lastDate.getUTCDate() + 1);
        startDateStr = lastDate.toISOString().slice(0, 10);
      }

      const scheduleDays = parseScheduleDays(cls.scheduleText);
      const count = cls.sessionsPerMonth || 8;
      const generated = generateFixedSessions(startDateStr, scheduleDays, count);

      const currentTotal = cls.sessions.length;
      const created = await prisma.$transaction(
        generated.map((g, idx) =>
          prisma.classSession.create({
            data: {
              classId: cls.id,
              sessionDate: g.sessionDate,
              title: `Buổi ${currentTotal + idx + 1} (${g.shortDay} ${g.dateStr.slice(8, 10)}/${g.dateStr.slice(5, 7)})`,
              isCompleted: false,
            },
          })
        )
      );

      return NextResponse.json({ ok: true, createdCount: created.length });
    }

    if (action === "ADD_SESSION") {
      const date = String(body.date || "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "Ngày không hợp lệ (YYYY-MM-DD)." }, { status: 400 });
      }
      const title = String(body.title || "").trim() || `Buổi học bù (${date.slice(8, 10)}/${date.slice(5, 7)})`;
      const sessionDate = new Date(`${date}T12:00:00.000Z`);

      const session = await prisma.classSession.create({
        data: {
          classId: cls.id,
          sessionDate,
          title,
          isCompleted: false,
        },
      });

      return NextResponse.json({ ok: true, session });
    }

    return NextResponse.json({ error: "Hành động không hợp lệ." }, { status: 400 });
  } catch (err: any) {
    console.error("POST /api/classes/[id]/sessions error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi cập nhật danh sách buổi học." },
      { status: 500 }
    );
  }
}
