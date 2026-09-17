// packages/shared/constants/plans.ts
import { Plan } from "../types";

export interface SubscriptionPlanInfo {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingInterval: string;
  durationDays: number;
  description: string;
  badge?: string;
  popular?: boolean;
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanInfo[] = [
  {
    id: "OFFER_MONTHLY",
    name: "1-Month Special Offer",
    price: 99,
    currency: "INR",
    billingInterval: "1 Month",
    durationDays: 30,
    description: "Special introductory offer with complete access to all school features",
    badge: "Special Offer - ₹99",
    features: [
      "Student & Parent Mobile App & Web Portal",
      "Attendance, Homework & Class Schedule Tracking",
      "Exams, Timetables, Grading & Report Cards",
      "Real-time Push Notifications & Announcements",
      "Staff, Principal & Teacher Management",
      "Custom School Branding & Theme",
    ],
  },
  {
    id: "TERM",
    name: "Term Plan (6 Months)",
    price: 499,
    currency: "INR",
    billingInterval: "6 Months",
    durationDays: 180,
    description: "Ideal for semester and term-based school management",
    badge: "Popular Choice",
    popular: true,
    features: [
      "All Features in 1-Month Plan",
      "6 Months Uninterrupted Access",
      "Priority Support & Data Security",
      "Automated Database Backups",
      "Student & Staff Data Bulk Export",
      "Detailed Performance Analytics",
    ],
  },
  {
    id: "ANNUAL",
    name: "Annual Plan (1 Year)",
    price: 899,
    currency: "INR",
    billingInterval: "1 Year",
    durationDays: 365,
    description: "Best value for full academic year management and VIP support",
    badge: "Best Value - ₹899/year",
    features: [
      "All Features in Term Plan",
      "365 Days Full Academic Year Access",
      "VIP 24/7 Dedicated Support",
      "Unlimited Data Storage & Long Term Records",
      "Multi-session Roll-over Support",
      "Custom School Domain & Identity",
    ],
  },
];

export const PLANS: Plan[] = [
  {
    id: "BASIC",
    name: "1-Month Offer",
    monthlyPrice: 99,
    yearlyPrice: 899,
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
  },
  {
    id: "STANDARD",
    name: "Term Plan (6 Months)",
    monthlyPrice: 499,
    yearlyPrice: 899,
    maxAdmins: 2,
    maxPrincipals: 5,
    maxTeachers: 100,
    maxStudents: 2000,
    maxParents: 2000,
    features: [
      "Everything in 1-Month Plan",
      "Up to 100 Teachers",
      "Up to 2,000 Students & Parents",
      "Advanced Analytics & Exam Ranks",
      "Priority Support & Daily Backups",
      "Custom Theme Color & Branding",
    ],
    popular: true,
  },
  {
    id: "PREMIUM",
    name: "Annual Plan (1 Year)",
    monthlyPrice: 899,
    yearlyPrice: 899,
    maxAdmins: 5,
    maxPrincipals: 10,
    maxTeachers: 500,
    maxStudents: 10000,
    maxParents: 10000,
    features: [
      "Everything in Term Plan",
      "Unlimited Teachers & Students",
      "Multi-branch & Academic Year Roll-over",
      "Advanced PDF Reports & Analytics",
      "VIP 24/7 Dedicated Support",
      "Custom School Domain",
    ],
  },
];

