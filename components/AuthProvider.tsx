"use client";

import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { firebaseAuth, hasFirebaseClientConfig } from "@/lib/firebaseClient";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = hasFirebaseClientConfig();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!firebaseAuth) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(firebaseAuth, async (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        await syncSession(nextUser);
      } else {
        await fetch("/api/session/logout", { method: "POST" });
      }
    });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    configured,
    async signIn(email, password) {
      if (!firebaseAuth) throw new Error("Firebase is not configured.");
      const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      await syncSession(credential.user);
    },
    async register(email, password) {
      if (!firebaseAuth) throw new Error("Firebase is not configured.");
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      await syncSession(credential.user);
    },
    async logout() {
      if (firebaseAuth) await signOut(firebaseAuth);
      await fetch("/api/session/logout", { method: "POST" });
      setUser(null);
    }
  }), [configured, loading, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}

async function syncSession(user: User) {
  const idToken = await user.getIdToken();
  await fetch("/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken })
  });
}
