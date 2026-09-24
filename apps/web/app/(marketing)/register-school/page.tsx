"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { PLANS, PLAN_TIERS } from "@myschool/shared";
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
  AlertTriangle,
  Key,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
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
  validatePassword,
  collectErrors,
  type FieldErrors,
} from "@/lib/validation";

export default function RegisterSchoolPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [phoneCountry, setPhoneCountry] = useState("+91");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [form, setForm] = useState({
    schoolName: "",
    displayName: "",
    location: "",
    email: "",
    phone: "",
    themeColor: "#4F46E5",
    plan: "STARTER_1_MONTH",
    billingCycle: "MONTHLY" as "MONTHLY" | "YEARLY",
    logoFile: null as File | null,
    logoUrl: "",
    password: "",
    confirmPassword: "",
  });

  // OTP State (6 digits)
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const planParam = sp.get("plan");
      if (planParam && (planParam === "STARTER" || planParam === "STARTER_1_MONTH" || planParam === "BASIC")) {
        setForm((prev) => ({
          ...prev,
          plan: "STARTER_1_MONTH",
          billingCycle: "MONTHLY",
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          plan: "STARTER_1_MONTH",
          billingCycle: "MONTHLY",
        }));
      }
    }
  }, []);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const selectedTier = PLAN_TIERS.find((p) => p.id === "STARTER") || PLAN_TIERS[0];
  const selectedPlan = PLANS.find((p) => p.id === "STARTER") || PLANS[0];

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
      phone: validatePhone(form.phone, {
        required: true,
        countryCode: phoneCountry,
      }),
      themeColor: validateThemeColor(form.themeColor),
      password: validatePassword(form.password, 6),
      confirmPassword: !form.confirmPassword
        ? "Confirm password is required"
        : form.password !== form.confirmPassword
          ? "Passwords do not match"
          : "",
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
    e.target.value = ""; // Reset input
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
      toast.error("Please fill in all required school and password details");
    }
  };

  // Trigger Send OTP and transition to Step 3
  const handleInitiateSchoolCreation = async () => {
    if (!validateStep1()) {
      toast.error("Please review school details and password");
      setStep(1);
      return;
    }
    setLoading(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("startTopLoader"));
    }
    try {
      let logoUrl = form.logoUrl || "";
      if (form.logoFile && !logoUrl) {
        setUploading(true);
        try {
          const fd = new FormData();
          fd.append("file", form.logoFile);
          const up = await fetch("/api/upload", { method: "POST", body: fd });
          const upData = await up.json();
          if (up.ok) {
            logoUrl = upData.url;
            setForm((prev) => ({ ...prev, logoUrl }));
          } else {
            throw new Error(upData.error || "Logo upload failed");
          }
        } finally {
          setUploading(false);
        }
      }

      // Request OTP from server
      const res = await fetch("/api/schools/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          schoolName: form.schoolName.trim(),
          displayName:
            form.schoolName.trim().length > 20
              ? form.displayName.trim()
              : form.displayName.trim() || undefined,
          location: form.location.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          themeColor: form.themeColor,
          plan: form.plan,
          billingCycle: form.billingCycle,
          logoUrl,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification code");
      }

      toast.success(data.message || `Verification code sent to ${form.email}`);
      setStep(3);
      setResendCooldown(30);
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      toast.error(err.message || "Failed to initiate school creation");
    } finally {
      setLoading(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("finishTopLoader"));
      }
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      const res = await fetch("/api/schools/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_otp",
          schoolName: form.schoolName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code");
      }
      toast.success(data.message || `New code sent to ${form.email}`);
      setResendCooldown(30);
      setOtp(["", "", "", "", "", ""]);
      otpInputsRef.current[0]?.focus();
    } catch (err: any) {
      toast.error(err.message || "Failed to resend verification code");
    } finally {
      setResending(false);
    }
  };

  // OTP Input handlers
  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const next = [...otp];
      next[index] = "";
      setOtp(next);
      return;
    }

    if (clean.length > 1) {
      // Pasted multi-digit code
      const digits = clean.slice(0, 6).split("");
      const next = [...otp];
      digits.forEach((d, i) => {
        if (i < 6) next[i] = d;
      });
      setOtp(next);
      const nextFocus = Math.min(digits.length, 5);
      otpInputsRef.current[nextFocus]?.focus();
      return;
    }

    const next = [...otp];
    next[index] = clean[0];
    setOtp(next);

    // Auto-advance to next input
    if (index < 5 && clean[0]) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Final OTP Verification and School Creation
  const handleVerifyAndCreate = async () => {
    const enteredCode = otp.join("").trim();
    if (enteredCode.length !== 6) {
      toast.error("Please enter the complete 6-digit verification code");
      return;
    }

    setVerifying(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("startTopLoader"));
    }
    try {
      const res = await fetch("/api/schools/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_and_create",
          otpCode: enteredCode,
          schoolName: form.schoolName.trim(),
          displayName:
            form.schoolName.trim().length > 20
              ? form.displayName.trim()
              : form.displayName.trim() || undefined,
          location: form.location.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          themeColor: form.themeColor,
          plan: form.plan,
          billingCycle: form.billingCycle,
          logoUrl: form.logoUrl,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error || "School registration verification failed",
        );
      }

      // Store credentials for success page
      const credentials = {
        schoolCode: data.school.schoolCode,
        schoolName: data.school.displayName || data.school.name,
        schoolFullName: data.school.name,
        adminUsername: data.admin.username,
        adminPassword: form.password, // user's entered password
        email: data.admin.email,
        themeColor: data.school.themeColor,
        plan: form.plan,
      };

      sessionStorage.setItem(
        "myschool_new_school",
        JSON.stringify(credentials),
      );
      toast.success("School created successfully! You are now logged in.");
      router.push("/register-school/success");
    } catch (err: any) {
      toast.error(err.message || "Failed to verify code");
    } finally {
      setVerifying(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("finishTopLoader"));
      }
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
            <Link
              href="/login"
              className="text-indigo-600 hover:text-indigo-700 font-semibold underline"
            >
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
            Set up your cloud campus in minutes with full administrative
            control.
          </p>

          {/* Stepper Progress Indicator (3 Steps) */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 max-w-lg mx-auto mt-6">
            {/* Step 1 Button */}
            <button
              onClick={() => step !== 3 && setStep(1)}
              disabled={step === 3}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm ${
                step === 1
                  ? "bg-indigo-600 text-white shadow-indigo-600/20"
                  : step > 1
                    ? "bg-white text-emerald-600 border border-emerald-200"
                    : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === 1
                    ? "bg-white/20 text-white"
                    : step > 1
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {step > 1 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  "1"
                )}
              </div>
              <span className="hidden sm:inline">1. School Details</span>
              <span className="sm:hidden">Details</span>
            </button>

            <div
              className={`h-0.5 w-6 sm:w-8 rounded ${
                step >= 2 ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />

            {/* Step 2 Button */}
            <button
              onClick={() => {
                if (step !== 3 && validateStep1()) setStep(2);
              }}
              disabled={step === 3}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm ${
                step === 2
                  ? "bg-indigo-600 text-white shadow-indigo-600/20"
                  : step > 2
                    ? "bg-white text-emerald-600 border border-emerald-200"
                    : "bg-white text-slate-500 border border-slate-200"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === 2
                    ? "bg-white/20 text-white"
                    : step > 2
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                }`}
              >
                {step > 2 ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  "2"
                )}
              </div>
              <span className="hidden sm:inline">2. Choose Plan</span>
              <span className="sm:hidden">Plan</span>
            </button>

            <div
              className={`h-0.5 w-6 sm:w-8 rounded ${
                step === 3 ? "bg-indigo-600" : "bg-slate-200"
              }`}
            />

            {/* Step 3 Button */}
            <div
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-sm ${
                step === 3
                  ? "bg-indigo-600 text-white shadow-indigo-600/20"
                  : "bg-white text-slate-400 border border-slate-200 opacity-80"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                  step === 3
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                3
              </div>
              <span className="hidden sm:inline">3. Verify Email</span>
              <span className="sm:hidden">Verify</span>
            </div>
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
                    <School className="w-5 h-5 text-indigo-600" /> School
                    Information
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter your school details and set your administrator
                    password.
                  </p>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
                  Step 1 of 3
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
                        errors.schoolName
                          ? "border-red-400 ring-1 ring-red-400/30"
                          : "border-slate-200 focus:border-indigo-500"
                      }`}
                      placeholder="Enter school name"
                    />
                  </div>
                  {errors.schoolName && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.schoolName}
                    </p>
                  )}
                </div>

                {/* Display Name (Required & shown only when School Name exceeds 20 characters) */}
                {form.schoolName.trim().length > 20 && (
                  <div className="md:col-span-2 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900">
                        Display Name (Short Name){" "}
                        <span className="text-indigo-600">*</span>
                      </label>
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          form.displayName.length > 20
                            ? "text-rose-600"
                            : "text-indigo-600"
                        }`}
                      >
                        {form.displayName.length}/20 characters
                      </span>
                    </div>
                    <p className="text-xs text-indigo-700/90 leading-relaxed">
                      Your school name exceeds 20 characters. Please provide a
                      short display name (up to 20 characters) for application
                      headers and mobile views.
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
                          errors.displayName
                            ? "border-red-400 ring-1 ring-red-400/30"
                            : "border-indigo-200 focus:border-indigo-500"
                        }`}
                        placeholder="e.g. HS School"
                      />
                    </div>
                    {errors.displayName && (
                      <p className="mt-1 text-xs text-red-600 font-medium">
                        {errors.displayName}
                      </p>
                    )}
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
                        errors.location
                          ? "border-red-400 ring-1 ring-red-400/30"
                          : "border-slate-200 focus:border-indigo-500"
                      }`}
                      placeholder="e.g. Delhi, India"
                    />
                  </div>
                  {errors.location && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.location}
                    </p>
                  )}
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
                        errors.email
                          ? "border-red-400 ring-1 ring-red-400/30"
                          : "border-slate-200 focus:border-indigo-500"
                      }`}
                      placeholder="admin@school.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email}</p>
                  )}
                </div>

                {/* Phone Number */}
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

                {/* Theme Color */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-indigo-600" /> Theme
                      Color <span className="text-indigo-600">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      At least 30% dark
                    </span>
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
                          setForm({
                            ...form,
                            themeColor: e.target.value.toUpperCase(),
                          });
                          setErrors((er) => ({ ...er, themeColor: "" }));
                        }}
                        className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                      />
                    </div>
                    <input
                      type="text"
                      value={form.themeColor || "#4F46E5"}
                      onChange={(e) => {
                        setForm({
                          ...form,
                          themeColor: e.target.value.toUpperCase(),
                        });
                        setErrors((er) => ({ ...er, themeColor: "" }));
                      }}
                      className={`flex-1 px-4 py-2 rounded-xl border bg-slate-50/50 text-slate-900 font-mono text-sm uppercase outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/30 ${
                        errors.themeColor
                          ? "border-red-400 ring-1 ring-red-400/30"
                          : "border-slate-200 focus:border-indigo-500"
                      }`}
                      placeholder="#4F46E5"
                      maxLength={7}
                    />
                  </div>
                  {errors.themeColor && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.themeColor}
                    </p>
                  )}
                </div>

                {/* Password Field (Required) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-indigo-600" /> Enter
                      Password <span className="text-indigo-600">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Min 6 characters
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={(e) => {
                        setForm({ ...form, password: e.target.value });
                        setErrors((er) => ({ ...er, password: "" }));
                      }}
                      className={`w-full pl-4 pr-11 py-2.5 rounded-xl border bg-slate-50/50 text-slate-900 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-500/30 ${
                        errors.password
                          ? "border-red-400 ring-1 ring-red-400/30"
                          : "border-slate-200 focus:border-indigo-500"
                      }`}
                      placeholder="Create admin password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field (Required) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" /> Confirm
                      Password <span className="text-indigo-600">*</span>
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Must match
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(e) => {
                        setForm({ ...form, confirmPassword: e.target.value });
                        setErrors((er) => ({ ...er, confirmPassword: "" }));
                      }}
                      className={`w-full pl-4 pr-11 py-2.5 rounded-xl border bg-slate-50/50 text-slate-900 text-sm outline-none transition focus:bg-white focus:ring-2 focus:ring-indigo-500/30 ${
                        errors.confirmPassword
                          ? "border-red-400 ring-1 ring-red-400/30"
                          : "border-slate-200 focus:border-indigo-500"
                      }`}
                      placeholder="Re-enter admin password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* School Logo Upload (Optional) */}
                <div className="md:col-span-2 pt-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    School Logo{" "}
                    <span className="text-slate-400 font-normal lowercase">
                      (optional)
                    </span>
                  </label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                    {logoPreview ? (
                      <div className="w-14 h-14 rounded-2xl bg-white p-2 border border-slate-200 shadow-sm flex items-center justify-center shrink-0">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400 shadow-sm">
                        <School className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 text-center sm:text-left">
                      <label className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition shadow-sm">
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          {logoPreview ? "Change Logo" : "Upload School Logo"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="hidden"
                        />
                      </label>
                      <p className="text-[11px] text-slate-500 mt-1">
                        PNG, JPG or WebP up to 5MB (1:1 aspect ratio)
                      </p>
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
                  className="w-full sm:w-auto px-7 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 hover:bg-indigo-700 flex items-center justify-center gap-2 transition cursor-pointer"
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
                    <Sparkles className="w-5 h-5 text-indigo-600" /> Choose
                    Subscription Plan
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select the plan that fits your campus scale.
                  </p>
                </div>
                {/* Validity / Billing Switcher */}
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200 self-start sm:self-auto">
                  <button
                    type="button"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-indigo-600 shadow-sm flex items-center gap-1.5 cursor-default"
                  >
                    <span>1 Month</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-extrabold">
                      Free Trial
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        "6-Month package is upcoming. 1-Month Starter Free Trial is currently active for registration."
                      )
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-600 transition flex items-center gap-1.5 opacity-70 cursor-not-allowed"
                  >
                    <span>6 Months</span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                      Upcoming
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        "1-Year package is upcoming. 1-Month Starter Free Trial is currently active for registration."
                      )
                    }
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-600 transition flex items-center gap-1.5 opacity-70 cursor-not-allowed"
                  >
                    <span>1 Year</span>
                    <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-full font-bold">
                      Upcoming
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {PLAN_TIERS.map((tier) => {
                  const isAvailable = tier.id === "STARTER";
                  const isSelected = isAvailable;
                  const price = tier.pricing["1_MONTH"].price;

                  return (
                    <div
                      key={tier.id}
                      onClick={() => {
                        if (isAvailable) {
                          setForm({ ...form, plan: "STARTER_1_MONTH" });
                        } else {
                          toast.info(
                            `${tier.name} is upcoming. SchoolVajo Starter (1 Month Free Trial) is currently active.`
                          );
                        }
                      }}
                      className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                        isAvailable && isSelected
                          ? "border-indigo-600 bg-indigo-50/50 shadow-md shadow-indigo-600/10 cursor-pointer"
                          : isAvailable
                          ? "border-slate-200 bg-white hover:border-slate-300 cursor-pointer"
                          : "border-slate-200 bg-slate-50/60 opacity-70 cursor-not-allowed"
                      }`}
                    >
                      <div
                        className={`absolute -top-3 right-4 px-2.5 py-0.5 rounded-full text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${
                          isAvailable ? "bg-emerald-600" : "bg-slate-500"
                        }`}
                      >
                        {isAvailable
                          ? "FREE TRIAL"
                          : tier.badge || "UPCOMING"}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-base text-slate-900">
                            {tier.name}
                          </h3>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-600 text-white"
                                : "border-slate-300"
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                          </div>
                        </div>
                        <div className="mb-4">
                          <span className="text-2xl font-black text-slate-900">
                            ₹{price.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            /month
                          </span>
                        </div>
                        <ul className="space-y-2 text-xs text-slate-600">
                          {tier.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2
                                className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                                  isAvailable
                                    ? "text-indigo-600"
                                    : "text-slate-400"
                                }`}
                              />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100">
                        {isAvailable ? (
                          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Selected by
                            default (Free Trial)
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            Upcoming Plan
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Review Summary Box */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Summary
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">School:</span>
                    <strong className="text-slate-900 truncate block">
                      {form.schoolName || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Location:</span>
                    <strong className="text-slate-900 truncate block">
                      {form.location || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Admin Email:</span>
                    <strong className="text-slate-900 truncate block">
                      {form.email || "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Plan:</span>
                    <strong className="text-indigo-600 block">
                      {selectedTier.name} (1 Month Free Trial)
                    </strong>
                  </div>
                </div>
              </div>

              {/* Active Development & Free Access Note */}
              <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-slate-50 p-5 space-y-3.5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-extrabold text-slate-900">
                        SchoolVajo is currently under active development
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Free Access Phase
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      We’re making SchoolVajo better every day to provide
                      schools with a simple, reliable, and modern management
                      experience.
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-2.5 pl-0 sm:pl-12">
                  <p className="leading-relaxed">
                    As you use the platform, you may occasionally experience
                    bugs, errors, missing information, or data inconsistencies.
                  </p>
                  <p className="leading-relaxed">
                    If you notice any issue, please let us know through{" "}
                    <strong>email</strong> or our support channels. Your
                    feedback helps us identify and fix problems faster.
                  </p>

                  <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-3 flex items-start gap-2.5 text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] leading-relaxed">
                      <strong>Important:</strong> During this
                      development/testing phase, we cannot guarantee against
                      unexpected data loss or data inconsistencies. Please use
                      the platform with this understanding.
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-sm cursor-pointer"
                >
                  ← Edit School Details
                </button>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  disabled={loading || uploading}
                  onClick={handleInitiateSchoolCreation}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {loading || uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending
                      Verification Code...
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

          {/* STEP 3: OTP VERIFICATION VIEW */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="text-center max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3 shadow-sm">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
                  <Mail className="w-3.5 h-3.5" /> Email Verification
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  Enter 6-Digit Verification Code
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
                  We have sent an authentication code to{" "}
                  <strong className="text-slate-800 underline font-semibold">
                    {form.email}
                  </strong>
                  . Please enter the code below to complete your registration.
                </p>
              </div>

              {/* 6-Digit OTP Input Boxes */}
              <div className="max-w-md mx-auto py-2">
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        otpInputsRef.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className={`w-12 h-14 sm:w-14 sm:h-16 rounded-2xl border text-center font-mono text-2xl font-bold transition-all outline-none ${
                        digit
                          ? "border-indigo-600 bg-indigo-50/40 text-indigo-700 ring-2 ring-indigo-500/20 shadow-sm"
                          : "border-slate-200 bg-slate-50/70 text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20"
                      }`}
                    />
                  ))}
                </div>

                {/* Resend Timer & Action */}
                <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                  {resendCooldown > 0 ? (
                    <span className="text-slate-400 font-medium">
                      Resend code in{" "}
                      <strong className="text-slate-600 font-mono">
                        {resendCooldown}s
                      </strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={resending}
                      onClick={handleResendOtp}
                      className="text-indigo-600 hover:text-indigo-700 font-bold inline-flex items-center gap-1.5 hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`}
                      />
                      <span>
                        {resending
                          ? "Sending code..."
                          : "Resend Verification Code"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Security Hint */}
              <div className="max-w-md mx-auto rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-500 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  The verification code expires in 15 minutes. Once verified,
                  your administrator portal for{" "}
                  <strong>{form.schoolName}</strong> will be immediately ready.
                </p>
              </div>

              {/* Navigation Actions */}
              <div className="pt-2 max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  disabled={verifying}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition shadow-sm cursor-pointer disabled:opacity-50"
                >
                  ← Edit Details
                </button>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  disabled={verifying || otp.join("").trim().length !== 6}
                  onClick={handleVerifyAndCreate}
                  className="w-full sm:w-auto px-8 py-3 rounded-xl bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Verifying &
                      Setting Up...
                    </>
                  ) : (
                    <>
                      <span>Verify & Continue</span>
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
