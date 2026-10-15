const PUBLIC_PATH = /^\/(?:shop|about|story|lookbook|journal|contact|faq|shipping-policy|refund-policy|privacy-policy|terms-of-service|(?:product|collections|journal)\/[a-zA-Z0-9_-]+)?\/?$/;

export function trafficPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 300) return null;
  const path = value.split(/[?#]/)[0];
  return PUBLIC_PATH.test(path) ? path : null;
}

export const TRAFFIC_RETENTION_DAYS = 90;
export const ACTIVE_WINDOW_SECONDS = 90;
