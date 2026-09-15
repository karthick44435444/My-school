"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Search, UserX } from "lucide-react";
import Avatar from "@/components/shared/Avatar";

export interface TeacherOption {
  id: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string | null;
  education?: string | null;
  email?: string | null;
}

interface TeacherSelectProps {
  value: string;
  onChange: (teacherId: string) => void;
  teachers: TeacherOption[];
  placeholder?: string;
  optional?: boolean;
  optionalLabel?: string;
  className?: string;
  disabled?: boolean;
}

export default function TeacherSelect({
  value,
  onChange,
  teachers = [],
  placeholder = "Select teacher",
  optional = false,
  optionalLabel = "No class teacher",
  className = "",
  disabled = false,
}: TeacherSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedTeacher = teachers.find((t) => t.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const filteredTeachers = teachers.filter((t) => {
    const fullName = `${t.firstName || ""} ${t.lastName || ""}`.toLowerCase();
    const edu = (t.education || "").toLowerCase();
    const em = (t.email || "").toLowerCase();
    const q = search.toLowerCase().trim();
    return fullName.includes(q) || edu.includes(q) || em.includes(q);
  });

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Select Field Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full px-3 py-2 rounded-2xl border bg-white mt-1 text-left flex items-center justify-between gap-2 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
          open ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-200 hover:border-slate-300"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "cursor-pointer"}`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedTeacher ? (
            <>
              <Avatar
                name={`${selectedTeacher.firstName} ${selectedTeacher.lastName || ""}`.trim()}
                photoUrl={selectedTeacher.photoUrl}
                size={30}
              />
              <div className="flex items-center gap-1.5 min-w-0 truncate">
                <span className="text-sm font-bold text-slate-900 truncate">
                  {selectedTeacher.firstName} {selectedTeacher.lastName || ""}
                </span>
                {selectedTeacher.education && (
                  <span className="text-xs text-slate-400 font-medium truncate">
                    ({selectedTeacher.education})
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-400">
              <div className="w-7 h-7 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center">
                <UserX className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <span className="text-sm font-medium text-slate-400">{placeholder}</span>
            </div>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            open ? "rotate-180 text-indigo-600" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box if list is long */}
          {teachers.length > 4 && (
            <div className="p-2 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search teacher..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {/* Optional None / Clear Option */}
            {optional && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                  !value
                    ? "bg-indigo-50/80 text-indigo-900 font-bold"
                    : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <UserX className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold">{optionalLabel}</span>
                </div>
                {!value && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
              </button>
            )}

            {filteredTeachers.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                No teachers found
              </div>
            ) : (
              filteredTeachers.map((t) => {
                const isSelected = t.id === value;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChange(t.id);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition ${
                      isSelected
                        ? "bg-indigo-50/90 text-indigo-950 font-bold"
                        : "hover:bg-slate-50 text-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <Avatar
                        name={`${t.firstName} ${t.lastName || ""}`.trim()}
                        photoUrl={t.photoUrl}
                        size={32}
                      />
                      <div className="min-w-0 truncate">
                        <div className="text-xs font-bold truncate">
                          {t.firstName} {t.lastName || ""}
                        </div>
                        {(t.education || t.email) && (
                          <div className="text-[11px] text-slate-400 font-medium truncate">
                            {t.education || t.email}
                          </div>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
