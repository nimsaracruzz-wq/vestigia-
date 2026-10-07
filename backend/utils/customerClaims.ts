import jwt from 'jsonwebtoken';

/** Legacy customer JWTs must never inherit admin privileges or identity. */
export function customerClaims(token: string, secret: string): { id: number } | null {
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string' || !Number.isSafeInteger(decoded.id) || decoded.id < 1 || (decoded.role !== undefined && decoded.role !== 'customer')) return null;
    return { id: decoded.id };
  } catch { return null; }
}
