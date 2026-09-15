"use client";

import { useState, useEffect } from "react";
import { X, ArrowRightLeft, Loader2, School } from "lucide-react";

interface ClassOption {
  id?: string;
  name: string;
  section: string;
}

interface BulkChangeClassModalProps {
  open: boolean;
  onClose: () => void;
  classes: ClassOption[];
  selectedCount?: number;
  count?: number;
  onConfirm: (targetClass: string, targetSection: string) => Promise<void>;
  loading?: boolean;
  theme?: string;
}

export default function BulkChangeClassModal({
  open,
  onClose,
  classes = [],
  selectedCount,
  count,
  onConfirm,
  loading = false,
  theme = "#6366F1",
}: BulkChangeClassModalProps) {
  const displayCount = selectedCount ?? count ?? 0;
  const [targetClass, setTargetClass] = useState("");

  useEffect(() => {
    if (open) {
      if (classes.length > 0) {
        setTargetClass(`${classes[0].name}||${classes[0].section || "A"}`);
      } else {
        setTargetClass("");
      }
    }
  }, [open, classes]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClass) return;
    const [cName, cSec] = targetClass.split("||");
    await onConfirm(cName, cSec || "A");
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[70] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
              style={{ backgroundColor: theme }}
            >
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Change Class</h3>
              <p className="text-xs text-slate-500">
                Move <strong>{displayCount}</strong> selected student(s)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Select Destination Class & Section
            </label>
            {classes.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
                No classes available. Please register a class first.
              </p>
            ) : (
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                disabled={loading}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {classes.map((c, i) => (
                  <option key={`${c.name}-${c.section}-${i}`} value={`${c.name}||${c.section || "A"}`}>
                    {c.name} {c.section ? `- Section ${c.section}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !targetClass || classes.length === 0}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: theme }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Moving...
                </>
              ) : (
                "Confirm & Move"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
