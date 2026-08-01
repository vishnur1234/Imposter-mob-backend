import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Demo backend URL. Android emulators can't reach "localhost" (that's the
// emulator itself), so they use the special 10.0.2.2 alias back to the host
// machine; iOS simulator and web can use localhost directly. For a physical
// device, replace this with your machine's LAN IP (e.g. http://192.168.1.20:5050).
const HOST = Platform.OS === "android" ? "10.0.2.2" : "localhost";
export const API_BASE_URL = `http://${HOST}:5050/api`;
export const SOCKET_URL = `http://${HOST}:5050`;

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
