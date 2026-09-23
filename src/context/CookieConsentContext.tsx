import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type CookieConsent = {
  version: "1.0";
  timestamp: string;
  essential: true;
  analytics: boolean;
  marketing: boolean;
};

type CookieConsentContextValue = {
  consent: CookieConsent | null;
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  acceptAll: () => void;
  acceptEssential: () => void;
  savePreferences: (preferences: Pick<CookieConsent, "analytics" | "marketing">) => void;
};

const STORAGE_KEY = "vestigia_cookie_consent";
const CONSENT_VERSION = "1.0" as const;
const CookieConsentContext = createContext<CookieConsentContextValue | undefined>(undefined);

function readConsent(): CookieConsent | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<CookieConsent>;
    if (parsed.version !== CONSENT_VERSION || parsed.essential !== true) return null;
    return {
      version: CONSENT_VERSION,
      timestamp: typeof parsed.timestamp === "string" ? parsed.timestamp : new Date().toISOString(),
      essential: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
    };
  } catch {
    return null;
  }
}

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  const [consent, setConsent] = useState<CookieConsent | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
  }, []);

  const save = (analytics: boolean, marketing: boolean) => {
    const next: CookieConsent = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      essential: true,
      analytics,
      marketing,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setConsent(next);
    setSettingsOpen(false);
  };

  return (
    <CookieConsentContext.Provider
      value={{
        consent,
        settingsOpen,
        openSettings: () => setSettingsOpen(true),
        closeSettings: () => setSettingsOpen(false),
        acceptAll: () => save(true, true),
        acceptEssential: () => save(false, false),
        savePreferences: ({ analytics, marketing }) => save(analytics, marketing),
      }}
    >
      {children}
    </CookieConsentContext.Provider>
  );
}

export function useCookieConsent() {
  const context = useContext(CookieConsentContext);
  if (!context) throw new Error("useCookieConsent must be used within CookieConsentProvider");
  return context;
}
