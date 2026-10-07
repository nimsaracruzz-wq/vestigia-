import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { readPublicBootstrap } from '../homepage/bootstrap';
import { API_BASE_URL } from "../config/api";
import { apiErrorMessage } from "../utils/apiError";
import {
  products as initialProducts,
  journalArticles as initialJournal,
  type Product,
  type JournalArticle,
} from "../data";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "pending" | "confirmed" | "processing" | "quality_check" | "packed"
  | "ready_for_shipment" | "shipped" | "out_for_delivery" | "delivered"
  | "cancelled" | "refunded";

export type OrderItem = {
  productId: number;
  productName: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  currency: import("../../shared/money").Currency;
  unitPriceMinor: number; subtotalMinor: number; discountMinor: number; taxMinor: number; totalMinor: number;
};

export type Order = {
  id: string;
  invoiceNumber?: string;
  customer: string;
  email: string;
  phone?: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  currency: import("../../shared/money").Currency;
  paymentStatus: string; pricingVersion: number;
  subtotalMinor: number; shippingMinor: number; taxMinor: number; discountMinor: number; totalMinor: number;
  payments?: { amountMinor: number; currency: import("../../shared/money").Currency; status: string }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  address: string;
  giftOrder: boolean;
  giftMessage?: string | null;
  notes?: string;
  trackingNumber?: string;
  courier?: string;
  stripePaymentIntentId?: string;
};

export type Customer = {
  id: number;
  name: string;
  email: string;
  orders: number;
  totalSpend: number;
  joined: string;
  lastOrder: string;
  phone?: string;
  addresses?: string;
};

export type PromoCode = {
  id: number;
  code: string;
  discount: number;
  currency?: import("../../shared/money").Currency; amountMinor?: number; percentageBps?: number;
  type: "percentage" | "fixed";
  uses: number;
  maxUses: number | null;
  active: boolean;
  expiry: string | null;
};

export type StoreSettings = {
  storeName: string;
  tagline: string;
  currency: string;
  announcementText: string;
  announcementEnabled: boolean;
  shippingThreshold: number;
  complimentaryShippingEnabled: boolean;
  taxRate: number;
  orderNotificationEmail?: string;
};

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "VESTIGIA",
  tagline: "Designed in Italy. Made in Sri Lanka. EVERY THREAD LEAVES A LEGACY",
  currency: "USD",
  announcementText: "DESIGNED IN ITALY · MADE IN SRI LANKA",
  announcementEnabled: true,
  shippingThreshold: 150,
  complimentaryShippingEnabled: true,
  taxRate: 8,
  orderNotificationEmail: "owner@thevestigia.com",
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AdminContextType {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  promoCodes: PromoCode[];
  settings: StoreSettings;
  journal: JournalArticle[];
  addProduct: (p: Omit<Product, "id">) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: number) => void;
  updateProductInventory: (id: number, inventory: Record<string, number>, expectedInventory: Record<string, number>) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<Order | null>;
  updateOrderNotes: (orderId: string, notes: string) => void;
  updateOrderShipping: (orderId: string, data: { trackingNumber?: string; courier?: string; phone?: string }) => void;
  duplicateOrder: (orderId: string) => Promise<Order | null>;
  addPromoCode: (p: Omit<PromoCode, "id" | "uses">) => void;
  togglePromoCode: (id: number) => void;
  deletePromoCode: (id: number) => void;
  updateSettings: (s: StoreSettings) => void;
  addJournalArticle: (a: Omit<JournalArticle, "id">) => void;
  updateJournalArticle: (a: JournalArticle) => void;
  deleteJournalArticle: (id: number) => void;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  isSynced: boolean;
  adminDataError: string | null;
  refreshAdminData: () => Promise<void>;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function getAdminToken(): string | null {
  try {
    return localStorage.getItem("vstigia_adm_token");
  } catch {
    return null;
  }
}

function clearAdminSession() {
  localStorage.removeItem("vstigia_adm_token");
  localStorage.removeItem("vstigia_adm_auth");
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const token = getAdminToken();
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal: !options.method || options.method === "GET" ? AbortSignal.timeout(8000) : undefined,
    headers: isFormData
      ? { "Bypass-Tunnel-Reminder": "true", ...authHeaders, ...(options.headers ?? {}) }
      : {
          "Content-Type": "application/json",
          "Bypass-Tunnel-Reminder": "true",
          ...authHeaders,
          ...(options.headers ?? {}),
        },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const error = new Error(apiErrorMessage(response.status, data || {})) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function buildProductFormData(product: any) {
  const formData = new FormData();

  formData.append("name", String(product.name ?? ""));
  formData.append("category", String(product.category ?? "Clothing"));
  formData.append("productType", String(product.productType ?? ""));
  formData.append("price", String(product.price ?? 0));
  formData.append("prices", JSON.stringify(product.prices ?? {}));
  formData.append("priceChangeReason", String(product.priceChangeReason ?? "Product details updated"));
  formData.append("compareAt", product.compareAt !== undefined && product.compareAt !== null ? String(product.compareAt) : "");
  formData.append("badge", String(product.badge ?? ""));
  formData.append("image", String(product.image ?? ""));
  formData.append("modelImage", String(product.modelImage ?? ""));
  formData.append("productImage", String(product.productImage ?? ""));
  formData.append("alt", String(product.alt ?? product.name ?? ""));
  formData.append("description", String(product.description ?? ""));
  formData.append("sizes", JSON.stringify(product.sizes ?? []));
  formData.append("colors", JSON.stringify(product.colors ?? []));
  formData.append("images", JSON.stringify(product.images ?? []));
  formData.append("details", JSON.stringify(product.details ?? []));
  formData.append("care", JSON.stringify(product.care ?? []));
  formData.append("rating", String(product.rating ?? 0));
  formData.append("sizeChart", product.sizeChart ? JSON.stringify(product.sizeChart) : "");
  formData.append("seoTitle", String(product.seoTitle ?? ""));
  formData.append("seoDescription", String(product.seoDescription ?? ""));
  formData.append("seoKeywords", String(product.seoKeywords ?? ""));
  formData.append("canonicalUrl", String(product.canonicalUrl ?? ""));
  formData.append("published", String(product.published ?? true));
  formData.append("robotsIndex", String(product.robotsIndex ?? true));
  formData.append("robotsFollow", String(product.robotsFollow ?? true));
  formData.append("brand", String(product.brand ?? "Vestigia"));
  formData.append("sku", String(product.sku ?? ""));
  formData.append("gtin", String(product.gtin ?? ""));
  formData.append("mpn", String(product.mpn ?? ""));
  formData.append("condition", String(product.condition ?? "new"));
  formData.append("googleProductCategory", String(product.googleProductCategory ?? ""));
  formData.append("material", String(product.material ?? ""));
  formData.append("gender", String(product.gender ?? ""));
  formData.append("ageGroup", String(product.ageGroup ?? ""));
  formData.append("imageTitle", String(product.imageTitle ?? ""));
  formData.append("redirectFrom", JSON.stringify(product.redirectFrom ?? []));

  if (product.imageFile instanceof File) {
    formData.append("imageFile", product.imageFile);
  }

  if (product.inventory) {
    formData.append("inventory", JSON.stringify(product.inventory));
  }

  return formData;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(()=>readPublicBootstrap()?.products||[]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(() => ({
    ...DEFAULT_SETTINGS,
  }));
  const [journal, setJournal] = useState<JournalArticle[]>(() => initialJournal);
  const [adminDataError, setAdminDataError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const token = getAdminToken();
    const savedAuth = load("vstigia_adm_auth", false);
    // If no token exists, clear stale auth state
    if (!token && savedAuth) {
      clearAdminSession();
      return false;
    }
    return savedAuth;
  });
  const [isSynced, setIsSynced] = useState(()=>!!readPublicBootstrap());

  const refreshOrdersAndCustomers = async () => {
    const token = getAdminToken();
    if (!token) return;
    setAdminDataError(null);
    try {
      const remoteOrders = await apiRequest("/orders");
      if (Array.isArray(remoteOrders)) setOrders(remoteOrders as Order[]);
    } catch (e) {
      console.error("Failed to fetch orders:", e);
      const status = (e as { status?: number }).status;
      if (status === 401 || status === 403) {
        clearAdminSession();
        setIsAuthenticated(false);
        setOrders([]);
        setCustomers([]);
        setAdminDataError("Your admin session expired after the backend restarted. Please sign in again.");
        return;
      }
      setAdminDataError("Orders could not be loaded. Check that the backend is running and refresh.");
    }
    try {
      const remoteCustomers = await apiRequest("/customers");
      if (Array.isArray(remoteCustomers)) setCustomers(remoteCustomers as Customer[]);
    } catch (e) {
      console.error("Failed to fetch customers:", e);
    }
  };

  useEffect(() => {
    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const sync = async () => {
      // Sync public data in parallel so settings/announcement load without blocking
      const [productsRes, settingsRes, promosRes, journalRes] = await Promise.allSettled([
        apiRequest(isAuthenticated && window.location.pathname.startsWith("/admin") ? "/admin/products" : "/products"),
        apiRequest("/settings"),
        apiRequest("/promos"),
        apiRequest("/journal"),
      ]);

      if (disposed) return;

      if (productsRes.status === "fulfilled" && Array.isArray(productsRes.value)) {
        setProducts(productsRes.value as Product[]);
        setIsSynced(true);
      } else {
        retryTimer = setTimeout(() => { void sync(); }, 3000);
      }

      if (settingsRes.status === "fulfilled" && settingsRes.value) {
        setSettings((prev) => ({ ...prev, ...(settingsRes.value as StoreSettings) }));
      }

      if (promosRes.status === "fulfilled" && Array.isArray(promosRes.value)) {
        setPromoCodes(promosRes.value as PromoCode[]);
      }

      if (journalRes.status === "fulfilled" && Array.isArray(journalRes.value)) {
        setJournal(journalRes.value as JournalArticle[]);
      }

      // Admin-only data (orders, customers)
      if (isAuthenticated) {
        await refreshOrdersAndCustomers();
      }

    };

    void sync();
    return () => { disposed = true; clearTimeout(retryTimer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  useEffect(() => { localStorage.setItem("vstigia_adm_auth", JSON.stringify(isAuthenticated)); }, [isAuthenticated]);

  const addProduct = async (p: Omit<Product, "id">) => {
    const created = await apiRequest("/products", {
      method: "POST",
      body: buildProductFormData(p),
    });
    if (created) setProducts(prev => [...prev, created as Product]);
  };

  const updateProduct = async (p: Product) => {
    const updated = await apiRequest(`/products/${p.id}`, {
      method: "PUT",
      body: buildProductFormData(p),
    });
    if (updated) setProducts(prev => prev.map(x => x.id === p.id ? updated as Product : x));
  };

  const deleteProduct = (id: number) => {
    const originalProducts = [...products];
    setProducts(prev => prev.filter(x => x.id !== id));
    void apiRequest(`/products/${id}`, { method: "DELETE" })
      .catch((err) => {
        console.error("Failed to delete product:", err);
        alert("Failed to delete product. Please try again.");
        setProducts(originalProducts);
      });
  };

  const updateProductInventory = async (id: number, inventory: Record<string, number>, expectedInventory: Record<string, number>) => {
    const updated = await apiRequest(`/products/${id}/inventory/bulk`, {
      method: "PUT", body: JSON.stringify({ inventory, expectedInventory }),
    });
    setProducts(prev => prev.map(p => p.id === id ? updated as Product : p));
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus): Promise<Order | null> => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    try {
      const updated = await apiRequest(`/orders/${orderId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (updated) {
        setOrders(prev => prev.map(o => o.id === orderId ? (updated as Order) : o));
        return updated as Order;
      }
    } catch (e) {
      console.error("Failed to update order status:", e);
    }
    return null;
  };

  const updateOrderNotes = (orderId: string, notes: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, notes } : o));
    void apiRequest(`/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify({ notes }),
    }).catch(() => undefined);
  };

  const updateOrderShipping = (orderId: string, data: { trackingNumber?: string; courier?: string; phone?: string }) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...data } : o));
    void apiRequest(`/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }).catch(() => undefined);
  };

  const duplicateOrder = async (orderId: string): Promise<Order | null> => {
    try {
      const created = await apiRequest(`/orders/${orderId}/duplicate`, { method: "POST" });
      if (created) {
        setOrders(prev => [created as Order, ...prev]);
        return created as Order;
      }
    } catch { /* ignore */ }
    return null;
  };

  const addPromoCode = (p: Omit<PromoCode, "id" | "uses">) => {
    void apiRequest("/promos", {
      method: "POST",
      body: JSON.stringify(p),
    }).then((created) => {
      if (created) {
        setPromoCodes((prev) => [...prev, created as PromoCode]);
      }
    }).catch(() => undefined);
  };

  const togglePromoCode = (id: number) => {
    const promo = promoCodes.find((item) => item.id === id);
    if (!promo) return;

    const nextPromo = { ...promo, active: !promo.active };
    setPromoCodes((prev) => prev.map((item) => (item.id === id ? nextPromo : item)));
    void apiRequest(`/promos/${id}`, {
      method: "PUT",
      body: JSON.stringify(nextPromo),
    }).catch(() => undefined);
  };

  const deletePromoCode = (id: number) => {
    setPromoCodes(prev => prev.filter(p => p.id !== id));
    void apiRequest(`/promos/${id}`, { method: "DELETE" }).catch(() => undefined);
  };

  const updateSettings = (s: StoreSettings) => {
    setSettings(s);
    void apiRequest("/settings", {
      method: "PUT",
      body: JSON.stringify(s),
    }).then((updated) => {
      if (updated) {
        setSettings((prev) => ({ ...prev, ...(updated as StoreSettings) }));
      }
    }).catch((err) => {
      console.error("Failed to update settings:", err);
    });
  };

  const addJournalArticle = (a: Omit<JournalArticle, "id">) =>
    void apiRequest("/journal", {
      method: "POST",
      body: JSON.stringify(a),
    }).then((created) => {
      if (created) {
        setJournal((prev) => [created as JournalArticle, ...prev]);
      }
    }).catch(() => undefined);

  const updateJournalArticle = (a: JournalArticle) => {
    setJournal(prev => prev.map(x => x.id === a.id ? a : x));
    void apiRequest(`/journal/${a.id}`, {
      method: "PUT",
      body: JSON.stringify(a),
    }).catch(() => undefined);
  };

  const deleteJournalArticle = (id: number) => {
    setJournal(prev => prev.filter(x => x.id !== id));
    void apiRequest(`/journal/${id}`, { method: "DELETE" }).catch(() => undefined);
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      if (data?.success && data?.token) {
        localStorage.setItem("vstigia_adm_token", data.token);
        setIsAuthenticated(true);
        // Immediately fetch orders + customers after login
        setTimeout(() => { void refreshOrdersAndCustomers(); }, 100);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  };

  const logout = () => {
    clearAdminSession();
    setIsAuthenticated(false);
    setOrders([]);
    setCustomers([]);
  };

  return (
    <AdminContext.Provider value={{
      products, orders, customers, promoCodes, settings, journal,
      addProduct, updateProduct, deleteProduct, updateProductInventory,
      updateOrderStatus, updateOrderNotes, updateOrderShipping, duplicateOrder,
      addPromoCode, togglePromoCode, deletePromoCode,
      updateSettings,
      addJournalArticle, updateJournalArticle, deleteJournalArticle,
      isAuthenticated, login, logout,
      isSynced,
      adminDataError,
      refreshAdminData: refreshOrdersAndCustomers
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  const publicProducts = useMemo(
    () => ctx?.products.filter(p => p.published !== false) ?? [],
    [ctx?.products]
  );
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return window.location.pathname.startsWith("/admin") ? ctx : { ...ctx, products: publicProducts };
}
