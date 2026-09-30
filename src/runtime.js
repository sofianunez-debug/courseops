import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { AuthError, getSettings, getUser, handleAuthCallback, logout, oauthLogin, onAuthChange } from "@netlify/identity";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

export const f = React;
export const p = ReactDOM;
export const P = { jsx, jsxs, Fragment };
export const k = AuthError;

export function At(loader) {
  return loader();
}

function isVarsity(email) {
  return /@varsitytutors\.com$/i.test(String(email || "").trim());
}

function normalizeUser(user) {
  if (!user?.email) return null;
  const roles = user.roles || user.appMetadata?.roles || user.app_metadata?.roles || [];
  return {
    ...user,
    name: user.name || user.userMetadata?.full_name || user.email,
    email: user.email,
    roles,
  };
}

async function rejectOutsideAccounts(user) {
  const normalized = normalizeUser(user);
  if (normalized && !isVarsity(normalized.email)) {
    await logout();
    throw new AuthError("Use your Varsity Tutors Google account.");
  }
  return normalized;
}

export const oe = {
  getSettings,
  oauthLogin,
  logout,
  async handleAuthCallback() {
    const result = await handleAuthCallback();
    if (!result?.user) return result;
    return { ...result, user: await rejectOutsideAccounts(result.user) };
  },
  async getUser() {
    return rejectOutsideAccounts(await getUser());
  },
  onAuthChange(callback) {
    return onAuthChange((event, user) => {
      Promise.resolve(rejectOutsideAccounts(user))
        .then((normalized) => callback(event, normalized))
        .catch((error) => {
          callback(event, null);
          console.error(error);
        });
    });
  },
};
