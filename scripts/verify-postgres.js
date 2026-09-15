const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function count() {
  console.log("=== PostgreSQL Database Record Counts ===");
  console.log("Schools:", await prisma.school.count());
  console.log("Users:", await prisma.user.count());
  console.log("AdminProfiles:", await prisma.adminProfile.count());
  console.log("PrincipalProfiles:", await prisma.principalProfile.count());
  console.log("TeacherProfiles:", await prisma.teacherProfile.count());
  console.log("StudentProfiles:", await prisma.studentProfile.count());
  console.log("ParentProfiles:", await prisma.parentProfile.count());
  console.log("Classes:", await prisma.class.count());
  console.log("TeacherClasses:", await prisma.teacherClass.count());
  console.log("Attendances:", await prisma.attendance.count());
  console.log("Homeworks:", await prisma.homework.count());
  console.log("Announcements:", await prisma.announcement.count());
  console.log("Notifications:", await prisma.notification.count());
  console.log("Exams:", await prisma.exam.count());
  console.log("ExamMarks:", await prisma.examMark.count());
  console.log("ReadReceipts:", await prisma.readReceipt.count());
  console.log("PushTokens:", await prisma.pushToken.count());
}

count()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
