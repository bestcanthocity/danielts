import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body.pin || "").trim();

    // Mã PIN được cấu hình trong biến môi trường ADMIN_PIN, mặc định là 8888
    const expectedPin = (process.env.ADMIN_PIN || "8888").trim();

    if (!pin) {
      return NextResponse.json(
        { error: "Vui lòng nhập mã PIN Quản trị." },
        { status: 400 }
      );
    }

    if (pin !== expectedPin) {
      return NextResponse.json(
        { error: "Mã PIN Quản trị không chính xác. Vui lòng thử lại." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      role: "ADMIN",
      message: "Xác thực quyền Quản trị viên thành công.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Lỗi kiểm tra mã PIN." },
      { status: 500 }
    );
  }
}
