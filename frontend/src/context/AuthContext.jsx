import { createContext, useContext, useMemo, useState } from "react";
import { loginUser, registerUser } from "../lib/api";

const USER_STORAGE_KEY = "chat_clone_user";
const AuthContext = createContext(null);

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      async login(payload) {
        const response = await loginUser(payload);
        const nextUser = {
          email: payload.email,
          fullName: payload.fullName || null,
        };
        setUser(nextUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
        return response;
      },
      async register(payload) {
        const response = await registerUser(payload);
        const nextUser = response?.user || {
          email: payload.email,
          fullName: payload.fullName,
        };
        setUser(nextUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
        return response;
      },
      logout() {
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
