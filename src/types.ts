export const RATE_TYPES = ["Test Prep", "Academic", "Professional Certification"] as const;
export const PRODUCT_TYPES = ["Livestream", "Small Group"] as const;
export const COURSE_STATUSES = [
  "Available",
  "Waiting for response",
  "Assigned",
  "Ended",
  "Cancelled",
] as const;
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type RateType = (typeof RATE_TYPES)[number];
export type ProductType = (typeof PRODUCT_TYPES)[number];
export type CourseStatus = (typeof COURSE_STATUSES)[number];
export type Weekday = (typeof WEEKDAYS)[number];

export interface Course {
  id: string;
  name: string;
  subject: string;
  rateType: RateType;
  productType: ProductType;
  startDate: string;
  endDate: string;
  daysOfWeek: string[];
  time: string;
  duration: number;
  rate: number;
  instructorName: string | null;
  instructorEmail: string | null;
  status: CourseStatus;
  workingOnIt: boolean;
  clientUrl: string;
  catalogUrl: string;
  internalNotes: string;
  noteToCoursesTeam: string;
}

export interface Instructor {
  name: string;
  email: string;
  qualifiedSubjects: string[];
  taughtSubjects: string[];
  greenlit: boolean;
  historicalTeachingCount: number;
}

export interface DashboardData {
  courses: Course[];
  instructors: Instructor[];
}
