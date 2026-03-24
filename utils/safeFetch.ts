// src/utils/auth/safeFetch.ts

import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { getDeviceId } from "./device";

/* ============================= */
/* ====== CONFIG ============== */
/* ============================= */

const RAW_URL = Constants.expoConfig?.extra?.BACKEND_URL ?? "";
const BACKEND_URL = RAW_URL.replace(/\/+$/, "");

const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";

type TokenPair = {
  access_token: string;
  refresh_token?: string | null;
};

let inFlightRefresh: Promise<TokenPair | null> | null = null;

/* ============================= */
/* ===== TOKEN STORAGE ========= */
/* ============================= */

export async function saveTokens(access: string, refresh?: string | null) {
  if (access) {
    await SecureStore.setItemAsync(ACCESS_KEY, access, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }

  if (refresh && refresh.trim().length > 0) {
    await SecureStore.setItemAsync(REFRESH_KEY, refresh, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
}

async function getAccess() {
  return SecureStore.getItemAsync(ACCESS_KEY);
}

async function getRefresh() {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

/* ============================= */
/* ===== LOGOUT =============== */
/* ============================= */
export async function refreshSession(): Promise<boolean> {
  const refreshed = await refreshOnce();
  return !!refreshed?.access_token;
}

export async function logout(): Promise<void> {
  const refresh_token = await getRefresh();
  const device_id = await getDeviceId();

  try {
    if (refresh_token) {
      await fetch(`${BACKEND_URL}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token, device_id }),
      });
    }
  } catch {
    // ignore network errors
  }

  await clearTokens();
}

/* ============================= */
/* ===== REFRESH ============== */
/* ============================= */

async function refreshOnce(): Promise<TokenPair | null> {
  if (!inFlightRefresh) {
    inFlightRefresh = (async () => {
      const refresh_token = await getRefresh();
      if (!refresh_token) return null;

      const device_id = await getDeviceId();

      try {
        const res = await fetch(`${BACKEND_URL}/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token, device_id }),
        });
      
        if (res.status === 401 || res.status === 403) {
          await logout(); // refresh token truly invalid
          return null;
        }

        if (!res.ok) {
          return null; // temporary failure, keep tokens
        }

        const data: TokenPair = await res.json();

        if (!data.access_token) {
          await logout();
          return null;
        }

        const newRefresh = data.refresh_token ?? refresh_token;

        await saveTokens(data.access_token, newRefresh);
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token ?? refresh_token,
        };
      } catch {
        return null;
      } finally {
        inFlightRefresh = null;
      }
    })();
  }

  return inFlightRefresh;
}

/* ============================= */
/* ===== URL HANDLING ========= */
/* ============================= */

function toUrl(input: RequestInfo | URL): string | URL {
  if (typeof input === "string") {
    if (/^https?:\/\//i.test(input)) return input;
    const rel = input.replace(/^\/+/, "");
    return `${BACKEND_URL}/${rel}`;
  }

  if (input instanceof URL) return input;

  const req = input as Request;
  const href = req.url ?? "";

  if (/^https?:\/\//i.test(href)) return href;

  const rel = href.replace(/^\/+/, "");
  return `${BACKEND_URL}/${rel}`;
}

/* ============================= */
/* ===== SAFE FETCH =========== */
/* ============================= */

export async function safeFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
) {
  const url = toUrl(input);

  const access = await getAccess();

  const withAuth = (token?: string | null): RequestInit => ({
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const isAuthFail = (status: number) => status === 401 || status === 403;

  // 1️⃣ First attempt
  let res = await fetch(url, withAuth(access));

  if (!isAuthFail(res.status)) return res;

  // 2️⃣ Try refresh
  const refreshed = await refreshOnce();

  if (refreshed?.access_token) {
    res = await fetch(url, withAuth(refreshed.access_token));
  }

  // 3️⃣ Only logout if refresh already failed
  if (res.status === 401 && !refreshed?.access_token) {
    await logout();
  }

  return res;
}
// export async function hasValidSession(): Promise<boolean> {
//   const refresh = await getRefresh();
//   return !!refresh;
// }
