export function apiErrorMessage(status: number, data: { error?: unknown; requestId?: string } = {}) {
  const fallback = status === 429 ? 'Too many requests. Please wait before trying again.' : status >= 500 ? 'The service is temporarily unavailable. Please try again shortly.' : `Request failed (${status}).`;
  const message = typeof data.error === 'string' ? data.error : fallback;
  return status >= 500 && data.requestId ? `${message} Reference: ${data.requestId}` : message;
}
