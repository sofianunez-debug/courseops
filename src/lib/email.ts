import type { Course, ProductType } from "../types";
import { firstName, formatDays, formatLongDate, formatMoney, formatPlainNumber, formatTime } from "./format";

export const EMAIL_SIGNOFF = "Best regards,\nSofia N & The Group Courses Operations Team";

export function offerSubject(courses: Course[]): string {
  const types = new Set<ProductType>(courses.map((course) => course.productType));
  let subject: string;
  if (types.size === 1 && types.has("Small Group")) {
    subject = "Varsity Tutors - New Small Group Course(s) Available Opportunities";
  } else if (types.size === 1 && types.has("Livestream")) {
    subject = "Varsity Tutors - New Livestream Course(s) Available Opportunities";
  } else {
    subject = "Varsity Tutors - New Livestream & Small Group Course(s) Available Opportunities";
  }
  if (courses.length > 1) subject += ` (${courses.length} Courses Available)`;
  return subject;
}

export function offerBody(instructorName: string, courses: Course[]): string {
  const options = courses
    .map((course, index) => {
      const dates = `${formatLongDate(course.startDate)} - ${formatLongDate(course.endDate)}`;
      const when = `${formatTime(course.time)} (${formatDays(course.daysOfWeek)})`;
      const pay = `${formatPlainNumber(course.duration)} hour(s) | Rate: $${formatMoney(course.rate)}/hr`;
      return `[Option ${index + 1}] ${course.name}\n  • Dates: ${dates}\n  • Time: ${when}\n  • Duration: ${pay}`;
    })
    .join("\n\n");

  return [
    `Hello ${firstName(instructorName)},`,
    "",
    "I hope this message finds you well! I wanted to reach out because we have some opportunities that match your expertise and availability. Below are the Course(s) we'd love to have you teach:",
    "",
    options,
    "",
    "Please review the course details above and let us know if you're able to take one or more of these classes!",
    "",
    "Looking forward to hearing from you,",
    "",
    EMAIL_SIGNOFF,
  ].join("\n");
}

export function mailtoHref(to: string, subject: string, body: string): string {
  return `mailto:${encodeURIComponent(to.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function openMailto(to: string, subject: string, body: string): { hrefLength: number } {
  const href = mailtoHref(to, subject, body);
  const anchor = document.createElement("a");
  anchor.href = href;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  return { hrefLength: href.length };
}
