import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type UserProfile = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountry: string;
  phoneDialCode: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  addresses?: Address[];
};

export type Address = {
  id: string;
  label?: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
};

interface UserContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  createAccount: (profile: UserProfile) => void;
  updateUser: (profile: UserProfile) => void;
  logout: () => void;
  addAddress: (address: Omit<Address, "id">) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerUser: (name: string, email: string, password: string, phone?: string) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; devLink?: string; error?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  getOrders: () => Promise<any[]>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = "vestigia_user";
const TOKEN_STORAGE_KEY = "vestigia_cust_token";
const API_BASE_URL = "http://127.0.0.1:4000/api";

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync token with localStorage
  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [token]);

  // Helper to make API requests
  const apiRequest = async (path: string, options: RequestInit = {}) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> ?? {}),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || `API Request failed: ${response.status}`);
    }
    return response.json();
  };

  const mapCustomerToProfile = (cust: any): UserProfile => {
    const name = cust.name || "";
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ");
    const addresses = Array.isArray(cust.addresses) 
      ? cust.addresses 
      : (typeof cust.addresses === "string" ? JSON.parse(cust.addresses) : []);
    const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0] || null;

    return {
      firstName,
      lastName,
      email: cust.email,
      phone: cust.phone || "",
      phoneCountry: defaultAddr?.phoneCountry || "US",
      phoneDialCode: defaultAddr?.phoneDialCode || "+1",
      address: defaultAddr?.line1 || "",
      city: defaultAddr?.city || "",
      state: defaultAddr?.state || "",
      zip: defaultAddr?.zip || "",
      country: defaultAddr?.country || "",
      addresses,
    };
  };

  // Fetch customer profile on mount or token change
  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setUser(null);
        return;
      }
      setIsLoading(true);
      try {
        const data = await apiRequest("/customers/profile");
        setUser(mapCustomerToProfile(data));
      } catch (err: any) {
        console.error("Failed to fetch customer profile:", err.message);
        // If token invalid/expired, log out
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    void fetchProfile();
  }, [token]);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      const data = await apiRequest("/customers/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(data.token);
      setUser(mapCustomerToProfile(data.user));
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const registerUser = async (name: string, email: string, password: string, phone?: string) => {
    setError(null);
    try {
      const data = await apiRequest("/customers/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password, phone }),
      });
      setToken(data.token);
      setUser(mapCustomerToProfile(data.user));
      return { success: true };
    } catch (err: any) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setError(null);
  };

  const createAccount = (profile: UserProfile) => {
    // Falls back to setting local state if guest, backend database sync is triggered on checkout
    setUser(profile);
  };

  const updateUser = async (profile: UserProfile) => {
    const nextAddresses = profile.addresses || user?.addresses || [];
    const firstName = profile.firstName || user?.firstName || "";
    const lastName = profile.lastName || user?.lastName || "";
    const name = `${firstName} ${lastName}`.trim();

    // Optimistically update local state
    setUser((prev) => ({
      ...(prev || {}),
      ...profile,
      firstName,
      lastName,
      addresses: nextAddresses,
    }) as UserProfile);

    if (token) {
      try {
        const data = await apiRequest("/customers/profile", {
          method: "PUT",
          body: JSON.stringify({
            name,
            phone: profile.phone,
            addresses: nextAddresses,
          }),
        });
        setUser(mapCustomerToProfile(data));
      } catch (err: any) {
        console.error("Failed to sync profile update to server:", err.message);
      }
    }
  };

  const addAddress = async (address: Omit<Address, "id">) => {
    const id = `addr_${Date.now()}`;
    const newAddr: Address = { id, ...address, isDefault: Boolean(address.isDefault) };
    const existing = user?.addresses ?? [];
    const nextAddresses: Address[] = address.isDefault
      ? [...existing.map((a) => ({ ...a, isDefault: false })), newAddr]
      : [...existing, newAddr];

    if (user) {
      await updateUser({ ...user, addresses: nextAddresses });
    }
  };

  const removeAddress = async (id: string) => {
    const existing = user?.addresses ?? [];
    const nextAddresses = existing.filter((a) => a.id !== id);
    if (user) {
      await updateUser({ ...user, addresses: nextAddresses });
    }
  };

  const setDefaultAddress = async (id: string) => {
    const existing = user?.addresses ?? [];
    const nextAddresses = existing.map((a) => ({ ...a, isDefault: a.id === id }));
    if (user) {
      await updateUser({ ...user, addresses: nextAddresses });
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      const data = await apiRequest("/customers/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      return { success: true, devLink: data.devLink };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const resetPassword = async (tokenParam: string, passwordParam: string) => {
    try {
      await apiRequest("/customers/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: tokenParam, password: passwordParam }),
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await apiRequest("/customers/change-password", {
        method: "PUT",
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const getOrders = async () => {
    try {
      return await apiRequest("/customers/orders");
    } catch (err: any) {
      console.error("Failed to fetch customer orders:", err.message);
      return [];
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        createAccount,
        updateUser,
        logout,
        addAddress,
        removeAddress,
        setDefaultAddress,
        login,
        registerUser,
        forgotPassword,
        resetPassword,
        changePassword,
        getOrders,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
}
