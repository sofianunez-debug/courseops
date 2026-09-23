import { plain } from "./schema.js";

export const TEMPLATES = {
  icaReminder: ({ name }) =>
    `Hey ${plain(name)}, we're so excited to get you assigned to your accepted live stream classes. ` +
    `Before we can do that, it looks like it's time to renew the live stream ICA. You can access it ` +
    `by logging into your profile. Please let us know once you've done that, and we can complete the ` +
    `assignment. Let us know if you have any questions.`,

  generalInquiry: () =>
    `Thank you for reaching out about teaching small group/live stream courses. Should an opportunity ` +
    `become available that's a good fit, you'll receive an email with next steps, including a contract ` +
    `specific to small group and onboarding materials. In the meantime, feel free to reach out if you ` +
    `have any questions.`,

  subRequest: ({ className, date, time, duration }) =>
    `Hi, hope you're doing well! We have a single-session opportunity and wanted to see if you're ` +
    `interested in covering it.\n\nClass: ${plain(className)}\nDate: ${plain(date)}\nTime: ${plain(time)} Central\n` +
    `Duration: ${plain(duration)}\n\nCourse materials are available and will be provided to help with ` +
    `preparation. Let us know if you're able to take this one!`,

  bulkOffer: ({ classes }) => {
    const noun = classes.length > 1 ? "opportunities" : "opportunity";
    const lines = classes
      .map((item) => `• ${plain(item.className)} — ${plain(item.schedule) || "schedule to be confirmed"}`)
      .join("\n");
    return (
      `Hi! We have the following live stream ${noun} available and think you'd be a great fit:\n\n` +
      `${lines}\n\nLet us know if you're interested and available for any of these.`
    );
  },
};

export const SUBJECTS = {
  offers: "New Live Stream Course Opportunities Available",
  ica: "Action Needed: Renew Your Live Stream ICA",
  inquiry: "Thanks for Your Interest in Group Courses",
  sub: (className) => `Sub Coverage Needed: ${plain(className)}`,
};
