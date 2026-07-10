import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  products as defaultProducts,
  journalArticles as defaultJournal,
  type Product,
  type JournalArticle,
} from "../data";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

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
  customer: string;
  email: string;
  date: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  address: string;
};

export type Customer = {
  id: number;
  name: string;
  email: string;
  orders: number;
  totalSpend: number;
  joined: string;
  lastOrder: string;
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
  taxRate: number;
  adminPassword: string;
};

// ─── Seed Data ────────────────────────────────────────────────────────────────

const dp = defaultProducts;

const SEED_ORDERS: Order[] = [
  { id: "VST-2026-001", customer: "Evelyn Wright", email: "evelyn.w@example.com", date: "2026-07-02", status: "delivered", items: [{ productId: 1, productName: "Linen Draped Vest", image: dp[0].image, size: "M", color: "#e8ded1", quantity: 1, price: 128 }], subtotal: 128, shipping: 0, tax: 10.24, total: 138.24, address: "12 Elm Street, New York, NY 10001" },
  { id: "VST-2026-002", customer: "Marcus Klein", email: "m.klein@example.com", date: "2026-07-01", status: "shipped", items: [{ productId: 2, productName: "Tapered City Trouser", image: dp[1].image, size: "30", color: "#0f1115", quantity: 1, price: 148 }, { productId: 3, productName: "Fine Hoop Set", image: dp[2].image, size: "OS", color: "#d7b56d", quantity: 1, price: 58 }], subtotal: 206, shipping: 0, tax: 16.48, total: 222.48, address: "88 Park Ave, Chicago, IL 60601" },
  { id: "VST-2026-003", customer: "Daniela Ruiz", email: "d.ruiz@example.com", date: "2026-07-01", status: "processing", items: [{ productId: 6, productName: "Arc Leather Tote", image: dp[5].image, size: "OS", color: "#2b1e18", quantity: 1, price: 176 }, { productId: 7, productName: "Relaxed Poplin Dress", image: dp[6].image, size: "S", color: "#f7f5ef", quantity: 1, price: 156 }], subtotal: 332, shipping: 0, tax: 26.56, total: 358.56, address: "45 Sunset Blvd, Los Angeles, CA 90028" },
  { id: "VST-2026-004", customer: "Monica Pierce", email: "m.pierce@example.com", date: "2026-07-02", status: "pending", items: [{ productId: 5, productName: "Soft Utility Shirt", image: dp[4].image, size: "L", color: "#ebe5d9", quantity: 1, price: 118 }, { productId: 8, productName: "Sculpted Sandal", image: dp[7].image, size: "8", color: "#e7d4bd", quantity: 1, price: 92 }], subtotal: 210, shipping: 0, tax: 16.8, total: 226.8, address: "320 Oak Lane, Seattle, WA 98101" },
  { id: "VST-2026-005", customer: "Chloe Moreau", email: "c.moreau@example.com", date: "2026-06-28", status: "delivered", items: [{ productId: 4, productName: "Washed Rib Tank", image: dp[3].image, size: "XS", color: "#ffffff", quantity: 2, price: 64 }], subtotal: 128, shipping: 0, tax: 10.24, total: 138.24, address: "7 Rue de Rivoli, Miami, FL 33101" },
  { id: "VST-2026-006", customer: "Jessie Davis", email: "j.davis@example.com", date: "2026-06-30", status: "shipped", items: [{ productId: 1, productName: "Linen Draped Vest", image: dp[0].image, size: "XS", color: "#242424", quantity: 1, price: 128 }], subtotal: 128, shipping: 0, tax: 10.24, total: 138.24, address: "19 Cedar Road, Boston, MA 02101" },
  { id: "VST-2026-007", customer: "Amelia Vance", email: "a.vance@example.com", date: "2026-06-25", status: "delivered", items: [{ productId: 5, productName: "Soft Utility Shirt", image: dp[4].image, size: "M", color: "#161616", quantity: 1, price: 118 }], subtotal: 118, shipping: 15, tax: 9.44, total: 142.44, address: "55 Maple Ave, Denver, CO 80201" },
  { id: "VST-2026-008", customer: "Thomas Reed", email: "t.reed@example.com", date: "2026-06-24", status: "delivered", items: [{ productId: 2, productName: "Tapered City Trouser", image: dp[1].image, size: "32", color: "#d9d0c4", quantity: 1, price: 148 }], subtotal: 148, shipping: 0, tax: 11.84, total: 159.84, address: "66 Birch Blvd, Portland, OR 97201" },
  { id: "VST-2026-009", customer: "Lucia Santos", email: "l.santos@example.com", date: "2026-06-22", status: "delivered", items: [{ productId: 3, productName: "Fine Hoop Set", image: dp[2].image, size: "OS", color: "#c7c7c7", quantity: 2, price: 58 }, { productId: 6, productName: "Arc Leather Tote", image: dp[5].image, size: "OS", color: "#c4a47f", quantity: 1, price: 176 }], subtotal: 292, shipping: 0, tax: 23.36, total: 315.36, address: "104 Vine St, San Francisco, CA 94101" },
  { id: "VST-2026-010", customer: "Hanna Glass", email: "h.glass@example.com", date: "2026-06-20", status: "delivered", items: [{ productId: 8, productName: "Sculpted Sandal", image: dp[7].image, size: "7", color: "#1f1f1f", quantity: 1, price: 92 }], subtotal: 92, shipping: 15, tax: 7.36, total: 114.36, address: "22 Willow St, Nashville, TN 37201" },
  { id: "VST-2026-011", customer: "Sarah Lin", email: "s.lin@example.com", date: "2026-06-18", status: "delivered", items: [{ productId: 4, productName: "Washed Rib Tank", image: dp[3].image, size: "S", color: "#b7b1a6", quantity: 1, price: 64 }], subtotal: 64, shipping: 15, tax: 5.12, total: 84.12, address: "8 Spruce Circle, Phoenix, AZ 85001" },
  { id: "VST-2026-012", customer: "Monica Pierce", email: "m.pierce@example.com", date: "2026-06-15", status: "delivered", items: [{ productId: 1, productName: "Linen Draped Vest", image: dp[0].image, size: "S", color: "#9e9a86", quantity: 1, price: 128 }, { productId: 3, productName: "Fine Hoop Set", image: dp[2].image, size: "OS", color: "#d7b56d", quantity: 1, price: 58 }], subtotal: 186, shipping: 0, tax: 14.88, total: 200.88, address: "320 Oak Lane, Seattle, WA 98101" },
  { id: "VST-2026-013", customer: "James Park", email: "j.park@example.com", date: "2026-06-12", status: "delivered", items: [{ productId: 7, productName: "Relaxed Poplin Dress", image: dp[6].image, size: "M", color: "#7f8675", quantity: 1, price: 156 }], subtotal: 156, shipping: 0, tax: 12.48, total: 168.48, address: "3 Cherry Lane, Austin, TX 78701" },
  { id: "VST-2026-014", customer: "Evelyn Wright", email: "evelyn.w@example.com", date: "2026-06-08", status: "cancelled", items: [{ productId: 6, productName: "Arc Leather Tote", image: dp[5].image, size: "OS", color: "#111111", quantity: 1, price: 176 }], subtotal: 176, shipping: 0, tax: 14.08, total: 190.08, address: "12 Elm Street, New York, NY 10001" },
  { id: "VST-2026-015", customer: "Daniela Ruiz", email: "d.ruiz@example.com", date: "2026-06-04", status: "delivered", items: [{ productId: 7, productName: "Relaxed Poplin Dress", image: dp[6].image, size: "XS", color: "#202020", quantity: 1, price: 156 }], subtotal: 156, shipping: 0, tax: 12.48, total: 168.48, address: "45 Sunset Blvd, Los Angeles, CA 90028" },
  { id: "VST-2026-016", customer: "Jessie Davis", email: "j.davis@example.com", date: "2026-06-01", status: "delivered", items: [{ productId: 2, productName: "Tapered City Trouser", image: dp[1].image, size: "28", color: "#6d766a", quantity: 1, price: 148 }], subtotal: 148, shipping: 0, tax: 11.84, total: 159.84, address: "19 Cedar Road, Boston, MA 02101" },
  { id: "VST-2026-017", customer: "Marcus Klein", email: "m.klein@example.com", date: "2026-05-28", status: "delivered", items: [{ productId: 5, productName: "Soft Utility Shirt", image: dp[4].image, size: "L", color: "#bcc5b7", quantity: 1, price: 118 }], subtotal: 118, shipping: 15, tax: 9.44, total: 142.44, address: "88 Park Ave, Chicago, IL 60601" },
];

const SEED_CUSTOMERS: Customer[] = [
  { id: 1, name: "Evelyn Wright", email: "evelyn.w@example.com", orders: 4, totalSpend: 641, joined: "2026-01-15", lastOrder: "2026-07-02" },
  { id: 2, name: "Marcus Klein", email: "m.klein@example.com", orders: 3, totalSpend: 483, joined: "2026-02-03", lastOrder: "2026-07-01" },
  { id: 3, name: "Chloe Moreau", email: "c.moreau@example.com", orders: 2, totalSpend: 234, joined: "2026-03-11", lastOrder: "2026-06-28" },
  { id: 4, name: "Daniela Ruiz", email: "d.ruiz@example.com", orders: 5, totalSpend: 892, joined: "2025-11-20", lastOrder: "2026-07-01" },
  { id: 5, name: "James Park", email: "j.park@example.com", orders: 1, totalSpend: 168, joined: "2026-06-01", lastOrder: "2026-06-12" },
  { id: 6, name: "Amelia Vance", email: "a.vance@example.com", orders: 1, totalSpend: 142, joined: "2026-01-30", lastOrder: "2026-06-25" },
  { id: 7, name: "Hanna Glass", email: "h.glass@example.com", orders: 1, totalSpend: 114, joined: "2026-04-14", lastOrder: "2026-06-20" },
  { id: 8, name: "Monica Pierce", email: "m.pierce@example.com", orders: 3, totalSpend: 654, joined: "2025-09-05", lastOrder: "2026-07-02" },
  { id: 9, name: "Sarah Lin", email: "s.lin@example.com", orders: 1, totalSpend: 84, joined: "2026-05-20", lastOrder: "2026-06-18" },
  { id: 10, name: "Jessie Davis", email: "j.davis@example.com", orders: 3, totalSpend: 436, joined: "2025-12-10", lastOrder: "2026-06-30" },
  { id: 11, name: "Thomas Reed", email: "t.reed@example.com", orders: 1, totalSpend: 160, joined: "2026-03-22", lastOrder: "2026-06-24" },
  { id: 12, name: "Lucia Santos", email: "l.santos@example.com", orders: 1, totalSpend: 315, joined: "2026-02-14", lastOrder: "2026-06-22" },
];

const SEED_PROMOS: PromoCode[] = [
  { id: 1, code: "VESTIGIA20", discount: 20, type: "percentage", uses: 47, maxUses: null, active: true, expiry: null },
  { id: 2, code: "WELCOME10", discount: 10, type: "percentage", uses: 103, maxUses: 200, active: true, expiry: "2026-12-31" },
  { id: 3, code: "SUMMER15", discount: 15, type: "percentage", uses: 82, maxUses: 100, active: false, expiry: "2026-06-30" },
  { id: 4, code: "FREESHIP", discount: 15, type: "fixed", uses: 31, maxUses: null, active: true, expiry: null },
];

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Vestigia",
  tagline: "Refined, minimalist apparel tailored for ease of movement and enduring style.",
  currency: "USD",
  announcementText: "Free shipping on orders over $150 · New collection just arrived",
  announcementEnabled: true,
  shippingThreshold: 150,
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
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  addPromoCode: (p: Omit<PromoCode, "id" | "uses">) => void;
  togglePromoCode: (id: number) => void;
  deletePromoCode: (id: number) => void;
  updateSettings: (s: StoreSettings) => void;
  addJournalArticle: (a: Omit<JournalArticle, "id">) => void;
  updateJournalArticle: (a: JournalArticle) => void;
  deleteJournalArticle: (id: number) => void;
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

export function AdminProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => load("vstigia_adm_products", defaultProducts));
  const [orders, setOrders] = useState<Order[]>(() => load("vstigia_adm_orders", SEED_ORDERS));
  const [customers] = useState<Customer[]>(() => load("vstigia_adm_customers", SEED_CUSTOMERS));
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>(() => load("vstigia_adm_promos", SEED_PROMOS));
  const [settings, setSettings] = useState<StoreSettings>(() => load("vstigia_adm_settings", DEFAULT_SETTINGS));
  const [journal, setJournal] = useState<JournalArticle[]>(() => load("vstigia_adm_journal", defaultJournal));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => load("vstigia_adm_auth", false));

  useEffect(() => { localStorage.setItem("vstigia_adm_products", JSON.stringify(products)); }, [products]);
  useEffect(() => { localStorage.setItem("vstigia_adm_orders", JSON.stringify(orders)); }, [orders]);
  useEffect(() => { localStorage.setItem("vstigia_adm_promos", JSON.stringify(promoCodes)); }, [promoCodes]);
  useEffect(() => { localStorage.setItem("vstigia_adm_settings", JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem("vstigia_adm_journal", JSON.stringify(journal)); }, [journal]);
  useEffect(() => { localStorage.setItem("vstigia_adm_auth", JSON.stringify(isAuthenticated)); }, [isAuthenticated]);

  const addProduct = (p: Omit<Product, "id">) => setProducts(prev => [...prev, { ...p, id: Math.max(...prev.map(x => x.id), 0) + 1 }]);
  const updateProduct = (p: Product) => setProducts(prev => prev.map(x => x.id === p.id ? p : x));
  const deleteProduct = (id: number) => setProducts(prev => prev.filter(x => x.id !== id));

  const updateProductInventory = (id: number, inventory: Record<string, number>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, inventory } : p));
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) =>
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));

  const addPromoCode = (p: Omit<PromoCode, "id" | "uses">) =>
    setPromoCodes(prev => [...prev, { ...p, id: Math.max(...prev.map(x => x.id), 0) + 1, uses: 0 }]);
  const togglePromoCode = (id: number) => setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
  const deletePromoCode = (id: number) => setPromoCodes(prev => prev.filter(p => p.id !== id));

  const updateSettings = (s: StoreSettings) => setSettings(s);

  const addJournalArticle = (a: Omit<JournalArticle, "id">) =>
    setJournal(prev => [{ ...a, id: Math.max(...prev.map(x => x.id), 0) + 1 }, ...prev]);
  const updateJournalArticle = (a: JournalArticle) => setJournal(prev => prev.map(x => x.id === a.id ? a : x));
  const deleteJournalArticle = (id: number) => setJournal(prev => prev.filter(x => x.id !== id));

  const login = (pwd: string) => {
    if (pwd === settings.adminPassword || pwd === DEFAULT_SETTINGS.adminPassword) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  return (
    <AdminContext.Provider value={{
      products, orders, customers, promoCodes, settings, journal,
      addProduct, updateProduct, deleteProduct, updateProductInventory,
      updateOrderStatus,
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
