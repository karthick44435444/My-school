"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Award, ArrowLeft, Search, Trophy, Sparkles, User, School, Loader2, Medal } from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth } from "@/hooks/useAuth";

export default function PrincipalTopStudentsPage() {
  const { user, loading: authLoading } = useAuth(["PRINCIPAL"]);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedClassTab, setSelectedClassTab] = useState("ALL");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data = await res.json();
        setTopStudents(data.topStudents || data.topStudentsByClass || []);
      }
    } finally {
      setLoading(false);
    }
  };

  // Flatten top 1st rank students (one per class) and other rankers
  const topRankers = useMemo(() => {
    return topStudents
      .map((cls) => {
        const first = cls.students?.[0];
        if (!first) return null;
        return {
          ...first,
          classLabel: cls.classLabel,
          className: cls.className,
          section: cls.section,
          allClassRankers: cls.students,
        };
      })
      .filter(Boolean) as any[];
  }, [topStudents]);

  const filteredRankers = useMemo(() => {
    return topRankers.filter((s) => {
      if (selectedClassTab !== "ALL") {
        const tabKey = `${s.className}||${s.section || ""}`;
        if (selectedClassTab !== tabKey && selectedClassTab !== s.className) return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase().trim();
      const fullName = `${s.firstName || ""} ${s.lastName || ""}`.toLowerCase();
      const roll = (s.rollNumber || s.rollNo || "").toLowerCase();
      const cls = (s.classLabel || "").toLowerCase();
      return fullName.includes(q) || roll.includes(q) || cls.includes(q);
    });
  }, [topRankers, selectedClassTab, search]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen">
        {/* Top Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/principal"
              className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition shadow-2xs flex items-center gap-2 text-xs font-bold"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Back to Home</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Trophy className="w-4 h-4" />
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Top Students by Class
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                1st Rank top performers across all classes in descending order (after marks published)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200/80 px-4 py-2 rounded-2xl">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="text-xs font-bold text-amber-800">
              {topRankers.length} Top Rankers Identified
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[260px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by student name, roll number, or class..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-2xs"
            />
          </div>

          {/* Class Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedClassTab("ALL")}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition shadow-2xs ${
                selectedClassTab === "ALL"
                  ? "text-white shadow-md scale-[1.02]"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
              style={selectedClassTab === "ALL" ? { backgroundColor: theme } : undefined}
            >
              All Classes ({topRankers.length})
            </button>
            {topStudents.map((cls) => {
              const tabKey = `${cls.className}||${cls.section || ""}`;
              const isSelected = selectedClassTab === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setSelectedClassTab(tabKey)}
                  className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition border shadow-2xs ${
                    isSelected
                      ? "text-white border-transparent shadow-md scale-[1.02]"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                  style={isSelected ? { backgroundColor: theme } : undefined}
                >
                  Class {cls.classLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-28 bg-white/60 backdrop-blur-xs rounded-3xl border border-slate-200/80 shadow-xs">
            <div className="w-14 h-14 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-3 shadow-2xs">
              <Loader2 className="w-7 h-7 animate-spin text-amber-600" />
            </div>
            <p className="text-sm font-black text-slate-800 tracking-tight">Calculating Top Rankers...</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Fetching 1st rank positions across all classes</p>
          </div>
        ) : filteredRankers.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center text-slate-400 shadow-xs">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3 border border-amber-100">
              <Award className="w-7 h-7" />
            </div>
            <p className="font-bold text-slate-800 text-base">No top students found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Ranks will automatically calculate once teachers record and publish examination marks for classes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredRankers.map((s, idx) => (
              <Link
                key={s.id || idx}
                href={`/principal/students?highlight=${s.id}`}
                className="block group cursor-pointer"
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04, duration: 0.3 }}
                  whileHover={{ y: -6, transition: { duration: 0.2 } }}
                  className="relative bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs hover:shadow-xl hover:border-amber-300/80 transition-all flex flex-col justify-between overflow-hidden h-full"
                >
                  {/* Decorative Top Accent Gradient */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600" />
                  <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-150 transition-transform duration-500" />

                  <div>
                    {/* Class Badge Header */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-[11px] font-extrabold flex items-center gap-1.5 border border-slate-200/60">
                        <School className="w-3.5 h-3.5 text-indigo-600" />
                        Class {s.classLabel}
                      </span>
                      <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    {/* 90% Width 1:1 Ratio Student Profile Showcase */}
                    <div className="flex flex-col items-center text-center my-2">
                      <div className="w-[90%] aspect-square mx-auto mb-3 rounded-2xl p-1 bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-600 shadow-md group-hover:scale-[1.02] transition-transform duration-300">
                        {s.photoUrl ? (
                          <img
                            src={s.photoUrl}
                            alt=""
                            className="w-full h-full rounded-[14px] object-cover bg-white"
                          />
                        ) : (
                          <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-black text-4xl sm:text-5xl shadow-inner">
                            {(s.firstName?.[0] || "S").toUpperCase()}
                          </div>
                        )}
                      </div>

                      <h3 className="font-bold text-slate-900 text-base leading-tight group-hover:text-indigo-600 transition-colors">
                        {s.firstName} {s.lastName || ""}
                      </h3>
                      {(s.rollNumber || s.rollNo) ? (
                        <span className="text-[11px] font-semibold text-slate-500 mt-0.5">
                          Roll: <strong>{s.rollNumber || s.rollNo}</strong>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Score & Performance Summary Box */}
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="bg-slate-50/90 rounded-2xl p-3 border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Total Marks
                        </div>
                        <div className="text-xs font-black text-slate-800 mt-0.5">
                          {s.totalMarks} <span className="text-[10px] text-slate-400 font-normal">/ {s.maxMarks}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Percentage
                        </div>
                        <div className="text-sm font-black text-emerald-600 flex items-center gap-0.5 justify-end">
                          <span>{s.percentage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
