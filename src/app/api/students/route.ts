import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT_PARENT" },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      studentCode: true,
      phone: true,
    },
  });

  return NextResponse.json({ students });
}
