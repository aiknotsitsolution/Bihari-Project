import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import { api, KEYS, USE_MOCK } from "../lib/api";
import { getJson, setJson } from "../lib/storage";
import type { Product } from "../types";
import { useAuth } from "./AuthContext";

interface Ctx {
  items: Product[];
  has: (id: string) => boolean;
  toggle: (product: Product) => void;
}

const WishlistContext = createContext<Ctx>(null as unknown as Ctx);
export const useWishlist = () => useContext(WishlistContext);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await getJson<Product[]>(KEYS.wishlist, []);
      let merged = local;
      if (!USE_MOCK && user) {
        try {
          const remote = await api.wishlist.fetch();
          const ids = new Set(remote.map((p) => p.id));
          merged = [...remote, ...local.filter((p) => !ids.has(p.id))];
        } catch {
          /* offline: keep local */
        }
      }
      if (!cancelled) {
        setItems(merged);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?._id]);

  useEffect(() => {
    if (ready) void setJson(KEYS.wishlist, items);
  }, [items, ready]);

  const toggle = useCallback(
    (product: Product) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setItems((prev) =>
        prev.some((p) => p.id === product.id) ? prev.filter((p) => p.id !== product.id) : [product, ...prev]
      );
      if (!USE_MOCK && user) api.wishlist.toggle(product.id).catch(() => {});
    },
    [user]
  );

  const value = useMemo<Ctx>(
    () => ({ items, has: (id) => items.some((p) => p.id === id), toggle }),
    [items, toggle]
  );
  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
