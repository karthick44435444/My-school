import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { api, getApiBase, getApiBaseSync, getToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { SafeAvatar } from "@/components/ChildAvatar";
import { InfoModal } from "@/components/InfoModal";
import { Button, Empty, Input, Label, Loading } from "@/components/ui";
import { Colors, spacing, radius } from "@/constants/theme";
import { formatDateDDMMYYYY, formatDateTimeDDMMYYYY } from "@/lib/format";
import { TAB_BAR_CLEARANCE } from "@/constants/layout";

function fmtDate(d: Date) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function toApiDate(str: string) {
  if (!str) return "";
  const trimmed = str.trim();
  if (/^\d{2}-\d{2}-\d{4}$/.test(trimmed)) {
    const parts = trimmed.split("-");
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return trimmed;
}

const STATUS_FILTERS = [
  { id: "ALL", label: "All Statuses" },
  { id: "PRESENT", label: "Present" },
  { id: "ABSENT", label: "Absent" },
  { id: "LATE", label: "Late" },
  { id: "LEAVE", label: "Leave" },
] as const;

export default function AnalyticsScreen() {
  const { user, themeColor } = useAuth();
  const color = themeColor || Colors.primary;
  const [initialLoading, setInitialLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<"excel" | "pdf" | null>(null);
  const [apiBase, setApiBase] = useState(() => getApiBaseSync());
  const [classes, setClasses] = useState<any[]>([]);
  const [preset, setPreset] = useState<"today" | "yesterday" | "last5" | "last30" | "custom">("today");
  const [from, setFrom] = useState(() => fmtDate(new Date()));
  const [to, setTo] = useState(() => fmtDate(new Date()));
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [filterMode, setFilterMode] = useState<"all" | "class" | "section">("all");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [data, setData] = useState<any>(null);
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const [teacherRep, setTeacherRep] = useState<any>(null);
  const [tab, setTab] = useState<"students" | "teachers">("students");
  const [infoModal, setInfoModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: "success" | "error" | "info";
  }>({ visible: false, title: "", message: "", variant: "success" });

  // Keep references to prevent infinite loop re-renders
  const stateRef = useRef({
    from,
    to,
    statusFilter,
    filterMode,
    className,
    section,
    tab,
  });

  stateRef.current = {
    from,
    to,
    statusFilter,
    filterMode,
    className,
    section,
    tab,
  };

  useEffect(() => {
    getApiBase().then(setApiBase);
  }, []);

  const classNames = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => {
      const n = c.name || c.className;
      if (n) set.add(n);
    });
    return Array.from(set).sort();
  }, [classes]);

  const sectionsForClass = useMemo(() => {
    if (!className) return [];
    return classes
      .filter((c) => (c.name || c.className) === className)
      .map((c) => c.section)
      .filter(Boolean);
  }, [classes, className]);

  const isMultiDay = from !== to;

  const studentSummaries = useMemo(() => {
    if (!isMultiDay) return [];

    const map = new Map<string, {
      studentId: string;
      studentName: string;
      className: string;
      section: string;
      rollNo: string;
      photoUrl?: string | null;
      present: number;
      late: number;
      absent: number;
      leave: number;
      total: number;
    }>();

    for (const r of studentRecords) {
      const key = r.studentId || r.studentName || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          studentId: r.studentId,
          studentName: r.studentName || "Student",
          className: r.className || "",
          section: r.section || "",
          rollNo: r.rollNumber || r.rollNo || "",
          photoUrl: r.photoUrl || null,
          present: 0,
          late: 0,
          absent: 0,
          leave: 0,
          total: 0,
        });
      }
      const entry = map.get(key)!;
      entry.total += 1;
      const st = String(r.status || "PRESENT").toUpperCase();
      if (st.includes("ABSENT")) entry.absent += 1;
      else if (st.includes("LATE")) entry.late += 1;
      else if (st.includes("LEAVE")) entry.leave += 1;
      else entry.present += 1;
    }

    return Array.from(map.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [isMultiDay, studentRecords]);

  const [studentPage, setStudentPage] = useState(1);
  const [teacherPage, setTeacherPage] = useState(1);

  useEffect(() => {
    setStudentPage(1);
    setTeacherPage(1);
  }, [from, to, statusFilter, filterMode, className, section, tab]);

  const visibleTeachers = useMemo(
    () => (teacherRep?.teachers || []).slice(0, teacherPage * 20),
    [teacherRep, teacherPage]
  );
  const totalTeachers = (teacherRep?.teachers || []).length;
  const hasMoreTeachers = visibleTeachers.length < totalTeachers;

  const visibleMultiStudents = useMemo(
    () => studentSummaries.slice(0, studentPage * 20),
    [studentSummaries, studentPage]
  );
  const totalMultiStudents = studentSummaries.length;
  const hasMoreMultiStudents = visibleMultiStudents.length < totalMultiStudents;

  const visibleSingleStudents = useMemo(
    () => studentRecords.slice(0, studentPage * 20),
    [studentRecords, studentPage]
  );
  const totalSingleStudents = studentRecords.length;
  const hasMoreSingleStudents = visibleSingleStudents.length < totalSingleStudents;

  const fetchAttendance = useCallback(
    async (params?: {
      from?: string;
      to?: string;
      status?: string;
      mode?: "all" | "class" | "section";
      clsName?: string;
      sec?: string;
    }) => {
      const p = {
        from: params?.from ?? stateRef.current.from,
        to: params?.to ?? stateRef.current.to,
        status: params?.status ?? stateRef.current.statusFilter,
        mode: params?.mode ?? stateRef.current.filterMode,
        clsName: params?.clsName ?? stateRef.current.className,
        sec: params?.sec ?? stateRef.current.section,
      };

      setUpdating(true);
      try {
        const c = await api<any>("/api/classes");
        setClasses(c.classes || []);

        const apiFrom = toApiDate(p.from);
        const apiTo = toApiDate(p.to);
        const q = new URLSearchParams({ from: apiFrom, to: apiTo });
        if (p.status && p.status !== "ALL") {
          q.set("status", p.status);
        }
        if (p.mode === "class" && p.clsName) q.set("className", p.clsName);
        if (p.mode === "section" && p.clsName) {
          q.set("className", p.clsName);
          if (p.sec) q.set("section", p.sec);
        }

        // Fetch stats
        const s = await api<any>(`/api/attendance/stats?${q.toString()}`);
        setData(s);

        // Fetch student records
        try {
          const eq = new URLSearchParams({
            type: "student",
            format: "json",
            from: apiFrom,
            to: apiTo,
          });
          if (p.status && p.status !== "ALL") {
            eq.set("status", p.status);
          }
          if (p.mode === "class" && p.clsName) eq.set("className", p.clsName);
          if (p.mode === "section" && p.clsName) {
            eq.set("className", p.clsName);
            if (p.sec) eq.set("section", p.sec);
          }
          const exp = await api<any>(`/api/attendance/export?${eq.toString()}`);
          setStudentRecords(exp?.records || []);
        } catch {
          setStudentRecords([]);
        }

        // Fetch teacher checkin report
        try {
          const tq = new URLSearchParams({ from: apiFrom, to: apiTo });
          const tr = await api<any>(`/api/attendance/teachers?${tq.toString()}`);
          setTeacherRep(tr);
        } catch {
          setTeacherRep(null);
        }
      } catch {
        /* ignore error to keep previous UI intact */
      } finally {
        setInitialLoading(false);
        setUpdating(false);
        setRefreshing(false);
      }
    },
    []
  );

  // Run strictly on focus once without re-triggering loops
  useFocusEffect(
    useCallback(() => {
      fetchAttendance();
    }, [fetchAttendance])
  );

  const applyPreset = (p: "today" | "yesterday" | "last5" | "last30" | "custom") => {
    setPreset(p);
    const today = new Date();
    const t = fmtDate(today);
    let newFrom = t;
    let newTo = t;

    if (p === "today") {
      newFrom = t;
      newTo = t;
    } else if (p === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      newFrom = fmtDate(y);
      newTo = fmtDate(y);
    } else if (p === "last5") {
      const s = new Date();
      s.setDate(s.getDate() - 4);
      newFrom = fmtDate(s);
      newTo = t;
    } else if (p === "last30") {
      const s = new Date();
      s.setDate(s.getDate() - 29);
      newFrom = fmtDate(s);
      newTo = t;
    }

    setFrom(newFrom);
    setTo(newTo);
  };

  const handleDownload = async (format: "excel" | "pdf") => {
    setExportingFormat(format);
    try {
      const base = await getApiBase();
      const token = await getToken();
      const targetType = tab === "students" ? "student" : "teacher";
      const apiFrom = toApiDate(from);
      const apiTo = toApiDate(to);

      if (format === "excel") {
        const params = new URLSearchParams({
          type: targetType,
          format: "excel",
          from: apiFrom,
          to: apiTo,
        });
        if (targetType === "student") {
          if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
          if (filterMode === "class" && className) params.set("className", className);
          if (filterMode === "section" && className) {
            params.set("className", className);
            if (section) params.set("section", section);
          }
        }
        const res = await fetch(`${base}/api/attendance/export?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error(`Export failed (${res.status})`);
        const xml = await res.text();
        const filename = `${targetType}_attendance_${from}_to_${to}_${Date.now()}.xls`;

        // Direct download into device storage
        if (Platform.OS === "android" && FileSystem.StorageAccessFramework) {
          try {
            const permissions =
              await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                filename,
                "application/vnd.ms-excel"
              );
              await FileSystem.writeAsStringAsync(fileUri, xml, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              setInfoModal({
                visible: true,
                title: "Downloaded Successfully",
                message: `Saved Excel file to your selected folder:\n${filename}`,
                variant: "success",
              });
              return;
            }
          } catch {
            /* fallback to standard save */
          }
        }

        // Fallback or iOS save to Document directory
        const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
        const fileUri = `${dir}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, xml, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (Platform.OS === "ios") {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "application/vnd.ms-excel",
              dialogTitle: `Download ${targetType === "student" ? "Student Attendance" : "Teacher Check-in"} Spreadsheet`,
            });
          }
        } else {
          setInfoModal({
            visible: true,
            title: "Downloaded Successfully",
            message: `Excel file saved to local storage:\n${filename}`,
            variant: "success",
          });
        }
      } else {
        // PDF / HTML Report Download
        const params = new URLSearchParams({
          type: targetType,
          format: "json",
          from: apiFrom,
          to: apiTo,
        });
        if (targetType === "student") {
          if (statusFilter && statusFilter !== "ALL") params.set("status", statusFilter);
          if (filterMode === "class" && className) params.set("className", className);
          if (filterMode === "section" && className) {
            params.set("className", className);
            if (section) params.set("section", section);
          }
        }
        const res = await fetch(`${base}/api/attendance/export?${params.toString()}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const resData = await res.json();
        const records = resData?.records || [];
        const schoolTitle = user?.schoolName || "MySchool Platform";

        const htmlReport = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${schoolTitle} - Attendance Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #1e293b; }
    .header { background: ${color}; color: #fff; padding: 20px 24px; border-radius: 12px; margin-bottom: 20px; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 4px 0 0 0; font-size: 12px; opacity: 0.9; }
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 18px; font-size: 12px; display: flex; gap: 24px; flex-wrap: wrap; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    th { background: #1e293b; color: #fff; text-align: left; padding: 10px 12px; font-weight: 700; }
    td { padding: 9px 12px; border-bottom: 1px solid #f1f5f9; }
    tr:nth-child(even) { background: #f8fafc; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-weight: 700; font-size: 10px; text-transform: uppercase; }
    .badge-present { background: #dcfce7; color: #15803d; }
    .badge-absent { background: #fee2e2; color: #b91c1c; }
    .badge-late { background: #fef3c7; color: #b45309; }
    .badge-leave { background: #ede9fe; color: #6d28d9; }
    .footer { margin-top: 30px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${schoolTitle.toUpperCase()}</h1>
    <p>Official ${targetType === "student" ? "Student Attendance" : "Teacher Check-in"} Report (${formatDateDDMMYYYY(from)} to ${formatDateDDMMYYYY(to)})</p>
  </div>
  <div class="meta-box">
    <div><strong>Date Range:</strong> ${formatDateDDMMYYYY(from)} to ${formatDateDDMMYYYY(to)}</div>
    ${targetType === "student" && className ? `<div><strong>Class:</strong> ${className}${section ? `-${section}` : ""}</div>` : ""}
    <div><strong>Total Records:</strong> ${records.length}</div>
    <div><strong>Generated:</strong> ${formatDateTimeDDMMYYYY(new Date())}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Date</th>
        <th>${targetType === "student" ? "Student Name" : "Teacher Name"}</th>
        <th>${targetType === "student" ? "Class-Section" : "Department / Class"}</th>
        <th>Status</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody>
      ${records
        .map((r: any, i: number) => {
          const st = String(r.status || "PRESENT").toUpperCase();
          let badgeCls = "badge-present";
          if (st.includes("ABSENT")) badgeCls = "badge-absent";
          else if (st.includes("LATE")) badgeCls = "badge-late";
          else if (st.includes("LEAVE")) badgeCls = "badge-leave";

          const name =
            targetType === "student"
              ? r.studentName
              : `${r.firstName || ""} ${r.lastName || ""}`.trim() || r.teacherName;
          const label =
            targetType === "student"
              ? `${r.className || ""}${r.section ? `-${r.section}` : ""}`
              : r.classLabel || r.education || "Faculty";
          const time = r.markedAt ? String(r.markedAt).slice(11, 16) : "—";

          return `
          <tr>
            <td>${i + 1}</td>
            <td>${formatDateDDMMYYYY(r.date || from)}</td>
            <td><strong>${name || "—"}</strong></td>
            <td>${label || "—"}</td>
            <td><span class="badge ${badgeCls}">${r.status}</span></td>
            <td>${time}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
  </table>
  <div class="footer">
    ${schoolTitle} • Attendance Management System • Official Record
  </div>
</body>
</html>`;

        const filename = `${targetType}_attendance_report_${from}_to_${to}_${Date.now()}.html`;

        if (Platform.OS === "android" && FileSystem.StorageAccessFramework) {
          try {
            const permissions =
              await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
            if (permissions.granted) {
              const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                filename,
                "text/html"
              );
              await FileSystem.writeAsStringAsync(fileUri, htmlReport, {
                encoding: FileSystem.EncodingType.UTF8,
              });
              setInfoModal({
                visible: true,
                title: "Downloaded Successfully",
                message: `Saved report to your device folder:\n${filename}`,
                variant: "success",
              });
              return;
            }
          } catch {
            /* fallback to standard save */
          }
        }

        const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory || "";
        const fileUri = `${dir}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, htmlReport, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        if (Platform.OS === "ios") {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "text/html",
              dialogTitle: `Download ${targetType === "student" ? "Student Attendance" : "Teacher Check-in"} Report`,
            });
          }
        } else {
          setInfoModal({
            visible: true,
            title: "Downloaded Successfully",
            message: `Report saved to local storage:\n${filename}`,
            variant: "success",
          });
        }
      }
    } catch (err: any) {
      setInfoModal({
        visible: true,
        title: "Export Failed",
        message: err.message || "Failed to download document",
        variant: "error",
      });
    } finally {
      setExportingFormat(null);
    }
  };

  if (initialLoading && !data) return <Loading />;

  const present = data?.presentStudents ?? data?.present ?? 0;
  const absent = data?.absentStudents ?? data?.absent ?? 0;
  const late = data?.late ?? 0;
  const unmarked = data?.unmarkedStudents ?? data?.unmarked ?? 0;
  const total = data?.totalStudents ?? data?.total ?? present + absent + unmarked;
  const pct =
    data?.percentage ??
    (total > 0 ? Math.round((present / total) * 100) : 0);
  const series: { date: string; present: number; absent: number }[] =
    data?.series || data?.last30Days || [];

  const maxBar = Math.max(
    ...series.map((s) => Math.max(s.present || 0, s.absent || 0)),
    1
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: TAB_BAR_CLEARANCE + 20 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchAttendance();
          }}
          tintColor={color}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.title}>Analytics & Reports</Text>
          {updating && <ActivityIndicator size="small" color={color} />}
        </View>
        <Text style={styles.sub}>Student attendance tracking & teacher check-in history</Text>
      </View>

      {/* Main Tab Switcher */}
      <View style={styles.tabContainer}>
        {(["students", "teachers"] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setTab(m)}
            style={[styles.mainTab, tab === m && { backgroundColor: color }]}
          >
            <Ionicons
              name={m === "students" ? "school-outline" : "people-outline"}
              size={17}
              color={tab === m ? "#fff" : "#64748B"}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.mainTabText, tab === m && { color: "#fff" }]}>
              {m === "students" ? "Student Attendance" : "Teacher Check-in"}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Counts Header (Above Timeframe Card) */}
      {tab === "students" && data && (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color }]}>{pct}%</Text>
            <Text style={styles.statLbl}>Attend%</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: Colors.success }]}>{present}</Text>
            <Text style={styles.statLbl}>Present</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: Colors.danger }]}>{absent}</Text>
            <Text style={styles.statLbl}>Absent</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: "#94A3B8" }]}>{unmarked}</Text>
            <Text style={styles.statLbl}>Unmark</Text>
          </View>
        </View>
      )}

      {tab === "teachers" && (
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color }]}>{teacherRep?.totalTeachers || 0}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: Colors.success }]}>
              {teacherRep?.checkedInToday || 0}
            </Text>
            <Text style={styles.statLbl}>Checked</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: Colors.danger }]}>
              {teacherRep?.notCheckedInToday || 0}
            </Text>
            <Text style={styles.statLbl}>Not In</Text>
          </View>
        </View>
      )}

      {/* Filters Card */}
      <View style={styles.filterCard}>
        <Text style={styles.filterTitle}>Timeframe Presets</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          style={{ marginBottom: 12 }}
        >
          {[
            { id: "today" as const, label: "Today" },
            { id: "yesterday" as const, label: "Yesterday" },
            { id: "last5" as const, label: "Last 5 Days" },
            { id: "last30" as const, label: "Last 30 Days" },
            { id: "custom" as const, label: "Custom" },
          ].map((p) => (
            <Pressable
              key={p.id}
              onPress={() => applyPreset(p.id)}
              style={[
                styles.presetChip,
                preset === p.id && { backgroundColor: color, borderColor: color },
              ]}
            >
              <Text
                style={[
                  styles.presetChipText,
                  preset === p.id && { color: "#fff", fontWeight: "800" },
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.dateInputsRow}>
          <View style={{ flex: 1 }}>
            <Label>From (DD-MM-YYYY)</Label>
            <Input
              value={from}
              onChangeText={(v) => {
                setPreset("custom");
                setFrom(v);
              }}
              placeholder="01-09-2026"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Label>To (DD-MM-YYYY)</Label>
            <Input
              value={to}
              onChangeText={(v) => {
                setPreset("custom");
                setTo(v);
              }}
              placeholder="30-09-2026"
            />
          </View>
        </View>

        {tab === "students" && (
          <>
            {/* Attendance Status Filter */}
            <Text style={styles.sectionLabel}>Attendance Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
              {STATUS_FILTERS.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setStatusFilter(s.id)}
                  style={[
                    styles.chip,
                    statusFilter === s.id && { backgroundColor: color, borderColor: color },
                  ]}
                >
                  <Text
                    style={[styles.chipText, statusFilter === s.id && { color: "#fff" }]}
                  >
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Scope Filter</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
              style={{ marginBottom: 6 }}
            >
              {[
                { id: "all" as const, label: "All Classes" },
                { id: "class" as const, label: "Class Only" },
                { id: "section" as const, label: "Class & Section" },
              ].map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setFilterMode(m.id)}
                  style={[
                    styles.chip,
                    filterMode === m.id && { backgroundColor: color, borderColor: color },
                    { marginRight: 0, marginBottom: 0 },
                  ]}
                >
                  <Text
                    style={[styles.chipText, filterMode === m.id && { color: "#fff" }]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {filterMode !== "all" && (
              <>
                <Text style={styles.sectionLabel}>Select Class</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  {classNames.map((n) => (
                    <Pressable
                      key={n}
                      onPress={() => {
                        setClassName(n);
                        setSection("");
                      }}
                      style={[
                        styles.chip,
                        className === n && { backgroundColor: color, borderColor: color },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, className === n && { color: "#fff" }]}
                      >
                        {n}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}

            {filterMode === "section" && className !== "" && (
              <>
                <Text style={styles.sectionLabel}>Select Section</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  {sectionsForClass.map((s) => (
                    <Pressable
                      key={s}
                      onPress={() => setSection(s)}
                      style={[
                        styles.chip,
                        section === s && { backgroundColor: color, borderColor: color },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, section === s && { color: "#fff" }]}
                      >
                        {className}-{s}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}

        <View style={{ marginTop: 8, gap: 10 }}>
          <Button
            title={updating ? "Applying Filters..." : "Apply Filters"}
            color={color}
            loading={updating}
            onPress={() => fetchAttendance()}
          />

          {/* Download Options: Excel and PDF (No CSV) */}
          <View style={styles.downloadRow}>
            <Pressable
              disabled={exportingFormat !== null}
              style={[
                styles.downloadBtn,
                styles.excelBtn,
                exportingFormat === "excel" && { opacity: 0.6 },
              ]}
              onPress={() => handleDownload("excel")}
            >
              {exportingFormat === "excel" ? (
                <ActivityIndicator size="small" color="#047857" />
              ) : (
                <Ionicons name="document-text" size={17} color="#047857" />
              )}
              <Text style={styles.excelBtnText}>
                {exportingFormat === "excel" ? "Downloading..." : "Download Excel"}
              </Text>
            </Pressable>

            <Pressable
              disabled={exportingFormat !== null}
              style={[
                styles.downloadBtn,
                styles.pdfBtn,
                exportingFormat === "pdf" && { opacity: 0.6 },
              ]}
              onPress={() => handleDownload("pdf")}
            >
              {exportingFormat === "pdf" ? (
                <ActivityIndicator size="small" color="#4338CA" />
              ) : (
                <Ionicons name="newspaper-outline" size={17} color="#4338CA" />
              )}
              <Text style={styles.pdfBtnText}>
                {exportingFormat === "pdf" ? "Downloading..." : "Download PDF"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Teacher Tab Content */}
      {tab === "teachers" && (
        <>

          {teacherRep?.series && teacherRep.series.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeaderTitle}>Check-in Trend</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.trendRow}>
                  {teacherRep.series.slice(-14).map((s: any) => {
                    const max = Math.max(s.checkedIn || 0, s.notCheckedIn || 0, 1);
                    return (
                      <View key={s.date} style={styles.trendCol}>
                        <View style={styles.trendBars}>
                          <View
                            style={{
                              width: 9,
                              height: Math.max(4, ((s.checkedIn || 0) / max) * 60),
                              backgroundColor: Colors.success,
                              borderRadius: 4,
                            }}
                          />
                          <View
                            style={{
                              width: 9,
                              height: Math.max(4, ((s.notCheckedIn || 0) / max) * 60),
                              backgroundColor: Colors.danger,
                              borderRadius: 4,
                              marginLeft: 2,
                            }}
                          />
                        </View>
                        <Text style={styles.trendDate}>{formatDateDDMMYYYY(s.date).slice(0, 5)}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Teacher check-in status list */}
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <Text style={styles.cardHeaderTitle}>Teachers History / Status</Text>
              {totalTeachers > 0 && (
                <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.textMuted }}>
                  {visibleTeachers.length} of {totalTeachers}
                </Text>
              )}
            </View>
            {visibleTeachers.length > 0 ? (
              <View style={styles.teacherList}>
                {visibleTeachers.map((t: any, idx: number) => {
                  const isCheckedIn = !!t.checkedIn;
                  return (
                    <View
                      key={t.id || idx}
                      style={[
                        styles.teacherRow,
                        idx !== visibleTeachers.length - 1 && styles.teacherRowDivider,
                      ]}
                    >
                      <SafeAvatar
                        photoUrl={t.photoUrl}
                        name={t.firstName || "T"}
                        apiBase={apiBase}
                        size={40}
                        color={color}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.teacherName}>
                          {t.firstName} {t.lastName || ""}
                        </Text>
                        <Text style={styles.teacherSub}>
                          {t.classLabel || t.education || t.email || "Faculty"}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          isCheckedIn ? styles.statusBadgeIn : styles.statusBadgeOut,
                        ]}
                      >
                        <Ionicons
                          name={isCheckedIn ? "checkmark-circle" : "close-circle"}
                          size={13}
                          color={isCheckedIn ? "#047857" : "#B91C1C"}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isCheckedIn ? styles.statusTextIn : styles.statusTextOut,
                          ]}
                        >
                          {isCheckedIn ? "Checked In" : "Not In"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                {hasMoreTeachers && (
                  <Pressable
                    onPress={() => setTeacherPage((p) => p + 1)}
                    style={{
                      paddingVertical: 10,
                      marginTop: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: color + "14",
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color }}>
                      Load more teachers ({visibleTeachers.length} of {totalTeachers})
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <Text style={styles.emptyNote}>No teacher check-in records for selected period</Text>
            )}
          </View>
        </>
      )}

      {/* Student Tab Content */}
      {tab === "students" && (!data ? (
        <Empty message="No student analytics data found" />
      ) : (
        <>
          <View style={styles.sectionCard}>
            <Text style={styles.cardHeaderTitle}>Distribution Breakdown</Text>
            <View style={styles.chart}>
              {[
                { label: "Present", v: present, c: Colors.success },
                { label: "Absent", v: absent, c: Colors.danger },
                { label: "Late", v: late, c: Colors.warning },
                { label: "Unmarked", v: unmarked, c: "#94A3B8" },
              ].map((b) => {
                const max = Math.max(present, absent, late, unmarked, 1);
                const h = Math.max(8, Math.round((b.v / max) * 110));
                return (
                  <View key={b.label} style={styles.barCol}>
                    <Text style={styles.barVal}>{b.v}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { height: h, backgroundColor: b.c }]} />
                    </View>
                    <Text style={styles.barLbl}>{b.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {series.length > 0 && (
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeaderTitle}>Daily Attendance Trend</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.trendRow}>
                  {series.slice(-14).map((s) => (
                    <View key={s.date} style={styles.trendCol}>
                      <View style={styles.trendBars}>
                        <View
                          style={{
                            width: 9,
                            height: Math.max(4, (s.present / maxBar) * 60),
                            backgroundColor: Colors.success,
                            borderRadius: 4,
                          }}
                        />
                        <View
                          style={{
                            width: 9,
                            height: Math.max(4, (s.absent / maxBar) * 60),
                            backgroundColor: Colors.danger,
                            borderRadius: 4,
                            marginLeft: 2,
                          }}
                        />
                      </View>
                      <Text style={styles.trendDate}>{formatDateDDMMYYYY(s.date).slice(0, 5)}</Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Student Records List (View Option with Profile Pic and Details same as teachers) */}
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={styles.cardHeaderTitle}>Student Attendance Records</Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: Colors.textMuted }}>
                {isMultiDay
                  ? `${visibleMultiStudents.length} of ${totalMultiStudents} students`
                  : `${visibleSingleStudents.length} of ${totalSingleStudents} records`}
              </Text>
            </View>
            {isMultiDay ? (
              visibleMultiStudents.length > 0 ? (
                <View style={styles.teacherList}>
                  {visibleMultiStudents.map((s, idx) => (
                    <View
                      key={s.studentId || idx}
                      style={[
                        styles.teacherRow,
                        idx !== visibleMultiStudents.length - 1 && styles.teacherRowDivider,
                      ]}
                    >
                      <SafeAvatar
                        photoUrl={s.photoUrl}
                        name={s.studentName || "S"}
                        apiBase={apiBase}
                        size={40}
                        color={color}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.teacherName}>{s.studentName}</Text>
                        <Text style={styles.teacherSub}>
                          {s.className ? `${s.className}${s.section ? `-${s.section}` : ""}` : "Student"}
                          {s.rollNo ? ` · Roll: ${s.rollNo}` : ""}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <View style={[styles.miniBadge, { backgroundColor: "#D1FAE5" }]}>
                          <Text style={[styles.miniBadgeText, { color: "#047857" }]}>{s.present}P</Text>
                        </View>
                        {s.late > 0 && (
                          <View style={[styles.miniBadge, { backgroundColor: "#FEF3C7" }]}>
                            <Text style={[styles.miniBadgeText, { color: "#B45309" }]}>{s.late}L</Text>
                          </View>
                        )}
                        <View style={[styles.miniBadge, { backgroundColor: "#FEE2E2" }]}>
                          <Text style={[styles.miniBadgeText, { color: "#B91C1C" }]}>{s.absent}A</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                  {hasMoreMultiStudents && (
                    <Pressable
                      onPress={() => setStudentPage((p) => p + 1)}
                      style={{
                        paddingVertical: 10,
                        marginTop: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: color + "14",
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "700", color }}>
                        Load more students ({visibleMultiStudents.length} of {totalMultiStudents})
                      </Text>
                    </Pressable>
                  )}
                </View>
              ) : (
                <Text style={styles.emptyNote}>No student attendance records for selected period</Text>
              )
            ) : visibleSingleStudents.length > 0 ? (
              <View style={styles.teacherList}>
                {visibleSingleStudents.map((r: any, idx: number) => {
                  const st = String(r.status || "PRESENT").toUpperCase();
                  const isPresent = st === "PRESENT";
                  const isAbsent = st === "ABSENT";
                  const isLate = st === "LATE";
                  const isLeave = st === "LEAVE";

                  let badgeBg = "#D1FAE5";
                  let badgeTextColor = "#047857";
                  let iconName: keyof typeof Ionicons.glyphMap = "checkmark-circle";

                  if (isAbsent) {
                    badgeBg = "#FEE2E2";
                    badgeTextColor = "#B91C1C";
                    iconName = "close-circle";
                  } else if (isLate) {
                    badgeBg = "#FEF3C7";
                    badgeTextColor = "#B45309";
                    iconName = "time";
                  } else if (isLeave) {
                    badgeBg = "#EDE9FE";
                    badgeTextColor = "#6D28D9";
                    iconName = "calendar";
                  }

                  const timeStr = r.markedAt ? String(r.markedAt).slice(11, 16) : "";

                  return (
                    <View
                      key={r.id || idx}
                      style={[
                        styles.teacherRow,
                        idx !== visibleSingleStudents.length - 1 && styles.teacherRowDivider,
                      ]}
                    >
                      <SafeAvatar
                        photoUrl={r.photoUrl}
                        name={r.studentName || "S"}
                        apiBase={apiBase}
                        size={40}
                        color={color}
                      />
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.teacherName}>
                          {r.studentName || "Student"}
                        </Text>
                        <Text style={styles.teacherSub}>
                          {r.className ? `${r.className}${r.section ? `-${r.section}` : ""}` : "Student"}
                          {timeStr ? ` · ${timeStr}` : ""}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: badgeBg },
                        ]}
                      >
                        <Ionicons
                          name={iconName}
                          size={13}
                          color={badgeTextColor}
                          style={{ marginRight: 4 }}
                        />
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: badgeTextColor },
                          ]}
                        >
                          {r.status || "Present"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                {hasMoreSingleStudents && (
                  <Pressable
                    onPress={() => setStudentPage((p) => p + 1)}
                    style={{
                      paddingVertical: 10,
                      marginTop: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: color + "14",
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "700", color }}>
                      Load more records ({visibleSingleStudents.length} of {totalSingleStudents})
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              <Text style={styles.emptyNote}>No student attendance records for selected filter</Text>
            )}
          </View>
        </>
      ))}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        variant={infoModal.variant}
        onClose={() => setInfoModal((p) => ({ ...p, visible: false }))}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { marginBottom: 14 },
  title: { fontSize: 22, fontWeight: "800", color: Colors.text },
  sub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  mainTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: radius.md,
  },
  mainTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  filterCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  filterTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F8FAFC",
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.text,
  },
  dateInputsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  sectionLabel: {
    fontWeight: "700",
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 8,
    marginBottom: 6,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F8FAFC",
    marginRight: 6,
    marginBottom: 6,
  },
  chipText: { fontWeight: "700", fontSize: 12, color: Colors.text },
  downloadRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  downloadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: radius.lg,
    paddingVertical: 12,
    borderWidth: 1,
  },
  excelBtn: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  excelBtnText: {
    color: "#047857",
    fontWeight: "700",
    fontSize: 13,
  },
  pdfBtn: {
    backgroundColor: "#EEF2FF",
    borderColor: "#C7D2FE",
  },
  pdfBtnText: {
    color: "#4338CA",
    fontWeight: "700",
    fontSize: 13,
  },
  stats: { flexDirection: "row", gap: 8, marginBottom: 14 },
  stat: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statNum: { fontSize: 18, fontWeight: "800" },
  statLbl: { fontSize: 11, color: Colors.textMuted, marginTop: 3, fontWeight: "600" },
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 150,
    paddingTop: 8,
  },
  barCol: { alignItems: "center", flex: 1 },
  barVal: { fontSize: 11, fontWeight: "700", color: Colors.textMuted },
  barTrack: {
    width: 28,
    height: 110,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
    marginTop: 4,
  },
  barFill: { width: "100%", borderRadius: 8 },
  barLbl: { fontSize: 10, color: Colors.textMuted, marginTop: 6, fontWeight: "600" },
  trendRow: { flexDirection: "row", alignItems: "flex-end", gap: 12, paddingVertical: 8 },
  trendCol: { alignItems: "center", width: 34 },
  trendBars: { flexDirection: "row", alignItems: "flex-end", height: 64 },
  trendDate: { fontSize: 9, color: Colors.textMuted, marginTop: 4, fontWeight: "600" },
  teacherList: { marginTop: 4 },
  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  teacherRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  teacherName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
  },
  teacherSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeIn: {
    backgroundColor: "#D1FAE5",
  },
  statusBadgeOut: {
    backgroundColor: "#FEE2E2",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextIn: {
    color: "#047857",
  },
  statusTextOut: {
    color: "#B91C1C",
  },
  emptyNote: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: 16,
  },
  miniBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
});
