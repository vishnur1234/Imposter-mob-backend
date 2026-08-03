import AsyncStorage from "@react-native-async-storage/async-storage";

// Your computer's LAN IP. A physical phone on the same Wi-Fi can only reach
// your backend through this — "localhost" or "10.0.2.2" only work from a
// simulator/emulator running on this same machine, never from a real device.
// Find yours with:  ifconfig | grep "inet " | grep -v 127.0.0.1
// Update this whenever it changes (new Wi-Fi network, router reassigns it, etc.).
const HOST = "192.168.1.7";
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
