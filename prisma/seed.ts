import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding DanielTS Attendance & Tuition database...");

  // Clean existing records
  await prisma.tuitionIssue.deleteMany();
  await prisma.tuitionCycle.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.classSession.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.classRoom.deleteMany();
  await prisma.user.deleteMany();

  // 1. Create Users (Admin, Teachers, Students)
  const admin = await prisma.user.create({
    data: {
      email: "admin@danielts.vn",
      phone: "0901000111",
      name: "Dan Nguyễn (Admin & Quản lý Học vụ)",
      role: "ADMIN",
      passwordHash: "123456",
    },
  });

  const teacher1 = await prisma.user.create({
    data: {
      email: "teacher@danielts.vn",
      phone: "0902000222",
      name: "Cô Minh Anh (IELTS 8.0)",
      role: "TEACHER",
      passwordHash: "123456",
    },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: "nam.teacher@danielts.vn",
      phone: "0903000333",
      name: "Thầy Hoàng Nam (IELTS 8.5)",
      role: "TEACHER",
      passwordHash: "123456",
    },
  });

  const studentsData = [
    {
      email: "khoi.nm@danielts.vn",
      phone: "0912345001",
      studentCode: "DAN-001",
      name: "Nguyễn Minh Khôi",
      joinDate: new Date("2026-11-01T00:00:00.000Z"),
      billingMode: "ROLLING_MONTH",
      cycleName: "Chu kỳ 01/11 - 30/11/2026",
      periodStart: new Date("2026-11-01T00:00:00.000Z"),
      periodEnd: new Date("2026-11-30T00:00:00.000Z"),
      dueDate: new Date("2026-11-05T00:00:00.000Z"),
      expectedSessions: 12,
      totalAmount: 2400000,
      discountAmount: 0,
      paidAmount: 2400000,
      status: "PAID",
      paymentMethod: "TRANSFER",
      note: "Đóng đủ đầu kỳ qua Vietcombank",
    },
    {
      email: "ngoc.tb@danielts.vn",
      phone: "0912345002",
      studentCode: "DAN-002",
      name: "Trần Bảo Ngọc",
      joinDate: new Date("2026-10-12T00:00:00.000Z"),
      billingMode: "ROLLING_MONTH",
      cycleName: "Chu kỳ 12/11 - 11/12/2026 (Vào học 12/10)",
      periodStart: new Date("2026-11-12T00:00:00.000Z"),
      periodEnd: new Date("2026-12-11T00:00:00.000Z"),
      dueDate: new Date("2026-11-15T00:00:00.000Z"),
      expectedSessions: 12,
      totalAmount: 2400000,
      discountAmount: 0,
      paidAmount: 1000000,
      status: "PARTIAL",
      paymentMethod: "TRANSFER",
      note: "Mới đóng cọc 1.000.000đ, xin đóng nốt 1.400.000đ ngày 20/11",
    },
    {
      email: "phuc.lh@danielts.vn",
      phone: "0912345003",
      studentCode: "DAN-003",
      name: "Lê Hoàng Phúc",
      joinDate: new Date("2026-10-19T00:00:00.000Z"),
      billingMode: "PRORATED_CALENDAR",
      cycleName: "Tháng 11/2026 (Nhập học giữa tháng 19/10)",
      periodStart: new Date("2026-11-01T00:00:00.000Z"),
      periodEnd: new Date("2026-11-30T00:00:00.000Z"),
      dueDate: new Date("2026-11-05T00:00:00.000Z"),
      expectedSessions: 12,
      totalAmount: 2400000,
      discountAmount: 0,
      paidAmount: 0,
      status: "OVERDUE",
      paymentMethod: null,
      note: "Đã quá hạn đóng phí 7 ngày, cần nhắc phụ huynh gấp",
    },
    {
      email: "han.pg@danielts.vn",
      phone: "0912345004",
      studentCode: "DAN-004",
      name: "Phạm Gia Hân",
      joinDate: new Date("2026-11-05T00:00:00.000Z"),
      billingMode: "ROLLING_MONTH",
      cycleName: "Chu kỳ 05/11 - 04/12/2026 (Vào ngày 05/11)",
      periodStart: new Date("2026-11-05T00:00:00.000Z"),
      periodEnd: new Date("2026-12-04T00:00:00.000Z"),
      dueDate: new Date("2026-11-12T00:00:00.000Z"),
      expectedSessions: 12,
      totalAmount: 2400000,
      discountAmount: 0,
      paidAmount: 0,
      status: "DEFERRED",
      paymentMethod: null,
      note: "PH báo đã chuyển khoản nhưng cần đối soát lại",
    },
    {
      email: "anh.vd@danielts.vn",
      phone: "0912345005",
      studentCode: "DAN-005",
      name: "Vũ Đức Anh",
      joinDate: new Date("2026-09-25T00:00:00.000Z"),
      billingMode: "ROLLING_MONTH",
      cycleName: "Chu kỳ 25/10 - 24/11/2026",
      periodStart: new Date("2026-10-25T00:00:00.000Z"),
      periodEnd: new Date("2026-11-24T00:00:00.000Z"),
      dueDate: new Date("2026-10-30T00:00:00.000Z"),
      expectedSessions: 12,
      totalAmount: 2400000,
      discountAmount: 400000,
      paidAmount: 2000000,
      status: "PAID",
      paymentMethod: "CASH",
      note: "Được trừ 2 buổi nghỉ có phép kỳ trước (400.000đ)",
    },
    {
      email: "tien.dt@danielts.vn",
      phone: "0912345006",
      studentCode: "DAN-006",
      name: "Đặng Thùy Tiên",
      joinDate: new Date("2026-11-10T00:00:00.000Z"),
      billingMode: "PRORATED_CALENDAR",
      cycleName: "Tháng 11/2026 - Tính lẻ từ ngày 10/11 (9 buổi)",
      periodStart: new Date("2026-11-10T00:00:00.000Z"),
      periodEnd: new Date("2026-11-30T00:00:00.000Z"),
      dueDate: new Date("2026-11-14T00:00:00.000Z"),
      expectedSessions: 9,
      totalAmount: 1800000,
      discountAmount: 0,
      paidAmount: 0,
      status: "UNPAID",
      paymentMethod: null,
      note: "Học viên mới vào ngày 10/11, tính lẻ 9 buổi tháng 11",
    },
  ];

  // 2. Create Classes
  const class65A = await prisma.classRoom.create({
    data: {
      code: "DAN-IELTS-65A",
      name: "IELTS Intensive 6.5+ (Tối 2-4-6)",
      level: "IELTS 6.5+",
      scheduleText: "Thứ 2 - Thứ 4 - Thứ 6 (18:00 - 19:30)",
      sessionsPerMonth: 12,
      monthlyTuition: 2400000,
      pricePerSession: 200000,
      room: "Phòng 201 - Cơ sở DanielTS",
      teacherId: teacher1.id,
    },
  });

  const classFound01 = await prisma.classRoom.create({
    data: {
      code: "DAN-FOUND-01",
      name: "IELTS Foundation 4.5 - 5.5 (Tối 3-5-7)",
      level: "Foundation",
      scheduleText: "Thứ 3 - Thứ 5 - Thứ 7 (19:30 - 21:00)",
      sessionsPerMonth: 12,
      monthlyTuition: 2100000,
      pricePerSession: 175000,
      room: "Phòng 102 - Cơ sở DanielTS",
      teacherId: teacher1.id,
    },
  });

  await prisma.classRoom.create({
    data: {
      code: "DAN-SPEAK-02",
      name: "Speaking & Writing Masterclass (Cuối tuần)",
      level: "IELTS 7.0+",
      scheduleText: "Thứ 7 - Chủ Nhật (09:00 - 11:00)",
      sessionsPerMonth: 8,
      monthlyTuition: 2000000,
      pricePerSession: 250000,
      room: "Phòng VIP 301 / Zoom Hybrid",
      teacherId: teacher2.id,
    },
  });

  // 3. Create Sessions for DAN-IELTS-65A
  const session1 = await prisma.classSession.create({
    data: {
      classId: class65A.id,
      sessionDate: new Date("2026-11-06T18:00:00.000Z"),
      title: "Buổi 10: Reading Matching Headings & Cam 18 Test 1",
      topic: "Kỹ thuật đọc lướt Skimming & phân tích bẫy Paraphrase",
      teacherNote: "Lớp làm bài tốt, Hoàng Phúc đi muộn 10 phút.",
      isCompleted: true,
    },
  });

  const session2 = await prisma.classSession.create({
    data: {
      classId: class65A.id,
      sessionDate: new Date("2026-11-09T18:00:00.000Z"),
      title: "Buổi 11: Writing Task 2 - Opinion & Discussion Essays",
      topic: "Cách lập dàn ý 4 đoạn và phát triển luận điểm Band 7.0",
      teacherNote: "Gia Hân xin nghỉ có phép vì ốm.",
      isCompleted: true,
    },
  });

  const session3 = await prisma.classSession.create({
    data: {
      classId: class65A.id,
      sessionDate: new Date("2026-11-12T18:00:00.000Z"),
      title: "Buổi 12: Listening Section 3-4 & Speaking Part 2 Cue Cards",
      topic: "Luyện phản xạ Speaking Part 2 + Kiểm tra từ vựng",
      teacherNote: "Buổi học hôm nay — kiểm tra điểm danh và nhắc học phí giữa kỳ.",
      isCompleted: false,
    },
  });

  // Also create 1 session for Foundation class
  await prisma.classSession.create({
    data: {
      classId: classFound01.id,
      sessionDate: new Date("2026-11-12T19:30:00.000Z"),
      title: "Buổi 5: Grammar for IELTS & Listening Map Labelling",
      topic: "Mệnh đề quan hệ & Từ chỉ phương hướng trong Listening",
      isCompleted: false,
    },
  });

  // 4. Create Students, Enrollments, TuitionCycles, Attendance, and Issues
  for (let i = 0; i < studentsData.length; i++) {
    const item = studentsData[i];
    const student = await prisma.user.create({
      data: {
        email: item.email,
        phone: item.phone,
        studentCode: item.studentCode,
        name: item.name,
        role: "STUDENT_PARENT",
        passwordHash: "123456",
      },
    });

    const enrollment = await prisma.enrollment.create({
      data: {
        classId: class65A.id,
        studentId: student.id,
        joinDate: item.joinDate,
        billingMode: item.billingMode,
        customMonthlyFee: null,
        status: "ACTIVE",
        note: `Nhập học ngày ${item.joinDate.toLocaleDateString("vi-VN")}`,
      },
    });

    const cycle = await prisma.tuitionCycle.create({
      data: {
        enrollmentId: enrollment.id,
        cycleName: item.cycleName,
        periodStart: item.periodStart,
        periodEnd: item.periodEnd,
        dueDate: item.dueDate,
        expectedSessions: item.expectedSessions,
        totalAmount: item.totalAmount,
        discountAmount: item.discountAmount,
        paidAmount: item.paidAmount,
        status: item.status,
        paymentMethod: item.paymentMethod,
        paidAt: item.paidAmount > 0 ? new Date("2026-11-03T10:00:00.000Z") : null,
        note: item.note,
      },
    });

    // Attendance for Session 1, 2, 3
    await prisma.attendanceRecord.createMany({
      data: [
        {
          sessionId: session1.id,
          studentId: student.id,
          status: i === 2 ? "LATE" : "PRESENT",
          homeworkDone: i !== 2,
          note: i === 2 ? "Đi muộn 10 phút" : "Đầy đủ",
          markedById: teacher1.id,
        },
        {
          sessionId: session2.id,
          studentId: student.id,
          status: i === 3 ? "EXCUSED" : i === 2 ? "ABSENT" : "PRESENT",
          homeworkDone: i !== 2,
          note: i === 3 ? "Phụ huynh xin phép nghỉ ốm" : i === 2 ? "Vắng không phép" : "",
          markedById: teacher1.id,
        },
        {
          sessionId: session3.id,
          studentId: student.id,
          status: i === 2 ? "LATE" : "PRESENT",
          homeworkDone: true,
          note: i === 1 ? "Em báo phụ huynh xin đóng nốt học phí ngày 20/11" : "",
          markedById: teacher1.id,
        },
      ],
    });

    // Seed realistic Tuition Issues
    if (item.studentCode === "DAN-002") {
      await prisma.tuitionIssue.create({
        data: {
          studentId: student.id,
          classId: class65A.id,
          tuitionCycleId: cycle.id,
          reportedById: teacher1.id,
          category: "INSTALLMENT_REQUEST",
          priority: "MEDIUM",
          status: "IN_PROGRESS",
          title: "Xin đóng học phí làm 2 đợt (đã đóng 1.000.000đ)",
          description:
            "Học viên Trần Bảo Ngọc vào học từ ngày 12/10, chu kỳ mới bắt đầu từ 12/11. Phụ huynh đã chuyển trước 1.000.000đ và xin khất 1.400.000đ còn lại đến ngày 20/11.",
          promisedPaymentDate: new Date("2026-11-20T00:00:00.000Z"),
          resolutionNote: "Kế toán đã xác nhận nhận 1tr đợt 1, hẹn nhắc tự động ngày 19/11.",
        },
      });
    }

    if (item.studentCode === "DAN-003") {
      await prisma.tuitionIssue.create({
        data: {
          studentId: student.id,
          classId: class65A.id,
          tuitionCycleId: cycle.id,
          reportedById: teacher1.id,
          category: "LATE_PAYMENT",
          priority: "URGENT",
          status: "OPEN",
          title: "Quá hạn học phí tháng 11 & vắng/muộn nhiều buổi",
          description:
            "Em Lê Hoàng Phúc vào học từ 19/10. Kỳ học phí tháng 11 đã quá hạn 7 ngày (2.400.000đ). Giáo viên đã nhắc tại lớp buổi 11 và 12 nhưng em báo bố mẹ chưa chuyển.",
          promisedPaymentDate: new Date("2026-11-15T00:00:00.000Z"),
        },
      });
    }

    if (item.studentCode === "DAN-004") {
      await prisma.tuitionIssue.create({
        data: {
          studentId: student.id,
          classId: class65A.id,
          tuitionCycleId: cycle.id,
          reportedById: teacher1.id,
          category: "TRANSFER_UNCONFIRMED",
          priority: "HIGH",
          status: "OPEN",
          title: "Phụ huynh báo đã chuyển khoản nhưng chưa nổi tiền (Vào học 05/11)",
          description:
            "Gia Hân bắt đầu học ngày 05/11 (chu kỳ 05/11 - 04/12). Trong buổi điểm danh hôm nay em báo mẹ đã chuyển khoản 2.400.000đ tối qua nhưng bị sai nội dung chuyển khoản, nhờ Admin kiểm tra sao kê.",
          promisedPaymentDate: new Date("2026-11-13T00:00:00.000Z"),
        },
      });
    }

    if (item.studentCode === "DAN-006") {
      await prisma.tuitionIssue.create({
        data: {
          studentId: student.id,
          classId: class65A.id,
          tuitionCycleId: cycle.id,
          reportedById: admin.id,
          category: "MID_MONTH_JOIN",
          priority: "MEDIUM",
          status: "OPEN",
          title: "Học viên mới vào giữa tháng (10/11) - Chốt học phí lẻ 9 buổi",
          description:
            "Đặng Thùy Tiên đăng ký vào học từ ngày 10/11/2026. Tính từ 10/11 đến hết 30/11 có 9 buổi học (9 x 200.000đ = 1.800.000đ). Đã gửi thông báo học phí cho phụ huynh.",
          promisedPaymentDate: new Date("2026-11-14T00:00:00.000Z"),
        },
      });
    }
  }

  console.log("✅ Seeded DanielTS database successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
