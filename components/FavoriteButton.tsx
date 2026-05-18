"use client";

import Link from "next/link";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { firestore } from "@/lib/firebaseClient";

export function FavoriteButton({ carId }: { carId: string }) {
  const { user, loading, configured } = useAuth();
  const [favorite, setFavorite] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !firestore) return;

    async function load() {
      const favoriteRef = doc(firestore!, "users", user!.uid, "favorites", carId);
      const snapshot = await getDoc(favoriteRef);
      setFavorite(snapshot.exists());
    }

    load();
  }, [carId, user]);

  if (!configured || loading) return null;

  if (!user) {
    return (
      <Link className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-orbit ring-1 ring-slate-200" href={`/login?next=/cars/${carId}`}>
        <Heart className="h-4 w-4" />
        Войти и добавить в избранное
      </Link>
    );
  }

  async function toggle() {
    if (!user || !firestore) return;
    setBusy(true);
    const favoriteRef = doc(firestore, "users", user.uid, "favorites", carId);
    try {
      if (favorite) {
        await deleteDoc(favoriteRef);
        setFavorite(false);
      } else {
        await setDoc(favoriteRef, { carId, createdAt: serverTimestamp() });
        setFavorite(true);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-orbit ring-1 ring-slate-200 disabled:opacity-60"
      type="button"
      onClick={toggle}
      disabled={busy}
    >
      <Heart className={`h-4 w-4 ${favorite ? "fill-orbit" : ""}`} />
      {favorite ? "В избранном" : "В избранное"}
    </button>
  );
}
