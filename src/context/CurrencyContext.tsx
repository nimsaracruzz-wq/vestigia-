import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type CurrencyCode = "EUR" | "USD" | "JPY";

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  formatPrice: (amountInEur: number) => string;
  rates: Record<string, number> | null;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Load saved preference or default to EUR
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem("vstigia_currency");
    if (saved === "USD" || saved === "JPY" || saved === "EUR") return saved;
    return "EUR"; // default fallback
  });

  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasDetectedIP, setHasDetectedIP] = useState(() => {
    return localStorage.getItem("vstigia_ip_checked") === "true";
  });

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem("vstigia_currency", c);
  };

  useEffect(() => {
    const initCurrencyData = async () => {
      setIsLoading(true);
      
      try {
        // 1. Fetch real-time exchange rates (Base EUR)
        // Using open.er-api.com as it's a free public endpoint
        const rateRes = await fetch("https://open.er-api.com/v6/latest/EUR");
        if (rateRes.ok) {
          const rateData = await rateRes.json();
          setRates(rateData.rates);
        } else {
          console.error("Failed to fetch rates, falling back to static approximations.");
          // Fallback static rates if API is down
          setRates({ EUR: 1, USD: 1.08, JPY: 165.50 });
        }

        // 2. IP Geolocation (if not checked before and no manual override)
        const savedCurrency = localStorage.getItem("vstigia_currency");
        if (!hasDetectedIP && !savedCurrency) {
          try {
            const ipRes = await fetch("https://ipwho.is/");
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              if (ipData.success) {
                const countryCode = ipData.country_code;
                
                // Map country to currency
                if (countryCode === "JP") {
                  setCurrency("JPY");
                } else if (["US", "CA", "AU", "NZ"].includes(countryCode)) {
                  // For simplicity, mapping a few major non-Euro countries to USD
                  setCurrency("USD");
                } else {
                  // Default to EUR for Europe and others
                  setCurrency("EUR");
                }
              }
            }
          } catch (e) {
            console.error("Geolocation failed:", e);
          } finally {
            setHasDetectedIP(true);
            localStorage.setItem("vstigia_ip_checked", "true");
          }
        }
      } catch (error) {
        console.error("Error initializing currency data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initCurrencyData();
  }, [hasDetectedIP]);

  // Format price based on active currency and fetched rates
  const formatPrice = (amountInEur: number) => {
    let finalAmount = amountInEur;
    
    // Convert if not EUR and we have rates
    if (currency !== "EUR" && rates && rates[currency]) {
      finalAmount = amountInEur * rates[currency];
    }

    // Format according to locale
    let locale = "de-DE"; // EUR
    if (currency === "USD") locale = "en-US";
    if (currency === "JPY") locale = "ja-JP";

    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
      minimumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(finalAmount);
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, rates, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return context;
}
