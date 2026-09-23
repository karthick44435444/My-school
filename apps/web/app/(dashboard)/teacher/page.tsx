"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, ClipboardList, Plus, Loader2, Check, X, Clock, Download,
  School, Sparkles, UserCheck, Heart, Copy, User, Search, Calendar,
  CheckCircle2, XCircle
} from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import Avatar from "@/components/shared/Avatar";
import { useAuth } from "@/hooks/useAuth";
import ExportAttendanceModal from "@/components/attendance/ExportAttendanceModal";
import PhoneInput from "@/components/forms/PhoneInput";
import ImageCropModal from "@/components/shared/ImageCropModal";
import {
  formatPersonName,
  toTitleCase,
  validateEmail,
  validateName,
  validatePhone,
  validateRequired,
  collectErrors,
  type FieldErrors,
} from "@/lib/validation";

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth(["TEACHER"]);
  const [students, setStudents] = useState<any[]>([]);
  const [classTeacherStudents, setClassTeacherStudents] = useState<any[]>([]);
  const [ctLabel, setCtLabel] = useState("");
  const [ctClasses, setCtClasses] = useState<any[]>([]);
  const [selectedCt, setSelectedCt] = useState({ className: "", section: "" });
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [creating, setCreating] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phoneCountry, setPhoneCountry] = useState("+91");
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [savingAtt, setSavingAtt] = useState(false);
  const [attendanceMode, setAttendanceMode] = useState(false);
  const [attSearch, setAttSearch] = useState("");
  const [attendance, setAttendance] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE">>({});
  const [tempAttendance, setTempAttendance] = useState<Record<string, "PRESENT" | "ABSENT" | "LATE">>({});
  const [checkedIn, setCheckedIn] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    loadData().finally(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadData = async () => {
    try {
      const [sRes, ctRes, cRes] = await Promise.all([
        fetch("/api/users/list?role=STUDENT"),
        fetch("/api/users/list?role=STUDENT&attendanceOnly=1"),
        fetch("/api/teacher-classes"),
      ]);
      if (sRes.ok) {
        setStudents((await sRes.json()).users || []);
      }
      let ctStudents: any[] = [];
      if (ctRes.ok) {
        ctStudents = (await ctRes.json()).users || [];
        setClassTeacherStudents(ctStudents);
      }
      let classesList: any[] = [];
      if (cRes.ok) {
        let classes = (await cRes.json()).classes || [];
        if (classes.length === 0 && user?.className) {
          classes = [
            {
              className: user.className,
              section: user.section || "A",
              role: user.teacherType === "CLASS_TEACHER" || !user.teacherType ? "CLASS_TEACHER" : "SUBJECT_TEACHER",
            },
          ];
        }
        setMyClasses(classes);
        classesList = classes.filter((c: any) => c.role === "CLASS_TEACHER");
        setCtClasses(classesList);
        setCtLabel(classesList.map((c: any) => `${c.className}-${c.section || ""}`).join(", "));
        if (classesList[0]) {
          setSelectedCt({ className: classesList[0].className, section: classesList[0].section || "" });
        }
      }

      // Present/Absent/Late counts only for Class Teacher classes
      const map: Record<string, "PRESENT" | "ABSENT" | "LATE"> = {};
      for (const c of classesList) {
        const params = new URLSearchParams({ className: c.className });
        if (c.section) params.set("section", c.section);
        const attRes = await fetch(`/api/attendance/class?${params}`);
        if (attRes.ok) {
          const att = await attRes.json();
          (att.students || []).forEach((s: any) => {
            if (s.status === "PRESENT" || s.status === "ABSENT" || s.status === "LATE") {
              map[s.studentId] = s.status;
            }
          });
        }
      }
      setAttendance(map);

      try {
        const cin = await fetch("/api/attendance/checkin");
        if (cin.ok) {
          const cinData = await cin.json();
          if (cinData.checkedIn) setCheckedIn(true);
        }
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const validateCreate = () => {
    const next = collectErrors({
      firstName: validateName(form.firstName, "First name"),
      phone: validatePhone(form.phone, { required: true, countryCode: phoneCountry }),
      dateOfBirth: validateRequired(form.dateOfBirth, "Date of birth"),
      parentName: validateName(form.parentName, "Parent name"),
      parentEmail: validateEmail(form.parentEmail, true),
      rollNumber: form.rollNumber?.trim() && !/^\d+$/.test(form.rollNumber.trim()) ? "Roll number must contain only numbers" : "",
    });
    setErrors(next || {});
    return !next;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.className) {
      toast.error("Please select a class & section");
      return;
    }
    if (!validateCreate()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    setCreating(true);
    try {
      const { email, ...cleanForm } = form;
      const res = await fetch("/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...cleanForm,
          role: "STUDENT",
          rollNumber: form.rollNumber?.trim() || undefined,
          rollNo: form.rollNumber?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Student created successfully! Login credentials have been sent to the parent's email.");
      setShowCreate(false);
      setForm({});
      setErrors({});
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCheckIn = async () => {
    setCheckingIn(true);
    try {
      const res = await fetch("/api/attendance/checkin", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setCheckedIn(true);
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCheckingIn(false);
    }
  };

  const openTakeAttendance = () => {
    const list = filteredCtStudents.length ? filteredCtStudents : classTeacherStudents.length ? classTeacherStudents : students;
    const initial: Record<string, "PRESENT" | "ABSENT" | "LATE"> = {};
    list.forEach((s) => {
      initial[s.id] = attendance[s.id] || "PRESENT";
    });
    setTempAttendance(initial);
    setAttSearch("");
    setAttendanceMode(true);
  };

  const setStudentTempStatus = (id: string, status: "PRESENT" | "ABSENT" | "LATE") => {
    setTempAttendance((prev) => ({
      ...prev,
      [id]: status,
    }));
  };

  const markAllTemp = (status: "PRESENT" | "ABSENT" | "LATE") => {
    const list = filteredCtStudents.length ? filteredCtStudents : classTeacherStudents.length ? classTeacherStudents : students;
    const map: Record<string, "PRESENT" | "ABSENT" | "LATE"> = {};
    list.forEach((s) => {
      map[s.id] = status;
    });
    setTempAttendance((prev) => ({ ...prev, ...map }));
  };

  const handleExportAttendance = () => {
    setShowExport(true);
  };

  const filteredCtStudents = classTeacherStudents.filter((s) => {
    if (!selectedCt.className) return true;
    const sClass = (s.className || "").trim().toLowerCase();
    const targetClass = (selectedCt.className || "").trim().toLowerCase();
    if (sClass !== targetClass) return false;
    if (selectedCt.section) {
      const sSec = (s.section || "").trim().toLowerCase();
      const targetSec = (selectedCt.section || "").trim().toLowerCase();
      if (sSec !== targetSec) return false;
    }
    return true;
  });

  const saveAttendance = async () => {
    const list = filteredCtStudents.length ? filteredCtStudents : classTeacherStudents.length ? classTeacherStudents : students;
    const records = list.map((s) => ({
      studentId: s.id,
      status: (tempAttendance[s.id] || "PRESENT") as "PRESENT" | "ABSENT" | "LATE",
    }));
    if (records.length === 0) {
      toast.error("No students to mark");
      return;
    }
    if (savingAtt) return;
    setSavingAtt(true);
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      // Update actual dashboard attendance state ONLY after save succeeds
      setAttendance((prev) => {
        const next = { ...prev };
        records.forEach((r) => {
          next[r.studentId] = r.status;
        });
        return next;
      });

      toast.success(data.message || "Attendance saved successfully!");
      setAttendanceMode(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save attendance");
    } finally {
      setSavingAtt(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";
  const isClassTeacher = classTeacherStudents.length > 0 || !!ctLabel || user.teacherType === "CLASS_TEACHER";

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Teacher Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
              {isClassTeacher ? `Class Teacher • ${ctLabel || user.className || "Your Class"}` : "Subject Teacher"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCheckIn}
              disabled={checkedIn || checkingIn}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 border transition cursor-pointer ${
                checkedIn
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Check className="w-4 h-4" /> {checkedIn ? "Checked In" : checkingIn ? "..." : "Check In"}
            </button>
            <button
              onClick={handleExportAttendance}
              className="px-3.5 sm:px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            {isClassTeacher && (
              <button
                onClick={openTakeAttendance}
                className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 shadow-xs transition hover:opacity-95"
                style={{ backgroundColor: theme }}
              >
                <ClipboardList className="w-4 h-4" /> Take Attendance
              </button>
            )}
            {isClassTeacher && (
              <button
                onClick={() => {
                  setShowCreate(true);
                  setForm({
                    className: selectedCt.className || ctClasses[0]?.className || myClasses[0]?.className || "",
                    section: selectedCt.section || ctClasses[0]?.section || myClasses[0]?.section || "A",
                    gender: "MALE",
                  });
                  setErrors({});
                  setPhoneCountry("+91");
                }}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium flex items-center gap-2 hover:bg-slate-50 transition shadow-2xs"
              >
                <Plus className="w-4 h-4" /> Add Student
              </button>
            )}
          </div>
        </div>

        {/* Multi-class Tabs for Class Teacher */}
        {isClassTeacher && ctClasses.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap mb-6">
            <span className="text-xs font-bold text-slate-500 mr-1">Select Class:</span>
            <button
              type="button"
              onClick={() => setSelectedCt({ className: "", section: "" })}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition inline-flex items-center gap-2 ${
                !selectedCt.className
                  ? "text-white border-transparent shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
              style={!selectedCt.className ? { backgroundColor: theme } : undefined}
            >
              <span>All Classes</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                  !selectedCt.className ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                }`}
              >
                {classTeacherStudents.length}
              </span>
            </button>
            {ctClasses.map((c) => {
              const active =
                selectedCt.className.toLowerCase() === c.className.toLowerCase() &&
                (selectedCt.section || "").toLowerCase() === (c.section || "").toLowerCase();
              const label = `${c.className}${c.section ? `-${c.section}` : ""}`;
              const count = classTeacherStudents.filter(
                (s: any) =>
                  (s.className || "").toLowerCase() === c.className.toLowerCase() &&
                  (!c.section || (s.section || "").toLowerCase() === c.section.toLowerCase())
              ).length;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSelectedCt({ className: c.className, section: c.section || "" })}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition inline-flex items-center gap-2 ${
                    active ? "text-white border-transparent shadow-xs" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  style={active ? { backgroundColor: theme } : undefined}
                >
                  <span>{label}</span>
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    active ? "bg-white/25 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Animated & Colorful Count Cards with Background Shapes */}
        {(() => {
          const currentStudents = isClassTeacher
            ? (selectedCt.className ? filteredCtStudents : classTeacherStudents)
            : students;
          const currentTotal = currentStudents.length;
          const currentPresent = currentStudents.filter((s) => attendance[s.id] === "PRESENT").length;
          const currentBoys = currentStudents.filter((s) => {
            const g = String(s.gender || "").toUpperCase();
            return g === "MALE" || g === "BOY";
          }).length;
          const currentGirls = currentStudents.filter((s) => {
            const g = String(s.gender || "").toUpperCase();
            return g === "FEMALE" || g === "GIRL";
          }).length;

          const statCards = [
            {
              label: "Class Students",
              value: currentTotal,
              sub: "Enrolled in class",
              icon: Users,
              textColor: "text-sky-950",
              numberColor: "text-sky-600",
              subColor: "text-sky-600/80",
              iconBg: "bg-sky-500",
              cardBg: "from-sky-500/10 via-sky-500/5 to-white",
              borderColor: "border-sky-200/80",
              shapeBg: "bg-sky-500/10",
            },
            {
              label: "Today Present",
              value: currentPresent,
              sub: "Present today",
              icon: UserCheck,
              textColor: "text-emerald-950",
              numberColor: "text-emerald-600",
              subColor: "text-emerald-600/80",
              iconBg: "bg-emerald-500",
              cardBg: "from-emerald-500/10 via-emerald-500/5 to-white",
              borderColor: "border-emerald-200/80",
              shapeBg: "bg-emerald-500/10",
            },
            {
              label: "Boys",
              value: currentBoys,
              sub: "Male students",
              icon: Users,
              textColor: "text-indigo-950",
              numberColor: "text-indigo-600",
              subColor: "text-indigo-600/80",
              iconBg: "bg-indigo-500",
              cardBg: "from-indigo-500/10 via-indigo-500/5 to-white",
              borderColor: "border-indigo-200/80",
              shapeBg: "bg-indigo-500/10",
            },
            {
              label: "Girls",
              value: currentGirls,
              sub: "Female students",
              icon: Users,
              textColor: "text-pink-950",
              numberColor: "text-pink-600",
              subColor: "text-pink-600/80",
              iconBg: "bg-pink-500",
              cardBg: "from-pink-500/10 via-pink-500/5 to-white",
              borderColor: "border-pink-200/80",
              shapeBg: "bg-pink-500/10",
            },
          ];

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {statCards.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -3, scale: 1.01 }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 350, damping: 25 }}
                  className={`relative overflow-hidden bg-gradient-to-br ${item.cardBg} rounded-3xl p-5 sm:p-6 border ${item.borderColor} shadow-xs`}
                >
                  {/* Decorative Background Geometric Shapes */}
                  <div
                    className={`absolute -right-6 -bottom-6 w-28 h-28 rounded-full ${item.shapeBg} blur-xl pointer-events-none`}
                  />
                  <div
                    className={`absolute top-2 right-12 w-16 h-16 rounded-3xl ${item.shapeBg} rotate-12 pointer-events-none opacity-60`}
                  />

                  <div className="relative z-10 flex items-start justify-between">
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-slate-500 tracking-wide">
                        {item.label}
                      </div>
                      <div className={`text-3xl sm:text-4xl font-black ${item.numberColor} mt-2 tracking-tight`}>
                        {item.value}
                      </div>
                      <div className={`text-[11px] font-semibold ${item.subColor} mt-1`}>
                        {item.sub}
                      </div>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-2xl ${item.iconBg} flex items-center justify-center text-white shadow-md shrink-0`}
                    >
                      <item.icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          );
        })()}

        {/* My Classes Row (Single Row with Horizontal Scroll, same as App) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <School className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-slate-900">My Classes</h2>
                <p className="text-xs text-slate-500">Your assigned classes and teaching subjects</p>
              </div>
            </div>
            <Link
              href="/teacher/students"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline transition"
            >
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="bg-white rounded-3xl p-10 border border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs font-medium">Loading classes...</span>
            </div>
          ) : myClasses.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 text-center text-sm text-slate-400">
              No classes assigned yet.
            </div>
          ) : (
            <div className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scrollbar-thin">
              {myClasses.map((c, i) => {
                const isCT = c.role === "CLASS_TEACHER";
                const classCount = students.filter(
                  (s) =>
                    s.className?.toLowerCase() === c.className?.toLowerCase() &&
                    (!c.section || s.section?.toLowerCase() === c.section?.toLowerCase())
                ).length;

                return (
                  <Link
                    key={i}
                    href="/teacher/students"
                    className="min-w-[240px] sm:min-w-[260px] p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group shrink-0 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                          style={{ backgroundColor: isCT ? theme : "#6366F1" }}
                        >
                          <School className="w-6 h-6" />
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isCT
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {isCT ? "Class Teacher" : "Subject Teacher"}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition truncate">
                          {c.className}{c.section ? ` - ${c.section}` : ""}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5 truncate">
                          {isCT
                            ? "Full class management"
                            : (c.subjectName || c.subject)
                            ? `Subject: ${c.subjectName || c.subject}`
                            : "Subject teacher"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">
                        {classCount} {classCount === 1 ? "Student" : "Students"}
                      </span>
                      <span className="text-indigo-600 font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                        Manage →
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Take Attendance Modal */}
      {attendanceMode && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-xs shrink-0"
                  style={{ backgroundColor: theme }}
                >
                  <ClipboardList className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-base sm:text-lg text-slate-900">Take Attendance</h2>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white shadow-2xs"
                      style={{ backgroundColor: theme }}
                    >
                      {selectedCt.className
                        ? `Class ${selectedCt.className}${selectedCt.section ? `-${selectedCt.section}` : ""}`
                        : ctClasses.length > 0
                        ? `All Classes (${ctClasses.map((c) => `${c.className}-${c.section || ""}`).join(", ")})`
                        : "My Class"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Today · {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttendanceMode(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions & Filters Bar */}
            <div className="px-5 sm:px-6 py-3 bg-slate-50/50 border-b border-slate-100 space-y-3 shrink-0">
              {/* Class Tabs if multiple classes */}
              {ctClasses.length > 1 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Class:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCt({ className: "", section: "" })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      !selectedCt.className
                        ? "text-white border-transparent shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                    style={!selectedCt.className ? { backgroundColor: theme } : undefined}
                  >
                    All Classes ({classTeacherStudents.length})
                  </button>
                  {ctClasses.map((c) => {
                    const active =
                      selectedCt.className.toLowerCase() === c.className.toLowerCase() &&
                      (selectedCt.section || "").toLowerCase() === (c.section || "").toLowerCase();
                    const label = `${c.className}${c.section ? `-${c.section}` : ""}`;
                    const count = classTeacherStudents.filter(
                      (s: any) =>
                        (s.className || "").toLowerCase() === c.className.toLowerCase() &&
                        (!c.section || (s.section || "").toLowerCase() === c.section.toLowerCase())
                    ).length;
                    return (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setSelectedCt({ className: c.className, section: c.section || "" })}
                        className={`px-3 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                          active
                            ? "text-white border-transparent shadow-xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                        style={active ? { backgroundColor: theme } : undefined}
                      >
                        {label} ({count})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Bulk actions & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => markAllTemp("PRESENT")}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllTemp("ABSENT")}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <XCircle className="w-3.5 h-3.5" /> Mark All Absent
                  </button>
                </div>

                {/* Search */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={attSearch}
                    onChange={(e) => setAttSearch(e.target.value)}
                    placeholder="Search by name or roll..."
                    className="w-full pl-8.5 pr-3 py-1.5 rounded-xl text-xs bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                  {attSearch && (
                    <button
                      type="button"
                      onClick={() => setAttSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Live Count Badges */}
              {(() => {
                const currentList = filteredCtStudents.length ? filteredCtStudents : classTeacherStudents.length ? classTeacherStudents : students;
                const pCount = currentList.filter((s) => (tempAttendance[s.id] || "PRESENT") === "PRESENT").length;
                const aCount = currentList.filter((s) => tempAttendance[s.id] === "ABSENT").length;
                const lCount = currentList.filter((s) => tempAttendance[s.id] === "LATE").length;
                return (
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                    <span className="text-slate-500">Summary:</span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold">Total: {currentList.length}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">Present: {pCount}</span>
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold">Absent: {aCount}</span>
                    {lCount > 0 && <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold">Late: {lCount}</span>}
                  </div>
                );
              })()}
            </div>

            {/* Scrollable Students List */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0 divide-y divide-slate-100">
              {(() => {
                const baseList = filteredCtStudents.length ? filteredCtStudents : classTeacherStudents.length ? classTeacherStudents : students;
                const filtered = baseList.filter((s) => {
                  if (!attSearch.trim()) return true;
                  const q = attSearch.toLowerCase();
                  const name = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
                  const roll = String(s.rollNumber || s.rollNo || "").toLowerCase();
                  return name.includes(q) || roll.includes(q);
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-500">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold">No students found</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {attSearch ? "Try adjusting your search filter" : "No enrolled students in this class"}
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {filtered.map((s, idx) => {
                      const st = tempAttendance[s.id] || "PRESENT";
                      return (
                        <div
                          key={s.id || idx}
                          className="flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-2xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              name={`${s.firstName} ${s.lastName || ""}`}
                              photoUrl={s.photoUrl}
                              size={38}
                              className="shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                                {s.firstName} {s.lastName || ""}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                {s.rollNumber || s.rollNo ? (
                                  <span>Roll: <strong className="text-slate-700">{s.rollNumber || s.rollNo}</strong></span>
                                ) : null}
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                                  Class {s.className}{s.section ? `-${s.section}` : ""}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 3 Status Buttons: Present / Absent / Late */}
                          <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 p-1 rounded-xl border border-slate-200/70">
                            <button
                              type="button"
                              onClick={() => setStudentTempStatus(s.id, "PRESENT")}
                              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                st === "PRESENT"
                                  ? "bg-emerald-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-emerald-700 hover:bg-white/80"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Present</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentTempStatus(s.id, "ABSENT")}
                              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                st === "ABSENT"
                                  ? "bg-rose-600 text-white shadow-xs"
                                  : "text-slate-600 hover:text-rose-700 hover:bg-white/80"
                              }`}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Absent</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudentTempStatus(s.id, "LATE")}
                              className={`px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                                st === "LATE"
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "text-slate-600 hover:text-amber-700 hover:bg-white/80"
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>Late</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
              <Link
                href="/teacher/attendance"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                onClick={() => setAttendanceMode(false)}
              >
                Go to Full Attendance Page &rarr;
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAttendanceMode(false)}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-200/70 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveAttendance}
                  disabled={savingAtt}
                  className="px-5 py-2 rounded-xl text-white text-xs sm:text-sm font-bold shadow-xs transition hover:opacity-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                  style={{ backgroundColor: theme }}
                >
                  {savingAtt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Save Attendance</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Student Dialog (Same UI & Validation as My Classes) */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Fixed Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs"
                  style={{ backgroundColor: theme }}
                >
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-slate-900">Add Student</h2>
                  <p className="text-xs text-slate-500">Create new student and parent credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form onSubmit={handleCreate} className="space-y-3.5" noValidate>
                {/* Photo Upload */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Student Photo (optional)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden border border-slate-200">
                      {form.photoUrl ? (
                        <img src={form.photoUrl} alt="preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-medium">
                          Pic
                        </div>
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                          <Loader2 className="w-5 h-5 animate-spin" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        className="text-xs file:mr-2.5 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
                        disabled={uploadingPhoto}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            setCropFile(f);
                            setCropOpen(true);
                          }
                          e.target.value = "";
                        }}
                      />
                      {uploadingPhoto && (
                        <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 shrink-0">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      First Name *
                    </label>
                    <input
                      value={form.firstName || ""}
                      onChange={(e) => {
                        setForm({ ...form, firstName: e.target.value });
                        setErrors((er) => ({ ...er, firstName: "" }));
                      }}
                      placeholder="e.g. John"
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                        errors.firstName ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Last Name
                    </label>
                    <input
                      value={form.lastName || ""}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="e.g. Doe"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Roll Number (optional) - Below Name */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Roll Number (optional)
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.rollNumber || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "" || /^\d*$/.test(val)) {
                        setForm({ ...form, rollNumber: val });
                        setErrors((er) => ({ ...er, rollNumber: "" }));
                      }
                    }}
                    placeholder="e.g. 101"
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                      errors.rollNumber ? "border-red-400" : "border-slate-200"
                    }`}
                  />
                  {errors.rollNumber && <p className="mt-1 text-xs text-red-600">{errors.rollNumber}</p>}
                </div>

                {/* Class & Section */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Class & Section *
                  </label>
                  <select
                    required
                    value={(form.className || "") + "||" + (form.section || "")}
                    onChange={(e) => {
                      const [cn, sec] = e.target.value.split("||");
                      setForm({ ...form, className: cn, section: sec || "A" });
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="||">Select class</option>
                    {(myClasses.length > 0 ? myClasses : ctClasses).map((c: any) => (
                      <option
                        key={(c.id || "") + c.className + (c.section || "")}
                        value={c.className + "||" + (c.section || "")}
                      >
                        {c.className}-{c.section || "A"} {c.role === "CLASS_TEACHER" ? "(Class Teacher)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Phone *
                  </label>
                  <PhoneInput
                    value={form.phone || ""}
                    defaultCountryCode="+91"
                    error={errors.phone}
                    onChange={(full, code) => {
                      setForm({ ...form, phone: full });
                      setPhoneCountry(code);
                      setErrors((er) => ({ ...er, phone: "" }));
                    }}
                  />
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Date of Birth *
                    </label>
                    <input
                      type="date"
                      value={form.dateOfBirth || ""}
                      onChange={(e) => {
                        setForm({ ...form, dateOfBirth: e.target.value });
                        setErrors((er) => ({ ...er, dateOfBirth: "" }));
                      }}
                      className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                        errors.dateOfBirth ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {errors.dateOfBirth && <p className="mt-1 text-xs text-red-600">{errors.dateOfBirth}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                      Gender
                    </label>
                    <select
                      value={form.gender || "MALE"}
                      onChange={(e) => setForm({ ...form, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                </div>

                {/* Parent Name & Parent Email */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Parent Name *
                  </label>
                  <input
                    value={form.parentName || ""}
                    onChange={(e) => {
                      setForm({ ...form, parentName: e.target.value });
                      setErrors((er) => ({ ...er, parentName: "" }));
                    }}
                    placeholder="Parent / Guardian Name"
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                      errors.parentName ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  />
                  {errors.parentName && <p className="mt-1 text-xs text-red-600">{errors.parentName}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Parent Email *
                  </label>
                  <input
                    type="email"
                    value={form.parentEmail || ""}
                    onChange={(e) => {
                      setForm({ ...form, parentEmail: e.target.value });
                      setErrors((er) => ({ ...er, parentEmail: "" }));
                    }}
                    placeholder="parent@school.com"
                    className={`w-full px-3.5 py-2.5 rounded-xl border outline-none text-sm focus:ring-2 focus:ring-indigo-500 ${
                      errors.parentEmail ? "border-red-400 bg-red-50/20" : "border-slate-200"
                    }`}
                  />
                  {errors.parentEmail && <p className="mt-1 text-xs text-red-600">{errors.parentEmail}</p>}
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full py-3 rounded-2xl text-white font-bold text-sm shadow-xs transition hover:opacity-95 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                    style={{ backgroundColor: theme }}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating Student...</span>
                      </>
                    ) : (
                      "Create Student"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}



      {/* Export Attendance Modal */}
      <ExportAttendanceModal
        open={showExport}
        onClose={() => setShowExport(false)}
        theme={theme}
        schoolName={user?.schoolName}
        schoolLogo={user?.schoolLogo}
        classes={(ctClasses.length > 0 ? ctClasses : myClasses).map((c) => ({
          id: `${c.className}-${c.section || ""}`,
          name: c.className,
          section: c.section || "",
        }))}
        defaultClassName={selectedCt.className || ctClasses[0]?.className || myClasses[0]?.className || ""}
        defaultSection={selectedCt.section || ctClasses[0]?.section || myClasses[0]?.section || ""}
        defaultFormat="pdf"
        defaultType="student"
        allowTeacherType={false}
        allowCsv={false}
        showCancel={false}
      />

      <ImageCropModal
        open={cropOpen}
        imageFile={cropFile}
        onClose={() => {
          setCropOpen(false);
          setCropFile(null);
        }}
        onCropComplete={async (croppedFile) => {
          setUploadingPhoto(true);
          try {
            const fd = new FormData();
            fd.append("file", croppedFile);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            const data = await res.json();
            if (res.ok) {
              setForm((prev: any) => ({ ...prev, photoUrl: data.url }));
              toast.success("Photo uploaded");
            } else {
              toast.error(data.error || "Upload failed");
            }
          } catch (err: any) {
            toast.error(err.message || "Upload failed");
          } finally {
            setUploadingPhoto(false);
          }
        }}
        title="Crop Student Photo"
        themeColor={theme}
      />
    </div>
  );
}
