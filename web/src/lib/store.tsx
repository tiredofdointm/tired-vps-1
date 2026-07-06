import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import type { CartItem, Notification, User } from './types';

interface Toast {
  id: number;
  kind: 'ok' | 'err' | 'info';
  text: string;
}

interface AppState {
  user: User | null;
  ready: boolean;
  cart: CartItem[];
  toasts: Toast[];
  notifications: Notification[];
  unread: number;
  toast: (text: string, kind?: Toast['kind']) => void;
  setUser: (u: User | null) => void;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
  addToCart: (item: Omit<CartItem, 'qty'>, qty?: number) => void;
  setQty: (refId: string, qty: number) => void;
  removeFromCart: (refId: string) => void;
  clearCart: () => void;
  checkout: () => Promise<boolean>;
  refreshNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const Ctx = createContext<AppState>(null as unknown as AppState);
export const useApp = () => useContext(Ctx);

const CART_KEY = 'tired.cart.v1';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    } catch {
      return [];
    }
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const toastSeq = useRef(0);

  const toast = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = ++toastSeq.current;
    setToasts((t) => [...t.slice(-3), { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await api.get<{ user: User | null }>('/api/auth/me');
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    try {
      const { notifications } = await api.get<{ notifications: Notification[] }>('/api/notifications');
      setNotifications(notifications);
    } catch {
      /* signed out */
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    refreshNotifications();
    const t = setInterval(refreshNotifications, 45000);
    return () => clearInterval(t);
  }, [user?.id, refreshNotifications]);

  // apply user accent + motion preference to the document
  useEffect(() => {
    document.documentElement.dataset.accent = user?.accent || 'violet';
    document.documentElement.dataset.motion = user?.prefs?.reducedMotion ? 'off' : 'on';
  }, [user?.accent, user?.prefs?.reducedMotion]);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback(
    (item: Omit<CartItem, 'qty'>, qty = 1) => {
      setCart((c) => {
        const existing = c.find((x) => x.refId === item.refId);
        if (existing) {
          return c.map((x) => (x.refId === item.refId ? { ...x, qty: Math.min(10, x.qty + qty) } : x));
        }
        return [...c, { ...item, qty }];
      });
      toast(`Added to cart — ${item.title}`, 'ok');
    },
    [toast],
  );

  const setQty = useCallback((refId: string, qty: number) => {
    setCart((c) => (qty <= 0 ? c.filter((x) => x.refId !== refId) : c.map((x) => (x.refId === refId ? { ...x, qty: Math.min(10, qty) } : x))));
  }, []);

  const removeFromCart = useCallback((refId: string) => {
    setCart((c) => c.filter((x) => x.refId !== refId));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const checkout = useCallback(async () => {
    if (!cart.length) return false;
    try {
      await api.post('/api/orders', { items: cart.map(({ kind, refId, qty }) => ({ kind, refId, qty })) });
      setCart([]);
      toast('Order confirmed — see you on the floor', 'ok');
      refreshNotifications();
      return true;
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Checkout failed', 'err');
      return false;
    }
  }, [cart, toast, refreshNotifications]);

  const signOut = useCallback(async () => {
    await api.post('/api/auth/signout').catch(() => undefined);
    setUser(null);
    toast('Signed out. Rest up.', 'info');
  }, [toast]);

  const markAllRead = useCallback(async () => {
    await api.post('/api/notifications/read-all').catch(() => undefined);
    setNotifications((ns) => ns.map((n) => ({ ...n, readAt: n.readAt || Date.now() })));
  }, []);

  const unread = useMemo(() => notifications.filter((n) => !n.readAt).length, [notifications]);

  const value = useMemo<AppState>(
    () => ({
      user, ready, cart, toasts, notifications, unread,
      toast, setUser, refreshUser, signOut,
      addToCart, setQty, removeFromCart, clearCart, checkout,
      refreshNotifications, markAllRead,
    }),
    [user, ready, cart, toasts, notifications, unread, toast, refreshUser, signOut, addToCart, setQty, removeFromCart, clearCart, checkout, refreshNotifications, markAllRead],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
