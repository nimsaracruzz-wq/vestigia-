import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { type Product } from "../data";
import { useAdmin } from "../admin/AdminContext";

export type CartItem = {
  product: Product;
  quantity: number;
  selectedSize: string;
  selectedColor: string;
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const { settings, products, isSynced, promoCodes } = useAdmin();

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
  const cartTotalBeforeDiscount = cart.reduce((acc, item) => acc + item.quantity * item.product.price, 0);

  // Dynamic promo code discount calculation (supports DB promo codes + VESTIGIA20 fallback)
  const cleanPromoCode = promoCode ? promoCode.toUpperCase() : null;
  const activePromo = (promoCodes || []).find(
    (p) => p.code.toUpperCase() === cleanPromoCode
  );

  let discountAmount = 0;
  if (cleanPromoCode) {
    if (cleanPromoCode === "VESTIGIA20") {
      discountAmount = cartTotalBeforeDiscount * 0.2;
    } else if (activePromo && activePromo.active) {
      if (activePromo.type === "fixed") {
        discountAmount = Math.min(cartTotalBeforeDiscount, activePromo.discount);
      } else {
        discountAmount = cartTotalBeforeDiscount * (activePromo.discount / 100);
      }
    }
  }

  const cartTotal = Math.max(0, cartTotalBeforeDiscount - discountAmount);

  const shippingCost =
    cartTotal === 0
      ? 0
      : settings.complimentaryShippingEnabled && cartTotal >= settings.shippingThreshold
        ? 0
        : 15;
  const taxCost = cartTotal * 0.08; // 8% sales tax
  const grandTotal = cartTotal + shippingCost + taxCost;

  const addToCart = (product: Product, size: string, color: string, qty = 1) => {
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

      return [...prev, { product, quantity: qty, selectedSize: size, selectedColor: color }];
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
        clearCart,
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
