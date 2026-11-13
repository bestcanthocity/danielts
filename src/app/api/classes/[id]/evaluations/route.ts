import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

// Lấy danh sách đánh giá định kỳ tháng của học sinh trong lớp (dành cho HS phổ thông)
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const month = new URL(req.url).searchParams.get("month") || new Date().toISOString().slice(0, 7);

    const evaluations = await prisma.studentEvaluation.findMany({
      where: {
        classId: params.id,
        monthYear: month,
      },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            studentCode: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ month, evaluations });
  } catch (err: any) {
    console.error("GET /api/classes/[id]/evaluations error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi tải bảng đánh giá tháng." },
      { status: 500 }
    );
  }
}

// Lưu / Cập nhật đánh giá & phân loại định kỳ tháng cho học sinh phổ thông
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const body = await req.json();
    const enrollmentId = String(body.enrollmentId || "").trim();
    const studentId = String(body.studentId || "").trim();
    const monthYear = String(body.monthYear || new Date().toISOString().slice(0, 7)).trim();

    if (!enrollmentId || !studentId) {
      return NextResponse.json(
        { error: "Thiếu thông tin học viên (enrollmentId, studentId)." },
        { status: 400 }
      );
    }

    const allowedTiers = ["XUAT_SAC", "GIOI", "KHA", "CAN_KEM"];
    const classification = allowedTiers.includes(body.classification)
      ? body.classification
      : "GIOI";

    const testScore = body.testScore !== undefined && body.testScore !== null && body.testScore !== ""
      ? Math.min(10, Math.max(0, Number(body.testScore)))
      : null;

    const grammarScore = body.grammarScore !== undefined && body.grammarScore !== null && body.grammarScore !== ""
      ? Math.min(10, Math.max(0, Number(body.grammarScore)))
      : null;

    const skillsScore = body.skillsScore !== undefined && body.skillsScore !== null && body.skillsScore !== ""
      ? Math.min(10, Math.max(0, Number(body.skillsScore)))
      : null;

    const attitude = body.attitude ? String(body.attitude).trim() : null;
    const homeworkStatus = body.homeworkStatus ? String(body.homeworkStatus).trim() : null;
    const strengths = body.strengths ? String(body.strengths).trim() : null;
    const improvements = body.improvements ? String(body.improvements).trim() : null;
    const teacherComment = body.teacherComment ? String(body.teacherComment).trim() : null;

    const evaluation = await prisma.studentEvaluation.upsert({
      where: {
        enrollmentId_monthYear: {
          enrollmentId,
          monthYear,
        },
      },
      update: {
        classification,
        testScore,
        grammarScore,
        skillsScore,
        attitude,
        homeworkStatus,
        strengths,
        improvements,
        teacherComment,
      },
      create: {
        enrollmentId,
        studentId,
        classId: params.id,
        monthYear,
        classification,
        testScore,
        grammarScore,
        skillsScore,
        attitude,
        homeworkStatus,
        strengths,
        improvements,
        teacherComment,
      },
    });

    return NextResponse.json({ ok: true, evaluation });
  } catch (err: any) {
    console.error("POST /api/classes/[id]/evaluations error:", err);
    return NextResponse.json(
      { error: err.message || "Lỗi lưu đánh giá định kỳ." },
      { status: 500 }
    );
  }
}
