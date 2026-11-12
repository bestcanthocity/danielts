export interface ClassTuitionConfig {
  type: "MONTHLY" | "COURSE";
  monthlyTuition: number;      // Mức thu (cho 1 tháng 8 buổi, hoặc trọn khóa)
  pricePerSession?: number;    // Đơn giá 1 buổi (mặc định monthlyTuition / 8)
  sessionsPerMonth?: number;   // Mặc định 8 buổi
}

export interface CalculatedCycle {
  cycleName: string;
  totalAmount: number;
  expectedSessions: number;
  explanation: string;
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
}

/**
 * Tính toán học phí linh hoạt:
 * 1. Thu theo tháng: 8 buổi = 1 tháng.
 *    - Nếu vào giữa/cuối tháng và có số buổi lẻ (extraSessions > 0):
 *      Học phí = (số buổi lẻ * giá/buổi) + 8 buổi tháng tiếp theo
 * 2. Thu theo khóa (lớp IELTS):
 *    - Trọn gói cả khóa.
 */
export function calculateStudentTuition(params: {
  classType: "MONTHLY" | "COURSE";
  monthlyTuition: number;
  pricePerSession?: number;
  sessionsPerMonth?: number;
  joinDate: Date;
  extraSessions?: number; // Số buổi lẻ của tháng hiện tại (nếu nhập học cuối tháng)
}): CalculatedCycle {
  const {
    classType,
    monthlyTuition,
    joinDate,
    extraSessions = 0,
  } = params;

  const start = new Date(joinDate);
  start.setHours(0, 0, 0, 0);

  const dueDate = new Date(start);
  dueDate.setDate(dueDate.getDate() + 5);

  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

  if (classType === "COURSE") {
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3); // Giả định khóa học khoảng 3 tháng
    return {
      cycleName: `Trọn khóa IELTS (Bắt đầu ${fmt(start)})`,
      totalAmount: monthlyTuition,
      expectedSessions: 36,
      explanation: `Học phí trọn gói khóa IELTS`,
      periodStart: start,
      periodEnd: end,
      dueDate,
    };
  }

  // Thu theo tháng (chuẩn 8 buổi/tháng)
  const baseSessions = params.sessionsPerMonth || 8;
  const unitPrice =
    params.pricePerSession && params.pricePerSession > 0
      ? params.pricePerSession
      : Math.round(monthlyTuition / baseSessions);

  const end = new Date(start);
  end.setMonth(end.getMonth() + (extraSessions > 0 ? 2 : 1));

  if (extraSessions > 0) {
    const extraAmount = extraSessions * unitPrice;
    const total = extraAmount + monthlyTuition;
    const totalSessions = extraSessions + baseSessions;
    return {
      cycleName: `${extraSessions} buổi lẻ + Tháng tiếp theo (${baseSessions} buổi)`,
      totalAmount: total,
      expectedSessions: totalSessions,
      explanation: `${extraSessions} buổi lẻ (${extraAmount.toLocaleString("vi-VN")}đ) + 1 tháng ${baseSessions} buổi (${monthlyTuition.toLocaleString("vi-VN")}đ)`,
      periodStart: start,
      periodEnd: end,
      dueDate,
    };
  }

  return {
    cycleName: `Tháng 1 (${baseSessions} buổi)`,
    totalAmount: monthlyTuition,
    expectedSessions: baseSessions,
    explanation: `Chu kỳ chuẩn 1 tháng (${baseSessions} buổi)`,
    periodStart: start,
    periodEnd: end,
    dueDate,
  };
}
