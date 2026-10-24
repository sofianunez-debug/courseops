import type { Course, DashboardData, Instructor } from "../types";
import { mergeCourses, parseCsv } from "./csv";
import { normalizeCourse, normalizeInstructor } from "./model";

export interface RefreshSuccess extends DashboardData {
  ok: true;
  source: "supabase" | "starburst" | "google-sheet";
  message: string;
}

export interface RefreshFailure {
  ok: false;
  message: string;
}

export function supabaseConfigured(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL?.trim() && import.meta.env.VITE_SUPABASE_ANON_KEY?.trim());
}

export function sheetConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GOOGLE_SHEET_CSV_URL?.trim());
}

/**
 * Manual refresh order: Supabase, then the Starburst Netlify proxy, then a
 * published Google Sheet CSV. A failed source does not wipe the local roster.
 */
export async function refreshRemote(current: DashboardData): Promise<RefreshSuccess | RefreshFailure> {
  const notes: string[] = [];

  if (supabaseConfigured()) {
    try {
      const remote = await fetchSupabase();
      if (remote.courses.length === 0) notes.push("Supabase returned no courses.");
      else {
        return {
          ok: true,
          source: "supabase",
          courses: remote.courses,
          instructors: remote.instructors.length > 0 ? remote.instructors : current.instructors,
          message: `Loaded ${remote.courses.length} courses from Supabase.`,
        };
      }
    } catch (error) {
      notes.push(`Supabase request failed (${messageOf(error)}).`);
    }
  } else notes.push("Supabase is not configured.");

  try {
    const remote = await fetchStarburst();
    if (remote.courses.length > 0) {
      return {
        ok: true,
        source: "starburst",
        courses: remote.courses,
        instructors: remote.instructors.length > 0 ? remote.instructors : current.instructors,
        message: `Loaded ${remote.courses.length} courses from Starburst.`,
      };
    }
    notes.push(remote.detail);
  } catch (error) {
    notes.push(`Starburst proxy could not be read (${messageOf(error)}).`);
  }

  const sheetUrl = import.meta.env.VITE_GOOGLE_SHEET_CSV_URL?.trim();
  if (sheetUrl) {
    try {
      const response = await fetch(sheetUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Google Sheet responded ${response.status}`);
      const parsed = parseCsv(await response.text());
      const incoming = parsed.rows.flatMap((row) => (row.course ? [row.course] : []));
      if (incoming.length === 0) throw new Error("the sheet had no valid course rows");
      const merged = mergeCourses(current.courses, incoming);
      return {
        ok: true,
        source: "google-sheet",
        courses: merged.courses,
        instructors: current.instructors,
        message:
          merged.added.length > 0
            ? `Merged ${merged.added.length} courses from the Google Sheet.`
            : "The Google Sheet matched courses already on the roster. Nothing new was added.",
      };
    } catch (error) {
      notes.push(`Google Sheet backup failed (${messageOf(error)}).`);
    }
  } else notes.push("Google Sheet CSV URL is not configured.");

  return {
    ok: false,
    message: `Kept the roster saved in this browser. ${notes.join(" ")}`,
  };
}

async function fetchSupabase(): Promise<DashboardData> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!.trim(), import.meta.env.VITE_SUPABASE_ANON_KEY!.trim(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const coursesResult = await supabase.from("courses").select("*");
  if (coursesResult.error) throw new Error(coursesResult.error.message);
  const instructorsResult = await supabase.from("instructors").select("*");
  if (instructorsResult.error) throw new Error(instructorsResult.error.message);
  const courses = ((coursesResult.data ?? []) as unknown[]).map(normalizeCourse).filter((course): course is Course => course !== null);
  const instructors = ((instructorsResult.data ?? []) as unknown[])
    .map(normalizeInstructor)
    .filter((instructor): instructor is Instructor => instructor !== null);
  return { courses, instructors };
}

async function fetchStarburst(): Promise<{ courses: Course[]; instructors: Instructor[]; detail: string }> {
  const response = await fetch("/api/starburst-roster", { headers: { accept: "application/json" }, cache: "no-store" });
  const text = await response.text();
  let body: { error?: string; message?: string; courses?: unknown; instructors?: unknown } | null = null;
  try {
    body = JSON.parse(text) as { error?: string; message?: string; courses?: unknown; instructors?: unknown };
  } catch {
    body = null;
  }
  if (!body) {
    return {
      courses: [],
      instructors: [],
      detail: "Starburst proxy is not available on this dev server. Use netlify dev when you need the function.",
    };
  }
  const courses = Array.isArray(body.courses) ? body.courses.map(normalizeCourse).filter((course): course is Course => course !== null) : [];
  const instructors = Array.isArray(body.instructors)
    ? body.instructors.map(normalizeInstructor).filter((instructor): instructor is Instructor => instructor !== null)
    : [];
  if (!response.ok || courses.length === 0) {
    return { courses: [], instructors: [], detail: body.message || body.error || `Starburst returned ${response.status}.` };
  }
  return { courses, instructors, detail: "" };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}
