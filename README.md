# DanielTS Portal (`danielts.nextband.vn`)

Hệ thống độc lập 100% xây dựng bằng **Next.js 14 (App Router) + TypeScript + Prisma ORM + Tailwind CSS** phục vụ:
1. **Điểm danh buổi học theo thời gian thực** (Có mặt, Đi muộn, Nghỉ có phép, Vắng không phép, Kiểm tra BTVN).
2. **Quản lý Học phí Linh hoạt theo Ngày Nhập học bất kỳ** (`ROLLING_MONTH`, `PRORATED_CALENDAR`, `SESSION_PACK`).
3. **Ghi nhận & Xử lý Vấn đề Học phí ngay tại lớp** (Xin đóng trễ/khất phí, vào học giữa tháng tính lẻ buổi, trừ buổi nghỉ có phép, đã chuyển khoản chờ đối soát).
4. **Phân quyền 3 vai trò độc lập (RBAC):**
   - `ADMIN` (Quản trị viên / Kế toán): Toàn quyền quản lý lớp, đăng ký học viên mới linh hoạt ngày bắt đầu, duyệt thu học phí, xử lý các vấn đề học phí.
   - `TEACHER` (Giáo viên / Trợ giảng): Điểm danh buổi học, đối chiếu tình trạng học phí trên bảng điểm danh và bấm báo cáo vấn đề học phí phát sinh tại lớp.
   - `STUDENT_PARENT` (Học viên / Phụ huynh): Tra cứu chuyên cần từng buổi, tiến độ buổi học trong chu kỳ học phí và gửi phản hồi học phí.

## Chạy ở môi trường Local

```bash
cd d:\handover\danielts
npm run db:setup
npm run dev
```

Mở trình duyệt tại: `http://localhost:3005`

## Tài khoản mẫu (Mật khẩu: `123456`)
- **Admin / Kế toán:** `admin@danielts.vn`
- **Giáo viên:** `teacher@danielts.vn`
- **Học viên / Phụ huynh:** `DAN-001`, `DAN-002`, `DAN-003`, `DAN-004`, `DAN-006`

<!-- Trigger auto deployment: 2026-11-16T16:10:00Z -->
