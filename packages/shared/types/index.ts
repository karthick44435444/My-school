// packages/shared/types/index.ts

export type Role = "ADMIN" | "PRINCIPAL" | "TEACHER" | "STUDENT" | "PARENT";
export type TeacherType = "CLASS_TEACHER" | "SUBJECT_TEACHER";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type PlanType = "BASIC" | "STANDARD" | "PREMIUM";
export type BillingCycle = "MONTHLY" | "YEARLY";
export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | "HOLIDAY";
export type AnnouncementTarget = "ALL" | "PARENTS_ONLY" | "SPECIFIC_CLASS" | "SPECIFIC_SECTION" | "MY_STUDENTS";

export interface Plan {
  id: PlanType;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  maxAdmins: number;
  maxPrincipals: number;
  maxTeachers: number;
  maxStudents: number;
  maxParents: number;
  features: string[];
  popular?: boolean;
  badge?: string;
  isAvailable?: boolean;
}

export interface SchoolRegistrationInput {
  schoolName: string;
  location: string;
  email: string;
  phone?: string;
  logoUrl?: string;
  themeColor: string;
  plan: PlanType;
  billingCycle: BillingCycle;
}

export interface CreatePrincipalInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  education?: string;
  qualification?: string;
  gender?: Gender;
  photoUrl?: string;
}

export interface CreateTeacherInput {
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  gender: Gender;
  education?: string;
  qualification?: string;
  teacherType: TeacherType;
  classId?: string; // required if CLASS_TEACHER
  subjectIds?: string[];
  photoUrl?: string;
  employeeId?: string;
}

export interface CreateStudentInput {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  gender: Gender;
  dateOfBirth: string; // YYYY-MM-DD
  classId: string;
  section: string;
  admissionNo?: string;
  rollNo?: string;
  rollNumber?: string;
  photoUrl?: string;
  // Parent details
  parentName: string;
  parentEmail: string;
  parentPhone?: string;
}

export interface AuthUser {
  id: string;
  schoolId: string;
  schoolCode: string;
  role: Role;
  username: string;
  email: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  themeColor: string;
  schoolName: string;
  className?: string;
  section?: string;
  rollNumber?: string;
  rollNo?: string;
}

export interface WelcomePayload {
  greeting: string; // Good Morning / Afternoon / Evening
  name: string;
  photoUrl?: string;
  quote: string;
  message: string; // Have a nice day!
}
