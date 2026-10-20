import { Request } from 'express';

export function normalizeRollString(rollStr: string): string {
  if (!rollStr) return '';
  const parts = rollStr.trim().split('/');
  if (parts.length === 3) {
    const yearCode = parts[0].trim();
    const deptCode = parts[1].trim();
    const cleanNum = parts[2].trim().replace(/^0+/, '') || '0';
    return `${yearCode}/${deptCode}/${cleanNum}`;
  }
  return rollStr.trim().toLowerCase();
}

export function getFrontendBaseUrl(req: Request): string {
  // 1. Check Origin or Referer header from the admin browser session
  const origin = req.get('origin');
  if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    return origin.replace(/\/+$/, '');
  }

  const referer = req.get('referer');
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch (_) {}
  }

  // 2. Check environment variables
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
    return process.env.FRONTEND_URL.replace(/\/+$/, '');
  }
  if (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost')) {
    return process.env.CLIENT_URL.replace(/\/+$/, '');
  }

  // 3. If NODE_ENV is production, default to production domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://events.hitianinside.in';
  }

  // 4. Fallback to origin header if available or configured env
  return (origin || process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
}
