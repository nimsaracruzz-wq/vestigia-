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
  addToCart: (product: Product, size: string, color: string) => void;
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
  const { settings } = useAdmin();

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

  // VESTIGIA20 gives 20% discount
  const discountRate = promoCode?.toUpperCase() === "VESTIGIA20" ? 0.2 : 0;
  const discountAmount = cartTotalBeforeDiscount * discountRate;
  const cartTotal = cartTotalBeforeDiscount - discountAmount;

  const shippingCost =
    cartTotal === 0
      ? 0
      : settings.complimentaryShippingEnabled && cartTotal >= settings.shippingThreshold
        ? 0
        : 15;
  const taxCost = cartTotal * 0.08; // 8% sales tax
  const grandTotal = cartTotal + shippingCost + taxCost;

  const addToCart = (product: Product, size: string, color: string) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === size &&
          item.selectedColor === color
      );

      if (existingIndex > -1) {
        const newCart = [...prev];
        newCart[existingIndex].quantity += 1;
        return newCart;
      }

      return [...prev, { product, quantity: 1, selectedSize: size, selectedColor: color }];
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
    if (code.toUpperCase() === "VESTIGIA20") {
      setPromoCode("VESTIGIA20");
      setPromoError(null);
      return true;
    } else {
      setPromoError("Invalid promotional code.");
      return false;
    }
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
