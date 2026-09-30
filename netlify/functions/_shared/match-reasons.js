import { env } from "./env.js";

export function aiEnabled() {
  return String(env("AI_ENABLED") || "").trim().toLowerCase() === "yes";
}

/** Rewrite subject-match reasons. Facts stay. On any failure, the original reasons are kept. */
export async function rewriteReasons(reasons) {
  if (!aiEnabled() || reasons.length === 0) return null;
  const OpenAI = (await import("openai")).default;
  const client = new OpenAI();
  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are the staffing agent. Rewrite each tutor match reason as one short sentence. Keep every fact that is already in the reason. Do not add tutors, classes, dates, or claims. Return JSON {\"reasons\":[...]} with the same number of items, in the same order.",
      },
      { role: "user", content: JSON.stringify(reasons) },
    ],
  });
  const text = completion.choices?.[0]?.message?.content || "";
  const parsed = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
  if (!Array.isArray(parsed.reasons) || parsed.reasons.length !== reasons.length) return null;
  return parsed.reasons.map((reason) => String(reason || "").trim());
}
