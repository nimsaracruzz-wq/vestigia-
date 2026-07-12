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
};

interface UserContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  createAccount: (profile: UserProfile) => void;
  updateUser: (profile: UserProfile) => void;
  logout: () => void;
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
    setUser(profile);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        createAccount,
        updateUser,
        logout,
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
