import { api, MobileUser } from "@/lib/api";

export type ChildInfo = {
  id: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  className?: string;
  section?: string;
  email?: string;
  phone?: string;
  rollNumber?: string;
  rollNo?: string;
  parentName?: string;
  teacherName?: string;
  username?: string;
};

function mapUser(u: any, fallbackId?: string): ChildInfo {
  return {
    id: u.id || fallbackId || "",
    firstName: u.firstName || "Child",
    lastName: u.lastName,
    photoUrl: u.photoUrl || u.photo || undefined,
    className: u.className,
    section: u.section,
    email: u.email,
    phone: u.phone || u.phoneNumber || undefined,
    rollNumber: u.rollNumber || u.rollNo || undefined,
    rollNo: u.rollNumber || u.rollNo || undefined,
    parentName: u.parentName || u.guardianName,
    teacherName: u.teacherName || u.classTeacherName,
    username: u.username,
  };
}

export async function resolveChildren(user: MobileUser | null): Promise<ChildInfo[]> {
  if (!user || user.role !== "PARENT") return [];

  const byId = new Map<string, ChildInfo>();

  // 1. Fetch from list endpoint — /api/users/list returns only this parent's active children in this school
  try {
    const data = await api<any>("/api/users/list");
    const students = (data.users || []).filter((u: any) => u.role === "STUDENT" && u.isActive !== false);
    for (const u of students) {
      byId.set(u.id, mapUser(u));
    }
  } catch {
    /* fall through */
  }

  // 2. If list was empty, try fetching by childrenIds from /api/auth/me
  if (!byId.size) {
    try {
      const me = await api<any>("/api/auth/me");
      const ids: string[] = me.user?.childrenIds || user.childrenIds || [];
      for (const id of ids) {
        try {
          const r = await api<any>(`/api/users/${id}`);
          const u = r.user || r;
          if (u && u.id && u.role === "STUDENT" && u.isActive !== false) {
            byId.set(u.id, mapUser(u, id));
          }
        } catch {
          // Deleted or not found: do not include
        }
      }
    } catch {
      /* ignore */
    }
  }

  return Array.from(byId.values());
}
