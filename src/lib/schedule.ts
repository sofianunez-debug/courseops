import type { Course, Instructor, ProductType, RateType } from "../types";
import { todayISO } from "./format";

export function isEndedCourse(course: Course, today = todayISO()): boolean {
  return course.status === "Ended" || Boolean(course.endDate && course.endDate < today);
}

export function needsTutor(course: Course): boolean {
  if (course.status === "Ended" || course.status === "Cancelled") return false;
  return course.status === "Available" || !course.instructorName?.trim();
}

/**
 * Default roster order:
 * 1. Needs a tutor (Available, or no instructor)
 * 2. Waiting for response
 * 3. Assigned
 * 4. Cancelled
 * 5. Ended
 * Then earliest start date, then course name.
 */
export function rosterPriority(course: Course): number {
  const unassigned = !course.instructorName?.trim();
  if (course.status === "Ended") return 5;
  if (course.status === "Cancelled") return 4;
  if (course.status === "Waiting for response") return 2;
  if (course.status === "Assigned" && !unassigned) return 3;
  if (course.status === "Available" || unassigned) return 1;
  return 3;
}

export function compareRoster(a: Course, b: Course): number {
  const rank = rosterPriority(a) - rosterPriority(b);
  if (rank !== 0) return rank;
  const byDate = a.startDate.localeCompare(b.startDate);
  if (byDate !== 0) return byDate;
  return a.name.localeCompare(b.name);
}

export function matchesSearch(course: Course, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [course.id, course.name, course.subject, course.instructorName ?? "", course.instructorEmail ?? ""]
    .join("\n")
    .toLowerCase();
  return haystack.includes(needle);
}

export interface RosterFilters {
  search: string;
  rateType: RateType | "";
  subject: string;
  productType: ProductType | "";
  needsTutorOnly: boolean;
  hideEnded: boolean;
  today: string;
}

export function filterCourses(courses: Course[], filters: RosterFilters): { visible: Course[]; endedCount: number } {
  const matched = courses.filter((course) => {
    if (!matchesSearch(course, filters.search)) return false;
    if (filters.rateType && course.rateType !== filters.rateType) return false;
    if (filters.subject && course.subject !== filters.subject) return false;
    if (filters.productType && course.productType !== filters.productType) return false;
    if (filters.needsTutorOnly && !needsTutor(course)) return false;
    return true;
  });
  const endedCount = matched.filter((course) => isEndedCourse(course, filters.today)).length;
  const visible = (filters.hideEnded ? matched.filter((course) => !isEndedCourse(course, filters.today)) : matched)
    .slice()
    .sort(compareRoster);
  return { visible, endedCount };
}

function sameSubject(left: string, right: string): boolean {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

/** Greenlit instructors qualified for the placement subject, or who have taught it. */
export function suggestInstructors(course: Course, instructors: Instructor[], roster: Course[]): Instructor[] {
  return instructors
    .filter((instructor) => {
      if (!instructor.greenlit) return false;
      const qualified = instructor.qualifiedSubjects.some((subject) => sameSubject(subject, course.subject));
      const taught = instructor.taughtSubjects.some((subject) => sameSubject(subject, course.subject));
      const taughtOnRoster = roster.some(
        (other) =>
          other.id !== course.id &&
          sameSubject(other.subject, course.subject) &&
          Boolean(other.instructorEmail) &&
          other.instructorEmail!.trim().toLowerCase() === instructor.email.trim().toLowerCase() &&
          (other.status === "Assigned" || other.status === "Ended"),
      );
      return qualified || taught || taughtOnRoster;
    })
    .sort((a, b) => b.historicalTeachingCount - a.historicalTeachingCount || a.name.localeCompare(b.name));
}
