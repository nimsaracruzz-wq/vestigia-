import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  address: string;
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
  adminPassword: string;
};

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "VESTIGIA",
  tagline: "Designed in Italy. Made in Sri Lanka. Leave your mark.",
  currency: "USD",
  announcementText: "DESIGNED IN ITALY · MADE IN SRI LANKA",
  announcementEnabled: true,
  shippingThreshold: 150,
  complimentaryShippingEnabled: true,
  taxRate: 8,
  adminPassword: "admin123",
};

// ─── Context ──────────────────────────────────────────────────────────────────

interface AdminContextType {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  promoCodes: PromoCode[];
  settings: StoreSettings;
  journal: JournalArticle[];
  addProduct: (p: Omit<Product, "id">) => void;
  updateProduct: (p: Product) => void;
  deleteProduct: (id: number) => void;
  updateProductInventory: (id: number, inventory: Record<string, number>) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<Order | null>;
  updateOrderNotes: (orderId: string, notes: string) => void;
  updateOrderShipping: (orderId: string, data: { trackingNumber?: string; courier?: string; phone?: string }) => void;
  deleteOrder: (orderId: string) => void;
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
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const API_BASE_URL = "http://127.0.0.1:4000/api";

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: isFormData
      ? { ...(options.headers ?? {}) }
      : {
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
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
  formData.append("price", String(product.price ?? 0));
  formData.append("compareAt", product.compareAt !== undefined && product.compareAt !== null ? String(product.compareAt) : "");
  formData.append("badge", String(product.badge ?? ""));
  formData.append("image", String(product.image ?? ""));
  formData.append("alt", String(product.alt ?? product.name ?? ""));
  formData.append("description", String(product.description ?? ""));
  formData.append("sizes", JSON.stringify(product.sizes ?? []));
  formData.append("colors", JSON.stringify(product.colors ?? []));
  formData.append("images", JSON.stringify(product.images ?? []));
  formData.append("details", JSON.stringify(product.details ?? []));
  formData.append("care", JSON.stringify(product.care ?? []));
  formData.append("rating", String(product.rating ?? 0));
  formData.append("sizeChart", product.sizeChart ? JSON.stringify(product.sizeChart) : "");

  if (product.imageFile instanceof File) {
    formData.append("imageFile", product.imageFile);
  }

  if (product.inventory) {
    formData.append("inventory", JSON.stringify(product.inventory));
  }

  return formData;
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => initialProducts);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(() => ({
    ...DEFAULT_SETTINGS,
  }));
  const [journal, setJournal] = useState<JournalArticle[]>(() => initialJournal);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => load("vstigia_adm_auth", false));

  useEffect(() => {
    const sync = async () => {
      try {
        const [
          remoteProducts,
          remoteSettings,
          remoteOrders,
          remoteCustomers,
          remotePromos,
          remoteJournal,
        ] = await Promise.all([
          apiRequest("/products"),
          apiRequest("/settings"),
          apiRequest("/orders"),
          apiRequest("/customers"),
          apiRequest("/promos"),
          apiRequest("/journal"),
        ]);

        if (Array.isArray(remoteProducts)) {
          setProducts(remoteProducts as Product[]);
        }

        if (remoteSettings) {
          setSettings(remoteSettings as StoreSettings);
        }

        if (Array.isArray(remoteOrders)) {
          setOrders(remoteOrders as Order[]);
        }

        if (Array.isArray(remoteCustomers)) {
          setCustomers(remoteCustomers as Customer[]);
        }

        if (Array.isArray(remotePromos)) {
          setPromoCodes(remotePromos as PromoCode[]);
        }

        if (Array.isArray(remoteJournal)) {
          setJournal(remoteJournal as JournalArticle[]);
        }
      } catch {
        // Keep local fallback if the API is unavailable.
      }
    };

    void sync();
  }, []);

  useEffect(() => { localStorage.setItem("vstigia_adm_auth", JSON.stringify(isAuthenticated)); }, [isAuthenticated]);

  const addProduct = (p: Omit<Product, "id">) => {
    const nextProduct = { ...p, id: Math.max(...products.map((item) => item.id), 0) + 1 };
    setProducts(prev => [...prev, nextProduct]);
    void apiRequest("/products", {
      method: "POST",
      body: buildProductFormData(nextProduct),
    }).then((created) => {
      if (created) {
        setProducts((prev) => prev.map((item) => (item.id === nextProduct.id ? created as Product : item)));
      }
    }).catch(() => undefined);
  };

  const updateProduct = (p: Product) => {
    setProducts(prev => prev.map(x => x.id === p.id ? p : x));
    void apiRequest(`/products/${p.id}`, {
      method: "PUT",
      body: buildProductFormData(p),
    }).catch(() => undefined);
  };

  const deleteProduct = (id: number) => {
    setProducts(prev => prev.filter(x => x.id !== id));
    void apiRequest(`/products/${id}`, { method: "DELETE" }).catch(() => undefined);
  };

  const updateProductInventory = (id: number, inventory: Record<string, number>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, inventory } : p));
    const product = products.find((item) => item.id === id);
    if (product) {
      void apiRequest(`/products/${id}`, {
        method: "PUT",
        body: buildProductFormData({ ...product, inventory }),
      }).catch(() => undefined);
    }
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

  const deleteOrder = (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    void apiRequest(`/orders/${orderId}`, { method: "DELETE" }).catch(() => undefined);
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
    }).catch(() => undefined);
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
      if (data?.success) {
        setIsAuthenticated(true);
        return true;
      }

      return false;
    } catch {
      if (username === "admin" && (password === settings.adminPassword || password === DEFAULT_SETTINGS.adminPassword)) {
        setIsAuthenticated(true);
        return true;
      }
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AdminContext.Provider value={{
      products, orders, customers, promoCodes, settings, journal,
      addProduct, updateProduct, deleteProduct, updateProductInventory,
      updateOrderStatus, updateOrderNotes, updateOrderShipping, deleteOrder, duplicateOrder,
      addPromoCode, togglePromoCode, deletePromoCode,
      updateSettings,
      addJournalArticle, updateJournalArticle, deleteJournalArticle,
      isAuthenticated, login, logout
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
