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
  { id: "VST-2026-001", customer: "Evelyn Wright", email: "evelyn.w@example.com", date: "2026-07-02", status: "delivered", items: [{ productId: 1, productName: "VESTIGIA SIGNATURE TEE", image: dp[0].image, size: "M", color: "#f3eedf", quantity: 1, price: 78 }], subtotal: 78, shipping: 15, tax: 6.24, total: 99.24, address: "12 Elm Street, New York, NY 10001" },
  { id: "VST-2026-002", customer: "Marcus Klein", email: "m.klein@example.com", date: "2026-07-01", status: "shipped", items: [{ productId: 2, productName: "VESTIGIA ORIGIN TEE", image: dp[1].image, size: "M", color: "#1c1a1a", quantity: 1, price: 85 }, { productId: 3, productName: "VESTIGIA ESSENTIAL TEE", image: dp[2].image, size: "S", color: "#8b8882", quantity: 1, price: 68 }], subtotal: 153, shipping: 0, tax: 12.24, total: 165.24, address: "88 Park Ave, Chicago, IL 60601" },
  { id: "VST-2026-003", customer: "Daniela Ruiz", email: "d.ruiz@example.com", date: "2026-07-01", status: "processing", items: [{ productId: 1, productName: "VESTIGIA SIGNATURE TEE", image: dp[0].image, size: "S", color: "#f3eedf", quantity: 2, price: 78 }], subtotal: 156, shipping: 0, tax: 12.48, total: 168.48, address: "45 Sunset Blvd, Los Angeles, CA 90028" },
  { id: "VST-2026-004", customer: "Monica Pierce", email: "m.pierce@example.com", date: "2026-07-02", status: "pending", items: [{ productId: 3, productName: "VESTIGIA ESSENTIAL TEE", image: dp[2].image, size: "L", color: "#8b8882", quantity: 1, price: 68 }], subtotal: 68, shipping: 15, tax: 5.44, total: 88.44, address: "320 Oak Lane, Seattle, WA 98101" },
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
  storeName: "VESTIGIA",
  tagline: "Designed in Italy. Made in Sri Lanka. Leave your mark.",
  currency: "USD",
  announcementText: "DESIGNED IN ITALY · MADE IN SRI LANKA",
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
  const loadProducts = (): Product[] => {
    const saved = load<Product[]>("vstigia_adm_products", defaultProducts);
    const isOld = saved.length !== 3 || saved.some(p => !p.name.startsWith("VESTIGIA"));
    const productsToUse = isOld ? defaultProducts : saved;
    return productsToUse.map((product) => {
      const seeded = defaultProducts.find((item) => item.id === product.id);
      if (seeded) {
        return {
          ...product,
          name: seeded.name,
          category: seeded.category,
          price: seeded.price,
          compareAt: seeded.compareAt,
          badge: seeded.badge,
          colors: seeded.colors,
          image: seeded.image,
          images: seeded.images,
          alt: seeded.alt,
          sizes: seeded.sizes,
          description: seeded.description,
          details: seeded.details,
          care: seeded.care,
          sizeChart: seeded.sizeChart,
        };
      }
      return product;
    });
  };

  const [products, setProducts] = useState<Product[]>(() => loadProducts());
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
