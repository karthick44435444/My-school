// packages/shared/constants/plans.ts
import { Plan, PlanType, DurationKey, BillingCycle } from "../types";

export type PlanTierId = "STARTER" | "GROWTH" | "PRO";

export interface PlanDurationPrice {
  price: number;
  durationDays: number;
  label: string;
  billingInterval: string;
  badge?: string;
}

export interface PlanTierConfig {
  id: PlanTierId;
  name: string;
  tagline: string;
  popular?: boolean;
  isAvailable?: boolean;
  badge?: string;
  maxAdmins: number;
  maxPrincipals: number;
  maxTeachers: number;
  maxStudents: number;
  maxParents: number;
  features: string[];
  pricing: Record<DurationKey, PlanDurationPrice>;
}

export interface DurationOption {
  key: DurationKey;
  label: string;
  sublabel: string;
  days: number;
  isAvailable: boolean;
}

export const DURATION_OPTIONS: DurationOption[] = [
  {
    key: "1_MONTH",
    label: "1 Month",
    sublabel: "Monthly Billing",
    days: 30,
    isAvailable: true,
  },
  {
    key: "6_MONTHS",
    label: "6 Months",
    sublabel: "Term / Half-Year",
    days: 180,
    isAvailable: false,
  },
  {
    key: "1_YEAR",
    label: "1 Year",
    sublabel: "Annual Billing",
    days: 365,
    isAvailable: false,
  },
];

export const PLAN_TIERS: PlanTierConfig[] = [
  {
    id: "STARTER",
    name: "SchoolVajo Starter",
    tagline: "Essential school management with vital campus tools",
    popular: true,
    isAvailable: true,
    badge: "FREE TRIAL",
    maxAdmins: 1,
    maxPrincipals: 2,
    maxTeachers: 50,
    maxStudents: 1000,
    maxParents: 1000,
    features: [
      "1 Admin + 2 Principals",
      "Up to 50 Teachers",
      "Up to 1,000 Students & Parents",
      "Attendance, Homework & Marks",
      "Mobile App & Web Access",
      "Push Notifications & Announcements",
    ],
    pricing: {
      "1_MONTH": {
        price: 299,
        durationDays: 30,
        label: "1 Month",
        billingInterval: "1 Month",
        badge: "FREE TRIAL — ₹299",
      },
      "6_MONTHS": {
        price: 1499,
        durationDays: 180,
        label: "6 Months",
        billingInterval: "6 Months",
        badge: "Save 16%",
      },
      "1_YEAR": {
        price: 2899,
        durationDays: 365,
        label: "1 Year",
        billingInterval: "1 Year",
        badge: "Save 20%",
      },
    },
  },
  {
    id: "GROWTH",
    name: "SchoolVajo Growth",
    tagline: "Advanced analytics, exam ranks and higher capacity",
    popular: false,
    isAvailable: false,
    badge: "Upcoming",
    maxAdmins: 2,
    maxPrincipals: 5,
    maxTeachers: 100,
    maxStudents: 2000,
    maxParents: 2000,
    features: [
      "Everything in Starter Plan",
      "Up to 100 Teachers",
      "Up to 2,000 Students & Parents",
      "Advanced Analytics & Exam Ranks",
      "Priority Support & Daily Backups",
      "Custom Theme Color & Branding",
    ],
    pricing: {
      "1_MONTH": {
        price: 499,
        durationDays: 30,
        label: "1 Month",
        billingInterval: "1 Month",
        badge: "Upcoming",
      },
      "6_MONTHS": {
        price: 2499,
        durationDays: 180,
        label: "6 Months",
        billingInterval: "6 Months",
        badge: "Upcoming",
      },
      "1_YEAR": {
        price: 5899,
        durationDays: 365,
        label: "1 Year",
        billingInterval: "1 Year",
        badge: "Upcoming",
      },
    },
  },
  {
    id: "PRO",
    name: "SchoolVajo Pro",
    tagline: "Unlimited scale, multi-branch, and 24/7 dedicated support",
    popular: false,
    isAvailable: false,
    badge: "Upcoming",
    maxAdmins: 9999,
    maxPrincipals: 9999,
    maxTeachers: 99999,
    maxStudents: 99999,
    maxParents: 99999,
    features: [
      "Everything in Growth Plan",
      "Unlimited Teachers & Students",
      "Multi-branch & Academic Year Roll-over",
      "Advanced PDF Reports & Analytics",
      "VIP 24/7 Dedicated Support",
      "Custom School Domain",
    ],
    pricing: {
      "1_MONTH": {
        price: 999,
        durationDays: 30,
        label: "1 Month",
        billingInterval: "1 Month",
        badge: "Upcoming",
      },
      "6_MONTHS": {
        price: 4999,
        durationDays: 180,
        label: "6 Months",
        billingInterval: "6 Months",
        badge: "Upcoming",
      },
      "1_YEAR": {
        price: 9999,
        durationDays: 365,
        label: "1 Year",
        billingInterval: "1 Year",
        badge: "Upcoming",
      },
    },
  },
];

export interface SubscriptionPlanInfo {
  id: string;
  tierId: PlanTierId;
  durationKey: DurationKey;
  name: string;
  price: number;
  currency: string;
  billingInterval: string;
  durationDays: number;
  description: string;
  badge?: string;
  popular?: boolean;
  isAvailable?: boolean;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanInfo[] = [
  // Starter Tiers
  {
    id: "STARTER_1_MONTH",
    tierId: "STARTER",
    durationKey: "1_MONTH",
    name: "SchoolVajo Starter",
    price: 299,
    currency: "INR",
    billingInterval: "1 Month",
    durationDays: 30,
    description: "Complete essential school management for up to 50 teachers and 1,000 students",
    badge: "FREE TRIAL — ₹299",
    popular: true,
    isAvailable: true,
    features: [
      "1 Admin + 2 Principals",
      "Up to 50 Teachers",
      "Up to 1,000 Students & Parents",
      "Attendance, Homework & Marks",
      "Mobile App & Web Access",
      "Push Notifications & Announcements",
    ],
  },
  {
    id: "STARTER_6_MONTHS",
    tierId: "STARTER",
    durationKey: "6_MONTHS",
    name: "SchoolVajo Starter (6 Months)",
    price: 1499,
    currency: "INR",
    billingInterval: "6 Months",
    durationDays: 180,
    description: "Semester package with continuous access for up to 50 teachers and 1,000 students",
    badge: "Upcoming",
    popular: false,
    isAvailable: false,
    features: [
      "1 Admin + 2 Principals",
      "Up to 50 Teachers",
      "Up to 1,000 Students & Parents",
      "Attendance, Homework & Marks",
      "Mobile App & Web Access",
      "Push Notifications & Announcements",
    ],
  },
  {
    id: "STARTER_1_YEAR",
    tierId: "STARTER",
    durationKey: "1_YEAR",
    name: "SchoolVajo Starter (1 Year)",
    price: 2899,
    currency: "INR",
    billingInterval: "1 Year",
    durationDays: 365,
    description: "Annual academic package for up to 50 teachers and 1,000 students",
    badge: "Upcoming",
    popular: false,
    isAvailable: false,
    features: [
      "1 Admin + 2 Principals",
      "Up to 50 Teachers",
      "Up to 1,000 Students & Parents",
      "Attendance, Homework & Marks",
      "Mobile App & Web Access",
      "Push Notifications & Announcements",
    ],
  },

  // Growth Tiers
  {
    id: "GROWTH_1_MONTH",
    tierId: "GROWTH",
    durationKey: "1_MONTH",
    name: "SchoolVajo Growth",
    price: 499,
    currency: "INR",
    billingInterval: "1 Month",
    durationDays: 30,
    description: "Advanced analytics, exam ranks and higher capacity up to 100 teachers and 2,000 students",
    badge: "Upcoming",
    popular: false,
    isAvailable: false,
    features: [
      "Everything in Starter Plan",
      "Up to 100 Teachers",
      "Up to 2,000 Students & Parents",
      "Advanced Analytics & Exam Ranks",
      "Priority Support & Daily Backups",
      "Custom Theme Color & Branding",
    ],
  },
  {
    id: "GROWTH_6_MONTHS",
    tierId: "GROWTH",
    durationKey: "6_MONTHS",
    name: "SchoolVajo Growth (6 Months)",
    price: 2499,
    currency: "INR",
    billingInterval: "6 Months",
    durationDays: 180,
    description: "Semester package with analytics and priority backups up to 100 teachers and 2,000 students",
    badge: "Upcoming",
    popular: false,
    isAvailable: false,
    features: [
      "Everything in Starter Plan",
      "Up to 100 Teachers",
      "Up to 2,000 Students & Parents",
      "Advanced Analytics & Exam Ranks",
      "Priority Support & Daily Backups",
      "Custom Theme Color & Branding",
    ],
  },
  {
    id: "GROWTH_1_YEAR",
    tierId: "GROWTH",
    durationKey: "1_YEAR",
    name: "SchoolVajo Growth (1 Year)",
    price: 5899,
    currency: "INR",
    billingInterval: "1 Year",
    durationDays: 365,
    description: "Full academic year package with custom theme and priority support for medium schools",
    badge: "Upcoming",
    popular: false,
    isAvailable: false,
    features: [
      "Everything in Starter Plan",
      "Up to 100 Teachers",
      "Up to 2,000 Students & Parents",
      "Advanced Analytics & Exam Ranks",
      "Priority Support & Daily Backups",
      "Custom Theme Color & Branding",
    ],
  },

  // Pro Tiers
  {
    id: "PRO_1_MONTH",
    tierId: "PRO",
    durationKey: "1_MONTH",
    name: "SchoolVajo Pro",
    price: 999,
    currency: "INR",
    billingInterval: "1 Month",
    durationDays: 30,
    description: "Unlimited teachers & students with dedicated VIP 24/7 support and custom domain",
    badge: "Upcoming",
    popular: false,
    isAvailable: false,
    features: [
      "Everything in Growth Plan",
      "Unlimited Teachers & Students",
      "Multi-branch & Academic Year Roll-over",
      "Advanced PDF Reports & Analytics",
      "VIP 24/7 Dedicated Support",
      "Custom School Domain",
    ],
  },
  {
    id: "PRO_6_MONTHS",
    tierId: "PRO",
    durationKey: "6_MONTHS",
    name: "SchoolVajo Pro (6 Months)",
    price: 4999,
    currency: "INR",
    billingInterval: "6 Months",
    durationDays: 180,
    description: "6 months of unlimited campus capacity with multi-branch management and VIP SLA",
    badge: "Upcoming",
    popular: false,
    isAvailable: false,
    features: [
      "Everything in Growth Plan",
      "Unlimited Teachers & Students",
      "Multi-branch & Academic Year Roll-over",
      "Advanced PDF Reports & Analytics",
      "VIP 24/7 Dedicated Support",
      "Custom School Domain",
    ],
  },
  {
    id: "PRO_1_YEAR",
    tierId: "PRO",
    durationKey: "1_YEAR",
    name: "SchoolVajo Pro (1 Year)",
    price: 9999,
    currency: "INR",
    billingInterval: "1 Year",
    durationDays: 365,
    description: "Full annual unlimited tier with custom school domain and dedicated executive support",
    badge: "Upcoming",
    popular: false,
    isAvailable: false,
    features: [
      "Everything in Growth Plan",
      "Unlimited Teachers & Students",
      "Multi-branch & Academic Year Roll-over",
      "Advanced PDF Reports & Analytics",
      "VIP 24/7 Dedicated Support",
      "Custom School Domain",
    ],
  },
];

// Helper to resolve plan by any ID including legacy IDs
export function resolveSubscriptionPlan(planId?: string): SubscriptionPlanInfo {
  if (!planId) return SUBSCRIPTION_PLANS[0];
  const upper = planId.toUpperCase().trim();

  // Exact match in SUBSCRIPTION_PLANS
  const exact = SUBSCRIPTION_PLANS.find((p) => p.id === upper);
  if (exact) return exact;

  // Legacy & Alias mappings
  if (upper === "OFFER_MONTHLY" || upper === "BASIC" || upper === "STARTER" || upper === "STARTER_MONTHLY") {
    return SUBSCRIPTION_PLANS[0]; // STARTER_1_MONTH
  }
  if (upper === "TERM" || upper === "GROWTH_6_MONTHS" || upper === "STANDARD_TERM") {
    return SUBSCRIPTION_PLANS[4]; // GROWTH_6_MONTHS
  }
  if (upper === "STANDARD" || upper === "GROWTH" || upper === "GROWTH_MONTHLY") {
    return SUBSCRIPTION_PLANS[3]; // GROWTH_1_MONTH
  }
  if (upper === "ANNUAL" || upper === "PRO_1_YEAR" || upper === "PREMIUM_ANNUAL") {
    return SUBSCRIPTION_PLANS[8]; // PRO_1_YEAR
  }
  if (upper === "PREMIUM" || upper === "PRO" || upper === "PRO_MONTHLY") {
    return SUBSCRIPTION_PLANS[6]; // PRO_1_MONTH
  }

  return SUBSCRIPTION_PLANS[0];
}

export const PLANS: Plan[] = [
  {
    id: "STARTER" as any,
    name: "SchoolVajo Starter",
    monthlyPrice: 299,
    yearlyPrice: 2899,
    maxAdmins: 1,
    maxPrincipals: 2,
    maxTeachers: 50,
    maxStudents: 1000,
    maxParents: 1000,
    popular: true,
    isAvailable: true,
    badge: "FREE TRIAL",
    features: [
      "1 Admin + 2 Principals",
      "Up to 50 Teachers",
      "Up to 1,000 Students & Parents",
      "Attendance, Homework & Marks",
      "Mobile App & Web Access",
      "Push Notifications & Announcements",
    ],
  },
  {
    id: "GROWTH" as any,
    name: "SchoolVajo Growth",
    monthlyPrice: 499,
    yearlyPrice: 5899,
    maxAdmins: 2,
    maxPrincipals: 5,
    maxTeachers: 100,
    maxStudents: 2000,
    maxParents: 2000,
    isAvailable: false,
    badge: "Upcoming",
    features: [
      "Everything in Starter Plan",
      "Up to 100 Teachers",
      "Up to 2,000 Students & Parents",
      "Advanced Analytics & Exam Ranks",
      "Priority Support & Daily Backups",
      "Custom Theme Color & Branding",
    ],
  },
  {
    id: "PRO" as any,
    name: "SchoolVajo Pro",
    monthlyPrice: 999,
    yearlyPrice: 9999,
    maxAdmins: 9999,
    maxPrincipals: 9999,
    maxTeachers: 99999,
    maxStudents: 99999,
    maxParents: 99999,
    isAvailable: false,
    badge: "Upcoming",
    features: [
      "Everything in Growth Plan",
      "Unlimited Teachers & Students",
      "Multi-branch & Academic Year Roll-over",
      "Advanced PDF Reports & Analytics",
      "VIP 24/7 Dedicated Support",
      "Custom School Domain",
    ],
  },
];
