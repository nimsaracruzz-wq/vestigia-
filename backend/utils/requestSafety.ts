import { randomUUID } from 'node:crypto';
import type { RequestHandler, ErrorRequestHandler } from 'express';

export class PublicError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export function classifyError(error: any) {
  if (error instanceof PublicError) return { status: error.status, code: error.code, message: error.message };
  if (error?.type === 'entity.parse.failed') return { status: 400, code: 'INVALID_JSON', message: 'The request contains invalid JSON.' };
  if (error?.type === 'entity.too.large' || error?.code === 'LIMIT_FILE_SIZE') return { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'The uploaded file or request is too large.' };
  if (error?.name === 'MulterError' || error?.message?.startsWith('Invalid file type:')) return { status: 400, code: 'INVALID_UPLOAD', message: 'Upload a supported image within the allowed size limit.' };
  if (error?.code === 'P2002') return { status: 409, code: 'CONFLICT', message: 'This record already exists. Refresh and try again.' };
  if (error?.code === 'P2025' || error?.status === 404) return { status: 404, code: 'NOT_FOUND', message: 'The requested resource could not be found.' };
  if (['P1001', 'P1002', 'P2024', 'SQLITE_BUSY'].includes(error?.code)) return { status: 503, code: 'SERVICE_UNAVAILABLE', message: 'The service is temporarily unavailable. Please try again shortly.' };
  return { status: 500, code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again. If it continues, contact support with the request reference.' };
}

export const requestSafety: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  const json = res.json.bind(res);
  res.json = ((body: any) => {
    if (req.path.startsWith('/api') && res.statusCode >= 400 && body && typeof body === 'object') {
      // Existing route catches also receive references and cannot expose 5xx exception details.
      body = { ...body, requestId };
      if (res.statusCode >= 500 && typeof body.error === 'string') {
        body.error = res.statusCode === 503 ? 'The service is temporarily unavailable. Please try again shortly.' : 'Something went wrong. Please try again or contact support with the request reference.';
      }
      res.setHeader('Cache-Control', 'no-store');
    }
    return json(body);
  }) as typeof res.json;
  res.on('finish', () => {
    if (res.statusCode < 400) return;
    console.warn(JSON.stringify({ event: 'request_failed', requestId, method: req.method, route: req.route?.path || 'unmatched', status: res.statusCode }));
  });
  next();
};

export const safeErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  const classified = classifyError(error);
  // Never log request bodies, tokens, passwords, query strings, or database exception text.
  console.error(JSON.stringify({ event: 'request_exception', requestId: res.locals.requestId, code: classified.code, status: classified.status }));
  if (classified.status === 503) res.setHeader('Retry-After', '5');
  res.status(classified.status).json({ error: classified.message, code: classified.code, requestId: res.locals.requestId });
};

export const validateRequestShape: RequestHandler = (req, _res, next) => {
  let nodes = 0;
  const inspect = (value: unknown, depth: number): boolean => {
    if (++nodes > 10000 || depth > 16) return false;
    if (!value || typeof value !== 'object') return true;
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'prototype', 'constructor'].includes(key) || !inspect(child, depth + 1)) return false;
    }
    return true;
  };
  if (!inspect(req.body, 0)) return next(new PublicError(400, 'INVALID_REQUEST_STRUCTURE', 'The request structure is invalid or too complex.'));
  next();
};

export function createRateLimiter({ windowMs, max, keyPrefix }: { windowMs: number; max: number; keyPrefix: string }): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  let lastCleanup = 0;
  return (req, res, next) => {
    const now = Date.now();
    if (now - lastCleanup >= 60000) {
      for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
      lastCleanup = now;
    }
    // Share the budget across related endpoints; path variations cannot evade it.
    const key = `${keyPrefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      if (!bucket && buckets.size >= 10000) {
        res.setHeader('Retry-After', '60');
        res.status(503).json({ error: 'Request protection is busy. Please try again shortly.', code: 'LIMITER_CAPACITY' });
        return;
      }
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count - 1)));
    if (bucket.count >= max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      res.status(429).json({ error: 'Too many requests. Please wait before trying again.', code: 'RATE_LIMITED' });
      return;
    }
    bucket.count++;
    next();
  };
}
