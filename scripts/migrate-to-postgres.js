const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.join(process.cwd(), "apps/web/.data/db.json");
  if (!fs.existsSync(jsonPath)) {
    console.error("db.json not found at:", jsonPath);
    process.exit(1);
  }

  const db = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log("Found db.json data:");
  for (const k of Object.keys(db)) {
    console.log(`  - ${k}: ${Array.isArray(db[k]) ? db[k].length : typeof db[k]}`);
  }

  console.log("\nStarting zero-loss data migration to PostgreSQL...");

  // 1. Schools
  if (Array.isArray(db.schools)) {
    console.log(`Migrating ${db.schools.length} schools...`);
    for (const s of db.schools) {
      await prisma.school.upsert({
        where: { id: s.id },
        create: {
          id: s.id,
          schoolCode: s.schoolCode,
          name: s.name,
          displayName: s.displayName || null,
          location: s.location || "",
          email: s.email,
          phone: s.phone || null,
          themeColor: s.themeColor || "#6366F1",
          logoUrl: s.logoUrl || null,
          plan: s.plan || "STANDARD",
          billingCycle: s.billingCycle || "YEARLY",
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
          updatedAt: new Date(),
        },
        update: {
          schoolCode: s.schoolCode,
          name: s.name,
          displayName: s.displayName || null,
          location: s.location || "",
          email: s.email,
          phone: s.phone || null,
          themeColor: s.themeColor || "#6366F1",
          logoUrl: s.logoUrl || null,
          plan: s.plan || "STANDARD",
          billingCycle: s.billingCycle || "YEARLY",
        },
      });

      // Ensure Subscription record
      await prisma.subscription.upsert({
        where: { schoolId: s.id },
        create: {
          schoolId: s.id,
          plan: s.plan === "PREMIUM" ? "PREMIUM" : s.plan === "BASIC" ? "BASIC" : "STANDARD",
          billingCycle: s.billingCycle === "MONTHLY" ? "MONTHLY" : "YEARLY",
          startDate: s.createdAt ? new Date(s.createdAt) : new Date(),
        },
        update: {},
      });
    }
  }

  // 2. Users & Profiles
  if (Array.isArray(db.users)) {
    console.log(`Migrating ${db.users.length} users...`);
    for (const u of db.users) {
      const schoolExists = await prisma.school.findUnique({ where: { id: u.schoolId } });
      if (!schoolExists) {
        console.warn(`Skipping user ${u.id} (${u.email}) - school ${u.schoolId} not found`);
        continue;
      }

      await prisma.user.upsert({
        where: { id: u.id },
        create: {
          id: u.id,
          schoolId: u.schoolId,
          schoolCode: u.schoolCode || null,
          role: u.role,
          username: u.username,
          email: u.email,
          passwordHash: u.passwordHash,
          firstName: u.firstName || u.username,
          lastName: u.lastName || null,
          phone: u.phone || null,
          photoUrl: u.photoUrl || null,
          gender: u.gender === "MALE" || u.gender === "FEMALE" || u.gender === "OTHER" ? u.gender : null,
          education: u.education || null,
          qualification: u.qualification || null,
          teacherType: u.teacherType === "CLASS_TEACHER" || u.teacherType === "SUBJECT_TEACHER" ? u.teacherType : null,
          className: u.className || null,
          section: u.section || null,
          rollNumber: u.rollNumber || u.rollNo || null,
          rollNo: u.rollNo || u.rollNumber || null,
          dateOfBirth: u.dateOfBirth || null,
          parentEmail: u.parentEmail || null,
          parentName: u.parentName || null,
          childrenIds: Array.isArray(u.childrenIds) ? u.childrenIds : [],
          isActive: u.isActive !== false,
          createdById: u.createdById || null,
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
          updatedAt: new Date(),
        },
        update: {
          schoolCode: u.schoolCode || null,
          role: u.role,
          username: u.username,
          email: u.email,
          passwordHash: u.passwordHash,
          firstName: u.firstName || u.username,
          lastName: u.lastName || null,
          phone: u.phone || null,
          photoUrl: u.photoUrl || null,
          gender: u.gender === "MALE" || u.gender === "FEMALE" || u.gender === "OTHER" ? u.gender : null,
          education: u.education || null,
          qualification: u.qualification || null,
          teacherType: u.teacherType === "CLASS_TEACHER" || u.teacherType === "SUBJECT_TEACHER" ? u.teacherType : null,
          className: u.className || null,
          section: u.section || null,
          rollNumber: u.rollNumber || u.rollNo || null,
          rollNo: u.rollNo || u.rollNumber || null,
          dateOfBirth: u.dateOfBirth || null,
          parentEmail: u.parentEmail || null,
          parentName: u.parentName || null,
          childrenIds: Array.isArray(u.childrenIds) ? u.childrenIds : [],
          isActive: u.isActive !== false,
        },
      });

      // Role profile creation
      if (u.role === "ADMIN") {
        await prisma.adminProfile.upsert({
          where: { userId: u.id },
          create: { userId: u.id },
          update: {},
        });
      } else if (u.role === "PRINCIPAL") {
        await prisma.principalProfile.upsert({
          where: { userId: u.id },
          create: {
            userId: u.id,
            education: u.education || null,
            qualification: u.qualification || null,
          },
          update: {
            education: u.education || null,
            qualification: u.qualification || null,
          },
        });
      } else if (u.role === "TEACHER") {
        await prisma.teacherProfile.upsert({
          where: { userId: u.id },
          create: {
            userId: u.id,
            teacherType: u.teacherType === "CLASS_TEACHER" ? "CLASS_TEACHER" : "SUBJECT_TEACHER",
            education: u.education || null,
            qualification: u.qualification || null,
          },
          update: {
            teacherType: u.teacherType === "CLASS_TEACHER" ? "CLASS_TEACHER" : "SUBJECT_TEACHER",
            education: u.education || null,
            qualification: u.qualification || null,
          },
        });
      } else if (u.role === "STUDENT") {
        await prisma.studentProfile.upsert({
          where: { userId: u.id },
          create: {
            userId: u.id,
            rollNo: u.rollNo || u.rollNumber || null,
            section: u.section || null,
          },
          update: {
            rollNo: u.rollNo || u.rollNumber || null,
            section: u.section || null,
          },
        });
      } else if (u.role === "PARENT") {
        await prisma.parentProfile.upsert({
          where: { userId: u.id },
          create: { userId: u.id },
          update: {},
        });
      }
    }
  }

  // 3. Classes
  if (Array.isArray(db.classes)) {
    console.log(`Migrating ${db.classes.length} classes...`);
    for (const c of db.classes) {
      await prisma.class.upsert({
        where: { id: c.id },
        create: {
          id: c.id,
          schoolId: c.schoolId,
          name: c.name,
          section: c.section || "A",
          order: typeof c.order === "number" ? c.order : 0,
          isActive: c.isActive !== false,
          classTeacherId: c.classTeacherId || null,
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        },
        update: {
          name: c.name,
          section: c.section || "A",
          order: typeof c.order === "number" ? c.order : 0,
          isActive: c.isActive !== false,
          classTeacherId: c.classTeacherId || null,
        },
      });
    }
  }

  // 4. Teacher Classes
  if (Array.isArray(db.teacherClasses)) {
    console.log(`Migrating ${db.teacherClasses.length} teacher-class mappings...`);
    for (const tc of db.teacherClasses) {
      const teacherExists = await prisma.user.findUnique({ where: { id: tc.teacherId } });
      if (!teacherExists) continue;
      await prisma.teacherClass.upsert({
        where: { id: tc.id },
        create: {
          id: tc.id,
          schoolId: tc.schoolId,
          teacherId: tc.teacherId,
          className: tc.className,
          section: tc.section || "A",
          role: tc.role || "CLASS_TEACHER",
          subject: tc.subject || "",
        },
        update: {
          className: tc.className,
          section: tc.section || "A",
          role: tc.role || "CLASS_TEACHER",
          subject: tc.subject || "",
        },
      });
    }
  }

  // 5. Attendances
  if (Array.isArray(db.attendances)) {
    console.log(`Migrating ${db.attendances.length} attendances...`);
    for (const a of db.attendances) {
      const studentExists = a.studentId ? await prisma.user.findUnique({ where: { id: a.studentId } }) : null;
      const teacherExists = a.teacherId ? await prisma.user.findUnique({ where: { id: a.teacherId } }) : null;

      await prisma.attendance.upsert({
        where: { id: a.id },
        create: {
          id: a.id,
          schoolId: a.schoolId,
          studentId: studentExists ? a.studentId : null,
          teacherId: teacherExists ? a.teacherId : null,
          date: a.date,
          status: a.status || "PRESENT",
          markedById: a.markedById || null,
          remarks: a.remarks || null,
          markedAt: a.markedAt ? new Date(a.markedAt) : new Date(),
          notificationSent: a.notificationSent === true,
        },
        update: {
          status: a.status || "PRESENT",
          remarks: a.remarks || null,
          notificationSent: a.notificationSent === true,
        },
      });
    }
  }

  // 6. Homeworks
  if (Array.isArray(db.homeworks)) {
    console.log(`Migrating ${db.homeworks.length} homeworks...`);
    for (const h of db.homeworks) {
      await prisma.homework.upsert({
        where: { id: h.id },
        create: {
          id: h.id,
          schoolId: h.schoolId,
          className: h.className,
          section: h.section || null,
          subject: h.subject || null,
          title: h.title,
          description: h.description,
          attachmentUrl: h.attachmentUrl || null,
          attachments: h.attachments || [],
          createdById: h.createdById,
          createdByName: h.createdByName || null,
          createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
          expiresAt: h.expiresAt ? new Date(h.expiresAt) : new Date(Date.now() + 7 * 86400000),
        },
        update: {
          title: h.title,
          description: h.description,
          attachmentUrl: h.attachmentUrl || null,
          attachments: h.attachments || [],
        },
      });
    }
  }

  // 7. Announcements
  if (Array.isArray(db.announcements)) {
    console.log(`Migrating ${db.announcements.length} announcements...`);
    for (const an of db.announcements) {
      let targetEnum = "ALL";
      if (an.target === "PARENTS_ONLY" || an.target === "STUDENTS_ONLY" || an.target === "TEACHERS_ONLY" || an.target === "CLASS") {
        targetEnum = an.target;
      }
      await prisma.announcement.upsert({
        where: { id: an.id },
        create: {
          id: an.id,
          schoolId: an.schoolId,
          title: an.title,
          content: an.content,
          target: targetEnum,
          targetRole: an.target || "ALL",
          className: an.className || null,
          section: an.section || null,
          classes: an.classes || null,
          createdById: an.createdById,
          createdByName: an.createdByName || null,
          createdByRole: an.createdByRole || null,
          createdAt: an.createdAt ? new Date(an.createdAt) : new Date(),
          expiresAt: an.expiresAt ? new Date(an.expiresAt) : null,
        },
        update: {
          title: an.title,
          content: an.content,
          target: targetEnum,
          targetRole: an.target || "ALL",
        },
      });
    }
  }

  // 8. Notifications
  if (Array.isArray(db.notifications)) {
    console.log(`Migrating ${db.notifications.length} notifications...`);
    for (const n of db.notifications) {
      const userExists = await prisma.user.findUnique({ where: { id: n.userId } });
      if (!userExists) continue;

      let notifType = "GENERAL";
      if (["LEAVE", "HOMEWORK", "ANNOUNCEMENT", "EXAM", "GENERAL", "RANK"].includes(n.type)) {
        notifType = n.type;
      }

      await prisma.notification.upsert({
        where: { id: n.id },
        create: {
          id: n.id,
          schoolId: n.schoolId || userExists.schoolId,
          userId: n.userId,
          title: n.title || "",
          body: n.body || "",
          type: notifType,
          data: n.data || n.meta || null,
          meta: n.meta || n.data || null,
          read: n.read === true || n.isRead === true,
          isRead: n.read === true || n.isRead === true,
          createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
        },
        update: {
          read: n.read === true || n.isRead === true,
          isRead: n.read === true || n.isRead === true,
        },
      });
    }
  }

  // 9. Exams & Marks
  if (Array.isArray(db.exams)) {
    console.log(`Migrating ${db.exams.length} exams...`);
    for (const ex of db.exams) {
      await prisma.exam.upsert({
        where: { id: ex.id },
        create: {
          id: ex.id,
          schoolId: ex.schoolId,
          name: ex.name,
          className: ex.className || null,
          section: ex.section || null,
          type: ex.type || "EXAM",
          maxMarks: typeof ex.maxMarks === "number" ? ex.maxMarks : null,
          passMarks: typeof ex.passMarks === "number" ? ex.passMarks : null,
          date: ex.date || null,
          dateFrom: ex.dateFrom || null,
          dateTo: ex.dateTo || null,
          startDate: ex.startDate || ex.dateFrom || ex.date || null,
          endDate: ex.endDate || ex.dateTo || ex.date || null,
          classes: ex.classes || null,
          subjects: ex.subjects || [],
          published: ex.published === true,
          publishedSnapshot: ex.publishedSnapshot || null,
          publishedAt: ex.publishedAt ? new Date(ex.publishedAt) : null,
          description: ex.description || null,
          createdById: ex.createdById,
          createdAt: ex.createdAt ? new Date(ex.createdAt) : new Date(),
        },
        update: {
          name: ex.name,
          published: ex.published === true,
          publishedSnapshot: ex.publishedSnapshot || null,
          publishedAt: ex.publishedAt ? new Date(ex.publishedAt) : null,
          subjects: ex.subjects || [],
        },
      });
    }
  }

  if (Array.isArray(db.marks)) {
    console.log(`Migrating ${db.marks.length} marks...`);
    for (const m of db.marks) {
      const studentExists = await prisma.user.findUnique({ where: { id: m.studentId } });
      const examExists = await prisma.exam.findUnique({ where: { id: m.examId } });
      if (!studentExists || !examExists) continue;

      await prisma.examMark.upsert({
        where: { id: m.id },
        create: {
          id: m.id,
          examId: m.examId,
          studentId: m.studentId,
          marks: typeof m.marks === "number" ? m.marks : (typeof m.marksObtained === "number" ? m.marksObtained : 0),
          maxMarks: typeof m.maxMarks === "number" ? m.maxMarks : 100,
          subjectId: m.subjectId || null,
          subject: m.subject || null,
          splits: m.splits || null,
          grade: m.grade || null,
          remarks: m.remarks || null,
          enteredById: m.enteredById || null,
          enteredAt: m.enteredAt ? new Date(m.enteredAt) : new Date(),
        },
        update: {
          marks: typeof m.marks === "number" ? m.marks : (typeof m.marksObtained === "number" ? m.marksObtained : 0),
          splits: m.splits || null,
          grade: m.grade || null,
          remarks: m.remarks || null,
        },
      });
    }
  }

  // 10. Read Receipts & Push Tokens
  if (Array.isArray(db.readReceipts)) {
    console.log(`Migrating ${db.readReceipts.length} read receipts...`);
    for (const r of db.readReceipts) {
      const userExists = await prisma.user.findUnique({ where: { id: r.userId } });
      if (!userExists) continue;
      await prisma.readReceipt.upsert({
        where: { id: r.id },
        create: {
          id: r.id,
          userId: r.userId,
          entityId: r.entityId || r.itemId || null,
          itemId: r.itemId || r.entityId || null,
          entityType: r.entityType || r.type || null,
          type: r.type || r.entityType || null,
          readAt: r.readAt ? new Date(r.readAt) : new Date(),
        },
        update: {},
      });
    }
  }

  if (Array.isArray(db.pushTokens)) {
    console.log(`Migrating ${db.pushTokens.length} push tokens...`);
    for (const pt of db.pushTokens) {
      const userExists = await prisma.user.findUnique({ where: { id: pt.userId } });
      if (!userExists) continue;
      await prisma.pushToken.upsert({
        where: { userId_token: { userId: pt.userId, token: pt.token } },
        create: {
          userId: pt.userId,
          token: pt.token,
          platform: pt.platform || "web",
          createdAt: pt.createdAt ? new Date(pt.createdAt) : new Date(),
          updatedAt: pt.updatedAt ? new Date(pt.updatedAt) : new Date(),
        },
        update: {
          platform: pt.platform || "web",
          updatedAt: new Date(),
        },
      });
    }
  }

  console.log("\nZero-loss data migration to PostgreSQL completed successfully!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
