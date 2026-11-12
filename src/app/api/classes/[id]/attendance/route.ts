import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

function dayRange(date: string) {
  return {
    start: new Date(`${date}T00:00:00.000Z`),
    end: new Date(`${date}T23:59:59.999Z`),
  };
}

function validDate(date: string | null): date is string {
  return !!date && /^\d{4}-\d{2}-\d{2}$/.test(date);
}

// Lấy trạng thái điểm danh của lớp theo ngày
export async function GET(req: NextRequest, { params }: Ctx) {
  const date = new URL(req.url).searchParams.get("date");
  if (!validDate(date)) {
    return NextResponse.json({ error: "Ngày không hợp lệ." }, { status: 400 });
  }
  const { start, end } = dayRange(date);
  const session = await prisma.classSession.findFirst({
    where: { classId: params.id, sessionDate: { gte: start, lte: end } },
    include: { attendances: true },
  });
  const records: Record<string, string> = {};
  session?.attendances.forEach((a) => (records[a.studentId] = a.status));
  return NextResponse.json({ saved: !!session, records });
}

// Lưu điểm danh cả lớp theo ngày
export async function POST(req: NextRequest, { params }: Ctx) {
  const body = await req.json();
  const date = body.date as string;
  const records = body.records as Record<string, string>;
  if (!validDate(date) || !records) {
    return NextResponse.json({ error: "Dữ liệu điểm danh không hợp lệ." }, { status: 400 });
  }
  const allowed = ["PRESENT", "LATE", "EXCUSED", "ABSENT"];
  const { start, end } = dayRange(date);
  const [y, m, d] = date.split("-");

  await prisma.$transaction(async (tx) => {
    let session = await tx.classSession.findFirst({
      where: { classId: params.id, sessionDate: { gte: start, lte: end } },
    });
    if (!session) {
      session = await tx.classSession.create({
        data: {
          classId: params.id,
          sessionDate: new Date(`${date}T12:00:00.000Z`),
          title: `Buổi học ${d}/${m}/${y}`,
          isCompleted: true,
        },
      });
    }
    for (const [studentId, status] of Object.entries(records)) {
      const st = allowed.includes(status) ? status : "PRESENT";
      await tx.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: session.id, studentId } },
        update: { status: st },
        create: { sessionId: session.id, studentId, status: st },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
