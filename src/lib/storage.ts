import type { Course, DashboardData, Instructor } from "../types";
import { normalizeCourse, normalizeInstructor } from "./model";
import { createSeed } from "./seed";

export const STORAGE_KEY = "vt.groupCourses.opsDashboard.v1";

export interface LoadedDashboard extends DashboardData {
  fromStorage: boolean;
  warning?: string;
}

export function loadDashboard(): LoadedDashboard {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...createSeed(), fromStorage: false };
    const parsed = JSON.parse(raw) as { courses?: unknown; instructors?: unknown };
    const courses = Array.isArray(parsed.courses)
      ? parsed.courses.map(normalizeCourse).filter((course): course is Course => course !== null)
      : [];
    const instructors = Array.isArray(parsed.instructors)
      ? parsed.instructors.map(normalizeInstructor).filter((instructor): instructor is Instructor => instructor !== null)
      : [];
    if (courses.length === 0 || instructors.length === 0) {
      return {
        ...createSeed(),
        fromStorage: false,
        warning: "Saved dashboard data was incomplete. Sample courses were loaded.",
      };
    }
    return { courses, instructors, fromStorage: true };
  } catch {
    return {
      ...createSeed(),
      fromStorage: false,
      warning: "Saved dashboard data could not be read. Sample courses were loaded.",
    };
  }
}

export function saveDashboard(data: DashboardData): void {
  const payload = {
    courses: data.courses,
    instructors: data.instructors,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function clearDashboard(): void {
  localStorage.removeItem(STORAGE_KEY);
}
