import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, getApiBase, getToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useBadges } from "@/hooks/useBadges";
import { Badge, Button, Empty, Loading } from "@/components/ui";
import { Colors, spacing, radius } from "@/constants/theme";
import { str, formatDateDDMMYYYY, formatDateTimeDDMMYYYY, toTitleCase, getDayName } from "@/lib/format";
import { SearchBar, matchesSearch } from "@/components/SearchBar";
import { resolveChildren, ChildInfo } from "@/hooks/useChildren";
import { resolveMediaUrlSync } from "@/lib/api";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";
import { InfoModal } from "@/components/InfoModal";
import { SafeAvatar } from "@/components/ChildAvatar";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";

type StudentRow = {
  id: string;
  firstName?: string;
  lastName?: string;
  studentName?: string;
  photoUrl?: string;
  gender?: string;
  status?: string | null;
  className?: string;
  section?: string;
  rollNumber?: string;
  rollNo?: string;
};

type TeacherClass = {
  className: string;
  section?: string;
  role?: string;
};

type HistoryRecord = {
  id?: string;
  studentId?: string;
  studentName?: string;
  name?: string;
  photoUrl?: string;
  className?: string;
  section?: string;
  date?: string;
  status?: string;
  rollNumber?: string;
  rollNo?: string;
};

export default function AttendanceScreen() {
  const { user, themeColor } = useAuth();
  const color = themeColor || Colors.primary;
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      {user?.role === "TEACHER" && <TeacherAttendance color={color} />}
      {user?.role === "PARENT" && <ParentAttendance color={color} />}
      {(user?.role === "PRINCIPAL" || user?.role === "ADMIN") && (
        <PrincipalAttendance color={color} />
      )}
      {user?.role === "STUDENT" && <StudentAttendance color={color} />}
      {!["TEACHER", "PARENT", "PRINCIPAL", "ADMIN", "STUDENT"].includes(user?.role || "") && (
        <ViewerAttendance color={color} role={user?.role} />
      )}
    </View>
  );
}

function TeacherAttendance({ color }: { color: string }) {
  const { user } = useAuth();
  const [mainTab, setMainTab] = useState<"today" | "history">("today");
  const [q, setQ] = useState("");
  const [historyQ, setHistoryQ] = useState("");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "BOYS" | "GIRLS">("ALL");
  const [todayStatusFilter, setTodayStatusFilter] = useState<"ALL" | "PRESENT" | "ABSENT" | "LATE">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiBase, setApiBase] = useState("");
  const [infoModal, setInfoModal] = useState<{
    title: string;
    message?: string;
    variant?: "success" | "error" | "info";
  } | null>(null);

  // History & Reports State
  const [historyPreset, setHistoryPreset] = useState<string>("today");
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [fromDate, setFromDate] = useState<string>(today);
  const [toDate, setToDate] = useState<string>(today);
  const [historySubmittedFromDate, setHistorySubmittedFromDate] = useState<string>(today);
  const [historySubmittedToDate, setHistorySubmittedToDate] = useState<string>(today);
  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"excel" | "pdf" | null>(null);

  const classesRef = useRef<TeacherClass[]>([]);
  const activeIdxRef = useRef(0);

  useEffect(() => {
    getApiBase().then(setApiBase);
  }, []);

  const normalize = (list: any[]): StudentRow[] =>
    list
      .map((s: any, i: number) => {
        const id = String(s.id || s.studentId || `tmp-${i}`);
        return {
          id,
          firstName: s.firstName,
          lastName: s.lastName,
          studentName:
            s.studentName ||
            `${s.firstName || ""} ${s.lastName || ""}`.trim() ||
            undefined,
          photoUrl: s.photoUrl,
          gender: s.gender,
          status: s.status,
          className: s.className,
          section: s.section,
          rollNumber: s.rollNumber || s.rollNo || undefined,
          rollNo: s.rollNumber || s.rollNo || undefined,
        };
      })
      .filter((s) => s.id);

  const loadClassesOnce = useCallback(async () => {
    try {
      const data = await api<any>("/api/teacher-classes");
      let list: TeacherClass[] = data.classes || [];
      // Only CLASS_TEACHER can take attendance
      list = list.filter((c: any) => c.role === "CLASS_TEACHER");
      const seen = new Set<string>();
      list = list.filter((c: any) => {
        const k = `${c.className}|${c.section || ""}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      classesRef.current = list;
      setClasses(list);
      if (list.length && activeIdxRef.current >= list.length) {
        activeIdxRef.current = 0;
        setActiveIdx(0);
      }
      return list;
    } catch {
      classesRef.current = [];
      setClasses([]);
      return [];
    }
  }, []);

  const loadStudentsFor = useCallback(
    async (clsList: TeacherClass[], idx: number, quiet = false) => {
      if (!quiet) setListLoading(true);
      const active = clsList[idx];
      setSaved(false);
      try {
        let list: StudentRow[] = [];
        if (active?.className) {
          const params = new URLSearchParams({
            className: active.className,
            date: today,
          });
          if (active.section) params.set("section", active.section);
          try {
            const data = await api<any>(`/api/attendance/class?${params.toString()}`);
            list = normalize(data.students || data.list || data.attendance || []);
          } catch {
            list = [];
          }
        }
        if (!list.length) {
          const data = await api<any>("/api/teacher-classes?students=1");
          let raw = data.students || [];
          if (active?.className) {
            raw = raw.filter(
              (s: any) =>
                s.className === active.className &&
                (!active.section || s.section === active.section)
            );
          }
          list = normalize(raw);
        }
        setStudents(list);
        const map: Record<string, string> = {};
        list.forEach((s) => {
          if (s.status === "PRESENT" || s.status === "ABSENT" || s.status === "LATE") {
            map[s.id] = s.status;
          }
        });
        setStatusMap(map);
      } catch {
        setStudents([]);
        setStatusMap({});
      } finally {
        setListLoading(false);
        setRefreshing(false);
        setInitialLoading(false);
      }
    },
    [today]
  );

  const loadHistoryRecords = useCallback(async () => {
    if (!fromDate || !toDate) return;
    const active = classesRef.current[activeIdxRef.current];
    if (!active?.className) {
      setHistoryRecords([]);
      setHistorySubmittedFromDate(fromDate);
      setHistorySubmittedToDate(toDate);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const qParams = new URLSearchParams({
        type: "student",
        format: "json",
        from: fromDate,
        to: toDate,
        className: active.className,
      });
      if (active.section) qParams.set("section", active.section);
      if (statusFilter && statusFilter !== "ALL") qParams.set("status", statusFilter);

      const res = await api<any>(`/api/attendance/export?${qParams.toString()}`);
      setHistoryRecords(res.records || []);
      setHistorySubmittedFromDate(fromDate);
      setHistorySubmittedToDate(toDate);
    } catch {
      setHistoryRecords([]);
      setHistorySubmittedFromDate(fromDate);
      setHistorySubmittedToDate(toDate);
    } finally {
      setHistoryLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, toDate, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      setMainTab("today");
      setQ("");
      setHistoryQ("");
      setGenderFilter("ALL");
      setTodayStatusFilter("ALL");
      setStatusFilter("ALL");
      setInitialLoading(true);
      let cancelled = false;
      (async () => {
        const list = await loadClassesOnce();
        if (cancelled) return;
        await loadStudentsFor(list, activeIdxRef.current, false);
      })();
      return () => {
        cancelled = true;
        setQ("");
        setHistoryQ("");
        setGenderFilter("ALL");
        setTodayStatusFilter("ALL");
        setStatusFilter("ALL");
      };
    }, [loadClassesOnce, loadStudentsFor])
  );

  const applyHistoryPreset = (p: string) => {
    setHistoryPreset(p);
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const todayStr = fmt(now);

    switch (p) {
      case "today":
        setFromDate(todayStr);
        setToDate(todayStr);
        break;
      case "yesterday": {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        const yStr = fmt(y);
        setFromDate(yStr);
        setToDate(yStr);
        break;
      }
      case "last7": {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        setFromDate(fmt(d));
        setToDate(todayStr);
        break;
      }
      case "thisMonth": {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        setFromDate(fmt(firstDay));
        setToDate(todayStr);
        break;
      }
      case "last30": {
        const d = new Date();
        d.setDate(d.getDate() - 29);
        setFromDate(fmt(d));
        setToDate(todayStr);
        break;
      }
    }
  };

  const onSelectClass = (i: number) => {
    if (i === activeIdxRef.current) return;
    activeIdxRef.current = i;
    setActiveIdx(i);
    setQ("");
    setHistoryQ("");
    setGenderFilter("ALL");
    setTodayStatusFilter("ALL");
    setStatusFilter("ALL");
    if (mainTab === "today") {
      loadStudentsFor(classesRef.current, i, false);
    }
  };

  const setStatus = (id: string, status: string) => {
    if (!id) return;
    setSaved(false);
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  };

  const markAllPresent = () => {
    setSaved(false);
    const map: Record<string, string> = {};
    students.forEach((s) => {
      if (s.id) map[s.id] = "PRESENT";
    });
    setStatusMap(map);
  };

  const save = async () => {
    const unmarked = students.filter((s) => !statusMap[s.id]);
    if (unmarked.length > 0) {
      setInfoModal({
        title: "Incomplete Attendance",
        message: `Please mark attendance for all students (${unmarked.length} remaining) or tap "All Present".`,
        variant: "info",
      });
      return;
    }
    const records = Object.entries(statusMap)
      .filter(([studentId]) => studentId && !studentId.startsWith("tmp-"))
      .map(([studentId, status]) => ({ studentId, status }));
    if (!records.length) {
      setInfoModal({ title: "Nothing to save", message: "No students in this class", variant: "info" });
      return;
    }
    setSaving(true);
    try {
      await api("/api/attendance/mark", {
        method: "POST",
        body: { date: today, records },
      });
      setSaved(true);
      setInfoModal({
        title: "Attendance saved",
        message: `Saved for ${formatDateDDMMYYYY(today)} · ${records.filter((r) => r.status === "PRESENT").length} present, ${records.filter((r) => r.status === "ABSENT").length} absent.`,
        variant: "success",
      });
      await loadStudentsFor(classesRef.current, activeIdxRef.current, true);
    } catch (e: any) {
      setInfoModal({ title: "Save failed", message: e?.message || "Failed to save", variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async (format: "excel" | "pdf") => {
    setExportingFormat(format);
    try {
      const base = await getApiBase();
      const token = await getToken();
      const activeCls = classes[activeIdx];
      const clsName = activeCls?.className || "";
      const secName = activeCls?.section || "";

      if (format === "excel") {
        const params = new URLSearchParams({
          type: "student",
          format: "excel",
          from: fromDate,
          to: toDate,
        });
        if (clsName) {
          params.set("className", clsName);
          if (secName) params.set("section", secName);
        }
        if (statusFilter !== "ALL") params.set("status", statusFilter);

        const res = await fetch(`${base}/api/attendance/export?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        const xml = await res.text();
        const filename = `attendance_${clsName ? `${clsName}_` : ""}${fromDate}_to_${toDate}_${Date.now()}.xls`;

        if (Platform.OS === "android" && (FileSystem as any).StorageAccessFramework) {
          try {
            const permissions =
              await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const fileUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                filename,
                "application/vnd.ms-excel"
              );
              await FileSystem.writeAsStringAsync(fileUri, xml, {
                encoding: (FileSystem as any).EncodingType.UTF8,
              });
              setInfoModal({
                title: "Downloaded Successfully",
                message: `Saved Excel file to your selected folder:\n${filename}`,
                variant: "success",
              });
              return;
            }
          } catch {
            /* fallback */
          }
        }

        const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
        const fileUri = `${dir}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, xml, {
          encoding: (FileSystem as any).EncodingType.UTF8,
        });

        if (Platform.OS === "ios") {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "application/vnd.ms-excel",
              UTI: "com.microsoft.excel.xls",
            });
          }
        } else {
          setInfoModal({
            title: "Downloaded Successfully",
            message: `File saved to local storage:\n${filename}`,
            variant: "success",
          });
        }
      } else {
        // PDF HTML Report
        const schoolTitle = (user as any)?.schoolName || "MySchool Platform";
        const schoolAddress = (user as any)?.schoolAddress || (user as any)?.schoolLocation || "";
        const schoolLogoUrl = resolveMediaUrlSync((user as any)?.schoolLogo, apiBase);
        const presentCount = historyRecords.filter((r) => String(r.status).toUpperCase().includes("PRESENT")).length;
        const absentCount = historyRecords.filter((r) => String(r.status).toUpperCase().includes("ABSENT")).length;
        const lateCount = historyRecords.filter((r) => String(r.status).toUpperCase().includes("LATE")).length;

        const htmlReport = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${schoolTitle} - Attendance History</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; }
    .card-wrap { border: 2px solid ${color}; border-radius: 16px; padding: 24px; background: #ffffff; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 20px; }
    .header-logo-title { display: flex; align-items: center; gap: 16px; }
    .logo-img { width: 56px; height: 56px; object-fit: contain; border-radius: 12px; }
    .logo-ph { width: 56px; height: 56px; border-radius: 12px; background: ${color}; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 20px; }
    .school-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .school-addr { font-size: 12px; color: #64748b; margin-top: 2px; }
    .report-badge { background: ${color}15; color: ${color}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }

    .meta-grid { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 18px; margin-bottom: 16px; font-size: 12px; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-lbl { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-val { font-size: 13px; font-weight: 800; color: #0f172a; }

    .stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
    .stat-card { flex: 1; padding: 10px 14px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0; }
    .stat-num { font-size: 18px; font-weight: 800; }
    .stat-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 2px; }

    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-top: 8px; font-size: 12px; }
    th { background: #1e293b; color: #ffffff; text-align: left; padding: 12px; font-size: 11px; font-weight: 700; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background: #f8fafc; }

    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 10px; text-transform: uppercase; }
    .badge-present { background: #dcfce7; color: #15803d; }
    .badge-absent { background: #fee2e2; color: #b91c1c; }
    .badge-late { background: #fef3c7; color: #b45309; }

    .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="card-wrap">
    <div class="header">
      <div class="header-logo-title">
        ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" class="logo-img" />` : `<div class="logo-ph">MS</div>`}
        <div>
          <h1 class="school-name">${schoolTitle}</h1>
          ${schoolAddress ? `<div class="school-addr">${schoolAddress}</div>` : ''}
        </div>
      </div>
      <div class="report-badge">Attendance History</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-lbl">Date Range</span>
        <span class="meta-val">${formatDateDDMMYYYY(fromDate)} to ${formatDateDDMMYYYY(toDate)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-lbl">Class</span>
        <span class="meta-val">${clsName || "All Classes"} ${secName ? `(${secName})` : ""}</span>
      </div>
      <div class="meta-item">
        <span class="meta-lbl">Total Records</span>
        <span class="meta-val">${historyRecords.length}</span>
      </div>
      <div class="meta-item">
        <span class="meta-lbl">Generated On</span>
        <span class="meta-val">${formatDateTimeDDMMYYYY(new Date())}</span>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card" style="background: #f0fdf4; border-color: #bbf7d0;">
        <div class="stat-num" style="color: #15803d;">${presentCount}</div>
        <div class="stat-lbl" style="color: #166534;">Present</div>
      </div>
      <div class="stat-card" style="background: #fef2f2; border-color: #fecaca;">
        <div class="stat-num" style="color: #b91c1c;">${absentCount}</div>
        <div class="stat-lbl" style="color: #991b1b;">Absent</div>
      </div>
      <div class="stat-card" style="background: #fffbeb; border-color: #fde68a;">
        <div class="stat-num" style="color: #b45309;">${lateCount}</div>
        <div class="stat-lbl" style="color: #92400e;">Late</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 36px; text-align: center;">#</th>
          <th>Date</th>
          <th>Student Name</th>
          <th>Class</th>
          <th style="text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${
          historyRecords.length === 0
            ? `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px;">No attendance records found for this period</td></tr>`
            : historyRecords
                .map((r: any, idx: number) => {
                  const st = (r.status || "PRESENT").toUpperCase();
                  const badgeClass = st.includes("PRESENT")
                    ? "badge-present"
                    : st.includes("ABSENT")
                    ? "badge-absent"
                    : "badge-late";
                  return `
          <tr>
            <td style="text-align: center; color: #64748b;">${idx + 1}</td>
            <td>${formatDateDDMMYYYY(r.date) || "—"}</td>
            <td><strong>${toTitleCase(r.studentName || r.name || "Student")}</strong>${(r.rollNumber || r.rollNo) ? `<div style="font-size: 10px; color: #64748b; font-weight: normal;">Roll: ${r.rollNumber || r.rollNo}</div>` : ""}</td>
            <td>${r.className || "—"}${r.section ? `-${r.section}` : ""}</td>
            <td style="text-align: center;"><span class="badge ${badgeClass}">${st}</span></td>
          </tr>`;
                })
                .join("")
        }
      </tbody>
    </table>

    <div class="footer">
      Generated automatically by ${schoolTitle} Management System.
    </div>
  </div>
</body>
</html>`;

        const { uri: pdfTempUri } = await Print.printToFileAsync({ html: htmlReport });
        const filename = `attendance_history_${clsName ? `${clsName}_` : ""}${Date.now()}.pdf`;
        const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
        const fileUri = `${dir}${filename}`;
        await FileSystem.copyAsync({ from: pdfTempUri, to: fileUri });

        if (Platform.OS === "android" && (FileSystem as any).StorageAccessFramework) {
          try {
            const permissions =
              await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const base64Data = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const createdUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                filename,
                "application/pdf"
              );
              await FileSystem.writeAsStringAsync(createdUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              setInfoModal({
                title: "Downloaded Successfully",
                message: `Saved PDF report to:\n${filename}`,
                variant: "success",
              });
              return;
            }
          } catch {
            /* fallback */
          }
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: "Attendance History Report",
            UTI: "com.adobe.pdf",
          });
        }
        setInfoModal({
          title: "Downloaded Successfully",
          message: `PDF report saved:\n${filename}`,
          variant: "success",
        });
      }
    } catch (e: any) {
      setInfoModal({
        title: "Download Error",
        message: e?.message || "Failed to download attendance file",
        variant: "error",
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const isMale = (gender?: string) => {
    const g = String(gender || "").toUpperCase().trim();
    return g === "MALE" || g === "BOY" || g === "M";
  };

  const isFemale = (gender?: string) => {
    const g = String(gender || "").toUpperCase().trim();
    return g === "FEMALE" || g === "GIRL" || g === "F";
  };

  const boysCount = useMemo(() => students.filter((s) => isMale(s.gender)).length, [students]);
  const girlsCount = useMemo(() => students.filter((s) => isFemale(s.gender)).length, [students]);

  const filteredStudents = useMemo(() => {
    return students
      .filter((s) => {
        if (genderFilter === "BOYS") return isMale(s.gender);
        if (genderFilter === "GIRLS") return isFemale(s.gender);
        return true;
      })
      .filter((s) => {
        if (todayStatusFilter === "ALL") return true;
        const currentStatus = (statusMap[s.id] || s.status || "").toUpperCase();
        return currentStatus === todayStatusFilter;
      })
      .filter((s) => matchesSearch(s, q));
  }, [students, genderFilter, todayStatusFilter, statusMap, q]);

  const viewStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    students.forEach((s) => {
      const st = String(s.status || "").toUpperCase();
      if (st === "PRESENT") present += 1;
      else if (st === "ABSENT") absent += 1;
      else if (st === "LATE") late += 1;
    });
    const total = students.length;
    const percentage = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { present, absent, late, total, percentage };
  }, [students]);

  const historyStats = useMemo(() => {
    const total = historyRecords.length;
    const present = historyRecords.filter((r) => String(r.status || "").toUpperCase() === "PRESENT").length;
    const late = historyRecords.filter((r) => String(r.status || "").toUpperCase() === "LATE").length;
    const absent = historyRecords.filter((r) => String(r.status || "").toUpperCase() === "ABSENT").length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, rate };
  }, [historyRecords]);

  const isHistoryMultiDay = historySubmittedFromDate !== historySubmittedToDate;

  const aggregatedHistoryStudents = useMemo(() => {
    const map = new Map<string, {
      studentId: string;
      studentName: string;
      rollNumber?: string;
      rollNo?: string;
      photoUrl?: string;
      gender?: string;
      className?: string;
      section?: string;
      totalPresent: number;
      totalLate: number;
      totalAbsent: number;
      totalDays: number;
      attendanceRate: number;
    }>();

    historyRecords.forEach((r: any) => {
      const key = r.studentId || r.studentName || `${r.className}-${r.rollNumber || r.rollNo}`;
      if (!key) return;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          studentId: r.studentId || key,
          studentName: r.studentName || r.name || "Student",
          rollNumber: r.rollNumber || r.rollNo || "",
          photoUrl: r.photoUrl || "",
          gender: r.gender || "",
          className: r.className || "",
          section: r.section || "",
          totalPresent: 0,
          totalLate: 0,
          totalAbsent: 0,
          totalDays: 0,
          attendanceRate: 0,
        };
        map.set(key, entry);
      }
      const st = String(r.status || "").toUpperCase();
      if (st === "PRESENT") entry.totalPresent += 1;
      else if (st === "ABSENT") entry.totalAbsent += 1;
      else if (st === "LATE" || st === "HALF_DAY") entry.totalLate += 1;
      entry.totalDays += 1;
    });

    const list = Array.from(map.values()).map((s) => {
      const rate = s.totalDays > 0 ? Math.round(((s.totalPresent + s.totalLate * 0.5) / s.totalDays) * 100) : 0;
      return { ...s, attendanceRate: rate };
    });

    const filtered = list.filter((s) => matchesSearch(s, historyQ));
    return filtered.sort((a, b) => {
      const rollA = parseInt(a.rollNumber || "0", 10);
      const rollB = parseInt(b.rollNumber || "0", 10);
      if (!isNaN(rollA) && !isNaN(rollB) && rollA !== rollB && rollA > 0 && rollB > 0) {
        return rollA - rollB;
      }
      return a.studentName.localeCompare(b.studentName);
    });
  }, [historyRecords, historyQ]);

  const filteredHistory = useMemo(() => {
    return historyRecords.filter(
      (r) =>
        matchesSearch(r, historyQ) ||
        String(r.date || "").includes(historyQ) ||
        formatDateDDMMYYYY(r.date).includes(historyQ)
    );
  }, [historyRecords, historyQ]);

  const [todayPage, setTodayPage] = useState(1);
  const [multiHistoryPage, setMultiHistoryPage] = useState(1);
  const [singleHistoryPage, setSingleHistoryPage] = useState(1);

  useEffect(() => {
    setTodayPage(1);
  }, [q, genderFilter, todayStatusFilter, activeIdx, mainTab]);

  useEffect(() => {
    setMultiHistoryPage(1);
    setSingleHistoryPage(1);
  }, [historyQ, fromDate, toDate, statusFilter, activeIdx, mainTab]);

  const visibleStudents = useMemo(
    () => filteredStudents.slice(0, todayPage * 20),
    [filteredStudents, todayPage]
  );
  const hasMoreToday = visibleStudents.length < filteredStudents.length;
  const handleLoadMoreToday = () => {
    if (hasMoreToday) setTodayPage((p) => p + 1);
  };

  const visibleMultiHistory = useMemo(
    () => aggregatedHistoryStudents.slice(0, multiHistoryPage * 20),
    [aggregatedHistoryStudents, multiHistoryPage]
  );
  const hasMoreMultiHistory = visibleMultiHistory.length < aggregatedHistoryStudents.length;
  const handleLoadMoreMultiHistory = () => {
    if (hasMoreMultiHistory) setMultiHistoryPage((p) => p + 1);
  };

  const visibleSingleHistory = useMemo(
    () => filteredHistory.slice(0, singleHistoryPage * 20),
    [filteredHistory, singleHistoryPage]
  );
  const hasMoreSingleHistory = visibleSingleHistory.length < filteredHistory.length;
  const handleLoadMoreSingleHistory = () => {
    if (hasMoreSingleHistory) setSingleHistoryPage((p) => p + 1);
  };

  if (initialLoading) return <Loading />;

  if (classes.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Ionicons name="school-outline" size={32} color="#d97706" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: "700", color: "#0f172a", marginBottom: 8, textAlign: "center" }}>
          No classes allocated for you
        </Text>
        <Text style={{ fontSize: 14, color: "#64748b", textAlign: "center", maxWidth: 280, lineHeight: 20 }}>
          You have not been assigned to any classes or subjects yet. Please contact the administrator.
        </Text>
      </View>
    );
  }

  const active = classes[activeIdx];

  const renderTodayHeader = () => (
    <View style={{ paddingBottom: 4 }}>
      {/* Class Selector Tabs */}
      {classes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabs, { marginHorizontal: -spacing.md, marginTop: 4 }]}
          contentContainerStyle={styles.tabsContent}
        >
          {classes.map((c, i) => {
            const on = i === activeIdx;
            return (
              <Pressable
                key={`${c.className}-${c.section}-${i}`}
                onPress={() => onSelectClass(i)}
                style={[styles.classTab, on && { backgroundColor: color, borderColor: color }]}
              >
                <Text style={[styles.classTabText, on && { color: "#fff" }]}>
                  {c.className}
                  {c.section ? `-${c.section}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Row 1: Date Badge + Boys & Girls Taps with Counts in Same Row */}
      <View style={[styles.todayHeaderRow1, { paddingHorizontal: 0 }]}>
        <View style={styles.todayDateBadge}>
          <Ionicons name="calendar-outline" size={13} color={color} />
          <Text style={styles.todayDateText}>{formatDateDDMMYYYY(today)}</Text>
        </View>

        <View style={styles.genderChipsGroup}>
          <Pressable
            onPress={() => setGenderFilter(genderFilter === "BOYS" ? "ALL" : "BOYS")}
            style={[
              styles.genderChipRow1,
              genderFilter === "BOYS" && { backgroundColor: "#2563EB", borderColor: "#2563EB" },
            ]}
          >
            <Text
              style={[
                styles.genderChipTextRow1,
                genderFilter === "BOYS" ? { color: "#fff" } : { color: "#2563EB" },
              ]}
            >
              👦 Boys ({boysCount})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setGenderFilter(genderFilter === "GIRLS" ? "ALL" : "GIRLS")}
            style={[
              styles.genderChipRow1,
              genderFilter === "GIRLS" && { backgroundColor: "#DB2777", borderColor: "#DB2777" },
            ]}
          >
            <Text
              style={[
                styles.genderChipTextRow1,
                genderFilter === "GIRLS" ? { color: "#fff" } : { color: "#DB2777" },
              ]}
            >
              👧 Girls ({girlsCount})
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Row 2: Small UI Tabs with Attendance %, Present, Absent, Late with Counts - Click to filter */}
      <View style={[styles.todayHeaderRow2, { paddingHorizontal: 0 }]}>
        <Pressable
          onPress={() => setTodayStatusFilter("ALL")}
          style={[
            styles.statTabSmall,
            { borderColor: color + "44", backgroundColor: color + "0D" },
            todayStatusFilter === "ALL" && {
              borderColor: color,
              borderWidth: 2,
              backgroundColor: color + "22",
            },
          ]}
        >
          <Text style={[styles.statTabSmallValue, { color }]}>{viewStats.percentage}%</Text>
          <Text style={[styles.statTabSmallLabel, todayStatusFilter === "ALL" && { color, fontWeight: "800" }]}>
            Attendance
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTodayStatusFilter((prev) => (prev === "PRESENT" ? "ALL" : "PRESENT"))}
          style={[
            styles.statTabSmall,
            { borderColor: Colors.success + "44", backgroundColor: Colors.success + "0D" },
            todayStatusFilter === "PRESENT" && {
              borderColor: Colors.success,
              borderWidth: 2,
              backgroundColor: Colors.success + "22",
            },
          ]}
        >
          <Text style={[styles.statTabSmallValue, { color: Colors.success }]}>{viewStats.present}</Text>
          <Text style={[styles.statTabSmallLabel, todayStatusFilter === "PRESENT" && { color: Colors.success, fontWeight: "800" }]}>
            Present
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTodayStatusFilter((prev) => (prev === "ABSENT" ? "ALL" : "ABSENT"))}
          style={[
            styles.statTabSmall,
            { borderColor: Colors.danger + "44", backgroundColor: Colors.danger + "0D" },
            todayStatusFilter === "ABSENT" && {
              borderColor: Colors.danger,
              borderWidth: 2,
              backgroundColor: Colors.danger + "22",
            },
          ]}
        >
          <Text style={[styles.statTabSmallValue, { color: Colors.danger }]}>{viewStats.absent}</Text>
          <Text style={[styles.statTabSmallLabel, todayStatusFilter === "ABSENT" && { color: Colors.danger, fontWeight: "800" }]}>
            Absent
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setTodayStatusFilter((prev) => (prev === "LATE" ? "ALL" : "LATE"))}
          style={[
            styles.statTabSmall,
            { borderColor: Colors.warning + "44", backgroundColor: Colors.warning + "0D" },
            todayStatusFilter === "LATE" && {
              borderColor: Colors.warning,
              borderWidth: 2,
              backgroundColor: Colors.warning + "22",
            },
          ]}
        >
          <Text style={[styles.statTabSmallValue, { color: Colors.warning }]}>{viewStats.late}</Text>
          <Text style={[styles.statTabSmallLabel, todayStatusFilter === "LATE" && { color: Colors.warning, fontWeight: "800" }]}>
            Late
          </Text>
        </Pressable>
      </View>

      <View style={{ marginHorizontal: -spacing.md }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search student name…" />
      </View>

      {saved && !q.trim() && (
        <Text
          style={{
            textAlign: "center",
            color: Colors.success,
            fontWeight: "700",
            marginBottom: 6,
            fontSize: 12,
          }}
        >
          Saved · {viewStats.present} present · {viewStats.late} late · {viewStats.absent} absent · {viewStats.percentage}%
        </Text>
      )}

      {/* Compact, responsive action buttons */}
      {!q.trim() && (
        <View style={[styles.compactActionsRow, { paddingHorizontal: 0 }]}>
          <Pressable
            onPress={markAllPresent}
            style={[styles.compactActionBtn, styles.compactActionBtnOutline, { borderColor: color }]}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={color} />
            <Text style={[styles.compactActionBtnText, { color }]}>All Present</Text>
          </Pressable>

          <Pressable
            onPress={save}
            disabled={saving}
            style={[styles.compactActionBtn, { backgroundColor: color }]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={[styles.compactActionBtnText, { color: "#fff" }]}>
                  Save attendance
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );

  const renderHistoryHeader = () => (
    <View style={{ paddingBottom: 4 }}>
      {/* Class Selector Tabs */}
      {classes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabs, { marginHorizontal: -spacing.md, marginTop: 4 }]}
          contentContainerStyle={styles.tabsContent}
        >
          {classes.map((c, i) => {
            const on = i === activeIdx;
            return (
              <Pressable
                key={`${c.className}-${c.section}-${i}`}
                onPress={() => onSelectClass(i)}
                style={[styles.classTab, on && { backgroundColor: color, borderColor: color }]}
              >
                <Text style={[styles.classTabText, on && { color: "#fff" }]}>
                  {c.className}
                  {c.section ? `-${c.section}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Preset Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.presetScroll, { marginHorizontal: -spacing.md }]}
        contentContainerStyle={styles.presetContent}
      >
        {[
          { id: "today", label: "Today" },
          { id: "yesterday", label: "Yesterday" },
          { id: "last7", label: "Last 7 Days" },
          { id: "thisMonth", label: "This Month" },
          { id: "last30", label: "Last 30 Days" },
        ].map((p) => {
          const on = historyPreset === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => applyHistoryPreset(p.id)}
              style={[styles.presetChip, on && { backgroundColor: color, borderColor: color }]}
            >
              <Text style={[styles.presetChipText, on && { color: "#fff" }]}>
                {p.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Date range display */}
      <View style={[styles.historyRangeBar, { marginHorizontal: 0 }]}>
        <Ionicons name="calendar-outline" size={14} color="#64748B" />
        <Text style={styles.historyRangeText}>
          Selected: {formatDateDDMMYYYY(fromDate)} {fromDate !== toDate ? `to ${formatDateDDMMYYYY(toDate)}` : ""}
        </Text>
      </View>

      {/* Status Filter Chips */}
      <View style={[styles.statusChipsRow, { paddingHorizontal: 0 }]}>
        {["ALL", "PRESENT", "LATE", "ABSENT"].map((st) => {
          const on = statusFilter === st;
          return (
            <Pressable
              key={st}
              onPress={() => setStatusFilter(st)}
              style={[
                styles.statusChip,
                on && { backgroundColor: "#0F172A", borderColor: "#0F172A" },
              ]}
            >
              <Text style={[styles.statusChipText, on && { color: "#fff" }]}>
                {st === "ALL" ? "All Status" : st === "PRESENT" ? "Present" : st === "LATE" ? "Late" : "Absent"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Submit Button to load attendance records on demand */}
      <View style={{ marginVertical: 4 }}>
        <Pressable
          onPress={loadHistoryRecords}
          disabled={historyLoading}
          style={[styles.historySubmitBtn, { backgroundColor: color }]}
        >
          {historyLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="filter-outline" size={15} color="#fff" />
              <Text style={styles.historySubmitBtnText}>Submit</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Search Bar */}
      <View style={{ marginHorizontal: -spacing.md }}>
        <SearchBar
          value={historyQ}
          onChangeText={setHistoryQ}
          placeholder="Search student name or date…"
        />
      </View>

      {/* Showing submitted range info banner */}
      <View style={[styles.historyShowingBar, { marginHorizontal: 0 }]}>
        <Ionicons name="time-outline" size={13} color={color} />
        <Text style={styles.historyShowingText}>
          Showing: {formatDateDDMMYYYY(historySubmittedFromDate)} {historySubmittedFromDate !== historySubmittedToDate ? `to ${formatDateDDMMYYYY(historySubmittedToDate)}` : ""}
          {isHistoryMultiDay ? ` · ${aggregatedHistoryStudents.length} Students` : ` · ${filteredHistory.length} Records`}
        </Text>
      </View>

      {/* KPI Summary Cards */}
      <View style={[styles.statsRow, { paddingHorizontal: 0 }]}>
        <View style={[styles.statCard, { borderColor: color + "44" }]}>
          <Text style={[styles.statNum, { color }]}>{historyStats.rate}%</Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.success + "55" }]}>
          <Text style={[styles.statNum, { color: Colors.success }]}>{historyStats.present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.warning + "55" }]}>
          <Text style={[styles.statNum, { color: Colors.warning }]}>{historyStats.late}</Text>
          <Text style={styles.statLabel}>Late</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.danger + "55" }]}>
          <Text style={[styles.statNum, { color: Colors.danger }]}>{historyStats.absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
      </View>

      {/* Export Action Buttons */}
      <View style={[styles.exportButtonsRow, { paddingHorizontal: 0 }]}>
        <Pressable
          onPress={() => handleExport("excel")}
          disabled={!!exportingFormat || historyRecords.length === 0}
          style={[
            styles.exportBtn,
            { backgroundColor: "#10B981" },
            (exportingFormat || historyRecords.length === 0) && { opacity: 0.6 },
          ]}
        >
          {exportingFormat === "excel" ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text-outline" size={15} color="#fff" />
              <Text style={styles.exportBtnText}>Export Excel</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={() => handleExport("pdf")}
          disabled={!!exportingFormat || historyRecords.length === 0}
          style={[
            styles.exportBtn,
            { backgroundColor: "#6366F1" },
            (exportingFormat || historyRecords.length === 0) && { opacity: 0.6 },
          ]}
        >
          {exportingFormat === "pdf" ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="download-outline" size={15} color="#fff" />
              <Text style={styles.exportBtnText}>Export PDF</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      {/* Top Tab Switcher: Today's Attendance vs Attendance History & Reports - ONLY THIS STAYS STICKY */}
      <View style={styles.headerControlRow}>
        <View style={styles.tabRowFlex}>
          <Pressable
            onPress={() => {
              setQ("");
              setHistoryQ("");
              setMainTab("today");
              setTodayStatusFilter("ALL");
            }}
            style={[
              styles.mainTab,
              mainTab === "today" && { backgroundColor: color, borderColor: color },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons
                name="calendar-outline"
                size={15}
                color={mainTab === "today" ? "#fff" : Colors.text}
              />
              <Text style={[styles.mainTabText, mainTab === "today" && { color: "#fff" }]}>
                Today's Attendance
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              setQ("");
              setHistoryQ("");
              setMainTab("history");
              loadHistoryRecords();
            }}
            style={[
              styles.mainTab,
              mainTab === "history" && { backgroundColor: color, borderColor: color },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons
                name="time-outline"
                size={15}
                color={mainTab === "history" ? "#fff" : Colors.text}
              />
              <Text style={[styles.mainTabText, mainTab === "history" && { color: "#fff" }]}>
                History & Reports
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ===================== TAB 1: TODAY'S ATTENDANCE ===================== */}
      {mainTab === "today" && (
        <FlatList
          data={visibleStudents}
          keyExtractor={(item) => item.id}
          extraData={[statusMap, todayStatusFilter]}
          ListHeaderComponent={renderTodayHeader()}
          keyboardShouldPersistTaps="handled"
          onEndReached={handleLoadMoreToday}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            hasMoreToday ? (
              <ActivityIndicator size="small" color={color} style={{ marginVertical: 16 }} />
            ) : null
          }
          contentContainerStyle={{
            padding: spacing.md,
            paddingTop: 4,
            paddingBottom: TAB_BAR_CLEARANCE,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadStudentsFor(classesRef.current, activeIdxRef.current, true);
              }}
              tintColor={color}
            />
          }
          ListEmptyComponent={
            listLoading ? (
              <ActivityIndicator size="large" color={color} style={{ marginVertical: 32 }} />
            ) : (
              <Empty
                message={
                  classes.length === 0
                    ? "Only class teachers can take attendance"
                    : q.trim()
                    ? "No matching students found"
                    : "No students in this class"
                }
              />
            )
          }
          renderItem={({ item }) => {
            const id = item.id;
            const st = statusMap[id];
            const name = toTitleCase(
              str(
                item.studentName ||
                  (item.firstName
                    ? `${str(item.firstName)} ${str(item.lastName)}`.trim()
                    : null),
                "Student"
              )
            );
            const isBoy = isMale(item.gender);
            const isGirl = isFemale(item.gender);

            return (
              <View style={styles.studentCardRow}>
                {/* Student Avatar */}
                <SafeAvatar
                  photoUrl={item.photoUrl}
                  name={item.firstName || item.studentName}
                  apiBase={apiBase}
                  size={42}
                  color={color}
                />

                {/* Student Info */}
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {name}
                    </Text>
                    {isBoy && (
                      <View style={[styles.genderTag, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: "#2563EB" }}>Boy</Text>
                      </View>
                    )}
                    {isGirl && (
                      <View style={[styles.genderTag, { backgroundColor: "#FDF2F8", borderColor: "#FBCFE8" }]}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: "#DB2777" }}>Girl</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.meta}>
                    {item.rollNumber || item.rollNo ? `Roll: ${item.rollNumber || item.rollNo} · ` : ""}
                    {str(item.className || active?.className)}
                    {item.section || active?.section ? ` · ${str(item.section || active?.section)}` : ""}
                  </Text>
                </View>

                {/* P / L / A Toggles */}
                <View style={styles.toggles}>
                  {(["PRESENT", "LATE", "ABSENT"] as const).map((s) => {
                    const on = st === s;
                    const bg =
                      s === "PRESENT"
                        ? Colors.success
                        : s === "LATE"
                        ? Colors.warning
                        : Colors.danger;
                    return (
                      <Pressable
                        key={`${id}-${s}`}
                        onPress={() => setStatus(id, s)}
                        style={[
                          styles.chip,
                          on ? { backgroundColor: bg, borderColor: bg } : { borderColor: "#E2E8F0" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            on ? { color: "#fff" } : { color: Colors.textMuted },
                          ]}
                        >
                          {s === "PRESENT" ? "P" : s === "LATE" ? "L" : "A"}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ===================== TAB 2: HISTORY & REPORTS ===================== */}
      {mainTab === "history" && (
        isHistoryMultiDay ? (
          /* Multi-Day: Aggregated Student Summary Cards */
          <FlatList
            data={visibleMultiHistory}
            keyExtractor={(item, idx) => item.studentId || `${item.studentName}-${idx}`}
            ListHeaderComponent={renderHistoryHeader()}
            keyboardShouldPersistTaps="handled"
            onEndReached={handleLoadMoreMultiHistory}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              hasMoreMultiHistory ? (
                <ActivityIndicator size="small" color={color} style={{ marginVertical: 16 }} />
              ) : null
            }
            contentContainerStyle={{
              padding: spacing.md,
              paddingTop: 4,
              paddingBottom: TAB_BAR_CLEARANCE,
              flexGrow: 1,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadHistoryRecords();
                }}
                tintColor={color}
              />
            }
            ListEmptyComponent={
              historyLoading ? (
                <ActivityIndicator size="large" color={color} style={{ marginVertical: 32 }} />
              ) : (
                <Empty message={historyQ.trim() ? "No matching records found" : "No attendance records found for this period"} />
              )
            }
            renderItem={({ item }) => {
              return (
                <View style={styles.historyCardRow}>
                  <SafeAvatar
                    photoUrl={item.photoUrl}
                    name={item.studentName}
                    apiBase={apiBase}
                    size={42}
                    color={color}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {toTitleCase(str(item.studentName, "Student"))}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      {(item.rollNumber || item.rollNo) ? (
                        <Text style={styles.meta}>Roll: {item.rollNumber || item.rollNo}</Text>
                      ) : null}
                      {(item.className || active?.className) ? (
                        <Text style={styles.meta}>
                          · Class {item.className || active?.className}
                          {item.section || active?.section ? `-${item.section || active?.section}` : ""}
                        </Text>
                      ) : null}
                    </View>
                    {/* Counts: Present, Late, Absent */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 }}>
                      <View style={[styles.miniCountBadge, { backgroundColor: "#DCFCE7", borderColor: "#86EFAC" }]}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#166534" }}>P: {item.totalPresent}</Text>
                      </View>
                      <View style={[styles.miniCountBadge, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#B45309" }}>L: {item.totalLate}</Text>
                      </View>
                      <View style={[styles.miniCountBadge, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
                        <Text style={{ fontSize: 11, fontWeight: "800", color: "#991B1B" }}>A: {item.totalAbsent}</Text>
                      </View>
                    </View>
                  </View>
                  {/* Rate pill */}
                  <View style={[styles.rateBadge, { backgroundColor: color + "12", borderColor: color + "33" }]}>
                    <Text style={[styles.rateBadgeText, { color }]}>{item.attendanceRate}%</Text>
                    <Text style={{ fontSize: 9, color: "#64748B", fontWeight: "600", marginTop: 1 }}>
                      {item.totalPresent + item.totalLate}/{item.totalDays}d
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        ) : (
          /* Single-Day: Daily Records List */
          <FlatList
            data={visibleSingleHistory}
            keyExtractor={(item, idx) => item.id || `${item.studentId}-${item.date}-${idx}`}
            ListHeaderComponent={renderHistoryHeader()}
            keyboardShouldPersistTaps="handled"
            onEndReached={handleLoadMoreSingleHistory}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              hasMoreSingleHistory ? (
                <ActivityIndicator size="small" color={color} style={{ marginVertical: 16 }} />
              ) : null
            }
            contentContainerStyle={{
              padding: spacing.md,
              paddingTop: 4,
              paddingBottom: TAB_BAR_CLEARANCE,
              flexGrow: 1,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadHistoryRecords();
                }}
                tintColor={color}
              />
            }
            ListEmptyComponent={
              historyLoading ? (
                <ActivityIndicator size="large" color={color} style={{ marginVertical: 32 }} />
              ) : (
                <Empty message={historyQ.trim() ? "No matching records found" : "No attendance records found for this period"} />
              )
            }
            renderItem={({ item }) => {
              const st = (item.status || "PRESENT").toUpperCase();
              const badgeColor = st.includes("PRESENT")
                ? Colors.success
                : st.includes("LATE")
                ? Colors.warning
                : Colors.danger;

              return (
                <View style={styles.historyCardRow}>
                  <SafeAvatar
                    photoUrl={item.photoUrl}
                    name={item.studentName || item.name}
                    apiBase={apiBase}
                    size={40}
                    color={color}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.name} numberOfLines={1}>
                      {toTitleCase(str(item.studentName || item.name, "Student"))}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      {(item.rollNumber || item.rollNo) && (
                        <Text style={styles.meta}>Roll: {item.rollNumber || item.rollNo}</Text>
                      )}
                      {item.date && (
                        <Text style={styles.historyDateText}>
                          {formatDateDDMMYYYY(item.date)}
                        </Text>
                      )}
                      {(item.className || active?.className) && (
                        <Text style={styles.meta}>
                          · Class {item.className || active?.className}
                          {item.section || active?.section ? `-${item.section || active?.section}` : ""}
                        </Text>
                      )}
                    </View>
                  </View>
                  <Badge text={st} color={badgeColor} />
                </View>
              );
            }}
          />
        )
      )}

      <InfoModal
        visible={!!infoModal}
        title={infoModal?.title || ""}
        message={infoModal?.message}
        variant={infoModal?.variant || "success"}
        onClose={() => setInfoModal(null)}
      />
    </View>
  );
}

function ParentAttendance({ color }: { color: string }) {
  const { user } = useAuth();
  const badges = useBadges();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [childIdx, setChildIdx] = useState(0);
  const [list, setList] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [apiBase, setApiBase] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
    percentage: 0,
  });

  const pageRef = useRef(1);
  pageRef.current = page;

  useEffect(() => {
    getApiBase().then(setApiBase);
  }, []);

  // Debounce search input
  useEffect(() => {
    const tmr = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(tmr);
  }, [q]);

  const load = useCallback(
    async (pageNum = 1, isAppend = false) => {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setListLoading(true);
      }
      try {
        const kids = children.length ? children : await resolveChildren(user);
        if (!children.length) setChildren(kids);
        const selectedKid = kids[childIdx] || kids[0];
        if (selectedKid) {
          const params = new URLSearchParams({
            studentId: selectedKid.id,
            page: String(pageNum),
            limit: "20",
            status: statusFilter,
          });
          if (debouncedQ.trim()) {
            params.set("q", debouncedQ.trim());
          }
          const data = await api<any>(`/api/attendance/student?${params.toString()}`);
          const records = Array.isArray(data.records)
            ? data.records
            : Array.isArray(data.attendance)
            ? data.attendance
            : [];
          if (isAppend) {
            setList((prev) => [...prev, ...records]);
          } else {
            setList(records);
          }
          setHasMore(Boolean(data.hasMore));
          setPage(pageNum);
          setStats({
            present: data.presentOnly ?? 0,
            absent: data.absent ?? 0,
            late: data.late ?? 0,
            total: data.total ?? 0,
            percentage: data.percentage ?? 0,
          });
        } else {
          setList([]);
          setHasMore(false);
          setStats({ present: 0, absent: 0, late: 0, total: 0, percentage: 0 });
        }
      } catch {
        if (!isAppend) setList([]);
      } finally {
        setListLoading(false);
        setLoadingMore(false);
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [user, childIdx, children, debouncedQ, statusFilter]
  );

  useFocusEffect(
    useCallback(() => {
      load(1, false);
    }, [load])
  );

  const handleLoadMore = () => {
    if (!loadingMore && !listLoading && hasMore) {
      load(pageRef.current + 1, true);
    }
  };

  return (
    <View style={styles.root}>
      {/* Child Switcher Tabs (ONLY if children.length > 1) */}
      {children.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 48, flexGrow: 0, flexShrink: 0, paddingHorizontal: 12, marginTop: 8, marginBottom: 4 }}
        >
          {children.map((c, i) => {
            const on = i === childIdx;
            const kidBadge = badges.childBadges?.[c.id]?.total || 0;
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  if (i === childIdx) return;
                  setQ("");
                  setChildIdx(i);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginRight: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 7,
                  borderRadius: 20,
                  borderWidth: 1.5,
                  borderColor: on ? color : Colors.border,
                  backgroundColor: on ? color : "#fff",
                }}
              >
                <SafeAvatar photoUrl={c.photoUrl} name={c.firstName} apiBase={apiBase} size={24} color={on ? "#ffffff" : color} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: on ? "#ffffff" : Colors.text }}>
                  {toTitleCase(c.firstName)}{" "}
                  <Text style={{ fontSize: 11, fontWeight: "500", color: on ? "rgba(255,255,255,0.85)" : Colors.textMuted }}>
                    ({c.className || ""}{c.section ? `-${c.section}` : ""})
                  </Text>
                </Text>
                {kidBadge > 0 && !on && (
                  <View style={{ backgroundColor: "#EF4444", borderRadius: 10, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                    <Text style={{ color: "#ffffff", fontSize: 10, fontWeight: "800" }}>{kidBadge}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {/* Top Search Bar */}
      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Search day or date (e.g. Monday, DD-MM-YYYY)…"
      />

      {/* Clickable KPI Cards (Attendance Rate, Present, Absent, Late) */}
      {!q.trim() && (
        <View style={styles.studentStatsGrid}>
          <Pressable
            onPress={() => setStatusFilter("ALL")}
            style={[
              styles.studentKpiCard,
              {
                backgroundColor: "#EEF2FF",
                borderColor: statusFilter === "ALL" ? "#4F46E5" : "#C7D2FE",
                borderWidth: statusFilter === "ALL" ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.studentKpiNum, { color: "#4F46E5" }]}>{stats.percentage}%</Text>
            <Text style={[styles.studentKpiLabel, { color: "#4338CA", fontWeight: statusFilter === "ALL" ? "800" : "600" }]}>
              Attendance
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter((prev) => (prev === "PRESENT" ? "ALL" : "PRESENT"))}
            style={[
              styles.studentKpiCard,
              {
                backgroundColor: "#F0FDF4",
                borderColor: statusFilter === "PRESENT" ? "#16A34A" : "#BBF7D0",
                borderWidth: statusFilter === "PRESENT" ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.studentKpiNum, { color: "#16A34A" }]}>{stats.present}</Text>
            <Text style={[styles.studentKpiLabel, { color: "#15803D", fontWeight: statusFilter === "PRESENT" ? "800" : "600" }]}>
              Present
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter((prev) => (prev === "ABSENT" ? "ALL" : "ABSENT"))}
            style={[
              styles.studentKpiCard,
              {
                backgroundColor: "#FEF2F2",
                borderColor: statusFilter === "ABSENT" ? "#DC2626" : "#FECACA",
                borderWidth: statusFilter === "ABSENT" ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.studentKpiNum, { color: "#DC2626" }]}>{stats.absent}</Text>
            <Text style={[styles.studentKpiLabel, { color: "#B91C1C", fontWeight: statusFilter === "ABSENT" ? "800" : "600" }]}>
              Absent
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter((prev) => (prev === "LATE" ? "ALL" : "LATE"))}
            style={[
              styles.studentKpiCard,
              {
                backgroundColor: "#FFFBEB",
                borderColor: statusFilter === "LATE" ? "#D97706" : "#FDE68A",
                borderWidth: statusFilter === "LATE" ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.studentKpiNum, { color: "#D97706" }]}>{stats.late}</Text>
            <Text style={[styles.studentKpiLabel, { color: "#B45309", fontWeight: statusFilter === "LATE" ? "800" : "600" }]}>
              Late
            </Text>
          </Pressable>
        </View>
      )}

      {/* Attendance List */}
      <FlatList
        data={list}
        keyExtractor={(item, i) => item.id || item.date || String(i)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={color} style={{ marginVertical: 16 }} />
          ) : null
        }
        contentContainerStyle={{
          padding: spacing.md,
          paddingTop: 6,
          paddingBottom: TAB_BAR_CLEARANCE,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(1, false);
            }}
            tintColor={color}
          />
        }
        ListEmptyComponent={
          listLoading ? (
            <ActivityIndicator size="large" color={color} style={{ marginVertical: 32 }} />
          ) : (
            <Empty
              message={
                q.trim() || statusFilter !== "ALL"
                  ? "No records matching your filters"
                  : "No attendance records yet"
              }
            />
          )
        }
        renderItem={({ item }) => {
          const dateStr = formatDateDDMMYYYY(item.date);
          const dayName = getDayName(item.date);
          const st = String(item.status || "").toUpperCase();

          const isPresent = st === "PRESENT";
          const isAbsent = st === "ABSENT";
          const isLate = st === "LATE";
          const isHalfDay = st === "HALF_DAY";

          return (
            <View style={styles.studentAttRowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentAttRowDate}>{dateStr || "—"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
                  <Ionicons name="calendar-outline" size={13} color="#64748B" />
                  <Text style={styles.studentAttRowDay}>{dayName || "—"}</Text>
                </View>
              </View>

              {isPresent && (
                <View style={[styles.studentStatusBadge, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                  <Text style={[styles.studentStatusBadgeText, { color: "#166534" }]}>Present</Text>
                </View>
              )}
              {isAbsent && (
                <View style={[styles.studentStatusBadge, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
                  <Ionicons name="close-circle" size={14} color="#DC2626" />
                  <Text style={[styles.studentStatusBadgeText, { color: "#991B1B" }]}>Absent</Text>
                </View>
              )}
              {isLate && (
                <View style={[styles.studentStatusBadge, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                  <Ionicons name="time" size={14} color="#D97706" />
                  <Text style={[styles.studentStatusBadgeText, { color: "#92400E" }]}>Late</Text>
                </View>
              )}
              {isHalfDay && (
                <View style={[styles.studentStatusBadge, { backgroundColor: "#F3E8FF", borderColor: "#E9D5FF" }]}>
                  <Ionicons name="time" size={14} color="#9333EA" />
                  <Text style={[styles.studentStatusBadgeText, { color: "#6B21A8" }]}>Half Day</Text>
                </View>
              )}
              {!isPresent && !isAbsent && !isLate && !isHalfDay && item.status ? (
                <View style={[styles.studentStatusBadge, { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }]}>
                  <Text style={[styles.studentStatusBadgeText, { color: "#475569" }]}>{str(item.status)}</Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

function PrincipalAttendance({ color }: { color: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"all" | "class">("all");
  const [classes, setClasses] = useState<any[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [list, setList] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"excel" | "pdf" | null>(null);
  const [q, setQ] = useState("");
  const [info, setInfo] = useState<{ title: string; message?: string; variant?: "success" | "error" | "info" } | null>(null);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const load = useCallback(async () => {
    try {
      const clsRes = await api<any>("/api/classes");
      const clsList = clsRes.classes || [];
      setClasses(clsList);

      if (tab === "class") {
        const active = clsList[activeIdx] || clsList[0];
        if (!active) {
          setList([]);
          setStats({ present: 0, absent: 0, total: 0, percentage: 0 });
          return;
        }
        const params = new URLSearchParams({
          className: active.name || active.className || "",
          date: today,
        });
        if (active.section) params.set("section", active.section);
        const data = await api<any>(`/api/attendance/class?${params.toString()}`);
        const students = (data.students || []).map((s: any) => ({
          id: s.studentId || s.id,
          studentName: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student",
          status: s.status || "Unmarked",
          date: data.date || today,
          className: data.className,
          section: data.section,
        }));
        setList(students);
        const present = data.present ?? students.filter((s: any) => String(s.status).includes("PRESENT") || String(s.status).includes("LATE")).length;
        const absent = data.absent ?? students.filter((s: any) => String(s.status).includes("ABSENT")).length;
        const total = data.total ?? students.length;
        setStats({
          present,
          absent,
          total,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        });
      } else {
        // ALL: merge every class for today
        const allRows: any[] = [];
        let present = 0;
        let absent = 0;
        let total = 0;
        for (const c of clsList) {
          try {
            const params = new URLSearchParams({
              className: c.name || c.className || "",
              date: today,
            });
            if (c.section) params.set("section", c.section);
            const data = await api<any>(`/api/attendance/class?${params.toString()}`);
            const students = data.students || [];
            total += data.total ?? students.length;
            present += data.present ?? students.filter((s: any) => s.status === "PRESENT" || s.status === "LATE").length;
            absent += data.absent ?? students.filter((s: any) => s.status === "ABSENT").length;
            for (const s of students) {
              allRows.push({
                id: `${c.id || c.name}-${s.studentId || s.id}`,
                studentName: `${s.firstName || ""} ${s.lastName || ""}`.trim() || "Student",
                status: s.status || "Unmarked",
                date: data.date || today,
                className: c.name || c.className,
                section: c.section,
              });
            }
          } catch {
            /* skip class */
          }
        }
        // Fallback school-wide stats
        if (!clsList.length) {
          try {
            const data = await api<any>(`/api/attendance/stats?date=${today}`);
            present = data.presentStudents ?? data.present ?? 0;
            absent = data.absentStudents ?? data.absent ?? 0;
            total = data.totalStudents ?? data.total ?? 0;
          } catch { /* ignore */ }
        }
        setList(allRows);
        setStats({
          present,
          absent,
          total,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        });
      }
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, activeIdx, today]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const handleDownload = async (format: "excel" | "pdf") => {
    setMenuVisible(false);
    setExportingFormat(format);
    try {
      const from = new Date();
      from.setDate(from.getDate() - 120);
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = today;

      const base = await getApiBase();
      const token = await getToken();

      const activeCls = tab === "class" ? classes[activeIdx] : null;
      const clsName = activeCls ? (activeCls.name || activeCls.className || "") : "";
      const secName = activeCls ? (activeCls.section || "") : "";

      if (format === "excel") {
        const params = new URLSearchParams({
          type: "student",
          format: "excel",
          from: fromStr,
          to: toStr,
        });
        if (clsName) {
          params.set("className", clsName);
          if (secName) params.set("section", secName);
        }

        const res = await fetch(`${base}/api/attendance/export?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        const xml = await res.text();
        const filename = `attendance_${clsName ? `${clsName}_` : ""}${fromStr}_to_${toStr}_${Date.now()}.xls`;

        if (Platform.OS === "android" && (FileSystem as any).StorageAccessFramework) {
          try {
            const permissions =
              await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const fileUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                filename,
                "application/vnd.ms-excel"
              );
              await FileSystem.writeAsStringAsync(fileUri, xml, {
                encoding: (FileSystem as any).EncodingType.UTF8,
              });
              setInfo({
                title: "Downloaded Successfully",
                message: `Saved Excel file to your selected folder:\n${filename}`,
                variant: "success",
              });
              return;
            }
          } catch {
            /* fallback */
          }
        }

        const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
        const fileUri = `${dir}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, xml, {
          encoding: (FileSystem as any).EncodingType.UTF8,
        });

        if (Platform.OS === "ios") {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "application/vnd.ms-excel",
              UTI: "com.microsoft.excel.xls",
            });
          }
        } else {
          setInfo({
            title: "Downloaded Successfully",
            message: `File saved to local storage:\n${filename}`,
            variant: "success",
          });
        }
      } else {
        // PDF Report
        const params = new URLSearchParams({
          type: "student",
          format: "json",
          from: fromStr,
          to: toStr,
        });
        if (clsName) {
          params.set("className", clsName);
          if (secName) params.set("section", secName);
        }

        const res = await fetch(`${base}/api/attendance/export?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const resData = await res.json();
        const records = resData?.records || [];
        const schoolTitle = (user as any)?.schoolName || "MySchool Platform";
        const schoolAddress = (user as any)?.schoolAddress || (user as any)?.schoolLocation || "";
        const schoolLogoUrl = resolveMediaUrlSync((user as any)?.schoolLogo, base);
        const presentCount = records.filter((r: any) => String(r.status).toUpperCase().includes("PRESENT")).length;
        const absentCount = records.filter((r: any) => String(r.status).toUpperCase().includes("ABSENT")).length;
        const lateCount = records.filter((r: any) => String(r.status).toUpperCase().includes("LATE")).length;

        const htmlReport = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${schoolTitle} - Attendance Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; }
    .card-wrap { border: 2px solid ${color}; border-radius: 16px; padding: 24px; background: #ffffff; }
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 18px; margin-bottom: 20px; }
    .header-logo-title { display: flex; align-items: center; gap: 16px; }
    .logo-img { width: 56px; height: 56px; object-fit: contain; border-radius: 12px; }
    .logo-ph { width: 56px; height: 56px; border-radius: 12px; background: ${color}; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 800; font-size: 20px; }
    .school-name { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
    .school-addr { font-size: 12px; color: #64748b; margin-top: 2px; }
    .report-badge { background: ${color}15; color: ${color}; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }

    .meta-grid { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 18px; margin-bottom: 16px; font-size: 12px; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-lbl { color: #64748b; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
    .meta-val { font-size: 13px; font-weight: 800; color: #0f172a; }

    .stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
    .stat-card { flex: 1; padding: 10px 14px; border-radius: 10px; text-align: center; border: 1px solid #e2e8f0; }
    .stat-num { font-size: 18px; font-weight: 800; }
    .stat-lbl { font-size: 10px; font-weight: 700; text-transform: uppercase; margin-top: 2px; }

    table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-top: 8px; font-size: 12px; }
    th { background: #1e293b; color: #ffffff; text-align: left; padding: 12px; font-size: 11px; font-weight: 700; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    tr:last-child td { border-bottom: none; }
    tr:nth-child(even) { background: #f8fafc; }

    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 10px; text-transform: uppercase; }
    .badge-present { background: #dcfce7; color: #15803d; }
    .badge-absent { background: #fee2e2; color: #b91c1c; }
    .badge-late { background: #fef3c7; color: #b45309; }
    .badge-leave { background: #ede9fe; color: #6d28d9; }

    .footer { margin-top: 28px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="card-wrap">
    <div class="header">
      <div class="header-logo-title">
        ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" class="logo-img" />` : `<div class="logo-ph">MS</div>`}
        <div>
          <h1 class="school-name">${schoolTitle}</h1>
          ${schoolAddress ? `<div class="school-addr">${schoolAddress}</div>` : ''}
        </div>
      </div>
      <div class="report-badge">Attendance Report</div>
    </div>

    <div class="meta-grid">
      <div class="meta-item">
        <span class="meta-lbl">Date Range</span>
        <span class="meta-val">${formatDateDDMMYYYY(fromStr)} to ${formatDateDDMMYYYY(toStr)}</span>
      </div>
      <div class="meta-item">
        <span class="meta-lbl">Class</span>
        <span class="meta-val">${clsName || "All Classes"} ${secName ? `(${secName})` : ""}</span>
      </div>
      <div class="meta-item">
        <span class="meta-lbl">Total Records</span>
        <span class="meta-val">${records.length}</span>
      </div>
      <div class="meta-item">
        <span class="meta-lbl">Generated On</span>
        <span class="meta-val">${formatDateTimeDDMMYYYY(new Date())}</span>
      </div>
    </div>

    <div class="stats-row">
      <div class="stat-card" style="background: #f0fdf4; border-color: #bbf7d0;">
        <div class="stat-num" style="color: #15803d;">${presentCount}</div>
        <div class="stat-lbl" style="color: #166534;">Present</div>
      </div>
      <div class="stat-card" style="background: #fef2f2; border-color: #fecaca;">
        <div class="stat-num" style="color: #b91c1c;">${absentCount}</div>
        <div class="stat-lbl" style="color: #991b1b;">Absent</div>
      </div>
      <div class="stat-card" style="background: #fffbeb; border-color: #fde68a;">
        <div class="stat-num" style="color: #b45309;">${lateCount}</div>
        <div class="stat-lbl" style="color: #92400e;">Late</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 36px; text-align: center;">#</th>
          <th>Date</th>
          <th>Student Name</th>
          <th>Class</th>
          <th style="text-align: center;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${
          records.length === 0
            ? `<tr><td colspan="5" style="text-align: center; color: #94a3b8; padding: 24px;">No attendance records found for this period</td></tr>`
            : records
                .map((r: any, idx: number) => {
                  const st = (r.status || "PRESENT").toUpperCase();
                  const badgeClass = st.includes("PRESENT")
                    ? "badge-present"
                    : st.includes("ABSENT")
                    ? "badge-absent"
                    : st.includes("LATE")
                    ? "badge-late"
                    : "badge-leave";
                  return `
          <tr>
            <td style="text-align: center; color: #64748b;">${idx + 1}</td>
            <td>${formatDateDDMMYYYY(r.date) || "—"}</td>
            <td><strong>${toTitleCase(r.studentName || r.name || "Student")}</strong></td>
            <td>${r.className || "—"}${r.section ? `-${r.section}` : ""}</td>
            <td style="text-align: center;"><span class="badge ${badgeClass}">${st}</span></td>
          </tr>`;
                })
                .join("")
        }
      </tbody>
    </table>

    <div class="footer">
      Generated automatically by ${schoolTitle} Management System.
    </div>
  </div>
</body>
</html>`;

        const { uri: pdfTempUri } = await Print.printToFileAsync({ html: htmlReport });
        const filename = `attendance_report_${clsName ? `${clsName}_` : ""}${Date.now()}.pdf`;
        const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
        const fileUri = `${dir}${filename}`;
        await FileSystem.copyAsync({ from: pdfTempUri, to: fileUri });

        if (Platform.OS === "android" && (FileSystem as any).StorageAccessFramework) {
          try {
            const permissions =
              await (FileSystem as any).StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const base64Data = await FileSystem.readAsStringAsync(fileUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              const createdUri = await (FileSystem as any).StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                filename,
                "application/pdf"
              );
              await FileSystem.writeAsStringAsync(createdUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
              });
              setInfo({
                title: "Downloaded Successfully",
                message: `Saved PDF report to your selected folder:\n${filename}`,
                variant: "success",
              });
              return;
            }
          } catch {
            /* fallback */
          }
        }

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "application/pdf",
            dialogTitle: "Attendance Report",
            UTI: "com.adobe.pdf",
          });
        }
        setInfo({
          title: "Downloaded Successfully",
          message: `PDF report saved:\n${filename}`,
          variant: "success",
        });
      }
    } catch (e: any) {
      setInfo({
        title: "Download Error",
        message: e?.message || "Failed to download attendance file",
        variant: "error",
      });
    } finally {
      setExportingFormat(null);
    }
  };

  const filtered = list.filter(
    (item) => matchesSearch(item, q) || String(item.date || "").includes(q)
  );

  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [q, tab, activeIdx]);

  const visibleList = useMemo(() => filtered.slice(0, page * 20), [filtered, page]);
  const hasMore = visibleList.length < filtered.length;
  const handleLoadMore = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerControlRow}>
        <View style={styles.tabRowFlex}>
          {(["all", "class"] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => {
                if (tab === t) return;
                setQ("");
                setTab(t);
                setLoading(true);
              }}
              style={[
                styles.mainTab,
                tab === t && { backgroundColor: color, borderColor: color },
              ]}
            >
              <Text style={[styles.mainTabText, tab === t && { color: "#fff" }]}>
                {t === "all" ? "All" : "Class view"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={styles.menu3DotBtn}
          onPress={() => setMenuVisible(true)}
          hitSlop={8}
        >
          {exportingFormat ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.text} />
          )}
        </Pressable>
      </View>

      {tab === "class" && classes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}
          contentContainerStyle={styles.tabsContent}
        >
          {classes.map((c, i) => {
            const on = i === activeIdx;
            return (
              <Pressable
                key={c.id || i}
                onPress={() => {
                  if (i === activeIdx) return;
                  setQ("");
                  setActiveIdx(i);
                  setLoading(true);
                }}
                style={[styles.classTab, on && { backgroundColor: color, borderColor: color }]}
              >
                <Text style={[styles.classTabText, on && { color: "#fff" }]}>
                  {c.name || c.className}
                  {c.section ? `-${c.section}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <SearchBar value={q} onChangeText={setQ} placeholder="Search name, class, status…" />

      {!q.trim() && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderColor: color + "44" }]}>
            <Text style={[styles.statNum, { color }]}>{stats.percentage}%</Text>
            <Text style={styles.statLabel}>Attendance</Text>
          </View>
          <View style={[styles.statCard, { borderColor: Colors.success + "55" }]}>
            <Text style={[styles.statNum, { color: Colors.success }]}>{stats.present}</Text>
            <Text style={styles.statLabel}>Present</Text>
          </View>
          <View style={[styles.statCard, { borderColor: Colors.danger + "55" }]}>
            <Text style={[styles.statNum, { color: Colors.danger }]}>{stats.absent}</Text>
            <Text style={styles.statLabel}>Absent</Text>
          </View>
        </View>
      )}

      <FlatList
        data={visibleList}
        keyExtractor={(item, i) => item.id || String(i)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          hasMore ? (
            <ActivityIndicator size="small" color={color} style={{ marginVertical: 16 }} />
          ) : null
        }
        contentContainerStyle={{
          padding: spacing.md,
          paddingBottom: TAB_BAR_CLEARANCE,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={color}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={color} style={{ marginVertical: 32 }} />
          ) : (
            <Empty message={q.trim() ? "No matching records found" : "No attendance data"} />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{str(item.studentName, "Record")}</Text>
              <Text style={styles.meta}>
                {[item.className, item.section, item.date ? formatDateDDMMYYYY(item.date) : ""].filter(Boolean).join(" · ")}
              </Text>
            </View>
            {item.status ? (
              <Badge
                text={str(item.status)}
                color={
                  String(item.status).includes("PRESENT") || String(item.status) === "LATE"
                    ? Colors.success
                    : String(item.status).includes("ABSENT")
                      ? Colors.danger
                      : color
                }
              />
            ) : null}
          </View>
        )}
      />

      {/* 3-Dot Action Sheet Modal for Downloads */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuSheet}>
            <View style={styles.menuHandle} />
            <Text style={styles.menuSheetTitle}>Download Attendance</Text>
            <Text style={styles.menuSheetSubtitle}>
              Select format to save report to your device storage
            </Text>

            <Pressable
              style={styles.menuOptionRow}
              onPress={() => handleDownload("excel")}
            >
              <View style={[styles.menuOptionIconWrap, { backgroundColor: "#ECFDF5" }]}>
                <Ionicons name="document-text" size={22} color="#059669" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuOptionTitle}>Download Excel (.xls)</Text>
                <Text style={styles.menuOptionDesc}>Formatted color-coded spreadsheet</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={styles.menuOptionRow}
              onPress={() => handleDownload("pdf")}
            >
              <View style={[styles.menuOptionIconWrap, { backgroundColor: "#EEF2FF" }]}>
                <Ionicons name="newspaper-outline" size={22} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuOptionTitle}>Download PDF / Document</Text>
                <Text style={styles.menuOptionDesc}>Printable official attendance summary</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={styles.menuCancelBtn}
              onPress={() => setMenuVisible(false)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <InfoModal
        visible={!!info}
        title={info?.title || ""}
        message={info?.message}
        variant={info?.variant || "info"}
        onClose={() => setInfo(null)}
      />
    </View>
  );
}

function StudentAttendance({ color }: { color: string }) {
  const [list, setList] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [listLoading, setListLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
    percentage: 0,
  });

  const pageRef = useRef(1);
  pageRef.current = page;

  // Debounce search input
  useEffect(() => {
    const tmr = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(tmr);
  }, [q]);

  const load = useCallback(
    async (pageNum = 1, isAppend = false) => {
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setListLoading(true);
      }
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "20",
          status: statusFilter,
        });
        if (debouncedQ.trim()) {
          params.set("q", debouncedQ.trim());
        }
        const data = await api<any>(`/api/attendance/student?${params.toString()}`);
        const records = Array.isArray(data.records)
          ? data.records
          : Array.isArray(data.attendance)
          ? data.attendance
          : [];
        if (isAppend) {
          setList((prev) => [...prev, ...records]);
        } else {
          setList(records);
        }
        setHasMore(Boolean(data.hasMore));
        setPage(pageNum);
        setStats({
          present: data.presentOnly ?? 0,
          absent: data.absent ?? 0,
          late: data.late ?? 0,
          total: data.total ?? 0,
          percentage: data.percentage ?? 0,
        });
      } catch {
        if (!isAppend) setList([]);
      } finally {
        setListLoading(false);
        setLoadingMore(false);
        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [debouncedQ, statusFilter]
  );

  useFocusEffect(
    useCallback(() => {
      load(1, false);
    }, [load])
  );

  const handleLoadMore = () => {
    if (!loadingMore && !listLoading && hasMore) {
      load(pageRef.current + 1, true);
    }
  };

  return (
    <View style={styles.root}>
      {/* Top Search Bar */}
      <SearchBar
        value={q}
        onChangeText={setQ}
        placeholder="Search day or date (e.g. Monday, DD-MM-YYYY)…"
      />

      {/* Clickable KPI Cards (Attendance Rate, Present, Absent, Late) */}
      {!q.trim() && (
        <View style={styles.studentStatsGrid}>
          <Pressable
            onPress={() => setStatusFilter("ALL")}
            style={[
              styles.studentKpiCard,
              {
                backgroundColor: "#EEF2FF",
                borderColor: statusFilter === "ALL" ? "#4F46E5" : "#C7D2FE",
                borderWidth: statusFilter === "ALL" ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.studentKpiNum, { color: "#4F46E5" }]}>{stats.percentage}%</Text>
            <Text style={[styles.studentKpiLabel, { color: "#4338CA", fontWeight: statusFilter === "ALL" ? "800" : "600" }]}>
              Attendance
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter((prev) => (prev === "PRESENT" ? "ALL" : "PRESENT"))}
            style={[
              styles.studentKpiCard,
              {
                backgroundColor: "#F0FDF4",
                borderColor: statusFilter === "PRESENT" ? "#16A34A" : "#BBF7D0",
                borderWidth: statusFilter === "PRESENT" ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.studentKpiNum, { color: "#16A34A" }]}>{stats.present}</Text>
            <Text style={[styles.studentKpiLabel, { color: "#15803D", fontWeight: statusFilter === "PRESENT" ? "800" : "600" }]}>
              Present
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter((prev) => (prev === "ABSENT" ? "ALL" : "ABSENT"))}
            style={[
              styles.studentKpiCard,
              {
                backgroundColor: "#FEF2F2",
                borderColor: statusFilter === "ABSENT" ? "#DC2626" : "#FECACA",
                borderWidth: statusFilter === "ABSENT" ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.studentKpiNum, { color: "#DC2626" }]}>{stats.absent}</Text>
            <Text style={[styles.studentKpiLabel, { color: "#B91C1C", fontWeight: statusFilter === "ABSENT" ? "800" : "600" }]}>
              Absent
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setStatusFilter((prev) => (prev === "LATE" ? "ALL" : "LATE"))}
            style={[
              styles.studentKpiCard,
              {
                backgroundColor: "#FFFBEB",
                borderColor: statusFilter === "LATE" ? "#D97706" : "#FDE68A",
                borderWidth: statusFilter === "LATE" ? 2 : 1,
              },
            ]}
          >
            <Text style={[styles.studentKpiNum, { color: "#D97706" }]}>{stats.late}</Text>
            <Text style={[styles.studentKpiLabel, { color: "#B45309", fontWeight: statusFilter === "LATE" ? "800" : "600" }]}>
              Late
            </Text>
          </Pressable>
        </View>
      )}

      {/* Attendance List */}
      <FlatList
        data={list}
        keyExtractor={(item, i) => item.id || item.date || String(i)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={color} style={{ marginVertical: 16 }} />
          ) : null
        }
        contentContainerStyle={{
          padding: spacing.md,
          paddingTop: 6,
          paddingBottom: TAB_BAR_CLEARANCE,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load(1, false);
            }}
            tintColor={color}
          />
        }
        ListEmptyComponent={
          listLoading ? (
            <ActivityIndicator size="large" color={color} style={{ marginVertical: 32 }} />
          ) : (
            <Empty
              message={
                q.trim() || statusFilter !== "ALL"
                  ? "No records matching your filters"
                  : "No attendance records yet"
              }
            />
          )
        }
        renderItem={({ item }) => {
          const dateStr = formatDateDDMMYYYY(item.date);
          const dayName = getDayName(item.date);
          const st = String(item.status || "").toUpperCase();

          const isPresent = st === "PRESENT";
          const isAbsent = st === "ABSENT";
          const isLate = st === "LATE";
          const isHalfDay = st === "HALF_DAY";

          return (
            <View style={styles.studentAttRowCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.studentAttRowDate}>{dateStr || "—"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
                  <Ionicons name="calendar-outline" size={13} color="#64748B" />
                  <Text style={styles.studentAttRowDay}>{dayName || "—"}</Text>
                </View>
              </View>

              {isPresent && (
                <View style={[styles.studentStatusBadge, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}>
                  <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                  <Text style={[styles.studentStatusBadgeText, { color: "#166534" }]}>Present</Text>
                </View>
              )}
              {isAbsent && (
                <View style={[styles.studentStatusBadge, { backgroundColor: "#FEE2E2", borderColor: "#FECACA" }]}>
                  <Ionicons name="close-circle" size={14} color="#DC2626" />
                  <Text style={[styles.studentStatusBadgeText, { color: "#991B1B" }]}>Absent</Text>
                </View>
              )}
              {isLate && (
                <View style={[styles.studentStatusBadge, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}>
                  <Ionicons name="time" size={14} color="#D97706" />
                  <Text style={[styles.studentStatusBadgeText, { color: "#92400E" }]}>Late</Text>
                </View>
              )}
              {isHalfDay && (
                <View style={[styles.studentStatusBadge, { backgroundColor: "#F3E8FF", borderColor: "#E9D5FF" }]}>
                  <Ionicons name="time" size={14} color="#9333EA" />
                  <Text style={[styles.studentStatusBadgeText, { color: "#6B21A8" }]}>Half Day</Text>
                </View>
              )}
              {!isPresent && !isAbsent && !isLate && !isHalfDay && item.status ? (
                <View style={[styles.studentStatusBadge, { backgroundColor: "#F1F5F9", borderColor: "#E2E8F0" }]}>
                  <Text style={[styles.studentStatusBadgeText, { color: "#475569" }]}>{str(item.status)}</Text>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </View>
  );
}

function ViewerAttendance({ color, role }: { color: string; role?: string }) {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0, percentage: 0 });

  const load = useCallback(async () => {
    try {
      const path =
        role === "STUDENT" || role === "PARENT"
          ? "/api/attendance/student"
          : "/api/attendance/stats";
      // STUDENT path needs no studentId (self); PARENT should use ParentAttendance
      const data = await api<any>(path);
      if (Array.isArray(data.records)) setList(data.records);
      else if (Array.isArray(data.attendance)) setList(data.attendance);
      else if (data.stats) {
        setList(
          Object.entries(data.stats).map(([k, v]) => ({
            id: k,
            status: String(v),
            studentName: k,
          }))
        );
      } else setList([]);
      setStats({
        present: data.present ?? 0,
        absent: data.absent ?? 0,
        total: data.total ?? (data.records || []).length,
        percentage: data.percentage ?? 0,
      });
    } catch {
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filtered = list.filter((item) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    return (
      matchesSearch(item, q) ||
      String(item.date || "").toLowerCase().includes(needle) ||
      formatDateDDMMYYYY(item.date).toLowerCase().includes(needle)
    );
  });

  const [page, setPage] = useState(1);
  useEffect(() => {
    setPage(1);
  }, [q]);

  const visibleList = useMemo(() => filtered.slice(0, page * 20), [filtered, page]);
  const hasMore = visibleList.length < filtered.length;
  const handleLoadMore = () => {
    if (hasMore) setPage((p) => p + 1);
  };

  // Counts stay on full data; search only filters the list
  const viewStats = stats;

  return (
    <View style={styles.root}>
      <SearchBar value={q} onChangeText={setQ} placeholder="Search by date (DD-MM-YYYY)…" />
      {!q.trim() && (
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderColor: color + "44" }]}>
          <Text style={[styles.statNum, { color }]}>{viewStats.percentage}%</Text>
          <Text style={styles.statLabel}>Attendance</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.success + "55" }]}>
          <Text style={[styles.statNum, { color: Colors.success }]}>{viewStats.present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={[styles.statCard, { borderColor: Colors.danger + "55" }]}>
          <Text style={[styles.statNum, { color: Colors.danger }]}>{viewStats.absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
      </View>
      )}
      <FlatList
        data={visibleList}
        keyExtractor={(item, i) => item.id || String(i)}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          hasMore ? (
            <ActivityIndicator size="small" color={color} style={{ marginVertical: 16 }} />
          ) : null
        }
        contentContainerStyle={{
          padding: spacing.md,
          paddingTop: 4,
          paddingBottom: TAB_BAR_CLEARANCE,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={color}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color={color} style={{ marginVertical: 32 }} />
          ) : (
            <Empty message={q.trim() ? "No records matching your search" : "No attendance records yet"} />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>
                {str(item.studentName || item.date || item.firstName, "Record")}
              </Text>
              {item.date ? (
                <Text style={styles.meta}>{formatDateDDMMYYYY(item.date)}</Text>
              ) : null}
            </View>
            {item.status ? (
              <Badge
                text={str(item.status)}
                color={
                  String(item.status).includes("PRESENT")
                    ? Colors.success
                    : String(item.status).includes("ABSENT")
                      ? Colors.danger
                      : color
                }
              />
            ) : null}
          </View>
        )}
      />
    </View>
  );
}



const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  topNavRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  dateLabel: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    fontWeight: "700",
    color: Colors.textMuted,
    fontSize: 12,
  },
  tabs: { height: 48, flexGrow: 0, flexShrink: 0, paddingHorizontal: spacing.md, marginTop: 8 },
  classTab: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  tabsContent: { alignItems: "center", paddingRight: 16 },
  classTabText: { fontWeight: "700", fontSize: 13, color: Colors.text },
  actions: { paddingHorizontal: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  name: { fontWeight: "700", fontSize: 15, color: Colors.text },
  meta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  toggles: { flexDirection: "row", gap: 6 },
  chip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  chipText: { fontWeight: "800", fontSize: 12, color: Colors.textMuted },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
    height: 44,
    flexShrink: 0,
  },
  headerControlRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  tabRowFlex: {
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  menu3DotBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "flex-end",
  },
  menuSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 24,
    gap: 12,
  },
  menuHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center",
    marginBottom: 6,
  },
  menuSheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.text,
  },
  menuSheetSubtitle: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  menuOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    gap: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  menuOptionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  menuOptionDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  menuCancelBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    marginTop: 4,
  },
  menuCancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  mainTabText: { fontWeight: "800", fontSize: 13, color: Colors.text },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: spacing.md,
    marginBottom: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  statNum: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2, fontWeight: "600" },
  todayHeaderRow1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginTop: 6,
    marginBottom: 6,
    gap: 8,
  },
  todayDateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  todayDateText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  genderChipsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  genderChipRow1: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  genderChipTextRow1: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
  },
  todayHeaderRow2: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: 6,
    marginBottom: 8,
  },
  statTabSmall: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  statTabSmallValue: {
    fontSize: 13,
    fontWeight: "800",
  },
  statTabSmallLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    marginTop: 1,
  },
  historySubmitBtn: {
    height: 38,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  historySubmitBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  compactActionsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: 8,
    marginBottom: 8,
  },
  compactActionBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  compactActionBtnOutline: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
  },
  compactActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  studentCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  genderTag: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  presetScroll: {
    height: 42,
    flexGrow: 0,
    flexShrink: 0,
    marginVertical: 4,
  },
  presetContent: {
    paddingHorizontal: spacing.md,
    gap: 6,
    alignItems: "center",
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  historyRangeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: spacing.md,
    marginVertical: 3,
    flexShrink: 0,
  },
  historyRangeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  historyShowingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginHorizontal: spacing.md,
    marginBottom: 6,
    flexShrink: 0,
  },
  historyShowingText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  statusChipsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: 6,
    marginVertical: 3,
    flexShrink: 0,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
  },
  miniCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  rateBadge: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 48,
  },
  rateBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  exportButtonsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: 8,
    marginBottom: 6,
  },
  exportBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  exportBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  historyCardRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  historyDateText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  studentStatsGrid: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: 8,
    marginBottom: 10,
    marginTop: 2,
  },
  studentKpiCard: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  studentKpiNum: {
    fontSize: 17,
    fontWeight: "900",
  },
  studentKpiLabel: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
    textTransform: "uppercase",
  },
  studentFilterChipsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    gap: 6,
    marginBottom: 6,
  },
  studentFilterChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  studentFilterChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
  },
  studentAttRowCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  studentAttRowDate: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  studentAttRowDay: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  studentStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  studentStatusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
});
