// Tiện ích tính toán lịch học cố định và sinh danh sách buổi học cho DanielTS

export const DAY_NAME_TO_NUMBER: Record<string, number> = {
  "Chủ Nhật": 0,
  "CN": 0,
  "Thứ 2": 1,
  "T2": 1,
  "Thứ 3": 2,
  "T3": 2,
  "Thứ 4": 3,
  "T4": 3,
  "Thứ 5": 4,
  "T5": 4,
  "Thứ 6": 5,
  "T6": 5,
  "Thứ 7": 6,
  "T7": 6,
};

export const NUMBER_TO_DAY_NAME = [
  "Chủ Nhật",
  "Thứ 2",
  "Thứ 3",
  "Thứ 4",
  "Thứ 5",
  "Thứ 6",
  "Thứ 7",
];

export const NUMBER_TO_SHORT_NAME = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/**
 * Trích xuất các ngày trong tuần từ chuỗi lịch học (vd: "Thứ 3, Thứ 5 (18:00 - 19:30)" -> [2, 4])
 */
export function parseScheduleDays(scheduleText: string): number[] {
  if (!scheduleText) return [2, 4];
  const days: number[] = [];
  const lower = scheduleText.toLowerCase();

  if (lower.includes("chủ nhật") || lower.includes("cn")) days.push(0);
  if (lower.includes("thứ 2") || lower.includes("t2")) days.push(1);
  if (lower.includes("thứ 3") || lower.includes("t3")) days.push(2);
  if (lower.includes("thứ 4") || lower.includes("t4")) days.push(3);
  if (lower.includes("thứ 5") || lower.includes("t5")) days.push(4);
  if (lower.includes("thứ 6") || lower.includes("t6")) days.push(5);
  if (lower.includes("thứ 7") || lower.includes("t7")) days.push(6);

  return days.length > 0 ? Array.from(new Set(days)).sort((a, b) => a - b) : [2, 4];
}

export type GeneratedSession = {
  index: number;
  dateStr: string; // YYYY-MM-DD
  sessionDate: Date;
  title: string;
  dayName: string;
  shortDay: string;
};

/**
 * Sinh danh sách các buổi học cố định từ ngày bắt đầu
 */
export function generateFixedSessions(
  startDateStr: string,
  targetDays: number[],
  count: number = 8,
  startTime: string = "18:00"
): GeneratedSession[] {
  const days = targetDays.length > 0 ? targetDays : [2, 4];
  const results: GeneratedSession[] = [];

  const [y, m, d] = (startDateStr || new Date().toISOString().slice(0, 10))
    .split("-")
    .map(Number);
  const cur = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  const [h, min] = (startTime || "18:00").split(":").map(Number);

  let attempts = 0;
  while (results.length < count && attempts < 180) {
    const dayOfWeek = cur.getUTCDay();
    if (days.includes(dayOfWeek)) {
      const yr = cur.getUTCFullYear();
      const mo = String(cur.getUTCMonth() + 1).padStart(2, "0");
      const dy = String(cur.getUTCDate()).padStart(2, "0");
      const dateStr = `${yr}-${mo}-${dy}`;
      const sessionDate = new Date(Date.UTC(yr, cur.getUTCMonth(), cur.getUTCDate(), h || 12, min || 0, 0));

      const index = results.length + 1;
      const dayName = NUMBER_TO_DAY_NAME[dayOfWeek];
      const shortDay = NUMBER_TO_SHORT_NAME[dayOfWeek];
      const title = `Buổi ${index} (${shortDay} ${dy}/${mo})`;

      results.push({
        index,
        dateStr,
        sessionDate,
        title,
        dayName,
        shortDay,
      });
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
    attempts++;
  }

  return results;
}
