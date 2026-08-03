import AsyncStorage from "@react-native-async-storage/async-storage";

// Set in .env as EXPO_PUBLIC_API_URL (baked into the app at build time by Expo).
// - Local dev: your computer's LAN IP, e.g. http://192.168.1.7:5050 — a physical
//   phone on the same Wi-Fi can only reach your backend through this;
//   "localhost"/"10.0.2.2" only work from a simulator/emulator on this machine.
// - Production: the public URL of your deployed backend, e.g.
//   https://imposter-mob-backend.onrender.com
const BASE =
  process.env.EXPO_PUBLIC_API_URL || "https://imposter-mob-backend.onrender.com";
if (!BASE) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set — add it to .env (see .env.example) and restart Metro."
  );
}

export const API_BASE_URL = `${BASE}/api`;
export const SOCKET_URL = BASE;

const TOKEN_KEY = "auth_token";
let cachedToken = null;

export const setToken = async (token) => {
  cachedToken = token;
  if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
  else await AsyncStorage.removeItem(TOKEN_KEY);
};

export const loadToken = async () => {
  if (cachedToken !== null) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
};

async function request(method, path, body) {
  const token = await loadToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `Request failed (${res.status})`);
  }
  return json.data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  patch: (path, body) => request("PATCH", path, body),
};
