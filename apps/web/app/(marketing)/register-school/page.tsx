"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { PLANS } from "@myschool/shared";
import {
  ArrowLeft,
  Upload,
  Check,
  Loader2,
  School,
  MapPin,
  Mail,
  Palette,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Building2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import PhoneInput from "@/components/forms/PhoneInput";
import ImageCropModal from "@/components/shared/ImageCropModal";
import {
  validateEmail,
  validatePhone,
  validateRequired,
  validateThemeColor,
  collectErrors,
  type FieldErrors,
} from "@/lib/validation";

export default function RegisterSchoolPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phoneCountry, setPhoneCountry] = useState("+91");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const [form, setForm] = useState({
    schoolName: "",
    displayName: "",
    location: "",
    email: "",
    phone: "",
    themeColor: "#4F46E5",
    plan: "STANDARD",
    billingCycle: "YEARLY" as "MONTHLY" | "YEARLY",
    logoFile: null as File | null,
    logoUrl: "",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const planParam = sp.get("plan");
      if (planParam) {
        setForm((prev) => ({ ...prev, plan: planParam }));
      }
    }
  }, []);

  const selectedPlan = PLANS.find((p) => p.id === form.plan) || PLANS[0];

  const validateStep1 = (): boolean => {
    const isLongName = form.schoolName.trim().length > 20;
    const next = collectErrors({
      schoolName: validateRequired(form.schoolName, "School name"),
      ...(isLongName
        ? {
            displayName: !form.displayName.trim()
              ? "Display name is required when school name exceeds 20 characters"
              : form.displayName.trim().length > 20
              ? "Display name must be 20 characters or less"
              : undefined,
          }
        : {}),
      location: validateRequired(form.location, "Location"),
      email: validateEmail(form.email, true),
      phone: validatePhone(form.phone, { required: true, countryCode: phoneCountry }),
      themeColor: validateThemeColor(form.themeColor),
    });
    setErrors(next || {});
    return !next;
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Logo file size must be less than 10MB");
      return;
    }
    // Open 1:1 Crop Modal
    setCropFile(file);
    setCropOpen(true);
    e.target.value = ""; // Reset input so same file can be chosen again if needed
  };

  const handleCropComplete = (croppedFile: File) => {
    setForm((prev) => ({ ...prev, logoFile: croppedFile }));
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
    setCropOpen(false);
    toast.success("School logo cropped 1:1 successfully!");
  };

  const handleNextToPlan = () => {
    if (validateStep1()) {
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      toast.error("Please fill in all required school details correctly");
    }
  };

  const handleSubmit = async () => {
    if (!validateStep1()) {
      toast.error("Please review school details in Step 1");
      setStep(1);
      return;
    }
    setLoading(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("startTopLoader"));
    }
    try {
      let logoUrl = form.logoUrl || "";
      if (form.logoFile) {
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append("file", form.logoFile);
          const up = await fetch("/api/upload", { method: "POST", body: fd });
          const upData = await up.json();
          if (up.ok) logoUrl = upData.url;
          else throw new Error(upData.error || "Logo upload failed");
        } finally {
          setUploading(false);
        }
      }

      const res = await fetch("/api/schools/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName: form.schoolName.trim(),
          displayName: form.schoolName.trim().length > 20 ? form.displayName.trim() : (form.displayName.trim() || undefined),
          location: form.location.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          themeColor: form.themeColor,
          plan: form.plan,
          billingCycle: form.billingCycle,
          logoUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "School registration failed");

      // Store credentials for success page
      const credentials = {
        schoolCode: data.school.schoolCode,
        schoolName: data.school.displayName || data.school.name,
        schoolFullName: data.school.name,
        adminUsername: data.admin.username,
        adminPassword: data.admin.password,
        email: data.admin.email,
        themeColor: data.school.themeColor,
        plan: form.plan,
      };

      sessionStorage.setItem("myschool_new_school", JSON.stringify(credentials));
      toast.success("School registered successfully!");
      router.push("/register-school/success");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong during registration");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("finishTopLoader"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-50/80 text-slate-800 py-10 px-4 sm:px-6 lg:px-8 overflow-hidden select-none">
      {/* Soft Pastel Ambient Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-200/40 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-purple-200/40 blur-3xl pointer-events-none" />

      {/* Subtle Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-indigo-600 transition px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span>Already registered?</span>
            <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold underline">
              Sign In
            </Link>
          </div>
        </div>

        {/* Header Title */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 mb-3 text-xs font-bold uppercase tracking-wider shadow-sm">
            <Building2 className="w-3.5 h-3.5" /> Institution Onboarding
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Register Your <span className="text-indigo-600">School</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Set up your cloud campus in minutes with full administrative control.
          </p>

          {/* Stepper Progress Indicator */}
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto mt-6">
            <button
              onClick={() => setStep(1)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm ${
                step === 1
                  ? "bg-indigo-600 text-white shadow-indigo-600/20"
                  : "bg-white text-emerald-600 border border-emerald-200"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[11px]">
                {step > 1 ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : "1"}
              </div>
              <span>1. School Details</span>
            </button>

            <div className={`h-0.5 w-10 rounded ${step === 2 ? "bg-indigo-600" : "bg-slate-200"}`} />

            <button
              onClick={() => {
                if (validateStep1()) setStep(2);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm ${
                step === 2
                  ? "bg-indigo-600 text-white shadow-indigo-600/20"
                  : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[11px]">
                2
              </div>
              <span>2. Choose Plan</span>
            </button>
          </div>
        </div>

        {/* Form Container Card */}
        <motion.div
          layout
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 md:p-10 shadow-xl shadow-slate-200/60"
        >
          {/* STEP 1: SCHOOL DETAILS */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <School className="w-5 h-5 text-indigo-600" /> School Information
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter the basic details to configure your school profile.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
                  Step 1 of 2
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* School Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    School Name <span className="text-indigo-600">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={form.schoolName}
                      onChange={(e) => {
                        setForm({ ...form, schoolName: e.target.value });
                        setErrors((er) => ({ ...er, schoolName: "" }));
                      }}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-50/50 text-slate-900 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-500/30 ${
                        errors.schoolName ? "border-red-400 ring-1 ring-red-400/30" : "border-slate-200 focus:border-indigo-500"
                      }`}
                      placeholder="Public School"
                    />
                  </div>
                  {errors.schoolName && <p className="mt-1 text-xs text-red-600">{errors.schoolName}</p>}
                </div>

                {/* Display Name (Required & shown only when School Name exceeds 20 characters) */}
                {form.schoolName.trim().length > 20 && (
                  <div className="md:col-span-2 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900">
                        Display Name (Short Name) <span className="text-indigo-600">*</span>
                      </label>
                      <span className={`text-[11px] font-mono font-bold ${form.displayName.length > 20 ? "text-rose-600" : "text-indigo-600"}`}>
                        {form.displayName.length}/20 characters
                      </span>
                    </div>
                    <p className="text-xs text-indigo-700/90 leading-relaxed">
                      Your school name exceeds 20 characters. Please provide a short display name (up to 20 characters) to be displayed across application headers, navigation bars, and mobile screens.
                    </p>
                    <div className="relative">
                      <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400 pointer-events-none" />
                      <input
                        type="text"
                        maxLength={20}
                        value={form.displayName}
                        onChange={(e) => {
                          setForm({ ...form, displayName: e.target.value });
                          setErrors((er) => ({ ...er, displayName: "" }));
                        }}
                        className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-white text-slate-900 text-sm outline-none transition focus:ring-2 focus:ring-indigo-500/30 ${
                          errors.displayName ? "border-red-400 ring-1 ring-red-400/30" : "border-indigo-200 focus:border-indigo-500"
                        }`}
                        placeholder="e.g. DPS International"
                      />
                    </div>
                    {errors.displayName && <p className="mt-1 text-xs text-red-600 font-medium">{errors.displayName}</p>}
                  </div>
                )}

                {/* Location */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Location <span className="text-indigo-600">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={form.location}
                      onChange={(e) => {
                        setForm({ ...form, location: e.target.value });
                        setErrors((er) => ({ ...er, location: "" }));
                      }}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-50/50 text-slate-900 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-500/30 ${
                        errors.location ? "border-red-400 ring-1 ring-red-400/30" : "border-slate-200 focus:border-indigo-500"
                      }`}
                      placeholder="Delhi, India"
                    />
                  </div>
                  {errors.location && <p className="mt-1 text-xs text-red-600">{errors.location}</p>}
                </div>

                {/* Admin Email */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Admin Email <span className="text-indigo-600">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => {
                        setForm({ ...form, email: e.target.value });
                        setErrors((er) => ({ ...er, email: "" }));
                      }}
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl border bg-slate-50/50 text-slate-900 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-500/30 ${
                        errors.email ? "border-red-400 ring-1 ring-red-400/30" : "border-slate-200 focus:border-indigo-500"
                      }`}
                      placeholder="admin@school.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>

                {/* Phone Number (Required) */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Phone Number <span className="text-indigo-600">*</span>
                  </label>
                  <PhoneInput
                    value={form.phone}
                    defaultCountryCode="+91"
                    error={errors.phone}
                    onChange={(full, code) => {
                      setForm({ ...form, phone: full });
                      setPhoneCountry(code);
                      setErrors((er) => ({ ...er, phone: "" }));
                    }}
                  />
                </div>

                {/* Theme Color (30% Darker) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-indigo-600" /> Theme Color <span className="text-indigo-600">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">At least 30% dark</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl border-2 border-white shadow-sm flex items-center justify-center overflow-hidden cursor-pointer relative shrink-0 ring-1 ring-slate-200"
                      style={{ backgroundColor: form.themeColor || "#4F46E5" }}
                    >
                      <input
                        type="color"
                        value={form.themeColor}
                        onChange={(e) => {
                          setForm({ ...form, themeColor: e.target.value.toUpperCase() });
                          setErrors((er) => ({ ...er, themeColor: "" }));
                        }}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      value={form.themeColor || "#4F46E5"}
                      onChange={(e) => {
                        setForm({ ...form, themeColor: e.target.value.toUpperCase() });
                        setErrors((er) => ({ ...er, themeColor: "" }));
                      }}
                      className={`flex-1 px-4 py-2 rounded-xl border bg-slate-50/50 text-slate-900 font-mono text-sm uppercase outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 ${
                        errors.themeColor ? "border-red-400 ring-1 ring-red-400/30" : "border-slate-200 focus:border-indigo-500"
                      }`}
                      placeholder="#4F46E5"
                      maxLength={7}
                    />
                  </div>
                  {errors.themeColor && <p className="mt-1 text-xs text-red-600">{errors.themeColor}</p>}
                </div>

                {/* School Logo Upload (Optional) */}
                <div className="md:col-span-2 pt-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    School Logo <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                    {logoPreview ? (
                      <div className="w-14 h-14 rounded-2xl bg-white p-2 border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                        <img src={logoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 shadow-sm">
                        <School className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 text-center sm:text-left">
                      <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition shadow-sm">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>{logoPreview ? "Change Logo" : "Upload School Logo"}</span>
                        <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                      </label>
                      <p className="text-[11px] text-slate-500 mt-1">PNG, JPG or WebP up to 5MB</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-4 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  onClick={handleNextToPlan}
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 hover:bg-indigo-700 flex items-center justify-center gap-2 transition"
                >
                  <span>Continue to Plan Selection</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: CHOOSE PLAN & REVIEW */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-indigo-600" /> Choose Subscription Plan
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the plan that fits your campus scale.
                  </p>
                </div>
                {/* Billing Cycle Switcher */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, billingCycle: "MONTHLY" })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      form.billingCycle === "MONTHLY"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Monthly
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, billingCycle: "YEARLY" })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      form.billingCycle === "YEARLY"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <span>Yearly</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.2 rounded-full font-bold">
                      Save 20%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {PLANS.map((plan) => {
                  const isSelected = form.plan === plan.id;
                  const price =
                    form.billingCycle === "YEARLY"
                      ? Math.round(plan.monthlyPrice * 0.8)
                      : plan.monthlyPrice;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setForm({ ...form, plan: plan.id })}
                      className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-600/10"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
                          Most Popular
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-base text-slate-900">{plan.name}</h3>
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"}`}>
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                        <div className="mb-4">
                          <span className="text-2xl font-black text-slate-900">₹{price.toLocaleString()}</span>
                          <span className="text-xs text-slate-500 font-medium">/month</span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-600">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Up to <strong>{plan.maxStudents.toLocaleString()}</strong> Students</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Up to <strong>{plan.maxTeachers}</strong> Teachers</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Full Portal & Mobile Access</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Review Summary Box */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">School:</span>
                    <strong className="text-slate-900 truncate block">{form.schoolName || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Location:</span>
                    <strong className="text-slate-900 truncate block">{form.location || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Admin Email:</span>
                    <strong className="text-slate-900 truncate block">{form.email || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Plan:</span>
                    <strong className="text-indigo-600 block">{selectedPlan.name} ({form.billingCycle})</strong>
                  </div>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-sm"
                >
                  ← Edit School Details
                </button>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  disabled={loading || uploading}
                  onClick={handleSubmit}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 transition"
                >
                  {loading || uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Provisioning School...
                    </>
                  ) : (
                    <>
                      <span>Create School</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* 1:1 School Logo Crop Modal */}
      <ImageCropModal
        open={cropOpen}
        imageFile={cropFile}
        onClose={() => {
          setCropOpen(false);
          setCropFile(null);
        }}
        onCropComplete={handleCropComplete}
        title="Crop School Logo"
        themeColor={form.themeColor || "#4F46E5"}
      />
    </div>
  );
}


