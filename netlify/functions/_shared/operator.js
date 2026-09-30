import { json } from "./http.js";

export function devAuthAllowed() {
  return process.env.COURSEOPS_DEV_AUTH === "preview" && !process.env.NETLIFY && process.env.CONTEXT !== "production";
}

function rolesOf(user) {
  return user?.roles || user?.appMetadata?.roles || user?.app_metadata?.roles || [];
}

export async function requireOperator() {
  if (devAuthAllowed()) {
    return { user: { email: "you@varsitytutors.com", name: "Preview user", roles: ["admin"] } };
  }
  const { getUser } = await import("@netlify/identity");
  const user = await getUser();
  const email = String(user?.email || "").trim().toLowerCase();
  if (!email) return { error: json({ error: "Sign in with your Varsity Tutors Google account." }, 401) };
  if (!email.endsWith("@varsitytutors.com")) {
    return { error: json({ error: "Use a Varsity Tutors Google account." }, 403) };
  }
  return {
    user: {
      email,
      name: user.name || user.userMetadata?.full_name || email,
      roles: rolesOf(user),
    },
  };
}
