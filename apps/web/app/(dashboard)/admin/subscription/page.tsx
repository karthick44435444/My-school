"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard, Check, Sparkles, AlertCircle, Clock, ShieldCheck,
  Calendar, ArrowRight, Zap, CheckCircle2, RefreshCw, Loader2, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import Sidebar from "@/components/dashboard/Sidebar";
import { useAuth, clearAuthCache } from "@/hooks/useAuth";
import type { SubscriptionPlanInfo } from "@myschool/shared";

export default function AdminSubscriptionPage() {
  const { user, loading: authLoading } = useAuth(["ADMIN"]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [selectedPlanToUpgrade, setSelectedPlanToUpgrade] = useState<SubscriptionPlanInfo | null>(null);

  useEffect(() => {
    if (!user) return;
    loadSubscription();
  }, [user]);

  const loadSubscription = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/subscription");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data.subscription);
      } else {
        toast.error("Failed to load subscription details");
      }
    } catch (e) {
      console.error(e);
      toast.error("Network error loading subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: SubscriptionPlanInfo) => {
    try {
      setUpgradingPlanId(plan.id);
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upgrade plan");
      }

      toast.success(data.message || "Plan successfully activated!");
      setSelectedPlanToUpgrade(null);
      clearAuthCache();
      await loadSubscription();
    } catch (error: any) {
      toast.error(error.message || "Failed to upgrade");
    } finally {
      setUpgradingPlanId(null);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  const isExpired = subscription?.isExpired;
  const daysLeft = subscription?.daysRemaining ?? 0;
  const expiryDate = subscription?.planExpiresAt
    ? new Date(subscription.planExpiresAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "--";

  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden w-full max-w-full">
      <Sidebar user={user} />

      <main className="lg:ml-64 pt-20 lg:pt-8 p-4 sm:p-6 lg:p-8 min-h-screen max-w-full overflow-x-hidden">
        {/* Header (No Refresh Status Button) */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase bg-indigo-100 text-indigo-700">
              Billing & Subscription
            </span>
            {loading ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase bg-slate-100 text-slate-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Checking Status...
              </span>
            ) : isExpired ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase bg-rose-100 text-rose-700 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Expired
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide uppercase bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            School Subscription Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your institutional plan, review renewal dates, and upgrade capacity.
          </p>
        </div>

        {/* Current Plan Overview Banner */}
        <div
          className={`relative rounded-3xl p-6 sm:p-8 mb-8 overflow-hidden text-white shadow-xl transition-all ${
            loading
              ? "bg-slate-900 animate-pulse"
              : isExpired
              ? "bg-gradient-to-br from-rose-600 via-rose-700 to-rose-900"
              : "bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900"
          }`}
        >
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-10 -top-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-200">
                  Current Active Plan
                </span>
              </div>

              {loading ? (
                <div className="space-y-3 py-1">
                  <div className="h-8 sm:h-10 w-64 bg-white/20 rounded-2xl animate-pulse" />
                  <div className="h-4 w-80 bg-white/10 rounded-xl animate-pulse" />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                    {subscription?.currentPlan?.name || "1-Month Special Offer"}
                  </h2>
                  <p className="text-sm text-indigo-100/90 mt-2 leading-relaxed">
                    {subscription?.currentPlan?.description || "Special introductory plan with complete access for teachers, students, and parents."}
                  </p>
                </>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold">
                  <Calendar className="w-4 h-4 text-indigo-200" />
                  {loading ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-200">Valid Until:</span>
                      <Loader2 className="w-3 h-3 animate-spin text-white" />
                    </div>
                  ) : (
                    <span>
                      Valid Until: <strong className="text-white font-bold">{expiryDate}</strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 text-xs font-semibold">
                  <Clock className="w-4 h-4 text-amber-300" />
                  {loading ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-indigo-200">Days Left:</span>
                      <Loader2 className="w-3 h-3 animate-spin text-amber-300" />
                    </div>
                  ) : (
                    <span>
                      {isExpired ? (
                        <strong className="text-rose-200">Expired ({Math.abs(daysLeft)} days ago)</strong>
                      ) : (
                        <span>
                          Remaining: <strong className="text-emerald-300 font-bold">{daysLeft} Days</strong>
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Price Pill / Rate */}
            <div className="flex flex-col items-start lg:items-end justify-center border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-8 shrink-0">
              <span className="text-xs text-indigo-200 uppercase font-bold tracking-wider">
                Active Rate
              </span>
              {loading ? (
                <div className="h-10 w-32 bg-white/20 rounded-2xl animate-pulse mt-1" />
              ) : (
                <div className="text-3xl sm:text-5xl font-black mt-1 flex items-baseline gap-1">
                  <span>₹{subscription?.currentPlan?.price ?? 99}</span>
                  <span className="text-sm font-medium text-indigo-200">
                    /{subscription?.currentPlan?.billingInterval || "1 Month"}
                  </span>
                </div>
              )}
              <span className="text-[11px] text-indigo-200/80 mt-1">
                Automated 7-day, 2-day & last-day reminders active
              </span>
            </div>
          </div>
        </div>

        {/* Plan Upgrade Selection */}
        <div className="mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Choose or Extend Your Subscription
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Select any plan to instantly recharge or upgrade. No hidden fees, instant activation.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch mb-10 w-full max-w-full pt-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 animate-pulse"
              >
                <div className="space-y-4">
                  <div className="h-6 w-32 bg-slate-200 rounded-xl" />
                  <div className="h-10 w-28 bg-slate-200 rounded-xl" />
                  <div className="h-4 w-full bg-slate-100 rounded-lg" />
                  <div className="h-4 w-3/4 bg-slate-100 rounded-lg" />
                  <div className="space-y-2 pt-4">
                    {Array.from({ length: 4 }).map((__, fi) => (
                      <div key={fi} className="h-3.5 w-full bg-slate-100 rounded-md" />
                    ))}
                  </div>
                </div>
                <div className="h-11 w-full bg-slate-200 rounded-2xl" />
              </div>
            ))
          ) : (
            (subscription?.availablePlans || []).map((plan: SubscriptionPlanInfo) => {
              const isCurrent = subscription?.planId === plan.id;
              const isOffer = plan.id === "OFFER_MONTHLY";
              const isAvailable = isOffer;

              return (
                <motion.div
                  key={plan.id}
                  whileHover={isAvailable ? { y: -4 } : undefined}
                  transition={{ duration: 0.2 }}
                  className={`relative rounded-3xl bg-white pt-8 pb-6 px-6 sm:pt-9 sm:pb-8 sm:px-8 border flex flex-col justify-between transition-all overflow-visible ${
                    isOffer
                      ? "border-indigo-600 ring-2 ring-indigo-600/20 shadow-xl"
                      : "border-slate-200 bg-slate-50/40 opacity-75 shadow-xs"
                  }`}
                >
                  <div
                    className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-white text-[11px] font-black uppercase tracking-wider shadow-lg whitespace-nowrap z-20 ${
                      isOffer
                        ? "bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-600 ring-2 ring-white"
                        : "bg-slate-500 ring-2 ring-white"
                    }`}
                  >
                    {isOffer ? "FREE TRIAL — ₹99" : (plan.badge || "UPCOMING")}
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      {isCurrent && !isExpired ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-extrabold border border-emerald-200">
                          Current
                        </span>
                      ) : !isAvailable ? (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold border border-slate-200">
                          Upcoming
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-2 mb-4 flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900">
                        ₹{plan.price.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        /{plan.billingInterval}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-relaxed mb-6">
                      {plan.description}
                    </p>

                    <div className="border-t border-slate-100 my-4" />

                    <ul className="space-y-2.5 mb-8">
                      {plan.features.map((feat, fi) => (
                        <li key={fi} className="flex items-start gap-2.5 text-xs text-slate-600">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isAvailable ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    {isAvailable ? (
                      <button
                        onClick={() => setSelectedPlanToUpgrade(plan)}
                        disabled={upgradingPlanId !== null}
                        className="w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-95"
                      >
                        {isCurrent ? (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Recharge / Extend</span>
                          </>
                        ) : (
                          <>
                            <span>Choose 1-Month Plan</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={true}
                        className="w-full py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                      >
                        <span>Upcoming Plan</span>
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Feature Policy & Security Box */}
        <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Subscription Guarantee & Expiration Rules
              </h3>
              <p className="text-xs text-slate-500">
                Reliable access with continuous institutional data protection
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 mt-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <strong className="block text-slate-900 font-bold mb-1">
                🔒 Data Retention & Security
              </strong>
              Even when a plan expires, student records, attendance, marks, and historical data remain 100% intact and restore instantly upon recharge.
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <strong className="block text-slate-900 font-bold mb-1">
                ⚡ Instant Roll-over
              </strong>
              Upgrading or recharging before expiry adds extra days to your current remaining balance seamlessly without loss.
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {selectedPlanToUpgrade && (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-indigo-600" />
              </div>

              <h3 className="text-xl font-black text-slate-900">
                Activate {selectedPlanToUpgrade.name}?
              </h3>

              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Confirm your subscription upgrade for{" "}
                <strong className="text-slate-900 font-bold">
                  ₹{selectedPlanToUpgrade.price} ({selectedPlanToUpgrade.billingInterval})
                </strong>
                . Access will be immediately active for your entire school.
              </p>

              <div className="my-6 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100/80 text-left space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Plan Duration:</span>
                  <span className="font-bold text-slate-900">
                    +{selectedPlanToUpgrade.durationDays} Days
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Total Price:</span>
                  <span className="font-bold text-indigo-600 text-sm">
                    ₹{selectedPlanToUpgrade.price}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Activation:</span>
                  <span className="font-bold text-emerald-600">Instant</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedPlanToUpgrade(null)}
                  disabled={upgradingPlanId !== null}
                  className="flex-1 py-3 px-4 rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpgrade(selectedPlanToUpgrade)}
                  disabled={upgradingPlanId !== null}
                  className="flex-1 py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition cursor-pointer"
                >
                  {upgradingPlanId ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Activate</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </div>
  );
}
