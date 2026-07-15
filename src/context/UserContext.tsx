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
  createAccount: (profile: UserProfile) => void;
  updateUser: (profile: UserProfile) => void;
  logout: () => void;
  addAddress: (address: Omit<Address, "id">) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const USER_STORAGE_KEY = "vestigia_user";

function loadSavedUser(): UserProfile | null {
  try {
    const saved = localStorage.getItem(USER_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => loadSavedUser());

  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  const createAccount = (profile: UserProfile) => {
    setUser(profile);
  };

  const updateUser = (profile: UserProfile) => {
    // Preserve addresses when updating profile
    setUser((prev) => ({ ...(prev || {}), ...profile, addresses: profile.addresses || prev?.addresses }));
  };

  const logout = () => {
    setUser(null);
  };

  const addAddress = (address: Omit<Address, "id">) => {
    setUser((prev) => {
      const id = `addr_${Date.now()}`;
      const newAddr: Address = { id, ...address, isDefault: Boolean(address.isDefault) };
      const existing = prev?.addresses ?? [];
      // if new address is default, clear others
      const addresses: Address[] = address.isDefault
        ? [...existing.map((a) => ({ ...a, isDefault: false })), newAddr]
        : [...existing, newAddr];
      const next = { ...(prev || {}), addresses } as UserProfile;
      return next;
    });
  };

  const removeAddress = (id: string) => {
    setUser((prev) => {
      const addresses = (prev?.addresses ?? []).filter((a) => a.id !== id);
      return { ...(prev || {}), addresses } as UserProfile;
    });
  };

  const setDefaultAddress = (id: string) => {
    setUser((prev) => {
      const addresses = (prev?.addresses ?? []).map((a) => ({ ...a, isDefault: a.id === id }));
      return { ...(prev || {}), addresses } as UserProfile;
    });
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        createAccount,
        updateUser,
        logout,
        addAddress,
        removeAddress,
        setDefaultAddress,
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
