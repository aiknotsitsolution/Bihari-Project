import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import { api, KEYS, USE_MOCK } from "../lib/api";
import { getJson, removeKey, setJson } from "../lib/storage";
import type { CartItem, CouponResult, Product } from "../types";
import { useAuth } from "./AuthContext";

export const FREE_SHIPPING_ABOVE = 499;
const SHIPPING_FEE = 49;

interface AddOpts {
  quantity?: number;
  size?: string;
  color?: string;
}

interface Ctx {
  items: CartItem[];
  count: number;
  subtotal: number;
  mrpTotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: CouponResult | null;
  ready: boolean;
  add: (product: Product, opts?: AddOpts) => Promise<void>;
  setQuantity: (id: string, quantity: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  removeCoupon: () => Promise<void>;
}

const CartContext = createContext<Ctx>(null as unknown as Ctx);
export const useCart = () => useContext(CartContext);

const localId = (p: Product, size?: string, color?: string) => `${p.id}|${size ?? ""}|${color ?? ""}`;

function selectedVariantId(product: Product, size?: string, color?: string): string | undefined {
  const variants = product.variants ?? [];
  if (!variants.length) return undefined;
  const matches = variants.filter((variant) => {
    const variantSize = variant.attributes.size;
    const variantColor = variant.attributes.color;
    return (!size || variantSize === size) && (!color || variantColor === color);
  });
  return matches.length === 1 ? matches[0].id : undefined;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const serverMode = !USE_MOCK && !!user;
  const [items, setItems] = useState<CartItem[]>([]);
  const [coupon, setCoupon] = useState<CouponResult | null>(null);
  const [ready, setReady] = useState(false);
  const lastUser = useRef<string | null>(null);

  // load: guest/mock -> local storage, logged-in -> merge local into server cart
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setReady(false);
      const local = await getJson<CartItem[]>(KEYS.cart, []);
      if (!serverMode) {
        if (!cancelled) setItems(local);
      } else {
        for (const it of local) {
          try {
            await api.cart.add({
              productId: it.product.id,
              quantity: it.quantity,
              variantId:
                it.variantId ?? selectedVariantId(it.product, it.size, it.color),
            });
          } catch {
            /* ignore single item failure */
          }
        }
        if (local.length) await removeKey(KEYS.cart);
        try {
          const remote = await api.cart.fetch();
          if (!cancelled) setItems(remote);
        } catch {
          if (!cancelled) setItems([]);
        }
      }
      if (!cancelled) {
        lastUser.current = user?._id ?? null;
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serverMode, user?._id]);

  useEffect(() => {
    if (ready && !serverMode) void setJson(KEYS.cart, items);
  }, [items, ready, serverMode]);

  const reloadRemote = useCallback(async () => {
    setItems(await api.cart.fetch());
  }, []);

  const add = useCallback<Ctx["add"]>(
    async (product, opts = {}) => {
      const quantity = opts.quantity ?? 1;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (serverMode) {
        const variantId = selectedVariantId(product, opts.size, opts.color);
        if (product.variants?.length && !variantId) {
          throw new Error("Choose a valid product option before adding it to your cart.");
        }
        await api.cart.add({ productId: product.id, quantity, variantId });
        await reloadRemote();
        return;
      }
      setItems((prev) => {
        const id = localId(product, opts.size, opts.color);
        const found = prev.find((i) => i.id === id);
        if (found) {
          return prev.map((i) => (i.id === id ? { ...i, quantity: Math.min(i.quantity + quantity, product.stock) } : i));
        }
        return [...prev, { id, product, quantity, size: opts.size, color: opts.color }];
      });
    },
    [serverMode, reloadRemote]
  );

  const setQuantity = useCallback<Ctx["setQuantity"]>(
    async (id, quantity) => {
      if (quantity < 1) return;
      if (serverMode) {
        setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity } : i)));
        try {
          await api.cart.update(id, quantity);
        } finally {
          await reloadRemote();
        }
        return;
      }
      setItems((p) => p.map((i) => (i.id === id ? { ...i, quantity: Math.min(quantity, i.product.stock) } : i)));
    },
    [serverMode, reloadRemote]
  );

  const remove = useCallback<Ctx["remove"]>(
    async (id) => {
      setItems((p) => p.filter((i) => i.id !== id));
      if (serverMode) {
        try {
          await api.cart.remove(id);
        } finally {
          await reloadRemote();
        }
      }
    },
    [serverMode, reloadRemote]
  );

  const clear = useCallback(async () => {
    setItems([]);
    setCoupon(null);
    if (serverMode) await api.cart.clear();
  }, [items, serverMode]);

  const subtotal = useMemo(() => items.reduce((n, i) => n + i.product.price * i.quantity, 0), [items]);
  const mrpTotal = useMemo(() => items.reduce((n, i) => n + i.product.mrp * i.quantity, 0), [items]);

  const applyCoupon = useCallback<Ctx["applyCoupon"]>(
    async (code) => {
      if (!USE_MOCK && !user) throw new Error("Sign in to apply a coupon.");
      setCoupon(await api.coupons.apply(code, subtotal));
    },
    [subtotal, user]
  );

  const removeCoupon = useCallback(async () => {
    if (serverMode) await api.coupons.remove();
    setCoupon(null);
  }, [serverMode]);

  const value = useMemo<Ctx>(() => {
    const discount = coupon ? Math.min(coupon.discount, subtotal) : 0;
    const shipping = items.length === 0 || subtotal - discount >= FREE_SHIPPING_ABOVE ? 0 : SHIPPING_FEE;
    return {
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal,
      mrpTotal,
      discount,
      shipping,
      total: Math.max(subtotal - discount + shipping, 0),
      coupon,
      ready,
      add,
      setQuantity,
      remove,
      clear,
      applyCoupon,
      removeCoupon,
    };
  }, [items, subtotal, mrpTotal, coupon, ready, add, setQuantity, remove, clear, applyCoupon, removeCoupon]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
