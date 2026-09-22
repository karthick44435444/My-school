"use client";

import { useEffect, useState } from "react";
import {
  Loader2, Save, LogOut, Camera, User, Mail, Phone,
  Lock, ChevronRight, Edit3, X, Building2, GraduationCap, KeyRound
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

export default function TeacherSettingsPage() {
  const { user, loading: authLoading } = useAuth(["TEACHER"]);
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"profile" | "password">("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [profile, setProfile] = useState<any>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const navigateToPassword = () => {
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

  if (!mounted || authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  const theme = user.themeColor || "#6366F1";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      <Sidebar user={user} />
      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 space-y-6 min-h-screen">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {view === "password" ? "Security & Passwords" : "Teacher Profile & Settings"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Manage your teacher profile and account credentials
            </p>
          </div>
        </div>

        {/* Change Password Subview */}
        {view === "password" ? (
          <ChangePasswordView onBack={navigateToProfile} themeColor={theme} />
        ) : (
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
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <GraduationCap className="w-3.5 h-3.5" />
                    Teacher / Faculty
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    {user.schoolName || "SchoolVajo"}
                  </span>
                </div>
              </div>
            </div>

            {/* Personal Information Card */}
            <div className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-slate-900">Personal Information</h3>
                    <p className="text-xs text-slate-500">View and update your personal details</p>
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
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 text-xs sm:text-sm font-bold transition cursor-pointer"
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-emerald-500"
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-emerald-500"
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
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none text-sm focus:ring-2 focus:ring-emerald-500"
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
                /* Read-Only Grid */
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
                      <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={profile.email || user.email || ""}>
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
                      <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={profile.phone || (user as any).phone || ""}>
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
                  <p className="text-xs text-slate-500">Manage account credentials and login security</p>
                </div>
              </div>

              <button
                type="button"
                onClick={navigateToPassword}
                className="w-full flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-emerald-50/40 hover:border-emerald-200 transition text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-emerald-600 transition">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 group-hover:text-emerald-600 transition">
                      Change Password
                    </div>
                    <div className="text-xs text-slate-500">
                      Update your login password to ensure account safety
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-emerald-600">
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
                <span>Log Out of Teacher Account</span>
              </button>
            </div>
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
