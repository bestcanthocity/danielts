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

// Lấy trạng thái điểm danh của lớp theo ngày (kèm BTVN, nhận xét, chủ đề bài học)
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
  const homeworkRecords: Record<string, boolean> = {};
  const noteRecords: Record<string, string> = {};

  session?.attendances.forEach((a) => {
    records[a.studentId] = a.status;
    homeworkRecords[a.studentId] = a.homeworkDone ?? true;
    if (a.note) noteRecords[a.studentId] = a.note;
  });

  return NextResponse.json({
    saved: session ? (session.attendances.length > 0 || session.isCompleted) : false,
    records,
    homeworkRecords,
    noteRecords,
    topic: session?.topic || "",
    teacherNote: session?.teacherNote || "",
    title: session?.title || "",
  });
}

// Lưu điểm danh cả lớp theo ngày (hỗ trợ BTVN, nhận xét từng học viên, chủ đề buổi học)
export async function POST(req: NextRequest, { params }: Ctx) {
  const body = await req.json();
  const date = body.date as string;
  const records = body.records as Record<string, string>;
  const homeworkRecords = (body.homeworkRecords || {}) as Record<string, boolean>;
  const noteRecords = (body.noteRecords || {}) as Record<string, string>;
  const topic = typeof body.topic === "string" ? body.topic.trim() : undefined;
  const teacherNote = typeof body.teacherNote === "string" ? body.teacherNote.trim() : undefined;

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
          topic: topic ?? null,
          teacherNote: teacherNote ?? null,
          isCompleted: true,
        },
      });
    } else {
      await tx.classSession.update({
        where: { id: session.id },
        data: {
          isCompleted: true,
          ...(topic !== undefined ? { topic } : {}),
          ...(teacherNote !== undefined ? { teacherNote } : {}),
        },
      });
    }

    for (const [studentId, status] of Object.entries(records)) {
      const st = allowed.includes(status) ? status : "PRESENT";
      const hw = homeworkRecords[studentId] ?? true;
      const nt = noteRecords[studentId] ?? null;

      await tx.attendanceRecord.upsert({
        where: { sessionId_studentId: { sessionId: session.id, studentId } },
        update: { status: st, homeworkDone: hw, note: nt },
        create: { sessionId: session.id, studentId, status: st, homeworkDone: hw, note: nt },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
