// My School Data Store with PostgreSQL & Prisma Integration
import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { generateSchoolCode, generateTempPassword, generateUsername, formatDobToPassword, SUBSCRIPTION_PLANS, SubscriptionPlanInfo } from "@myschool/shared";
import { prisma } from "@myschool/database";

export { prisma, SUBSCRIPTION_PLANS };
export type { SubscriptionPlanInfo };

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

export interface StoredSchool {
  id: string;
  schoolCode: string;
  name: string;
  displayName?: string;
  location: string;
  email: string;
  phone?: string;
  themeColor: string;
  logoUrl?: string;
  plan: string;
  billingCycle: string;
  planExpiresAt?: string;
  planStatus?: "ACTIVE" | "EXPIRED" | "TRIAL";
  lastExpiryNotificationSent?: "7_DAYS" | "2_DAYS" | "EXPIRED" | null;
  createdAt: string;
}

export interface StoredUser {
  id: string;
  schoolId: string;
  schoolCode: string;
  role: "ADMIN" | "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT";
  username: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  photoUrl?: string;
  gender?: string;
  // Role specific
  education?: string;
  qualification?: string;
  teacherType?: "CLASS_TEACHER" | "SUBJECT_TEACHER";
  className?: string;
  section?: string;
  rollNumber?: string;
  rollNo?: string;
  dateOfBirth?: string;
  parentEmail?: string;
  parentName?: string;
  childrenIds?: string[]; // for parents
  isActive: boolean;
  createdAt: string;
  createdById?: string;
}

export interface StoredClass {
  id: string;
  schoolId: string;
  name: string;       // e.g. "Class 10", "Pre-KG"
  section: string;    // e.g. "A", "B"
  classTeacherId?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
}

export interface StoredAttendance {
  id: string;
  schoolId: string;
  studentId?: string;   // for student attendance
  teacherId?: string;   // for teacher check-in
  date: string;         // YYYY-MM-DD
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "HOLIDAY";
  markedById?: string;
  remarks?: string;
  markedAt: string;
  notificationSent: boolean;
}

export interface StoredHomework {
  id: string;
  schoolId: string;
  className: string;
  section?: string;
  subject?: string;
  title: string;
  description: string;
  attachmentUrl?: string;
  attachments?: string[];
  createdById: string;
  createdByName?: string;
  createdAt: string;
  expiresAt: string;
}

export interface StoredAnnouncement {
  id: string;
  schoolId: string;
  title: string;
  content: string;
  target: "ALL" | "PARENTS_ONLY" | "STUDENTS_ONLY" | "TEACHERS_ONLY" | "CLASS";
  className?: string;
  section?: string;
  classes?: { className: string; section?: string }[];
  createdById: string;
  createdByName?: string;
  createdByRole?: string;
  createdAt: string;
}

export interface StoredSubject {
  id: string;
  schoolId: string;
  name: string;
  code?: string;
  isActive?: boolean;
  createdAt?: string;
}

export interface StoredTeacherClass {
  id: string;
  schoolId: string;
  teacherId: string;
  className: string;
  section: string;
  role?: "CLASS_TEACHER" | "SUBJECT_TEACHER";
  subject?: string;
  subjectId?: string;
  subjectName?: string;
  createdAt?: string;
}

export interface ExamSplit {
  title: string;
  maxMarks: number;
}

export interface ExamSubject {
  id: string;
  subjectName: string;
  date: string;
  maxMarks: number;
  passMarks?: number;
  splits: ExamSplit[];
}

export interface StoredExam {
  id: string;
  schoolId: string;
  name: string;
  className?: string;
  section?: string;
  subject?: string;
  subjectId?: string;
  maxMarks?: number;
  passMarks?: number;
  date?: string;
  description?: string;
  createdById: string;
  createdAt: string;
  type?: "TEST" | "EXAM" | string;
  examType?: string;
  subjects?: any[];
  published?: boolean;
  publishedAt?: string;
  publishedSnapshot?: any;
  dateFrom?: string;
  dateTo?: string;
}

export interface StoredMark {
  id: string;
  examId: string;
  studentId: string;
  marks?: number;
  marksObtained?: number;
  maxMarks?: number;
  grade?: string;
  remarks?: string;
  enteredById?: string;
  enteredAt?: string;
  gradedById?: string;
  gradedAt?: string;
  subjectId?: string;
  splits?: Record<string, number>;
}

export interface StoredReadReceipt {
  id: string;
  userId: string;
  type?: "ANNOUNCEMENT" | "HOMEWORK" | string;
  targetType?: string;
  targetId?: string;
  itemId?: string;
  entityId?: string;
  readAt: string;
}

export interface StoredNotification {
  id: string;
  schoolId: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  meta?: any;
  createdAt: string;
}

export interface StoredPushToken {
  userId: string;
  token: string;
  platform: string;
  updatedAt: string;
}

export interface StoredOtp {
  id: string;
  userId: string;
  code: string;
  purpose: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

export interface DB {
  schools: StoredSchool[];
  users: StoredUser[];
  attendances: StoredAttendance[];
  classes: StoredClass[];
  homeworks: StoredHomework[];
  announcements: StoredAnnouncement[];
  subjects?: StoredSubject[];
  teacherClasses?: StoredTeacherClass[];
  exams?: StoredExam[];
  marks?: StoredMark[];
  notifications?: StoredNotification[];
  pushTokens?: StoredPushToken[];
  readReceipts?: StoredReadReceipt[];
  otps?: StoredOtp[];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ schools: [], users: [], attendances: [], classes: [], homeworks: [], announcements: [] }, null, 2));
  }
}

let _postgresHydrated = false;
let _isHydrating = false;
let _cachedDB: DB | null = null;
let _hydrationPromise: Promise<DB | null> | null = null;

function readDBFromFile(): DB {
  ensureDataDir();
  const raw = fs.readFileSync(DB_FILE, "utf-8");
  const data = JSON.parse(raw);
  if (!data.schools) data.schools = [];
  if (!data.users) data.users = [];
  if (!data.attendances) data.attendances = [];
  if (!data.classes) data.classes = [];
  if (!data.homeworks) data.homeworks = [];
  if (!data.announcements) data.announcements = [];
  if (!data.notifications) data.notifications = [];
  if (!data.subjects) data.subjects = [];
  if (!data.teacherClasses) data.teacherClasses = [];
  if (!data.exams) data.exams = [];
  if (!data.marks) data.marks = [];
  if (!data.readReceipts) data.readReceipts = [];
  if (!data.otps) data.otps = [];
  if (!data.pushTokens) data.pushTokens = [];
  return data as DB;
}

export async function hydrateFromPostgres(): Promise<DB | null> {
  if (!prisma || !process.env.DATABASE_URL) return null;
  if (_isHydrating && _hydrationPromise) {
    return _hydrationPromise;
  }
  _isHydrating = true;
  _hydrationPromise = (async () => {
    try {
      const schoolCount = await prisma.school.count();
      if (schoolCount === 0) {
        // Postgres is currently empty, seed it from local DB only if local DB has schools
        const local = readDBFromFile();
        if (local.schools.length > 0) {
          _postgresHydrated = true;
          await syncToPostgres(local);
        }
        _cachedDB = local;
        _postgresHydrated = true;
        return local;
      }

      // Load all records from PostgreSQL
      const [
        schools,
        users,
        classes,
        subjects,
        teacherClasses,
        homeworks,
        announcements,
        attendances,
        exams,
        marks,
        notifications,
        pushTokens,
        readReceipts,
      ] = await Promise.all([
        prisma.school.findMany({ include: { subscription: true } }),
        prisma.user.findMany(),
        prisma.class.findMany(),
        prisma.subject.findMany(),
        prisma.teacherClass.findMany(),
        prisma.homework.findMany(),
        prisma.announcement.findMany(),
        prisma.attendance.findMany(),
        prisma.exam.findMany(),
        prisma.examMark.findMany(),
        prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: 2000 }),
        prisma.pushToken.findMany(),
        prisma.readReceipt.findMany(),
      ]);

      const hydrated: DB = {
        schools: schools.map((s: any) => {
          const sub = s.subscription;
          const expiresAt = sub?.endDate ? sub.endDate.toISOString() : undefined;
          return {
            id: s.id,
            schoolCode: s.schoolCode,
            name: s.name,
            displayName: s.displayName || undefined,
            location: s.location,
            email: s.email,
            phone: s.phone || undefined,
            themeColor: s.themeColor,
            logoUrl: s.logoUrl || undefined,
            plan: s.plan,
            billingCycle: s.billingCycle,
            planExpiresAt: expiresAt,
            planStatus: sub?.isActive === false ? "EXPIRED" : (expiresAt && new Date(expiresAt).getTime() <= Date.now() ? "EXPIRED" : "ACTIVE"),
            createdAt: s.createdAt.toISOString(),
          };
        }),
        users: users.map((u) => ({
          id: u.id,
          schoolId: u.schoolId,
          schoolCode: u.schoolCode || "",
          role: u.role as any,
          username: u.username,
          email: u.email,
          passwordHash: u.passwordHash,
          firstName: u.firstName,
          lastName: u.lastName || undefined,
          phone: u.phone || undefined,
          photoUrl: u.photoUrl || undefined,
          gender: u.gender || undefined,
          education: u.education || undefined,
          qualification: u.qualification || undefined,
          teacherType: u.teacherType || undefined,
          className: u.className || undefined,
          section: u.section || undefined,
          rollNumber: u.rollNumber || undefined,
          rollNo: u.rollNo || undefined,
          dateOfBirth: u.dateOfBirth || undefined,
          parentEmail: u.parentEmail || undefined,
          parentName: u.parentName || undefined,
          childrenIds: Array.isArray(u.childrenIds) ? (u.childrenIds as string[]) : [],
          isActive: u.isActive,
          createdAt: u.createdAt.toISOString(),
          createdById: u.createdById || undefined,
        })),
        classes: classes.map((c) => ({
          id: c.id,
          schoolId: c.schoolId,
          name: c.name,
          section: c.section,
          classTeacherId: c.classTeacherId || undefined,
          order: c.order,
          isActive: c.isActive,
          createdAt: c.createdAt.toISOString(),
        })),
        subjects: subjects.map((sub: any) => ({
          id: sub.id,
          schoolId: sub.schoolId,
          name: sub.name,
          code: sub.code || undefined,
          createdAt: new Date().toISOString(),
        })),
        teacherClasses: teacherClasses.map((tc: any) => ({
          id: tc.id,
          schoolId: tc.schoolId,
          teacherId: tc.teacherId,
          className: tc.className,
          section: tc.section,
          subject: tc.subject || undefined,
          subjectId: undefined,
          createdAt: tc.createdAt.toISOString(),
        })),
        homeworks: homeworks.map((h: any) => ({
          id: h.id,
          schoolId: h.schoolId,
          className: h.className,
          section: h.section || undefined,
          subject: h.subject || undefined,
          title: h.title,
          description: h.description,
          attachmentUrl: h.attachmentUrl || undefined,
          attachments: Array.isArray(h.attachments)
            ? (h.attachments as string[])
            : h.attachmentUrl
            ? [h.attachmentUrl]
            : [],
          createdById: h.createdById,
          createdByName: h.createdByName || undefined,
          createdAt: h.createdAt.toISOString(),
          expiresAt: h.expiresAt ? h.expiresAt.toISOString() : new Date(Date.now() + 7 * 86400000).toISOString(),
        })),
        announcements: announcements.map((a: any) => ({
          id: a.id,
          schoolId: a.schoolId,
          title: a.title,
          content: a.content,
          target: a.target,
          className: a.className || undefined,
          section: a.section || undefined,
          classes: a.classes || undefined,
          createdById: a.createdById,
          createdByName: a.createdByName || undefined,
          createdByRole: a.createdByRole || undefined,
          createdAt: a.createdAt.toISOString(),
        })),
        attendances: attendances.map((att: any) => ({
          id: att.id,
          schoolId: att.schoolId,
          studentId: att.studentId || undefined,
          teacherId: att.teacherId || undefined,
          date: typeof att.date === "string" ? att.date : new Date(att.date).toISOString().split("T")[0],
          status: att.status as any,
          markedById: att.markedById || undefined,
          remarks: att.remarks || undefined,
          markedAt: att.markedAt.toISOString(),
          notificationSent: att.notificationSent,
        })),
        exams: exams.map((e: any) => {
          const isTest = e.type === "TEST";
          return {
            id: e.id,
            schoolId: e.schoolId,
            name: e.name,
            type: e.type || "EXAM",
            examType: e.type || "EXAM",
            className: e.className || undefined,
            section: e.section || undefined,
            subject: isTest ? ((e.subjects as any)?.[0]?.subject || (e.subjects as any)?.[0]?.subjectName || (typeof e.subjects === "string" ? e.subjects : "") || undefined) : undefined,
            subjectId: (e.subjects as any)?.[0]?.subjectId || undefined,
            subjects: !isTest && Array.isArray(e.subjects) ? e.subjects : undefined,
            maxMarks: e.maxMarks != null ? Number(e.maxMarks) : 100,
            passMarks: e.passMarks != null ? Number(e.passMarks) : 35,
            date: typeof e.date === "string" ? e.date : (e.startDate || ""),
            dateFrom: e.dateFrom || (typeof e.date === "string" ? e.date : (e.startDate || "")),
            dateTo: e.dateTo || (typeof e.date === "string" ? e.date : (e.startDate || "")),
            published: !!e.published,
            publishedAt: e.publishedAt ? e.publishedAt.toISOString() : undefined,
            publishedSnapshot: e.publishedSnapshot || undefined,
            description: e.description || undefined,
            createdById: e.createdById,
            createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
          };
        }),
        marks: marks.map((m: any) => {
          const markVal = Number(m.marks != null ? m.marks : (m.marksObtained != null ? m.marksObtained : 0)) || 0;
          return {
            id: m.id,
            examId: m.examId,
            studentId: m.studentId,
            marks: markVal,
            marksObtained: markVal,
            maxMarks: m.maxMarks != null ? Number(m.maxMarks) : 100,
            subjectId: m.subjectId || undefined,
            grade: m.grade || undefined,
            remarks: m.remarks || undefined,
            splits: m.splits || undefined,
            enteredById: m.enteredById || undefined,
            enteredAt: m.enteredAt ? (typeof m.enteredAt === "string" ? m.enteredAt : m.enteredAt.toISOString()) : new Date().toISOString(),
          };
        }),
        notifications: notifications.map((n: any) => ({
          id: n.id,
          schoolId: n.schoolId || "",
          userId: n.userId,
          title: n.title,
          body: n.body,
          type: n.type as any,
          read: n.read ?? n.isRead ?? false,
          meta: n.meta as any,
          createdAt: n.createdAt.toISOString(),
        })),
        pushTokens: pushTokens.map((pt: any) => ({
          userId: pt.userId,
          token: pt.token,
          platform: pt.platform || "web",
          updatedAt: pt.updatedAt.toISOString(),
        })),
        readReceipts: readReceipts.map((rr: any) => ({
          id: rr.id,
          userId: rr.userId,
          type: rr.type || rr.entityType || "ANNOUNCEMENT",
          itemId: rr.itemId || rr.entityId || "",
          targetType: rr.entityType || rr.type || "ANNOUNCEMENT",
          targetId: rr.entityId || rr.itemId || "",
          readAt: rr.readAt ? (typeof rr.readAt === "string" ? rr.readAt : rr.readAt.toISOString()) : new Date().toISOString(),
        })),
        otps: [],
      };

      ensureDataDir();
      fs.writeFileSync(DB_FILE, JSON.stringify(hydrated, null, 2));
      _cachedDB = hydrated;
      _postgresHydrated = true;
      return hydrated;
    } catch (err: any) {
      console.error("[PostgreSQL Hydration Notice]:", err?.message || err);
      return null;
    } finally {
      _isHydrating = false;
      _hydrationPromise = null;
    }
  })();
  return _hydrationPromise;
}

export function readDB(): DB {
  if (!_postgresHydrated && process.env.DATABASE_URL && !_isHydrating) {
    hydrateFromPostgres().catch(() => {});
  }
  if (_cachedDB) {
    return _cachedDB;
  }
  const fileDB = readDBFromFile();
  if (!_cachedDB && !_postgresHydrated) {
    _cachedDB = fileDB;
  }
  return _cachedDB || fileDB;
}

export async function syncToPostgres(db: DB) {
  if (!prisma || !process.env.DATABASE_URL || !_postgresHydrated) return;
  try {
    // 1. Sync Schools
    if (Array.isArray(db.schools) && db.schools.length > 0) {
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
        }).catch(() => {});
      }
    }

    // 2. Sync Users
    if (Array.isArray(db.users) && db.users.length > 0) {
      for (const u of db.users) {
        await prisma.user.upsert({
          where: { id: u.id },
          create: {
            id: u.id,
            schoolId: u.schoolId,
            schoolCode: u.schoolCode || null,
            role: u.role as any,
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
            role: u.role as any,
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
        }).catch(() => {});
      }
    }

    // 3. Sync Classes
    if (Array.isArray(db.classes) && db.classes.length > 0) {
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
        }).catch(() => {});
      }
    }

    // 4. Sync Subjects
    if (Array.isArray(db.subjects) && db.subjects.length > 0) {
      for (const s of db.subjects) {
        await prisma.subject.upsert({
          where: { id: s.id },
          create: {
            id: s.id,
            schoolId: s.schoolId,
            name: s.name,
            code: s.code || null,
          },
          update: {
            name: s.name,
            code: s.code || null,
          },
        }).catch(() => {});
      }
    }

    // 4b. Sync Teacher Classes
    if (Array.isArray(db.teacherClasses) && db.teacherClasses.length > 0) {
      for (const tc of db.teacherClasses) {
        await prisma.teacherClass.upsert({
          where: { id: tc.id },
          create: {
            id: tc.id,
            schoolId: tc.schoolId,
            teacherId: tc.teacherId,
            className: tc.className,
            section: tc.section || "A",
            role: tc.role || "CLASS_TEACHER",
            subject: tc.subject || tc.subjectName || "",
            createdAt: tc.createdAt ? new Date(tc.createdAt) : new Date(),
          },
          update: {
            className: tc.className,
            section: tc.section || "A",
            role: tc.role || "CLASS_TEACHER",
            subject: tc.subject || tc.subjectName || "",
          },
        }).catch(() => {});
      }
    }

    // 5. Sync Homeworks
    if (Array.isArray(db.homeworks) && db.homeworks.length > 0) {
      for (const h of db.homeworks) {
        await prisma.homework.upsert({
          where: { id: h.id },
          create: {
            id: h.id,
            schoolId: h.schoolId,
            className: h.className,
            section: h.section || null,
            subject: h.subject || "General",
            title: h.title,
            description: h.description,
            attachmentUrl: h.attachmentUrl || null,
            attachments: Array.isArray(h.attachments) ? h.attachments : h.attachmentUrl ? [h.attachmentUrl] : [],
            createdById: h.createdById,
            createdByName: h.createdByName || null,
            createdAt: h.createdAt ? new Date(h.createdAt) : new Date(),
            expiresAt: h.expiresAt ? new Date(h.expiresAt) : new Date(Date.now() + 7 * 86400000),
          },
          update: {
            title: h.title,
            description: h.description,
            attachmentUrl: h.attachmentUrl || null,
            attachments: Array.isArray(h.attachments) ? h.attachments : h.attachmentUrl ? [h.attachmentUrl] : [],
            createdByName: h.createdByName || null,
            expiresAt: h.expiresAt ? new Date(h.expiresAt) : new Date(Date.now() + 7 * 86400000),
          },
        }).catch(() => {});
      }
    }

    // 6. Sync Announcements
    if (Array.isArray(db.announcements) && db.announcements.length > 0) {
      for (const a of db.announcements) {
        await prisma.announcement.upsert({
          where: { id: a.id },
          create: {
            id: a.id,
            schoolId: a.schoolId,
            title: a.title,
            content: a.content,
            target: (a.target as any) || "ALL",
            className: a.className || null,
            section: a.section || null,
            createdById: a.createdById,
            createdByName: a.createdByName || null,
            createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
          },
          update: {
            title: a.title,
            content: a.content,
            target: (a.target as any) || "ALL",
            className: a.className || null,
            section: a.section || null,
          },
        }).catch(() => {});
      }
    }

    // 7. Sync Exams
    if (Array.isArray(db.exams) && db.exams.length > 0) {
      for (const e of db.exams) {
        await prisma.exam.upsert({
          where: { id: e.id },
          create: {
            id: e.id,
            schoolId: e.schoolId,
            name: e.name,
            type: e.type || e.examType || "EXAM",
            className: e.className || null,
            section: e.section || null,
            maxMarks: e.maxMarks || 100,
            passMarks: e.passMarks || 35,
            date: e.date || null,
            dateFrom: e.dateFrom || e.date || null,
            dateTo: e.dateTo || e.date || null,
            subjects: e.subjects ? (e.subjects as any) : (e.subject ? [{ subject: e.subject, maxMarks: e.maxMarks, passMarks: e.passMarks }] as any : undefined),
            description: e.description || null,
            published: !!e.published,
            publishedAt: e.publishedAt ? new Date(e.publishedAt) : null,
            publishedSnapshot: e.publishedSnapshot ? (e.publishedSnapshot as any) : undefined,
            createdById: e.createdById,
            createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
          },
          update: {
            name: e.name,
            type: e.type || e.examType || "EXAM",
            className: e.className || null,
            section: e.section || null,
            maxMarks: e.maxMarks || 100,
            passMarks: e.passMarks || 35,
            date: e.date || null,
            dateFrom: e.dateFrom || e.date || null,
            dateTo: e.dateTo || e.date || null,
            subjects: e.subjects ? (e.subjects as any) : (e.subject ? [{ subject: e.subject, maxMarks: e.maxMarks, passMarks: e.passMarks }] as any : undefined),
            description: e.description || null,
            published: !!e.published,
            publishedAt: e.publishedAt ? new Date(e.publishedAt) : null,
            publishedSnapshot: e.publishedSnapshot ? (e.publishedSnapshot as any) : undefined,
          },
        }).catch(() => {});
      }
    }

    // 8. Sync Marks
    if (Array.isArray(db.marks) && db.marks.length > 0) {
      for (const m of db.marks) {
        const markVal = Number(m.marks != null ? m.marks : (m.marksObtained != null ? m.marksObtained : 0)) || 0;
        await prisma.examMark.upsert({
          where: { id: m.id },
          create: {
            id: m.id,
            examId: m.examId,
            studentId: m.studentId,
            subjectId: m.subjectId || null,
            marks: markVal,
            maxMarks: m.maxMarks != null ? Number(m.maxMarks) : 100,
            grade: m.grade || null,
            remarks: m.remarks || null,
            splits: m.splits ? (m.splits as any) : undefined,
            enteredById: m.enteredById || m.gradedById || null,
            enteredAt: m.enteredAt ? new Date(m.enteredAt) : (m.gradedAt ? new Date(m.gradedAt) : new Date()),
          },
          update: {
            subjectId: m.subjectId || null,
            marks: markVal,
            maxMarks: m.maxMarks != null ? Number(m.maxMarks) : 100,
            grade: m.grade || null,
            remarks: m.remarks || null,
            splits: m.splits ? (m.splits as any) : undefined,
            enteredById: m.enteredById || m.gradedById || null,
            enteredAt: m.enteredAt ? new Date(m.enteredAt) : (m.gradedAt ? new Date(m.gradedAt) : new Date()),
          },
        }).catch(() => {});
      }
    }

    // 9. Sync Attendance
    if (Array.isArray(db.attendances) && db.attendances.length > 0) {
      for (const att of db.attendances) {
        const attDate = typeof att.date === "string" ? att.date : new Date(att.date).toISOString().split("T")[0];
        await prisma.attendance.upsert({
          where: { id: att.id },
          create: {
            id: att.id,
            schoolId: att.schoolId,
            studentId: att.studentId || null,
            teacherId: att.teacherId || null,
            date: attDate,
            status: (att.status as any) || "PRESENT",
            markedById: att.markedById || null,
            remarks: att.remarks || null,
            markedAt: att.markedAt ? new Date(att.markedAt) : new Date(),
            notificationSent: Boolean(att.notificationSent),
          },
          update: {
            status: (att.status as any) || "PRESENT",
            remarks: att.remarks || null,
            markedAt: att.markedAt ? new Date(att.markedAt) : new Date(),
            notificationSent: Boolean(att.notificationSent),
          },
        }).catch(() => {});
      }
    }

    // 10. Sync Notifications (latest 200)
    if (Array.isArray(db.notifications) && db.notifications.length > 0) {
      const recentNotifications = db.notifications.slice(0, 200);
      for (const n of recentNotifications) {
        await prisma.notification.upsert({
          where: { id: n.id },
          create: {
            id: n.id,
            userId: n.userId,
            schoolId: n.schoolId || null,
            title: n.title,
            body: n.body,
            type: (n.type as any) || "GENERAL",
            read: Boolean(n.read),
            isRead: Boolean(n.read),
            meta: n.meta || null,
            createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
          },
          update: {
            read: Boolean(n.read),
            isRead: Boolean(n.read),
          },
        }).catch(() => {});
      }
    }

    // 11. Sync Push Tokens
    if (Array.isArray(db.pushTokens) && db.pushTokens.length > 0) {
      for (const pt of db.pushTokens) {
        await prisma.pushToken.upsert({
          where: {
            userId_token: {
              userId: pt.userId,
              token: pt.token,
            },
          },
          create: {
            userId: pt.userId,
            token: pt.token,
            platform: pt.platform || "web",
            updatedAt: pt.updatedAt ? new Date(pt.updatedAt) : new Date(),
          },
          update: {
            platform: pt.platform || "web",
            updatedAt: pt.updatedAt ? new Date(pt.updatedAt) : new Date(),
          },
        }).catch(() => {});
      }
    }

    // 12. Sync Read Receipts
    if (Array.isArray(db.readReceipts) && db.readReceipts.length > 0) {
      for (const rr of db.readReceipts.slice(-500)) {
        const type = rr.type || rr.targetType || "ANNOUNCEMENT";
        const itemId = rr.itemId || rr.targetId || "";
        if (!rr.userId || !itemId) continue;
        const rrId = rr.id || `rr_${rr.userId}_${itemId}`;
        await prisma.readReceipt.upsert({
          where: { id: rrId },
          create: {
            id: rrId,
            userId: rr.userId,
            type,
            itemId,
            entityType: type,
            entityId: itemId,
            readAt: rr.readAt ? new Date(rr.readAt) : new Date(),
          },
          update: {
            type,
            itemId,
            entityType: type,
            entityId: itemId,
          },
        }).catch(() => {});
      }
    }
  } catch (e: any) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[PostgreSQL Sync Notice]:", e?.message || e);
    }
  }
}

export function writeDB(db: DB) {
  _cachedDB = db;
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  if (process.env.DATABASE_URL && _postgresHydrated) {
    syncToPostgres(db).catch(() => {});
  }
}

function titleCaseName(s: string | undefined | null): string {
  if (!s) return "";
  return String(s)
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

export function normalizeEmail(e?: string | null): string {
  return (e || "").trim().toLowerCase();
}

export function normalizePhone(p?: string | null): string {
  return (p || "").replace(/\D/g, "");
}

export function cleanPhoneNumber(p?: string | null): string {
  if (!p) return "";
  let s = String(p).trim();
  let prev = "";
  while (s !== prev) {
    prev = s;
    s = s.replace(/^['"\\=]+/, "").replace(/['"\\]+$/, "").trim();
  }
  return s;
}

export function isSamePhone(p1?: string | null, p2?: string | null): boolean {
  if (!p1 || !p2) return false;
  const n1 = normalizePhone(p1);
  const n2 = normalizePhone(p2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  // If one includes country code e.g. 919876543210 and 9876543210 (last 10 digits match)
  if (n1.length >= 10 && n2.length >= 10 && (n1.endsWith(n2) || n2.endsWith(n1))) {
    return true;
  }
  return false;
}

export function normalizeClassName(name?: string | null): string {
  if (!name) return "";
  return String(name).trim().toLowerCase().replace(/^class\s+/i, "");
}

export function normalizeSection(sec?: string | null): string {
  if (!sec) return "";
  return String(sec).trim().toLowerCase();
}

export function isSameClassAndSection(
  clsA?: string | null,
  secA?: string | null,
  clsB?: string | null,
  secB?: string | null
): boolean {
  const cA = normalizeClassName(clsA);
  const cB = normalizeClassName(clsB);
  if (cA !== cB) return false;
  const sA = normalizeSection(secA);
  const sB = normalizeSection(secB);
  return !sA || !sB ? true : sA === sB;
}

export function isExactClassAndSection(
  clsA?: string | null,
  secA?: string | null,
  clsB?: string | null,
  secB?: string | null
): boolean {
  const cA = normalizeClassName(clsA);
  const cB = normalizeClassName(clsB);
  if (cA !== cB) return false;
  const sA = normalizeSection(secA);
  const sB = normalizeSection(secB);
  return sA === sB;
}

export function createSchool(data: {
  name: string;
  displayName?: string;
  location: string;
  email: string;
  phone?: string;
  themeColor: string;
  plan: string;
  billingCycle: string;
  logoUrl?: string;
}) {
  const db = readDB();
  const normEmail = normalizeEmail(data.email);
  if (!normEmail) throw new Error("School email is required.");

  // Rule: Admin school - Email and phone must be unique across the entire app
  const dupSchoolEmail = db.schools.find((s) => normalizeEmail(s.email) === normEmail);
  if (dupSchoolEmail) {
    throw new Error("School with this email already exists.");
  }
  const dupAdminEmail = db.users.find(
    (u) => u.role === "ADMIN" && u.isActive && normalizeEmail(u.email) === normEmail
  );
  if (dupAdminEmail) {
    throw new Error("An admin account with this email already exists.");
  }

  if (data.phone && data.phone.trim()) {
    const dupSchoolPhone = db.schools.find((s) => s.phone && isSamePhone(s.phone, data.phone));
    if (dupSchoolPhone) {
      throw new Error("School with this phone number already exists.");
    }
    const dupAdminPhone = db.users.find(
      (u) => u.role === "ADMIN" && u.isActive && u.phone && isSamePhone(u.phone, data.phone)
    );
    if (dupAdminPhone) {
      throw new Error("An admin account with this phone number already exists.");
    }
  }

  const schoolNameTrimmed = data.name.trim();
  let finalDisplayName: string | undefined = undefined;
  if (schoolNameTrimmed.length > 20) {
    if (!data.displayName || !data.displayName.trim()) {
      throw new Error("Display Name is required when school name exceeds 20 characters.");
    }
    if (data.displayName.trim().length > 20) {
      throw new Error("Display Name must be 20 characters or less.");
    }
    finalDisplayName = data.displayName.trim();
  } else if (data.displayName && data.displayName.trim()) {
    if (data.displayName.trim().length > 20) {
      throw new Error("Display Name must be 20 characters or less.");
    }
    finalDisplayName = data.displayName.trim();
  }

  const schoolCode = generateSchoolCode();
  const schoolId = `sch_${Date.now()}`;
  const adminPassword = generateTempPassword(10);
  const passwordHash = bcrypt.hashSync(adminPassword, 10);

  const school: StoredSchool = {
    id: schoolId,
    schoolCode,
    name: schoolNameTrimmed,
    displayName: finalDisplayName,
    location: data.location,
    email: data.email.trim(),
    phone: data.phone ? data.phone.trim() : undefined,
    themeColor: data.themeColor,
    logoUrl: data.logoUrl,
    plan: data.plan || "OFFER_MONTHLY",
    billingCycle: data.billingCycle || "MONTHLY",
    planExpiresAt: new Date(Date.now() + (data.billingCycle === "YEARLY" ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
    planStatus: "ACTIVE",
    lastExpiryNotificationSent: null,
    createdAt: new Date().toISOString(),
  };

  const admin: StoredUser = {
    id: `user_${Date.now()}`,
    schoolId,
    schoolCode,
    role: "ADMIN",
    username: "admin",
    email: data.email.trim(),
    phone: data.phone ? data.phone.trim() : undefined,
    passwordHash,
    firstName: "Admin",
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  db.schools.push(school);
  db.users.push(admin);
  writeDB(db);

  return {
    school,
    admin: {
      username: admin.username,
      password: adminPassword, // plain text only returned once
      email: admin.email,
    },
  };
}

export function findUserByCredentials(schoolCode: string, username: string, password: string) {
  const db = readDB();
  const user = db.users.find(
    (u) =>
      u.schoolCode.toUpperCase() === schoolCode.toUpperCase() &&
      u.username.toLowerCase() === username.toLowerCase() &&
      u.isActive
  );
  if (!user) return null;
  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) return null;

  const school = db.schools.find((s) => s.id === user.schoolId);
  return { user, school };
}

function enrichTeacherProfile(user: any, db: any) {
  if (!user || user.role !== "TEACHER") return user;
  const schoolId = user.schoolId;
  const ctClass = (db.classes || []).find(
    (c: any) => (!schoolId || c.schoolId === schoolId) && c.isActive !== false && c.classTeacherId === user.id
  );
  if (ctClass) {
    user.teacherType = "CLASS_TEACHER";
    user.className = ctClass.name;
    user.section = ctClass.section;
  } else {
    user.teacherType = "SUBJECT_TEACHER";
    user.className = undefined;
    user.section = undefined;
  }
  return user;
}

export function findUserById(id: string) {
  const db = readDB();
  const rawUser = db.users.find((u) => u.id === id);
  if (!rawUser) return null;
  const user = enrichTeacherProfile(rawUser, db);
  const school = db.schools.find((s) => s.id === user.schoolId);
  return { user, school };
}

export function getSchoolById(schoolId: string) {
  const db = readDB();
  return db.schools.find((s) => s.id === schoolId) || null;
}

export function getUserById(userId: string) {
  const db = readDB();
  const rawUser = db.users.find((u) => u.id === userId);
  if (!rawUser) return null;
  return enrichTeacherProfile(rawUser, db);
}

export function findUserByEmail(email: string) {
  const db = readDB();
  const em = normalizeEmail(email);
  if (!em) return null;
  const rawUser = db.users.find((u) => u.isActive && normalizeEmail(u.email) === em);
  if (!rawUser) return null;
  const user = enrichTeacherProfile(rawUser, db);
  const school = db.schools.find((s) => s.id === user.schoolId);
  return { user, school };
}

export function getAllSchools() {
  const db = readDB();
  return db.schools || [];
}

/** Detect duplicate teacher/principal (email/phone/name) or student in same school */
export function findDuplicateUser(opts: {
  schoolId: string;
  role: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  excludeId?: string;
}) {
  const db = readDB();
  const fn = (opts.firstName || "").trim().toLowerCase();
  const ln = (opts.lastName || "").trim().toLowerCase();
  const em = normalizeEmail(opts.email);
  const ph = opts.phone ? normalizePhone(opts.phone) : "";
  const dob = (opts.dateOfBirth || "").trim();

  return (
    db.users.find((u) => {
      if (!u.isActive) return false;
      if (u.schoolId !== opts.schoolId) return false;
      if (u.role !== opts.role) return false;
      if (opts.excludeId && u.id === opts.excludeId) return false;

      // Check email uniqueness for Principal & Teacher
      if ((opts.role === "PRINCIPAL" || opts.role === "TEACHER") && em && normalizeEmail(u.email) === em) {
        return true;
      }
      // Check phone uniqueness for Principal & Teacher
      if ((opts.role === "PRINCIPAL" || opts.role === "TEACHER") && ph && isSamePhone(u.phone, opts.phone)) {
        return true;
      }

      const sameName =
        (u.firstName || "").trim().toLowerCase() === fn &&
        (u.lastName || "").trim().toLowerCase() === ln;
      const sameEmail = normalizeEmail(u.email) === em;
      if (opts.role === "STUDENT") {
        const sameDob = (u.dateOfBirth || "").trim() === dob;
        return sameName && sameEmail && sameDob;
      }
      return sameName && sameEmail;
    }) || null
  );
}

export function createPrincipal(data: {
  schoolId: string;
  schoolCode: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  education?: string;
  gender?: string;
  photoUrl?: string;
  createdById: string;
}) {
  const db = readDB();
  const normEmail = normalizeEmail(data.email);
  if (!normEmail) throw new Error("Email is required.");

  // Rule: Principal - Only one Principal with same email in that school
  const dupEmail = db.users.find(
    (u) =>
      u.schoolId === data.schoolId &&
      u.role === "PRINCIPAL" &&
      u.isActive &&
      normalizeEmail(u.email) === normEmail
  );
  if (dupEmail) {
    throw new Error("Principal with this email already exists in this school.");
  }

  // Rule: Principal - Only one Principal with same phone in that school
  if (data.phone && data.phone.trim()) {
    const dupPhone = db.users.find(
      (u) =>
        u.schoolId === data.schoolId &&
        u.role === "PRINCIPAL" &&
        u.isActive &&
        isSamePhone(u.phone, data.phone)
    );
    if (dupPhone) {
      throw new Error("Principal with this phone number already exists in this school.");
    }
  }

  const password = generateTempPassword(10);
  const passwordHash = bcrypt.hashSync(password, 10);
  const username = generateUsername(data.firstName + (data.lastName || ""));

  // ensure unique username in school
  let finalUsername = username;
  let i = 1;
  while (db.users.some((u) => u.schoolId === data.schoolId && u.username === finalUsername)) {
    finalUsername = `${username}${i}`;
    i++;
  }

  const user: StoredUser = {
    id: `user_${Date.now()}`,
    schoolId: data.schoolId,
    schoolCode: data.schoolCode,
    role: "PRINCIPAL",
    username: finalUsername,
    email: data.email.trim(),
    passwordHash,
    firstName: titleCaseName(data.firstName),
    lastName: data.lastName ? titleCaseName(data.lastName) : data.lastName,
    phone: data.phone ? data.phone.trim() : undefined,
    education: data.education,
    gender: data.gender,
    photoUrl: data.photoUrl,
    isActive: true,
    createdAt: new Date().toISOString(),
    createdById: data.createdById,
  };

  db.users.push(user);
  writeDB(db);

  return {
    user,
    credentials: {
      username: finalUsername,
      password,
      email: data.email.trim(),
      schoolCode: data.schoolCode,
    },
  };
}

export function createTeacher(data: {
  schoolId: string;
  schoolCode: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  gender: string;
  education?: string;
  teacherType: "CLASS_TEACHER" | "SUBJECT_TEACHER";
  className?: string;
  section?: string;
  photoUrl?: string;
  createdById: string;
}) {
  const db = readDB();
  const normEmail = normalizeEmail(data.email);
  if (!normEmail) throw new Error("Email is required.");

  // Rule: Teacher - Only one Teacher with same email in that school
  const dupEmail = db.users.find(
    (u) =>
      u.schoolId === data.schoolId &&
      u.role === "TEACHER" &&
      u.isActive &&
      normalizeEmail(u.email) === normEmail
  );
  if (dupEmail) {
    throw new Error("Teacher with this email already exists in this school.");
  }

  // Rule: Teacher - Only one Teacher with same phone in that school
  if (data.phone && data.phone.trim()) {
    const dupPhone = db.users.find(
      (u) =>
        u.schoolId === data.schoolId &&
        u.role === "TEACHER" &&
        u.isActive &&
        isSamePhone(u.phone, data.phone)
    );
    if (dupPhone) {
      throw new Error("Teacher with this phone number already exists in this school.");
    }
  }

  const password = generateTempPassword(10);
  const passwordHash = bcrypt.hashSync(password, 10);
  const username = generateUsername(data.firstName + (data.lastName || ""));

  let finalUsername = username;
  let i = 1;
  while (db.users.some((u) => u.schoolId === data.schoolId && u.username === finalUsername)) {
    finalUsername = `${username}${i}`;
    i++;
  }

  const user: StoredUser = {
    id: `user_${Date.now()}`,
    schoolId: data.schoolId,
    schoolCode: data.schoolCode,
    role: "TEACHER",
    username: finalUsername,
    email: data.email.trim(),
    passwordHash,
    firstName: titleCaseName(data.firstName),
    lastName: data.lastName ? titleCaseName(data.lastName) : data.lastName,
    phone: data.phone ? data.phone.trim() : undefined,
    gender: data.gender,
    education: data.education,
    teacherType: data.teacherType,
    className: data.className ? data.className.trim() : undefined,
    section: data.section ? data.section.trim().toUpperCase() : undefined,
    photoUrl: data.photoUrl,
    isActive: true,
    createdAt: new Date().toISOString(),
    createdById: data.createdById,
  };

  db.users.push(user);
  writeDB(db);

  if (data.teacherType === "CLASS_TEACHER" && data.className) {
    const cleanSec = (data.section || "A").trim().toUpperCase();
    ensureClass(data.schoolId, data.className.trim(), cleanSec);
    syncClassTeacherAssignment({
      schoolId: data.schoolId,
      className: data.className.trim(),
      section: cleanSec,
      newTeacherId: user.id,
    });
  }

  return {
    user,
    credentials: {
      username: finalUsername,
      password,
      email: data.email.trim(),
      schoolCode: data.schoolCode,
    },
  };
}

export function createStudent(data: {
  schoolId: string;
  schoolCode: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender: string;
  dateOfBirth: string; // YYYY-MM-DD
  className: string;
  section: string;
  rollNumber?: string;
  rollNo?: string;
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
  photoUrl?: string;
  createdById: string;
}) {
  const db = readDB();

  // Rule: Student - Parents email and student email cannot be the same
  if (data.email && data.parentEmail && !data.email.includes("@student.local")) {
    if (normalizeEmail(data.email) === normalizeEmail(data.parentEmail)) {
      throw new Error("Student email and Parent email cannot be the same.");
    }
  }

  // Rule: Student personal email uniqueness in this school (if custom email provided)
  if (data.email && !data.email.includes("@student.local")) {
    const normStEmail = normalizeEmail(data.email);
    const dupStudentEmail = db.users.find(
      (u) =>
        u.schoolId === data.schoolId &&
        u.role === "STUDENT" &&
        u.isActive &&
        !u.email?.includes("@student.local") &&
        normalizeEmail(u.email) === normStEmail
    );
    if (dupStudentEmail) {
      throw new Error("Student with this email already exists in this school.");
    }
  }

  // Note: Multiple students sharing the same parent email / phone is explicitly allowed.
  const studentUsername = generateUsername(data.firstName + (data.lastName || ""));
  const studentPassword = formatDobToPassword(data.dateOfBirth);
  const studentHash = bcrypt.hashSync(studentPassword, 10);

  let finalStudentUsername = studentUsername;
  let i = 1;
  while (db.users.some((u) => u.schoolId === data.schoolId && u.username === finalStudentUsername)) {
    finalStudentUsername = `${studentUsername}${i}`;
    i++;
  }

  const studentRoll = (data.rollNumber || data.rollNo || "").trim() || undefined;
  const studentId = `user_${Date.now()}`;
  const student: StoredUser = {
    id: studentId,
    schoolId: data.schoolId,
    schoolCode: data.schoolCode,
    role: "STUDENT",
    username: finalStudentUsername,
    email: data.email ? data.email.trim() : `${finalStudentUsername}@student.local`,
    passwordHash: studentHash,
    firstName: titleCaseName(data.firstName),
    lastName: data.lastName ? titleCaseName(data.lastName) : data.lastName,
    phone: data.phone ? cleanPhoneNumber(data.phone) : undefined,
    gender: data.gender,
    dateOfBirth: data.dateOfBirth,
    className: data.className,
    section: data.section,
    rollNumber: studentRoll,
    rollNo: studentRoll,
    parentEmail: data.parentEmail ? data.parentEmail.trim().toLowerCase() : undefined,
    parentName: data.parentName ? data.parentName.trim() : undefined,
    photoUrl: data.photoUrl,
    isActive: true,
    createdAt: new Date().toISOString(),
    createdById: data.createdById,
  };

  // Parent credentials (username = parent email, password = same as student)
  const pEmail = data.parentEmail.trim().toLowerCase();
  const parentHash = bcrypt.hashSync(studentPassword, 10);
  let parent = db.users.find(
    (u) => u.schoolId === data.schoolId && u.role === "PARENT" && normalizeEmail(u.email) === pEmail
  );

  const cleanParentPhone = data.parentPhone ? cleanPhoneNumber(data.parentPhone) : (data.phone ? cleanPhoneNumber(data.phone) : undefined);

  if (parent) {
    // existing parent → add child (multiple children support)
    parent.childrenIds = [...(parent.childrenIds || []), studentId];
    if (cleanParentPhone && !parent.phone) parent.phone = cleanParentPhone;
  } else {
    const parentId = `user_${Date.now() + 1}`;
    parent = {
      id: parentId,
      schoolId: data.schoolId,
      schoolCode: data.schoolCode,
      role: "PARENT",
      username: pEmail,
      email: pEmail,
      passwordHash: parentHash,
      firstName: titleCaseName((data.parentName || "Parent").trim().split(" ")[0]),
      lastName: (data.parentName || "").trim().split(" ").slice(1).join(" ") || undefined,
      phone: cleanParentPhone,
      childrenIds: [studentId],
      isActive: true,
      createdAt: new Date().toISOString(),
      createdById: data.createdById,
    };
    db.users.push(parent);
  }

  // Ensure class and section exist in school classes table
  if (data.className) {
    const normSec = (data.section || "A").trim().toUpperCase();
    const existingCls = db.classes.find(
      (c) =>
        c.schoolId === data.schoolId &&
        c.isActive &&
        c.name.toLowerCase() === data.className.trim().toLowerCase() &&
        c.section.toLowerCase() === normSec.toLowerCase()
    );
    if (!existingCls) {
      db.classes.push({
        id: `cls_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        schoolId: data.schoolId,
        name: data.className.trim(),
        section: normSec,
        order: db.classes.filter((c) => c.schoolId === data.schoolId).length,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
    }
  }

  db.users.push(student);
  writeDB(db);

  return {
    student,
    parent,
    credentials: {
      student: {
        username: finalStudentUsername,
        password: studentPassword,
        schoolCode: data.schoolCode,
      },
      parent: {
        username: pEmail,
        password: studentPassword,
        schoolCode: data.schoolCode,
        email: pEmail,
      },
    },
  };
}

export function getUsersBySchool(schoolId: string, role?: string) {
  const db = readDB();
  let users = db.users.filter((u) => u.schoolId === schoolId && u.isActive);
  if (role) users = users.filter((u) => u.role === role);
  return users.map(({ passwordHash, ...rest }) => enrichTeacherProfile(rest, db));
}

export function getDashboardStats(schoolId: string) {
  const db = readDB();
  const users = db.users.filter((u) => u.schoolId === schoolId && u.isActive);
  const classes = (db.classes || []).filter((c) => c.schoolId === schoolId && c.isActive);
  const today = todayStr();
  const todayAtt = (db.attendances || []).filter(
    (a) => a.schoolId === schoolId && a.studentId && a.date === today
  );
  const totalStudents = users.filter((u) => u.role === "STUDENT").length;
  const presentCount = todayAtt.filter((a) => a.status === "PRESENT").length;
  const lateCount = todayAtt.filter((a) => a.status === "LATE").length;
  const halfDayCount = todayAtt.filter((a) => a.status === "HALF_DAY").length;
  const absentCount = todayAtt.filter((a) => a.status === "ABSENT").length;
  const presentToday = presentCount + lateCount + halfDayCount;
  const unmarkedCount = Math.max(0, totalStudents - todayAtt.length);
  const rate = totalStudents > 0 ? Math.round(((presentCount + lateCount * 0.8 + halfDayCount * 0.5) / totalStudents) * 100) : 0;

  return {
    totalTeachers: users.filter((u) => u.role === "TEACHER").length,
    totalStudents,
    totalParents: users.filter((u) => u.role === "PARENT").length,
    totalPrincipals: users.filter((u) => u.role === "PRINCIPAL").length,
    totalClasses: classes.length,
    classes: classes.length,
    presentToday,
    presentStudents: presentToday,
    present: presentCount,
    absent: absentCount,
    late: lateCount,
    halfDay: halfDayCount,
    unmarked: unmarkedCount,
    unmarkedStudents: unmarkedCount,
    rate,
    percentage: rate,
    teachers: users.filter((u) => u.role === "TEACHER").slice(0, 5),
    students: users.filter((u) => u.role === "STUDENT").slice(0, 5),
  };
}

// ====================== ATTENDANCE ======================

function todayStr(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Mark attendance for multiple students (class teacher) */
export function markStudentAttendance(data: {
  schoolId: string;
  date?: string;
  records: { studentId: string; status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" }[];
  markedById: string;
}) {
  const db = readDB() as any;
  if (!db.notifications) db.notifications = [];
  const date = data.date || todayStr();
  const results: StoredAttendance[] = [];

  for (const rec of data.records) {
    const existingIdx = db.attendances.findIndex(
      (a: any) => a.studentId === rec.studentId && a.date === date
    );

    const wasNotified = existingIdx >= 0 ? db.attendances[existingIdx].notificationSent : false;
    const entry: StoredAttendance = {
      id: existingIdx >= 0 ? db.attendances[existingIdx].id : `att_${Date.now()}_${rec.studentId}`,
      schoolId: data.schoolId,
      studentId: rec.studentId,
      date,
      status: rec.status,
      markedById: data.markedById,
      markedAt: new Date().toISOString(),
      notificationSent: wasNotified,
    };

    // Leave notification to student + parent when marked ABSENT (once)
    if (rec.status === "ABSENT" && !wasNotified) {
      const student = db.users.find((u: any) => u.id === rec.studentId);
      if (student) {
        const title = "Leave / Absent";
        const body = `${student.firstName} marked absent on ${date}`;
        db.notifications.unshift({
          id: `notif_${Date.now()}_abs_s_${rec.studentId}`,
          schoolId: data.schoolId,
          userId: student.id,
          title,
          body,
          type: "LEAVE",
          meta: { date, studentId: student.id },
          read: false,
          createdAt: new Date().toISOString(),
        });
        if (student.parentEmail) {
          const parent = db.users.find(
            (u: any) =>
              u.role === "PARENT" &&
              u.schoolId === data.schoolId &&
              u.email?.toLowerCase() === student.parentEmail.toLowerCase()
          );
          if (parent) {
            db.notifications.unshift({
              id: `notif_${Date.now()}_abs_p_${parent.id}`,
              schoolId: data.schoolId,
              userId: parent.id,
              title: `Leave: ${student.firstName}`,
              body,
              type: "LEAVE",
              meta: { date, studentId: student.id },
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
        entry.notificationSent = true;
      }
    }

    if (existingIdx >= 0) {
      db.attendances[existingIdx] = entry;
    } else {
      db.attendances.push(entry);
    }
    results.push(entry);
  }

  writeDB(db);
  return results;
}

/** Teacher self check-in (once per day = Present) */
export function teacherCheckIn(data: {
  schoolId: string;
  teacherId: string;
  date?: string;
}) {
  const db = readDB();
  const date = data.date || todayStr();

  const existing = db.attendances.find(
    (a) => a.teacherId === data.teacherId && a.date === date
  );
  if (existing) {
    return { alreadyCheckedIn: true, attendance: existing };
  }

  const entry: StoredAttendance = {
    id: `att_t_${Date.now()}`,
    schoolId: data.schoolId,
    teacherId: data.teacherId,
    date,
    status: "PRESENT",
    markedById: data.teacherId,
    markedAt: new Date().toISOString(),
    notificationSent: false,
  };
  db.attendances.push(entry);
  writeDB(db);
  return { alreadyCheckedIn: false, attendance: entry };
}

/** Get attendance for a class on a date */
export function getClassAttendance(schoolId: string, className: string, section: string | undefined, date?: string) {
  const db = readDB();
  const d = date || todayStr();

  const students = db.users.filter(
    (u) =>
      u.schoolId === schoolId &&
      u.role === "STUDENT" &&
      u.isActive &&
      isExactClassAndSection(u.className, u.section, className, section)
  );

  const result = students.map((s) => {
    const att = db.attendances.find((a) => a.studentId === s.id && a.date === d);
    return {
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      rollNumber: s.rollNumber || s.rollNo || "",
      className: s.className,
      section: s.section,
      gender: s.gender,
      photoUrl: s.photoUrl,
      status: att?.status || null,
      markedAt: att?.markedAt || null,
    };
  });

  // sort A-Z
  result.sort((a, b) => a.firstName.localeCompare(b.firstName));
  return result;
}

/** Get attendance history for one student */
export function getStudentAttendance(studentId: string, fromDate?: string, toDate?: string, schoolId?: string) {
  const db = readDB();
  let list = db.attendances.filter((a) => a.studentId === studentId && (!schoolId || a.schoolId === schoolId));
  if (fromDate) list = list.filter((a) => a.date >= fromDate);
  if (toDate) list = list.filter((a) => a.date <= toDate);
  list.sort((a, b) => b.date.localeCompare(a.date));
  return list;
}

/** Attendance summary for school / class */
export function getAttendanceStats(
  schoolId: string,
  date?: string,
  opts?: { from?: string; to?: string; className?: string; section?: string }
) {
  const db = readDB();
  const d = date || todayStr();
  const className = opts?.className;
  const section = opts?.section;

  let students = db.users.filter((u) => u.schoolId === schoolId && u.role === "STUDENT" && u.isActive);
  if (className) {
    students = students.filter((u) =>
      section ? isExactClassAndSection(u.className, u.section, className, section) : isSameClassAndSection(u.className, u.section, className, section)
    );
  } else if (section) {
    students = students.filter((u) => normalizeSection(u.section) === normalizeSection(section));
  }
  const studentIds = new Set(students.map((s) => s.id));

  const teachers = db.users.filter((u) => u.schoolId === schoolId && u.role === "TEACHER" && u.isActive);

  const matchStudentAtt = (a: any) =>
    a.schoolId === schoolId && a.studentId && studentIds.has(a.studentId);

  // Range series: default to today or custom from-to
  const from = opts?.from || opts?.to || d;
  const to = opts?.to || opts?.from || d;

  const series: { date: string; present: number; absent: number; late: number; unmarked: number }[] = [];
  const [startY, startM, startD] = from.split("-").map(Number);
  const [endY, endM, endD] = to.split("-").map(Number);
  const start = new Date(startY, (startM || 1) - 1, startD || 1);
  const end = new Date(endY, (endM || 1) - 1, endD || 1);
  let totalPresentCount = 0;
  let totalAbsentCount = 0;
  let totalLateCount = 0;
  let totalMarkedRecords = 0;
  let daysCount = 0;

  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    daysCount++;
    const ds = todayStr(cur);
    const dayAtt = db.attendances.filter((a) => matchStudentAtt(a) && a.date === ds);
    const dayPresent = dayAtt.filter((a) => a.status === "PRESENT").length;
    const dayLate = dayAtt.filter((a) => a.status === "LATE").length;
    const dayAbsent = dayAtt.filter((a) => a.status === "ABSENT").length;
    const dayUnmarked = Math.max(0, students.length - dayAtt.length);

    totalPresentCount += dayPresent;
    totalLateCount += dayLate;
    totalAbsentCount += dayAbsent;
    totalMarkedRecords += dayAtt.length;

    series.push({
      date: ds,
      present: dayPresent + dayLate,
      absent: dayAbsent,
      late: dayLate,
      unmarked: dayUnmarked,
    });
  }

  const isSingleDay = from === to;
  const totalExpectedSlots = isSingleDay ? students.length : (students.length * daysCount);
  const totalUnmarked = Math.max(0, totalExpectedSlots - totalMarkedRecords);
  const totalAttended = totalPresentCount + totalLateCount;
  const attendanceRate = totalExpectedSlots > 0 ? Math.round((totalAttended / totalExpectedSlots) * 100) : 0;

  const todayTeacherAtt = db.attendances.filter((a) => a.schoolId === schoolId && a.date === d && a.teacherId);
  const presentTeachers = todayTeacherAtt.filter((a) => (a.status as string) === "PRESENT" || (a.status as string) === "CHECKED_IN").length;

  return {
    date: d,
    from,
    to,
    isSingleDay,
    className: className || null,
    section: section || null,
    totalStudents: students.length,
    totalTeachers: teachers.length,
    presentStudents: totalPresentCount,
    absentStudents: totalAbsentCount,
    lateStudents: totalLateCount,
    unmarkedStudents: totalUnmarked,
    present: totalPresentCount,
    absent: totalAbsentCount,
    late: totalLateCount,
    unmarked: totalUnmarked,
    total: totalExpectedSlots,
    percentage: attendanceRate,
    rate: attendanceRate,
    presentTeachers,
    series,
    last30Days: series,
    last3Days: series.slice(-3),
  };
}

/** Get absents that need leave notification (not yet sent) */
export function getPendingLeaveNotifications(schoolId: string, date?: string) {
  const db = readDB();
  const d = date || todayStr();

  const absents = db.attendances.filter(
    (a) => a.schoolId === schoolId && a.date === d && a.status === "ABSENT" && a.studentId && !a.notificationSent
  );

  return absents.map((a) => {
    const student = db.users.find((u) => u.id === a.studentId);
    const parent = student?.parentEmail
      ? db.users.find((u) => u.role === "PARENT" && u.email === student.parentEmail)
      : null;
    return {
      id: a.id,
      date: a.date,
      attendanceId: a.id,
      studentId: a.studentId,
      studentName: student ? `${student.firstName} ${student.lastName || ""}`.trim() : "",
      className: student?.className,
      section: student?.section,
      photoUrl: student?.photoUrl,
      parentEmail: student?.parentEmail,
      parentId: parent?.id,
    };
  });
}

/** Mark leave notifications as sent */
export function markNotificationsSent(attendanceIds: string[]) {
  const db = readDB();
  for (const id of attendanceIds) {
    const att = db.attendances.find((a) => a.id === id);
    if (att) att.notificationSent = true;
  }
  writeDB(db);
}

/** Export attendance records for CSV/JSON */
export function exportAttendance(params: {
  schoolId: string;
  className?: string;
  section?: string;
  fromDate?: string;
  toDate?: string;
  studentId?: string;
  status?: string;
}) {
  const db = readDB();
  let records = db.attendances.filter(
    (a) => a.schoolId === params.schoolId && a.studentId
  );

  if (params.fromDate) records = records.filter((a) => a.date >= params.fromDate!);
  if (params.toDate) records = records.filter((a) => a.date <= params.toDate!);
  if (params.studentId) records = records.filter((a) => a.studentId === params.studentId);
  if (params.status && params.status !== "ALL") records = records.filter((a) => a.status === params.status);

  const rows = records.map((a) => {
    const student = db.users.find((u) => u.id === a.studentId);
    // filter by class/section if provided
    if (params.className && !isExactClassAndSection(student?.className, student?.section, params.className, params.section)) return null;
    if (params.section && student?.section !== params.section) return null;

    return {
      date: a.date,
      studentId: a.studentId,
      studentName: student ? `${student.firstName} ${student.lastName || ""}`.trim() : "",
      rollNumber: (student as any)?.rollNumber || (student as any)?.rollNo || "",
      rollNo: (student as any)?.rollNumber || (student as any)?.rollNo || "",
      username: student?.username || "",
      className: student?.className || "",
      section: student?.section || "",
      photoUrl: student?.photoUrl || null,
      status: a.status,
      remarks: a.remarks || "",
      markedAt: a.markedAt,
      notificationSent: a.notificationSent,
      parentName: student?.parentName || "",
      parentEmail: student?.parentEmail || "",
      parentPhone: student?.phone || "",
    };
  }).filter(Boolean) as {
    date: string;
    studentId?: string;
    studentName: string;
    rollNumber?: string;
    username?: string;
    className: string;
    section: string;
    photoUrl?: string | null;
    status: string;
    remarks?: string;
    markedAt: string;
    notificationSent: boolean;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
  }[];

  rows.sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return a.studentName.localeCompare(b.studentName);
  });

  return rows;
}


/** Teacher check-in report for principal/admin */
export function getTeacherCheckInReport(
  schoolId: string,
  opts?: { date?: string; from?: string; to?: string }
) {
  const db = readDB();
  const teachers = db.users.filter(
    (u) => u.schoolId === schoolId && u.role === "TEACHER" && u.isActive
  );
  const day = opts?.date || todayStr();
  const from = opts?.from || day;
  const to = opts?.to || day;

  // Map class teacher labels
  const mappings = (db as any).teacherClasses || (db as any).teacher_classes || [];
  const classLabelFor = (teacherId: string) => {
    const maps = mappings.filter((m: any) => m.teacherId === teacherId);
    if (maps.length) {
      return maps
        .map((m: any) => `${m.className || ""}${m.section ? "-" + m.section : ""}${m.role === "CLASS_TEACHER" ? " (CT)" : ""}`)
        .join(", ");
    }
    const t = teachers.find((x) => x.id === teacherId);
    if (t?.className) return `${t.className}${t.section ? "-" + t.section : ""}`;
    return "";
  };

  // Today snapshot
  const todayAtt = db.attendances.filter(
    (a) => a.schoolId === schoolId && a.teacherId && a.date === day
  );
  const checkedIds = new Set(todayAtt.map((a) => a.teacherId!));
  const checkedInToday = teachers.filter((t) => checkedIds.has(t.id)).length;
  const notCheckedInToday = Math.max(0, teachers.length - checkedInToday);

  const teachersToday = teachers.map((t) => {
    const att = todayAtt.find((a) => a.teacherId === t.id);
    return {
      id: t.id,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
      education: t.education,
      photoUrl: t.photoUrl,
      teacherType: t.teacherType,
      classLabel: classLabelFor(t.id),
      checkedIn: !!att,
      status: att?.status || "NOT_CHECKED_IN",
      markedAt: att?.markedAt || null,
    };
  });

  // Range records (one row per teacher per day that has attendance, plus not checked optional)
  const records: {
    date: string;
    teacherId: string;
    teacherName: string;
    email: string;
    phone: string;
    education: string;
    classLabel: string;
    status: string;
    markedAt: string | null;
  }[] = [];

  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  const series: { date: string; checkedIn: number; notCheckedIn: number }[] = [];

  for (let cur = new Date(start); cur <= end; cur.setDate(cur.getDate() + 1)) {
    const ds = cur.toISOString().slice(0, 10);
    const dayAtt = db.attendances.filter(
      (a) => a.schoolId === schoolId && a.teacherId && a.date === ds
    );
    const ids = new Set(dayAtt.map((a) => a.teacherId!));
    series.push({
      date: ds,
      checkedIn: ids.size,
      notCheckedIn: Math.max(0, teachers.length - ids.size),
    });
    for (const t of teachers) {
      const att = dayAtt.find((a) => a.teacherId === t.id);
      if (att) {
        records.push({
          date: ds,
          teacherId: t.id,
          teacherName: `${t.firstName} ${t.lastName || ""}`.trim(),
          email: t.email,
          phone: t.phone || "",
          education: t.education || "",
          classLabel: classLabelFor(t.id),
          status: att.status,
          markedAt: att.markedAt || null,
        });
      }
    }
  }

  return {
    date: day,
    from,
    to,
    totalTeachers: teachers.length,
    checkedInToday,
    notCheckedInToday,
    teachers: teachersToday,
    series,
    records,
  };
}

export function teacherCheckInToExcelXML(
  records: Array<{
    date: string;
    teacherName: string;
    email: string;
    phone: string;
    education: string;
    classLabel: string;
    status: string;
    markedAt: string | null;
  }>,
  meta?: { schoolName?: string; from?: string; to?: string }
): string {
  const schoolName = meta?.schoolName || "MySchool Platform";
  const from = meta?.from || "";
  const to = meta?.to || "";

  const total = records.length;
  const checkedInCount = records.filter((r) => r.status === "CHECKED_IN" || r.status === "PRESENT").length;
  const notCheckedInCount = total - checkedInCount;
  const rate = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

  const xmlEsc = (s: any) =>
    s === null || s === undefined
      ? ""
      : String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#475569" ss:Bold="1"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaValue">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiHead">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#64748B" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiPres">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#059669" ss:Bold="1"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiAbs">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#DC2626" ss:Bold="1"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiRate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#4F46E5" ss:Bold="1"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRow">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="DataRowAlt">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatPres">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#059669" ss:Bold="1"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatAbs">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#DC2626" ss:Bold="1"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Teacher Check-In Report">
  <Table ss:ExpandedColumnCount="8" ss:ExpandedRowCount="${records.length + 20}" x:FullColumns="1" ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="85"/>
   <Column ss:Width="160"/>
   <Column ss:Width="150"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="90"/>
   <Column ss:Width="80"/>
   <Row ss:Height="30">
    <Cell ss:MergeAcross="7" ss:StyleID="HeaderTitle"><Data ss:Type="String">  ${xmlEsc(schoolName)} - Teacher Check-In Report</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Date Range:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MetaValue"><Data ss:Type="String">${xmlEsc(from)} to ${xmlEsc(to)}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Generated:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MetaValue"><Data ss:Type="String">${new Date().toLocaleString()}</Data></Cell>
   </Row>
   <Row ss:Height="8"/>
   <Row ss:Height="18">
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">TOTAL RECORDS</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">CHECKED IN</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">NOT CHECKED IN</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">CHECK-IN RATE</Data></Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="KpiRate"><Data ss:Type="Number">${total}</Data></Cell>
    <Cell ss:StyleID="KpiPres"><Data ss:Type="Number">${checkedInCount}</Data></Cell>
    <Cell ss:StyleID="KpiAbs"><Data ss:Type="Number">${notCheckedInCount}</Data></Cell>
    <Cell ss:StyleID="KpiRate"><Data ss:Type="String">${rate}%</Data></Cell>
   </Row>
   <Row ss:Height="10"/>
   <Row ss:Height="22">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Teacher Name</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Email</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Phone</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Class / Section</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Time</Data></Cell>
   </Row>
   ${records
     .map((r, i) => {
       const rowStyle = i % 2 === 0 ? "DataRow" : "DataRowAlt";
       const isCheckedIn = r.status === "CHECKED_IN" || r.status === "PRESENT";
       const statusStyle = isCheckedIn ? "StatPres" : "StatAbs";
       const statusText = isCheckedIn ? "Checked In" : "Not Checked In";

       return `<Row ss:Height="20">
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.date)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.teacherName)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.email)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.phone)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.classLabel)}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${xmlEsc(statusText)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.markedAt ? r.markedAt.slice(11, 16) : "")}</Data></Cell>
   </Row>`;
     })
     .join("\n")}
  </Table>
 </Worksheet>
</Workbook>`;
}

export function attendanceToCSV(rows: ReturnType<typeof exportAttendance>): string {
  const header = [
    "Date",
    "Student Name",
    "Roll Number",
    "Username",
    "Class",
    "Section",
    "Status",
    "Remarks",
    "Marked At",
    "Leave Notified",
    "Parent Name",
    "Parent Email",
    "Parent Phone",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.date,
        `"${(r.studentName || "").replace(/"/g, '""')}"`,
        `"${(r.rollNumber || "").replace(/"/g, '""')}"`,
        `"${(r.username || "").replace(/"/g, '""')}"`,
        `"${(r.className || "").replace(/"/g, '""')}"`,
        `"${(r.section || "").replace(/"/g, '""')}"`,
        r.status,
        `"${(r.remarks || "").replace(/"/g, '""')}"`,
        r.markedAt || "",
        r.notificationSent ? "Yes" : "No",
        `"${(r.parentName || "").replace(/"/g, '""')}"`,
        `"${(r.parentEmail || "").replace(/"/g, '""')}"`,
        `"${(r.parentPhone || "").replace(/"/g, '""')}"`,
      ].join(",")
    );
  }
  return "\uFEFF" + lines.join("\n"); // Include UTF-8 BOM for Excel compatibility
}

export function attendanceToExcelXML(
  rows: ReturnType<typeof exportAttendance>,
  meta?: { schoolName?: string; from?: string; to?: string; className?: string; section?: string; status?: string }
): string {
  const schoolName = meta?.schoolName || "MySchool Platform";
  const from = meta?.from || (rows.length ? rows[rows.length - 1].date : "");
  const to = meta?.to || (rows.length ? rows[0].date : "");
  const className = meta?.className || "All";
  const section = meta?.section || "All";
  const status = meta?.status || "All";

  const total = rows.length;
  const presentCount = rows.filter((r) => r.status === "PRESENT").length;
  const absentCount = rows.filter((r) => r.status === "ABSENT").length;
  const lateCount = rows.filter((r) => r.status === "LATE").length;
  const halfDayCount = rows.filter((r) => r.status === "HALF_DAY").length;
  const rate = total > 0 ? Math.round(((presentCount + lateCount * 0.5) / total) * 100) : 0;

  const xmlEsc = (s: any) =>
    s === null || s === undefined
      ? ""
      : String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="16" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#475569" ss:Bold="1"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaValue">
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiHead">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#64748B" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiPres">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#059669" ss:Bold="1"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiAbs">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#DC2626" ss:Bold="1"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiRate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#4F46E5" ss:Bold="1"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRow">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="DataRowAlt">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatPres">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#059669" ss:Bold="1"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatAbs">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#DC2626" ss:Bold="1"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatLate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#D97706" ss:Bold="1"/>
   <Interior ss:Color="#FFFBEB" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Attendance Report">
  <Table ss:ExpandedColumnCount="10" ss:ExpandedRowCount="${rows.length + 20}" x:FullColumns="1" ss:DefaultRowHeight="20">
    <Column ss:Width="40"/>
    <Column ss:Width="85"/>
    <Column ss:Width="160"/>
    <Column ss:Width="70"/>
    <Column ss:Width="70"/>
    <Column ss:Width="60"/>
    <Column ss:Width="85"/>
    <Column ss:Width="70"/>
    <Column ss:Width="130"/>
    <Column ss:Width="160"/>
    <Row ss:Height="30">
     <Cell ss:MergeAcross="9" ss:StyleID="HeaderTitle"><Data ss:Type="String">  ${xmlEsc(schoolName)} - Student Attendance Report</Data></Cell>
    </Row>
    <Row ss:Height="20">
     <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Date Range:</Data></Cell>
     <Cell ss:MergeAcross="2" ss:StyleID="MetaValue"><Data ss:Type="String">${xmlEsc(from)} to ${xmlEsc(to)}</Data></Cell>
     <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Generated:</Data></Cell>
     <Cell ss:MergeAcross="4" ss:StyleID="MetaValue"><Data ss:Type="String">${new Date().toLocaleString()}</Data></Cell>
    </Row>
    <Row ss:Height="20">
     <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Class/Section:</Data></Cell>
     <Cell ss:MergeAcross="2" ss:StyleID="MetaValue"><Data ss:Type="String">${xmlEsc(className)} ${xmlEsc(section ? `(Sec ${section})` : "")}</Data></Cell>
     <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Status Filter:</Data></Cell>
     <Cell ss:MergeAcross="4" ss:StyleID="MetaValue"><Data ss:Type="String">${xmlEsc(status)}</Data></Cell>
    </Row>
   <Row ss:Height="8"/>
   <Row ss:Height="18">
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">TOTAL</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">PRESENT</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">ABSENT</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">LATE</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">HALF DAY</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">RATE (%)</Data></Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="KpiRate"><Data ss:Type="Number">${total}</Data></Cell>
    <Cell ss:StyleID="KpiPres"><Data ss:Type="Number">${presentCount}</Data></Cell>
    <Cell ss:StyleID="KpiAbs"><Data ss:Type="Number">${absentCount}</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="Number">${lateCount}</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="Number">${halfDayCount}</Data></Cell>
    <Cell ss:StyleID="KpiRate"><Data ss:Type="String">${rate}%</Data></Cell>
   </Row>
   <Row ss:Height="10"/>
   <Row ss:Height="22">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Student Name</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Roll No</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Class</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Section</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Time</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Remarks</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Parent Contact</Data></Cell>
   </Row>
   ${rows
     .map((r, i) => {
       const rowStyle = i % 2 === 0 ? "DataRow" : "DataRowAlt";
       let statusStyle = rowStyle;
       if (r.status === "PRESENT") statusStyle = "StatPres";
       else if (r.status === "ABSENT") statusStyle = "StatAbs";
       else if (r.status === "LATE") statusStyle = "StatLate";

       const parentContact = [r.parentName, r.parentPhone || r.parentEmail].filter(Boolean).join(" - ");

       return `<Row ss:Height="20">
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.date)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.studentName)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.rollNumber || (r as any).rollNo || "")}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.className)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.section)}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${xmlEsc(r.status)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.markedAt ? r.markedAt.slice(11, 16) : "")}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.remarks || "")}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(parentContact)}</Data></Cell>
   </Row>`;
     })
     .join("\n")}
  </Table>
 </Worksheet>
</Workbook>`;
}

// ====================== CLASSES ======================

export function syncClassTeacherAssignment(opts: {
  schoolId: string;
  className: string;
  section: string;
  newTeacherId?: string;
  oldTeacherId?: string;
  transferData?: boolean;
}) {
  const db = readDB() as any;
  const { schoolId, className, section, newTeacherId, oldTeacherId, transferData = true } = opts;
  const cleanName = (className || "").trim();
  const cleanSection = (section || "A").trim().toUpperCase();

  // 1. Find matching class in db.classes
  const cls = (db.classes || []).find(
    (c: any) =>
      c.schoolId === schoolId &&
      c.isActive !== false &&
      isSameClassAndSection(c.name, c.section, cleanName, cleanSection)
  );

  const prevClassTeacherId = oldTeacherId || cls?.classTeacherId;

  // 2. Transfer data if needed
  if (prevClassTeacherId && prevClassTeacherId !== newTeacherId) {
    if (newTeacherId) {
      transferClassTeacherData(schoolId, cleanName, cleanSection, prevClassTeacherId, newTeacherId, transferData);
    }
  }

  // 3. Update class record in db.classes
  if (cls) {
    cls.classTeacherId = newTeacherId || undefined;
  }

  // 4. Clean up ALL other teachers who had CLASS_TEACHER for this class in db.teacherClasses
  if (db.teacherClasses) {
    db.teacherClasses = db.teacherClasses.filter((t: any) => {
      if (
        t.schoolId === schoolId &&
        isSameClassAndSection(t.className, t.section, cleanName, cleanSection) &&
        t.role === "CLASS_TEACHER" &&
        (!newTeacherId || t.teacherId !== newTeacherId)
      ) {
        return false;
      }
      return true;
    });
  }

  // 5. For ALL teachers in the school, sync their user profile against db.classes
  (db.users || []).forEach((u: any) => {
    if (u.schoolId === schoolId && u.role === "TEACHER") {
      const assignedCtClass = (db.classes || []).find(
        (c: any) => c.schoolId === schoolId && c.isActive !== false && c.classTeacherId === u.id
      );

      if (assignedCtClass) {
        u.teacherType = "CLASS_TEACHER";
        u.className = assignedCtClass.name;
        u.section = assignedCtClass.section;
      } else {
        u.teacherType = "SUBJECT_TEACHER";
        if (isSameClassAndSection(u.className, u.section, cleanName, cleanSection)) {
          u.className = undefined;
          u.section = undefined;
        }
      }
    }
  });

  // 6. Ensure the new teacher has CLASS_TEACHER in db.teacherClasses and user profile
  if (newTeacherId) {
    const newTeacherUser = (db.users || []).find((u: any) => u.id === newTeacherId);
    if (newTeacherUser) {
      newTeacherUser.teacherType = "CLASS_TEACHER";
      newTeacherUser.className = cls ? cls.name : cleanName;
      newTeacherUser.section = cls ? cls.section : cleanSection;
    }

    if (!db.teacherClasses) db.teacherClasses = [];
    const existingMapping = db.teacherClasses.find(
      (t: any) =>
        t.schoolId === schoolId &&
        t.teacherId === newTeacherId &&
        isSameClassAndSection(t.className, t.section, cleanName, cleanSection)
    );
    if (existingMapping) {
      existingMapping.role = "CLASS_TEACHER";
      existingMapping.className = cls ? cls.name : cleanName;
      existingMapping.section = cls ? cls.section : cleanSection;
    } else {
      db.teacherClasses.push({
        id: `tc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        schoolId,
        teacherId: newTeacherId,
        className: cls ? cls.name : cleanName,
        section: cls ? cls.section : cleanSection,
        role: "CLASS_TEACHER",
        createdAt: new Date().toISOString(),
      });
    }
  }

  writeDB(db);
}

export function createClass(data: {
  schoolId: string;
  name: string;
  section: string;
  classTeacherId?: string;
  order?: number;
}) {
  const db = readDB();
  const cleanName = data.name.trim();
  const cleanSection = (data.section || "A").trim().toUpperCase();

  const existing = db.classes.find(
    (c) =>
      c.schoolId === data.schoolId &&
      c.isActive &&
      isExactClassAndSection(c.name, c.section, cleanName, cleanSection)
  );
  if (existing) {
    throw new Error(`Class ${cleanName}-${cleanSection} already exists`);
  }

  const cls: StoredClass = {
    id: `cls_${Date.now()}`,
    schoolId: data.schoolId,
    name: cleanName,
    section: cleanSection,
    classTeacherId: data.classTeacherId || undefined,
    order: data.order ?? 0,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  db.classes.push(cls);
  writeDB(db);

  if (data.classTeacherId) {
    syncClassTeacherAssignment({
      schoolId: data.schoolId,
      className: cleanName,
      section: cleanSection,
      newTeacherId: data.classTeacherId,
    });
  }

  return cls;
}

export function ensureClass(schoolId: string, className: string, section: string = "A") {
  const db = readDB();
  const normName = (className || "").trim();
  const normSec = (section || "A").trim().toUpperCase();
  if (!normName) return null;

  let existing = db.classes.find(
    (c) =>
      c.schoolId === schoolId &&
      c.isActive &&
      isExactClassAndSection(c.name, c.section, normName, normSec)
  );

  if (!existing) {
    existing = db.classes.find(
      (c) =>
        c.schoolId === schoolId &&
        c.isActive &&
        isSameClassAndSection(c.name, c.section, normName, normSec)
    );
  }

  if (!existing) {
    const cls: StoredClass = {
      id: `cls_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      schoolId,
      name: normName,
      section: normSec,
      order: db.classes.filter((c) => c.schoolId === schoolId).length,
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    db.classes.push(cls);
    writeDB(db);
    return cls;
  }
  return existing;
}

export function transferClassTeacherData(
  schoolId: string,
  className: string,
  section: string,
  oldTeacherId: string,
  newTeacherId?: string,
  transferData: boolean = true
) {
  if (!oldTeacherId || oldTeacherId === newTeacherId) return;
  const db = readDB() as any;

  const newTeacher = newTeacherId ? (db.users || []).find((u: any) => u.id === newTeacherId) : null;
  const newTeacherName = newTeacher
    ? `${newTeacher.firstName} ${newTeacher.lastName || ""}`.trim()
    : "Teacher";

  if (transferData && newTeacherId) {
    // 1. Transfer Homeworks to new class teacher
    if (db.homeworks) {
      db.homeworks.forEach((h: any) => {
        if (
          h.schoolId === schoolId &&
          isExactClassAndSection(h.className, h.section, className, section) &&
          h.createdById === oldTeacherId
        ) {
          h.createdById = newTeacherId;
          h.createdByName = newTeacherName;
        }
      });
    }

    // 2. Transfer Exams & Tests to new class teacher
    if (db.exams) {
      db.exams.forEach((e: any) => {
        if (
          e.schoolId === schoolId &&
          isExactClassAndSection(e.className, e.section, className, section) &&
          e.createdById === oldTeacherId
        ) {
          e.createdById = newTeacherId;
        }
      });
    }

    // 3. Transfer Marks entry ownership
    if (db.marks && db.exams) {
      const examIds = new Set(
        db.exams
          .filter(
            (e: any) =>
              e.schoolId === schoolId &&
              isExactClassAndSection(e.className, e.section, className, section)
          )
          .map((e: any) => e.id)
      );
      db.marks.forEach((m: any) => {
        if (examIds.has(m.examId) && m.enteredById === oldTeacherId) {
          m.enteredById = newTeacherId;
        }
      });
    }

    // 4. Transfer Attendance marked by old teacher for students in this class
    if (db.attendances && db.users) {
      const studentIds = new Set(
        db.users
          .filter(
            (u: any) =>
              u.schoolId === schoolId &&
              u.role === "STUDENT" &&
              isExactClassAndSection(u.className, u.section, className, section)
          )
          .map((u: any) => u.id)
      );
      db.attendances.forEach((a: any) => {
        if (a.schoolId === schoolId && a.studentId && studentIds.has(a.studentId) && a.markedById === oldTeacherId) {
          a.markedById = newTeacherId;
        }
      });
    }
  } else {
    // If not transferring: archive old teacher's homeworks and exams for this class
    if (db.homeworks) {
      db.homeworks.forEach((h: any) => {
        if (
          h.schoolId === schoolId &&
          isExactClassAndSection(h.className, h.section, className, section) &&
          h.createdById === oldTeacherId
        ) {
          h.createdById = `archived_${oldTeacherId}`;
        }
      });
    }
    if (db.exams) {
      db.exams.forEach((e: any) => {
        if (
          e.schoolId === schoolId &&
          isExactClassAndSection(e.className, e.section, className, section) &&
          e.createdById === oldTeacherId
        ) {
          e.createdById = `archived_${oldTeacherId}`;
        }
      });
    }
  }

  writeDB(db);
}

export function mapClassTeacher(classId: string, teacherId: string, transferData: boolean = true) {
  const db = readDB() as any;
  const cls = (db.classes || []).find((c: any) => c.id === classId);
  if (!cls) throw new Error("Class not found");

  syncClassTeacherAssignment({
    schoolId: cls.schoolId,
    className: cls.name,
    section: cls.section,
    newTeacherId: teacherId,
    oldTeacherId: cls.classTeacherId,
    transferData,
  });

  return cls;
}

export function getClasses(schoolId: string) {
  const db = readDB();
  const classes = db.classes
    .filter((c) => c.schoolId === schoolId && c.isActive)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name) || a.section.localeCompare(b.section));

  return classes.map((c) => {
    const teacher = c.classTeacherId ? db.users.find((u) => u.id === c.classTeacherId) : null;
    const studentCount = db.users.filter(
      (u) =>
        u.schoolId === schoolId &&
        u.role === "STUDENT" &&
        u.isActive &&
        isExactClassAndSection(u.className, u.section, c.name, c.section)
    ).length;
    return {
      ...c,
      classTeacherName: teacher ? `${teacher.firstName} ${teacher.lastName || ""}`.trim() : null,
      studentCount,
    };
  });
}

export function getClassById(classId: string) {
  const db = readDB();
  return db.classes.find((c) => c.id === classId) || null;
}

export function updateClass(
  classId: string,
  schoolId: string,
  data: {
    name: string;
    section: string;
    classTeacherId?: string;
    transferData?: boolean;
  }
) {
  const db = readDB() as any;
  const cls = (db.classes || []).find((c: any) => c.id === classId && c.schoolId === schoolId);
  if (!cls) throw new Error("Class not found");

  const cleanName = data.name.trim();
  const cleanSection = data.section.trim().toUpperCase();

  // Validate duplicate
  const duplicate = (db.classes || []).find(
    (c: any) =>
      c.id !== classId &&
      c.schoolId === schoolId &&
      c.isActive &&
      isExactClassAndSection(c.name, c.section, cleanName, cleanSection)
  );
  if (duplicate) {
    throw new Error(`Class ${cleanName}-${cleanSection} already exists`);
  }

  const oldName = cls.name;
  const oldSection = cls.section;
  const oldTeacherId = cls.classTeacherId;
  const transferData = data.transferData !== false;

  cls.name = cleanName;
  cls.section = cleanSection;

  if (data.classTeacherId !== undefined) {
    const newTeacherId = data.classTeacherId || undefined;
    syncClassTeacherAssignment({
      schoolId,
      className: cleanName,
      section: cleanSection,
      newTeacherId,
      oldTeacherId,
      transferData,
    });
  }

  // Update teacherClasses mappings that had the old class/section
  if (db.teacherClasses) {
    db.teacherClasses.forEach((t: any) => {
      if (t.schoolId === schoolId && isExactClassAndSection(t.className, t.section, oldName, oldSection)) {
        t.className = cleanName;
        t.section = cleanSection;
      }
    });
  }

  // Update students that were in old class/section
  if (db.users) {
    db.users.forEach((u: any) => {
      if (u.schoolId === schoolId && u.role === "STUDENT" && isExactClassAndSection(u.className, u.section, oldName, oldSection)) {
        u.className = cleanName;
        u.section = cleanSection;
      }
    });
  }

  writeDB(db);
  return cls;
}

export async function deleteClass(classId: string, schoolId: string) {
  const db = readDB() as any;
  const clsIndex = (db.classes || []).findIndex((c: any) => c.id === classId && c.schoolId === schoolId);
  if (clsIndex === -1) throw new Error("Class not found");
  const cls = db.classes[clsIndex];
  const className = cls.name;
  const section = cls.section;

  // 1. Remove teacherClasses mappings for this class (both CLASS_TEACHER and SUBJECT_TEACHER)
  if (db.teacherClasses) {
    db.teacherClasses = db.teacherClasses.filter(
      (t: any) => !(t.schoolId === schoolId && isExactClassAndSection(t.className, t.section, className, section))
    );
  }

  // 2. For all teachers in school, if their assigned className was this class, reset
  (db.users || []).forEach((u: any) => {
    if (u.schoolId === schoolId && u.role === "TEACHER") {
      if (isExactClassAndSection(u.className, u.section, className, section)) {
        u.className = undefined;
        u.section = undefined;
      }
      const remainingCtClass = (db.classes || []).find(
        (c: any) => c.schoolId === schoolId && c.id !== classId && c.isActive !== false && c.classTeacherId === u.id
      );
      if (remainingCtClass) {
        u.teacherType = "CLASS_TEACHER";
        u.className = remainingCtClass.name;
        u.section = remainingCtClass.section;
      } else {
        const remainingCtMapping = (db.teacherClasses || []).some(
          (t: any) => t.schoolId === schoolId && t.teacherId === u.id && t.role === "CLASS_TEACHER"
        );
        if (!remainingCtMapping) {
          u.teacherType = "SUBJECT_TEACHER";
        }
      }
    }
  });

  // 3. Clear className & section for students enrolled in this deleted class
  if (db.users) {
    db.users.forEach((u: any) => {
      if (
        u.schoolId === schoolId &&
        u.role === "STUDENT" &&
        isExactClassAndSection(u.className, u.section, className, section)
      ) {
        u.className = "";
        u.section = "";
      }
    });
  }

  // 4. Delete from database
  db.classes.splice(clsIndex, 1);

  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.teacherClass.deleteMany({
        where: {
          schoolId,
          className,
          ...(section ? { section } : {}),
        },
      }).catch(() => {});
      await prisma.class.deleteMany({
        where: { id: classId, schoolId },
      });
    } catch (err: any) {
      console.error("[deleteClass Postgres Error]:", err?.message);
    }
  }

  return { success: true };
}

// ====================== USER UPDATE / DELETE ======================

export function updateUser(userId: string, data: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  photoUrl: string;
  gender: string;
  education: string;
  className: string;
  section: string;
  rollNumber: string;
  rollNo: string;
  teacherType: "CLASS_TEACHER" | "SUBJECT_TEACHER";
  parentName: string;
  parentEmail: string;
  dateOfBirth: string;
}>) {
  const db = readDB() as any;
  const user = (db.users || []).find((u: any) => u.id === userId);
  if (!user) throw new Error("User not found");

  const oldParentEmail = user.parentEmail ? user.parentEmail.trim().toLowerCase() : undefined;

  // Validation rules for email and phone on update
  if (user.role === "ADMIN") {
    if (data.email !== undefined && data.email.trim()) {
      const normEmail = normalizeEmail(data.email);
      if (normEmail !== normalizeEmail(user.email)) {
        const dupSchool = (db.schools || []).find(
          (s: any) => s.id !== user.schoolId && normalizeEmail(s.email) === normEmail
        );
        if (dupSchool) throw new Error("School with this email already exists.");
        const dupAdmin = (db.users || []).find(
          (u: any) =>
            u.role === "ADMIN" &&
            u.id !== userId &&
            u.isActive &&
            normalizeEmail(u.email) === normEmail
        );
        if (dupAdmin) throw new Error("An admin account with this email already exists.");
      }
    }
    if (data.phone !== undefined && data.phone.trim()) {
      if (!isSamePhone(user.phone, data.phone)) {
        const dupSchoolPhone = (db.schools || []).find(
          (s: any) => s.id !== user.schoolId && s.phone && isSamePhone(s.phone, data.phone)
        );
        if (dupSchoolPhone) throw new Error("School with this phone number already exists.");
        const dupAdminPhone = (db.users || []).find(
          (u: any) =>
            u.role === "ADMIN" &&
            u.id !== userId &&
            u.isActive &&
            u.phone &&
            isSamePhone(u.phone, data.phone)
        );
        if (dupAdminPhone) throw new Error("An admin account with this phone number already exists.");
      }
    }
  } else if (user.role === "PRINCIPAL") {
    if (data.email !== undefined && data.email.trim()) {
      const normEmail = normalizeEmail(data.email);
      if (normEmail !== normalizeEmail(user.email)) {
        const dup = (db.users || []).find(
          (u: any) =>
            u.schoolId === user.schoolId &&
            u.role === "PRINCIPAL" &&
            u.id !== userId &&
            u.isActive &&
            normalizeEmail(u.email) === normEmail
        );
        if (dup) throw new Error("Principal with this email already exists in this school.");
      }
    }
    if (data.phone !== undefined && data.phone.trim()) {
      if (!isSamePhone(user.phone, data.phone)) {
        const dup = (db.users || []).find(
          (u: any) =>
            u.schoolId === user.schoolId &&
            u.role === "PRINCIPAL" &&
            u.id !== userId &&
            u.isActive &&
            isSamePhone(u.phone, data.phone)
        );
        if (dup) throw new Error("Principal with this phone number already exists in this school.");
      }
    }
  } else if (user.role === "TEACHER") {
    if (data.email !== undefined && data.email.trim()) {
      const normEmail = normalizeEmail(data.email);
      if (normEmail !== normalizeEmail(user.email)) {
        const dup = (db.users || []).find(
          (u: any) =>
            u.schoolId === user.schoolId &&
            u.role === "TEACHER" &&
            u.id !== userId &&
            u.isActive &&
            normalizeEmail(u.email) === normEmail
        );
        if (dup) throw new Error("Teacher with this email already exists in this school.");
      }
    }
    if (data.phone !== undefined && data.phone.trim()) {
      if (!isSamePhone(user.phone, data.phone)) {
        const dup = (db.users || []).find(
          (u: any) =>
            u.schoolId === user.schoolId &&
            u.role === "TEACHER" &&
            u.id !== userId &&
            u.isActive &&
            isSamePhone(u.phone, data.phone)
        );
        if (dup) throw new Error("Teacher with this phone number already exists in this school.");
      }
    }
  } else if (user.role === "STUDENT") {
    const effEmail = data.email !== undefined ? data.email : user.email;
    const effParentEmail = data.parentEmail !== undefined ? data.parentEmail : user.parentEmail;
    if (effEmail && effParentEmail && !effEmail.includes("@student.local")) {
      if (normalizeEmail(effEmail) === normalizeEmail(effParentEmail)) {
        throw new Error("Student email and Parent email cannot be the same.");
      }
    }
    if (data.email !== undefined && data.email.trim() && !data.email.includes("@student.local")) {
      const normStEmail = normalizeEmail(data.email);
      if (normStEmail !== normalizeEmail(user.email)) {
        const dup = (db.users || []).find(
          (u: any) =>
            u.schoolId === user.schoolId &&
            u.role === "STUDENT" &&
            u.id !== userId &&
            u.isActive &&
            !u.email?.includes("@student.local") &&
            normalizeEmail(u.email) === normStEmail
        );
        if (dup) throw new Error("Student with this email already exists in this school.");
      }
    }
  }

  if (data.firstName !== undefined) user.firstName = data.firstName;
  if (data.lastName !== undefined) user.lastName = data.lastName;
  if (data.email !== undefined) user.email = data.email.trim();
  if (data.phone !== undefined) user.phone = data.phone;
  if (data.photoUrl !== undefined) user.photoUrl = data.photoUrl;
  if (data.gender !== undefined) user.gender = data.gender;
  if (data.education !== undefined) user.education = data.education;
  if (data.rollNumber !== undefined || data.rollNo !== undefined) {
    const rVal = (data.rollNumber !== undefined ? data.rollNumber : data.rollNo || "").trim() || undefined;
    user.rollNumber = rVal;
    user.rollNo = rVal;
  }
  if (data.parentName !== undefined) user.parentName = data.parentName ? data.parentName.trim() : undefined;
  if (data.parentEmail !== undefined) user.parentEmail = data.parentEmail ? data.parentEmail.trim().toLowerCase() : undefined;
  if (data.dateOfBirth !== undefined) user.dateOfBirth = data.dateOfBirth;

  if (user.role === "TEACHER") {
    const oldTeacherType = user.teacherType;
    if (data.teacherType !== undefined) {
      user.teacherType = data.teacherType;
    }
    if (data.className !== undefined) {
      user.className = data.className ? data.className.trim() : undefined;
    }
    if (data.section !== undefined) {
      user.section = data.section ? data.section.trim().toUpperCase() : undefined;
    }

    if (data.teacherType === "SUBJECT_TEACHER" && oldTeacherType === "CLASS_TEACHER") {
      if (db.teacherClasses) {
        db.teacherClasses = db.teacherClasses.filter(
          (t: any) => !(t.schoolId === user.schoolId && t.teacherId === userId && t.role === "CLASS_TEACHER")
        );
      }
      if (db.classes) {
        db.classes.forEach((c: any) => {
          if (c.schoolId === user.schoolId && c.classTeacherId === userId) {
            c.classTeacherId = undefined;
          }
        });
      }
      user.className = undefined;
      user.section = undefined;
    } else if (user.teacherType === "CLASS_TEACHER" && user.className) {
      const cleanSec = user.section || "A";
      ensureClass(user.schoolId, user.className, cleanSec);
      syncClassTeacherAssignment({
        schoolId: user.schoolId,
        className: user.className,
        section: cleanSec,
        newTeacherId: userId,
      });
    }
  } else if (user.role === "STUDENT") {
    if (data.className !== undefined) {
      user.className = data.className ? data.className.trim() : "";
    }
    if (data.section !== undefined) {
      user.section = data.section ? data.section.trim().toUpperCase() : "A";
    }
    if (user.className) {
      ensureClass(user.schoolId, user.className, user.section || "A");
    }
  } else {
    if (data.className !== undefined) user.className = data.className.trim();
    if (data.section !== undefined) user.section = data.section.trim().toUpperCase();
  }

  // If this user is a STUDENT and parentEmail is set/updated:
  if (user.role === "STUDENT" && user.parentEmail) {
    const newParentEmail = user.parentEmail.trim().toLowerCase();

    // 1. If parent email changed, remove student from old parent's childrenIds
    if (oldParentEmail && oldParentEmail !== newParentEmail) {
      const oldParent = (db.users || []).find(
        (u: any) =>
          u.schoolId === user.schoolId &&
          u.role === "PARENT" &&
          (u.email?.trim().toLowerCase() === oldParentEmail ||
           u.username?.trim().toLowerCase() === oldParentEmail)
      );
      if (oldParent && oldParent.childrenIds) {
        oldParent.childrenIds = oldParent.childrenIds.filter((cid: string) => cid !== userId);
      }
    }

    // 2. Find or create matching PARENT account
    let parent = (db.users || []).find(
      (u: any) =>
        u.schoolId === user.schoolId &&
        u.role === "PARENT" &&
        (u.email?.trim().toLowerCase() === newParentEmail ||
         u.username?.trim().toLowerCase() === newParentEmail)
    );

    if (parent) {
      parent.email = newParentEmail;
      parent.username = newParentEmail;
      parent.isActive = true;
      if (!parent.childrenIds) parent.childrenIds = [];
      if (!parent.childrenIds.includes(userId)) {
        parent.childrenIds.push(userId);
      }
      if (user.parentName && (!parent.firstName || parent.firstName === "Parent")) {
        const parts = user.parentName.trim().split(" ");
        parent.firstName = titleCaseName(parts[0]);
        parent.lastName = parts.slice(1).join(" ") || undefined;
      }
    } else {
      const parentId = `user_${Date.now() + 1}`;
      const pName = user.parentName || "Parent";
      const parts = pName.trim().split(" ");
      parent = {
        id: parentId,
        schoolId: user.schoolId,
        schoolCode: user.schoolCode,
        role: "PARENT",
        username: newParentEmail,
        email: newParentEmail,
        passwordHash: user.passwordHash || bcrypt.hashSync("password123", 10),
        firstName: titleCaseName(parts[0]),
        lastName: parts.slice(1).join(" ") || undefined,
        childrenIds: [userId],
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      db.users.push(parent);
    }
  }

  writeDB(db);
  const { passwordHash, ...safe } = user;
  return safe;
}

export async function deleteUser(userId: string, schoolId: string) {
  const db = readDB() as any;
  const userIndex = db.users.findIndex((u: any) => u.id === userId && u.schoolId === schoolId);
  if (userIndex === -1) throw new Error("User not found");
  const user = db.users[userIndex];
  if (user.role === "ADMIN") throw new Error("Cannot delete Admin");

  const removedParentIds: string[] = [];

  // 1. If TEACHER:
  if (user.role === "TEACHER") {
    // Unassign as primary classTeacher from all classes
    if (db.classes) {
      db.classes.forEach((c: any) => {
        if (c.schoolId === schoolId && c.classTeacherId === userId) {
          c.classTeacherId = undefined;
        }
      });
    }

    // Remove ALL mappings from teacherClasses (both CLASS_TEACHER and SUBJECT_TEACHER)
    if (db.teacherClasses) {
      db.teacherClasses = db.teacherClasses.filter(
        (t: any) => !(t.schoolId === schoolId && t.teacherId === userId)
      );
    }

    // Remove teacher check-in attendance
    if (db.attendances) {
      db.attendances = db.attendances.filter(
        (a: any) => !(a.schoolId === schoolId && a.teacherId === userId)
      );
    }
  }

  // 2. If STUDENT:
  if (user.role === "STUDENT") {
    // Remove from parent childrenIds
    db.users.forEach((p: any) => {
      if (p.schoolId === schoolId && p.role === "PARENT" && Array.isArray(p.childrenIds)) {
        p.childrenIds = p.childrenIds.filter((cid: string) => cid !== userId);
      }
    });

    // Remove student attendance records
    if (db.attendances) {
      db.attendances = db.attendances.filter(
        (a: any) => !(a.schoolId === schoolId && a.studentId === userId)
      );
    }

    // Remove student marks
    if (db.marks) {
      db.marks = db.marks.filter(
        (m: any) => !(m.schoolId === schoolId && m.studentId === userId)
      );
    }

    // Remove student from homework submissions
    if (db.homeworks) {
      db.homeworks.forEach((h: any) => {
        if (Array.isArray(h.submissions)) {
          h.submissions = h.submissions.filter((sub: any) => sub.studentId !== userId);
        }
      });
    }

    // Clean up parent accounts that have NO other active children left in this school
    const remainingStudentsInSchool = (db.users || []).filter(
      (u: any) => u.schoolId === schoolId && u.role === "STUDENT" && u.id !== userId && u.isActive
    );
    db.users = (db.users || []).filter((u: any) => {
      if (u.schoolId === schoolId && u.role === "PARENT") {
        const pEmail = normalizeEmail(u.email);
        const pUser = normalizeEmail(u.username);
        const hasChild = remainingStudentsInSchool.some(
          (s: any) =>
            (Array.isArray(u.childrenIds) && u.childrenIds.includes(s.id)) ||
            (s.parentEmail && (normalizeEmail(s.parentEmail) === pEmail || normalizeEmail(s.parentEmail) === pUser))
        );
        if (!hasChild) {
          removedParentIds.push(u.id);
          return false;
        }
        return true;
      }
      return true;
    });
  }

  // 3. Clean up notifications for this user
  if (db.notifications) {
    db.notifications = db.notifications.filter(
      (n: any) => !(n.schoolId === schoolId && n.userId === userId)
    );
  }

  // 4. Clean up push tokens, read receipts, and otps
  if (db.pushTokens) {
    db.pushTokens = db.pushTokens.filter((pt: any) => pt.userId !== userId);
  }
  if (db.readReceipts) {
    db.readReceipts = db.readReceipts.filter((rr: any) => rr.userId !== userId);
  }
  if (db.otps) {
    db.otps = db.otps.filter((o: any) => o.userId !== userId);
  }

  // 5. Hard delete user from db.users
  const finalIdx = db.users.findIndex((u: any) => u.id === userId && u.schoolId === schoolId);
  if (finalIdx >= 0) {
    db.users.splice(finalIdx, 1);
  }

  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      if (removedParentIds && removedParentIds.length > 0) {
        for (const pid of removedParentIds) {
          await prisma.notification.deleteMany({ where: { userId: pid } }).catch(() => {});
          await prisma.pushToken.deleteMany({ where: { userId: pid } }).catch(() => {});
          await prisma.readReceipt.deleteMany({ where: { userId: pid } }).catch(() => {});
          await prisma.user.deleteMany({ where: { id: pid, schoolId } }).catch(() => {});
        }
      }
      await prisma.attendance.deleteMany({ where: { OR: [{ studentId: userId }, { teacherId: userId }] } }).catch(() => {});
      await prisma.examMark.deleteMany({ where: { studentId: userId } }).catch(() => {});
      await prisma.teacherClass.deleteMany({ where: { teacherId: userId, schoolId } }).catch(() => {});
      await prisma.notification.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.pushToken.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.readReceipt.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: userId, schoolId } });
    } catch (err: any) {
      console.error("[deleteUser Postgres Error]:", err?.message);
    }
  }

  return { success: true };
}

export function updateSchool(schoolId: string, data: Partial<{
  name: string;
  displayName: string;
  location: string;
  email: string;
  phone: string;
  themeColor: string;
  logoUrl: string;
}>) {
  const db = readDB();
  const school = db.schools.find((s) => s.id === schoolId);
  if (!school) throw new Error("School not found");

  if (data.email !== undefined && data.email.trim()) {
    const normEmail = normalizeEmail(data.email);
    if (normEmail !== normalizeEmail(school.email)) {
      const dupSchool = db.schools.find(
        (s) => s.id !== schoolId && normalizeEmail(s.email) === normEmail
      );
      if (dupSchool) throw new Error("School with this email already exists.");
      const dupAdmin = db.users.find(
        (u) =>
          u.role === "ADMIN" &&
          u.schoolId !== schoolId &&
          u.isActive &&
          normalizeEmail(u.email) === normEmail
      );
      if (dupAdmin) throw new Error("An admin account with this email already exists.");
    }
    school.email = data.email.trim();
  }

  if (data.phone !== undefined && data.phone.trim()) {
    if (!isSamePhone(school.phone, data.phone)) {
      const dupSchoolPhone = db.schools.find(
        (s) => s.id !== schoolId && s.phone && isSamePhone(s.phone, data.phone)
      );
      if (dupSchoolPhone) throw new Error("School with this phone number already exists.");
      const dupAdminPhone = db.users.find(
        (u) =>
          u.role === "ADMIN" &&
          u.schoolId !== schoolId &&
          u.isActive &&
          u.phone &&
          isSamePhone(u.phone, data.phone)
      );
      if (dupAdminPhone) throw new Error("An admin account with this phone number already exists.");
    }
    school.phone = data.phone.trim();
  }

  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    school.name = trimmedName;
    if (trimmedName.length > 20) {
      const targetDisp = data.displayName !== undefined ? data.displayName.trim() : (school.displayName || "");
      if (!targetDisp) {
        throw new Error("Display Name is required when school name exceeds 20 characters.");
      }
      if (targetDisp.length > 20) {
        throw new Error("Display Name must be 20 characters or less.");
      }
      school.displayName = targetDisp;
    } else {
      if (data.displayName !== undefined) {
        school.displayName = data.displayName.trim() || undefined;
      }
    }
  } else if (data.displayName !== undefined) {
    const trimmedDisp = data.displayName.trim();
    if (school.name.trim().length > 20 && !trimmedDisp) {
      throw new Error("Display Name is required when school name exceeds 20 characters.");
    }
    if (trimmedDisp && trimmedDisp.length > 20) {
      throw new Error("Display Name must be 20 characters or less.");
    }
    school.displayName = trimmedDisp || undefined;
  }

  if (data.location !== undefined) school.location = data.location;
  if (data.themeColor !== undefined) school.themeColor = data.themeColor;
  if (data.logoUrl !== undefined) school.logoUrl = data.logoUrl;
  writeDB(db);
  return school;
}

export function getSchool(schoolId: string) {
  const db = readDB();
  return db.schools.find((s) => s.id === schoolId) || null;
}

// ====================== HOMEWORK ======================

export async function createHomework(data: {
  schoolId: string;
  className: string;
  section?: string;
  subject?: string;
  title: string;
  description: string;
  attachmentUrl?: string;
  attachments?: string[];
  createdById: string;
  createdByName?: string;
}) {
  const db = readDB();
  const expires = new Date();
  expires.setDate(expires.getDate() + 7);
  const hw: StoredHomework = {
    id: `hw_${Date.now()}`,
    schoolId: data.schoolId,
    className: data.className,
    section: data.section,
    subject: data.subject,
    title: data.title,
    description: data.description,
    attachmentUrl: data.attachmentUrl || (data.attachments && data.attachments[0]) || undefined,
    attachments: data.attachments || (data.attachmentUrl ? [data.attachmentUrl] : []),
    createdById: data.createdById,
    createdByName: data.createdByName,
    createdAt: new Date().toISOString(),
    expiresAt: expires.toISOString(),
  };
  db.homeworks.push(hw);
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.homework.upsert({
        where: { id: hw.id },
        create: {
          id: hw.id,
          schoolId: hw.schoolId,
          className: hw.className,
          section: hw.section || null,
          subject: hw.subject || null,
          title: hw.title,
          description: hw.description,
          attachmentUrl: hw.attachmentUrl || null,
          attachments: hw.attachments ? (hw.attachments as any) : undefined,
          createdById: hw.createdById,
          createdByName: hw.createdByName || null,
          createdAt: new Date(hw.createdAt),
          expiresAt: new Date(hw.expiresAt),
        },
        update: {
          className: hw.className,
          section: hw.section || null,
          subject: hw.subject || null,
          title: hw.title,
          description: hw.description,
          attachmentUrl: hw.attachmentUrl || null,
          attachments: hw.attachments ? (hw.attachments as any) : undefined,
        },
      });
    } catch (err: any) {
      console.error("[createHomework Postgres Error]:", err?.message);
    }
  }

  return hw;
}

export function getHomeworks(schoolId: string, filters?: { className?: string; section?: string }) {
  const db = readDB();
  const now = new Date().toISOString();
  let list = db.homeworks.filter((h) => h.schoolId === schoolId && h.expiresAt > now);
  if (filters?.className) list = list.filter((h) => h.className === filters.className);
  if (filters?.section) list = list.filter((h) => !h.section || h.section === filters.section);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return list;
}

export async function deleteHomework(id: string, schoolId: string) {
  const db = readDB();
  const idx = db.homeworks.findIndex((h) => h.id === id && h.schoolId === schoolId);
  if (idx < 0) throw new Error("Homework not found");
  db.homeworks.splice(idx, 1);
  if ((db as any).readReceipts) {
    (db as any).readReceipts = (db as any).readReceipts.filter(
      (rr: any) => rr.itemId !== id && rr.targetId !== id
    );
  }
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.homework.deleteMany({ where: { id, schoolId } });
      await prisma.readReceipt.deleteMany({
        where: { OR: [{ itemId: id }, { entityId: id }] },
      }).catch(() => {});
    } catch (err: any) {
      console.error("[deleteHomework Postgres Error]:", err?.message);
    }
  }

  return { success: true };
}

/** Teachers only see HW they created */
export function getHomeworksForTeacher(schoolId: string, teacherId: string) {
  const db = readDB();
  const now = new Date().toISOString();
  return db.homeworks
    .filter((h) => h.schoolId === schoolId && h.createdById === teacherId && h.expiresAt > now)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Class teacher mappings only */
export function getClassTeacherClasses(teacherId: string) {
  const list = getTeacherClasses(teacherId);
  return list.filter((t: any) => t.role === "CLASS_TEACHER");
}

/** Students only for CLASS_TEACHER mapped classes (for attendance) */
export function getStudentsForClassTeacher(schoolId: string, teacherId: string) {
  const db = readDB() as any;
  const maps = getClassTeacherClasses(teacherId);
  if (maps.length === 0) {
    const teacher = (db.users || []).find((u: any) => u.id === teacherId);
    if (teacher?.teacherType === "CLASS_TEACHER" && teacher?.className) {
      return (db.users || [])
        .filter(
          (u: any) =>
            u.schoolId === schoolId &&
            u.role === "STUDENT" &&
            u.isActive &&
            isExactClassAndSection(u.className, u.section, teacher.className, teacher.section)
        )
        .map(({ passwordHash, ...r }: any) => r)
        .sort((a: any, b: any) => (a.firstName || "").localeCompare(b.firstName || ""));
    }
    return [];
  }
  return (db.users || [])
    .filter(
      (u: any) =>
        u.schoolId === schoolId &&
        u.role === "STUDENT" &&
        u.isActive &&
        maps.some((m: any) => isExactClassAndSection(u.className, u.section, m.className, m.section))
    )
    .map(({ passwordHash, ...r }: any) => r)
    .sort((a: any, b: any) => (a.firstName || "").localeCompare(b.firstName || ""));
}



// ====================== ANNOUNCEMENTS ======================

export async function createAnnouncement(data: {
  schoolId: string;
  title: string;
  content: string;
  target: StoredAnnouncement["target"];
  className?: string;
  section?: string;
  classes?: { className: string; section?: string }[];
  createdById: string;
  createdByName?: string;
  createdByRole?: string;
}) {
  const db = readDB();
  const ann: StoredAnnouncement = {
    id: `ann_${Date.now()}`,
    schoolId: data.schoolId,
    title: data.title,
    content: data.content,
    target: data.target,
    className: data.className,
    section: data.section,
    classes: data.classes,
    createdById: data.createdById,
    createdByName: data.createdByName,
    createdByRole: data.createdByRole,
    createdAt: new Date().toISOString(),
  };
  db.announcements.push(ann);
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      const validTargets = ["ALL", "PARENTS_ONLY", "STUDENTS_ONLY", "TEACHERS_ONLY", "SPECIFIC_CLASS", "SPECIFIC_SECTION", "MY_STUDENTS", "CLASS"];
      const targetEnum = validTargets.includes(ann.target as string) ? ann.target : "ALL";

      await prisma.announcement.upsert({
        where: { id: ann.id },
        create: {
          id: ann.id,
          schoolId: ann.schoolId,
          title: ann.title,
          content: ann.content,
          target: targetEnum as any,
          targetRole: ann.target,
          className: ann.className || null,
          section: ann.section || null,
          classes: ann.classes ? (ann.classes as any) : undefined,
          createdById: ann.createdById,
          createdByName: ann.createdByName || null,
          createdByRole: ann.createdByRole || null,
          createdAt: new Date(ann.createdAt),
        },
        update: {
          title: ann.title,
          content: ann.content,
          target: targetEnum as any,
          targetRole: ann.target,
          className: ann.className || null,
          section: ann.section || null,
          classes: ann.classes ? (ann.classes as any) : undefined,
        },
      });
    } catch (err: any) {
      console.error("[createAnnouncement Postgres Error]:", err?.message);
    }
  }

  return ann;
}

export async function deleteAnnouncement(id: string, schoolId: string, userId?: string, role?: string) {
  const db = readDB();
  const ann = db.announcements.find((a) => a.id === id && a.schoolId === schoolId);
  if (!ann) throw new Error("Notice not found");
  if (userId && ann.createdById !== userId) {
    throw new Error("You can only delete your own posted notices");
  }
  db.announcements = db.announcements.filter((a) => a.id !== id);
  if ((db as any).readReceipts) {
    (db as any).readReceipts = (db as any).readReceipts.filter(
      (rr: any) => rr.itemId !== id && rr.targetId !== id
    );
  }
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.announcement.deleteMany({ where: { id, schoolId } });
      await prisma.readReceipt.deleteMany({
        where: { OR: [{ itemId: id }, { entityId: id }] },
      }).catch(() => {});
    } catch (err: any) {
      console.error("[deleteAnnouncement Postgres Error]:", err?.message);
    }
  }

  return { success: true };
}

export function getAnnouncementsForTeacher(schoolId: string, teacherId: string) {
  const db = readDB();
  return db.announcements
    .filter((a) => a.schoolId === schoolId && a.createdById === teacherId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function matchesClassTarget(a: any, className?: string, section?: string): boolean {
  if (!className) return false;
  // If multi-classes array
  if (Array.isArray(a.classes) && a.classes.length > 0) {
    return a.classes.some((c: any) => {
      if (c.className !== className) return false;
      if (c.section && section && c.section !== section) return false;
      return true;
    });
  }
  // If single className
  if (!a.className) return true;
  if (a.className.includes(",")) {
    const tokens = a.className.split(",").map((t: string) => t.trim().toLowerCase());
    const myKey = section ? `${className}-${section}`.toLowerCase() : className.toLowerCase();
    return tokens.some((t: string) => t === myKey || t === className.toLowerCase());
  }
  if (a.className !== className) return false;
  if (a.section && section && a.section !== section) return false;
  return true;
}

export function getAnnouncements(
  schoolId: string,
  role: string,
  className?: string,
  section?: string,
  userId?: string
) {
  const db = readDB() as any;
  let list = (db.announcements || []).filter((a: any) => a.schoolId === schoolId);

  // If Parent, resolve all their active children in this school to know which classes the parent can see
  let parentKids: any[] = [];
  if (role === "PARENT" && userId) {
    const parentUser = (db.users || []).find((u: any) => u.id === userId);
    const pEmail = normalizeEmail(parentUser?.email);
    const pUser = normalizeEmail(parentUser?.username);
    const parentStoredIds = Array.isArray(parentUser?.childrenIds) ? parentUser.childrenIds.map(String) : [];

    parentKids = (db.users || []).filter((u: any) => {
      if (u.schoolId !== schoolId || u.role !== "STUDENT" || u.isActive === false) return false;
      const sParentEmail = normalizeEmail(u.parentEmail);
      const matchEmail = sParentEmail && (sParentEmail === pEmail || sParentEmail === pUser);
      const matchIds = parentStoredIds.includes(String(u.id));
      return matchEmail || matchIds;
    });
  }

  list = list.filter((a: any) => {
    // 1. Author can ALWAYS see the notice they created
    if (userId && a.createdById === userId) return true;

    const hasClass = !!(a.className || (Array.isArray(a.classes) && a.classes.length > 0));
    const creator = (db.users || []).find((u: any) => u.id === a.createdById);
    const creatorRole = (a.createdByRole || creator?.role || "").toUpperCase();
    const isTeacherNotice = creatorRole === "TEACHER";

    // 2. If notice was posted by a TEACHER:
    if (isTeacherNotice) {
      // Principal and Admin NEVER see teacher-to-class notices
      if (role === "ADMIN" || role === "PRINCIPAL") {
        return false;
      }

      // Other teachers only see it if specifically targeted to TEACHERS_ONLY
      if (role === "TEACHER") {
        return a.target === "TEACHERS_ONLY";
      }

      // If targeted to TEACHERS_ONLY, students & parents cannot see it
      if (a.target === "TEACHERS_ONLY") {
        return false;
      }

      // For STUDENT role:
      if (role === "STUDENT") {
        if (a.target === "PARENTS_ONLY") return false;
        return hasClass ? matchesClassTarget(a, className, section) : false;
      }

      // For PARENT role:
      if (role === "PARENT") {
        if (a.target === "STUDENTS_ONLY") return false;
        if (parentKids.length > 0) {
          return parentKids.some((k) => matchesClassTarget(a, k.className, k.section));
        }
        return className ? matchesClassTarget(a, className, section) : false;
      }

      return false;
    }

    // 3. If notice was posted by ADMIN or PRINCIPAL (or institutional):
    if (a.target === "ALL") {
      if (hasClass) {
        if (role === "STUDENT") {
          return matchesClassTarget(a, className, section);
        }
        if (role === "PARENT") {
          if (parentKids.length > 0) {
            return parentKids.some((k) => matchesClassTarget(a, k.className, k.section));
          }
          return className ? matchesClassTarget(a, className, section) : false;
        }
        return role === "ADMIN" || role === "PRINCIPAL" || role === "TEACHER";
      }
      return true;
    }

    if (a.target === "PARENTS_ONLY") {
      if (role === "ADMIN" || role === "PRINCIPAL") return true;
      if (role === "PARENT") {
        if (!hasClass) return true;
        if (parentKids.length > 0) {
          return parentKids.some((k) => matchesClassTarget(a, k.className, k.section));
        }
        return className ? matchesClassTarget(a, className, section) : false;
      }
      return false;
    }

    if (a.target === "STUDENTS_ONLY") {
      if (role === "ADMIN" || role === "PRINCIPAL") return true;
      if (role === "STUDENT") {
        return hasClass ? matchesClassTarget(a, className, section) : true;
      }
      return false;
    }

    if (a.target === "TEACHERS_ONLY") {
      return role === "TEACHER" || role === "ADMIN" || role === "PRINCIPAL";
    }

    if (a.target === "CLASS") {
      if (role === "ADMIN" || role === "PRINCIPAL") return true;
      if (role === "TEACHER") {
        return false;
      }
      if (role === "STUDENT") {
        return matchesClassTarget(a, className, section);
      }
      if (role === "PARENT") {
        if (parentKids.length > 0) {
          return parentKids.some((k) => matchesClassTarget(a, k.className, k.section));
        }
        return className ? matchesClassTarget(a, className, section) : false;
      }
      return false;
    }

    return true;
  });

  list.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return list;
}

// ====================== SUBJECTS & TEACHER CLASS MAP ======================

// extend readDB defaults - patched below if needed

export function createSubject(schoolId: string, name: string) {
  const db = readDB() as any;
  if (!db.subjects) db.subjects = [];
  const existing = db.subjects.find((s: any) => s.schoolId === schoolId && s.name.toLowerCase() === name.toLowerCase() && s.isActive);
  if (existing) return existing;
  const sub = { id: `sub_${Date.now()}`, schoolId, name: name.trim(), isActive: true };
  db.subjects.push(sub);
  writeDB(db);
  return sub;
}

export function getSubjects(schoolId: string) {
  const db = readDB() as any;
  return (db.subjects || []).filter((s: any) => s.schoolId === schoolId && s.isActive);
}

export function mapTeacherToClass(data: {
  schoolId: string;
  teacherId: string;
  className: string;
  section: string;
  role: "CLASS_TEACHER" | "SUBJECT_TEACHER";
  subjectId?: string;
  subjectName?: string;
  transferData?: boolean;
}) {
  const db = readDB() as any;
  if (!db.teacherClasses) db.teacherClasses = [];

  const isClassTeacher = data.role === "CLASS_TEACHER";
  const transferData = data.transferData !== false;
  const cleanClassName = (data.className || "").trim();
  const cleanSection = (data.section || "A").trim().toUpperCase();

  ensureClass(data.schoolId, cleanClassName, cleanSection);

  // If mapping as CLASS_TEACHER, enforce ONE class teacher for this class
  if (isClassTeacher) {
    const cls = (db.classes || []).find(
      (c: any) =>
        c.schoolId === data.schoolId &&
        isExactClassAndSection(c.name, c.section, cleanClassName, cleanSection)
    );
    const oldTeacherId =
      cls?.classTeacherId ||
      db.teacherClasses.find(
        (t: any) =>
          t.schoolId === data.schoolId &&
          isExactClassAndSection(t.className, t.section, cleanClassName, cleanSection) &&
          t.role === "CLASS_TEACHER"
      )?.teacherId;

    syncClassTeacherAssignment({
      schoolId: data.schoolId,
      className: cleanClassName,
      section: cleanSection,
      newTeacherId: data.teacherId,
      oldTeacherId: oldTeacherId !== data.teacherId ? oldTeacherId : undefined,
      transferData,
    });

    const existing = (db.teacherClasses || []).find(
      (t: any) =>
        t.schoolId === data.schoolId &&
        t.teacherId === data.teacherId &&
        isExactClassAndSection(t.className, t.section, cleanClassName, cleanSection) &&
        t.role === "CLASS_TEACHER"
    );
    if (existing) return existing;

    const entry = {
      id: `tc_${Date.now()}`,
      schoolId: data.schoolId,
      teacherId: data.teacherId,
      className: cleanClassName,
      section: cleanSection,
      role: "CLASS_TEACHER" as const,
    };
    db.teacherClasses.push(entry);
    writeDB(db);
    return entry;
  }

  // SUBJECT_TEACHER
  const exists = db.teacherClasses.find((t: any) => {
    if (
      t.schoolId !== data.schoolId ||
      t.teacherId !== data.teacherId ||
      !isExactClassAndSection(t.className, t.section, cleanClassName, cleanSection) ||
      t.role !== data.role
    ) {
      return false;
    }
    const a = (t.subjectName || "").trim().toLowerCase();
    const b = (data.subjectName || "").trim().toLowerCase();
    if (data.subjectId && t.subjectId) return t.subjectId === data.subjectId;
    if (a && b) return a === b;
    return false;
  });

  if (exists) {
    if (data.subjectName) exists.subjectName = data.subjectName;
    if (data.subjectId) exists.subjectId = data.subjectId;
    writeDB(db);
    return exists;
  }

  const entry = {
    id: `tc_${Date.now()}`,
    schoolId: data.schoolId,
    teacherId: data.teacherId,
    className: cleanClassName,
    section: cleanSection,
    role: data.role,
    subjectId: data.subjectId,
    subjectName: data.subjectName,
  };
  db.teacherClasses.push(entry);
  writeDB(db);
  return entry;
}

export function getTeacherClasses(teacherId: string) {
  const db = readDB() as any;
  if (!db.teacherClasses) db.teacherClasses = [];
  const teacher = (db.users || []).find((u: any) => u.id === teacherId);
  const schoolId = teacher?.schoolId;

  // Active classes in the school
  const activeClasses = (db.classes || []).filter(
    (c: any) => (!schoolId || c.schoolId === schoolId) && c.isActive !== false
  );

  const list: any[] = [];

  // 1. Existing mappings in db.teacherClasses for this teacher
  (db.teacherClasses || []).forEach((t: any) => {
    if (t.teacherId !== teacherId) return;
    if (schoolId && t.schoolId && t.schoolId !== schoolId) return;

    // Verify that the class is active in db.classes if db.classes has records
    if (activeClasses.length > 0) {
      const classExists = activeClasses.some((c: any) =>
        isExactClassAndSection(c.name, c.section, t.className, t.section)
      );
      if (!classExists) return;
    }

    // If marked as CLASS_TEACHER, ensure another teacher hasn't replaced them in db.classes
    if (t.role === "CLASS_TEACHER" && activeClasses.length > 0) {
      const matchingClass = activeClasses.find((c: any) =>
        isExactClassAndSection(c.name, c.section, t.className, t.section)
      );
      if (matchingClass && matchingClass.classTeacherId && matchingClass.classTeacherId !== teacherId) {
        return;
      }
    }

    list.push(t);
  });

  // 2. Include any active class where classTeacherId === teacherId
  if (teacher) {
    activeClasses.forEach((c: any) => {
      if (c.classTeacherId === teacherId) {
        const alreadyInList = list.some(
          (t: any) =>
            isExactClassAndSection(t.className, t.section, c.name, c.section) &&
            t.role === "CLASS_TEACHER"
        );
        if (!alreadyInList) {
          list.push({
            id: `tc_ct_${c.id || Date.now()}_${teacherId}`,
            schoolId: c.schoolId,
            teacherId,
            className: c.name,
            section: c.section || "",
            role: "CLASS_TEACHER",
            createdAt: c.createdAt || new Date().toISOString(),
          });
        }
      }
    });

    // 3. Fallback if teacher.className exists on user object
    if (teacher.teacherType === "CLASS_TEACHER" && teacher.className) {
      const matchingClass = activeClasses.find((c: any) =>
        isExactClassAndSection(c.name, c.section, teacher.className, teacher.section)
      );
      const isValidClass =
        activeClasses.length === 0 ||
        (matchingClass && (!matchingClass.classTeacherId || matchingClass.classTeacherId === teacherId));

      if (isValidClass) {
        const alreadyInList = list.some(
          (t: any) =>
            isExactClassAndSection(t.className, t.section, teacher.className, teacher.section) &&
            t.role === "CLASS_TEACHER"
        );
        if (!alreadyInList) {
          list.push({
            id: `tc_ct_user_${teacherId}`,
            schoolId: teacher.schoolId,
            teacherId,
            className: teacher.className,
            section: teacher.section || "",
            role: "CLASS_TEACHER",
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  // Prefer CLASS_TEACHER entry when same class mapped as both CT and ST
  const sorted = [...list].sort((a: any, b: any) =>
    (a.role === "CLASS_TEACHER" ? 0 : 1) - (b.role === "CLASS_TEACHER" ? 0 : 1)
  );
  return sorted;
}

/** Unique class rows for a teacher (one chip per class/section) */
export function getTeacherClassesUnique(teacherId: string) {
  const list = getTeacherClasses(teacherId);
  const seen = new Set<string>();
  return list.filter((t: any) => {
    const k = `${normalizeClassName(t.className)}|${normalizeSection(t.section)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function deleteTeacherClassMapping(
  mappingId: string,
  schoolId: string
) {
  const db = readDB() as any;
  if (!db.teacherClasses) db.teacherClasses = [];
  let idx = db.teacherClasses.findIndex(
    (t: any) => (t.id === mappingId || t.mappingId === mappingId) && (!t.schoolId || t.schoolId === schoolId)
  );
  if (idx < 0) {
    idx = db.teacherClasses.findIndex((t: any) => t.id === mappingId || t.mappingId === mappingId);
  }
  if (idx < 0) {
    if (mappingId.startsWith("tc_ct_")) {
      return { success: true };
    }
    throw new Error("Mapping not found");
  }

  const removed = db.teacherClasses.splice(idx, 1)[0];
  if (removed.role === "CLASS_TEACHER") {
    const cls = (db.classes || []).find(
      (c: any) =>
        c.schoolId === schoolId &&
        isExactClassAndSection(c.name, c.section, removed.className, removed.section) &&
        c.classTeacherId === removed.teacherId
    );
    if (cls) cls.classTeacherId = undefined;

    const teacher = (db.users || []).find((u: any) => u.id === removed.teacherId);
    if (teacher) {
      const remainingCt = (db.teacherClasses || []).find(
        (t: any) => t.teacherId === teacher.id && t.role === "CLASS_TEACHER"
      );
      if (remainingCt) {
        teacher.className = remainingCt.className;
        teacher.section = remainingCt.section;
      } else {
        teacher.teacherType = "SUBJECT_TEACHER";
        if (isExactClassAndSection(teacher.className, teacher.section, removed.className, removed.section)) {
          teacher.className = undefined;
          teacher.section = undefined;
        }
      }
    }
  }
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.teacherClass.deleteMany({
        where: { id: mappingId, schoolId },
      });
    } catch (err: any) {
      console.error("[deleteTeacherClassMapping Postgres Error]:", err?.message);
    }
  }

  return { success: true };
}

export function getStudentsForTeacher(schoolId: string, teacherId: string) {
  const db = readDB() as any;
  const maps = getTeacherClasses(teacherId);
  if (maps.length === 0) {
    const teacher = (db.users || []).find((u: any) => u.id === teacherId);
    if (teacher?.className) {
      return (db.users || [])
        .filter(
          (u: any) =>
            u.schoolId === schoolId &&
            u.role === "STUDENT" &&
            u.isActive &&
            isSameClassAndSection(u.className, u.section, teacher.className, teacher.section)
        )
        .sort((a: any, b: any) => {
          const rA = a.rollNumber ? parseInt(a.rollNumber) || 9999 : 9999;
          const rB = b.rollNumber ? parseInt(b.rollNumber) || 9999 : 9999;
          if (rA !== rB) return rA - rB;
          return (a.firstName || "").localeCompare(b.firstName || "");
        });
    }
    return [];
  }

  const list = (db.users || []).filter((u: any) => {
    if (u.schoolId !== schoolId || u.role !== "STUDENT" || !u.isActive) return false;
    return maps.some((m: any) => isSameClassAndSection(u.className, u.section, m.className, m.section));
  });

  return list.sort((a: any, b: any) => {
    const rA = a.rollNumber ? parseInt(a.rollNumber) || 9999 : 9999;
    const rB = b.rollNumber ? parseInt(b.rollNumber) || 9999 : 9999;
    if (rA !== rB) return rA - rB;
    return (a.firstName || "").localeCompare(b.firstName || "");
  });
}

export function getTeacherMappings(teacherId: string) {
  const db = readDB() as any;
  if (!db.teacherClasses) db.teacherClasses = [];
  return db.teacherClasses.filter((t: any) => t.teacherId === teacherId);
}

// ====================== EXAMS & MARKS ======================

export async function createExam(data: {
  schoolId: string;
  name: string;
  className?: string;
  section?: string;
  subject?: string;
  subjectId?: string;
  maxMarks?: number;
  passMarks?: number;
  date: string;
  createdById: string;
  type?: "TEST" | "EXAM";
  subjects?: ExamSubject[];
}) {
  const db = readDB() as any;
  if (!db.exams) db.exams = [];
  const type = data.type || "TEST";
  let subjects = data.subjects || [];
  if (type === "EXAM" && subjects.length) {
    subjects = subjects.map((s, i) => {
      const maxM = Number(s.maxMarks) || 100;
      const passM = s.passMarks != null ? Number(s.passMarks) : Math.round(maxM * 0.35);
      return {
        id: s.id || `esub_${Date.now()}_${i}`,
        subjectName: s.subjectName,
        date: s.date || data.date,
        maxMarks: maxM,
        passMarks: passM,
        splits: (s.splits || []).map((sp) => ({
          title: sp.title,
          maxMarks: Number(sp.maxMarks) || 0,
        })),
      };
    });
  }
  const dates = subjects.map((s) => s.date).filter(Boolean);
  const dateFrom = dates.length ? dates.slice().sort()[0] : data.date;
  const dateTo = dates.length ? dates.slice().sort().slice(-1)[0] : data.date;
  const testMaxMarks = Number(data.maxMarks) || 100;
  const testPassMarks = data.passMarks != null ? Number(data.passMarks) : Math.round(testMaxMarks * 0.35);

  const exam = {
    id: `exam_${Date.now()}`,
    schoolId: data.schoolId,
    name: data.name,
    className: data.className,
    section: data.section,
    subject: type === "TEST" ? data.subject : undefined,
    maxMarks: type === "TEST" ? testMaxMarks : subjects.reduce((a, s) => a + (Number(s.maxMarks) || 0), 0),
    passMarks: type === "TEST" ? testPassMarks : subjects.reduce((a, s) => a + (Number(s.passMarks) || 0), 0),
    date: dateFrom || data.date,
    createdById: data.createdById,
    createdAt: new Date().toISOString(),
    type,
    subjects: type === "EXAM" ? subjects : undefined,
    published: false,
    dateFrom,
    dateTo,
  };
  db.exams.push(exam);
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.exam.upsert({
        where: { id: exam.id },
        create: {
          id: exam.id,
          schoolId: exam.schoolId,
          name: exam.name,
          type: exam.type,
          className: exam.className || null,
          section: exam.section || null,
          maxMarks: exam.maxMarks || 100,
          passMarks: exam.passMarks || 35,
          date: exam.date || null,
          dateFrom: exam.dateFrom || null,
          dateTo: exam.dateTo || null,
          subjects: exam.subjects ? (exam.subjects as any) : (exam.subject ? [{ subject: exam.subject, maxMarks: exam.maxMarks, passMarks: exam.passMarks }] as any : undefined),
          description: null,
          published: !!exam.published,
          createdById: exam.createdById,
          createdAt: new Date(exam.createdAt),
        },
        update: {
          name: exam.name,
          type: exam.type,
          className: exam.className || null,
          section: exam.section || null,
          maxMarks: exam.maxMarks || 100,
          passMarks: exam.passMarks || 35,
          date: exam.date || null,
          dateFrom: exam.dateFrom || null,
          dateTo: exam.dateTo || null,
          subjects: exam.subjects ? (exam.subjects as any) : (exam.subject ? [{ subject: exam.subject, maxMarks: exam.maxMarks, passMarks: exam.passMarks }] as any : undefined),
          published: !!exam.published,
        },
      });
    } catch (err: any) {
      console.error("[createExam Postgres Error]:", err?.message);
    }
  }

  // Timetable-style notification for EXAM create (students + parents in class)
  if (type === "EXAM" && subjects.length) {
    const students = db.users.filter(
      (u: any) =>
        u.schoolId === data.schoolId &&
        u.role === "STUDENT" &&
        u.isActive &&
        u.className === data.className &&
        (!data.section || u.section === data.section)
    );
    if (!db.notifications) db.notifications = [];
    const tableRows = subjects.map((s) => ({
      date: s.date,
      subject: s.subjectName,
      maxMarks: s.maxMarks,
      passMarks: s.passMarks,
      splits: (s.splits || []).map((sp: any) => `${sp.title}:${sp.maxMarks}`).join(", "),
    }));
    const title = `Exam timetable: ${data.name}`;
    const body = "View timetable below";
    const metaBase = {
      examId: exam.id,
      type: "EXAM_TIMETABLE",
      examName: data.name,
      className: data.className,
      section: data.section || "",
      table: tableRows,
    };
    for (const st of students) {
      db.notifications.unshift({
        id: `notif_${Date.now()}_ex_${st.id}`,
        schoolId: data.schoolId,
        userId: st.id,
        title,
        body,
        type: "EXAM",
        meta: { ...metaBase },
        read: false,
        createdAt: new Date().toISOString(),
      });
      if (st.parentEmail) {
        const parent = db.users.find(
          (u: any) =>
            u.role === "PARENT" &&
            u.schoolId === data.schoolId &&
            u.email?.toLowerCase() === st.parentEmail.toLowerCase()
        );
        if (parent) {
          db.notifications.unshift({
            id: `notif_${Date.now()}_exp_${parent.id}_${st.id}`,
            schoolId: data.schoolId,
            userId: parent.id,
            title: `${st.firstName}: ${title}`,
            body,
            type: "EXAM",
            meta: { ...metaBase, studentId: st.id },
            read: false,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
    writeDB(db);
  }
  return exam;
}

export function getExams(schoolId: string, className?: string, createdById?: string, section?: string) {
  const db = readDB() as any;
  let list = (db.exams || []).filter((e: any) => e.schoolId === schoolId);
  if (className) {
    list = list.filter((e: any) => isSameClassAndSection(e.className, undefined, className, undefined));
  }
  if (section) {
    list = list.filter((e: any) => !e.section || isSameClassAndSection(undefined, e.section, undefined, section));
  }
  if (createdById) list = list.filter((e: any) => e.createdById === createdById);
  return list.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function getExamsForTeacher(
  schoolId: string,
  teacherId: string,
  className?: string,
  section?: string
) {
  const db = readDB() as any;
  const teacherClasses = getTeacherClasses(teacherId);

  let list = (db.exams || []).filter((e: any) => e.schoolId === schoolId);

  // Filter exams that relate to this teacher:
  list = list.filter((ex: any) => {
    // 1. Teacher created this exam
    if (ex.createdById === teacherId) return true;

    // 2. If Class Teacher for this class (or whole class match), they see all exams
    const isClassTeacher = teacherClasses.some(
      (tc: any) =>
        isSameClassAndSection(tc.className, tc.section, ex.className, ex.section) &&
        tc.role === "CLASS_TEACHER"
    );
    if (isClassTeacher) return true;

    // 3. Check if teacher is assigned to this class
    const matchingClasses = teacherClasses.filter((tc: any) =>
      isSameClassAndSection(tc.className, tc.section, ex.className, ex.section)
    );
    if (matchingClasses.length === 0) return false;

    // 4. If Subject Teacher, check if subject matches or if any assigned subject matches
    const assignedSubs = matchingClasses
      .map((tc: any) => (tc.subjectName || tc.subject || "").trim().toLowerCase())
      .filter(Boolean);

    if (assignedSubs.length === 0) {
      // If no specific subject restriction, teacher is mapped to the entire class
      return true;
    }

    if (ex.type === "TEST" || !ex.subjects || ex.subjects.length === 0) {
      const testSub = (ex.subject || "").trim().toLowerCase();
      if (!testSub || assignedSubs.includes(testSub)) return true;
    } else {
      const hasMySub = (ex.subjects || []).some((s: any) =>
        assignedSubs.includes((s.subjectName || "").trim().toLowerCase())
      );
      if (hasMySub) return true;
    }

    return false;
  });

  if (className) {
    list = list.filter((e: any) => isSameClassAndSection(e.className, undefined, className, undefined));
  }
  if (section) {
    list = list.filter((e: any) => !e.section || isSameClassAndSection(undefined, e.section, undefined, section));
  }

  return list.sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function deleteExam(examId: string, schoolId: string, userId?: string, role?: string) {
  const db = readDB() as any;
  if (!db.exams) db.exams = [];
  const exam = db.exams.find((e: any) => e.id === examId && e.schoolId === schoolId);

  // Teachers can only delete their own or if class teacher
  if (role === "TEACHER" && exam && exam.createdById && exam.createdById !== userId) {
    const teacherClasses = getTeacherClasses(userId!);
    const isClassTeacher = teacherClasses.some(
      (tc: any) =>
        isSameClassAndSection(tc.className, tc.section, exam.className, exam.section) &&
        tc.role === "CLASS_TEACHER"
    );
    if (!isClassTeacher) {
      throw new Error("You can only delete exams you created or manage as class teacher");
    }
  }

  db.exams = (db.exams || []).filter((e: any) => e.id !== examId);
  if (db.marks) db.marks = db.marks.filter((m: any) => m.examId !== examId);
  if (db.readReceipts) {
    db.readReceipts = db.readReceipts.filter(
      (rr: any) => rr.itemId !== examId && rr.targetId !== examId
    );
  }
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.examMark.deleteMany({ where: { examId } }).catch(() => {});
      await prisma.examSubject.deleteMany({ where: { examId } }).catch(() => {});
      await prisma.readReceipt.deleteMany({
        where: { OR: [{ itemId: examId }, { entityId: examId }] },
      }).catch(() => {});
      await prisma.exam.deleteMany({ where: { id: examId, schoolId } });
    } catch (err: any) {
      console.error("[deleteExam Postgres Error]:", err?.message);
    }
  }

  return { success: true };
}

export async function updateExam(
  examId: string,
  schoolId: string,
  data: Partial<{
    name: string;
    className: string;
    section: string;
    subject: string;
    maxMarks: number;
    passMarks: number;
    date: string;
    type: "TEST" | "EXAM";
    subjects: ExamSubject[];
  }>,
  userId?: string,
  role?: string
) {
  const db = readDB() as any;
  if (!db.exams) db.exams = [];
  const exam = db.exams.find((e: any) => e.id === examId && e.schoolId === schoolId);
  if (!exam) throw new Error("Exam not found");

  if (role === "TEACHER" && exam.createdById && exam.createdById !== userId) {
    // allow update
  }

  if (data.name !== undefined) exam.name = data.name;
  if (data.className !== undefined) exam.className = data.className;
  if (data.section !== undefined) exam.section = data.section;
  if (data.type !== undefined) exam.type = data.type;

  if (exam.type === "EXAM" && data.subjects) {
    exam.subjects = data.subjects.map((s, i) => {
      const maxM = Number(s.maxMarks) || 100;
      const passM = s.passMarks != null ? Number(s.passMarks) : Math.round(maxM * 0.35);
      return {
        id: s.id || `esub_${Date.now()}_${i}`,
        subjectName: s.subjectName,
        date: s.date || data.date || exam.date,
        maxMarks: maxM,
        passMarks: passM,
        splits: (s.splits || []).map((sp) => ({
          title: sp.title,
          maxMarks: Number(sp.maxMarks) || 0,
        })),
      };
    });
    const dates = exam.subjects.map((s: any) => s.date).filter(Boolean);
    exam.dateFrom = dates.length ? dates.slice().sort()[0] : exam.date;
    exam.dateTo = dates.length ? dates.slice().sort().slice(-1)[0] : exam.date;
    exam.date = exam.dateFrom || exam.date;
    exam.maxMarks = exam.subjects.reduce((a: number, s: any) => a + (Number(s.maxMarks) || 0), 0);
    exam.passMarks = exam.subjects.reduce((a: number, s: any) => a + (Number(s.passMarks) || 0), 0);
    exam.subject = undefined;
  } else if (exam.type === "TEST") {
    if (data.subject !== undefined) exam.subject = data.subject;
    if (data.maxMarks !== undefined) exam.maxMarks = Number(data.maxMarks) || 100;
    if (data.passMarks !== undefined) {
      exam.passMarks = Number(data.passMarks) || Math.round((Number(exam.maxMarks) || 100) * 0.35);
    } else if (exam.passMarks === undefined) {
      exam.passMarks = Math.round((Number(exam.maxMarks) || 100) * 0.35);
    }
    if (data.date !== undefined) {
      exam.date = data.date;
      exam.dateFrom = data.date;
      exam.dateTo = data.date;
    }
    exam.subjects = undefined;
  }

  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.exam.upsert({
        where: { id: exam.id },
        create: {
          id: exam.id,
          schoolId: exam.schoolId,
          name: exam.name,
          type: exam.type,
          className: exam.className || null,
          section: exam.section || null,
          maxMarks: exam.maxMarks || 100,
          passMarks: exam.passMarks || 35,
          date: exam.date || null,
          dateFrom: exam.dateFrom || null,
          dateTo: exam.dateTo || null,
          subjects: exam.subjects ? (exam.subjects as any) : (exam.subject ? [{ subject: exam.subject, maxMarks: exam.maxMarks, passMarks: exam.passMarks }] as any : undefined),
          description: null,
          published: !!exam.published,
          createdById: exam.createdById,
          createdAt: new Date(exam.createdAt || Date.now()),
        },
        update: {
          name: exam.name,
          type: exam.type,
          className: exam.className || null,
          section: exam.section || null,
          maxMarks: exam.maxMarks || 100,
          passMarks: exam.passMarks || 35,
          date: exam.date || null,
          dateFrom: exam.dateFrom || null,
          dateTo: exam.dateTo || null,
          subjects: exam.subjects ? (exam.subjects as any) : (exam.subject ? [{ subject: exam.subject, maxMarks: exam.maxMarks, passMarks: exam.passMarks }] as any : undefined),
          published: !!exam.published,
        },
      });
    } catch (err: any) {
      console.error("[updateExam Postgres Error]:", err?.message);
    }
  }

  return exam;
}

export async function saveMarks(
  examId: string,
  records: {
    studentId: string;
    marks?: number;
    maxMarks?: number;
    subjectId?: string;
    splits?: Record<string, number>;
  }[],
  enteredById: string,
  opts?: { notify?: boolean }
) {
  const db = readDB() as any;
  if (!db.marks) db.marks = [];
  const exam = (db.exams || []).find((e: any) => e.id === examId);
  if (!exam) throw new Error("Exam not found");
  const notify = !!opts?.notify && !!exam.published;

  for (const r of records) {
    const subjectId = r.subjectId;
    const idx = db.marks.findIndex(
      (m: any) =>
        m.examId === examId &&
        m.studentId === r.studentId &&
        (subjectId ? m.subjectId === subjectId : !m.subjectId)
    );
    let maxMarks = Number(r.maxMarks) || exam.maxMarks || 100;
    let validatedSplits: Record<string, number> | undefined = undefined;
    if (subjectId && exam.subjects) {
      const sub = exam.subjects.find((s: any) => s.id === subjectId);
      if (sub && sub.maxMarks) maxMarks = Number(sub.maxMarks);
    }

    let marks = Number(r.marks) || 0;
    if (r.splits && typeof r.splits === "object") {
      validatedSplits = {};
      const subDef = exam.subjects?.find((s: any) => s.id === subjectId);
      for (const [k, v] of Object.entries(r.splits)) {
        const splitDef = subDef?.splits?.find((sp: any) => sp.title === k);
        const spMax = splitDef ? Number(splitDef.maxMarks) : maxMarks;
        const clampedVal = Math.min(spMax, Math.max(0, Number(v) || 0));
        validatedSplits[k] = clampedVal;
      }
      marks = Object.values(validatedSplits).reduce((a: number, v) => a + v, 0);
    }

    marks = Math.min(maxMarks, Math.max(0, marks));

    const entryId = idx >= 0 ? db.marks[idx].id : `mark_${examId}_${r.studentId}_${subjectId || "main"}`;
    const entry = {
      id: entryId,
      examId,
      studentId: r.studentId,
      marks,
      marksObtained: marks,
      maxMarks,
      enteredById,
      enteredAt: new Date().toISOString(),
      subjectId: subjectId || undefined,
      splits: validatedSplits || undefined,
    };
    if (idx >= 0) db.marks[idx] = entry;
    else db.marks.push(entry);

    if (notify) {
      if (!db.notifications) db.notifications = [];
      const student = (db.users || []).find((u: any) => u.id === r.studentId);
      if (student) {
        const title = "Marks published";
        const body = `${exam.name}${exam.subject ? " (" + exam.subject + ")" : ""}: ${marks}/${maxMarks}`;
        db.notifications.unshift({
          id: `notif_${Date.now()}_s_${r.studentId}`,
          schoolId: student.schoolId,
          userId: student.id,
          title,
          body,
          type: "MARKS",
          meta: { examId, marks, maxMarks },
          read: false,
          createdAt: new Date().toISOString(),
        });
        if (student.parentEmail) {
          const parent = (db.users || []).find(
            (u: any) =>
              u.role === "PARENT" &&
              u.schoolId === student.schoolId &&
              u.email?.toLowerCase() === student.parentEmail.toLowerCase()
          );
          if (parent) {
            db.notifications.unshift({
              id: `notif_${Date.now()}_p_${parent.id}_${r.studentId}`,
              schoolId: parent.schoolId,
              userId: parent.id,
              title: `Marks for ${student.firstName}`,
              body,
              type: "MARKS",
              meta: { examId, studentId: student.id },
              read: false,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }
  }
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      for (const r of records) {
        const subjectId = r.subjectId;
        const entry = db.marks.find(
          (m: any) =>
            m.examId === examId &&
            m.studentId === r.studentId &&
            (subjectId ? m.subjectId === subjectId : !m.subjectId)
        );
        if (entry) {
          await prisma.examMark.deleteMany({
            where: {
              examId: entry.examId,
              studentId: entry.studentId,
              subjectId: entry.subjectId || null,
            },
          }).catch(() => {});

          await prisma.examMark.create({
            data: {
              id: entry.id,
              examId: entry.examId,
              studentId: entry.studentId,
              subjectId: entry.subjectId || null,
              marks: entry.marks ?? 0,
              maxMarks: entry.maxMarks || 100,
              grade: entry.grade || null,
              remarks: entry.remarks || null,
              splits: entry.splits ? (entry.splits as any) : undefined,
              enteredById: entry.enteredById || null,
              enteredAt: new Date(entry.enteredAt || Date.now()),
            },
          });
        }
      }
    } catch (err: any) {
      console.error("[saveMarks Postgres Error]:", err?.message);
    }
  }

  return { success: true, count: records.length };
}

/** Class teacher publishes exam marks → notify students & parents */
export async function publishExam(examId: string, schoolId: string, userId: string) {
  const db = readDB() as any;
  const exam = (db.exams || []).find((e: any) => e.id === examId && e.schoolId === schoolId);
  if (!exam) throw new Error("Exam not found");

  const marks = (db.marks || []).filter((m: any) => m.examId === examId);
  // Snapshot of previously published totals per student (JSON string key)
  const prevSnap: Record<string, string> = exam.publishedSnapshot || {};
  const byStudent = new Map<string, { total: number; max: number; key: string }>();
  for (const m of marks) {
    const cur = byStudent.get(m.studentId) || { total: 0, max: 0, key: "" };
    cur.total += Number(m.marks) || 0;
    cur.max += Number(m.maxMarks) || 0;
    // include subject + splits in fingerprint
    const splitKey = m.splits ? JSON.stringify(m.splits) : "";
    cur.key += `|${m.subjectId || "main"}:${m.marks}:${m.maxMarks}:${splitKey}`;
    byStudent.set(m.studentId, cur);
  }

  const changedIds: string[] = [];
  for (const [studentId, agg] of byStudent) {
    const fingerprint = `${agg.total}/${agg.max}${agg.key}`;
    if (prevSnap[studentId] !== fingerprint) {
      changedIds.push(studentId);
      prevSnap[studentId] = fingerprint;
    }
  }

  const wasAlreadyPublished = !!exam.published;
  exam.published = true;
  exam.publishedSnapshot = prevSnap;
  exam.publishedAt = new Date().toISOString();
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.exam.update({
        where: { id: examId },
        data: {
          published: true,
          publishedAt: new Date(exam.publishedAt),
          publishedSnapshot: exam.publishedSnapshot ? (exam.publishedSnapshot as any) : undefined,
        },
      }).catch(() => {});
    } catch (err: any) {
      console.error("[publishExam Postgres Error]:", err?.message);
    }
  }

  if (!db.notifications) db.notifications = [];
  const targetStudentIds = changedIds.length > 0 ? changedIds : Array.from(byStudent.keys());
  for (const studentId of targetStudentIds) {
    const student = (db.users || []).find((u: any) => u.id === studentId);
    if (!student) continue;
    const agg = byStudent.get(studentId) || { total: 0, max: 0, key: "" };
    const title = wasAlreadyPublished ? "Exam results updated" : "Exam results published";
    const body = `${exam.name}: ${agg.total}/${agg.max}`;
    db.notifications.unshift({
      id: `notif_${Date.now()}_pub_${studentId}`,
      schoolId,
      userId: studentId,
      title,
      body,
      type: "MARKS",
      meta: { examId, published: true, total: agg.total, max: agg.max },
      read: false,
      createdAt: new Date().toISOString(),
    });

    const pEmail = student.parentEmail?.trim().toLowerCase();
    const parents = (db.users || []).filter(
      (u: any) =>
        u.role === "PARENT" &&
        u.schoolId === schoolId &&
        ((pEmail &&
          (u.email?.trim().toLowerCase() === pEmail ||
            u.username?.trim().toLowerCase() === pEmail)) ||
          u.childrenIds?.includes(studentId))
    );
    for (const parent of parents) {
      db.notifications.unshift({
        id: `notif_${Date.now()}_pubp_${parent.id}_${studentId}`,
        schoolId,
        userId: parent.id,
        title: wasAlreadyPublished
          ? `${student.firstName}: results updated`
          : `${student.firstName}: results published`,
        body,
        type: "MARKS",
        meta: { examId, studentId, published: true, total: agg.total, max: agg.max },
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }
  writeDB(db);
  return {
    success: true,
    exam,
    notified: targetStudentIds.length,
    changedStudentIds: targetStudentIds,
  };
}

export function getExamWithMarks(examId: string) {
  const db = readDB() as any;
  const exam = (db.exams || []).find((e: any) => e.id === examId);
  if (!exam) return null;
  const marks = (db.marks || []).filter((m: any) => m.examId === examId);
  return { exam, marks };
}

export function getMarksForExam(examId: string) {
  const db = readDB() as any;
  return (db.marks || []).filter((m: any) => m.examId === examId);
}


function parseClassGradeOrder(className: string): number {
  const c = String(className || "").trim().toUpperCase();
  const m = c.match(/\b(\d+)\b/);
  if (m) return parseInt(m[1], 10);
  if (c.includes("UKG") || c.includes("U.K.G") || c.includes("UPPER")) return 0;
  if (c.includes("LKG") || c.includes("L.K.G") || c.includes("LOWER")) return -1;
  if (c.includes("PRE") || c.includes("NURSERY") || c.includes("PLAY") || c.includes("KG")) return -2;
  return -3;
}

/** Top students per class based on average % across published exams with marks */
export function getTopStudentsByClass(schoolId: string, limitPerClass = 5) {
  const db = readDB() as any;
  const students = (db.users || []).filter(
    (u: any) => u.schoolId === schoolId && u.role === "STUDENT" && u.isActive !== false
  );
  const exams = (db.exams || []).filter((e: any) => e.schoolId === schoolId && (e.published || e.type === "TEST"));
  const marks = db.marks || [];

  // studentId -> { totalMarks, totalMax, count }
  const agg: Record<string, { total: number; max: number }> = {};
  for (const m of marks) {
    const exam = exams.find((e: any) => e.id === m.examId);
    if (!exam) continue;
    if (!agg[m.studentId]) agg[m.studentId] = { total: 0, max: 0 };
    agg[m.studentId].total += Number(m.marks) || 0;
    agg[m.studentId].max += Number(m.maxMarks || exam.maxMarks) || 0;
  }

  // group by class-section
  const byClass: Record<string, any[]> = {};
  for (const s of students) {
    const key = `${s.className || "—"}||${s.section || ""}`;
    const a = agg[s.id];
    if (!a || a.max <= 0) continue; // only students with marks
    const pct = Math.round((a.total / a.max) * 1000) / 10;
    if (!byClass[key]) byClass[key] = [];
    byClass[key].push({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      rollNumber: s.rollNumber || s.rollNo || "",
      rollNo: s.rollNumber || s.rollNo || "",
      photoUrl: s.photoUrl,
      className: s.className,
      section: s.section,
      totalMarks: a.total,
      maxMarks: a.max,
      percentage: pct,
    });
  }

  const result: { classLabel: string; className: string; section: string; students: any[] }[] = [];
  for (const [key, list] of Object.entries(byClass)) {
    list.sort((a, b) => b.percentage - a.percentage || b.totalMarks - a.totalMarks);
    const ranked = list.slice(0, limitPerClass).map((s, i) => ({ ...s, rank: i + 1 }));
    const [cn, sec] = key.split("||");
    result.push({
      classLabel: sec ? `${cn} ${sec}` : cn,
      className: cn,
      section: sec || "",
      students: ranked,
    });
  }

  result.sort((a, b) => {
    const wA = parseClassGradeOrder(a.className);
    const wB = parseClassGradeOrder(b.className);
    if (wA !== wB) return wB - wA; // 12, 11, 10 ... 1, UKG, LKG, Pre-KG
    const cmpName = a.className.localeCompare(b.className, undefined, { numeric: true });
    if (cmpName !== 0) return cmpName;
    return (a.section || "").localeCompare(b.section || "");
  });

  return result;
}

export function getStudentMarks(studentId: string, opts?: { publishedOnly?: boolean; schoolId?: string }) {
  const db = readDB() as any;
  const marks = (db.marks || []).filter((m: any) => m.studentId === studentId);
  const rows = marks
    .map((m: any) => {
      const exam = (db.exams || []).find((e: any) => e.id === m.examId && (!opts?.schoolId || e.schoolId === opts.schoolId));
      if (!exam) return null;
      let subjectName = exam?.subject;
      let subjectDate = exam?.date;
      let maxM = m.maxMarks ?? exam?.maxMarks ?? 100;
      let passM = m.passMarks ?? exam?.passMarks ?? 35;

      if (exam?.subjects?.length && m.subjectId) {
        const sub = exam.subjects.find((s: any) => s.id === m.subjectId);
        if (sub) {
          subjectName = sub.subjectName;
          if (sub.date) subjectDate = sub.date;
          if (sub.maxMarks != null) maxM = sub.maxMarks;
          if (sub.passMarks != null) passM = sub.passMarks;
        }
      }

      return {
        ...m,
        schoolId: exam?.schoolId,
        examName: exam?.name,
        subject: subjectName,
        subjectDate: subjectDate,
        maxMarks: maxM,
        passMarks: passM,
        examType: exam?.type || "TEST",
        examDate: exam?.date,
        dateFrom: exam?.dateFrom,
        dateTo: exam?.dateTo,
        published: !!exam?.published,
        subjects: exam?.subjects,
        className: exam?.className,
        section: exam?.section,
      };
    })
    .filter(Boolean);
  if (opts?.publishedOnly) {
    return rows.filter((r: any) => r.published || r.examType === "TEST");
  }
  return rows;
}


export function createNotification(data: {
  schoolId: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  meta?: any;
}) {
  const db = readDB() as any;
  if (!db.notifications) db.notifications = [];
  const n = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    schoolId: data.schoolId,
    userId: data.userId,
    title: data.title,
    body: data.body,
    type: data.type,
    meta: data.meta || {},
    read: false,
    createdAt: new Date().toISOString(),
  };
  db.notifications.unshift(n);
  writeDB(db);
  return n;
}

export function createNotificationsBulk(items: Array<{
  schoolId: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  meta?: any;
}>) {
  if (!Array.isArray(items) || items.length === 0) return [];
  const db = readDB() as any;
  if (!db.notifications) db.notifications = [];

  const createdList = items.map((data, idx) => ({
    id: `notif_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 7)}`,
    schoolId: data.schoolId,
    userId: data.userId,
    title: data.title,
    body: data.body,
    type: data.type,
    meta: data.meta || {},
    read: false,
    createdAt: new Date().toISOString(),
  }));

  db.notifications.unshift(...createdList);
  writeDB(db);
  return createdList;
}

export function cleanupOldNotifications(db: any) {
  if (!db.notifications || !Array.isArray(db.notifications)) return false;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const initialLen = db.notifications.length;
  db.notifications = db.notifications.filter((n: any) => {
    if (!n.createdAt) return true;
    const t = new Date(n.createdAt).getTime();
    if (Number.isNaN(t)) return true;
    return t >= cutoff;
  });
  return db.notifications.length !== initialLen;
}

export function getNotifications(userId: string, schoolId: string) {
  const db = readDB() as any;
  const changed = cleanupOldNotifications(db);
  if (changed) {
    writeDB(db);
  }
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return (db.notifications || [])
    .filter((n: any) => {
      if (n.userId !== userId || (schoolId && n.schoolId !== schoolId)) return false;
      if (n.createdAt) {
        const t = new Date(n.createdAt).getTime();
        if (!Number.isNaN(t) && t < cutoff) return false;
      }
      return true;
    })
    .sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export async function markNotificationRead(id: string, userId: string) {
  const db = readDB() as any;
  const n = (db.notifications || []).find((x: any) => x.id === id && x.userId === userId);
  if (n) {
    n.read = true;
    writeDB(db);
  }

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.notification.updateMany({
        where: { id, userId },
        data: { read: true, isRead: true },
      });
    } catch (err: any) {
      console.error("[markNotificationRead Postgres Error]:", err?.message);
    }
  }

  return n;
}

export async function markAllNotificationsRead(userId: string, schoolId?: string) {
  const db = readDB() as any;
  (db.notifications || []).forEach((n: any) => {
    if (n.userId === userId && (!schoolId || !n.schoolId || n.schoolId === schoolId)) {
      n.read = true;
    }
  });
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          ...(schoolId ? { OR: [{ schoolId }, { schoolId: null }] } : {}),
        },
        data: { read: true, isRead: true },
      });
    } catch (err: any) {
      console.error("[markAllNotificationsRead Postgres Error]:", err?.message);
    }
  }

  return { success: true };
}

export function getUnreadNotificationCount(userId: string, schoolId?: string) {
  const db = readDB() as any;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return (db.notifications || []).filter((n: any) => {
    if (n.userId !== userId || n.read) return false;
    if (schoolId && n.schoolId && n.schoolId !== schoolId) return false;
    if (n.createdAt) {
      const t = new Date(n.createdAt).getTime();
      if (!Number.isNaN(t) && t < cutoff) return false;
    }
    return true;
  }).length;
}

export function markAsRead(userId: string, type: "ANNOUNCEMENT" | "HOMEWORK" | "MARKS" | string, itemId: string) {
  const db = readDB() as any;
  if (!db.readReceipts) db.readReceipts = [];
  const strId = String(itemId);
  const exists = db.readReceipts.find(
    (r: any) =>
      r.userId === userId &&
      (r.type === type || r.targetType === type) &&
      (r.itemId === strId || r.targetId === strId)
  );
  if (exists) return exists;
  const rec = {
    id: `rr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    type,
    itemId: strId,
    targetType: type,
    targetId: strId,
    readAt: new Date().toISOString(),
  };
  db.readReceipts.push(rec);
  writeDB(db);

  if (prisma && process.env.DATABASE_URL) {
    prisma.readReceipt.create({
      data: {
        id: rec.id,
        userId,
        type,
        itemId: strId,
        entityType: type,
        entityId: strId,
        readAt: new Date(),
      },
    }).catch((err: any) => console.error("[markAsRead Postgres Error]:", err?.message));
  }

  return rec;
}

export async function markItemsAsRead(
  userId: string,
  type: "ANNOUNCEMENT" | "HOMEWORK" | "MARKS" | string,
  itemIds: string[]
) {
  if (!itemIds || !itemIds.length) return [];
  const db = readDB() as any;
  if (!db.readReceipts) db.readReceipts = [];

  const newRecords: any[] = [];
  const nowStr = new Date().toISOString();
  const now = new Date();

  for (const rawId of itemIds) {
    const itemId = String(rawId);
    if (!itemId) continue;
    const exists = db.readReceipts.some(
      (r: any) =>
        r.userId === userId &&
        (r.type === type || r.targetType === type) &&
        (r.itemId === itemId || r.targetId === itemId)
    );
    if (!exists) {
      const rec = {
        id: `rr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        type,
        itemId,
        targetType: type,
        targetId: itemId,
        readAt: nowStr,
      };
      db.readReceipts.push(rec);
      newRecords.push(rec);
    }
  }

  if (newRecords.length > 0) {
    writeDB(db);

    if (prisma && process.env.DATABASE_URL) {
      try {
        await prisma.readReceipt.createMany({
          data: newRecords.map((r) => ({
            id: r.id,
            userId: r.userId,
            type: r.type,
            itemId: r.itemId,
            entityType: r.targetType,
            entityId: r.targetId,
            readAt: now,
          })),
          skipDuplicates: true,
        });
      } catch (err: any) {
        console.error("[markItemsAsRead Postgres Error]:", err?.message);
      }
    }
  }

  return newRecords;
}

export function getReadReceipts(userId: string) {
  const db = readDB() as any;
  return (db.readReceipts || []).filter((r: any) => r.userId === userId);
}

export function getUnreadCounts(userId: string, schoolId: string, role: string, className?: string, section?: string) {
  const db = readDB() as any;
  const receipts = (db.readReceipts || []).filter((r: any) => r.userId === userId);
  const readAnn = new Set(
    receipts
      .filter((r: any) => r.type === "ANNOUNCEMENT" || r.targetType === "ANNOUNCEMENT")
      .map((r: any) => r.itemId || r.targetId)
  );
  const readHw = new Set(
    receipts
      .filter((r: any) => r.type === "HOMEWORK" || r.targetType === "HOMEWORK")
      .map((r: any) => r.itemId || r.targetId)
  );
  const readMarks = new Set(
    receipts
      .filter((r: any) => r.type === "MARKS" || r.targetType === "MARKS")
      .map((r: any) => r.itemId || r.targetId)
  );

  // Notifications (filtered for last 30 days and matching current school)
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const notificationsCount = (db.notifications || []).filter((n: any) => {
    if (n.userId !== userId || n.read) return false;
    if (schoolId && n.schoolId && n.schoolId !== schoolId) return false;
    if (n.createdAt) {
      const t = new Date(n.createdAt).getTime();
      if (!Number.isNaN(t) && t < cutoff) return false;
    }
    return true;
  }).length;

  // Announcements
  const anns = getAnnouncements(schoolId, role, className, section, userId);
  const filteredAnns = anns.filter((a: any) => a.createdById !== userId);
  const announcementsCount = filteredAnns.filter((a: any) => !readAnn.has(a.id)).length;

  let homeworkCount = 0;
  let marksCount = 0;
  const childBadges: Record<string, { homework: number; marks: number; total: number }> = {};

  if (role === "STUDENT") {
    const hws = getHomeworks(schoolId, { className, section });
    homeworkCount = hws.filter((h: any) => h.createdById !== userId && !readHw.has(h.id)).length;

    // Student Marks (Grouped by distinct exam)
    const stMarks = (db.marks || []).filter((m: any) => m.studentId === userId);
    const examIdsWithMarks = Array.from(new Set(stMarks.map((m: any) => String(m.examId))));
    const classExams = (db.exams || []).filter((e: any) =>
      e.schoolId === schoolId &&
      (!e.className || e.className === className) &&
      (!e.section || !section || e.section === section) &&
      (e.type !== "EXAM" || e.published !== false)
    );
    const allExamIds = Array.from(new Set([...examIdsWithMarks, ...classExams.map((e: any) => String(e.id))]));

    let unreadMarks = 0;
    for (const eId of allExamIds) {
      const isRead =
        readMarks.has(eId) ||
        readMarks.has(`${userId}-${eId}`) ||
        stMarks.filter((m: any) => String(m.examId) === eId).some((m: any) => readMarks.has(String(m.id)));
      if (!isRead) {
        unreadMarks++;
      }
    }
    marksCount = unreadMarks;
  } else if (role === "PARENT") {
    // Parent - resolve their kids within this school
    const parentUser = (db.users || []).find((u: any) => u.id === userId);
    const pEmail = (parentUser?.email || "").trim().toLowerCase();
    const pUsername = (parentUser?.username || "").trim().toLowerCase();
    const parentStoredIds = Array.isArray(parentUser?.childrenIds) ? parentUser.childrenIds.map(String) : [];

    const kids = (db.users || []).filter((u: any) => {
      if (u.schoolId !== schoolId || u.role !== "STUDENT" || u.isActive === false) return false;
      const sParentEmail = (u.parentEmail || "").trim().toLowerCase();
      const matchEmail = sParentEmail && (sParentEmail === pEmail || sParentEmail === pUsername);
      const matchIds = parentStoredIds.includes(String(u.id));
      return matchEmail || matchIds;
    });

    let totalHw = 0;
    let totalMarks = 0;

    for (const k of kids) {
      const kHws = getHomeworks(schoolId, { className: k.className, section: k.section });
      const unreadHw = kHws.filter((h: any) => h.createdById !== userId && !readHw.has(h.id)).length;
      totalHw += unreadHw;

      // Kid marks (grouped by distinct exam)
      const kMarks = (db.marks || []).filter((m: any) => m.studentId === k.id);
      const examIdsWithMarks = Array.from(new Set(kMarks.map((m: any) => String(m.examId))));
      const classExams = (db.exams || []).filter((e: any) =>
        e.schoolId === schoolId &&
        (!e.className || e.className === k.className) &&
        (!e.section || !k.section || e.section === k.section) &&
        (e.type !== "EXAM" || e.published !== false)
      );
      const allExamIds = Array.from(new Set([...examIdsWithMarks, ...classExams.map((e: any) => String(e.id))]));

      let unreadExamMarks = 0;
      for (const eId of allExamIds) {
        const isRead =
          readMarks.has(eId) ||
          readMarks.has(`${k.id}-${eId}`) ||
          kMarks.filter((m: any) => String(m.examId) === eId).some((m: any) => readMarks.has(String(m.id)));
        if (!isRead) {
          unreadExamMarks++;
        }
      }

      totalMarks += unreadExamMarks;

      childBadges[k.id] = {
        homework: unreadHw,
        marks: unreadExamMarks,
        total: unreadHw + unreadExamMarks,
      };
    }

    homeworkCount = totalHw;
    marksCount = totalMarks;
  } else if (role === "TEACHER" || role === "ADMIN" || role === "PRINCIPAL") {
    homeworkCount = 0;
    const exams = (db.exams || []).filter((e: any) => e.schoolId === schoolId);
    marksCount = exams.filter((e: any) => !readMarks.has(String(e.id))).length;
  }

  return {
    notifications: notificationsCount,
    announcements: announcementsCount,
    homework: homeworkCount,
    marks: marksCount,
    childBadges,
  };
}

export function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const bcrypt = require("bcryptjs");
  const db = readDB();
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error("User not found");
  if (!bcrypt.compareSync(oldPassword, user.passwordHash)) {
    throw new Error("Current password is incorrect");
  }
  if (!newPassword || newPassword.length < 6) throw new Error("New password min 6 characters");
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  writeDB(db);
  return { success: true };
}

export function requestPasswordReset(schoolCode: string, usernameOrEmail: string) {
  const db = readDB();
  const user = db.users.find(
    (u) =>
      u.schoolCode.toUpperCase() === schoolCode.toUpperCase() &&
      u.isActive &&
      (u.username.toLowerCase() === usernameOrEmail.toLowerCase() ||
        u.email.toLowerCase() === usernameOrEmail.toLowerCase())
  );
  if (!user) throw new Error("User not found");
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const db2 = readDB() as any;
  if (!db2.otps) db2.otps = [];
  db2.otps = db2.otps.filter((o: any) => o.userId !== user.id);
  db2.otps.push({
    userId: user.id,
    code,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    purpose: "RESET",
  });
  writeDB(db2);
  // Demo: return code (in production send email)
  return { success: true, email: user.email, demoCode: code, message: "OTP sent to registered email (demo: shown in response)" };
}

export function resetPasswordWithOtp(schoolCode: string, usernameOrEmail: string, code: string, newPassword: string) {
  const bcrypt = require("bcryptjs");
  const db = readDB() as any;
  const user = db.users.find(
    (u: any) =>
      u.schoolCode.toUpperCase() === schoolCode.toUpperCase() &&
      u.isActive &&
      (u.username.toLowerCase() === usernameOrEmail.toLowerCase() ||
        u.email.toLowerCase() === usernameOrEmail.toLowerCase())
  );
  if (!user) throw new Error("User not found");
  const otp = (db.otps || []).find((o: any) => o.userId === user.id && o.code === code && o.purpose === "RESET");
  if (!otp) throw new Error("Invalid OTP");
  if (new Date(otp.expiresAt) < new Date()) throw new Error("OTP expired");
  if (!newPassword || newPassword.length < 6) throw new Error("Password min 6 characters");
  user.passwordHash = bcrypt.hashSync(newPassword, 10);
  db.otps = (db.otps || []).filter((o: any) => o.userId !== user.id);
  writeDB(db);
  return { success: true };
}

// ==================== SUBSCRIPTION & EXPIRATION HELPERS ====================

export function getSchoolSubscription(schoolId: string) {
  const db = readDB();
  const school = db.schools.find((s) => s.id === schoolId);
  if (!school) return null;

  // Default to 30 days if not set
  const expiresAt = school.planExpiresAt || new Date(new Date(school.createdAt || Date.now()).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const expiryTimestamp = new Date(expiresAt).getTime();
  const now = Date.now();
  const diffMs = expiryTimestamp - now;
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const isExpired = school.planStatus === "EXPIRED" || diffMs <= 0;
  const status = isExpired ? "EXPIRED" : (school.planStatus || "ACTIVE");

  const currentPlan = SUBSCRIPTION_PLANS.find((p) => p.id === school.plan) || SUBSCRIPTION_PLANS[0];

  return {
    schoolId: school.id,
    schoolName: school.name,
    schoolCode: school.schoolCode,
    planId: school.plan || "OFFER_MONTHLY",
    currentPlan,
    billingCycle: school.billingCycle || "MONTHLY",
    planExpiresAt: expiresAt,
    daysRemaining,
    isExpired,
    status,
    availablePlans: SUBSCRIPTION_PLANS,
  };
}

export function isSchoolSubscriptionExpired(school: StoredSchool | null | undefined): boolean {
  if (!school) return false;
  if (school.planStatus === "EXPIRED") return true;
  if (!school.planExpiresAt) return false;
  return new Date(school.planExpiresAt).getTime() <= Date.now();
}

export async function upgradeSchoolSubscription(schoolId: string, planId: string) {
  const db = readDB();
  const schoolIndex = db.schools.findIndex((s) => s.id === schoolId);
  if (schoolIndex === -1) throw new Error("School not found");

  const targetPlan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[0];
  const school = db.schools[schoolIndex];

  const now = Date.now();
  let currentExpiry = school.planExpiresAt ? new Date(school.planExpiresAt).getTime() : now;
  // If already expired or in the past, start extension from now
  const baseTime = currentExpiry > now ? currentExpiry : now;
  const newExpiry = new Date(baseTime + targetPlan.durationDays * 24 * 60 * 60 * 1000).toISOString();

  school.plan = targetPlan.id;
  school.billingCycle = targetPlan.billingInterval.toUpperCase().replace(/\s+/g, "_");
  school.planExpiresAt = newExpiry;
  school.planStatus = "ACTIVE";
  school.lastExpiryNotificationSent = null;

  db.schools[schoolIndex] = school;
  writeDB(db);

  // Sync to Prisma DB if active
  if (prisma && process.env.DATABASE_URL) {
    try {
      await prisma.school.update({
        where: { id: schoolId },
        data: {
          plan: targetPlan.id,
          billingCycle: school.billingCycle,
        },
      }).catch(() => {});

      await prisma.subscription.upsert({
        where: { schoolId },
        create: {
          schoolId,
          plan: targetPlan.id === "OFFER_MONTHLY" ? "BASIC" : (targetPlan.id === "ANNUAL" ? "PREMIUM" : "STANDARD"),
          billingCycle: targetPlan.id === "ANNUAL" ? "YEARLY" : "MONTHLY",
          startDate: new Date(),
          endDate: new Date(newExpiry),
          isActive: true,
        },
        update: {
          plan: targetPlan.id === "OFFER_MONTHLY" ? "BASIC" : (targetPlan.id === "ANNUAL" ? "PREMIUM" : "STANDARD"),
          billingCycle: targetPlan.id === "ANNUAL" ? "YEARLY" : "MONTHLY",
          endDate: new Date(newExpiry),
          isActive: true,
        },
      }).catch(() => {});
    } catch {}
  }

  // Notify School Admin
  const adminUsers = db.users.filter((u) => u.schoolId === schoolId && u.role === "ADMIN" && u.isActive);
  const expiryFormatted = new Date(newExpiry).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  for (const admin of adminUsers) {
    createNotification({
      schoolId,
      userId: admin.id,
      title: "🎉 Subscription Activated!",
      body: `Your school subscription is upgraded to "${targetPlan.name}". Access is active until ${expiryFormatted}.`,
      type: "SUBSCRIPTION",
      meta: { planId: targetPlan.id, expiresAt: newExpiry },
    });

    // Send push notification asynchronously
    (async () => {
      try {
        const { notifyUser } = await import("./push");
        await notifyUser(admin.id, {
          title: "🎉 Subscription Activated!",
          body: `Your school subscription is upgraded to "${targetPlan.name}". Valid until ${expiryFormatted}.`,
          type: "SUBSCRIPTION",
          data: { url: "/admin/subscription", route: "subscription" },
        });
      } catch {}
    })();
  }

  return getSchoolSubscription(schoolId);
}

export async function checkAndDispatchExpiryNotifications() {
  const db = readDB();
  const now = Date.now();
  let updated = false;
  const results: any[] = [];

  for (const school of db.schools) {
    if (!school.planExpiresAt) {
      // Default to 30 days from creation if missing
      school.planExpiresAt = new Date(new Date(school.createdAt || now).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      school.planStatus = "ACTIVE";
      updated = true;
    }

    const expiryTime = new Date(school.planExpiresAt).getTime();
    const diffMs = expiryTime - now;
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const expiryDateStr = new Date(school.planExpiresAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const admins = db.users.filter((u) => u.schoolId === school.id && u.role === "ADMIN" && u.isActive);

    // 1. Expired (<= 0 days)
    if (daysRemaining <= 0) {
      if (school.planStatus !== "EXPIRED" || school.lastExpiryNotificationSent !== "EXPIRED") {
        school.planStatus = "EXPIRED";
        school.lastExpiryNotificationSent = "EXPIRED";
        updated = true;

        for (const admin of admins) {
          createNotification({
            schoolId: school.id,
            userId: admin.id,
            title: "⚠️ Subscription Expired",
            body: `Your school subscription expired on ${expiryDateStr}. Please recharge or upgrade your plan now to restore full access.`,
            type: "SUBSCRIPTION_EXPIRED",
            meta: { schoolId: school.id, expired: true },
          });

          (async () => {
            try {
              const { notifyUser } = await import("./push");
              await notifyUser(admin.id, {
                title: "⚠️ Subscription Expired",
                body: `Your school subscription expired on ${expiryDateStr}. Tap to recharge and continue service.`,
                type: "SUBSCRIPTION_EXPIRED",
                email: admin.email,
                data: { url: "/admin/subscription", route: "subscription" },
              });
            } catch {}
          })();
        }

        results.push({ schoolId: school.id, status: "EXPIRED_ALERT_SENT" });
      }
    }
    // 2. 2 Days Before Expiry
    else if (daysRemaining <= 2 && school.lastExpiryNotificationSent !== "2_DAYS" && school.lastExpiryNotificationSent !== "EXPIRED") {
      school.lastExpiryNotificationSent = "2_DAYS";
      updated = true;

      for (const admin of admins) {
        createNotification({
          schoolId: school.id,
          userId: admin.id,
          title: "⏳ Subscription Expiring in 2 Days",
          body: `Your school subscription will expire on ${expiryDateStr} (2 days left). Recharge now to prevent service disruption.`,
          type: "SUBSCRIPTION_REMINDER",
          meta: { schoolId: school.id, daysRemaining: 2 },
        });

        (async () => {
          try {
            const { notifyUser } = await import("./push");
            await notifyUser(admin.id, {
              title: "⏳ Subscription Expiring in 2 Days",
              body: `Your school subscription will expire on ${expiryDateStr}. Tap to renew seamlessly.`,
              type: "SUBSCRIPTION_REMINDER",
              email: admin.email,
              data: { url: "/admin/subscription", route: "subscription" },
            });
          } catch {}
        })();
      }

      results.push({ schoolId: school.id, status: "2_DAYS_ALERT_SENT" });
    }
    // 3. 7 Days (1 Week) Before Expiry
    else if (daysRemaining <= 7 && !school.lastExpiryNotificationSent) {
      school.lastExpiryNotificationSent = "7_DAYS";
      updated = true;

      for (const admin of admins) {
        createNotification({
          schoolId: school.id,
          userId: admin.id,
          title: "📅 Subscription Reminder (1 Week Left)",
          body: `Your school subscription will expire in 7 days on ${expiryDateStr}. Check out available upgrade options.`,
          type: "SUBSCRIPTION_REMINDER",
          meta: { schoolId: school.id, daysRemaining: 7 },
        });

        (async () => {
          try {
            const { notifyUser } = await import("./push");
            await notifyUser(admin.id, {
              title: "📅 Subscription Reminder (1 Week Left)",
              body: `Your school subscription expires in 7 days on ${expiryDateStr}. Tap to manage subscription.`,
              type: "SUBSCRIPTION_REMINDER",
              email: admin.email,
              data: { url: "/admin/subscription", route: "subscription" },
            });
          } catch {}
        })();
      }

      results.push({ schoolId: school.id, status: "7_DAYS_ALERT_SENT" });
    }
  }

  if (updated) {
    writeDB(db);
  }

  return { success: true, processed: results };
}

