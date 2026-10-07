import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { API_BASE_URL } from "../config/api";
import { apiErrorMessage } from "../utils/apiError";

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
  firstName?: string;
  lastName?: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phoneCountry?: string;
  phoneDialCode?: string;
  phone?: string;
  isDefault?: boolean;
  isDefaultShipping?: boolean;
  isDefaultBilling?: boolean;
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
  registerUser: (details: { firstName: string; lastName: string; email: string; password: string; confirmPassword: string; country: string; phone?: string }) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; devLink?: string; error?: string }>;
  resetPassword: (token: string, password: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  sendVerificationCode: () => Promise<any>;
  verifyEmailCode: (code: string) => Promise<any>;
  updateEmail: (newEmail: string) => Promise<any>;
  checkEmailStatus: (email: string) => Promise<{ case: string; name?: string; ordersCount?: number; message?: string }>;
  activateAccount: (token?: string, password?: string, email?: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  getOrders: () => Promise<any[]>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = "vestigia_user";
const TOKEN_STORAGE_KEY = "vestigia_cust_token";

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
      signal: !options.method || options.method === 'GET' ? AbortSignal.timeout(15000) : undefined,
      ...options,
      headers,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const error = new Error(apiErrorMessage(response.status, data)) as Error & { status: number };
      error.status = response.status;
      throw error;
    }
    return response.json();
  };

  const normalizeAddress = (addr: any): Address => {
    const firstName = addr.firstName || addr.name?.split(" ")?.[0] || "";
    const lastName = addr.lastName || addr.name?.split(" ")?.slice(1).join(" ") || "";
    return {
      id: String(addr.id ?? `addr_${Date.now()}`),
      label: addr.label || "Home",
      name: addr.name || `${firstName} ${lastName}`.trim(),
      firstName,
      lastName,
      company: addr.company || "",
      line1: addr.line1 || addr.address || "",
      line2: addr.line2 || addr.apartment || "",
      city: addr.city || "",
      state: addr.state || "",
      zip: addr.zip || "",
      country: addr.country || "",
      phone: addr.phone || "",
      phoneCountry: addr.phoneCountry || "US",
      phoneDialCode: addr.phoneDialCode || "+1",
      isDefault: Boolean(addr.isDefault ?? addr.isDefaultShipping),
      isDefaultShipping: Boolean(addr.isDefaultShipping ?? addr.isDefault),
      isDefaultBilling: Boolean(addr.isDefaultBilling),
    };
  };

  const mapCustomerToProfile = (cust: any): UserProfile => {
    const name = cust.name || "";
    const [firstName, ...lastNameParts] = name.split(" ");
    const lastName = lastNameParts.join(" ");
    const rawAddresses = Array.isArray(cust.addresses)
      ? cust.addresses
      : (typeof cust.addresses === "string" ? JSON.parse(cust.addresses) : []);
    const addresses = rawAddresses.map(normalizeAddress);
    const defaultAddr = addresses.find((a: any) => a.isDefault) || addresses[0] || null;

    return {
      firstName: firstName || defaultAddr?.firstName || "",
      lastName: lastName || defaultAddr?.lastName || "",
      email: cust.email,
      phone: cust.phone || defaultAddr?.phone || "",
      phoneCountry: defaultAddr?.phoneCountry || "US",
      phoneDialCode: defaultAddr?.phoneDialCode || "+1",
      address: defaultAddr?.line1 || "",
      city: defaultAddr?.city || "",
      state: defaultAddr?.state || "",
      zip: defaultAddr?.zip || "",
      country: defaultAddr?.country || cust.country || "",
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
        // A temporary network/backend failure must not erase a valid login.
        if (err.status === 401 || err.status === 403) {
          setToken(null);
          setUser(null);
        } else {
          setError("Your account could not be loaded. Please check your connection and refresh.");
        }
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

  const registerUser: UserContextType["registerUser"] = async (details) => {
    setError(null);
    try {
      const data = await apiRequest("/customers/register", {
        method: "POST",
        body: JSON.stringify(details),
      });
      if (data.token) {
        setToken(data.token);
        setUser(mapCustomerToProfile(data.user));
      }
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
    const nameParts = (address.name || "").trim().split(/\s+/);
    const firstName = address.firstName || nameParts[0] || user?.firstName || "";
    const lastName = address.lastName || nameParts.slice(1).join(" ") || user?.lastName || "";
    let newAddr: Address;

    if (token) {
      try {
        const created = await apiRequest("/customers/addresses", {
          method: "POST",
          body: JSON.stringify({
            label: address.label || "Home",
            firstName,
            lastName,
            company: address.company,
            address: address.line1,
            apartment: address.line2,
            city: address.city,
            state: address.state,
            zip: address.zip,
            country: address.country,
            phone: address.phone || user?.phone,
            phoneCountry: address.phoneCountry || user?.phoneCountry,
            phoneDialCode: address.phoneDialCode || user?.phoneDialCode,
            isDefaultShipping: Boolean(address.isDefault),
            isDefaultBilling: Boolean(address.isDefaultBilling),
          }),
        });
        newAddr = normalizeAddress(created);
      } catch (err: any) {
        console.error("Failed to sync address to server:", err.message);
        newAddr = { id: `addr_${Date.now()}`, ...address, firstName, lastName, isDefault: Boolean(address.isDefault) };
      }
    } else {
      newAddr = { id: `addr_${Date.now()}`, ...address, firstName, lastName, isDefault: Boolean(address.isDefault) };
    }

    const existing = user?.addresses ?? [];
    const nextAddresses: Address[] = newAddr.isDefault
      ? [...existing.map((a) => ({ ...a, isDefault: false })), newAddr]
      : [...existing, newAddr];

    if (user && !token) {
      await updateUser({ ...user, addresses: nextAddresses });
    } else if (user) {
      setUser({ ...user, addresses: nextAddresses });
    }
  };

  const removeAddress = async (id: string) => {
    const existing = user?.addresses ?? [];
    const nextAddresses = existing.filter((a) => a.id !== id);
    if (token && /^\d+$/.test(id)) {
      try {
        await apiRequest(`/customers/addresses/${id}`, { method: "DELETE" });
      } catch (err: any) {
        console.error("Failed to delete address from server:", err.message);
      }
    }
    if (user) {
      if (token) {
        setUser({ ...user, addresses: nextAddresses });
      } else {
        await updateUser({ ...user, addresses: nextAddresses });
      }
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

  const sendVerificationCode = async () => {
    try {
      const data = await apiRequest("/customers/send-verification", {
        method: "POST",
      });
      return { success: true, devCode: data.devCode, message: data.message };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const verifyEmailCode = async (code: string) => {
    try {
      const data = await apiRequest("/customers/verify-email", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      if (data.user) {
        setUser(mapCustomerToProfile(data.user));
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const updateEmail = async (newEmail: string) => {
    try {
      const data = await apiRequest("/customers/update-email", {
        method: "PUT",
        body: JSON.stringify({ newEmail }),
      });
      if (data.user) {
        setUser(mapCustomerToProfile(data.user));
      }
      return { success: true, devCode: data.devCode };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const checkEmailStatus = async (email: string) => {
    try {
      const data = await apiRequest("/customers/check-email", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      return data;
    } catch (err: any) {
      return { case: "NEW_CUSTOMER", email, message: err.message };
    }
  };

  const activateAccount = async (token?: string, password?: string, email?: string) => {
    try {
      const data = await apiRequest("/customers/activate-account", {
        method: "POST",
        body: JSON.stringify({ token, password, email }),
      });

      if (data.token && data.user) {
        setToken(data.token);
        setUser(mapCustomerToProfile(data.user));
      }
      return { success: true, message: data.message };
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
        isAuthenticated: Boolean(token && user),
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
        sendVerificationCode,
        verifyEmailCode,
        updateEmail,
        checkEmailStatus,
        activateAccount,
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
