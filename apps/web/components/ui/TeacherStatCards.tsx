"use client";

import { motion } from "framer-motion";
import { Users, UserCheck, UserX, Sparkles } from "lucide-react";

type Props = {
  total: number;
  checkedIn: number;
  notCheckedIn: number;
  theme?: string;
  onFilter?: (f: "all" | "in" | "out") => void;
  activeFilter?: "all" | "in" | "out";
};

export default function TeacherStatCards({
  total,
  checkedIn,
  notCheckedIn,
  theme = "#6366F1",
  onFilter,
  activeFilter = "all",
}: Props) {
  const cards = [
    {
      key: "all" as const,
      label: "Total teachers",
      value: total,
      icon: Users,
      gradient: `linear-gradient(135deg, ${theme} 0%, #8B5CF6 55%, #A855F7 100%)`,
      ring: theme,
      accent: "from-white/25 to-transparent",
    },
    {
      key: "in" as const,
      label: "Checked in today",
      value: checkedIn,
      icon: UserCheck,
      gradient: "linear-gradient(135deg, #047857 0%, #10B981 50%, #34D399 100%)",
      ring: "#10B981",
      accent: "from-white/25 to-transparent",
    },
    {
      key: "out" as const,
      label: "Not checked in",
      value: notCheckedIn,
      icon: UserX,
      gradient: "linear-gradient(135deg, #BE123C 0%, #F43F5E 50%, #FB7185 100%)",
      ring: "#F43F5E",
      accent: "from-white/25 to-transparent",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-5">
      {cards.map((c, i) => {
        const Icon = c.icon;
        const active = activeFilter === c.key;
        const pct =
          total > 0
            ? Math.round(
                ((c.key === "all" ? total : c.key === "in" ? checkedIn : notCheckedIn) /
                  total) *
                  100
              )
            : 0;
        return (
          <motion.button
            key={c.key}
            type="button"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 220, damping: 18 }}
            whileHover={{ y: -3, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onFilter?.(c.key)}
            className={`relative overflow-hidden rounded-2xl p-4 text-left text-white shadow-md border border-white/10 ${
              active ? "ring-2 ring-offset-2 scale-[1.01]" : ""
            }`}
            style={{
              background: c.gradient,
              // @ts-ignore
              "--tw-ring-color": c.ring,
            }}
          >
            <div className="absolute -right-4 -top-6 w-24 h-24 rounded-full bg-white/15 blur-[1px] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10 pointer-events-none" />
            <div className="relative flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/85 mb-0.5">
                  <Sparkles className="w-3 h-3" />
                  {c.label}
                </div>
                <motion.div
                  key={c.value}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-2xl sm:text-3xl font-black tracking-tight drop-shadow-xs"
                >
                  {c.value}
                </motion.div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="h-1.5 w-20 rounded-full bg-white/25 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-white/95"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, pct)}%` }}
                      transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-white/80">
                    {c.key === "all" ? "Staff" : `${pct}%`}
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner shrink-0">
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
