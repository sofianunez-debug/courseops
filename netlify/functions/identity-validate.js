const handler = async (event) => {
  const body = JSON.parse(event.body || "{}");
  const email = String(body.user?.email || "").trim().toLowerCase();
  if (!email.endsWith("@varsitytutors.com")) {
    return {
      statusCode: 403,
      body: "Use a Varsity Tutors Google account.",
    };
  }
  return { statusCode: 200 };
};

export { handler };
