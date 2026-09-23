const KEY_STORAGE = "dashboardKey";

const state = {
  key: localStorage.getItem(KEY_STORAGE) || "",
  mode: "preview",
  instructors: [],
  inquiryTemplate: "",
};

const gate = document.querySelector("#gate");
const app = document.querySelector("#app");

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of [].concat(children)) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function setResult(id, kind, text) {
  const node = document.getElementById(id);
  node.className = `result${kind ? ` ${kind}` : ""}`;
  node.textContent = text || "";
}

function showGate(message) {
  app.hidden = true;
  gate.hidden = false;
  const error = document.querySelector("#gate-error");
  if (message) {
    error.hidden = false;
    error.textContent = message;
  } else {
    error.hidden = true;
    error.textContent = "";
  }
}

function showApp() {
  gate.hidden = true;
  app.hidden = false;
}

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (auth) headers["x-dashboard-key"] = state.key;
  const response = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) {
    const error = new Error(data.error || "Unauthorized");
    error.status = 401;
    throw error;
  }
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function formatWhen(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatStart(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) return iso || "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))));
}

function statusPill(status) {
  const kind =
    status === "sent" || status === "ok" ? "good" : status === "failed" || status === "partial" ? "bad" : "info";
  return el("span", { class: `pill ${kind}`, text: status || "logged" });
}

function renderOffers(offers) {
  const list = document.querySelector("#offer-list");
  const summary = document.querySelector("#offer-summary");
  const button = document.querySelector("#btn-send-offers");
  clear(list);
  const classCount = offers.batches.reduce((sum, batch) => sum + batch.classes.length, 0);
  document.querySelector("#stat-offers").textContent = String(offers.batches.length);
  if (offers.batches.length === 0) {
    summary.textContent = "Nothing is marked Offer with a tutor email.";
    button.disabled = true;
    button.textContent = "Send offers";
  } else {
    const emails = offers.batches.length === 1 ? "email" : "emails";
    const classes = classCount === 1 ? "class" : "classes";
    summary.textContent = `${classCount} ${classes} across ${offers.batches.length} ${emails}. Status moves to “Waiting for response” only after that tutor’s email succeeds.`;
    button.disabled = false;
    button.textContent = `Send ${offers.batches.length} ${emails}`;
  }

  offers.batches.forEach((batch) => {
    const rows = batch.classes.map((item) =>
      el("div", { class: "class-row" }, [
        el("div", {}, [
          el("strong", { text: item.className }),
          el("div", { class: "meta", text: item.schedule || "Schedule not set" }),
        ]),
        el("span", { class: "pill", text: item.daysUntilStart ? `${item.daysUntilStart}d` : "Offer" }),
      ])
    );
    list.append(
      el("article", { class: "person" }, [
        el("h3", { text: batch.tutorName || batch.email }),
        el("p", { class: "mono muted", text: batch.email }),
        ...rows,
        el("details", { class: "preview-block" }, [
          el("summary", { text: "Email preview" }),
          el("pre", { class: "email-body", text: batch.body }),
        ]),
      ])
    );
  });

  offers.skipped.forEach((item) => {
    list.append(
      el("article", { class: "class-row" }, [
        el("div", {}, [
          el("strong", { text: item.className || "Untitled class" }),
          el("div", { class: "meta", text: item.reason }),
        ]),
        el("span", { class: "pill bad", text: "Skipped" }),
      ])
    );
  });

  if (offers.batches.length === 0 && offers.skipped.length === 0) {
    list.append(el("p", { class: "empty", text: "The Working tab has no rows marked Offer." }));
  }
}

function instructorOptions(instructors) {
  return [
    el("option", { value: "", text: "Choose an instructor" }),
    ...instructors.map((person) =>
      el("option", {
        value: person.tutorEmail,
        text: `${person.tutorName}${person.icaStatus === "Expired" ? " · ICA expired" : ""}`,
        "data-name": person.tutorName,
        "data-ica": person.icaStatus || "",
      })
    ),
    el("option", { value: "custom", text: "Someone else" }),
  ];
}

function renderSubs(subs, instructors) {
  const list = document.querySelector("#sub-list");
  clear(list);
  document.querySelector("#stat-subs").textContent = String(subs.length);
  if (subs.length === 0) {
    list.append(el("p", { class: "empty", text: "No open sub requests. Rows marked Available on the Subs tab show up here." }));
    return;
  }
  subs.forEach((item) => {
    const select = el("select", { "aria-label": `Tutor for ${item.className}` }, instructorOptions(instructors));
    const custom = el("div", { class: "custom-fields", hidden: true }, [
      el("input", { type: "text", placeholder: "Tutor name", "aria-label": "Tutor name" }),
      el("input", { type: "email", placeholder: "tutor@email.com", "aria-label": "Tutor email" }),
    ]);
    const warning = el("p", { class: "warn-line", hidden: true });
    const button = el("button", { type: "button", text: "Send request" });
    const result = el("p", { class: "result" });

    select.addEventListener("change", () => {
      const customMode = select.value === "custom";
      custom.hidden = !customMode;
      const option = select.selectedOptions[0];
      const expired = option?.dataset.ica === "Expired";
      warning.hidden = !expired;
      warning.textContent = expired
        ? `${option.dataset.name}'s ICA is expired. You can still send this, but they may not be assignable.`
        : "";
    });

    button.addEventListener("click", async () => {
      let tutorEmail = "";
      let tutorName = "";
      if (select.value === "custom") {
        tutorName = custom.children[0].value.trim();
        tutorEmail = custom.children[1].value.trim();
      } else if (select.value) {
        tutorEmail = select.value;
        tutorName = select.selectedOptions[0]?.dataset.name || "";
      }
      if (!tutorEmail) {
        result.className = "result error";
        result.textContent = "Choose a tutor or enter an email.";
        return;
      }
      button.disabled = true;
      result.className = "result";
      result.textContent = "";
      try {
        const data = await api("/api/sub-request", {
          method: "POST",
          body: { ...item, tutorEmail, tutorName },
        });
        if (data.sent === false) {
          result.className = "result warn";
          result.textContent = data.error || "The email went out, but the sheet was not updated.";
        } else {
          result.className = "result ok";
          result.textContent = `Sent to ${data.to}.`;
        }
        await refresh();
      } catch (err) {
        if (err.status === 401) return showGate("That access key was not accepted.");
        result.className = "result error";
        result.textContent = err.message;
        button.disabled = false;
      }
    });

    list.append(
      el("article", { class: "sub-card" }, [
        el("div", { class: "sub-top" }, [
          el("h3", { text: item.className }),
          el("span", { class: "pill", text: "Available" }),
        ]),
        el("p", { class: "meta", text: [item.date, item.time && `${item.time} CT`, item.duration].filter(Boolean).join(" · ") }),
        el("div", { class: "sub-form" }, [el("label", {}, ["Tutor", select]), button]),
        custom,
        warning,
        result,
      ])
    );
  });
}

function renderIca(items) {
  const list = document.querySelector("#ica-list");
  clear(list);
  document.querySelector("#stat-ica").textContent = String(items.length);
  if (items.length === 0) {
    list.append(el("p", { class: "empty", text: "No tutors are currently blocked on an ICA." }));
    return;
  }
  items.forEach((item) => {
    const button = el("button", { type: "button", class: "mini", text: "Send reminder" });
    const result = el("p", { class: "result" });
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        const data = await api("/api/ica-reminder", { method: "POST", body: item });
        result.className = data.sent === false ? "result warn" : "result ok";
        result.textContent = data.sent === false ? data.error : `Reminder sent to ${item.tutorEmail}.`;
        await refresh();
      } catch (err) {
        if (err.status === 401) return showGate("That access key was not accepted.");
        result.className = "result error";
        result.textContent = err.message;
        button.disabled = false;
      }
    });
    list.append(
      el("article", { class: "ica-row person" }, [
        el("div", {}, [
          el("h3", { text: item.tutorName || "Unnamed tutor" }),
          el("p", { class: "meta", text: [item.className, item.tutorEmail].filter(Boolean).join(" · ") }),
          result,
        ]),
        button,
      ])
    );
  });
}

function renderNat(classes) {
  const list = document.querySelector("#nat-list");
  clear(list);
  document.querySelector("#stat-nat").textContent = String(classes.length);
  if (classes.length === 0) {
    list.append(el("p", { class: "empty", text: "No accepted classes start within 30 days." }));
    return;
  }
  classes.forEach((item) => {
    list.append(
      el("article", { class: "nat-row" }, [
        el("div", {}, [
          el("strong", { text: item.className }),
          el("div", {
            class: "meta",
            text: `${item.tutorName}${item.schedule ? ` · ${item.schedule}` : ""}${item.startDate ? ` · ${formatStart(item.startDate)}` : ""}`,
          }),
        ]),
        el("span", { class: "pill bad", text: `${item.daysUntilStart}d` }),
      ])
    );
  });
}

function renderActivity(entries, warning) {
  const list = document.querySelector("#activity-list");
  clear(list);
  if (warning) list.append(el("p", { class: "meta", text: warning }));
  if (!entries.length) {
    list.append(el("p", { class: "empty", text: "Sends and failures will be recorded here." }));
    return;
  }
  const body = el("tbody");
  entries.forEach((entry) => {
    const detail = el("details", {}, [
      el("summary", { text: "Detail" }),
      el("pre", { class: "detail", text: [entry.detail, entry.error].filter(Boolean).join("\n\n") || "No detail" }),
    ]);
    body.append(
      el("tr", {}, [
        el("td", { class: "mono", text: formatWhen(entry.timestamp) }),
        el("td", { text: entry.action }),
        el("td", {}, [statusPill(entry.status)]),
        el("td", { text: entry.recipient || "—" }),
        el("td", {}, [detail]),
      ])
    );
  });
  list.append(
    el("table", {}, [
      el("thead", {}, [
        el("tr", {}, ["When", "Action", "Status", "Recipient", "Detail"].map((label) => el("th", { text: label }))),
      ]),
      body,
    ])
  );
}

function renderColumns(columns) {
  const help = document.querySelector("#column-help");
  clear(help);
  const labels = [
    ["Working", columns.working],
    ["Subs", columns.subs],
    ["Instructors", columns.instructors],
    ["Activity Log", columns.activity],
  ];
  labels.forEach(([title, fields]) => {
    help.append(
      el("article", {}, [
        el("h3", { text: title }),
        el("ul", {}, fields.map((field) => el("li", { text: field }))),
      ])
    );
  });
}

function applyMode(mode) {
  state.mode = mode;
  const badge = document.querySelector("#mode-badge");
  badge.textContent = mode === "live" ? "Live" : "Preview";
  badge.className = mode === "live" ? "badge live" : "badge";
  document.querySelector("#simulate-label").hidden = mode !== "preview";
  const banner = document.querySelector("#banner");
  clear(banner);
  if (mode === "preview") {
    banner.hidden = false;
    banner.append(
      el("span", {
        text: "Preview mode. Emails are written to the activity log and nothing is sent. Add the Google credentials from .env.example to run against the real sheet.",
      }),
      el("button", { type: "button", class: "ghost", text: "Reset sample data", onClick: resetSample })
    );
  } else {
    banner.hidden = true;
  }
}

async function resetSample() {
  const button = document.querySelector("#banner button");
  if (button) button.disabled = true;
  try {
    await api("/api/reset", { method: "POST", body: {} });
    setResult("result-offers", "", "");
    setResult("result-nat", "", "");
    setResult("result-inquiry", "", "");
    await refresh();
  } catch (err) {
    if (err.status === 401) return showGate("That access key was not accepted.");
    setResult("result-offers", "error", err.message);
  }
}

async function refresh() {
  const [pending, activity] = await Promise.all([api("/api/pending"), api("/api/activity")]);
  applyMode(pending.mode);
  state.instructors = pending.instructors;
  state.inquiryTemplate = pending.templates.generalInquiry;
  document.querySelector("#inquiry-template").textContent = state.inquiryTemplate;
  const loadError = document.querySelector("#load-error");
  if (pending.warning) {
    loadError.hidden = false;
    loadError.textContent = pending.warning;
  } else {
    loadError.hidden = true;
  }
  renderOffers(pending.offers);
  renderSubs(pending.openSubs, pending.instructors);
  renderIca(pending.icaBlocked);
  renderNat(pending.nat);
  renderActivity(activity.entries, activity.warning);
}

async function unlock(key) {
  state.key = key.trim();
  localStorage.setItem(KEY_STORAGE, state.key);
  await refresh();
  showApp();
}

document.querySelector("#gate-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#access-key");
  try {
    await unlock(input.value);
  } catch (err) {
    localStorage.removeItem(KEY_STORAGE);
    state.key = "";
    showGate(err.status === 401 ? "That access key was not accepted." : err.message);
  }
});

document.querySelector("#btn-sign-out").addEventListener("click", () => {
  localStorage.removeItem(KEY_STORAGE);
  state.key = "";
  document.querySelector("#access-key").value = "";
  showGate("");
});

document.querySelector("#btn-send-offers").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  setResult("result-offers", "info", "Sending…");
  try {
    const data = await api("/api/offers", {
      method: "POST",
      body: { simulateFailure: document.querySelector("#simulate-failure").checked },
    });
    const sent = data.sent.length;
    const failed = data.failed.length;
    if (failed === 0) {
      setResult("result-offers", "ok", `Sent ${sent} ${sent === 1 ? "email" : "emails"}.`);
    } else {
      const lines = data.failed
        .map((item) => `${item.tutorName || item.email}: ${item.error}`)
        .join(" ");
      setResult(
        "result-offers",
        "warn",
        `Sent ${sent}. ${failed} failed and stayed marked Offer. ${lines}`
      );
    }
    await refresh();
  } catch (err) {
    if (err.status === 401) return showGate("That access key was not accepted.");
    setResult("result-offers", "error", err.message);
    button.disabled = false;
  }
});

document.querySelector("#btn-check-nat").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  setResult("result-nat", "info", "Checking…");
  try {
    const data = await api("/api/nat-window", { method: "POST", body: {} });
    if (data.flagged === 0) {
      setResult("result-nat", "ok", "Nothing due in the next 30 days.");
    } else {
      const slack = data.slackPosted
        ? "Posted to Slack."
        : data.slackWarning
          ? `Slack was not posted: ${data.slackWarning}`
          : "Slack was not notified.";
      setResult("result-nat", "warn", `${data.flagged} ${data.flagged === 1 ? "class needs" : "classes need"} a placement soon. ${slack}`);
    }
    await refresh();
  } catch (err) {
    if (err.status === 401) return showGate("That access key was not accepted.");
    setResult("result-nat", "error", err.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#inquiry-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = document.querySelector("#inquiry-email");
  const button = event.submitter;
  button.disabled = true;
  try {
    const data = await api("/api/inquiry", { method: "POST", body: { tutorEmail: input.value.trim() } });
    setResult("result-inquiry", "ok", `Reply sent to ${data.to}.`);
    input.value = "";
    await refresh();
  } catch (err) {
    if (err.status === 401) return showGate("That access key was not accepted.");
    setResult("result-inquiry", "error", err.message);
  } finally {
    button.disabled = false;
  }
});

document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => {
    document.getElementById(button.dataset.jump)?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

async function boot() {
  try {
    const health = await api("/api/health", { auth: false });
    renderColumns(health.columns);
    const hint = document.querySelector("#gate-hint");
    hint.textContent = health.previewHint ? "Local preview key: preview" : "Use the key from your Netlify environment variables.";
    document.querySelector("#inquiry-template").textContent = health.generalInquiry;
    if (!state.key) return showGate("");
    await unlock(state.key);
  } catch (err) {
    if (err.status === 401) {
      localStorage.removeItem(KEY_STORAGE);
      state.key = "";
      return showGate("That access key was not accepted.");
    }
    showGate(err.message || "The staffing desk API is not reachable.");
  }
}

boot();
