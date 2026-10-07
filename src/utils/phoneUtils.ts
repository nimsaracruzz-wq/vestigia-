export interface CountryPhoneOption {
  country: string;
  iso: string;
  dialCode: string;
  flag: string;
  format: string; // e.g. "XX XXX XXXX"
  placeholder: string;
}

export const COUNTRY_PHONE_OPTIONS: CountryPhoneOption[] = [
  { country: "Sri Lanka", iso: "LK", dialCode: "+94", flag: "🇱🇰", format: "XX XXX XXXX", placeholder: "77 123 4567" },
  { country: "United States", iso: "US", dialCode: "+1", flag: "🇺🇸", format: "(XXX) XXX-XXXX", placeholder: "(555) 000-0000" },
  { country: "Canada", iso: "CA", dialCode: "+1", flag: "🇨🇦", format: "(XXX) XXX-XXXX", placeholder: "(555) 000-0000" },
  { country: "United Kingdom", iso: "GB", dialCode: "+44", flag: "🇬🇧", format: "XXXX XXXXXX", placeholder: "7911 123456" },
  { country: "United Arab Emirates", iso: "AE", dialCode: "+971", flag: "🇦🇪", format: "XX XXX XXXX", placeholder: "50 123 4567" },
  { country: "Australia", iso: "AU", dialCode: "+61", flag: "🇦🇺", format: "XXX XXX XXX", placeholder: "412 345 678" },
  { country: "France", iso: "FR", dialCode: "+33", flag: "🇫🇷", format: "X XX XX XX XX", placeholder: "6 12 34 56 78" },
  { country: "Germany", iso: "DE", dialCode: "+49", flag: "🇩🇪", format: "XXX XXXXXXXX", placeholder: "151 12345678" },
  { country: "Italy", iso: "IT", dialCode: "+39", flag: "🇮🇹", format: "XXX XXX XXXX", placeholder: "312 345 6789" },
  { country: "India", iso: "IN", dialCode: "+91", flag: "🇮🇳", format: "XXXXX XXXXX", placeholder: "98765 43210" },
  { country: "Japan", iso: "JP", dialCode: "+81", flag: "🇯🇵", format: "XX XXXX XXXX", placeholder: "90 1234 5678" },
  { country: "Spain", iso: "ES", dialCode: "+34", flag: "🇪🇸", format: "XXX XX XX XX", placeholder: "612 34 56 78" },
  { country: "Singapore", iso: "SG", dialCode: "+65", flag: "🇸🇬", format: "XXXX XXXX", placeholder: "9123 4567" },
  { country: "Saudi Arabia", iso: "SA", dialCode: "+966", flag: "🇸🇦", format: "XX XXX XXXX", placeholder: "50 123 4567" },
  { country: "Qatar", iso: "QA", dialCode: "+974", flag: "🇶🇦", format: "XXXX XXXX", placeholder: "3312 3456" },
  { country: "Kuwait", iso: "KW", dialCode: "+965", flag: "🇰🇼", format: "XXXX XXXX", placeholder: "9123 4567" },
  { country: "Brazil", iso: "BR", dialCode: "+55", flag: "🇧🇷", format: "XX XXXXX-XXXX", placeholder: "11 91234-5678" },
  { country: "South Africa", iso: "ZA", dialCode: "+27", flag: "🇿🇦", format: "XX XXX XXXX", placeholder: "82 123 4567" },
  { country: "New Zealand", iso: "NZ", dialCode: "+64", flag: "🇳🇿", format: "XX XXX XXXX", placeholder: "21 123 4567" },
];

export const DEFAULT_COUNTRY = COUNTRY_PHONE_OPTIONS[0]; // LK

/**
 * Detect visitor country from IP address
 */
export async function detectVisitorLocation(): Promise<{ iso: string; country: string } | null> {
  for (const url of ['https://ipapi.co/json/', 'https://ipwho.is/']) {
    try {
      const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(4000) });
      if (!response.ok) continue;
      const data = await response.json();
      if (data.error || data.success === false) continue;
      const iso = String(data.country_code || '').toUpperCase();
      if (!/^[A-Z]{2}$/.test(iso)) continue;
      const country = new Intl.DisplayNames(['en'], { type: 'region' }).of(iso);
      if (country && country !== iso) return { iso, country };
    } catch {}
  }
  return null;
}

export async function detectVisitorCountry(): Promise<CountryPhoneOption> {
  const location = await detectVisitorLocation();
  return COUNTRY_PHONE_OPTIONS.find(c => c.iso === location?.iso) || DEFAULT_COUNTRY;
}

/**
 * Dynamically format phone number based on country pattern
 */
export function formatPhoneNumber(value: string, iso: string): string {
  // Strip non-digits
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";

  const country = COUNTRY_PHONE_OPTIONS.find(
    (c) => c.iso.toUpperCase() === iso.toUpperCase()
  ) || DEFAULT_COUNTRY;

  const pattern = country.format;

  // Format based on country pattern rules
  if (pattern === "(XXX) XXX-XXXX") {
    // US / CA format: (123) 456-7890
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  if (pattern === "XX XXX XXXX") {
    // LK / AE / ZA format: 77 123 4567
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
    return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
  }

  if (pattern === "XXXX XXXXXX") {
    // UK format: 7911 123456
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)} ${digits.slice(4, 10)}`;
  }

  if (pattern === "X XX XX XX XX") {
    // FR format: 6 12 34 56 78
    if (digits.length <= 1) return digits;
    const parts = [digits.slice(0, 1)];
    for (let i = 1; i < Math.min(digits.length, 9); i += 2) {
      parts.push(digits.slice(i, i + 2));
    }
    return parts.join(" ");
  }

  if (pattern === "XXXXX XXXXX") {
    // IN format: 98765 43210
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
  }

  if (pattern === "XXXX XXXX") {
    // SG / QA / KW format: 9123 4567
    if (digits.length <= 4) return digits;
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)}`;
  }

  if (pattern === "XXX XXX XXXX" || pattern === "XXX XXX XXX") {
    // IT / AU / DE format: 312 345 6789
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
  }

  // Fallback spacing: groups of 3 digits
  return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
}
