"use client";

import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import PhoneInput from "@/components/forms/PhoneInput";
import ImageCropModal from "@/components/shared/ImageCropModal";
import {
  validateEmail,
  validateName,
  validatePhone,
  validatePastDate,
  validateRequired,
  collectErrors,
  type FieldErrors,
} from "@/lib/validation";

export type EditUserRole = "STUDENT" | "TEACHER" | "PRINCIPAL";

type ClassOption = { id: string; name: string; section: string };

type Props = {
  user: any | null;
  role: EditUserRole;
  theme?: string;
  classes?: ClassOption[];
  open: boolean;
  onClose: () => void;
  onUpdated: (user: any) => void;
  title?: string;
};

const ROLE_LABEL: Record<EditUserRole, string> = {
  PRINCIPAL: "Principal",
  TEACHER: "Teacher",
  STUDENT: "Student",
};

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="mt-1">{children}</div>
      {error ? <p className="text-xs text-red-600 mt-1">{error}</p> : null}
    </div>
  );
}

function inputCls(err?: string) {
  return `w-full px-3 py-2.5 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500 ${
    err ? "border-red-400" : "border-slate-200"
  }`;
}

export default function EditUserForm({
  user,
  role,
  theme = "#6366F1",
  classes = [],
  open,
  onClose,
  onUpdated,
  title,
}: Props) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    dateOfBirth: "",
    className: "||",
    rollNumber: "",
    education: "",
    parentName: "",
    parentEmail: "",
    photoUrl: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phoneCountry, setPhoneCountry] = useState("+91");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const todayStr = new Date().toISOString().slice(0, 10);
  const phoneRequired = true;

  useEffect(() => {
    if (!open || !user) return;
    setForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      phone: user.phone || "",
      gender: user.gender || "",
      dateOfBirth: user.dateOfBirth || "",
      className: user.className ? `${user.className}||${user.section || ""}` : "||",
      rollNumber: user.rollNumber || user.rollNo || "",
      education: user.education || "",
      parentName: user.parentName || "",
      parentEmail: user.parentEmail || "",
      photoUrl: user.photoUrl || "",
    });
    setErrors({});
    setPhoneCountry("+91");
    setSaving(false);
    setUploading(false);
  }, [open, user]);

  if (!open || !user) return null;

  const set = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: "" }));
  };

  const validate = () => {
    const base: Record<string, string> = {
      firstName: validateName(form.firstName, "First name"),
      email: validateEmail(form.email, true),
      phone: validatePhone(form.phone, { required: phoneRequired, countryCode: phoneCountry }),
    };
    if (role === "STUDENT") {
      const classVal = form.className && form.className !== "||" ? form.className : "";
      base.className = validateRequired(classVal, "Class");
      if (form.dateOfBirth) {
        base.dateOfBirth = validatePastDate(form.dateOfBirth, "Date of birth");
      }
      base.parentName = validateName(form.parentName, "Parent name");
      base.parentEmail = validateEmail(form.parentEmail, true);
      if (form.rollNumber && form.rollNumber.trim() && !/^\d+$/.test(form.rollNumber.trim())) {
        base.rollNumber = "Roll number must contain only numbers";
      }
      if (
        form.email &&
        form.parentEmail &&
        form.email.trim().toLowerCase() === form.parentEmail.trim().toLowerCase()
      ) {
        base.parentEmail = "Student email and Parent email cannot be the same";
      }
    }
    const next = collectErrors(base);
    setErrors(next || {});
    return !next;
  };

  const uploadPhoto = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      set("photoUrl", data.url);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    setSaving(true);
    try {
      const [cn, sec] = String(form.className || "").split("||");
      const body: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim() || undefined,
        email: form.email.trim(),
        phone: form.phone || undefined,
        gender: form.gender || undefined,
        photoUrl: form.photoUrl || undefined,
      };
      if (role === "STUDENT") {
        body.dateOfBirth = form.dateOfBirth || undefined;
        body.className = cn;
        body.section = sec || "";
        body.rollNumber = form.rollNumber.trim() || undefined;
        body.rollNo = form.rollNumber.trim() || undefined;
        body.parentName = form.parentName.trim();
        body.parentEmail = form.parentEmail.trim();
      } else if (role === "PRINCIPAL" || role === "TEACHER") {
        body.education = form.education.trim();
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success(`${ROLE_LABEL[role]} updated successfully`);
      onUpdated(data.user || data);
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0 sticky top-0 z-10">
          <h2 className="font-bold text-lg text-slate-900">{title || `Edit ${ROLE_LABEL[role]}`}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 min-h-0">
          <form onSubmit={submit} className="space-y-3.5" noValidate>
          <FormField label="Profile photo (optional)">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full shrink-0 overflow-hidden border">
                {form.photoUrl ? (
                  <img src={form.photoUrl} alt="preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center text-xs text-slate-400 font-medium">
                    Pic
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="text-xs file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer disabled:opacity-50"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setCropFile(f);
                      setCropOpen(true);
                    }
                    e.target.value = "";
                  }}
                />
                {uploading && (
                  <span className="text-xs text-indigo-600 font-medium flex items-center gap-1 shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                  </span>
                )}
              </div>
            </div>
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="First name *" error={errors.firstName}>
              <input
                className={inputCls(errors.firstName)}
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                placeholder="First name"
              />
            </FormField>
            <FormField label="Last name">
              <input
                className={inputCls()}
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                placeholder="Last name"
              />
            </FormField>
          </div>

          {role === "STUDENT" && (
            <FormField label="Roll number (optional)" error={errors.rollNumber}>
              <input
                type="text"
                inputMode="numeric"
                className={inputCls(errors.rollNumber)}
                value={form.rollNumber}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d*$/.test(val)) {
                    set("rollNumber", val);
                  }
                }}
                placeholder="e.g. 101"
              />
            </FormField>
          )}

          <FormField label="Email *" error={errors.email}>
            <input
              type="email"
              className={inputCls(errors.email)}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="Email"
            />
          </FormField>

          <FormField label={phoneRequired ? "Phone *" : "Phone"} error={errors.phone}>
            <PhoneInput
              value={form.phone}
              defaultCountryCode="+91"
              onChange={(full, cc) => {
                set("phone", full);
                if (cc) setPhoneCountry(cc);
              }}
            />
          </FormField>

          {(role === "PRINCIPAL" || role === "TEACHER") && (
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Gender">
                <select className={inputCls()} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">Select</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </FormField>
              <FormField label="Education">
                <input
                  className={inputCls()}
                  placeholder="e.g. B.Ed, M.Sc"
                  value={form.education}
                  onChange={(e) => set("education", e.target.value)}
                />
              </FormField>
            </div>
          )}

          {role === "TEACHER" && (
            <p className="text-xs text-slate-400">Map class / subject later in Classes page</p>
          )}

          {role === "STUDENT" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Date of birth" error={errors.dateOfBirth}>
                  <input
                    type="date"
                    max={todayStr}
                    className={inputCls(errors.dateOfBirth)}
                    value={form.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)}
                  />
                </FormField>
                <FormField label="Gender">
                  <select className={inputCls()} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                    <option value="">Select</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </FormField>
              </div>
              <FormField label="Class & section *" error={errors.className}>
                <select
                  className={inputCls(errors.className)}
                  value={form.className}
                  onChange={(e) => set("className", e.target.value)}
                >
                  <option value="||">Select class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={`${c.name}||${c.section}`}>
                      {c.name}-{c.section}
                    </option>
                  ))}
                </select>
                {classes.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">Create a class first in Classes page</p>
                )}
              </FormField>
              <FormField label="Parent name *" error={errors.parentName}>
                <input
                  className={inputCls(errors.parentName)}
                  value={form.parentName}
                  onChange={(e) => set("parentName", e.target.value)}
                  placeholder="Parent name"
                />
              </FormField>
              <FormField label="Parent email *" error={errors.parentEmail}>
                <input
                  type="email"
                  className={inputCls(errors.parentEmail)}
                  value={form.parentEmail}
                  onChange={(e) => set("parentEmail", e.target.value)}
                  placeholder="Parent email"
                />
              </FormField>
            </>
          )}

          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full py-3 rounded-xl text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-60 transition shadow-sm hover:opacity-95"
            style={{ background: `linear-gradient(135deg, ${theme}, #a855f7)` }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {saving ? "Saving changes..." : `Save Changes`}
          </button>
        </form>
        </div>
      </div>

      <ImageCropModal
        open={cropOpen}
        imageFile={cropFile}
        onClose={() => {
          setCropOpen(false);
          setCropFile(null);
        }}
        onCropComplete={async (croppedFile) => {
          await uploadPhoto(croppedFile);
        }}
        title={`Crop ${ROLE_LABEL[role]} Photo`}
        themeColor={theme}
      />
    </div>
  );
}
