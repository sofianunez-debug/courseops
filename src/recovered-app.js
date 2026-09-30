import { At, f, k, oe, P, p } from "./runtime.js";

var jt = (0, f.createContext)(null);
function Mt(e) {
  let t = e?.email?.trim();
  return t
    ? { name: e?.name?.trim() || t, email: t, roles: e?.roles ?? [] }
    : null;
}
function Nt(e) {
  return e instanceof k && /redirect/i.test(e.message)
    ? ``
    : e instanceof k || e instanceof Error
      ? e.message
      : `Google sign-in did not finish.`;
}
function Pt() {
  if (typeof window > `u`) return ``;
  let e = new URLSearchParams(window.location.hash.replace(/^#/, ``)),
    t = e.get(`error_description`),
    n = e.get(`error`);
  return !t && !n
    ? ``
    : (window.history.replaceState(
        null,
        ``,
        window.location.pathname + window.location.search,
      ),
      (t || n || ``).replace(/\+/g, ` `));
}
function Ft(e) {
  return !!e?.roles.includes(`admin`);
}
function It({ children: e }) {
  let [t, n] = (0, f.useState)(!1),
    [r, i] = (0, f.useState)(null),
    [a, o] = (0, f.useState)(``);
  (0, f.useEffect)(() => {
    let e = () => {},
      t = !1;
    async function r() {
      let n = Pt();
      !t && n && o(n);
      try {
        let n = await At(() => Promise.resolve().then(() => oe), void 0);
        await n.getSettings();
        let r = await n.handleAuthCallback();
        (!t && r?.user ? i(Mt(r.user)) : t || i(Mt(await n.getUser())),
          (e = n.onAuthChange((e, t) => {
            i(Mt(t));
          })));
      } catch (e) {
        t || i(null);
        let n = Nt(e);
        !t && n && o(n);
      }
    }
    let a = new Promise((e) => setTimeout(e, 2e3));
    return (
      Promise.race([r(), a]).finally(() => {
        t || n(!0);
      }),
      () => {
        ((t = !0), e());
      }
    );
  }, []);
  let s = (0, f.useMemo)(
    () => ({
      ready: t,
      user: r,
      authError: a,
      async signInWithGoogle() {
        o(``);
        let { oauthLogin: e } = await At(
          async () => {
            let { oauthLogin: e } = await Promise.resolve().then(() => oe);
            return { oauthLogin: e };
          },
          void 0,
        );
        try {
          e(`google`);
        } catch (e) {
          let t = Nt(e);
          if (t) throw (o(t), e);
        }
      },
      async signOut() {
        r?.email;
        try {
          let { logout: e } = await At(
            async () => {
              let { logout: e } = await Promise.resolve().then(() => oe);
              return { logout: e };
            },
            void 0,
          );
          await e();
        } catch {
          i(null);
        }
      },
      usePreviewAccount() {
        i({
          name: `Preview user`,
          email: `you@varsitytutors.com`,
          roles: [`admin`],
        });
      },
    }),
    [a, t, r],
  );
  return (0, P.jsx)(jt.Provider, { value: s, children: e });
}
function Lt() {
  let e = (0, f.useContext)(jt);
  if (!e) throw Error(`useSession must be used within SessionProvider`);
  return e;
}
var Rt = [
  { id: `hub`, label: `Working Hub` },
  { id: `subs`, label: `Sub requests` },
  { id: `instructors`, label: `Instructors` },
  { id: `availability`, label: `Availability` },
];
function zt({
  children: e,
  user: t,
  activeSection: n,
  staffingPage: r,
  counts: i,
  modeLabel: a,
  showAdmin: o,
  onClassManagement: s,
  onStaffingPage: c,
  onSops: l,
  onAdmin: u,
  onSignOut: d,
  canSignOut: p,
}) {
  let [m, h] = (0, f.useState)(
    () => window.localStorage.getItem(`courseops-nav`) === `hidden`,
  );
  return (
    (0, f.useEffect)(() => {
      window.localStorage.setItem(`courseops-nav`, m ? `hidden` : `shown`);
    }, [m]),
    (0, P.jsxs)(`div`, {
      className: m ? `admin-shell admin-shell--nav-hidden` : `admin-shell`,
      children: [
        (0, P.jsxs)(`aside`, {
          className: `admin-shell__sidebar`,
          "aria-hidden": m,
          inert: m ? !0 : void 0,
          children: [
            (0, P.jsxs)(`div`, {
              className: `admin-shell__brand`,
              children: [
                (0, P.jsx)(`span`, {
                  className: `admin-shell__brand-mark`,
                  "aria-hidden": `true`,
                  children: `C`,
                }),
                (0, P.jsxs)(`div`, {
                  children: [
                    (0, P.jsx)(`p`, {
                      className: `admin-shell__brand-title`,
                      children: `Courseops`,
                    }),
                    (0, P.jsx)(`p`, {
                      className: `admin-shell__brand-subtitle`,
                      children: `Courses`,
                    }),
                  ],
                }),
              ],
            }),
            (0, P.jsxs)(`nav`, {
              className: `admin-shell__nav`,
              "aria-label": `Courseops`,
              children: [
                (0, P.jsx)(`button`, {
                  type: `button`,
                  className:
                    n === `class-management`
                      ? `admin-shell__item admin-shell__item--active`
                      : `admin-shell__item`,
                  "aria-current": n === `class-management` ? `page` : void 0,
                  onClick: s,
                  children: `Class Management`,
                }),
                (0, P.jsx)(`p`, {
                  className: `admin-shell__group`,
                  children: `Staffing`,
                }),
                Rt.map((e) => {
                  let t = n === `staffing-desk` && r === e.id,
                    a = i[e.id];
                  return (0, P.jsxs)(
                    `button`,
                    {
                      type: `button`,
                      className: t
                        ? `admin-shell__sub admin-shell__sub--active`
                        : `admin-shell__sub`,
                      "aria-current": t ? `page` : void 0,
                      onClick: () => c(e.id),
                      children: [
                        (0, P.jsx)(`span`, { children: e.label }),
                        (0, P.jsx)(`span`, {
                          className: `admin-shell__count`,
                          children: a ?? `–`,
                        }),
                      ],
                    },
                    e.id,
                  );
                }),
                (0, P.jsx)(`p`, {
                  className: `admin-shell__group`,
                  children: `Reference`,
                }),
                (0, P.jsx)(`button`, {
                  type: `button`,
                  className:
                    n === `sops`
                      ? `admin-shell__item admin-shell__item--active`
                      : `admin-shell__item`,
                  "aria-current": n === `sops` ? `page` : void 0,
                  onClick: l,
                  children: `SOPs`,
                }),
                o
                  ? (0, P.jsx)(`button`, {
                      type: `button`,
                      className:
                        n === `admin`
                          ? `admin-shell__item admin-shell__item--active`
                          : `admin-shell__item`,
                      "aria-current": n === `admin` ? `page` : void 0,
                      onClick: u,
                      children: `Admin`,
                    })
                  : null,
              ],
            }),
            a
              ? (0, P.jsx)(`p`, { className: `admin-shell__mode`, children: a })
              : null,
          ],
        }),
        (0, P.jsxs)(`div`, {
          className: `admin-shell__main`,
          children: [
            (0, P.jsxs)(`header`, {
              className: `account-bar`,
              children: [
                (0, P.jsx)(`button`, {
                  type: `button`,
                  className: `account-bar__menu`,
                  "aria-label": m ? `Show menu` : `Hide menu`,
                  title: m ? `Show menu` : `Hide menu`,
                  onClick: () => h((e) => !e),
                  children: (0, P.jsx)(Bt, { collapsed: m }),
                }),
                (0, P.jsxs)(`p`, {
                  className: `account-bar__who`,
                  children: [
                    (0, P.jsx)(`strong`, { children: t.name }),
                    (0, P.jsx)(`span`, { children: t.email }),
                  ],
                }),
                p
                  ? (0, P.jsx)(`button`, {
                      type: `button`,
                      className: `account-bar__signout`,
                      onClick: d,
                      children: `Sign out`,
                    })
                  : null,
              ],
            }),
            (0, P.jsx)(`div`, {
              className: `admin-shell__content`,
              children: e,
            }),
          ],
        }),
      ],
    })
  );
}
function Bt({ collapsed: e }) {
  return (0, P.jsxs)(`svg`, {
    width: `18`,
    height: `18`,
    viewBox: `0 0 24 24`,
    "aria-hidden": `true`,
    children: [
      (0, P.jsx)(`rect`, {
        x: `3`,
        y: `4`,
        width: `18`,
        height: `16`,
        rx: `2`,
        fill: `none`,
        stroke: `currentColor`,
        strokeWidth: `1.8`,
      }),
      (0, P.jsx)(`path`, {
        d: `M9 4v16`,
        fill: `none`,
        stroke: `currentColor`,
        strokeWidth: `1.8`,
      }),
      e
        ? (0, P.jsx)(`path`, {
            d: `M13.5 9.5 16.5 12l-3 2.5`,
            fill: `none`,
            stroke: `currentColor`,
            strokeWidth: `1.8`,
            strokeLinecap: `round`,
            strokeLinejoin: `round`,
          })
        : (0, P.jsx)(`path`, {
            d: `M16.5 9.5 13.5 12l3 2.5`,
            fill: `none`,
            stroke: `currentColor`,
            strokeWidth: `1.8`,
            strokeLinecap: `round`,
            strokeLinejoin: `round`,
          }),
    ],
  });
}
function Vt() {
  let { user: e } = Lt(),
    [t, n] = (0, f.useState)(null),
    r = Ft(e);
  return (
    (0, f.useEffect)(() => {
      if (!r) return;
      let e = !1;
      async function t() {
        try {
          let t = await fetch(`/api/health`),
            r = await t.json();
          e || n(t.ok ? r : { error: r.error || `Status is unavailable.` });
        } catch {
          e || n({ error: `Status is unavailable.` });
        }
      }
      return (
        t(),
        () => {
          e = !0;
        }
      );
    }, [r]),
    r
      ? (0, P.jsxs)(`article`, {
          className: `admin-panel`,
          children: [
            (0, P.jsxs)(`header`, {
              children: [
                (0, P.jsx)(`p`, {
                  className: `admin-panel__kicker`,
                  children: `Admin`,
                }),
                (0, P.jsx)(`h1`, { children: `Access and sign-in` }),
                (0, P.jsx)(`p`, {
                  children: `Only accounts with the admin role can open this page. Everyone else still uses Class Management, Staffing, and SOPs.`,
                }),
              ],
            }),
            (0, P.jsxs)(`section`, {
              children: [
                (0, P.jsx)(`h2`, { children: `Signed in` }),
                (0, P.jsxs)(`dl`, {
                  children: [
                    (0, P.jsxs)(`div`, {
                      children: [
                        (0, P.jsx)(`dt`, { children: `Name` }),
                        (0, P.jsx)(`dd`, { children: e?.name }),
                      ],
                    }),
                    (0, P.jsxs)(`div`, {
                      children: [
                        (0, P.jsx)(`dt`, { children: `VT email` }),
                        (0, P.jsx)(`dd`, { children: e?.email }),
                      ],
                    }),
                    (0, P.jsxs)(`div`, {
                      children: [
                        (0, P.jsx)(`dt`, { children: `Roles` }),
                        (0, P.jsx)(`dd`, {
                          children: e?.roles.length
                            ? e.roles.join(`, `)
                            : `None yet`,
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            (0, P.jsxs)(`section`, {
              children: [
                (0, P.jsx)(`h2`, { children: `Who is an admin` }),
                (0, P.jsxs)(`p`, {
                  children: [
                    `Everyone signs in with their Varsity Tutors Google account. A new account starts as staff. To grant this panel, open the Courseops site in Netlify, go to Project configuration, then Identity, open that person, and add the role `,
                    (0, P.jsx)(`strong`, { children: `admin` }),
                    `.`,
                  ],
                }),
              ],
            }),
            (0, P.jsxs)(`section`, {
              children: [
                (0, P.jsx)(`h2`, { children: `Desk` }),
                t ? null : (0, P.jsx)(`p`, { children: `Checking the desk…` }),
                t?.error ? (0, P.jsx)(`p`, { children: t.error }) : null,
                t && !t.error
                  ? (0, P.jsxs)(`dl`, {
                      children: [
                        (0, P.jsxs)(`div`, {
                          children: [
                            (0, P.jsx)(`dt`, { children: `Data` }),
                            (0, P.jsx)(`dd`, {
                              children:
                                t.mode === `live`
                                  ? `Live Google sheet`
                                  : `Preview, until the Google key is connected`,
                            }),
                          ],
                        }),
                        (0, P.jsxs)(`div`, {
                          children: [
                            (0, P.jsx)(`dt`, { children: `Slack` }),
                            (0, P.jsx)(`dd`, {
                              children: t.slackConfigured
                                ? `Connected`
                                : `Not connected`,
                            }),
                          ],
                        }),
                      ],
                    })
                  : null,
              ],
            }),
          ],
        })
      : (0, P.jsxs)(`article`, {
          className: `admin-panel`,
          children: [
            (0, P.jsx)(`h1`, { children: `Admins only` }),
            (0, P.jsx)(`p`, {
              children: `This panel is for people with the admin role on their Netlify account.`,
            }),
          ],
        })
  );
}
function Ht() {
  let { authError: e, signInWithGoogle: t, usePreviewAccount: n } = Lt(),
    [r, i] = (0, f.useState)(!1),
    [a, o] = (0, f.useState)(``);
  async function s() {
    (i(!0), o(``));
    try {
      await t();
    } catch (e) {
      (o(Nt(e)), i(!1));
    }
  }
  let c = a || e;
  return (0, P.jsx)(`main`, {
    className: `sign-in`,
    children: (0, P.jsxs)(`section`, {
      className: `sign-in__card`,
      children: [
        (0, P.jsx)(`p`, { className: `sign-in__brand`, children: `Courseops` }),
        (0, P.jsx)(`h1`, { children: `Sign in` }),
        (0, P.jsx)(`p`, {
          className: `sign-in__lead`,
          children: `Use your Varsity Tutors Google account. No separate password.`,
        }),
        c
          ? (0, P.jsx)(`p`, { className: `sign-in__error`, children: c })
          : null,
        (0, P.jsxs)(`button`, {
          type: `button`,
          className: `sign-in__google`,
          onClick: () => void s(),
          disabled: r,
          children: [
            (0, P.jsx)(Ut, {}),
            r ? `Opening Google…` : `Continue with Google`,
          ],
        }),
        null,
      ],
    }),
  });
}
function Ut() {
  return (0, P.jsxs)(`svg`, {
    width: `18`,
    height: `18`,
    viewBox: `0 0 18 18`,
    "aria-hidden": `true`,
    children: [
      (0, P.jsx)(`path`, {
        fill: `#4285F4`,
        d: `M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z`,
      }),
      (0, P.jsx)(`path`, {
        fill: `#34A853`,
        d: `M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18Z`,
      }),
      (0, P.jsx)(`path`, {
        fill: `#FBBC05`,
        d: `M3.98 10.72A5.4 5.4 0 0 1 3.7 9c0-.6.1-1.18.28-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.05l3.02-2.33Z`,
      }),
      (0, P.jsx)(`path`, {
        fill: `#EA4335`,
        d: `M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.02 2.33c.7-2.12 2.68-3.7 5.02-3.7Z`,
      }),
    ],
  });
}
var Wt = [
  {
    title: `Offering a live stream class`,
    body: [
      `Work the next 30 days of live stream classes. Small group stays off this queue because the NAT assigns those.`,
      `Open the class, check the VTWA calendar for that date and the following weeks, and offer a Priority tutor first. Use Standard next. Use Backup or Limited Use only when nobody else can take it. Trust the rate on the instructor profile. The working-tab rate is sometimes wrong.`,
      `Mark the row Offered with the tutor’s name. The sheet fills the email. Send offered courses in one email per tutor. The status becomes Waiting for response only after that email succeeds.`,
    ],
  },
  {
    title: `Waiting, accepted, and placement`,
    body: [
      `Give a waiting tutor about a week. If the class starts within 7 days, follow up today or tomorrow. No reply means clear them and offer the next person.`,
      `When they accept, the placement is due only inside 30 days. Open that class and follow the placement card: dummy client page, deactivate the NAT twice so it never hits the opportunity board, then assign the tutor.`,
      `Creating the placement earlier can get the tutor auto-unassigned. If the card says the placement is not due yet, wait.`,
    ],
  },
  {
    title: `ICA, drops, and subs`,
    body: [
      `Not in progress means the live stream ICA is missing or expired. Send the ICA reminder, then try the assignment again.`,
      `If an assigned tutor drops, unassign them on the placement and remove them from the Course UI. Both steps are required. The class goes back to Available.`,
      `Subs are live stream and AiGC only. Note each candidate in the order you offered them. The first tutor who accepts is the Sub Name. Course UI, tutor offset, and the invoice stay manual.`,
    ],
  },
  {
    title: `Instructors, availability, and inquiries`,
    body: [
      `Instructor profiles include the latest quarterly availability as a week calendar. Times may be in the tutor’s timezone. Convert them to Central before you offer. The working tab is Central.`,
      `A general inquiry gets one of the two holding replies from the group tutors inbox. Do not promise a class from that reply.`,
    ],
  },
];
function Gt() {
  return (0, P.jsxs)(`article`, {
    className: `sops`,
    children: [
      (0, P.jsxs)(`header`, {
        children: [
          (0, P.jsx)(`p`, { className: `sops__kicker`, children: `SOPs` }),
          (0, P.jsx)(`h1`, { children: `Live stream staffing` }),
          (0, P.jsx)(`p`, {
            children: `The working rules for group live stream classes. Open a class in Working Hub and the same steps are on that class.`,
          }),
        ],
      }),
      Wt.map((e) =>
        (0, P.jsxs)(
          `section`,
          {
            children: [
              (0, P.jsx)(`h2`, { children: e.title }),
              e.body.map((e) => (0, P.jsx)(`p`, { children: e }, e)),
            ],
          },
          e.title,
        ),
      ),
    ],
  });
}
var Kt = class extends Error {
  status;
  constructor(e, t) {
    (super(e), (this.name = `DeskApiError`), (this.status = t));
  }
};
async function qt(e, t = {}) {
  let n = {};
  t.body !== void 0 && (n[`Content-Type`] = `application/json`);
  let r = await fetch(e, {
      method: t.method || `GET`,
      headers: n,
      body: t.body === void 0 ? void 0 : JSON.stringify(t.body),
    }),
    i = await r.json().catch(() => ({}));
  if (!r.ok) throw new Kt(i.error || `Request failed`, r.status);
  return i;
}
function Jt() {
  return qt(`/api/pending`);
}
function Yt() {
  return qt(`/api/activity`);
}
function Xt(e) {
  return qt(`/api/working`, { method: `POST`, body: e });
}
function Zt(e) {
  return qt(`/api/offers`, { method: `POST`, body: { simulateFailure: e } });
}
function Qt(e) {
  return qt(`/api/sub-request`, { method: `POST`, body: e });
}
function $t(e) {
  return qt(`/api/ica-reminder`, { method: `POST`, body: e });
}
function en(e) {
  return qt(`/api/inquiry`, { method: `POST`, body: { tutorEmail: e } });
}
function tn() {
  return qt(`/.netlify/functions/check-nat-window`, {
    method: `POST`,
    body: {},
  });
}
function nn() {
  return qt(`/api/reset`, { method: `POST`, body: {} });
}
function saveTestRecipient(email) {
  return qt(`/api/test-recipient`, { method: `POST`, body: { email } });
}
function rn(e) {
  let t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e || ``);
  return t
    ? new Intl.DateTimeFormat(`en-US`, {
        timeZone: `UTC`,
        month: `short`,
        day: `numeric`,
        year: `numeric`,
      }).format(
        new Date(Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]))),
      )
    : e || ``;
}
function an(e, t) {
  let n = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e || ``);
  return n
    ? new Date(Date.UTC(Number(n[1]), Number(n[2]) - 1, Number(n[3]) + t))
        .toISOString()
        .slice(0, 10)
    : ``;
}
function on(e) {
  let t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(e || ``);
  if (!t) return null;
  let n = Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3])),
    r = new Date(),
    i = Date.UTC(r.getUTCFullYear(), r.getUTCMonth(), r.getUTCDate());
  return Math.round((n - i) / 864e5);
}
function sn(e) {
  let t = an(e, 90),
    n = t ? on(t) : null,
    r = `unknown`;
  return (
    n != null && (r = n < 0 ? `overdue` : n <= 21 ? `soon` : `current`),
    { due: t, remaining: n, tone: r }
  );
}
function cn(e) {
  return e === `Accepted` ||
    e === `Assigned` ||
    e === `sent` ||
    e === `ok` ||
    e === `Active` ||
    e === `Priority` ||
    e === `Confirmed` ||
    e === `Completed`
    ? `desk-pill desk-pill--good`
    : e === `Waiting for response` ||
        e === `NAT in Progress` ||
        e === `partial` ||
        e === `Backup` ||
        e === `Unconfirmed` ||
        e === `In Progress` ||
        e === `Starts Soon`
      ? `desk-pill desk-pill--warn`
      : e === `Declined` ||
          e === `Cancelled` ||
          e === `failed` ||
          e === `Expired` ||
          e === `Not in progress` ||
          e === `Limited Use` ||
          e === `Ended`
        ? `desk-pill desk-pill--bad`
        : e === `Offer` ||
            e === `Offered` ||
            e === `Available` ||
            e === `Standard` ||
            e === `Needs a sub`
          ? `desk-pill desk-pill--offer`
          : `desk-pill`;
}
function ln(e) {
  return e.open == null
    ? (e.daysLabel || ``).toLowerCase() === `ended`
      ? !1
      : e.status === `Available` ||
        e.status === `Offered` ||
        e.status === `Offer` ||
        e.status === `Waiting for response` ||
        e.status === `Accepted` ||
        e.status === `NAT in Progress` ||
        e.status === `Not in progress` ||
        e.status === `Declined` ||
        e.status === ``
    : e.open;
}
function un(e) {
  let t = (e || ``).trim();
  return t ? /live\s*stream/i.test(t) : !0;
}
function dn(e) {
  let t = (e.daysLabel || ``).toLowerCase();
  if (t === `ended`) return !1;
  if (t === `starts soon` || t === `in progress`) return !0;
  let n =
    typeof e.daysUntilStart == `number`
      ? e.daysUntilStart
      : Number(e.daysUntilStart);
  return Number.isFinite(n) && n >= 0 && n <= 30;
}
function fn(e) {
  return (e.completed || ``).toUpperCase() === `TRUE`
    ? `Completed`
    : e.subName
      ? (e.subConfirmed || ``).toUpperCase() === `TRUE`
        ? `Confirmed`
        : `Unconfirmed`
      : e.needsCoverage || e.status === `Available` || e.status === ``
        ? `Needs a sub`
        : e.status || `Needs a sub`;
}
var pn = [
  [`Mon`, `monday`],
  [`Tue`, `tuesday`],
  [`Wed`, `wednesday`],
  [`Thu`, `thursday`],
  [`Fri`, `friday`],
  [`Sat`, `saturday`],
  [`Sun`, `sunday`],
];
function mn({ pending: e }) {
  let [t, n] = (0, f.useState)(``),
    [r, i] = (0, f.useState)(``),
    a = (0, f.useMemo)(() => {
      let t = new Map();
      for (let n of e.availability) {
        let e = (
            n.tutorEmail ||
            n.tutorName ||
            String(n.rowNumber)
          ).toLowerCase(),
          r = t.get(e) || [];
        (r.push(n), t.set(e, r));
      }
      return [...t.entries()]
        .map(([e, t]) => {
          let n = [...t].sort((e, t) => t.submitted.localeCompare(e.submitted));
          return { key: e, latest: n[0], count: n.length };
        })
        .sort((e, t) => e.latest.tutorName.localeCompare(t.latest.tutorName));
    }, [e.availability]).filter((e) => {
      let n = t.trim().toLowerCase();
      if (!n) return !0;
      let r = e.latest;
      return [r.tutorName, r.tutorEmail, r.timezone, r.note]
        .join(` `)
        .toLowerCase()
        .includes(n);
    }),
    o = a.find((e) => e.key === r) || a[0] || null;
  return (0, P.jsxs)(`div`, {
    children: [
      (0, P.jsxs)(`header`, {
        className: `crm-page-head`,
        children: [
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`h2`, { children: `Availability` }),
              (0, P.jsx)(`p`, {
                children: `Quarterly form, collected even though staffing is about a month ahead. Latest answer per person. Weekday times may be in the tutor's timezone. The working tab is Central, so convert before you offer.`,
              }),
            ],
          }),
          (0, P.jsxs)(`label`, {
            className: `desk-field crm-search`,
            children: [
              `Search`,
              (0, P.jsx)(`input`, {
                value: t,
                onChange: (e) => n(e.target.value),
                placeholder: `Name, email, or timezone`,
              }),
            ],
          }),
        ],
      }),
      (0, P.jsxs)(`div`, {
        className: `crm-split`,
        children: [
          (0, P.jsx)(`div`, {
            className: `desk-table-wrap crm-table`,
            children: (0, P.jsxs)(`table`, {
              children: [
                (0, P.jsx)(`thead`, {
                  children: (0, P.jsxs)(`tr`, {
                    children: [
                      (0, P.jsx)(`th`, { children: `Instructor` }),
                      (0, P.jsx)(`th`, { children: `Timezone` }),
                      (0, P.jsx)(`th`, { children: `Collected` }),
                      (0, P.jsx)(`th`, { children: `Next due` }),
                    ],
                  }),
                }),
                (0, P.jsx)(`tbody`, {
                  children:
                    a.length === 0
                      ? (0, P.jsx)(`tr`, {
                          children: (0, P.jsx)(`td`, {
                            colSpan: 4,
                            className: `desk-empty`,
                            children: `No availability responses on the sheet.`,
                          }),
                        })
                      : a.map((e) =>
                          (0, P.jsx)(
                            hn,
                            {
                              row: e.latest,
                              count: e.count,
                              selected: o?.key === e.key,
                              onSelect: () => i(e.key),
                            },
                            e.key,
                          ),
                        ),
                }),
              ],
            }),
          }),
          o
            ? (0, P.jsx)(gn, { row: o.latest, count: o.count })
            : (0, P.jsx)(`aside`, {
                className: `crm-detail`,
                children: `No responses yet.`,
              }),
        ],
      }),
    ],
  });
}
function hn({ row: e, count: t, selected: n, onSelect: r }) {
  let i = sn(e.submitted),
    a =
      i.tone === `overdue`
        ? `Overdue`
        : i.tone === `soon`
          ? `Due soon`
          : i.tone === `current`
            ? `Current`
            : `Undated`,
    o =
      i.tone === `overdue`
        ? `desk-pill desk-pill--bad`
        : i.tone === `soon`
          ? `desk-pill desk-pill--warn`
          : `desk-pill desk-pill--good`;
  return (0, P.jsxs)(`tr`, {
    className: n ? `crm-row--on` : void 0,
    onClick: r,
    children: [
      (0, P.jsxs)(`td`, {
        children: [
          (0, P.jsx)(`strong`, { children: e.tutorName || e.tutorEmail }),
          (0, P.jsx)(`div`, {
            className: `desk-meta`,
            children: t > 1 ? `${t} responses` : e.tutorEmail,
          }),
        ],
      }),
      (0, P.jsx)(`td`, { children: e.timezone || `—` }),
      (0, P.jsx)(`td`, {
        children: e.submitted ? rn(e.submitted) : e.submittedLabel || `—`,
      }),
      (0, P.jsx)(`td`, {
        children: (0, P.jsx)(`span`, {
          className: i.tone === `unknown` ? cn(``) : o,
          children: a,
        }),
      }),
    ],
  });
}
function gn({ row: e, count: t }) {
  let n = sn(e.submitted),
    r = pn.some(([t, n]) => e[n]);
  return (0, P.jsxs)(`aside`, {
    className: `crm-detail`,
    children: [
      (0, P.jsx)(`h3`, { children: e.tutorName || e.tutorEmail }),
      (0, P.jsx)(`p`, {
        className: `desk-mono desk-meta`,
        children: e.tutorEmail,
      }),
      (0, P.jsxs)(`p`, {
        className: `desk-meta`,
        children: [
          e.timezone || `Timezone not set`,
          t > 1 ? ` · showing the latest of ${t}` : ``,
        ],
      }),
      r
        ? (0, P.jsx)(`dl`, {
            className: `week-grid`,
            children: pn.map(([t, n]) => {
              let r = e[n] || `—`,
                i = !e[n] || r === `Not Available`;
              return (0, P.jsxs)(
                `div`,
                {
                  children: [
                    (0, P.jsx)(`dt`, { children: t }),
                    (0, P.jsx)(`dd`, {
                      className: i ? `week-off` : void 0,
                      children: r,
                    }),
                  ],
                },
                n,
              );
            }),
          })
        : (0, P.jsx)(`p`, { children: e.days || `Days were not filled in.` }),
      (0, P.jsxs)(`dl`, {
        children: [
          e.hoursPerDay || e.hoursPerWeek
            ? (0, P.jsxs)(`div`, {
                children: [
                  (0, P.jsx)(`dt`, { children: `Hours` }),
                  (0, P.jsx)(`dd`, {
                    children: e.hoursPerDay || `${e.hoursPerWeek} hrs/week`,
                  }),
                ],
              })
            : null,
          e.backToBack
            ? (0, P.jsxs)(`div`, {
                children: [
                  (0, P.jsx)(`dt`, { children: `Back-to-back` }),
                  (0, P.jsx)(`dd`, { children: e.backToBack }),
                ],
              })
            : null,
          e.flexible
            ? (0, P.jsxs)(`div`, {
                children: [
                  (0, P.jsx)(`dt`, { children: `Start and end` }),
                  (0, P.jsx)(`dd`, { children: e.flexible }),
                ],
              })
            : null,
          e.prepAcknowledged
            ? (0, P.jsxs)(`div`, {
                children: [
                  (0, P.jsx)(`dt`, { children: `30-minute prep` }),
                  (0, P.jsx)(`dd`, { children: e.prepAcknowledged }),
                ],
              })
            : null,
        ],
      }),
      e.note ? (0, P.jsx)(`p`, { children: e.note }) : null,
      (0, P.jsxs)(`p`, {
        className: `desk-meta`,
        children: [
          `Collected `,
          e.submitted ? rn(e.submitted) : `on an unknown date`,
          `.`,
          n.due ? ` Next form is due ${rn(n.due)}.` : ``,
        ],
      }),
    ],
  });
}
var _n = { Priority: 0, Standard: 1, Backup: 2, "Limited Use": 3 },
  vn = [`All`, `Priority`, `Standard`, `Backup`, `Limited Use`],
  yn = [
    [`Mon`, `monday`],
    [`Tue`, `tuesday`],
    [`Wed`, `wednesday`],
    [`Thu`, `thursday`],
    [`Fri`, `friday`],
    [`Sat`, `saturday`],
    [`Sun`, `sunday`],
  ],
  bn = [
    { label: `8–10a`, start: `8:00 AM` },
    { label: `10a–1p`, start: `10:00 AM` },
    { label: `1–4p`, start: `1:00 PM` },
    { label: `4–7p`, start: `4:00 PM` },
    { label: `7–10p`, start: `7:00 PM` },
  ];
function xn(e) {
  let t = e.trim().split(/\s+/).filter(Boolean);
  return (
    (
      (t[0]?.[0] || ``) + (t.length > 1 ? t[t.length - 1][0] : ``)
    ).toUpperCase() || `?`
  );
}
function Sn(e) {
  let t = String(e || ``).trim(),
    n = new Set(),
    r = [];
  if (!t || /^not available$/i.test(t)) return { on: n, extra: `` };
  for (let e of t.split(`,`)) {
    let t = e.trim();
    if (!t || /^not available$/i.test(t)) continue;
    let i = t
        .replace(/\s*-\s*/g, ` - `)
        .replace(/\s+/g, ` `)
        .trim(),
      a = bn.find((e) => i.toLowerCase().startsWith(e.start.toLowerCase()));
    a ? n.add(a.start) : r.push(t);
  }
  return { on: n, extra: r.join(`, `) };
}
function Cn(e, t) {
  return t
    .filter((t) => t.tutorEmail.toLowerCase() === e.toLowerCase())
    .sort((e, t) => t.submitted.localeCompare(e.submitted))[0];
}
function wn({ pending: e, onRefresh: t }) {
  let [n, r] = (0, f.useState)(``),
    [i, a] = (0, f.useState)(`All`),
    [o, s] = (0, f.useState)(``),
    c = (0, f.useMemo)(() => {
      let t = n.trim().toLowerCase();
      return e.instructors
        .filter((e) =>
          i !== `All` && e.bgTier !== i
            ? !1
            : t
              ? [
                  e.tutorName,
                  e.tutorEmail,
                  e.subjects,
                  e.bgTier,
                  e.subjectNotes,
                ]
                  .join(` `)
                  .toLowerCase()
                  .includes(t)
              : !0,
        )
        .sort(
          (e, t) =>
            (_n[e.bgTier || ``] ?? 9) - (_n[t.bgTier || ``] ?? 9) ||
            e.tutorName.localeCompare(t.tutorName),
        );
    }, [e.instructors, n, i]),
    l = c.find((e) => e.tutorEmail === o) || c[0] || null,
    u = (0, f.useMemo)(() => {
      let t = new Map();
      for (let n of vn)
        t.set(
          n,
          n === `All`
            ? e.instructors.length
            : e.instructors.filter((e) => e.bgTier === n).length,
        );
      return t;
    }, [e.instructors]);
  return (0, P.jsxs)(`div`, {
    className: `profile-shell`,
    children: [
      (0, P.jsxs)(`section`, {
        className: `profile-list`,
        "aria-label": `Instructors`,
        children: [
          (0, P.jsxs)(`div`, {
            className: `profile-list__head`,
            children: [
              (0, P.jsxs)(`label`, {
                className: `queue-view-label`,
                children: [
                  `Tier`,
                  (0, P.jsx)(`select`, {
                    className: `queue-view`,
                    value: i,
                    onChange: (e) => a(e.target.value),
                    children: vn.map((e) =>
                      (0, P.jsxs)(
                        `option`,
                        { value: e, children: [e, ` (`, u.get(e) ?? 0, `)`] },
                        e,
                      ),
                    ),
                  }),
                ],
              }),
              (0, P.jsx)(`input`, {
                className: `queue-search`,
                value: n,
                onChange: (e) => r(e.target.value),
                placeholder: `Search name, subject, or email`,
                "aria-label": `Search instructors`,
              }),
              (0, P.jsxs)(`p`, {
                className: `queue-count`,
                children: [
                  c.length,
                  ` `,
                  c.length === 1 ? `instructor` : `instructors`,
                ],
              }),
              e.warning
                ? (0, P.jsx)(`p`, {
                    className: `desk-error`,
                    children: e.warning,
                  })
                : null,
            ],
          }),
          (0, P.jsx)(`div`, {
            className: `profile-list__items`,
            children:
              c.length === 0
                ? (0, P.jsx)(`p`, {
                    className: `desk-empty queue-empty`,
                    children: `No instructors match.`,
                  })
                : c.map((t) => {
                    let n = l?.tutorEmail === t.tutorEmail,
                      r = Cn(t.tutorEmail, e.availability);
                    return (0, P.jsxs)(
                      `button`,
                      {
                        type: `button`,
                        className: n
                          ? `profile-person profile-person--on`
                          : `profile-person`,
                        "aria-current": n ? `true` : void 0,
                        onClick: () => s(t.tutorEmail),
                        children: [
                          (0, P.jsx)(`span`, {
                            className: `profile-avatar`,
                            "aria-hidden": `true`,
                            children: xn(t.tutorName),
                          }),
                          (0, P.jsxs)(`span`, {
                            className: `profile-person__text`,
                            children: [
                              (0, P.jsx)(`span`, {
                                className: `profile-person__name`,
                                children: t.tutorName,
                              }),
                              (0, P.jsxs)(`span`, {
                                className: `profile-person__meta`,
                                children: [
                                  t.bgTier || `Tier not set`,
                                  r ? ` · Calendar on file` : ` · No calendar`,
                                ],
                              }),
                            ],
                          }),
                        ],
                      },
                      t.tutorEmail,
                    );
                  }),
          }),
        ],
      }),
      (0, P.jsx)(`section`, {
        className: `profile-main`,
        "aria-label": `Instructor profile`,
        children: l
          ? (0, P.jsx)(Tn, { person: l, pending: e, onRefresh: t })
          : (0, P.jsx)(`p`, {
              className: `desk-empty`,
              children: `Select an instructor.`,
            }),
      }),
    ],
  });
}
function Tn({ person: e, pending: t, onRefresh: n }) {
  let r = Cn(e.tutorEmail, t.availability),
    i = t.working.filter(
      (t) =>
        t.tutorEmail.toLowerCase() === e.tutorEmail.toLowerCase() &&
        (t.daysLabel || ``).toLowerCase() !== `ended`,
    ),
    a = e.subjects
      .split(`,`)
      .map((e) => e.trim())
      .filter(Boolean),
    o = r?.timezone && !/central/i.test(r.timezone),
    s = r ? sn(r.submitted) : null,
    c = r
      ? yn
          .map(([e, t]) => {
            let n = Sn(String(r[t] || ``));
            return n.extra ? `${e}: ${n.extra}` : ``;
          })
          .filter(Boolean)
      : [],
    [l, u] = (0, f.useState)(!1),
    [d, p] = (0, f.useState)(!1),
    [m, h] = (0, f.useState)(``),
    [g, _] = (0, f.useState)(``),
    v = l ? a : a.slice(0, 8);
  async function y() {
    (p(!0), h(``));
    try {
      let t = await en(e.tutorEmail);
      (_(`ok`), h(`Opportunities reply sent to ${t.to}.`), await n());
    } catch (e) {
      (_(`error`),
        h(e instanceof Error ? e.message : `Could not send the reply.`));
    } finally {
      p(!1);
    }
  }
  return (0, P.jsxs)(`article`, {
    className: `profile-card`,
    children: [
      (0, P.jsxs)(`header`, {
        className: `profile-card__head`,
        children: [
          (0, P.jsx)(`span`, {
            className: `profile-avatar profile-avatar--lg`,
            "aria-hidden": `true`,
            children: xn(e.tutorName),
          }),
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`h2`, { children: e.tutorName }),
              (0, P.jsx)(`p`, {
                className: `desk-mono desk-meta`,
                children: e.tutorEmail,
              }),
              (0, P.jsxs)(`p`, {
                className: `profile-card__facts`,
                children: [
                  (0, P.jsx)(`span`, {
                    className: cn(e.bgTier || `Standard`),
                    children: e.bgTier || `Tier not set`,
                  }),
                  (0, P.jsx)(`span`, {
                    children:
                      [e.instructorType, e.rate].filter(Boolean).join(` · `) ||
                      `Rate not listed`,
                  }),
                  e.profileUrl
                    ? (0, P.jsx)(`a`, {
                        href: e.profileUrl,
                        target: `_blank`,
                        rel: `noreferrer`,
                        children: `VT profile`,
                      })
                    : null,
                ],
              }),
            ],
          }),
        ],
      }),
      (0, P.jsxs)(`section`, {
        className: `profile-block`,
        children: [
          (0, P.jsx)(`h3`, { children: `Subjects` }),
          a.length === 0
            ? (0, P.jsx)(`p`, {
                className: `desk-meta`,
                children: `No subjects listed.`,
              })
            : (0, P.jsx)(`ul`, {
                className: `subject-chips`,
                children: v.map((e) => (0, P.jsx)(`li`, { children: e }, e)),
              }),
          a.length > 8
            ? (0, P.jsx)(`button`, {
                type: `button`,
                className: `desk-ghost profile-more`,
                onClick: () => u((e) => !e),
                children: l
                  ? `Show fewer subjects`
                  : `Show all ${a.length} subjects`,
              })
            : null,
          e.subjectNotes
            ? (0, P.jsx)(`p`, {
                className: `desk-warn`,
                children: e.subjectNotes,
              })
            : null,
        ],
      }),
      (0, P.jsxs)(`section`, {
        className: `profile-block`,
        children: [
          (0, P.jsx)(`h3`, { children: `Availability` }),
          r
            ? (0, P.jsxs)(P.Fragment, {
                children: [
                  (0, P.jsxs)(`p`, {
                    className: `desk-meta`,
                    children: [
                      r.timezone || `Timezone not set`,
                      r.submitted ? ` · collected ${rn(r.submitted)}` : ``,
                      s?.due ? ` · next form ${rn(s.due)}` : ``,
                      o
                        ? ` · convert these times to Central before you offer`
                        : ``,
                    ],
                  }),
                  (0, P.jsx)(En, { row: r }),
                  c.length > 0
                    ? (0, P.jsxs)(`p`, {
                        className: `desk-meta`,
                        children: [`Other notes on the form: `, c.join(` · `)],
                      })
                    : null,
                  (0, P.jsxs)(`dl`, {
                    className: `placement-facts`,
                    children: [
                      r.hoursPerDay || r.hoursPerWeek
                        ? (0, P.jsxs)(`div`, {
                            children: [
                              (0, P.jsx)(`dt`, { children: `Hours` }),
                              (0, P.jsx)(`dd`, {
                                children:
                                  r.hoursPerDay || `${r.hoursPerWeek} hrs/week`,
                              }),
                            ],
                          })
                        : null,
                      r.flexible
                        ? (0, P.jsxs)(`div`, {
                            children: [
                              (0, P.jsx)(`dt`, { children: `Start and end` }),
                              (0, P.jsx)(`dd`, { children: r.flexible }),
                            ],
                          })
                        : null,
                      r.backToBack
                        ? (0, P.jsxs)(`div`, {
                            children: [
                              (0, P.jsx)(`dt`, { children: `Back-to-back` }),
                              (0, P.jsx)(`dd`, { children: r.backToBack }),
                            ],
                          })
                        : null,
                      r.prepAcknowledged
                        ? (0, P.jsxs)(`div`, {
                            children: [
                              (0, P.jsx)(`dt`, { children: `30-minute prep` }),
                              (0, P.jsx)(`dd`, {
                                children: r.prepAcknowledged,
                              }),
                            ],
                          })
                        : null,
                    ],
                  }),
                  r.note ? (0, P.jsx)(`p`, { children: r.note }) : null,
                ],
              })
            : (0, P.jsx)(`p`, {
                className: `desk-meta`,
                children: `No quarterly availability form on file for this email.`,
              }),
        ],
      }),
      (0, P.jsxs)(`section`, {
        className: `profile-block`,
        children: [
          (0, P.jsx)(`h3`, { children: `Current classes` }),
          i.length === 0
            ? (0, P.jsx)(`p`, {
                className: `desk-meta`,
                children: `No open working-tab classes for this instructor.`,
              })
            : (0, P.jsx)(`ul`, {
                className: `profile-classes`,
                children: i
                  .slice(0, 8)
                  .map((e) =>
                    (0, P.jsxs)(
                      `li`,
                      {
                        children: [
                          (0, P.jsxs)(`span`, {
                            children: [
                              (0, P.jsx)(`strong`, { children: e.className }),
                              (0, P.jsx)(`span`, {
                                className: `desk-meta`,
                                children: [e.days, e.time, e.daysLabel]
                                  .filter(Boolean)
                                  .join(` · `),
                              }),
                            ],
                          }),
                          (0, P.jsx)(`span`, {
                            className: cn(e.status),
                            children: e.status || `Available`,
                          }),
                        ],
                      },
                      e.rowNumber,
                    ),
                  ),
              }),
          i.length > 8
            ? (0, P.jsxs)(`p`, {
                className: `desk-meta`,
                children: [i.length - 8, ` more current classes.`],
              })
            : null,
        ],
      }),
      (0, P.jsx)(`div`, {
        className: `desk-form`,
        children: (0, P.jsx)(`button`, {
          type: `button`,
          className: `desk-ghost`,
          disabled: d,
          onClick: () => void y(),
          children: `Send opportunities reply`,
        }),
      }),
      (0, P.jsxs)(`details`, {
        children: [
          (0, P.jsx)(`summary`, { children: `Reply that will be sent` }),
          (0, P.jsx)(`pre`, { children: t.templates.generalInquiry }),
        ],
      }),
      t.templates.generalInquiryAlternate
        ? (0, P.jsxs)(`details`, {
            children: [
              (0, P.jsx)(`summary`, { children: `Alternate reply` }),
              (0, P.jsx)(`pre`, {
                children: t.templates.generalInquiryAlternate,
              }),
            ],
          })
        : null,
      m
        ? (0, P.jsx)(`p`, {
            className: `desk-result desk-result--${g}`,
            children: m,
          })
        : null,
    ],
  });
}
function En({ row: e }) {
  let t = yn.map(([t, n]) => ({ label: t, ...Sn(String(e[n] || ``)) }));
  return (0, P.jsxs)(`div`, {
    className: `week-cal`,
    role: `img`,
    "aria-label": `Weekly availability`,
    children: [
      (0, P.jsx)(`div`, {}),
      t.map((e) =>
        (0, P.jsx)(
          `div`,
          { className: `week-cal__head`, children: e.label },
          e.label,
        ),
      ),
      bn.map((e) =>
        (0, P.jsxs)(
          f.Fragment,
          {
            children: [
              (0, P.jsx)(`div`, {
                className: `week-cal__time`,
                children: e.label,
              }),
              t.map((t) => {
                let n = t.on.has(e.start);
                return (0, P.jsx)(
                  `div`,
                  {
                    className: n
                      ? `week-cal__cell week-cal__cell--on`
                      : `week-cal__cell`,
                    title: `${t.label} ${e.start}${n ? `` : `, not available`}`,
                  },
                  `${t.label}-${e.start}`,
                );
              }),
            ],
          },
          e.start,
        ),
      ),
    ],
  });
}
function Dn({ pending: e, onRefresh: t }) {
  let [n, r] = (0, f.useState)(``),
    [i, a] = (0, f.useState)(null),
    o = (0, f.useMemo)(() => {
      let t = n.trim().toLowerCase(),
        r = [...e.subs].sort(
          (e, t) =>
            Number(fn(t) === `Needs a sub`) - Number(fn(e) === `Needs a sub`),
        );
      return t
        ? r.filter((e) =>
            [e.className, e.subName, e.subbingFor, e.note, e.date, fn(e)]
              .join(` `)
              .toLowerCase()
              .includes(t),
          )
        : r;
    }, [e.subs, n]),
    s = o.find((e) => e.rowNumber === i) || o[0] || null;
  return (0, P.jsxs)(`div`, {
    children: [
      (0, P.jsxs)(`header`, {
        className: `crm-page-head`,
        children: [
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`h2`, { children: `Sub requests` }),
              (0, P.jsx)(`p`, {
                children: `Live stream and AiGC only. Email from the group tutors inbox, note each candidate in the order you offered, and give it to the first tutor who accepts.`,
              }),
            ],
          }),
          (0, P.jsxs)(`label`, {
            className: `desk-field crm-search`,
            children: [
              `Search`,
              (0, P.jsx)(`input`, {
                value: n,
                onChange: (e) => r(e.target.value),
                placeholder: `Course, sub, or who they cover`,
              }),
            ],
          }),
        ],
      }),
      (0, P.jsxs)(`div`, {
        className: `crm-split`,
        children: [
          (0, P.jsx)(`div`, {
            className: `desk-table-wrap crm-table`,
            children: (0, P.jsxs)(`table`, {
              children: [
                (0, P.jsx)(`thead`, {
                  children: (0, P.jsxs)(`tr`, {
                    children: [
                      (0, P.jsx)(`th`, { children: `Course` }),
                      (0, P.jsx)(`th`, { children: `Session` }),
                      (0, P.jsx)(`th`, { children: `Sub` }),
                      (0, P.jsx)(`th`, { children: `Coverage` }),
                    ],
                  }),
                }),
                (0, P.jsx)(`tbody`, {
                  children:
                    o.length === 0
                      ? (0, P.jsx)(`tr`, {
                          children: (0, P.jsx)(`td`, {
                            colSpan: 4,
                            className: `desk-empty`,
                            children: `No sub requests on the sheet.`,
                          }),
                        })
                      : o.map((e) =>
                          (0, P.jsxs)(
                            `tr`,
                            {
                              className:
                                s?.rowNumber === e.rowNumber
                                  ? `crm-row--on`
                                  : void 0,
                              onClick: () => a(e.rowNumber),
                              children: [
                                (0, P.jsxs)(`td`, {
                                  children: [
                                    (0, P.jsx)(`strong`, {
                                      children: e.className,
                                    }),
                                    (0, P.jsx)(`div`, {
                                      className: `desk-meta`,
                                      children: e.subbingFor
                                        ? `For ${e.subbingFor}`
                                        : `Subbing for not set`,
                                    }),
                                  ],
                                }),
                                (0, P.jsx)(`td`, {
                                  children:
                                    [e.date, e.time]
                                      .filter(Boolean)
                                      .join(` · `) || `—`,
                                }),
                                (0, P.jsx)(`td`, {
                                  children: e.subName || `—`,
                                }),
                                (0, P.jsx)(`td`, {
                                  children: (0, P.jsx)(`span`, {
                                    className: cn(fn(e)),
                                    children: fn(e),
                                  }),
                                }),
                              ],
                            },
                            e.rowNumber,
                          ),
                        ),
                }),
              ],
            }),
          }),
          s
            ? (0, P.jsx)(On, {
                item: s,
                instructors: e.instructors,
                onRefresh: t,
              })
            : (0, P.jsx)(`aside`, {
                className: `crm-detail`,
                children: `No sub requests yet.`,
              }),
        ],
      }),
    ],
  });
}
function On({ item: e, instructors: t, onRefresh: n }) {
  let [r, i] = (0, f.useState)(``),
    [a, o] = (0, f.useState)(``),
    [s, c] = (0, f.useState)(``),
    [l, u] = (0, f.useState)(!1),
    [d, p] = (0, f.useState)({ kind: ``, text: `` });
  (0, f.useEffect)(() => {
    i(e.suggestion?.tutorEmail || ``);
  }, [e.rowNumber, e.suggestion?.tutorEmail]);
  let m = t.find((e) => e.tutorEmail === r),
    h =
      e.needsCoverage ??
      (e.status === `Available` ||
        e.status === `` ||
        e.status === `Offered` ||
        e.status === `Sub Request`),
    g = fn(e);
  async function _(t = !1) {
    let i = r === `custom` ? s.trim() : r,
      o = r === `custom` ? a.trim() : m?.tutorName || ``;
    if (!i) {
      p({ kind: `error`, text: `Choose a tutor or enter an email.` });
      return;
    }
    (u(!0), p({ kind: ``, text: `` }));
    try {
      let r = await Qt({ ...e, tutorEmail: i, tutorName: o, confirm: t });
      (p({
        kind: r.sent === !1 ? `warn` : `ok`,
        text:
          r.message ||
          (r.sent === !1
            ? r.error || `The email went out, but the sheet was not updated.`
            : t
              ? `${o} is confirmed. Add them in the Course UI.`
              : `Offered to ${r.to}. The sub name stays blank until they accept.`),
      }),
        await n());
    } catch (e) {
      p({
        kind: `error`,
        text: e instanceof Error ? e.message : `Could not send the request.`,
      });
    } finally {
      u(!1);
    }
  }
  return (0, P.jsxs)(`aside`, {
    className: `crm-detail`,
    children: [
      (0, P.jsx)(`h3`, { children: e.className }),
      (0, P.jsx)(`span`, { className: cn(g), children: g }),
      (0, P.jsx)(`p`, {
        className: `desk-meta`,
        children: [e.date, e.time, e.duration ? `${e.duration} hr` : ``]
          .filter(Boolean)
          .join(` · `),
      }),
      (0, P.jsxs)(`dl`, {
        children: [
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Subbing for` }),
              (0, P.jsx)(`dd`, { children: e.subbingFor || `Not set` }),
            ],
          }),
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Prep / total` }),
              (0, P.jsx)(`dd`, {
                children:
                  [
                    e.prepTime ? `${e.prepTime} prep` : ``,
                    e.totalHours ? `${e.totalHours} total` : ``,
                  ]
                    .filter(Boolean)
                    .join(` · `) || `Not set`,
              }),
            ],
          }),
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Invoice` }),
              (0, P.jsx)(`dd`, { children: e.invoiceAmount || `Not set` }),
            ],
          }),
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Entered by` }),
              (0, P.jsx)(`dd`, { children: e.enteredBy || `Not set` }),
            ],
          }),
        ],
      }),
      e.note ? (0, P.jsx)(`p`, { children: e.note }) : null,
      h
        ? (0, P.jsx)(`p`, {
            className: `desk-meta`,
            children: `After they accept, add them as a second instructor in the Course UI and leave the original tutor listed. Set Tutor Offset if they need prep time. Invoice the sub from their tutor profile after the session.`,
          })
        : null,
      h
        ? (0, P.jsxs)(P.Fragment, {
            children: [
              (0, P.jsxs)(`label`, {
                className: `desk-field`,
                children: [
                  `Tutor`,
                  (0, P.jsxs)(`select`, {
                    "aria-label": `Tutor for ${e.className}`,
                    value: r,
                    onChange: (e) => i(e.target.value),
                    children: [
                      (0, P.jsx)(`option`, {
                        value: ``,
                        children: `Choose an instructor`,
                      }),
                      t.map((e) =>
                        (0, P.jsxs)(
                          `option`,
                          {
                            value: e.tutorEmail,
                            children: [
                              e.tutorName,
                              e.bgTier === `Limited Use` ||
                              e.icaStatus === `Expired`
                                ? ` · ${e.bgTier || `ICA expired`}`
                                : ``,
                            ],
                          },
                          e.tutorEmail,
                        ),
                      ),
                      (0, P.jsx)(`option`, {
                        value: `custom`,
                        children: `Someone else`,
                      }),
                    ],
                  }),
                ],
              }),
              r === `custom`
                ? (0, P.jsxs)(P.Fragment, {
                    children: [
                      (0, P.jsxs)(`label`, {
                        className: `desk-field`,
                        children: [
                          `Tutor name`,
                          (0, P.jsx)(`input`, {
                            value: a,
                            onChange: (e) => o(e.target.value),
                          }),
                        ],
                      }),
                      (0, P.jsxs)(`label`, {
                        className: `desk-field`,
                        children: [
                          `Tutor email`,
                          (0, P.jsx)(`input`, {
                            type: `email`,
                            value: s,
                            onChange: (e) => c(e.target.value),
                            placeholder: `tutor@email.com`,
                          }),
                        ],
                      }),
                    ],
                  })
                : null,
              !e.tutorEmail && e.suggestion
                ? (0, P.jsx)(`p`, {
                    className: `desk-meta`,
                    children: e.suggestion.reason,
                  })
                : null,
              m?.bgTier === `Limited Use` || m?.icaStatus === `Expired`
                ? (0, P.jsxs)(`p`, {
                    className: `desk-warn`,
                    children: [
                      m.tutorName,
                      ` is `,
                      m.bgTier === `Limited Use`
                        ? `limited use`
                        : `marked with an expired ICA`,
                      `. You can still send this.`,
                    ],
                  })
                : null,
              (0, P.jsxs)(`div`, {
                className: `desk-form`,
                children: [
                  (0, P.jsx)(`button`, {
                    type: `button`,
                    className: `desk-ghost`,
                    disabled: l || !r,
                    onClick: () => void _(`assign`),
                    children: `Assign`,
                  }),
                  (0, P.jsx)(`button`, {
                    type: `button`,
                    disabled: l,
                    onClick: () => void _(),
                    children: `Email this tutor`,
                  }),
                  (0, P.jsx)(`button`, {
                    type: `button`,
                    className: `desk-ghost`,
                    disabled: l || !r,
                    onClick: () => void _(!0),
                    children: `They accepted`,
                  }),
                ],
              }),
            ],
          })
        : (0, P.jsxs)(`p`, {
            className: `desk-meta`,
            children: [`This request is already `, g.toLowerCase(), `.`],
          }),
      d.text
        ? (0, P.jsx)(`p`, {
            className: `desk-result desk-result--${d.kind}`,
            children: d.text,
          })
        : null,
    ],
  });
}
var kn = [
    `Next 30 days`,
    `Later`,
    `Available`,
    `Offered`,
    `Waiting for response`,
    `Accepted`,
    `Not in progress`,
    `ICA Needed`,
    `NAT in Progress`,
    `Assigned`,
    `All`,
  ],
  An = new Set([
    `Available`,
    `Offered`,
    `Offer`,
    `Waiting for response`,
    `Accepted`,
    `Not in progress`,
    `Declined`,
    `NAT in Progress`,
    ``,
  ]);
function jn(e, t) {
  let n = (e.daysLabel || ``).toLowerCase() === `ended`;
  if (t === `All`) return !0;
  if (t === `Next 30 days`) return !!e.open;
  if (t === `Later`) return un(e.productType) && !n && An.has(e.status || ``) && !dn(e);
  if (t === `Offered` || t === `ICA Needed` || t === `NAT in Progress`) return e.status === t && !n;
  return e.status === t && un(e.productType) && !n;
}
function Mn(e) {
  let t = (e.daysLabel || ``).toLowerCase();
  if (t === `in progress`) return -1;
  if (t === `starts soon`) return 2;
  let n = Number(e.daysUntilStart);
  return Number.isFinite(n) ? n : 400;
}
function Nn({ pending: e, activity: t, activityWarning: n, onRefresh: r }) {
  let [i, a] = (0, f.useState)(e.testCopy ? `Offered` : `Next 30 days`),
    [o, s] = (0, f.useState)(``),
    [c, l] = (0, f.useState)(null),
    [u, d] = (0, f.useState)(!1),
    [p, m] = (0, f.useState)(!1),
    [h, g] = (0, f.useState)(!1),
    [_, v] = (0, f.useState)({ kind: ``, text: `` }),
    [y, b] = (0, f.useState)({ kind: ``, text: `` }),
    [x, S] = (0, f.useState)(null),
    [C, w] = (0, f.useState)({ kind: ``, text: `` }),
    [mailTo, setMailTo] = (0, f.useState)(e.testRecipient || ``),
    [mailBusy, setMailBusy] = (0, f.useState)(!1),
    T = (0, f.useMemo)(() => {
      let t = o.trim().toLowerCase();
      return e.working
        .filter((e) =>
          jn(e, i)
            ? t
              ? [
                  e.className,
                  e.subject,
                  e.tutorName,
                  e.tutorEmail,
                  e.status,
                  e.month,
                  e.days,
                  e.workingOn,
                  e.productType,
                ]
                  .join(` `)
                  .toLowerCase()
                  .includes(t)
              : !0
            : !1,
        )
        .sort((e, t) => Mn(e) - Mn(t));
    }, [i, e.working, o]),
    E = T.find((e) => e.rowNumber === c) || T[0] || null,
    ee = E ? T.findIndex((e) => e.rowNumber === E.rowNumber) : -1,
    D = (0, f.useRef)(null),
    te = E
      ? e.offers.batches.find((e) =>
          e.classes.some((e) => e.rowNumber === E.rowNumber),
        )
      : void 0,
    ne = E ? e.icaBlocked.find((e) => e.rowNumber === E.rowNumber) : void 0;
  async function re() {
    (m(!0), v({ kind: ``, text: `Sending…` }));
    try {
      let e = await Zt(u),
        t = e.sent.length,
        n = e.failed.length;
      (v(
        n === 0
          ? { kind: `ok`, text: `Sent ${t} ${t === 1 ? `email` : `emails`}.` }
          : {
              kind: `warn`,
              text: `Sent ${t}. ${n} stayed marked Offered. ${e.failed.map((e) => `${e.tutorName || e.email}: ${e.error}`).join(` `)}`,
            },
      ),
        d(!1),
        await r());
    } catch (e) {
      v({
        kind: `error`,
        text: e instanceof Error ? e.message : `Could not send offers.`,
      });
    } finally {
      m(!1);
    }
  }
  async function ie() {
    (g(!0), b({ kind: ``, text: `Checking…` }));
    try {
      let e = await tn();
      (b(
        e.flagged === 0
          ? { kind: `ok`, text: `Nothing due in the next 30 days.` }
          : {
              kind: `warn`,
              text: `${e.flagged} ${e.flagged === 1 ? `class starts` : `classes start`} within 30 days and still need a placement. ${e.slackPosted ? `Posted to Slack.` : `Slack was not notified.`}`,
            },
      ),
        await r());
    } catch (e) {
      b({
        kind: `error`,
        text:
          e instanceof Error ? e.message : `Could not check the NAT window.`,
      });
    } finally {
      g(!1);
    }
  }
  async function ae(e) {
    (S(e.rowNumber), w({ kind: ``, text: `` }));
    try {
      let t = await $t(e);
      (w({
        kind: t.sent === !1 ? `warn` : `ok`,
        text:
          t.sent === !1
            ? t.error || `The reminder was not recorded.`
            : `Reminder sent to ${e.tutorEmail}.`,
      }),
        await r());
    } catch (e) {
      w({
        kind: `error`,
        text: e instanceof Error ? e.message : `Could not send the reminder.`,
      });
    } finally {
      S(null);
    }
  }
  let oe = (0, f.useMemo)(() => {
    let t = new Map();
    for (let n of kn) t.set(n, e.working.filter((e) => jn(e, n)).length);
    return t;
  }, [e.working]);
  ((0, f.useEffect)(() => {
    D.current?.scrollIntoView({ block: `nearest` });
  }, [E?.rowNumber, i]),
    (0, f.useEffect)(() => {
      function e(e) {
        let t = e.target;
        if (t instanceof HTMLElement && t.closest(`input, textarea, select`))
          return;
        let n = e.key === `j` || e.key === `ArrowDown`,
          r = e.key === `k` || e.key === `ArrowUp`;
        if (!n && !r) return;
        e.preventDefault();
        let i = T[ee + (n ? 1 : -1)];
        i && l(i.rowNumber);
      }
      return (
        window.addEventListener(`keydown`, e),
        () => window.removeEventListener(`keydown`, e)
      );
    }, [T, ee]));
  let se = (0, f.useMemo)(
    () => new Set(e.nat.map((e) => e.rowNumber)),
    [e.nat],
  );
  (0, f.useEffect)(() => {
    setMailTo(e.testRecipient || ``);
  }, [e.testRecipient]);
  async function saveMail() {
    (setMailBusy(!0), v({ kind: ``, text: `` }));
    try {
      let result = await saveTestRecipient(mailTo.trim());
      (v({
        kind: `ok`,
        text: result.testRecipient
          ? `Test mail goes to ${result.testRecipient}.`
          : `Test recipient cleared.`,
      }),
        await r());
    } catch (err) {
      v({
        kind: `error`,
        text: err instanceof Error ? err.message : `Could not save the test recipient.`,
      });
    } finally {
      setMailBusy(!1);
    }
  }
  return (0, P.jsxs)(`div`, {
    className: `queue-shell`,
    children: [
      e.testCopy
        ? (0, P.jsx)(`div`, {
            className: `desk-banner queue-banner`,
            children: `Test copy. Send test offers posts Offered rows to the Make clone. Tutor emails in the sheet stay as they are.`,
          })
        : null,
      e.mode === `preview`
        ? (0, P.jsxs)(`div`, {
            className: `desk-banner queue-banner`,
            children: [
              (0, P.jsx)(`span`, {
                children:
                  e.previewSource === `sheet-copy`
                    ? `This is a saved copy of the working sheet. Push an update from the test spreadsheet to refresh it.`
                    : `No published workbook yet. Connect the sheet web app on this deploy.`,
              }),
              (0, P.jsx)(`button`, {
                type: `button`,
                className: `desk-ghost`,
                onClick: () => {
                  nn().then(() => r());
                },
                children:
                  e.previewSource === `sheet-copy`
                    ? `Reload sheet copy`
                    : `Reset sample data`,
              }),
            ],
          })
        : null,
      (0, P.jsxs)(`div`, {
        className: `queue`,
        children: [
          (0, P.jsxs)(`section`, {
            className: `queue-list`,
            "aria-label": `Class queue`,
            children: [
              (0, P.jsxs)(`div`, {
                className: `queue-list__head`,
                children: [
                  (0, P.jsxs)(`label`, {
                    className: `queue-view-label`,
                    children: [
                      `View`,
                      (0, P.jsx)(`select`, {
                        className: `queue-view`,
                        value: i,
                        onChange: (e) => a(e.target.value),
                        children: kn.map((e) =>
                          (0, P.jsxs)(
                            `option`,
                            {
                              value: e,
                              children: [e, ` (`, oe.get(e) ?? 0, `)`],
                            },
                            e,
                          ),
                        ),
                      }),
                    ],
                  }),
                  (0, P.jsx)(`input`, {
                    className: `queue-search`,
                    value: o,
                    onChange: (e) => s(e.target.value),
                    placeholder: `Search course, subject, or tutor`,
                    "aria-label": `Search the queue`,
                  }),
                  (0, P.jsxs)(`p`, {
                    className: `queue-count`,
                    children: [
                      T.length,
                      ` `,
                      T.length === 1 ? `class` : `classes`,
                      o.trim() ? ` match this search` : ` in this view`,
                    ],
                  }),
                  e.nat.length > 0
                    ? (0, P.jsxs)(`div`, {
                        className: `queue-alert`,
                        children: [
                          (0, P.jsxs)(`span`, {
                            children: [
                              e.nat.length,
                              ` accepted `,
                              e.nat.length === 1
                                ? `class needs`
                                : `classes need`,
                              ` a placement inside 30 days.`,
                            ],
                          }),
                          (0, P.jsx)(`button`, {
                            type: `button`,
                            className: `desk-ghost`,
                            disabled: h,
                            onClick: () => void ie(),
                            children: `Check now`,
                          }),
                        ],
                      })
                    : null,
                  y.text
                    ? (0, P.jsx)(`p`, {
                        className: `desk-result desk-result--${y.kind}`,
                        children: y.text,
                      })
                    : null,
                ],
              }),
              (0, P.jsx)(`div`, {
                className: `queue-list__items`,
                children:
                  T.length === 0
                    ? (0, P.jsx)(`p`, {
                        className: `desk-empty queue-empty`,
                        children: `No classes in this view.`,
                      })
                    : T.map((e) => {
                        let t = E?.rowNumber === e.rowNumber,
                          n =
                            e.daysLabel ||
                            (e.daysUntilStart === ``
                              ? ``
                              : `${e.daysUntilStart} days until start`);
                        return (0, P.jsxs)(
                          `button`,
                          {
                            type: `button`,
                            ref: t ? D : void 0,
                            className: t
                              ? `queue-item queue-item--on`
                              : `queue-item`,
                            "aria-current": t ? `true` : void 0,
                            onClick: () => l(e.rowNumber),
                            children: [
                              (0, P.jsx)(`span`, {
                                className: `queue-item__title`,
                                children: e.className,
                              }),
                              (0, P.jsx)(`span`, {
                                className: `queue-item__meta`,
                                children:
                                  [
                                    e.subject,
                                    [e.days, e.time].filter(Boolean).join(` `),
                                    n,
                                  ]
                                    .filter(Boolean)
                                    .join(` · `) || `Schedule not set`,
                              }),
                              (0, P.jsxs)(`span`, {
                                className: `queue-item__foot`,
                                children: [
                                  (0, P.jsx)(`span`, {
                                    className: `queue-item__who`,
                                    children: e.tutorName || `Unassigned`,
                                  }),
                                  (0, P.jsx)(`span`, {
                                    className: cn(e.status),
                                    children: e.status || `Available`,
                                  }),
                                  se.has(e.rowNumber)
                                    ? (0, P.jsx)(`span`, {
                                        className: `queue-due`,
                                        children: `Placement due`,
                                      })
                                    : null,
                                ],
                              }),
                            ],
                          },
                          e.rowNumber,
                        );
                      }),
              }),
            ],
          }),
          (0, P.jsxs)(`section`, {
            className: `queue-ticket`,
            "aria-label": `Open class`,
            children: [
              (0, P.jsxs)(`div`, {
                className: `queue-ticket__bar`,
                children: [
                  (0, P.jsxs)(`div`, {
                    className: `queue-pager`,
                    children: [
                      (0, P.jsx)(`button`, {
                        type: `button`,
                        className: `desk-ghost`,
                        disabled: ee <= 0,
                        onClick: () => T[ee - 1] && l(T[ee - 1].rowNumber),
                        children: `Previous`,
                      }),
                      (0, P.jsx)(`span`, {
                        children: E ? `${ee + 1} of ${T.length}` : `0 of 0`,
                      }),
                      (0, P.jsx)(`button`, {
                        type: `button`,
                        className: `desk-ghost`,
                        disabled: ee < 0 || ee >= T.length - 1,
                        onClick: () => T[ee + 1] && l(T[ee + 1].rowNumber),
                        children: `Next`,
                      }),
                    ],
                  }),
                  e.testCopy || e.offers.batches.length > 0
                    ? (0, P.jsxs)(`div`, {
                        className: `queue-send`,
                        children: [
                          e.testCopy
                            ? (0, P.jsxs)(`label`, {
                                className: `desk-field queue-mail`,
                                children: [
                                  `Test mail goes to`,
                                  (0, P.jsx)(`input`, {
                                    type: `email`,
                                    value: mailTo,
                                    placeholder: `you@varsitytutors.com`,
                                    onChange: (ev) => setMailTo(ev.target.value),
                                  }),
                                ],
                              })
                            : null,
                          e.testCopy
                            ? (0, P.jsx)(`button`, {
                                type: `button`,
                                className: `desk-ghost`,
                                disabled: mailBusy,
                                onClick: () => void saveMail(),
                                children: `Save`,
                              })
                            : null,
                          (0, P.jsx)(`button`, {
                            type: `button`,
                            disabled: p,
                            onClick: () => void re(),
                            children: e.testCopy
                              ? `Send test offers`
                              : `Send ${e.offers.batches.length} offered ${e.offers.batches.length === 1 ? `email` : `emails`}`,
                          }),
                        ],
                      })
                    : (0, P.jsx)(`p`, {
                        className: `queue-send-empty`,
                        children: `No offered emails yet`,
                      }),
                ],
              }),
              _.text
                ? (0, P.jsx)(`p`, {
                    className: `desk-result desk-result--${_.kind} queue-notice`,
                    children: _.text,
                  })
                : null,
              (0, P.jsxs)(`div`, {
                className: `queue-ticket__body`,
                children: [
                  (0, P.jsx)(Bn, {
                    row: E,
                    placementDue: E ? se.has(E.rowNumber) : !1,
                    instructors: e.instructors,
                    availability: e.availability,
                    offerBody: te?.body,
                    ica: ne,
                    icaBusy: x,
                    icaNotice: C,
                    onIca: ae,
                    onRefresh: r,
                  }),
                  (0, P.jsxs)(`details`, {
                    className: `queue-fold`,
                    children: [
                      (0, P.jsx)(`summary`, { children: `Recent activity` }),
                      n
                        ? (0, P.jsx)(`p`, {
                            className: `desk-meta`,
                            children: n,
                          })
                        : null,
                      t.length === 0
                        ? (0, P.jsx)(`p`, {
                            className: `desk-empty`,
                            children: `Sends and failures will show up here.`,
                          })
                        : (0, P.jsx)(`ul`, {
                            className: `queue-activity`,
                            children: t
                              .slice(0, 8)
                              .map((e, t) =>
                                (0, P.jsxs)(
                                  `li`,
                                  {
                                    children: [
                                      (0, P.jsx)(`span`, {
                                        className: cn(e.status),
                                        children: e.status || `logged`,
                                      }),
                                      (0, P.jsxs)(`span`, {
                                        children: [
                                          e.action,
                                          e.recipient
                                            ? ` · ${e.recipient}`
                                            : ``,
                                        ],
                                      }),
                                      (0, P.jsx)(`span`, {
                                        className: `desk-mono`,
                                        children: Pn(e),
                                      }),
                                    ],
                                  },
                                  `${e.timestamp}-${e.action}-${t}`,
                                ),
                              ),
                          }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
function Pn(e) {
  let t = new Date(e.timestamp);
  return Number.isNaN(t.getTime())
    ? e.timestamp
    : new Intl.DateTimeFormat(`en-US`, {
        timeZone: `America/Chicago`,
        month: `short`,
        day: `numeric`,
        hour: `numeric`,
        minute: `2-digit`,
      }).format(t);
}
var Fn = {
    mon: `monday`,
    tue: `tuesday`,
    wed: `wednesday`,
    thu: `thursday`,
    fri: `friday`,
    sat: `saturday`,
    sun: `sunday`,
  },
  In = { Priority: 0, Standard: 1, Backup: 2, "Limited Use": 3 };
function Ln(e, t) {
  let n = e.toLowerCase().trim(),
    r = t
      .split(/[,;]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 2);
  return !n || r.length === 0
    ? !1
    : r.some((e) => n.includes(e) || e.includes(n));
}
function Rn(e, t) {
  return t
    .filter((t) => t.tutorEmail.toLowerCase() === e.toLowerCase())
    .sort((e, t) => t.submitted.localeCompare(e.submitted))[0];
}
function zn({
  row: e,
  placementDue: t,
  placementLink: n,
  setPlacementLink: r,
  busy: i,
  onAssign: a,
  onDrop: o,
}) {
  let s =
      e.daysLabel ||
      (e.daysUntilStart === ``
        ? `Start date not set`
        : `${e.daysUntilStart} days until start`),
    c =
      e.status === `Assigned`
        ? `done`
        : t
          ? `due`
          : e.status === `Accepted`
            ? `wait`
            : `later`,
    l =
      c === `due`
        ? `Placement is due`
        : c === `done`
          ? `Placement is already assigned`
          : `Placement is not due yet`,
    u =
      c === `due`
        ? `Create the placement on the dummy client page, deactivate the NAT twice, then assign the tutor.`
        : c === `wait`
          ? `The tutor accepted. Wait until this class is inside 30 days before you create the placement, or VTWA can drop them.`
          : c === `done`
            ? `If they drop, unassign them on the placement and remove them from the Course UI. Both steps are required.`
            : `A placement is due only after a tutor accepts and the class is inside 30 days.`;
  return (0, P.jsxs)(`section`, {
    className: `placement-card placement-card--${c}`,
    "aria-label": `Placement`,
    children: [
      (0, P.jsx)(`p`, {
        className: `placement-card__kicker`,
        children: `Placement`,
      }),
      (0, P.jsx)(`h4`, { children: l }),
      (0, P.jsx)(`p`, { children: u }),
      (0, P.jsxs)(`dl`, {
        className: `placement-facts`,
        children: [
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Until start` }),
              (0, P.jsx)(`dd`, { children: s }),
            ],
          }),
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Course ID` }),
              (0, P.jsx)(`dd`, {
                children: e.courseId || `Missing on this row`,
              }),
            ],
          }),
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Rate type` }),
              (0, P.jsx)(`dd`, {
                children: e.rateType || `Use the value on this row`,
              }),
            ],
          }),
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Tutor` }),
              (0, P.jsx)(`dd`, { children: e.tutorName || `Unassigned` }),
            ],
          }),
        ],
      }),
      c === `due`
        ? (0, P.jsxs)(`ol`, {
            className: `sop-steps`,
            children: [
              (0, P.jsx)(`li`, {
                children: `Open the dummy client page. Students, Add Student. Name the record with the class name, and type course in Students.`,
              }),
              (0, P.jsx)(`li`, {
                children: `School: VT Courses. Tutor Preferences: Product Type Live Stream Educator.`,
              }),
              (0, P.jsxs)(`li`, {
                children: [
                  `Use a custom subject name, paste the class name, then pick `,
                  e.subject || `the placement subject`,
                  `.`,
                ],
              }),
              (0, P.jsxs)(`li`, {
                children: [
                  `Paste this Course ID: `,
                  e.courseId || `missing`,
                  `.`,
                ],
              }),
              (0, P.jsxs)(`li`, {
                children: [
                  `Product Type Live Stream. Rate type: `,
                  e.rateType || `the value on this row`,
                  `.`,
                ],
              }),
              (0, P.jsx)(`li`, {
                children: `Click Removed (Deactivate) twice. The NAT must not go live.`,
              }),
              (0, P.jsxs)(`li`, {
                children: [
                  `Assign `,
                  e.tutorName || `the tutor`,
                  ` and confirm the rate on the Instructors tab.`,
                ],
              }),
            ],
          })
        : null,
      e.clientUrl
        ? (0, P.jsx)(`p`, {
            children: (0, P.jsx)(`a`, {
              href: e.clientUrl,
              target: `_blank`,
              rel: `noreferrer`,
              children: `Open dummy client page`,
            }),
          })
        : (0, P.jsx)(`p`, {
            className: `desk-meta`,
            children: `This row has no dummy client link.`,
          }),
      c === `due`
        ? (0, P.jsxs)(P.Fragment, {
            children: [
              (0, P.jsxs)(`label`, {
                className: `desk-field`,
                children: [
                  `Placement link`,
                  (0, P.jsx)(`input`, {
                    value: n,
                    onChange: (e) => r(e.target.value),
                    placeholder: `Paste after you assign them`,
                  }),
                ],
              }),
              (0, P.jsx)(`div`, {
                className: `desk-form`,
                children: (0, P.jsx)(`button`, {
                  type: `button`,
                  disabled: i,
                  onClick: a,
                  children: `Mark assigned`,
                }),
              }),
            ],
          })
        : null,
      c === `done`
        ? (0, P.jsx)(`div`, {
            className: `desk-form`,
            children: (0, P.jsx)(`button`, {
              type: `button`,
              className: `desk-ghost`,
              disabled: i,
              onClick: o,
              children: `Tutor dropped`,
            }),
          })
        : null,
    ],
  });
}
function Bn({
  row: e,
  placementDue: t,
  instructors: n,
  availability: r,
  offerBody: i,
  ica: a,
  icaBusy: o,
  icaNotice: s,
  onIca: c,
  onRefresh: l,
}) {
  let [u, d] = (0, f.useState)(``),
    [p, m] = (0, f.useState)(!1),
    [h, g] = (0, f.useState)(``),
    [_, v] = (0, f.useState)(!1),
    [y, b] = (0, f.useState)({ kind: ``, text: `` });
  if (
    ((0, f.useEffect)(() => {
      (d(e?.suggestion?.tutorEmail || ``), g(``), b({ kind: ``, text: `` }));
    }, [e?.rowNumber, e?.suggestion?.tutorEmail]),
    !e)
  )
    return (0, P.jsx)(`aside`, {
      className: `crm-detail`,
      children: `Select a class to see the assignment.`,
    });
  let x = n
      .filter((t) => Ln(e.subject, t.subjects))
      .filter((e) => p || (e.bgTier !== `Backup` && e.bgTier !== `Limited Use`))
      .sort(
        (e, t) =>
          (In[e.bgTier || ``] ?? 9) - (In[t.bgTier || ``] ?? 9) ||
          e.tutorName.localeCompare(t.tutorName),
      ),
    S = n.find((e) => e.tutorEmail === u),
    C = S ? Rn(S.tutorEmail, r) : void 0,
    w = C
      ? (e.days || ``)
          .split(`,`)
          .map((e) => e.trim().toLowerCase().slice(0, 3))
          .map((e) => {
            let t = Fn[e];
            return t ? `${e} ${String(C[t] || `—`)}` : ``;
          })
          .filter(Boolean)
          .join(` · `)
      : ``,
    T = C?.timezone && !/central/i.test(C.timezone),
    E =
      dn(e) &&
      (Number(e.daysUntilStart) <= 7 ||
        (e.daysLabel || ``).toLowerCase() === `starts soon`),
    ee =
      e.status === `Available` ||
      e.status === `Offered` ||
      e.status === `Offer` ||
      e.status === `Declined` ||
      e.status === ``,
    D =
      e.daysLabel ||
      (e.daysUntilStart === ``
        ? `Not set`
        : `${e.daysUntilStart} days until start`);
  async function te(t) {
    (v(!0), b({ kind: ``, text: `` }));
    try {
      (await Xt({
        action: t,
        rowNumber: e.rowNumber,
        tutorName: S?.tutorName,
        tutorEmail: S?.tutorEmail,
        placementLink: h.trim(),
      }),
        b({
          kind: `ok`,
          text:
            t === `offer`
              ? `Marked Offered for ${S?.tutorName}.`
              : `Updated the working tab.`,
        }),
        g(``),
        await l());
    } catch (e) {
      b({
        kind: `error`,
        text: e instanceof Error ? e.message : `Could not update the class.`,
      });
    } finally {
      v(!1);
    }
  }
  return (0, P.jsxs)(`aside`, {
    className: `crm-detail`,
    children: [
      (0, P.jsx)(`p`, {
        className: `desk-eyebrow`,
        children:
          [e.subject, e.productType].filter(Boolean).join(` · `) || `Class`,
      }),
      (0, P.jsx)(`h3`, { children: e.className }),
      (0, P.jsx)(`span`, {
        className: cn(e.status),
        children: e.status || `Available`,
      }),
      (0, P.jsx)(zn, {
        row: e,
        placementDue: t,
        placementLink: h,
        setPlacementLink: g,
        busy: _,
        onAssign: () => void te(`assign`),
        onDrop: () => void te(`drop`),
      }),
      (0, P.jsxs)(`dl`, {
        children: [
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Days and time` }),
              (0, P.jsxs)(`dd`, {
                children: [
                  [e.days, e.time].filter(Boolean).join(` · `) || `Not set`,
                  ` · Central`,
                ],
              }),
            ],
          }),
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Until start` }),
              (0, P.jsx)(`dd`, { children: D }),
            ],
          }),
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Assign to` }),
              (0, P.jsx)(`dd`, { children: e.tutorName || `Unassigned` }),
            ],
          }),
          (0, P.jsxs)(`div`, {
            children: [
              (0, P.jsx)(`dt`, { children: `Rate` }),
              (0, P.jsx)(`dd`, {
                children: e.rate || `Confirm on the Instructors tab`,
              }),
            ],
          }),
          e.rateType
            ? (0, P.jsxs)(`div`, {
                children: [
                  (0, P.jsx)(`dt`, { children: `Rate type` }),
                  (0, P.jsx)(`dd`, { children: e.rateType }),
                ],
              })
            : null,
        ],
      }),
      e.note ? (0, P.jsx)(`p`, { children: e.note }) : null,
      ee
        ? (0, P.jsxs)(P.Fragment, {
            children: [
              (0, P.jsx)(`p`, {
                className: `desk-meta`,
                children: `Check the VTWA calendar for this date and the following weeks before you offer. The sheet rate is sometimes wrong.`,
              }),
              (0, P.jsxs)(`label`, {
                className: `desk-check`,
                children: [
                  (0, P.jsx)(`input`, {
                    type: `checkbox`,
                    checked: p,
                    onChange: (e) => m(e.target.checked),
                  }),
                  `Include backup and limited use`,
                ],
              }),
              (0, P.jsxs)(`label`, {
                className: `desk-field`,
                children: [
                  `Tutor`,
                  (0, P.jsxs)(`select`, {
                    "aria-label": `Tutor for ${e.className}`,
                    value: u,
                    onChange: (e) => d(e.target.value),
                    children: [
                      (0, P.jsx)(`option`, {
                        value: ``,
                        children: x.length
                          ? `Priority and standard matches`
                          : `No priority or standard match`,
                      }),
                      x.map((e) =>
                        (0, P.jsxs)(
                          `option`,
                          {
                            value: e.tutorEmail,
                            children: [
                              e.tutorName,
                              ` · `,
                              e.bgTier || `Tier not set`,
                              e.rate ? ` · ${e.rate}` : ``,
                            ],
                          },
                          e.tutorEmail,
                        ),
                      ),
                    ],
                  }),
                ],
              }),
              S?.subjectNotes
                ? (0, P.jsx)(`p`, {
                    className: `desk-warn`,
                    children: S.subjectNotes,
                  })
                : null,
              !e.tutorEmail && e.suggestion
                ? (0, P.jsx)(`p`, {
                    className: `desk-meta`,
                    children: e.suggestion.reason,
                  })
                : null,
              S
                ? (0, P.jsxs)(`p`, {
                    className: `desk-meta`,
                    children: [
                      C
                        ? `${C.timezone || `Timezone not set`}. ${w || `No weekday blocks for this schedule.`}`
                        : `No quarterly availability form on file.`,
                      T
                        ? ` Convert their times into Central before offering.`
                        : ``,
                    ],
                  })
                : null,
              (0, P.jsxs)(`div`, {
                className: `desk-form`,
                children: [
                  (0, P.jsx)(`button`, {
                    type: `button`,
                    disabled: _ || !S,
                    onClick: () => void te(`assign`),
                    children: `Assign`,
                  }),
                  (0, P.jsx)(`button`, {
                    type: `button`,
                    className: `desk-ghost`,
                    disabled: _ || !S,
                    onClick: () => void te(`offer`),
                    children: `Mark offered`,
                  }),
                ],
              }),
            ],
          })
        : null,
      e.status === `Waiting for response`
        ? (0, P.jsx)(`p`, {
            className: `desk-meta`,
            children: E
              ? `This starts within 7 days. Follow up today or tomorrow.`
              : `Give them about a week. If there is no reply, clear them and offer the next candidate.`,
          })
        : null,
      e.status === `Waiting for response`
        ? (0, P.jsx)(`div`, {
            className: `desk-form`,
            children: (0, P.jsx)(`button`, {
              type: `button`,
              disabled: _,
              onClick: () => void te(`accept`),
              children: `They accepted`,
            }),
          })
        : null,
      e.status === `Not in progress`
        ? (0, P.jsx)(`p`, {
            className: `desk-meta`,
            children: `The live stream ICA is missing or expired. Send the reminder from the group tutors inbox, then try the assignment again.`,
          })
        : null,
      a
        ? (0, P.jsx)(`div`, {
            className: `desk-form`,
            children: (0, P.jsx)(`button`, {
              type: `button`,
              className: `desk-ghost`,
              disabled: o === a.rowNumber,
              onClick: () => c(a),
              children: `Send ICA reminder`,
            }),
          })
        : null,
      y.text
        ? (0, P.jsx)(`p`, {
            className: `desk-result desk-result--${y.kind}`,
            children: y.text,
          })
        : null,
      s.text
        ? (0, P.jsx)(`p`, {
            className: `desk-result desk-result--${s.kind}`,
            children: s.text,
          })
        : null,
      i
        ? (0, P.jsxs)(`details`, {
            children: [
              (0, P.jsx)(`summary`, { children: `Offer email` }),
              (0, P.jsx)(`pre`, { children: i }),
            ],
          })
        : null,
    ],
  });
}
function Vn({ page: e, onMeta: t }) {
  let [n, r] = (0, f.useState)(null),
    [i, a] = (0, f.useState)([]),
    [o, s] = (0, f.useState)(``),
    [c, l] = (0, f.useState)(``),
    [u, d] = (0, f.useState)(!0),
    p = (0, f.useCallback)(async () => {
      let [e, t] = await Promise.all([Jt(), Yt()]);
      (r(e), a(t.entries), s(t.warning || ``));
    }, []);
  (0, f.useEffect)(() => {
    let e = !1;
    async function t() {
      (d(!0), l(``));
      try {
        await p();
      } catch (t) {
        e || l(t instanceof Error ? t.message : `Staffing is not reachable.`);
      } finally {
        e || d(!1);
      }
    }
    return (
      t(),
      () => {
        e = !0;
      }
    );
  }, [p]);
  let m = n?.subs.filter((e) => fn(e) === `Needs a sub`).length ?? 0,
    h = (() => {
      if (!n) return 0;
      let e = new Map();
      for (let t of n.availability) {
        let n = (t.tutorEmail || t.tutorName).toLowerCase(),
          r = e.get(n);
        (!r || t.submitted > r.submitted) && e.set(n, t);
      }
      return [...e.values()].filter((e) => {
        let t = sn(e.submitted).tone;
        return t === `overdue` || t === `soon`;
      }).length;
    })();
  return (
    (0, f.useEffect)(() => {
      t({
        counts: {
          hub: n ? n.working.filter((e) => ln(e)).length : null,
          subs: n ? m : null,
          instructors: n ? n.instructors.length : null,
          availability: n ? h : null,
        },
        modeLabel: n
          ? n.mode === `live`
            ? `Live sheet`
            : n.previewSource === `sheet-copy`
              ? `Sheet copy`
              : `Preview data`
          : ``,
      });
    }, [h, t, m, n]),
    (0, P.jsx)(`div`, {
      className: `crm`,
      children: (0, P.jsxs)(`div`, {
        className: `crm-main`,
        children: [
          u && !n
            ? (0, P.jsx)(`p`, {
                className: `desk-meta`,
                children: `Loading staffing…`,
              })
            : null,
          c && !n
            ? (0, P.jsx)(`p`, {
                className: `desk-result desk-result--error`,
                children: c,
              })
            : null,
          n && e === `hub`
            ? (0, P.jsx)(Nn, {
                pending: n,
                activity: i,
                activityWarning: o,
                onRefresh: p,
              })
            : null,
          n && e === `subs`
            ? (0, P.jsx)(Dn, { pending: n, onRefresh: p })
            : null,
          n && e === `instructors`
            ? (0, P.jsx)(wn, { pending: n, onRefresh: p })
            : null,
          n && e === `availability`
            ? (0, P.jsx)(mn, { pending: n, onRefresh: p })
            : null,
        ],
      }),
    })
  );
}
var Hn = (0, f.lazy)(() =>
    import(`./ClassManagementPage-vBBCp_Lt.js`).then((e) => ({
      default: e.ClassManagementPage,
    })),
  ),
  Un = { hub: null, subs: null, instructors: null, availability: null };
function Wn() {
  let { ready: e, user: t, signOut: n } = Lt(),
    [r, i] = (0, f.useState)(`class-management`),
    [a, o] = (0, f.useState)(`hub`),
    [s, c] = (0, f.useState)({ counts: Un, modeLabel: `` }),
    l = Ft(t);
  return e
    ? t
      ? (0, P.jsxs)(zt, {
          user: t,
          activeSection: r,
          staffingPage: a,
          counts: s.counts,
          modeLabel: r === `staffing-desk` ? s.modeLabel : ``,
          showAdmin: l,
          onClassManagement: () => i(`class-management`),
          onStaffingPage: (e) => {
            (i(`staffing-desk`), o(e));
          },
          onSops: () => i(`sops`),
          onAdmin: () => i(`admin`),
          onSignOut: () => void n(),
          canSignOut: !!t,
          children: [
            r === `class-management`
              ? (0, P.jsx)(f.Suspense, {
                  fallback: (0, P.jsx)(`div`, {
                    style: { padding: `1.5rem`, color: `#45457a` },
                    children: `Loading Class Management…`,
                  }),
                  children: (0, P.jsx)(Hn, {}),
                })
              : null,
            r === `staffing-desk`
              ? (0, P.jsx)(Vn, { page: a, onMeta: c })
              : null,
            r === `sops` ? (0, P.jsx)(Gt, {}) : null,
            r === `admin` && l ? (0, P.jsx)(Vt, {}) : null,
          ],
        })
      : (0, P.jsx)(Ht, {})
    : (0, P.jsx)(`main`, {
        className: `sign-in`,
        children: (0, P.jsx)(`p`, { children: `Opening Courseops…` }),
      });
}
(0, p.createRoot)(document.getElementById(`root`)).render(
  (0, P.jsx)(f.StrictMode, {
    children: (0, P.jsx)(It, { children: (0, P.jsx)(Wn, {}) }),
  }),
);
