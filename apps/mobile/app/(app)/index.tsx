import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { api, getApiBase, getApiBaseSync, resolveMediaUrlSync } from "@/lib/api";
import { useBadges } from "@/hooks/useBadges";
import { Loading } from "@/components/ui";
import { resolveChildren, ChildInfo } from "@/hooks/useChildren";
import { SafeAvatar } from "@/components/ChildAvatar";
import { Colors, spacing } from "@/constants/theme";
import { numish, str, formatDateDDMMYYYY, toTitleCase } from "@/lib/format";

type DashCard = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: string;
  color: string;
  value?: string | number;
  badge?: number;
};

function TopRankerPhoto({
  photoUrl,
  name,
  apiBase,
}: {
  photoUrl?: string | null;
  name?: string;
  apiBase?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const base = apiBase || getApiBaseSync();
  const uri = !hasError && photoUrl ? resolveMediaUrlSync(photoUrl, base) : undefined;
  const initialLetter = ((name || "S").trim()[0] || "S").toUpperCase();

  useEffect(() => {
    setHasError(false);
  }, [photoUrl, base]);

  if (uri && !hasError) {
    return (
      <ExpoImage
        source={{ uri }}
        style={styles.topStudentPhoto}
        contentFit="cover"
        transition={150}
        cachePolicy="memory-disk"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <View style={styles.topStudentPhotoInitial}>
      <Text style={styles.topStudentInitialText}>{initialLetter}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { user, themeColor, refresh } = useAuth();
  const badges = useBadges();
  const [stats, setStats] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiBase, setApiBase] = useState(() => getApiBaseSync());
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);
  const [ctClassesList, setCtClassesList] = useState<any[]>([]);
  const [selectedTeacherCtIdx, setSelectedTeacherCtIdx] = useState(0);
  const [teacherAllStudents, setTeacherAllStudents] = useState<any[]>([]);
  const [classAttendanceMap, setClassAttendanceMap] = useState<Record<string, number>>({});
  const [teacherStudentCount, setTeacherStudentCount] = useState<number | null>(null);
  const [parentKids, setParentKids] = useState<ChildInfo[]>([]);
  const [selectedParentKidIdx, setSelectedParentKidIdx] = useState(0);
  const selectedParentKidIdxRef = useRef(0);
  selectedParentKidIdxRef.current = selectedParentKidIdx;
  const [analytics, setAnalytics] = useState<any>(null);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [schoolClasses, setSchoolClasses] = useState<any[]>([]);
  const [studentAttendance, setStudentAttendance] = useState<{
    present: number;
    absent: number;
    late: number;
    total: number;
    rate: number;
    todayStatus: string;
  }>({
    present: 0,
    absent: 0,
    late: 0,
    total: 0,
    rate: 0,
    todayStatus: "NOT_MARKED",
  });
  const [studentHomework, setStudentHomework] = useState<any[]>([]);
  const [studentExams, setStudentExams] = useState<any[]>([]);
  const [kidDataLoading, setKidDataLoading] = useState(false);
  const [heroKidIdx, setHeroKidIdx] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(28)).current;
  const checkScale = useRef(new Animated.Value(0.92)).current;
  const classAnims = useRef<Animated.Value[]>([]).current;
  const heroKidFade = useRef(new Animated.Value(1)).current;

  const top1stRankers = useMemo(() => {
    return (topStudents || [])
      .map((cls: any) => {
        const first = cls.students?.[0];
        if (!first) return null;
        return {
          ...first,
          classLabel: cls.classLabel,
          className: cls.className,
          section: cls.section,
        };
      })
      .filter(Boolean);
  }, [topStudents]);

  const fetchKidData = useCallback(async (activeKid: any) => {
    if (!activeKid) return;
    setKidDataLoading(true);
    try {
      const hwParams = new URLSearchParams();
      if (activeKid.className) hwParams.set("className", activeKid.className);
      if (activeKid.section) hwParams.set("section", activeKid.section);

      const [attRes, hwRes, examRes] = await Promise.all([
        api<any>(`/api/attendance/student?studentId=${encodeURIComponent(activeKid.id)}`).catch(() => null),
        api<any>(`/api/homework?${hwParams.toString()}`).catch(() => null),
        api<any>(`/api/exams?studentId=${encodeURIComponent(activeKid.id)}`).catch(() => null),
      ]);

      if (attRes) {
        let classRecords = (attRes.records || []).filter((r: any) => {
          if (activeKid.className && r.className && r.className !== activeKid.className) return false;
          if (activeKid.section && r.section && r.section !== activeKid.section) return false;
          return true;
        });
        if (classRecords.length === 0 && (attRes.records || []).length > 0) {
          classRecords = attRes.records || [];
        }
        const present = classRecords.filter((r: any) => r.status === "PRESENT").length;
        const absent = classRecords.filter((r: any) => r.status === "ABSENT").length;
        const late = classRecords.filter((r: any) => r.status === "LATE").length;
        const total = classRecords.length;
        const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayRec = classRecords.find((r: any) => (r.date || "").slice(0, 10) === todayStr);
        const todayStatus = todayRec ? String(todayRec.status).toUpperCase() : "NOT_MARKED";
        setStudentAttendance({ present, absent, late, total, rate, todayStatus });
      } else {
        setStudentAttendance({ present: 0, absent: 0, late: 0, total: 0, rate: 0, todayStatus: "NOT_MARKED" });
      }

      if (hwRes) {
        const raw = hwRes.homeworks || hwRes.list || [];
        const todayStr = new Date().toISOString().slice(0, 10);
        const yesterdayDate = new Date(Date.now() - 86400000);
        const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
        const sorted = [...raw].sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        const items = sorted.slice(0, 4).map((h: any) => {
          const createdDateStr = (h.createdAt || "").slice(0, 10);
          let dayBadge = "";
          if (createdDateStr === todayStr) dayBadge = "Today";
          else if (createdDateStr === yesterdayStr) dayBadge = "Yesterday";
          return { ...h, dayBadge };
        });
        setStudentHomework(items);
      } else {
        setStudentHomework([]);
      }

      if (examRes) {
        const marksList = examRes.marks || [];
        const examsList = examRes.exams || [];
        const list: any[] = [];
        const seenExamIds = new Set<string>();

        for (const m of marksList) {
          const marksVal = m.marks != null ? Number(m.marks) : null;
          const maxM = Number(m.maxMarks) || 100;
          const pct = marksVal != null && maxM > 0 ? Math.round((marksVal / maxM) * 100) : 0;
          let grade = "Pass";
          if (pct >= 90) grade = "A+";
          else if (pct >= 80) grade = "A";
          else if (pct >= 70) grade = "B+";
          else if (pct >= 60) grade = "B";
          else if (pct >= 50) grade = "C";
          else if (pct >= 35) grade = "D";
          else grade = "F";

          list.push({
            id: m.id || `${m.examId}_${m.subjectId || "main"}`,
            examId: m.examId,
            title: m.examName || m.subject || "Exam",
            subject: m.subject || (m.subjects && m.subjects[0]?.subjectName) || "General",
            type: m.examType || "TEST",
            date: m.examDate || m.dateFrom || m.createdAt,
            marksVal,
            maxM,
            pct,
            grade,
          });
          seenExamIds.add(m.examId);
        }

        for (const ex of examsList) {
          if (!seenExamIds.has(ex.id) && (ex.type !== "EXAM" || ex.published)) {
            list.push({
              id: ex.id,
              examId: ex.id,
              title: ex.name,
              subject: ex.subject || (ex.subjects && ex.subjects[0]?.subjectName) || "General",
              type: ex.type || "TEST",
              date: ex.date || ex.dateFrom || ex.createdAt,
              marksVal: null,
              maxM: Number(ex.maxMarks) || 100,
              pct: null,
              grade: null,
            });
          }
        }

        setStudentExams(list.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 4));
      } else {
        setStudentExams([]);
      }
    } finally {
      setKidDataLoading(false);
    }
  }, []);

  useEffect(() => {
    getApiBase().then(setApiBase);
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await api<any>("/api/dashboard/stats");
      setStats(data.stats || data || {});
      setTopStudents(data.topStudents || data.topStudentsByClass || []);
      badges.refresh();
      if (user?.role === "TEACHER") {
        try {
          const ci = await api<any>("/api/attendance/checkin");
          setCheckedIn(!!ci.checkedIn);
        } catch { /* ignore */ }
        let teacherClassesList: any[] = [];
        try {
          const tc = await api<any>("/api/teacher-classes");
          const raw = tc.classes || [];
          const seen = new Set<string>();
          // Prefer CLASS_TEACHER label when both CT and ST for same class
          const sorted = [...raw].sort((a: any, b: any) =>
            (a.role === "CLASS_TEACHER" ? 0 : 1) - (b.role === "CLASS_TEACHER" ? 0 : 1)
          );
          const uniq = sorted.filter((c: any) => {
            const k = `${c.className || c.name || ""}|${c.section || ""}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          teacherClassesList = uniq;
          setTeacherClasses(uniq);
          const ct = uniq.filter((c: any) => c.role === "CLASS_TEACHER");
          setCtClassesList(ct.length > 0 ? ct : uniq);
        } catch {
          setTeacherClasses([]);
          setCtClassesList([]);
        }
        try {
          const st = await api<any>("/api/teacher-classes?students=1");
          const allStudents: any[] = st.students || [];
          setTeacherAllStudents(allStudents);
          setTeacherStudentCount(allStudents.length);

          const today = new Date().toISOString().slice(0, 10);
          const attMap: Record<string, number> = {};
          const targetClasses = teacherClassesList.length > 0 ? teacherClassesList : [];
          for (const c of targetClasses) {
            const cName = c.className || c.name || "";
            const sName = c.section || "";
            const k = `${cName}|${sName}`;
            try {
              const params = new URLSearchParams({ className: cName, date: today });
              if (sName) params.set("section", sName);
              const attData = await api<any>(`/api/attendance/class?${params.toString()}`);
              const present = attData.present ?? (attData.students || []).filter((s: any) => s.status === "PRESENT" || s.status === "LATE").length;
              attMap[k] = present;
            } catch {
              attMap[k] = 0;
            }
          }
          setClassAttendanceMap(attMap);
        } catch {
          setTeacherAllStudents([]);
          setTeacherStudentCount(0);
          setClassAttendanceMap({});
        }
      }
      if (user?.role === "PARENT") {
        try {
          const kids = await resolveChildren(user);
          setParentKids(kids);
          const activeKid = kids[selectedParentKidIdxRef.current] || kids[0];
          if (activeKid) {
            await fetchKidData(activeKid);
          }
        } catch { setParentKids([]); }
      }
      if (user?.role === "PRINCIPAL" || user?.role === "ADMIN") {
        try {
          const c = await api<any>("/api/classes");
          setSchoolClasses(c.classes || []);
        } catch { setSchoolClasses([]); }
        try {
          const s = await api<any>("/api/attendance/stats");
          setAnalytics(s);
        } catch { setAnalytics(null); }
      }
      if (user?.role === "STUDENT") {
        try {
          const [attRes, hwRes, examRes] = await Promise.all([
            api<any>(`/api/attendance/student?studentId=${encodeURIComponent(user.id)}`).catch(() => null),
            api<any>("/api/homework").catch(() => null),
            api<any>(`/api/exams?studentId=${encodeURIComponent(user.id)}`).catch(() => null),
          ]);

          if (attRes) {
            let classRecords = (attRes.records || []).filter((r: any) => {
              if (user.className && r.className && r.className !== user.className) return false;
              if (user.section && r.section && r.section !== user.section) return false;
              return true;
            });
            if (classRecords.length === 0 && (attRes.records || []).length > 0) {
              classRecords = attRes.records || [];
            }
            const present = classRecords.filter((r: any) => r.status === "PRESENT").length;
            const absent = classRecords.filter((r: any) => r.status === "ABSENT").length;
            const late = classRecords.filter((r: any) => r.status === "LATE").length;
            const total = classRecords.length;
            const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
            const todayStr = new Date().toISOString().slice(0, 10);
            const todayRec = classRecords.find((r: any) => (r.date || "").slice(0, 10) === todayStr);
            const todayStatus = todayRec ? String(todayRec.status).toUpperCase() : "NOT_MARKED";
            setStudentAttendance({ present, absent, late, total, rate, todayStatus });
          }

          if (hwRes) {
            const raw = hwRes.homeworks || hwRes.list || [];
            const todayStr = new Date().toISOString().slice(0, 10);
            const yesterdayDate = new Date(Date.now() - 86400000);
            const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
            const sorted = [...raw].sort((a: any, b: any) => (b.createdAt || "").localeCompare(a.createdAt || ""));
            const items = sorted.slice(0, 4).map((h: any) => {
              const createdDateStr = (h.createdAt || "").slice(0, 10);
              let dayBadge = "";
              if (createdDateStr === todayStr) dayBadge = "Today";
              else if (createdDateStr === yesterdayStr) dayBadge = "Yesterday";
              return { ...h, dayBadge };
            });
            setStudentHomework(items);
          }

          if (examRes) {
            const marksList = examRes.marks || [];
            const examsList = examRes.exams || [];
            const list: any[] = [];
            const seenExamIds = new Set<string>();

            for (const m of marksList) {
              const marksVal = m.marks != null ? Number(m.marks) : null;
              const maxM = Number(m.maxMarks) || 100;
              const pct = marksVal != null && maxM > 0 ? Math.round((marksVal / maxM) * 100) : 0;
              let grade = "Pass";
              if (pct >= 90) grade = "A+";
              else if (pct >= 80) grade = "A";
              else if (pct >= 70) grade = "B+";
              else if (pct >= 60) grade = "B";
              else if (pct >= 50) grade = "C";
              else if (pct >= 35) grade = "D";
              else grade = "F";

              list.push({
                id: m.id || `${m.examId}_${m.subjectId || "main"}`,
                examId: m.examId,
                title: m.examName || m.subject || "Exam",
                subject: m.subject || (m.subjects && m.subjects[0]?.subjectName) || "General",
                type: m.examType || "TEST",
                date: m.examDate || m.dateFrom || m.createdAt,
                marksVal,
                maxM,
                pct,
                grade,
              });
              seenExamIds.add(m.examId);
            }

            for (const ex of examsList) {
              if (!seenExamIds.has(ex.id) && (ex.type !== "EXAM" || ex.published)) {
                list.push({
                  id: ex.id,
                  examId: ex.id,
                  title: ex.name,
                  subject: ex.subject || (ex.subjects && ex.subjects[0]?.subjectName) || "General",
                  type: ex.type || "TEST",
                  date: ex.date || ex.dateFrom || ex.createdAt,
                  marksVal: null,
                  maxM: Number(ex.maxMarks) || 100,
                  pct: null,
                  grade: null,
                });
              }
            }

            setStudentExams(list.sort((a, b) => (b.date || "").localeCompare(a.date || "")).slice(0, 4));
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      setStats({});
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role, user?.id, user?.className, user?.section]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
      load();
    }, [load, refresh])
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, friction: 8, useNativeDriver: true }),
      Animated.spring(checkScale, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
    ]).start();
  }, [fade, slide, checkScale]);

  useEffect(() => {
    while (classAnims.length < teacherClasses.length) {
      classAnims.push(new Animated.Value(0));
    }
    const anims = teacherClasses.map((_, i) =>
      Animated.timing(classAnims[i] || new Animated.Value(0), {
        toValue: 1,
        duration: 350,
        delay: i * 80,
        useNativeDriver: true,
      })
    );
    if (anims.length) Animated.stagger(60, anims).start();
  }, [teacherClasses, classAnims]);

  // 15-second automatic carousel for parent hero card if parent has >1 children
  useEffect(() => {
    if (user?.role !== "PARENT" || parentKids.length <= 1) return;

    const interval = setInterval(() => {
      Animated.timing(heroKidFade, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }).start(() => {
        setHeroKidIdx((prev) => (prev + 1) % parentKids.length);
        Animated.timing(heroKidFade, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }).start();
      });
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.role, parentKids.length, heroKidFade]);

  if (loading) return <Loading />;

  const color = themeColor || Colors.primary;
  const hour = new Date().getHours();
  const greet =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const photo = resolveMediaUrlSync(user?.photoUrl, apiBase);
  const role = user?.role;

  const cards: DashCard[] = buildCards(role, stats, badges, color, teacherStudentCount, schoolClasses.length);

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: 110 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            refresh().catch(() => {});
            load();
          }}
          tintColor={color}
        />
      }
    >
      <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
        <View style={[styles.hero, { backgroundColor: color }]}>
          <View style={styles.heroGlow} />
          {user?.role === "PARENT" ? (
            (() => {
              const activeKid = parentKids[heroKidIdx] || parentKids[0];
              const kidName = activeKid ? activeKid.firstName : (user?.firstName || "Child");
              const kidRoll = activeKid ? (activeKid.rollNumber || (activeKid as any).rollNo) : null;
              const kidClass = activeKid ? `${activeKid.className || ""}${activeKid.section ? `-${activeKid.section}` : ""}` : "";

              return (
                <Animated.View style={{ opacity: heroKidFade }}>
                  <View style={styles.heroRow}>
                    <SafeAvatar
                      photoUrl={activeKid?.photoUrl}
                      name={kidName}
                      apiBase={apiBase || getApiBaseSync()}
                      size={54}
                      color="#ffffff"
                      borderRadius={12}
                    />
                    <View style={styles.heroTextCol}>
                      <Text style={styles.hello} numberOfLines={1}>
                        {greet}!
                      </Text>
                      <Text style={[styles.hello, { fontSize: 17, marginTop: 2 }]} numberOfLines={1}>
                        {kidName}'s parent
                      </Text>
                      {activeKid ? (
                        <>
                          <Text style={styles.sub} numberOfLines={1}>
                            Class: {kidClass || "—"}{kidRoll ? ` · Roll: ${kidRoll}` : ""}
                          </Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                            <View style={styles.heroRolePill}>
                              <Text style={styles.heroRolePillText}>Parent / Guardian</Text>
                            </View>
                            {kidRoll ? (
                              <View style={styles.heroRolePill}>
                                <Text style={styles.heroRolePillText}>
                                  Roll: {kidRoll}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </>
                      ) : (
                        <View style={styles.heroRolePill}>
                          <Text style={styles.heroRolePillText}>Parent / Guardian</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Animated.View>
              );
            })()
          ) : (
            <View style={styles.heroRow}>
              <SafeAvatar
                photoUrl={user?.photoUrl || (user as any)?.avatar || (user as any)?.photo || (user as any)?.image}
                name={user?.firstName || (user as any)?.name || user?.username || "U"}
                apiBase={apiBase || getApiBaseSync()}
                size={54}
                color="#ffffff"
                borderRadius={12}
              />
              <View style={styles.heroTextCol}>
                <Text style={styles.hello} numberOfLines={1}>
                  {greet}, {user?.firstName}!
                </Text>
                {user?.role === "STUDENT" ? (
                  <>
                    <Text style={styles.sub} numberOfLines={1}>
                      Class: {user?.className || ""}{user?.section ? `-${user?.section}` : ""}
                      {((user as any)?.rollNumber || (user as any)?.rollNo)
                        ? ` · Roll: ${(user as any).rollNumber || (user as any).rollNo}`
                        : ""}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <View style={styles.heroRolePill}>
                        <Text style={styles.heroRolePillText}>Student</Text>
                      </View>
                      {((user as any)?.rollNumber || (user as any)?.rollNo) ? (
                        <View style={styles.heroRolePill}>
                          <Text style={styles.heroRolePillText}>
                            Roll: {(user as any).rollNumber || (user as any).rollNo}
                          </Text>
                        </View>
                      ) : null}
                      {user?.parentName ? (
                        <View style={styles.heroParentPill}>
                          <Text style={styles.heroParentPillText} numberOfLines={1}>
                            Parent: {user.parentName}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.sub} numberOfLines={1}>
                      {user?.schoolName || user?.schoolCode}
                    </Text>
                    <View style={styles.heroRolePill}>
                      <Text style={styles.heroRolePillText}>
                        {user?.role === "ADMIN" ? "Administrator" : user?.role}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
        </View>

        {(user?.role === "ADMIN" || user?.role === "PRINCIPAL") && (
          <View style={styles.adminStatsSection}>
            <View style={styles.adminStatsHeader}>
              <Text style={styles.adminStatsTitle}>School Overview</Text>
              <Text style={styles.adminStatsSub}>Key population metrics</Text>
            </View>
            <View style={styles.adminGrid}>
              {user?.role === "ADMIN" ? (
                /* Principals Card for Admin */
                <Pressable
                  style={({ pressed }) => [
                    styles.adminStatCard,
                    { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF", opacity: pressed ? 0.9 : 1 },
                  ]}
                  onPress={() => router.push("/(app)/principals" as any)}
                >
                  <View style={[styles.statShape, { backgroundColor: "#8B5CF618" }]} />
                  <View style={[styles.statIconBox, { backgroundColor: "#8B5CF622" }]}>
                    <Ionicons name="shield-checkmark" size={20} color="#8B5CF6" />
                  </View>
                  <Text style={[styles.adminStatNumber, { color: "#7C3AED" }]}>
                    {numish(stats.totalPrincipals ?? stats.principals ?? 0)}
                  </Text>
                  <View style={styles.statLabelRow}>
                    <Text style={styles.adminStatLabel}>Principals</Text>
                    <Ionicons name="arrow-forward-circle" size={14} color="#8B5CF6" />
                  </View>
                </Pressable>
              ) : (
                /* Total Students Present Today Card for Principal */
                <Pressable
                  style={({ pressed }) => [
                    styles.adminStatCard,
                    { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", opacity: pressed ? 0.9 : 1 },
                  ]}
                  onPress={() => router.push("/(app)/analytics" as any)}
                >
                  <View style={[styles.statShape, { backgroundColor: "#16A34A18" }]} />
                  <View style={[styles.statIconBox, { backgroundColor: "#16A34A22" }]}>
                    <Ionicons name="checkmark-done-circle" size={20} color="#16A34A" />
                  </View>
                  <Text style={[styles.adminStatNumber, { color: "#15803D" }]}>
                    {numish(stats.presentToday ?? stats.presentStudents ?? stats.present ?? 0)}
                  </Text>
                  <View style={styles.statLabelRow}>
                    <Text style={styles.adminStatLabel}>Present Today</Text>
                    <Ionicons name="arrow-forward-circle" size={14} color="#16A34A" />
                  </View>
                </Pressable>
              )}

              {/* Teachers Card */}
              <Pressable
                style={({ pressed }) => [
                  styles.adminStatCard,
                  { backgroundColor: "#FDF2F8", borderColor: "#FBCFE8", opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => router.push("/(app)/teachers")}
              >
                <View style={[styles.statShape, { backgroundColor: "#EC489918" }]} />
                <View style={[styles.statIconBox, { backgroundColor: "#EC489922" }]}>
                  <Ionicons name="people" size={20} color="#EC4899" />
                </View>
                <Text
                  style={[styles.adminStatNumber, { color: "#DB2777" }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {`${stats.presentTeachers ?? stats.checkedInTeachers ?? 0}/${stats.totalTeachers ?? (typeof stats.teachers === "number" ? stats.teachers : 0)}`}
                </Text>
                <View style={styles.statLabelRow}>
                  <Text style={styles.adminStatLabel}>Teachers</Text>
                  <Ionicons name="arrow-forward-circle" size={14} color="#EC4899" />
                </View>
              </Pressable>

              {/* Students Card */}
              <Pressable
                style={({ pressed }) => [
                  styles.adminStatCard,
                  { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD", opacity: pressed ? 0.9 : 1 },
                ]}
                onPress={() => router.push("/(app)/students")}
              >
                <View style={[styles.statShape, { backgroundColor: "#0EA5E918" }]} />
                <View style={[styles.statIconBox, { backgroundColor: "#0EA5E922" }]}>
                  <Ionicons name="school" size={20} color="#0EA5E9" />
                </View>
                <Text
                  style={[styles.adminStatNumber, { color: "#0284C7" }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {`${stats.presentToday ?? stats.presentStudents ?? stats.present ?? 0}/${stats.totalStudents ?? stats.students ?? 0}`}
                </Text>
                <View style={styles.statLabelRow}>
                  <Text style={styles.adminStatLabel}>Students</Text>
                  <Ionicons name="arrow-forward-circle" size={14} color="#0EA5E9" />
                </View>
              </Pressable>

              {/* Parents Card (Non-clickable count) */}
              <View
                style={[
                  styles.adminStatCard,
                  { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
                ]}
              >
                <View style={[styles.statShape, { backgroundColor: "#10B98118" }]} />
                <View style={[styles.statIconBox, { backgroundColor: "#10B98122" }]}>
                  <Ionicons name="heart" size={20} color="#10B981" />
                </View>
                <Text style={[styles.adminStatNumber, { color: "#059669" }]}>
                  {numish(stats.totalParents ?? stats.parents ?? 0)}
                </Text>
                <View style={styles.statLabelRow}>
                  <Text style={styles.adminStatLabel}>Parents</Text>
                  <Text style={styles.statSubTag}>Registered</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        
        
        {user?.role === "TEACHER" && (
          <View style={styles.teacherPanel}>
            <View style={[styles.checkPanel, { borderColor: checkedIn ? "#86EFAC" : color + "55" }]}>
              <View style={styles.checkLeft}>
                <View style={[styles.checkBubble, { backgroundColor: checkedIn ? "#DCFCE7" : color + "18" }]}>
                  <Ionicons
                    name={checkedIn ? "checkmark-circle" : "time-outline"}
                    size={30}
                    color={checkedIn ? Colors.success : color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.checkTitle}>Today check-in</Text>
                  <Text style={{ color: checkedIn ? Colors.success : Colors.warning, fontWeight: "700", fontSize: 13, marginTop: 2 }}>
                    {checkedIn ? "Active · checked in" : "Not checked in yet"}
                  </Text>
                  <Text style={styles.checkHint}>
                    {new Date().toLocaleDateString(undefined, { weekday: "long" })}, {formatDateDDMMYYYY(new Date())}
                  </Text>
                </View>
              </View>
              {!checkedIn && (
              <Pressable
                disabled={checkLoading}
                onPress={async () => {
                  setCheckLoading(true);
                  try {
                    await api<any>("/api/attendance/checkin", { method: "POST", body: {} });
                    setCheckedIn(true);
                  } catch { /* ignore */ }
                  finally { setCheckLoading(false); }
                }}
                style={[
                  styles.checkCta,
                  { backgroundColor: color },
                  checkLoading && { opacity: 0.75 },
                ]}
              >
                <Text style={styles.checkCtaText}>
                  {checkLoading ? "…" : "Check in"}
                </Text>
              </Pressable>
              )}
            </View>

            {/* Class Teacher Stats Cards (Above My Classes) */}
            {ctClassesList.length > 0 && (() => {
              const activeCt = ctClassesList[selectedTeacherCtIdx] || ctClassesList[0];
              const cName = activeCt?.className || activeCt?.name || "";
              const sName = activeCt?.section || "";
              const classStudents = teacherAllStudents.filter((s: any) =>
                (!cName || s.className === cName) &&
                (!sName || s.section === sName)
              );
              const totalStudents = classStudents.length;
              const boys = classStudents.filter((s: any) => {
                const g = String(s.gender || "").toUpperCase();
                return g === "MALE" || g === "BOY";
              }).length;
              const girls = classStudents.filter((s: any) => {
                const g = String(s.gender || "").toUpperCase();
                return g === "FEMALE" || g === "GIRL";
              }).length;
              const presentToday = classAttendanceMap[`${cName}|${sName}`] || 0;

              return (
                <View style={styles.adminStatsSection}>
                  <View style={styles.adminStatsHeader}>
                    <Text style={styles.adminStatsTitle}>
                      {cName ? `Class ${cName}${sName ? `-${sName}` : ""} Overview` : "Class Overview"}
                    </Text>
                    <Text style={styles.adminStatsSub}>Class students & attendance summary</Text>
                  </View>

                  {/* Multi-class Tabs for Class Teacher */}
                  {ctClassesList.length > 1 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                      {ctClassesList.map((c: any, i: number) => {
                        const on = i === selectedTeacherCtIdx;
                        const cn = c.className || c.name || "";
                        const sec = c.section || "";
                        const count = teacherAllStudents.filter(
                          (s: any) => (!cn || s.className === cn) && (!sec || s.section === sec)
                        ).length;
                        const label = `${cn}${sec ? `-${sec}` : ""}`;
                        return (
                          <Pressable
                            key={i}
                            onPress={() => setSelectedTeacherCtIdx(i)}
                            style={[
                              styles.aChip,
                              on && { backgroundColor: color, borderColor: color },
                              { marginRight: 8, flexDirection: "row", alignItems: "center", gap: 6 },
                            ]}
                          >
                            <Text style={[styles.aChipText, on && { color: "#fff" }]}>
                              {label}
                            </Text>
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 1.5,
                                borderRadius: 8,
                                backgroundColor: on ? "rgba(255,255,255,0.25)" : "#E2E8F0",
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "800",
                                  color: on ? "#fff" : "#475569",
                                }}
                              >
                                {count}
                              </Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )}

                  <View style={styles.adminGrid}>
                    {/* Total Students */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.adminStatCard,
                        { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD", opacity: pressed ? 0.9 : 1 },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/students",
                          params: { className: cName, section: sName, _t: String(Date.now()) },
                        })
                      }
                    >
                      <View style={[styles.statShape, { backgroundColor: "#0EA5E918" }]} />
                      <View style={[styles.statIconBox, { backgroundColor: "#0EA5E922" }]}>
                        <Ionicons name="school" size={20} color="#0EA5E9" />
                      </View>
                      <Text style={[styles.adminStatNumber, { color: "#0284C7" }]}>
                        {totalStudents}
                      </Text>
                      <View style={styles.statLabelRow}>
                        <Text style={styles.adminStatLabel}>Class Students</Text>
                        <Ionicons name="arrow-forward-circle" size={14} color="#0EA5E9" />
                      </View>
                    </Pressable>

                    {/* Today Present */}
                    <Pressable
                      style={({ pressed }) => [
                        styles.adminStatCard,
                        { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", opacity: pressed ? 0.9 : 1 },
                      ]}
                      onPress={() => router.push("/(app)/attendance")}
                    >
                      <View style={[styles.statShape, { backgroundColor: "#16A34A18" }]} />
                      <View style={[styles.statIconBox, { backgroundColor: "#16A34A22" }]}>
                        <Ionicons name="checkmark-done-circle" size={20} color="#16A34A" />
                      </View>
                      <Text style={[styles.adminStatNumber, { color: "#15803D" }]}>
                        {presentToday}
                      </Text>
                      <View style={styles.statLabelRow}>
                        <Text style={styles.adminStatLabel}>Today Present</Text>
                        <Ionicons name="arrow-forward-circle" size={14} color="#16A34A" />
                      </View>
                    </Pressable>

                    {/* Boys Count */}
                    <View
                      style={[
                        styles.adminStatCard,
                        { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" },
                      ]}
                    >
                      <View style={[styles.statShape, { backgroundColor: "#6366F118" }]} />
                      <View style={[styles.statIconBox, { backgroundColor: "#6366F122" }]}>
                        <Ionicons name="person" size={20} color="#6366F1" />
                      </View>
                      <Text style={[styles.adminStatNumber, { color: "#4F46E5" }]}>
                        {boys}
                      </Text>
                      <View style={styles.statLabelRow}>
                        <Text style={styles.adminStatLabel}>Boys</Text>
                        <Text style={styles.statSubTag}>Count</Text>
                      </View>
                    </View>

                    {/* Girls Count */}
                    <View
                      style={[
                        styles.adminStatCard,
                        { backgroundColor: "#FDF2F8", borderColor: "#FBCFE8" },
                      ]}
                    >
                      <View style={[styles.statShape, { backgroundColor: "#EC489918" }]} />
                      <View style={[styles.statIconBox, { backgroundColor: "#EC489922" }]}>
                        <Ionicons name="person" size={20} color="#EC4899" />
                      </View>
                      <Text style={[styles.adminStatNumber, { color: "#DB2777" }]}>
                        {girls}
                      </Text>
                      <View style={styles.statLabelRow}>
                        <Text style={styles.adminStatLabel}>Girls</Text>
                        <Text style={styles.statSubTag}>Count</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })()}

            {teacherClasses.length > 0 && (
              <>
                <Text style={styles.section}>My classes</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingRight: spacing.md }}
                  style={{ marginBottom: 8 }}
                >
                  {teacherClasses.map((c: any, i: number) => (
                    <Pressable
                      key={i}
                      onPress={() =>
                        router.push({
                          pathname: "/(app)/students",
                          params: {
                            className: c.className || c.name || "",
                            section: c.section || "",
                            _t: String(Date.now()),
                          },
                        })
                      }
                      style={styles.classPanel}
                    >
                      <View style={[styles.classDot, { backgroundColor: color }]}>
                        <Ionicons name="school" size={20} color="#fff" />
                      </View>
                      <Text style={styles.classTitle} numberOfLines={1}>
                        {c.className}{c.section ? `-${c.section}` : ""}
                      </Text>
                      <Text style={styles.classSub}>
                        {c.role === "CLASS_TEACHER"
                          ? "Class teacher"
                          : (c.subjectName || c.subject)
                          ? `Subject teacher (${c.subjectName || c.subject})`
                          : c.role === "SUBJECT_TEACHER"
                          ? "Subject teacher"
                          : c.role || "Subject teacher"}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </>
            )}
          </View>
        )}




        
        {(user?.role === "PRINCIPAL" || user?.role === "ADMIN") && (
          <View style={styles.analyticsCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={styles.analyticsTitle}>Today's Analytics</Text>
              <Pressable onPress={() => router.push("/(app)/analytics")}>
                <Text style={{ color, fontWeight: "800", fontSize: 13 }}>See all →</Text>
              </Pressable>
            </View>
            <Text style={styles.analyticsSub}>Today's student attendance destribution</Text>

            {analytics && (
              <>
                <View style={styles.aStats}>
                  <View style={styles.aStat}>
                    <Text style={[styles.aStatNum, { color }]}>
                      {analytics.percentage ?? 0}%
                    </Text>
                    <Text style={styles.aStatLbl}>Rate</Text>
                  </View>
                  <View style={styles.aStat}>
                    <Text style={[styles.aStatNum, { color: Colors.success }]}>
                      {analytics.present ?? 0}
                    </Text>
                    <Text style={styles.aStatLbl}>Present</Text>
                  </View>
                  <View style={styles.aStat}>
                    <Text style={[styles.aStatNum, { color: Colors.danger }]}>
                      {analytics.absent ?? 0}
                    </Text>
                    <Text style={styles.aStatLbl}>Absent</Text>
                  </View>
                </View>
                {/* Simple bar chart */}
                <View style={styles.chart}>
                  {[
                    { label: "Present", v: Number(analytics.present || 0), c: Colors.success },
                    { label: "Absent", v: Number(analytics.absent || 0), c: Colors.danger },
                    { label: "Late", v: Number(analytics.late || 0), c: Colors.warning },
                    { label: "Unmarked", v: Number(analytics.unmarkedStudents || analytics.unmarked || 0), c: "#94A3B8" },
                  ].map((b) => {
                    const max = Math.max(
                      Number(analytics.present || 0),
                      Number(analytics.absent || 0),
                      Number(analytics.late || 0),
                      Number(analytics.unmarkedStudents || analytics.unmarked || 0),
                      1
                    );
                    const h = Math.max(8, Math.round((b.v / max) * 100));
                    return (
                      <View key={b.label} style={styles.barCol}>
                        <Text style={styles.barVal}>{b.v}</Text>
                        <View style={[styles.barTrack]}>
                          <View style={[styles.barFill, { height: h, backgroundColor: b.c }]} />
                        </View>
                        <Text style={styles.barLbl}>{b.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {user?.role === "PRINCIPAL" && (
          <View style={styles.topStudentsSection}>
            <View style={styles.topStudentsHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="trophy" size={18} color="#D97706" />
                  <Text style={styles.topStudentsTitle}>Top Students (by class)</Text>
                </View>
                <Text style={styles.topStudentsSub}>
                  1st Rank top performers across classes (ordered 12 A, 12 B, 11 A ... Pre-KG A)
                </Text>
              </View>
              <Pressable
                onPress={() => router.push("/(app)/top-students" as any)}
                style={({ pressed }) => [
                  styles.viewAllBtn,
                  { opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.viewAllText, { color }]}>
                  View all ({top1stRankers.length}) →
                </Text>
              </Pressable>
            </View>

            {top1stRankers.length === 0 ? (
              <View style={styles.topStudentsEmpty}>
                <View style={styles.trophyCircle}>
                  <Ionicons name="ribbon-outline" size={24} color="#D97706" />
                </View>
                <Text style={styles.topStudentsEmptyTitle}>No exam marks published yet</Text>
                <Text style={styles.topStudentsEmptySub}>
                  Class ranks will appear here once teachers record and publish exam marks.
                </Text>
              </View>
            ) : (
              <View style={styles.topStudentsGrid}>
                {top1stRankers.slice(0, 12).map((s: any, idx: number) => {
                  const studentPhoto = s.photoUrl || s.avatar || s.photo || s.image || null;

                  return (
                    <Pressable
                      key={s.id || idx}
                      style={({ pressed }) => [
                        styles.topStudentCard,
                        { opacity: pressed ? 0.92 : 1 },
                      ]}
                      onPress={() => {
                        router.push({
                          pathname: "/(app)/students",
                          params: { highlight: s.id },
                        });
                      }}
                    >
                      {/* Top Golden Accent Bar */}
                      <View style={styles.topStudentAccent} />

                      {/* Header: Class Badge & Trophy */}
                      <View style={styles.topStudentCardHeader}>
                        <View style={styles.topStudentClassBadge}>
                          <Ionicons name="school-outline" size={11} color="#4F46E5" />
                          <Text style={styles.topStudentClassText} numberOfLines={1}>
                            Class {s.classLabel}
                          </Text>
                        </View>
                        <View style={styles.topStudentTrophyIcon}>
                          <Ionicons name="trophy" size={12} color="#D97706" />
                        </View>
                      </View>

                      {/* 90% Width 1:1 Aspect Ratio Student Profile */}
                      <View style={styles.topStudentPhotoContainer}>
                        <View style={styles.topStudentPhotoFrame}>
                          <TopRankerPhoto
                            photoUrl={studentPhoto}
                            name={s.firstName}
                            apiBase={apiBase || getApiBaseSync()}
                          />
                        </View>
                      </View>

                      {/* Student Name & Roll */}
                      <View style={styles.topStudentInfo}>
                        <Text style={styles.topStudentName} numberOfLines={1}>
                          {s.firstName} {s.lastName || ""}
                        </Text>
                        {(s.rollNumber || s.rollNo) ? (
                          <Text style={styles.topStudentRoll} numberOfLines={1}>
                            Roll: <Text style={{ fontWeight: "700" }}>{s.rollNumber || s.rollNo}</Text>
                          </Text>
                        ) : null}
                      </View>

                      {/* Marks & Percentage Box */}
                      <View style={styles.topStudentScoreBox}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.scoreLabel}>MARKS</Text>
                          <Text style={styles.scoreValue} numberOfLines={1}>
                            {s.totalMarks}
                            <Text style={styles.scoreMax}>/{s.maxMarks}</Text>
                          </Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.scoreLabel}>PCT</Text>
                          <Text style={styles.scorePct}>{s.percentage}%</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {(user?.role === "STUDENT" || user?.role === "PARENT") && (
          <View style={styles.studentSection}>
            {/* Multi-child Tabs for Parent (ONLY if parentKids.length > 1) */}
            {user?.role === "PARENT" && parentKids.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {parentKids.map((c, i) => {
                  const on = i === selectedParentKidIdx;
                  const kidBadge = badges.childBadges?.[c.id]?.total || 0;
                  return (
                    <Pressable
                      key={c.id || i}
                      onPress={() => {
                        if (i === selectedParentKidIdx) return;
                        setSelectedParentKidIdx(i);
                        selectedParentKidIdxRef.current = i;
                        fetchKidData(c);
                      }}
                      style={[
                        {
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 20,
                          borderWidth: 1.5,
                          borderColor: on ? color : Colors.border,
                          backgroundColor: on ? color : "#ffffff",
                          marginRight: 8,
                        },
                      ]}
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

            {/* 1. Attendance Cards */}
            <View style={styles.studentSectionHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="calendar" size={18} color={color} />
                <Text style={styles.studentSectionTitle}>Attendance Summary</Text>
              </View>
              <Pressable onPress={() => router.push("/(app)/attendance")}>
                <Text style={{ color, fontWeight: "800", fontSize: 13 }}>See all →</Text>
              </Pressable>
            </View>

            {kidDataLoading ? (
              <View style={styles.sectionLoadingBox}>
                <ActivityIndicator size="small" color={color} />
                <Text style={styles.sectionLoadingText}>Loading attendance data…</Text>
              </View>
            ) : (
              <View style={styles.studentAttGrid}>
                {/* 1. Total Present Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.studentAttCard,
                    { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0", opacity: pressed ? 0.9 : 1 },
                  ]}
                  onPress={() => router.push("/(app)/attendance")}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={[styles.studentAttCardLabel, { color: "#166534" }]}>Total Present</Text>
                    <View style={[styles.studentIconBox, { backgroundColor: "#DCFCE7" }]}>
                      <Ionicons name="checkmark-circle" size={17} color="#16A34A" />
                    </View>
                  </View>
                  <Text style={[styles.studentAttNumber, { color: "#15803D" }]}>
                    {studentAttendance.present}
                  </Text>
                  <View style={styles.studentAttMetaRow}>
                    <Text style={styles.studentAttSub}>Days attended</Text>
                    <Ionicons name="chevron-forward" size={13} color="#16A34A" />
                  </View>
                </Pressable>

                {/* 2. Total Absent Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.studentAttCard,
                    { backgroundColor: "#FEF2F2", borderColor: "#FECACA", opacity: pressed ? 0.9 : 1 },
                  ]}
                  onPress={() => router.push("/(app)/attendance")}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={[styles.studentAttCardLabel, { color: "#991B1B" }]}>Total Absent</Text>
                    <View style={[styles.studentIconBox, { backgroundColor: "#FEE2E2" }]}>
                      <Ionicons name="close-circle" size={17} color="#DC2626" />
                    </View>
                  </View>
                  <Text style={[styles.studentAttNumber, { color: "#B91C1C" }]}>
                    {studentAttendance.absent}
                  </Text>
                  <View style={styles.studentAttMetaRow}>
                    <Text style={styles.studentAttSub}>Days absent</Text>
                    <Ionicons name="chevron-forward" size={13} color="#DC2626" />
                  </View>
                </Pressable>

                {/* 3. Total Late Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.studentAttCard,
                    { backgroundColor: "#FFFBEB", borderColor: "#FDE68A", opacity: pressed ? 0.9 : 1 },
                  ]}
                  onPress={() => router.push("/(app)/attendance")}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={[styles.studentAttCardLabel, { color: "#92400E" }]}>Total Late</Text>
                    <View style={[styles.studentIconBox, { backgroundColor: "#FEF3C7" }]}>
                      <Ionicons name="time" size={17} color="#D97706" />
                    </View>
                  </View>
                  <Text style={[styles.studentAttNumber, { color: "#B45309" }]}>
                    {studentAttendance.late}
                  </Text>
                  <View style={styles.studentAttMetaRow}>
                    <Text style={styles.studentAttSub}>Late arrivals</Text>
                    <Ionicons name="chevron-forward" size={13} color="#D97706" />
                  </View>
                </Pressable>

                {/* 4. Today's Status Card */}
                <Pressable
                  style={({ pressed }) => [
                    styles.studentAttCard,
                    { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE", opacity: pressed ? 0.9 : 1 },
                  ]}
                  onPress={() => router.push("/(app)/attendance")}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={[styles.studentAttCardLabel, { color: "#3730A3" }]}>Today's Status</Text>
                    <View style={[styles.studentIconBox, { backgroundColor: "#E0E7FF" }]}>
                      <Ionicons name="calendar" size={17} color="#4F46E5" />
                    </View>
                  </View>
                  <View style={{ minHeight: 28, justifyContent: "center" }}>
                    {studentAttendance.todayStatus === "PRESENT" ? (
                      <View style={styles.todayPillGreen}>
                        <Text style={styles.todayPillGreenText}>✓ Present Today</Text>
                      </View>
                    ) : studentAttendance.todayStatus === "LATE" ? (
                      <View style={styles.todayPillAmber}>
                        <Text style={styles.todayPillAmberText}>⏰ Late Today</Text>
                      </View>
                    ) : studentAttendance.todayStatus === "ABSENT" ? (
                      <View style={styles.todayPillRed}>
                        <Text style={styles.todayPillRedText}>✕ Absent Today</Text>
                      </View>
                    ) : (
                      <View style={styles.todayPillNeutral}>
                        <Text style={styles.todayPillNeutralText}>Not Marked</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.studentAttMetaRow}>
                    <Text style={styles.studentAttSub}>Total {studentAttendance.total} days</Text>
                    <Ionicons name="chevron-forward" size={13} color="#4F46E5" />
                  </View>
                </Pressable>
              </View>
            )}

            {/* 2. Recent Homework */}
            <View style={[styles.studentSectionHeader, { marginTop: 22 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="book" size={18} color="#D97706" />
                <Text style={styles.studentSectionTitle}>Recent Homework</Text>
              </View>
              <Pressable onPress={() => router.push("/(app)/homework")}>
                <Text style={{ color, fontWeight: "800", fontSize: 13 }}>See all →</Text>
              </Pressable>
            </View>

            {kidDataLoading ? (
              <View style={styles.sectionLoadingBox}>
                <ActivityIndicator size="small" color={color} />
                <Text style={styles.sectionLoadingText}>Loading recent homework…</Text>
              </View>
            ) : studentHomework.length === 0 ? (
              <View style={styles.studentEmptyCard}>
                <Ionicons name="book-outline" size={24} color="#94A3B8" />
                <Text style={styles.studentEmptyText}>No homework assigned yet</Text>
              </View>
            ) : (
              <View style={{ gap: 10, marginTop: 8 }}>
                {studentHomework.map((h, i) => (
                  <Pressable
                    key={h.id || i}
                    style={({ pressed }) => [
                      styles.studentHwCard,
                      { opacity: pressed ? 0.9 : 1 },
                    ]}
                    onPress={() => router.push("/(app)/homework")}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <View style={styles.studentSubjectBadge}>
                          <Text style={styles.studentSubjectBadgeText}>{toTitleCase(h.subject || "General")}</Text>
                        </View>
                        {h.dayBadge ? (
                          <View style={h.dayBadge === "Today" ? styles.todayBadgeGreen : styles.yesterdayBadgeBlue}>
                            <Text style={h.dayBadge === "Today" ? styles.todayBadgeGreenText : styles.yesterdayBadgeBlueText}>
                              {h.dayBadge}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.studentDateText}>
                        {h.createdAt ? formatDateDDMMYYYY(h.createdAt) : ""}
                      </Text>
                    </View>
                    <Text style={styles.studentHwTitle} numberOfLines={1}>
                      {toTitleCase(h.title)}
                    </Text>
                    {h.description ? (
                      <Text style={styles.studentHwDesc} numberOfLines={2}>
                        {h.description}
                      </Text>
                    ) : null}
                    {(h.attachments?.length > 0 || h.attachmentUrl) ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 }}>
                        <Ionicons name="attach" size={13} color={color} />
                        <Text style={{ fontSize: 11, fontWeight: "700", color }}>
                          {Array.isArray(h.attachments) && h.attachments.length > 1
                            ? `${h.attachments.length} Attachments`
                            : "Attachment included"}
                        </Text>
                      </View>
                    ) : null}
                    <View style={styles.cardBottomNavRow}>
                      <Text style={[styles.cardNavText, { color }]}>View task details</Text>
                      <Ionicons name="arrow-forward" size={12} color={color} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* 3. Recent Marks & Exams */}
            <View style={[styles.studentSectionHeader, { marginTop: 22 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="medal" size={18} color="#7C3AED" />
                <Text style={styles.studentSectionTitle}>Recent Marks &amp; Exams</Text>
              </View>
              <Pressable onPress={() => router.push("/(app)/marks")}>
                <Text style={{ color, fontWeight: "800", fontSize: 13 }}>See all →</Text>
              </Pressable>
            </View>

            {kidDataLoading ? (
              <View style={styles.sectionLoadingBox}>
                <ActivityIndicator size="small" color={color} />
                <Text style={styles.sectionLoadingText}>Loading marks & exams…</Text>
              </View>
            ) : studentExams.length === 0 ? (
              <View style={styles.studentEmptyCard}>
                <Ionicons name="medal-outline" size={24} color="#94A3B8" />
                <Text style={styles.studentEmptyText}>No marks or exams published yet</Text>
              </View>
            ) : (
              <View style={{ gap: 10, marginTop: 8 }}>
                {studentExams.map((ex, i) => (
                  <Pressable
                    key={ex.id || i}
                    style={({ pressed }) => [
                      styles.studentExamCard,
                      { opacity: pressed ? 0.9 : 1 },
                    ]}
                    onPress={() => router.push("/(app)/marks")}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={ex.type === "EXAM" ? styles.examTypePill : styles.testTypePill}>
                          <Text style={ex.type === "EXAM" ? styles.examTypePillText : styles.testTypePillText}>
                            {ex.type}
                          </Text>
                        </View>
                        <Text style={styles.studentExamSubject}>{toTitleCase(ex.subject)}</Text>
                      </View>
                      {ex.date ? (
                        <Text style={styles.studentDateText}>
                          {formatDateDDMMYYYY(ex.date)}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                      <Text style={styles.studentExamTitle} numberOfLines={1}>
                        {toTitleCase(ex.title)}
                      </Text>
                      {ex.marksVal != null ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={styles.studentScoreText}>
                            {ex.marksVal}
                            <Text style={styles.studentScoreMax}>/{ex.maxM}</Text>
                          </Text>
                          {ex.grade ? (
                            <View style={styles.studentGradeBadge}>
                              <Text style={styles.studentGradeBadgeText}>{ex.grade}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        <View style={styles.pendingBadge}>
                          <Text style={styles.pendingBadgeText}>Pending</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.cardBottomNavRow}>
                      <Text style={[styles.cardNavText, { color }]}>View marksheet</Text>
                      <Ionicons name="arrow-forward" size={12} color={color} />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}

        {cards.length > 0 && (
          <>
            <Text style={styles.section}>Quick access</Text>
            <View style={styles.grid}>
              {cards.map((c) => (
                <Pressable
                  key={c.key}
                  style={({ pressed }) => [
                    styles.card,
                    { opacity: pressed ? 0.85 : 1, borderColor: c.color + "33" },
                  ]}
                  onPress={() => router.push(c.href as any)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: c.color + "18" }]}>
                    <Ionicons name={c.icon} size={22} color={c.color} />
                    {!!c.badge && c.badge > 0 && (
                      <View style={styles.cardBadge}>
                        <Text style={styles.cardBadgeText}>{c.badge}</Text>
                      </View>
                    )}
                  </View>
                  {c.value != null && c.value !== "—" && (
                    <Text style={[styles.cardValue, { color: c.color }]}>{str(c.value)}</Text>
                  )}
                  <Text style={styles.cardLabel}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </Animated.View>
    </ScrollView>
  );
}

function buildCards(
  role: string | undefined,
  stats: Record<string, any>,
  badges: { notifications: number; homework: number; announcements: number; marks: number },
  color: string,
  teacherStudentCount: number | null = null,
  classesCount: number | null = null
): DashCard[] {
  const s = (k: string) => numish(stats[k] ?? stats[k.toLowerCase()]);

  if (role === "ADMIN") {
    return [
      {
        key: "classes",
        label: "Classes",
        icon: "layers",
        href: "/(app)/classes",
        color: "#6366F1",
        value: s("totalClasses") ?? s("classes") ?? (classesCount != null ? classesCount : undefined),
      },
      {
        key: "news",
        label: "Notices",
        icon: "megaphone",
        href: "/(app)/announcements",
        color: "#3B82F6",
        value: badges.announcements,
      },
    ];
  }

  if (role === "PRINCIPAL") {
    return [
      {
        key: "classes",
        label: "Classes",
        icon: "layers",
        href: "/(app)/classes",
        color: "#6366F1",
        value: s("totalClasses") ?? s("classes") ?? (classesCount != null ? classesCount : undefined),
      },
      {
        key: "news",
        label: "Notices",
        icon: "megaphone",
        href: "/(app)/announcements",
        color: "#3B82F6",
        value: badges.announcements,
      },
    ];
  }

  if (role === "TEACHER") {
    return [
      {
        key: "students",
        label: "Students",
        icon: "people",
        href: "/(app)/students",
        color: "#6366F1",
        value: teacherStudentCount != null ? teacherStudentCount : (s("totalStudents") ?? s("students")),
      },
    ];
  }

  if (role === "STUDENT" || role === "PARENT") {
    return [];
  }

  const base: DashCard[] = [
    {
      key: "hw",
      label: "Homework",
      icon: "book",
      href: "/(app)/homework",
      color: "#F59E0B",
      value: s("homework") ?? s("homeworks") ?? badges.homework,
    },
    {
      key: "att",
      label: "Attendance",
      icon: "calendar",
      href: "/(app)/attendance",
      color: "#10B981",
      value: s("attendance") ?? s("presentToday"),
    },
    {
      key: "marks",
      label: "Marks & Exams",
      icon: "school",
      href: "/(app)/marks",
      color: "#8B5CF6",
      value: s("exams") ?? badges.marks,
    },
    {
      key: "news",
      label: "Notices",
      icon: "megaphone",
      href: "/(app)/announcements",
      color: "#6366F1",
      value: badges.announcements,
    },
  ];

  return base;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  hero: {
    borderRadius: 24,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.12)",
    right: -25,
    top: -30,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  photo: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.65)",
    backgroundColor: "#fff",
  },
  photoPh: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoLetter: { color: "#fff", fontSize: 26, fontWeight: "800" },
  heroTextCol: {
    flex: 1,
    justifyContent: "center",
  },
  hello: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  sub: {
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
  },
  heroRolePill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.24)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  heroRolePillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  heroParentPill: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
    maxWidth: 180,
  },
  heroParentPillText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  section: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginBottom: 12,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47%",
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    position: "relative",
  },
  cardBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: "#EF4444",
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  cardBadgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  cardValue: { fontSize: 20, fontWeight: "800" },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  childPhoto: { width: 56, height: 56, borderRadius: 18 },
  childPh: { backgroundColor: "#EEF2FF", alignItems: "center", justifyContent: "center" },
  childTitle: { fontWeight: "800", fontSize: 16, color: Colors.text },
  childMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  childLink: { fontSize: 12, fontWeight: "700", marginTop: 6 },
  teacherPanel: { marginBottom: 8 },
  checkPanel: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  checkLeft: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  checkBubble: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  checkTitle: { fontSize: 15, fontWeight: "700", color: Colors.text },
  checkHint: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  checkCta: {
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  checkCtaText: { color: "#fff", fontWeight: "800", fontSize: 14 },
  classPanel: {
    width: 140,
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  classDot: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  classTitle: { fontWeight: "800", fontSize: 14, color: Colors.text },
  classSub: { fontSize: 11, color: Colors.textMuted, marginTop: 3 },
  analyticsCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  analyticsTitle: { fontSize: 17, fontWeight: "800", color: Colors.text },
  analyticsSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2, marginBottom: 10 },
  aRow: { flexDirection: "row", gap: 12, marginBottom: 4 },
  aLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: "600" },
  aValue: { fontSize: 14, fontWeight: "700", color: Colors.text, marginTop: 2 },
  aChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 8,
    backgroundColor: "#F8FAFC",
  },
  aChipText: { fontWeight: "700", fontSize: 12, color: Colors.text },
  aRefresh: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  aStats: { flexDirection: "row", gap: 8, marginBottom: 12 },
  aStat: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  aStatNum: { fontSize: 18, fontWeight: "800" },
  aStatLbl: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    height: 140,
    paddingTop: 8,
  },
  barCol: { alignItems: "center", flex: 1 },
  barVal: { fontSize: 11, fontWeight: "700", color: Colors.textMuted, marginBottom: 4 },
  barTrack: {
    width: 28,
    height: 100,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 8 },
  barLbl: { fontSize: 10, color: Colors.textMuted, marginTop: 6, fontWeight: "600" },
  cardLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 2, fontWeight: "600" },
  adminStatsSection: {
    marginBottom: 18,
  },
  adminStatsHeader: {
    marginBottom: 10,
  },
  adminStatsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  adminStatsSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  adminGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  adminStatCard: {
    width: "48%",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statShape: {
    position: "absolute",
    right: -14,
    top: -14,
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  adminStatNumber: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  statLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  adminStatLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  statSubTag: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  studentSection: {
    marginBottom: 20,
  },
  studentSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  studentSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  studentAttGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
    marginTop: 4,
  },
  studentAttCard: {
    width: "48.5%",
    borderRadius: 20,
    padding: 13,
    borderWidth: 1.5,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  studentAttCardLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  studentIconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  todayPillGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayPillGreenText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
  },
  todayPillAmber: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayPillAmberText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#92400E",
  },
  todayPillRed: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayPillRedText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#991B1B",
  },
  todayPillNeutral: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayPillNeutralText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  studentAttNumber: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  lateBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  lateBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
  },
  studentAttMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  studentAttSub: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  studentHwCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  studentSubjectBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  studentSubjectBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E",
  },
  todayBadgeGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  todayBadgeGreenText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#166534",
  },
  yesterdayBadgeBlue: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  yesterdayBadgeBlueText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#1E40AF",
  },
  studentDateText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: "monospace",
  },
  studentHwTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 4,
  },
  studentHwDesc: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 3,
    lineHeight: 16,
  },
  studentExamCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  examTypePill: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  examTypePillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#7E22CE",
  },
  testTypePill: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  testTypePillText: {
    fontSize: 10,
    fontWeight: "900",
    color: "#4338CA",
  },
  studentExamSubject: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  studentExamTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
    flex: 1,
    marginRight: 8,
  },
  studentScoreText: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.text,
  },
  studentScoreMax: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  studentGradeBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  studentGradeBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#166534",
  },
  pendingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
  },
  studentEmptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 6,
    marginTop: 6,
  },
  studentEmptyText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  cardBottomNavRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cardNavText: {
    fontSize: 11,
    fontWeight: "700",
  },
  sectionLoadingBox: {
    backgroundColor: "#fff",
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    gap: 8,
    marginTop: 8,
  },
  sectionLoadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
  },
  topStudentsSection: {
    marginBottom: 20,
  },
  topStudentsHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  topStudentsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  topStudentsSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
    lineHeight: 15,
  },
  viewAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "800",
  },
  topStudentsEmpty: {
    padding: 24,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  trophyCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  topStudentsEmptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  topStudentsEmptySub: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
    marginTop: 2,
    lineHeight: 16,
    maxWidth: 240,
  },
  topStudentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  topStudentCard: {
    width: "48.5%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
    position: "relative",
  },
  topStudentAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3.5,
    backgroundColor: "#F59E0B",
  },
  topStudentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginTop: 2,
  },
  topStudentClassBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    maxWidth: "75%",
  },
  topStudentClassText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#4338CA",
  },
  topStudentTrophyIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  topStudentPhotoContainer: {
    width: "100%",
    alignItems: "center",
    marginVertical: 4,
  },
  topStudentPhotoFrame: {
    width: "90%",
    aspectRatio: 1,
    borderRadius: 16,
    padding: 2,
    backgroundColor: "#F59E0B",
    shadowColor: "#D97706",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  topStudentPhoto: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  topStudentPhotoInitial: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
    backgroundColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
  },
  topStudentInitialText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "900",
  },
  topStudentInfo: {
    alignItems: "center",
    marginTop: 8,
    marginBottom: 6,
  },
  topStudentName: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
    textAlign: "center",
  },
  topStudentRoll: {
    fontSize: 10.5,
    color: Colors.textMuted,
    marginTop: 1,
  },
  topStudentScoreBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    marginTop: 4,
  },
  scoreLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: Colors.textMuted,
    letterSpacing: 0.4,
  },
  scoreValue: {
    fontSize: 11,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 1,
  },
  scoreMax: {
    fontSize: 9,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  scorePct: {
    fontSize: 11,
    fontWeight: "900",
    color: "#16A34A",
    marginTop: 1,
  },
});
