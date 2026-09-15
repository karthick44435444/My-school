"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Upload, Save, LogOut, Camera, User, Mail, Phone,
  School, MapPin, Palette, Shield, Lock, ChevronRight, Edit3, X,
  Building2, CheckCircle2, KeyRound
} from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth, clearAuthCache } from "@/hooks/useAuth";
import Avatar from "@/components/shared/Avatar";
import PhoneInput from "@/components/forms/PhoneInput";
import ChangePasswordView from "@/components/profile/ChangePasswordView";
import LogoutModal from "@/components/profile/LogoutModal";
import ImageCropModal from "@/components/shared/ImageCropModal";
import { formatPersonName } from "@/lib/utils";

const THEME_PRESETS = [
  { name: "Deep Indigo", hex: "#4338CA" },
  { name: "Royal Blue", hex: "#1D4ED8" },
  { name: "Deep Purple", hex: "#6D28D9" },
  { name: "Emerald", hex: "#047857" },
  { name: "Crimson", hex: "#BE123C" },
  { name: "Burgundy", hex: "#991B1B" },
  { name: "Dark Amber", hex: "#B45309" },
  { name: "Dark Slate", hex: "#334155" },
];

function isDarkThemeColor(hex: string): boolean {
  if (!hex) return false;
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) return false;
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const lightness = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
  // Lightness must be <= 0.755 (at least 25% dark, up to 75% light accepted)
  return lightness <= 0.755;
}

export default function AdminSettingsPage() {
  const { user, loading: authLoading } = useAuth(["ADMIN"]);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"profile" | "password">("profile");
  const [tab, setTab] = useState<"profile" | "school">("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingSchool, setIsEditingSchool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [profile, setProfile] = useState<any>({});
  const [school, setSchool] = useState<any>({});
  const [initialSchool, setInitialSchool] = useState<any>({});

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const initialTab = sp.get("tab");
      if (initialTab === "school") {
        setTab("school");
      } else {
        setTab("profile");
      }
    }
    setView("profile");
    setIsEditingProfile(false);
    setIsEditingSchool(false);
  }, []);

  useEffect(() => {
    return () => {
      setTab("profile");
      setView("profile");
      setIsEditingProfile(false);
      setIsEditingSchool(false);
    };
  }, []);

  const switchTab = (newTab: "profile" | "school") => {
    if (tab === newTab) return;
    if (isEditingProfile) {
      setIsEditingProfile(false);
      setProfile({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: (user as any)?.phone || "",
        photoUrl: user?.photoUrl || "",
      });
    }
    if (isEditingSchool) {
      setIsEditingSchool(false);
      setSchool(initialSchool);
    }
    setTab(newTab);
  };

  const navigateToPassword = () => {
    if (isEditingProfile) {
      setIsEditingProfile(false);
      setProfile({
        firstName: user?.firstName || "",
        lastName: user?.lastName || "",
        email: user?.email || "",
        phone: (user as any)?.phone || "",
        photoUrl: user?.photoUrl || "",
      });
    }
    if (isEditingSchool) {
      setIsEditingSchool(false);
      setSchool(initialSchool);
    }
    window.scrollTo(0, 0);
    setView("password");
  };

  const navigateToProfile = () => {
    window.scrollTo(0, 0);
    setView("profile");
  };

  useEffect(() => {
    if (!user) return;
    setProfile({
      firstName: user.firstName,
      lastName: user.lastName || "",
      email: user.email,
      phone: (user as any).phone || "",
      photoUrl: user.photoUrl || "",
    });
    fetch("/api/schools/update")
      .then((r) => r.json())
      .then((d) => {
        if (d.school) {
          const loadedSchool = {
            name: d.school.name || "",
            displayName: d.school.displayName || "",
            location: d.school.location || "",
            phone: d.school.phone || "",
            themeColor: d.school.themeColor || "#6366F1",
            logoUrl: d.school.logoUrl || "",
            schoolCode: d.school.schoolCode || user.schoolCode || "",
          };
          setSchool(loadedSchool);
          setInitialSchool(loadedSchool);
        }
      })
      .catch(() => {});
  }, [user]);

  const uploadFile = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.url as string;
  };

  const handleProfilePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setCropFile(f);
    setCropOpen(true);
    e.target.value = "";
  };

  const handleProfileCropComplete = async (croppedFile: File) => {
    setUploadingProfile(true);
    try {
      const url = await uploadFile(croppedFile);
      setProfile((prev: any) => ({ ...prev, photoUrl: url }));
      if (user) {
        await fetch(`/api/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ photoUrl: url }),
        });
        clearAuthCache();
        sessionStorage.setItem(
          "myschool_user",
          JSON.stringify({ ...user, photoUrl: url })
        );
      }
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err.message || "Photo upload failed");
    } finally {
      setUploadingProfile(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      clearAuthCache();
      sessionStorage.setItem(
        "myschool_user",
        JSON.stringify({ ...user, ...profile })
      );
      toast.success("Profile updated successfully");
      setIsEditingProfile(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const saveSchool = async () => {
    if (!isDarkThemeColor(school.themeColor)) {
      toast.error("Please choose a theme color that is at least 25% dark (up to 75% light accepted)");
      return;
    }
    const schoolNameTrimmed = (school.name || "").trim();
    if (!schoolNameTrimmed) {
      toast.error("School name is required");
      return;
    }
    if (schoolNameTrimmed.length > 20) {
      if (!school.displayName || !school.displayName.trim()) {
        toast.error("Display Name is required when school name exceeds 20 characters");
        return;
      }
      if (school.displayName.trim().length > 20) {
        toast.error("Display Name must be 20 characters or less");
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/schools/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...school,
          name: schoolNameTrimmed,
          displayName: schoolNameTrimmed.length > 20 ? school.displayName.trim() : (school.displayName?.trim() || ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const savedData = {
        ...school,
        name: schoolNameTrimmed,
        displayName: schoolNameTrimmed.length > 20 ? school.displayName.trim() : (school.displayName?.trim() || ""),
      };
      setSchool(savedData);
      setInitialSchool(savedData);
      setIsEditingSchool(false);
      clearAuthCache();
      const resolvedDisplayName = (schoolNameTrimmed.length > 20 && school.displayName)
        ? school.displayName.trim()
        : (school.displayName?.trim() || schoolNameTrimmed);
      if (user) {
        sessionStorage.setItem(
          "myschool_user",
          JSON.stringify({
            ...user,
            schoolName: resolvedDisplayName,
            schoolFullName: schoolNameTrimmed,
            schoolDisplayName: school.displayName?.trim() || null,
            schoolLogo: school.logoUrl,
            themeColor: school.themeColor,
          })
        );
      }
      toast.success("School details updated successfully");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!mounted || authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = school.themeColor || user.themeColor || "#6366F1";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
        {/* Top Header & Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {view === "password" ? "Security & Passwords" : "Admin Settings"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage your administrator profile, security, and school configuration
            </p>
          </div>

          {view === "profile" && (
            <div className="flex items-center p-1 bg-white border border-slate-200/90 rounded-2xl shadow-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => switchTab("profile")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  tab === "profile" ? "text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                style={tab === "profile" ? { backgroundColor: theme } : undefined}
              >
                My Profile
              </button>
              <button
                type="button"
                onClick={() => switchTab("school")}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                  tab === "school" ? "text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                style={tab === "school" ? { backgroundColor: theme } : undefined}
              >
                School Profile & Logo
              </button>
            </div>
          )}
        </div>

        {/* Change Password Dedicated Subview */}
        {view === "password" ? (
          <ChangePasswordView onBack={navigateToProfile} themeColor={theme} />
        ) : (
          <div className="w-full space-y-6">
            {/* Tab 1: My Profile */}
            {tab === "profile" && (
              <div className="w-full space-y-6">
                {/* Hero Profile Card with Cover & Floating Avatar */}
                <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                  {/* Background Cover Image */}
                  <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 w-full bg-slate-100 overflow-hidden">
                    <img
                      src="/profile-cover.png"
                      alt="Profile Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
                    <div className="absolute top-4 right-4 px-3.5 py-1.5 rounded-full bg-white/85 backdrop-blur-xs text-xs font-bold text-slate-800 shadow-xs">
                      {user.schoolCode}
                    </div>
                  </div>

                  {/* Profile Header Information */}
                  <div className="px-6 pb-6 pt-0 relative flex flex-col items-center">
                    {/* Centered Half-Floating Profile Avatar */}
                    <div className="relative -mt-16 sm:-mt-20 md:-mt-24 mb-3">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-full border-4 border-white shadow-xl bg-white ring-4 ring-slate-100/90 overflow-hidden relative flex items-center justify-center">
                        <Avatar
                          name={profile.firstName || user.firstName}
                          photoUrl={profile.photoUrl || user.photoUrl}
                          size={144}
                          className="w-full h-full"
                        />
                        {uploadingProfile && (
                          <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-white">
                            <Loader2 className="w-7 h-7 animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Camera upload badge */}
                      <label
                        className="absolute bottom-1 right-1 p-2 sm:p-2.5 rounded-full text-white shadow-md cursor-pointer transition hover:scale-105 active:scale-95 ring-2 ring-white"
                        style={{ backgroundColor: theme }}
                        title="Change profile photo"
                      >
                        <Camera className="w-4 h-4" />
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingProfile}
                          onChange={handleProfilePhotoChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Name & Badges */}
                    <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight text-center">
                      {formatPersonName(profile.firstName || user.firstName, profile.lastName || user.lastName)}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5 text-center">
                      @{user.username}
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        <Shield className="w-3.5 h-3.5" />
                        Administrator
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        {user.schoolName || "My School"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Personal Information Card */}
                <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-slate-900">Personal Information</h3>
                        <p className="text-xs text-slate-500">View and update your personal admin details</p>
                      </div>
                    </div>
                    {!isEditingProfile ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit Profile
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingProfile(false);
                          setProfile({
                            firstName: user.firstName,
                            lastName: user.lastName || "",
                            email: user.email,
                            phone: (user as any).phone || "",
                            photoUrl: user.photoUrl || "",
                          });
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-bold transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>

                  {isEditingProfile ? (
                    /* Edit Form */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            First Name
                          </label>
                          <input
                            type="text"
                            value={profile.firstName || ""}
                            onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            Last Name
                          </label>
                          <input
                            type="text"
                            value={profile.lastName || ""}
                            onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={profile.email || ""}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                            Phone Number
                          </label>
                          <PhoneInput
                            value={profile.phone || ""}
                            onChange={(full) => setProfile({ ...profile, phone: full })}
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={saveProfile}
                          disabled={saving}
                          className="px-5 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2 shadow-xs transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
                          style={{ backgroundColor: theme }}
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>{saving ? "Saving..." : "Save Profile"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-Only Information Grid */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Full Name</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={formatPersonName(profile.firstName || user.firstName, profile.lastName || user.lastName)}>
                            {formatPersonName(profile.firstName || user.firstName, profile.lastName || user.lastName)}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Username</div>
                          <div className="text-sm font-bold font-mono text-slate-900 mt-0.5 truncate" title={user.username}>
                            {user.username}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Email Address</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={profile.email || user.email || "—"}>
                            {profile.email || user.email || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={profile.phone || (user as any).phone || "—"}>
                            {profile.phone || (user as any).phone || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Settings and Passwords Section */}
                <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-4">
                  <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <KeyRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-slate-900">Settings and passwords</h3>
                      <p className="text-xs text-slate-500">Manage account credentials and security settings</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={navigateToPassword}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-indigo-50/40 hover:border-indigo-200 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-indigo-600 transition">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition">
                          Change Password
                        </div>
                        <div className="text-xs text-slate-500">
                          Update your login password regularly to ensure account safety
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-indigo-600">
                      <span>Change</span>
                      <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </button>
                </div>

                {/* Logout Action */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLogout(true)}
                    className="w-full py-3.5 rounded-2xl border border-red-200 bg-white hover:bg-red-50 text-red-600 font-bold text-sm flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out of Admin Account</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: School Profile & Settings */}
            {tab === "school" && (
              <div className="w-full space-y-6 animate-in fade-in duration-200">
                {/* Hero School Banner */}
                <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                  <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 w-full bg-slate-100 overflow-hidden">
                    <img
                      src="/profile-cover.png"
                      alt="School Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                    <div className="absolute bottom-4 left-6 text-white">
                      <div className="text-xs font-bold uppercase tracking-wider text-white/80">Institution Settings</div>
                      <div className="text-xl sm:text-2xl md:text-3xl font-black">{school.name || user.schoolName || "My School"}</div>
                    </div>
                  </div>

                  {/* Half-floating School Logo */}
                  <div className="px-6 pb-6 pt-0 relative flex flex-col items-center">
                    <div className="relative -mt-16 sm:-mt-20 md:-mt-24 mb-3">
                      <div className="w-28 h-28 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-3xl border-4 border-white shadow-xl bg-white ring-4 ring-slate-100 overflow-hidden relative flex items-center justify-center p-2">
                        {school.logoUrl ? (
                          <img src={school.logoUrl} alt="logo" className="w-full h-full object-contain rounded-2xl" />
                        ) : (
                          <div
                            className="w-full h-full rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-sm"
                            style={{ background: `linear-gradient(135deg, ${theme}, #a855f7)` }}
                          >
                            MS
                          </div>
                        )}
                        {uploadingLogo && (
                          <div className="absolute inset-0 bg-black/60 rounded-3xl flex items-center justify-center text-white">
                            <Loader2 className="w-7 h-7 animate-spin" />
                          </div>
                        )}
                      </div>

                      {isEditingSchool && (
                        <label
                          className="absolute bottom-1 right-1 p-2 sm:p-2.5 rounded-full text-white shadow-md cursor-pointer transition hover:scale-105 active:scale-95 ring-2 ring-white"
                          style={{ backgroundColor: theme }}
                          title="Upload school logo"
                        >
                          <Upload className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingLogo}
                            className="hidden"
                            onChange={async (e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              setUploadingLogo(true);
                              try {
                                const url = await uploadFile(f);
                                setSchool({ ...school, logoUrl: url });
                                toast.success("School logo uploaded");
                              } catch (err: any) {
                                toast.error(err.message || "Logo upload failed");
                              } finally {
                                setUploadingLogo(false);
                              }
                            }}
                          />
                        </label>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-slate-500 font-medium text-center">
                      Code: <span className="font-mono font-bold text-slate-700">{school.schoolCode || user.schoolCode}</span>
                    </p>
                  </div>
                </div>

                {/* School Details Card */}
                <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <School className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base sm:text-lg text-slate-900">School Profile Information</h3>
                        <p className="text-xs text-slate-500">Configure public school details and branding</p>
                      </div>
                    </div>
                    {!isEditingSchool ? (
                      <button
                        type="button"
                        onClick={() => setIsEditingSchool(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs sm:text-sm font-bold transition shadow-2xs cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit School Details
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingSchool(false);
                          setSchool(initialSchool);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-bold transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    )}
                  </div>

                  {isEditingSchool ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          School Name
                        </label>
                        <input
                          type="text"
                          value={school.name || ""}
                          onChange={(e) => setSchool({ ...school, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                        />
                      </div>

                      {/* Display Name (Required & shown only when School Name exceeds 20 characters) */}
                      {(school.name || "").trim().length > 20 && (
                        <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/90 space-y-2 animate-in fade-in duration-200">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold uppercase tracking-wider text-indigo-900">
                              Display Name (Short Name) <span className="text-indigo-600">*</span>
                            </label>
                            <span className={`text-[11px] font-mono font-bold ${(school.displayName || "").length > 20 ? "text-rose-600" : "text-indigo-600"}`}>
                              {(school.displayName || "").length}/20 characters
                            </span>
                          </div>
                          <p className="text-xs text-indigo-700/90 leading-relaxed">
                            Your school name exceeds 20 characters. This display name (up to 20 characters) is used across application headers, navigation bars, reports, and mobile app screens.
                          </p>
                          <input
                            type="text"
                            maxLength={20}
                            value={school.displayName || ""}
                            onChange={(e) => setSchool({ ...school, displayName: e.target.value })}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-white outline-none text-sm focus:ring-2 focus:ring-indigo-500 font-medium"
                            placeholder="e.g. DPS International"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          School Location / Address
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <MapPin className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            value={school.location || ""}
                            onChange={(e) => setSchool({ ...school, location: e.target.value })}
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. 123 Education Lane, City"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                          Official School Phone
                        </label>
                        <PhoneInput
                          value={school.phone || ""}
                          onChange={(full) => setSchool({ ...school, phone: full })}
                        />
                      </div>

                      {/* Branding Theme Color */}
                      <div className="pt-2 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Palette className="w-3.5 h-3.5 text-indigo-500" />
                            <span>Brand Theme Color</span>
                          </label>
                          <span className={`text-[11px] font-bold ${isDarkThemeColor(school.themeColor || "#4338CA") ? "text-emerald-600" : "text-rose-600 font-extrabold"}`}>
                            {isDarkThemeColor(school.themeColor || "#4338CA") ? "✓ Valid Theme Color" : "⚠ Too light (Must be at least 25% dark / max 75% light)"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mb-3">
                          Theme color must be at least 25% dark (up to 75% light accepted) to ensure high contrast and readability.
                        </p>
                        <div className="flex flex-wrap items-center gap-2.5">
                          {THEME_PRESETS.map((p) => {
                            const active = (school.themeColor || "").toLowerCase() === p.hex.toLowerCase();
                            return (
                              <button
                                key={p.hex}
                                type="button"
                                onClick={() => setSchool({ ...school, themeColor: p.hex })}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                                  active
                                    ? "border-slate-800 bg-slate-900 text-white shadow-xs"
                                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                }`}
                              >
                                <span
                                  className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10"
                                  style={{ backgroundColor: p.hex }}
                                />
                                <span>{p.name}</span>
                              </button>
                            );
                          })}
                          <div className="flex items-center gap-2 ml-auto">
                            <div
                              className="w-8 h-8 rounded-xl border border-slate-200 shadow-2xs relative overflow-hidden flex items-center justify-center cursor-pointer"
                              style={{ backgroundColor: school.themeColor || "#4338CA" }}
                            >
                              <input
                                type="color"
                                value={school.themeColor || "#4338CA"}
                                onChange={(e) => setSchool({ ...school, themeColor: e.target.value })}
                                className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                              />
                            </div>
                            <input
                              type="text"
                              value={school.themeColor || "#4338CA"}
                              onChange={(e) => setSchool({ ...school, themeColor: e.target.value })}
                              className={`w-24 px-2.5 py-1.5 rounded-xl border font-mono text-xs font-bold uppercase ${
                                isDarkThemeColor(school.themeColor || "#4338CA")
                                  ? "border-slate-200 bg-slate-50 text-slate-700"
                                  : "border-rose-400 bg-rose-50 text-rose-700 ring-2 ring-rose-200"
                              }`}
                              maxLength={7}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={saveSchool}
                          disabled={saving}
                          className="px-6 py-2.5 rounded-xl text-white font-semibold text-sm flex items-center gap-2 shadow-xs transition hover:opacity-95 disabled:opacity-50 cursor-pointer"
                          style={{ backgroundColor: theme }}
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                          <span>{saving ? "Saving School..." : "Save School Settings"}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Read-Only School Details */
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <School className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">School Name</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={school.name || user.schoolName || "—"}>
                            {school.name || user.schoolName || "—"}
                          </div>
                        </div>
                      </div>

                      {((school.name || "").length > 20 || !!school.displayName) && (
                        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-start gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">Display Name (Short)</div>
                            <div className="text-sm font-bold text-indigo-950 mt-0.5 truncate" title={school.displayName || "—"}>
                              {school.displayName || "—"}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">School Code</div>
                          <div className="text-sm font-bold font-mono text-slate-900 mt-0.5 truncate" title={school.schoolCode || user.schoolCode || "—"}>
                            {school.schoolCode || user.schoolCode || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Location / Address</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={school.location || "—"}>
                            {school.location || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-2xs border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Official Phone</div>
                          <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={school.phone || "—"}>
                            {school.phone || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg shadow-2xs border border-slate-200 flex items-center justify-center shrink-0 ring-1 ring-black/10"
                          style={{ backgroundColor: school.themeColor || "#4338CA" }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Brand Theme Color</div>
                          <div className="text-sm font-bold font-mono text-slate-900 mt-0.5 truncate flex items-center gap-1.5">
                            <span>{school.themeColor || "#4338CA"}</span>
                            <span className="text-[11px] font-normal text-slate-500">
                              ({THEME_PRESETS.find((p) => p.hex.toLowerCase() === (school.themeColor || "").toLowerCase())?.name || "Custom"})
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logout Modal */}
        <LogoutModal open={showLogout} onClose={() => setShowLogout(false)} />

        {/* Profile Image Cropper */}
        <ImageCropModal
          open={cropOpen}
          imageFile={cropFile}
          onClose={() => {
            setCropOpen(false);
            setCropFile(null);
          }}
          onCropComplete={handleProfileCropComplete}
          title="Crop Profile Photo"
          themeColor={theme}
        />
      </main>
    </div>
  );
}
