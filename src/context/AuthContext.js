import React, { createContext, useContext, useEffect, useState } from "react";
import { api, loadToken, setToken } from "../api/client";
import { auth, setCurrentUser } from "../services/authService";

const AuthContext = createContext();

const toAppUser = (data) => ({ uid: String(data.id ?? data._id), email: data.email, playerName: data.playerName });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const token = await loadToken();
      if (token) {
        try {
          const data = await api.get("/users/me");
          const appUser = toAppUser(data);
          setUser(appUser);
          setCurrentUser(appUser);
        } catch (_) {
          await setToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const data = await api.post("/users/login", { email, password });
    await setToken(data.token);
    const appUser = toAppUser(data);
    setUser(appUser);
    setCurrentUser(appUser);
    return appUser;
  };

  const register = async (email, password) => {
    const playerName = email.split("@")[0];
    return api.post("/users/register", { email, password, playerName });
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export { auth };
