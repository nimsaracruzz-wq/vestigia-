import { minor, toMajor, roundedRatio } from "../../shared/money";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { type Product } from "../data";
import { useAdmin } from "../admin/AdminContext";
import { useCurrency } from "./CurrencyContext";
import { getProductPrice } from "../utils/productMedia";

export type CartItem = {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
  unitPriceMinor?: number; currency?: string; market?: string; priceListId?: string; priceVersion?: number; addedAt?: string;
};

interface CartContextType {
  cart: CartItem[];
  wishlist: Product[];
  cartCount: number;
  cartTotalBeforeDiscount: number;
  cartTotal: number;
  discountAmount: number;
  promoCode: string | null;
  promoError: string | null;
  shippingCost: number;
  taxCost: number;
  grandTotal: number;
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addToCart: (product: Product, size: string, color: string, qty?: number) => void;
  removeFromCart: (productId: number, size: string, color: string) => void;
  updateQuantity: (productId: number, size: string, color: string, change: number) => void;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: number) => boolean;
  applyPromoCode: (code: string) => boolean;
  removePromoCode: () => void;
  clearCart: () => void;
  acceptQuote: (quote: any) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { settings, products, isSynced, promoCodes } = useAdmin();
  const { currency, market, priceListId } = useCurrency();

  // Load initial cart and wishlist from localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const savedCart = localStorage.getItem("vestigia_cart");
      return savedCart ? JSON.parse(savedCart) : [];
    } catch {
      return [];
    }
  });

  const [wishlist, setWishlist] = useState<Product[]>(() => {
    try {
      const savedWishlist = localStorage.getItem("vestigia_wishlist");
      return savedWishlist ? JSON.parse(savedWishlist) : [];
    } catch {
      return [];
    }
  });

  const [promoCode, setPromoCode] = useState<string | null>(() => {
    return localStorage.getItem("vestigia_promo") || null;
  });

  const [promoError, setPromoError] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  const openCart = () => setCartOpen(true);
  const closeCart = () => setCartOpen(false);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("vestigia_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("vestigia_wishlist", JSON.stringify(wishlist));
  }, [wishlist]);

  // Clean up wishlist when products sync is complete (filter out deleted and out-of-stock items)
  useEffect(() => {
    if (isSynced && products.length > 0) {
      setWishlist((prev) => {
        const cleaned = prev.filter((wishItem) => {
          const liveProduct = products.find((p) => p.id === wishItem.id);
          if (!liveProduct) return false; // deleted product

          // check if in stock
          if (liveProduct.inventory) {
            const values = Object.values(liveProduct.inventory);
            if (values.length > 0) {
              return values.some((stock) => Number(stock) > 0);
            }
          }
          return true;
        });

        if (cleaned.length !== prev.length) {
          return cleaned;
        }
        return prev;
      });
    }
  }, [products, isSynced]);

  useEffect(() => {
    if (promoCode) {
      localStorage.setItem("vestigia_promo", promoCode);
    } else {
      localStorage.removeItem("vestigia_promo");
    }
  }, [promoCode]);

  // Calculations
  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotalMinor = cart.reduce((acc, item) => acc + item.quantity * (item.currency === currency ? item.unitPriceMinor ?? NaN : item.product.prices?.[currency]?.priceMinor ?? NaN), 0);
  const cartTotalBeforeDiscount = Number.isFinite(subtotalMinor) ? toMajor(subtotalMinor, currency) : NaN;

  // Discount, shipping and tax become authoritative only in the reviewed server quote.
  const discountAmount = 0;
  const cartTotal = cartTotalBeforeDiscount;
  const shippingCost = 0, taxCost = 0, grandTotal = cartTotal;
  const acceptQuote = (quote: any) => setCart(previous => previous.map(item => {
    const price = quote.items.find((i: any) => i.productId === item.product.id && i.size === item.selectedSize && i.color === item.selectedColor);
    return price ? { ...item, unitPriceMinor: price.unitPriceMinor, currency: quote.currency, market: quote.market, priceListId: quote.priceListId, priceVersion: price.priceVersion,
      product: { ...item.product, prices: { ...item.product.prices, [quote.currency]: { ...price, priceMinor: price.unitPriceMinor } } } } : item;
  }));

  const addToCart = (product: Product, size: string, color: string, qty = 1) => {
    const row=product.prices?.[currency];
    if(!row || !Number.isSafeInteger(row.priceMinor) || !row.priceListId) { window.alert('This product is not available in the selected market.'); return; }
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === size &&
          item.selectedColor === color
      );

      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + qty,
        };
        return newCart;
      }

      return [...prev, { product, quantity: qty, selectedSize: size, selectedColor: color, unitPriceMinor: row.priceMinor, currency, market, priceListId, priceVersion: row.priceVersion, addedAt: new Date().toISOString() }];
    });
  };

  const removeFromCart = (productId: number, size: string, color: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(
            item.product.id === productId &&
            item.selectedSize === size &&
            item.selectedColor === color
          )
      )
    );
  };

  const updateQuantity = (productId: number, size: string, color: string, change: number) => {
    setCart((prev) => {
      return prev
        .map((item) => {
          if (
            item.product.id === productId &&
            item.selectedSize === size &&
            item.selectedColor === color
          ) {
            const nextQty = item.quantity + change;
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const toggleWishlist = (product: Product) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const isInWishlist = (productId: number) => {
    return wishlist.some((item) => item.id === productId);
  };

  const applyPromoCode = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setPromoError("Please enter a promotional code.");
      return false;
    }

    if (cleanCode === "VESTIGIA20") {
      setPromoCode("VESTIGIA20");
      setPromoError(null);
      return true;
    }

    const found = (promoCodes || []).find((p) => p.code.toUpperCase() === cleanCode);
    if (!found) {
      setPromoError("Invalid promotional code.");
      return false;
    }

    if (!found.active) {
      setPromoError("This promotional code is no longer active.");
      return false;
    }

    if (found.expiry && new Date(found.expiry) < new Date()) {
      setPromoError("This promotional code has expired.");
      return false;
    }

    if (found.maxUses !== null && found.maxUses !== undefined && found.uses >= found.maxUses) {
      setPromoError("This promotional code has reached its maximum usage limit.");
      return false;
    }

    setPromoCode(found.code);
    setPromoError(null);
    return true;
  };

  const removePromoCode = () => {
    setPromoCode(null);
    setPromoError(null);
  };

  const clearCart = () => {
    setCart([]);
    setPromoCode(null);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        wishlist,
        cartCount,
        cartTotalBeforeDiscount,
        cartTotal,
        discountAmount,
        promoCode,
        promoError,
        shippingCost,
        taxCost,
        grandTotal,
        cartOpen,
        openCart,
        closeCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleWishlist,
        isInWishlist,
        applyPromoCode,
        removePromoCode,
        clearCart, acceptQuote,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
